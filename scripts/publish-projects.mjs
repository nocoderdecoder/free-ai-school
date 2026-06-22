/**
 * publish-projects.mjs
 *
 * Publishes deepened case-study content for the Projects page to Sanity,
 * following the same createOrReplace pattern as publish-article.mjs.
 *
 * Usage:
 *   node scripts/publish-projects.mjs --dry-run   ← preview without writing
 *   node scripts/publish-projects.mjs             ← write to Sanity
 *
 * Requires SANITY_WRITE_TOKEN in .env.local
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT_ID = '8w4exnl4'
const DATASET = 'production'
const API_VERSION = '2024-01-01'

const DRY_RUN = process.argv.includes('--dry-run')

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const token = process.env.SANITY_WRITE_TOKEN
if (!token && !DRY_RUN) {
  console.error('Missing SANITY_WRITE_TOKEN in .env.local')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  token: token || 'dry-run',
  useCdn: false,
})

function randomKey() {
  return Math.random().toString(36).slice(2, 10)
}

function block(text, style = 'normal') {
  return {
    _type: 'block',
    _key: randomKey(),
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: randomKey(), text, marks: [] }],
  }
}

function h2(text) {
  return block(text, 'h2')
}

function p(text) {
  return block(text, 'normal')
}

function bulletList(items) {
  return items.map((text) => ({
    _type: 'block',
    _key: randomKey(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    markDefs: [],
    children: [{ _type: 'span', _key: randomKey(), text, marks: [] }],
  }))
}

// ─── anshul.ai platform ─────────────────────────────────────────────────────

const anshulAiBody = [
  h2('The problem'),
  p(
    'Most "I learned to build with AI" stories end at a single deployed app. The harder, more interesting problem is operating one over time: keeping content fresh without a writer, keeping a CMS without an editor, and keeping a handful of interactive tools running without a backend team. anshul.ai is the answer to that problem for one person — it has to run itself most days, because most days I am not touching it.'
  ),
  p(
    'The constraint shaped the architecture more than any feature wishlist did. Every decision below optimizes for "what keeps working when I do not log in for a week," not "what looks impressive in a demo."'
  ),

  h2('Architecture'),
  p(
    'The site is a Next.js (App Router) application deployed on Vercel. Content lives in Sanity — a headless CMS reached over its CDN-backed API via next-sanity — rather than in markdown files or a database I would have to manage migrations for. Sanity gives me a hosted Studio for manual edits and a write-capable client (@sanity/client) for the automation to publish through, with the same document shape either way. Subscriber data (the email capture on /subscribe and the contact form) goes through Supabase via @supabase/ssr, and outbound email — confirmations, the contact form notification — goes through Resend. Seven of the eight interactive tools call the Claude API directly server-side (@anthropic-ai/sdk) for generation; the eighth, the Speaking Speed Tester, is pure client-side audio processing and needs no model at all.'
  ),
  p(
    'Nothing here is exotic. The interesting part is that it is one person\'s worth of infrastructure, chosen specifically because each piece is something a non-engineer can operate without a DevOps habit: Sanity instead of a database I would have to back up myself, Vercel instead of servers I would have to patch, Resend instead of an SMTP server I would have to configure.'
  ),

  h2('What is automated vs. manual'),
  p(
    'Two GitHub Actions workflows run on cron — daily-trending.yml at 07:00 UTC and daily-deals-events.yml at 08:00 UTC — and each invokes a Node script (scripts/generate-trending.mjs, scripts/generate-deals-events.mjs) that: pulls live RSS feeds from five AI/tech outlets (TechCrunch, VentureBeat, The Verge, Wired, Ars Technica), queries Sanity for the last 30 days of published titles to avoid repeating a topic, sends the headlines plus a detailed style brief to claude-opus-4-5, parses the model\'s structured TITLE/SLUG/EXCERPT/body output, converts it to Sanity\'s Portable Text block format, and calls client.createOrReplace() to publish the document — no human in the loop, no draft state to approve.'
  ),
  p(
    'The prompt itself is doing real work, not just "write an article about X." It encodes a voice (short sentences, no hype, business-reader framing), hard content rules (never criticize Google, skip US-policy headlines entirely, 350–450 words, never repeat a recently-covered story), and an explicit bank of headline patterns to avoid the generic "X Did Y — Here\'s Why That Matters" formula that most AI-written news content falls into. Getting consistent, non-embarrassing autonomous publishing out of an LLM turned out to be much more about prompt constraints than about model capability.'
  ),
  p(
    'Manual, by contrast: the 5-module / 94-article AI School curriculum was written as structured Markdown and pushed into Sanity once via scripts/publish-article.mjs, a one-time bulk-import script rather than an ongoing pipeline. The 8 interactive tools and their Claude prompts are hand-built and hand-tuned. The 25 downloadable PDF guides (app/lib/pdf/content.ts) are hand-written structured content — tables, rating grids, callouts, flow diagrams — rendered on demand.'
  ),

  h2('The PDF system'),
  p(
    'Guides are not pre-generated files sitting in storage; they are rendered on request. GET /api/pdf/[slug] looks up the slug in a typed content map, passes it to a React component tree (PdfTemplate.tsx) built with @react-pdf/renderer, and streams back a freshly rendered PDF with a 24-hour cache header. Content and presentation are fully decoupled — a guide is just structured data (sections, bullet lists, tables, ratings) until the moment someone requests it, which makes the 25 guides trivial to keep consistent and cheap to extend without touching the rendering layer.'
  ),

  h2('Scale, as of today'),
  bulletList([
    '94 articles published to the AI School curriculum (one-time structured import).',
    'Two autonomous pipelines publishing new articles daily, each gated by its own LLM-enforced editorial rules and a 30-day topic-dedup check against Sanity.',
    '8 interactive tools live under /tools, 7 of which call the Claude API server-side for generation (GTM playbooks, AI readiness scoring, ROI estimates, competitive briefs, meeting prep, tool recommendations, a voice-driven learning-path compass).',
    '25 on-demand PDF guides rendered from one shared template, zero pre-built files to regenerate when content changes.',
    'Per-section dynamic Open Graph images (app/*/opengraph-image.tsx) generated at request time rather than hand-exported once and left to go stale.',
  ]),

  h2('What I would do differently'),
  p(
    'The two daily content pipelines duplicate roughly 80% of their code (RSS fetching, Claude calling, Portable Text conversion, Sanity publish) because the second was built by copying the first and adjusting the prompt and decision logic. That was the right call under time pressure — shipping a second pipeline by duplicating a known-working one is faster than extracting a shared module before I understood where the two scripts would actually diverge — but it is technical debt I would pay down into a shared lib/content-pipeline.mjs now that both scripts are stable. I also do not currently have alerting if a cron run fails silently (a dead RSS feed or a Claude API outage just means no article that day, with no notification); that is the next reliability gap to close.'
  ),
]

