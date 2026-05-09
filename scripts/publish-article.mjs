/**
 * publish-article.mjs
 *
 * Publishes one or all articles from /Desktop/anshul-ai-articles/ to Sanity CMS.
 *
 * Usage (from the project root):
 *   node scripts/publish-article.mjs --file path/to/article.md
 *   node scripts/publish-article.mjs --all
 *   node scripts/publish-article.mjs --module foundations
 *   node scripts/publish-article.mjs --dry-run --all    ← preview without writing
 *
 * Requires SANITY_WRITE_TOKEN in .env.local
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ─── Config ──────────────────────────────────────────────────────────────────

const PROJECT_ID = '8w4exnl4'
const DATASET    = 'production'
const API_VERSION = '2024-01-01'
const ARTICLES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
  'Desktop/anshul-ai-articles'
)

// ─── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const flags = {}
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2)
    flags[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true
  }
}

const DRY_RUN = Boolean(flags['dry-run'])

if (!flags.file && !flags.all && !flags.module) {
  console.log(`
Usage:
  node scripts/publish-article.mjs --file <path>     Publish a single article file
  node scripts/publish-article.mjs --all             Publish all article files
  node scripts/publish-article.mjs --module <name>   Publish one module (foundations|tools|organization|hands-on)
  node scripts/publish-article.mjs --dry-run --all   Preview without writing to Sanity
  `)
  process.exit(0)
}

// ─── Sanity client ────────────────────────────────────────────────────────────

// Load .env.local manually (Next.js style)
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
}

const token = process.env.SANITY_WRITE_TOKEN
if (!token && !DRY_RUN) {
  console.error(`
❌  Missing SANITY_WRITE_TOKEN

Add it to .env.local:
  SANITY_WRITE_TOKEN=sk...

Get a token at: https://www.sanity.io/manage → your project → API → Tokens
Create an "Editor" token (can write documents, not deploy schema).
  `)
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  token: token || 'dry-run',
  useCdn: false,
})

// ─── Module mapping ───────────────────────────────────────────────────────────

const MODULE_DIRS = {
  foundations:  'module-1-foundations',
  tools:        'module-2-tools',
  organization: 'module-3-organization',
  'hands-on':   'module-4-hands-on',
}

const MODULE_VALUE = {
  'module 1: foundations':         'foundations',
  'module 2: the tools layer':     'tools',
  'module 3: ai in your organization': 'organization',
  'module 4: hands-on for non-engineers': 'hands-on',
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseArticleFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8')

  const get = (label) => {
    const re = new RegExp(`^${label}:\\s*(.+)`, 'mi')
    const m = raw.match(re)
    return m ? m[1].trim() : null
  }

  // Pull the ARTICLE TEXT block (no 'm' flag so $ = end-of-string, not end-of-line)
  const bodyMatch = raw.match(/-{40,}\nARTICLE TEXT\n-{40,}\n([\s\S]+?)(?=\n-{40,}|$)/)
  const bodyRaw = bodyMatch ? bodyMatch[1].trim() : ''

  const title = get('TITLE')
  const slugRaw = get('SLUG') || ''
  // Slug: take the last path segment, strip leading slash
  const slugCurrent = slugRaw.replace(/^\/learn\//, '').replace(/\//g, '-') || null

  const moduleRaw = (get('MODULE') || '').toLowerCase().trim()
  const moduleValue = MODULE_VALUE[moduleRaw] || 'foundations'

  const readTimeRaw = get('READ TIME') || ''
  const readTime = parseInt(readTimeRaw) || null

  const excerpt = get('META DESCRIPTION') || get('SUMMARY') || ''

  return { title, slug: slugCurrent, module: moduleValue, readTime, excerpt, bodyRaw }
}

// ─── Plain text → Portable Text ──────────────────────────────────────────────
// Converts paragraphs and simple headings to Sanity block format.

function textToPortableText(text) {
  const lines = text.split('\n')
  const blocks = []
  let paragraphLines = []

  const flushParagraph = () => {
    const joined = paragraphLines.join(' ').trim()
    if (joined) {
      blocks.push({
        _type: 'block',
        _key: randomKey(),
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', _key: randomKey(), text: joined, marks: [] }],
      })
    }
    paragraphLines = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      continue
    }

    // Detect headings: short lines (≤80 chars) that don't end with punctuation
    // and look title-like (title-case or all words capitalized)
    if (
      trimmed.length <= 80 &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(',') &&
      !trimmed.endsWith(':') &&
      paragraphLines.length === 0 &&
      /^[A-Z]/.test(trimmed) &&
      trimmed.split(' ').length <= 10
    ) {
      // Could be a heading — use h2
      blocks.push({
        _type: 'block',
        _key: randomKey(),
        style: 'h2',
        markDefs: [],
        children: [{ _type: 'span', _key: randomKey(), text: trimmed, marks: [] }],
      })
      continue
    }

    paragraphLines.push(trimmed)
  }

  flushParagraph()
  return blocks
}

function randomKey() {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Publish one article ──────────────────────────────────────────────────────

async function publishArticle(filePath) {
  const { title, slug, module: mod, readTime, excerpt, bodyRaw } = parseArticleFile(filePath)

  if (!title || !slug) {
    console.warn(`  ⚠️  Skipping ${path.basename(filePath)} — missing title or slug`)
    return
  }

  const body = textToPortableText(bodyRaw)

  const doc = {
    _type: 'article',
    _id: `article-${slug}`,
    title,
    slug: { _type: 'slug', current: slug },
    module: mod,
    readTime,
    excerpt,
    publishedAt: new Date().toISOString(),
    body,
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] Would publish: "${title}" (${slug}) → module: ${mod}, ${body.length} blocks`)
    return
  }

  await client.createOrReplace(doc)
  console.log(`  ✅  Published: "${title}"`)
}

// ─── Collect files ────────────────────────────────────────────────────────────

function collectFiles() {
  if (flags.file) {
    const p = path.resolve(flags.file)
    if (!fs.existsSync(p)) { console.error(`File not found: ${p}`); process.exit(1) }
    return [p]
  }

  const dirs = flags.module
    ? [path.join(ARTICLES_DIR, MODULE_DIRS[flags.module] || flags.module)]
    : Object.values(MODULE_DIRS).map(d => path.join(ARTICLES_DIR, d))

  const files = []
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) { console.warn(`Dir not found: ${dir}`); continue }
    const mdFiles = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()
    files.push(...mdFiles.map(f => path.join(dir, f)))
  }
  return files
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const files = collectFiles()
  if (!files.length) { console.error('No article files found.'); process.exit(1) }

  console.log(`\n${DRY_RUN ? '🔍 DRY RUN — ' : ''}Publishing ${files.length} article(s) to Sanity...\n`)

  let ok = 0, fail = 0
  for (const f of files) {
    try {
      process.stdout.write(`  → ${path.basename(f)} `)
      await publishArticle(f)
      ok++
    } catch (err) {
      console.error(`\n  ❌  Error on ${path.basename(f)}: ${err.message}`)
      fail++
    }
  }

  console.log(`\n${ok} published, ${fail} failed.\n`)
}

main()
