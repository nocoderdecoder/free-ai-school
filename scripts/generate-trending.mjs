/**
 * generate-trending.mjs
 *
 * Daily automation: fetches trending AI headlines from free RSS feeds,
 * picks the best topic, writes an article via Claude API, publishes to Sanity.
 *
 * Run manually:   node scripts/generate-trending.mjs
 * Runs daily via: .github/workflows/daily-trending.yml
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ─── Load .env.local ──────────────────────────────────────────────────────────

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const SANITY_TOKEN  = process.env.SANITY_WRITE_TOKEN

if (!ANTHROPIC_KEY) { console.error('❌  Missing ANTHROPIC_API_KEY'); process.exit(1) }
if (!SANITY_TOKEN)  { console.error('❌  Missing SANITY_WRITE_TOKEN');  process.exit(1) }

// ─── Sanity client ────────────────────────────────────────────────────────────

const sanity = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: SANITY_TOKEN,
  useCdn: false,
})

// ─── RSS feeds (free, no API key needed) ─────────────────────────────────────

const RSS_FEEDS = [
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://venturebeat.com/category/ai/feed/',
  'https://www.theverge.com/rss/ai/index.xml',
  'https://www.wired.com/feed/category/artificial-intelligence/latest/rss',
  'https://feeds.arstechnica.com/arstechnica/technology-lab',
]

async function fetchRSS(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; anshul.ai bot)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const xml = await res.text()

    // Extract items: title + description from RSS/Atom
    const items = []
    const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ||
                       xml.match(/<entry[\s\S]*?<\/entry>/gi) || []

    for (const block of itemBlocks.slice(0, 5)) {
      const title = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]?.trim()
      const desc  = (block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) ||
                     block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || [])[1]
                      ?.replace(/<[^>]+>/g, '')?.trim()?.slice(0, 200)
      if (title) items.push({ title, desc: desc || '' })
    }
    return items
  } catch {
    return []
  }
}

async function fetchAllHeadlines() {
  console.log('📡  Fetching AI headlines from RSS feeds...')
  const results = await Promise.allSettled(RSS_FEEDS.map(fetchRSS))
  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  console.log(`   Found ${all.length} headlines`)
  return all
}

// ─── Claude API ───────────────────────────────────────────────────────────────

async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.content[0].text
}

async function generateArticle(headlines) {
  console.log('✍️   Calling Claude to write article...')

  const headlineList = headlines
    .map((h, i) => `${i + 1}. ${h.title}${h.desc ? ' — ' + h.desc : ''}`)
    .join('\n')

  const prompt = `You are writing an article for Anshul Gupta's website (anshul.ai).

About Anshul: GTM Strategy leader at Google, Kellogg MBA, builds AI products without an engineering background, teaches practical AI to business professionals. His voice is direct, clear, practical — no hype, no jargon, aimed at non-technical professionals who want to actually use AI at work.

STRICT CONTENT RULES — follow without exception:
1. Never say anything negative about Google, its products, leadership, or decisions. If a headline involves Google criticism, skip it entirely and pick a different topic.
2. Never mention or reference the US government, US regulators, US authorities, US legislation, US policy, or any US political figures. If a headline is primarily about AI regulation or policy by US authorities, skip it and pick a different topic.
3. Keep the article to 350-450 words maximum. Be tight. Every sentence must earn its place.

Here are today's trending AI headlines:

${headlineList}

Pick the single most interesting, impactful topic from these headlines — something a business professional would genuinely care about. Apply the content rules above when choosing: skip any topic that would require you to criticise Google or discuss US government/regulatory actions.

Write the article in Anshul's voice: short punchy sentences, practical business takeaways, zero filler.

Output in EXACTLY this format (no extra commentary before or after):

TITLE: [compelling article title]
SLUG: [url-slug-with-hyphens-lowercase, max 60 chars]
EXCERPT: [2 sentences that make someone want to read. No fluff.]
---
[Article body here. 350-450 words. Use ## for section headings. Separate paragraphs with a blank line.]`

  const raw = await callClaude(prompt)

  // Parse the structured output
  const titleMatch   = raw.match(/^TITLE:\s*(.+)$/m)
  const slugMatch    = raw.match(/^SLUG:\s*(.+)$/m)
  const excerptMatch = raw.match(/^EXCERPT:\s*([\s\S]+?)(?=\n---)/m)
  const bodyMatch    = raw.match(/---\n([\s\S]+)$/)

  if (!titleMatch || !slugMatch || !bodyMatch) {
    console.error('Raw Claude output:\n', raw)
    throw new Error('Claude output did not match expected format')
  }

  return {
    title:   titleMatch[1].trim(),
    slug:    slugMatch[1].trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
    excerpt: excerptMatch ? excerptMatch[1].trim() : '',
    bodyRaw: bodyMatch[1].trim(),
  }
}

// ─── Text → Portable Text ─────────────────────────────────────────────────────

function randomKey() {
  return Math.random().toString(36).slice(2, 10)
}

function textToPortableText(text) {
  const blocks = []
  let paraLines = []

  const flush = () => {
    const joined = paraLines.join(' ').trim()
    if (joined) {
      blocks.push({
        _type: 'block', _key: randomKey(), style: 'normal', markDefs: [],
        children: [{ _type: 'span', _key: randomKey(), text: joined, marks: [] }],
      })
    }
    paraLines = []
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trim()

    if (!trimmed) { flush(); continue }

    // ## Headings
    if (trimmed.startsWith('## ')) {
      flush()
      blocks.push({
        _type: 'block', _key: randomKey(), style: 'h2', markDefs: [],
        children: [{ _type: 'span', _key: randomKey(), text: trimmed.slice(3).trim(), marks: [] }],
      })
      continue
    }
    if (trimmed.startsWith('### ')) {
      flush()
      blocks.push({
        _type: 'block', _key: randomKey(), style: 'h3', markDefs: [],
        children: [{ _type: 'span', _key: randomKey(), text: trimmed.slice(4).trim(), marks: [] }],
      })
      continue
    }

    paraLines.push(trimmed)
  }
  flush()
  return blocks
}

// ─── Publish to Sanity ────────────────────────────────────────────────────────

async function publish({ title, slug, excerpt, bodyRaw }) {
  const body = textToPortableText(bodyRaw)
  const doc = {
    _type: 'trending',
    _id: `trending-${slug}`,
    title,
    slug: { _type: 'slug', current: slug },
    excerpt,
    publishedAt: new Date().toISOString(),
    body,
  }

  await sanity.createOrReplace(doc)
  console.log(`✅  Published to Sanity: "${title}"`)
  console.log(`   → https://anshul.ai/trending/${slug}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀  Starting daily trending article generation...\n')

  const headlines = await fetchAllHeadlines()
  if (headlines.length === 0) {
    console.error('❌  No headlines fetched — check RSS feeds or network')
    process.exit(1)
  }

  const article = await generateArticle(headlines)
  console.log(`\n📄  Article: "${article.title}"`)
  console.log(`   Slug: ${article.slug}`)
  console.log(`   Body: ${article.bodyRaw.length} chars, ${textToPortableText(article.bodyRaw).length} blocks\n`)

  await publish(article)
  console.log('\n✨  Done.\n')
}

main().catch(err => { console.error(err); process.exit(1) })