// ─── Daily AI news pipeline (the real, verifiable second project) ──────────

const newsPipelineBody = [
  h2('What this actually is'),
  p(
    'The Projects list originally described this as an "AI News → LinkedIn Pipeline." That overstated it: there is no LinkedIn posting step in the code today. What is actually built and running daily is the autonomous article pipeline behind anshul.ai\'s Trending and Deals & Events sections — two GitHub Actions cron jobs (scripts/generate-trending.mjs at 07:00 UTC, scripts/generate-deals-events.mjs at 08:00 UTC) that take a raw RSS firehose and turn it into a published, on-brand article with no human touching it.'
  ),

  h2('How it works'),
  p(
    'Each run fetches five AI/tech RSS feeds in parallel (TechCrunch, VentureBeat, The Verge, Wired, Ars Technica) with an 8-second timeout per feed and Promise.allSettled so a single dead feed cannot break the run. It queries Sanity for every article title published in the last 30 days to build a do-not-repeat list, then sends the full headline batch plus that exclusion list to claude-opus-4-5 in a single prompt.'
  ),
  p(
    'The prompt asks the model to do three jobs at once: pick the single most business-relevant story from the batch, write a 350–450 word article in a specific voice, and self-censor against a short list of hard rules (no criticism of Google, no US policy/regulatory topics, no repeat topics, no generic AI-news headline formulas). The deals-events variant runs a separate qualification check first — only headlines that look like a genuine funding round, acquisition, or named event get past it, so most days it may publish nothing rather than force a low-quality story.'
  ),
  p(
    'Output is parsed from a strict TITLE / SLUG / EXCERPT / --- / body format, converted line-by-line into Sanity Portable Text blocks (paragraph vs. heading detected heuristically by line length and trailing punctuation), and written with client.createOrReplace() using a deterministic _id derived from the slug — so a re-run on the same topic overwrites rather than duplicates.'
  ),

  h2('What I would do differently'),
  p(
    'The honest gap is the one named in the original project title: there is no distribution step. The articles publish to anshul.ai but nothing pushes them anywhere else. Adding an actual LinkedIn (or email digest) distribution leg — reusing the same generated excerpt as the post copy — is the natural next iteration, and would close the gap between what this project is called and what it currently does.'
  ),
]

