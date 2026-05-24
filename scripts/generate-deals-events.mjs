/**
 * generate-deals-events.mjs
 *
 * Daily automation: fetches AI headlines from RSS feeds, checks for a significant
 * deal or event, and if found writes an article via Claude API and publishes to Sanity.
 *
 * Run manually:   node scripts/generate-deals-events.mjs
 * Runs daily via: .github/workflows/daily-deals-events.yml
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

if (!ANTHROPIC_KEY) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1) }
if (!SANITY_TOKEN)  { console.error('Missing SANITY_WRITE_TOKEN');  process.exit(1) }

// ─── Sanity client ────────────────────────────────────────────────────────────

const sanityClient = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: SANITY_TOKEN,
  useCdn: false,
})

// ─── RSS feeds (same as generate-trending.mjs) ────────────────────────────────

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
  console.log('Fetching AI headlines from RSS feeds...')
  const results = await Promise.allSettled(RSS_FEEDS.map(fetchRSS))
  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  console.log(`   Found ${all.length} headlines`)
  return all
}

// ─── Claude API ───────────────────────────────────────────────────────────────

async function callClaude(prompt, maxTokens = 1000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: maxTokens,
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

// ─── Step 2: Significance check ───────────────────────────────────────────────

async function checkSignificance(headlines) {
  console.log('Checking headlines for significant deals or events...')

  const headlineList = headlines.map(h => h.title).join('\n')

  const prompt = `Scan these AI news headlines. Is there a significant AI event (major conference, product keynote, platform launch) or M&A deal (acquisition, merger, funding round over $200M) in today's news?

Headlines:
${headlineList}

Reply in JSON only, no markdown, no explanation:
{"found": boolean, "type": "event"|"deal"|null, "topic": string|null, "eventName": string|null}

"topic" should be a 5-10 word description of what was found.
"eventName" is the proper name of the event (e.g. "Google I/O 2026") or null for deals.`

  const raw = await callClaude(prompt, 200)

  try {
    const parsed = JSON.parse(raw.trim())
    return parsed
  } catch {
    console.error('Failed to parse significance check JSON:', raw)
    return { found: false, type: null, topic: null, eventName: null }
  }
}

// ─── Step 3: Deduplication check ─────────────────────────────────────────────

async function checkDuplication(topic) {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const recent = await sanityClient.fetch(
      `*[_type == "deal-event" && publishedAt > $cutoff] { title }`,
      { cutoff }
    )

    const topicWords = topic.split(' ').filter(w => w.length > 4).map(w => w.toLowerCase())

    for (const doc of recent) {
      const titleLower = doc.title.toLowerCase()
      for (const word of topicWords) {
        if (titleLower.includes(word)) {
          return true
        }
      }
    }
    return false
  } catch {
    return false
  }
}

// ─── Step 4: Write article ────────────────────────────────────────────────────

async function writeArticle(type, topic, eventName) {
  console.log(`Writing ${type} article for: "${topic}"...`)

  let prompt

  if (type === 'deal') {
    prompt = `Write a 400-500 word analysis article about this AI deal/acquisition for business professionals.

Topic: ${topic}

Structure the article into exactly 4 sections with these headings:
1. What Happened
2. Why They Wanted It
3. What It Signals
4. What to Watch

Rules:
- Nothing negative about Google, its products, or leadership
- No US government, regulators, or policy discussion
- No em dashes (—) anywhere — use commas or restructure
- Human tone, no AI clichés (no "game-changer", "revolutionary", "transformative", "exciting", "groundbreaking", "delve")
- No "Here's why", "Here's what", "What this means for you", "Why it matters"
- Plain, varied headlines — not shouted or formulaic

Output format (exact):
TITLE: [title]
SLUG: [url-slug]
TYPE: deal
EVENTNAME:
EXCERPT: [2-3 sentences for listing cards]
---
[article body in plain text with markdown headings ## for sections]`
  } else {
    prompt = `Write a 700-900 word analysis article about this AI event for business professionals.

Topic: ${topic}
Event name: ${eventName}

Structure the article into 5-6 sections with these headings:
1. What Happened
2. The Biggest Announcements
3. What Changed vs. Expectations
4. What It Means for Teams Using These Tools Now
5. The Direction

Rules:
- Nothing negative about Google, its products, or leadership
- No US government, regulators, or policy discussion
- No em dashes (—) anywhere — use commas or restructure
- Human tone, no AI clichés (no "game-changer", "revolutionary", "transformative", "exciting", "groundbreaking", "delve")
- No "Here's why", "Here's what", "What this means for you", "Why it matters"
- Plain, varied headlines — not shouted or formulaic

Output format (exact):
TITLE: [title]
SLUG: [url-slug]
TYPE: event
EVENTNAME: [event name]
EXCERPT: [2-3 sentences for listing cards]
---
[article body in plain text with markdown headings ## for sections]`
  }

  const maxTokens = type === 'deal' ? 1200 : 2000
  const raw = await callClaude(prompt, maxTokens)
  return raw
}

// ─── Step 5: Parse Claude response ───────────────────────────────────────────

function parseArticleResponse(raw) {
  const titleMatch     = raw.match(/^TITLE:\s*(.+)$/m)
  const slugMatch      = raw.match(/^SLUG:\s*(.+)$/m)
  const typeMatch      = raw.match(/^TYPE:\s*(.+)$/m)
  const eventNameMatch = raw.match(/^EVENTNAME:\s*(.*)$/m)
  const excerptMatch   = raw.match(/^EXCERPT:\s*([\s\S]+?)(?=\n---)/m)
  const bodyMatch      = raw.match(/---\n([\s\S]+)$/)

  if (!titleMatch || !slugMatch || !typeMatch || !bodyMatch) {
    console.error('Raw Claude output:\n', raw)
    throw new Error('Claude output did not match expected format')
  }

  return {
    title:     titleMatch[1].trim(),
    slug:      slugMatch[1].trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
    parsedType: typeMatch[1].trim().toLowerCase(),
    eventName: eventNameMatch ? eventNameMatch[1].trim() : '',
    excerpt:   excerptMatch ? excerptMatch[1].trim() : '',
    bodyRaw:   bodyMatch[1].trim(),
  }
}

// ─── Step 6: Text to Portable Text ───────────────────────────────────────────

function randomKey() {
  return Math.random().toString(36).slice(2, 10)
}

function markdownToPortableText(text) {
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

// ─── Step 7: Estimate read time ───────────────────────────────────────────────

function estimateReadTime(bodyRaw) {
  const wordCount = bodyRaw.split(' ').length
  return Math.ceil(wordCount / 200)
}

// ─── Step 8: Publish to Sanity ────────────────────────────────────────────────

async function publish({ title, slug, parsedType, eventName, excerpt, bodyRaw }) {
  const portableTextBody = markdownToPortableText(bodyRaw)
  const readTime = estimateReadTime(bodyRaw)

  await sanityClient.createOrReplace({
    _id: `deal-event-${slug}`,
    _type: 'deal-event',
    title,
    slug: { _type: 'slug', current: slug },
    type: parsedType,
    eventName: eventName || undefined,
    excerpt,
    publishedAt: new Date().toISOString(),
    readTime,
    body: portableTextBody,
  })

  console.log(`Published: "${title}" (${parsedType})`)
  console.log(`   -> https://anshul.ai/deals-events/${slug}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nStarting daily deals & events article generation...\n')

  // Step 1: Fetch headlines
  const headlines = await fetchAllHeadlines()
  if (headlines.length === 0) {
    console.error('No headlines fetched — check RSS feeds or network')
    process.exit(1)
  }

  // Step 2: Significance check
  const significance = await checkSignificance(headlines)
  console.log('Significance check result:', JSON.stringify(significance))

  if (!significance.found) {
    console.log('Nothing significant today.')
    process.exit(0)
  }

  const { type, topic, eventName } = significance
  console.log(`\nFound: ${type} — "${topic}"`)
  if (eventName) console.log(`   Event name: ${eventName}`)

  // Step 3: Deduplication check
  const alreadyCovered = await checkDuplication(topic)
  if (alreadyCovered) {
    console.log('Already covered recently.')
    process.exit(0)
  }

  // Step 4 + 5: Write and parse article
  const raw = await writeArticle(type, topic, eventName)
  const article = parseArticleResponse(raw)

  console.log(`\nArticle: "${article.title}"`)
  console.log(`   Slug: ${article.slug}`)
  console.log(`   Type: ${article.parsedType}`)
  console.log(`   Body: ${article.bodyRaw.length} chars, ${markdownToPortableText(article.bodyRaw).length} blocks\n`)

  // Step 8: Publish
  await publish(article)
  console.log('\nDone.\n')
}

main().catch(err => { console.error(err); process.exit(1) })