// The remaining cards from the original STATIC_PROJECTS array, carried over
// as-is (shallow, no fabricated depth) so the listing keeps its full set of
// 7 projects once Sanity has any `project` documents — the page's fallback
// logic switches entirely to Sanity as soon as it returns anything.
const carryOverProjects = [
  {
    _id: 'project-promptgrade',
    name: 'PromptGrade',
    // No slug on purpose: the listing card prioritizes `slug` over `url` for
    // its link target, and this card must keep linking out to ratemyprompt.pro
    // rather than to an (empty) detail page.
    slugCurrent: null,
    tagline: 'AI prompt scoring and rewriting',
    status: 'Live',
    featured: false,
    url: 'https://ratemyprompt.pro',
    tools: [],
    impact: null,
    excerpt: null,
    body: null,
  },
  {
    _id: 'project-speaking-speed-tester',
    name: 'Speaking Speed Tester',
    slugCurrent: null,
    tagline: 'Real-time words-per-minute measurement',
    status: 'Live',
    featured: false,
    url: '/tools/speaking-speed',
    tools: [],
    impact: null,
    excerpt: null,
    body: null,
  },
  {
    _id: 'project-competitive-intelligence-scraper',
    name: 'Competitive Intelligence Scraper',
    slugCurrent: null,
    tagline: 'Competitor tracking for strategy teams',
    status: 'Internal',
    featured: false,
    tools: [],
    impact: null,
    excerpt: null,
    body: null,
  },
  {
    _id: 'project-hr-assistant-chatbot',
    name: 'HR Assistant Chatbot',
    slugCurrent: null,
    tagline: 'RAG-based answers from internal docs',
    status: 'Demo',
    featured: false,
    tools: [],
    impact: null,
    excerpt: null,
    body: null,
  },
  {
    _id: 'project-cv-tailoring-system',
    name: 'CV Tailoring System',
    slugCurrent: null,
    tagline: 'Job-description-aware resume rewriting',
    status: 'Built',
    featured: false,
    tools: [],
    impact: null,
    excerpt: null,
    body: null,
  },
]

const projects = [
  {
    _id: 'project-anshul-ai-platform',
    name: 'anshul.ai Platform',
    slugCurrent: 'anshul-ai-platform',
    tagline: 'Full-stack AI education platform with automated content pipelines',
    status: 'Live',
    featured: true,
    year: 2025,
    tools: [
      'Next.js (App Router)',
      'Sanity CMS',
      'Supabase',
      'Resend',
      'Claude API',
      '@react-pdf/renderer',
      'GitHub Actions',
      'Vercel',
    ],
    impact: '94 articles automated, 2 daily content pipelines, 8 tools, 25 PDFs, 0 manual hours per publish',
    excerpt:
      'A self-operating AI education site: 94 structured curriculum articles, two daily GitHub Actions pipelines that research, write, and publish new articles via the Claude API with zero human review, 8 Claude-powered interactive tools, and 25 PDF guides rendered on demand rather than pre-built.',
    body: anshulAiBody,
  },
  {
    _id: 'project-daily-ai-news-pipeline',
    name: 'Daily AI News Pipeline',
    slugCurrent: 'daily-ai-news-pipeline',
    tagline: 'Two cron-triggered Claude pipelines that research and publish articles with no human review',
    status: 'Running',
    featured: false,
    year: 2025,
    tools: ['Claude API (claude-opus-4-5)', 'GitHub Actions', 'Sanity CMS', 'RSS'],
    impact: 'Runs unattended twice daily; self-censors topics and enforces a 30-day no-repeat rule',
    excerpt:
      'Two GitHub Actions cron jobs that pull live RSS headlines, pick the most relevant AI story via Claude, write a 350–450 word article in a fixed voice with hard content rules, and publish straight to Sanity — no draft queue, no approval step.',
    body: newsPipelineBody,
  },
  ...carryOverProjects,
]

async function main() {
  console.log(`\n${DRY_RUN ? 'DRY RUN — ' : ''}Publishing ${projects.length} project case stud${projects.length === 1 ? 'y' : 'ies'} to Sanity...\n`)

  for (const proj of projects) {
    const doc = {
      _type: 'project',
      _id: proj._id,
      name: proj.name,
      tagline: proj.tagline,
      status: proj.status,
      featured: proj.featured,
    }
    if (proj.slugCurrent) doc.slug = { _type: 'slug', current: proj.slugCurrent }
    if (proj.year) doc.year = proj.year
    if (proj.url) doc.url = proj.url
    if (proj.tools?.length) doc.tools = proj.tools
    if (proj.impact) doc.impact = proj.impact
    if (proj.excerpt) doc.excerpt = proj.excerpt
    if (proj.body) doc.body = proj.body

    if (DRY_RUN) {
      console.log(`  [dry-run] Would publish: "${proj.name}"${proj.slugCurrent ? ` (${proj.slugCurrent})` : ''} — ${proj.body?.length ?? 0} blocks`)
      continue
    }

    await client.createOrReplace(doc)
    console.log(`  Published: "${proj.name}"`)
  }

  console.log('\nDone.\n')
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
