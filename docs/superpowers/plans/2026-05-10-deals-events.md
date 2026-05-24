# Deals & Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `/deals-events` section that auto-publishes analysis of significant AI events and M&A deals, detected daily from RSS feeds via Claude API.

**Architecture:** New Sanity document type `deal-event` stores articles tagged as `event` or `deal`. A daily GitHub Actions script runs a two-call Claude pipeline: first checks if anything significant happened (cheap), then writes at appropriate length only if it did. Two Next.js pages (list + article) render the content identically to the existing `/trending` section.

**Tech Stack:** Next.js 14 App Router, Sanity CMS (`@sanity/client` + `next-sanity`), Claude API (claude-opus-4-5), GitHub Actions, Tailwind CSS, `@portabletext/react`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `sanity/schemaTypes/dealEvent.js` | Create | Sanity document type definition |
| `sanity/schemaTypes/index.js` | Modify | Register dealEvent schema |
| `app/deals-events/page.tsx` | Create | List page — all articles with type badges |
| `app/deals-events/[slug]/page.tsx` | Create | Article page — body, breadcrumb, prev/next |
| `scripts/generate-deals-events.mjs` | Create | Daily automation — detect + write + publish |
| `.github/workflows/daily-deals-events.yml` | Create | Cron trigger for the script |
| `app/components/Nav.tsx` | Modify | Add "Deals & Events" nav link |
| `app/page.tsx` | Modify | Add homepage section + footer link |
| `app/sitemap.ts` | Modify | Include `/deals-events` URLs |
| `app/downloads/page.tsx` | Modify | Add "Deals & Events" to footer |

---

## Task 1: Sanity schema — `deal-event` document type

**Files:**
- Create: `sanity/schemaTypes/dealEvent.js`
- Modify: `sanity/schemaTypes/index.js`

- [ ] **Step 1: Create `sanity/schemaTypes/dealEvent.js`**

```js
export default {
  name: 'deal-event',
  title: 'Deal / Event',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: Rule => Rule.required()
    },
    {
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Event (conference, keynote, launch)', value: 'event' },
          { title: 'Deal (acquisition, merger, funding)', value: 'deal' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'eventName',
      title: 'Event Name',
      type: 'string',
      description: 'Optional. Human name of the event, e.g. "Google I/O 2026". Leave blank for deals.'
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: '2-3 sentences shown in the listing card'
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    },
    {
      name: 'readTime',
      title: 'Read Time (minutes)',
      type: 'number',
    },
    {
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }]
    },
  ]
}
```

- [ ] **Step 2: Register the schema in `sanity/schemaTypes/index.js`**

Replace the file contents with:

```js
import article from './article'
import trending from './trending'
import dealEvent from './dealEvent'

export const schemaTypes = [article, trending, dealEvent]
```

- [ ] **Step 3: Commit**

```bash
git add sanity/schemaTypes/dealEvent.js sanity/schemaTypes/index.js
git commit -m "Add deal-event Sanity schema"
```

---

## Task 2: `/deals-events` list page

**Files:**
- Create: `app/deals-events/page.tsx`

- [ ] **Step 1: Create `app/deals-events/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Deals & Events — Anshul Gupta',
  description: 'Significant AI events and acquisitions — analysed for business professionals. Published when something worth reading happens.',
  openGraph: {
    title: 'Deals & Events — Anshul Gupta',
    description: 'Significant AI events and acquisitions — analysed for business professionals.',
    url: 'https://anshul.ai/deals-events',
  },
}

export const revalidate = 0

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TypeBadge({ type }: { type: 'event' | 'deal' }) {
  if (type === 'event') {
    return (
      <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
        style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>
        Event
      </span>
    )
  }
  return (
    <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
      style={{ background: 'rgba(15,118,110,0.15)', color: '#2DD4BF', border: '1px solid rgba(15,118,110,0.3)' }}>
      Deal
    </span>
  )
}

export default async function DealsEvents() {
  let articles: any[] = []
  try {
    articles = await client.fetch(
      `*[_type == "deal-event"] | order(publishedAt desc) { title, slug, excerpt, publishedAt, type, eventName, readTime }`
    )
  } catch {
    articles = []
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Deals & Events</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Major moves<br />in AI.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          Significant events and acquisitions — analysed for business professionals. Published when something worth reading happens.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-20">
        {articles.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-10 text-center">
            <p className="text-white/30 text-sm">Nothing yet. Check back when something significant happens.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article: any, i: number) => (
              <a
                key={article.slug.current}
                href={`/deals-events/${article.slug.current}`}
                className="group block border border-white/10 rounded-xl p-6 hover:border-white/25 transition"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {i === 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-400/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Latest
                        </span>
                      )}
                      <TypeBadge type={article.type} />
                      {article.eventName && (
                        <span className="text-white/30 text-xs">{article.eventName}</span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold mb-2 group-hover:text-white transition text-white/90 leading-snug">
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-white/40 text-sm leading-relaxed line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {article.publishedAt && (
                      <p className="text-white/25 text-xs">{formatDate(article.publishedAt)}</p>
                    )}
                    {article.readTime && (
                      <p className="text-white/20 text-xs mt-1">{article.readTime} min</p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-white/10">
        <div className="max-w-3xl mx-auto px-8 py-12 flex flex-col sm:flex-row justify-between gap-8">
          <div>
            <p className="font-semibold text-white mb-1">Anshul Gupta</p>
            <p className="text-white/30 text-sm">GTM Strategy at Google · Kellogg MBA</p>
            <p className="text-white/20 text-xs mt-4">© {new Date().getFullYear()} · anshul.ai</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <p className="text-white/25 text-xs uppercase tracking-widest mb-1">Pages</p>
              <a href="/about"         className="text-white/40 text-sm hover:text-white transition">About</a>
              <a href="/lab"           className="text-white/40 text-sm hover:text-white transition">Lab</a>
              <a href="/learn"         className="text-white/40 text-sm hover:text-white transition">Learn</a>
              <a href="/trending"      className="text-white/40 text-sm hover:text-white transition">Trending</a>
              <a href="/deals-events"  className="text-white/40 text-sm hover:text-white transition">Deals & Events</a>
              <a href="/writing"       className="text-white/40 text-sm hover:text-white transition">Writing</a>
              <a href="/downloads"     className="text-white/40 text-sm hover:text-white transition">Downloads</a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-white/25 text-xs uppercase tracking-widest mb-1">Connect</p>
              <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" rel="noopener noreferrer" className="text-white/40 text-sm hover:text-white transition">LinkedIn</a>
              <a href="https://github.com/nocoderdecoder" target="_blank" rel="noopener noreferrer" className="text-white/40 text-sm hover:text-white transition">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/anshul/projects/free-ai-school && npx tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add app/deals-events/page.tsx
git commit -m "Add /deals-events list page"
```

---

## Task 3: `/deals-events/[slug]` article page

**Files:**
- Create: `app/deals-events/[slug]/page.tsx`

- [ ] **Step 1: Create `app/deals-events/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../../components/Nav'
import { ReadingProgress } from '../../components/ReadingProgress'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { slug } = await params
  const article = await client.fetch(
    `*[_type == "deal-event" && slug.current == $slug][0] { title, excerpt }`,
    { slug }
  ).catch(() => null)

  if (!article) return { title: 'Article Not Found' }

  return {
    title: article.title,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      url: `https://anshul.ai/deals-events/${slug}`,
      type: 'article',
    },
    twitter: {
      title: article.title,
      description: article.excerpt || undefined,
    },
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function TypeBadge({ type }: { type: 'event' | 'deal' }) {
  if (type === 'event') {
    return (
      <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
        style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>
        Event
      </span>
    )
  }
  return (
    <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
      style={{ background: 'rgba(15,118,110,0.15)', color: '#2DD4BF', border: '1px solid rgba(15,118,110,0.3)' }}>
      Deal
    </span>
  )
}

const components = {
  block: {
    normal:     ({ children }: any) => <p className="mb-6 leading-relaxed text-white/80 text-lg">{children}</p>,
    h2:         ({ children }: any) => <h2 className="text-2xl font-bold mt-10 mb-4 text-white">{children}</h2>,
    h3:         ({ children }: any) => <h3 className="text-xl font-semibold mt-8 mb-3 text-white">{children}</h3>,
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-white/20 pl-6 my-8 text-white/50 italic">{children}</blockquote>,
  },
  marks: {
    strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
    em:     ({ children }: any) => <em className="italic text-white/70">{children}</em>,
    link:   ({ children, value }: any) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4 hover:text-white/70 transition">
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="mb-6 space-y-2 list-none pl-0">{children}</ul>,
  },
  listItem: {
    bullet: ({ children }: any) => (
      <li className="text-white/80 text-lg leading-relaxed flex gap-3">
        <span className="text-white/30 mt-1 shrink-0">—</span>
        <span>{children}</span>
      </li>
    ),
  },
}

export default async function DealEventArticle({ params }: any) {
  const { slug } = await params

  let article: any = null
  try {
    article = await client.fetch(
      `*[_type == "deal-event" && slug.current == $slug][0] {
        title, excerpt, publishedAt, body, type, eventName, readTime,
        "prev": *[_type == "deal-event" && _createdAt < ^._createdAt] | order(_createdAt desc)[0] { title, "slug": slug.current },
        "next": *[_type == "deal-event" && _createdAt > ^._createdAt] | order(_createdAt asc)[0]  { title, "slug": slug.current }
      }`,
      { slug }
    )
  } catch {
    article = null
  }

  if (!article) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/40">Article not found.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <ReadingProgress />
      <Nav />

      <article className="max-w-2xl mx-auto px-8 py-16">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-white/30 mb-10">
          <a href="/deals-events" className="hover:text-white/60 transition">Deals & Events</a>
          <span>›</span>
          <span className="text-white/50 truncate max-w-[240px]">{article.title}</span>
        </nav>

        {/* Badge + date */}
        <div className="flex items-center gap-3 mb-6">
          <TypeBadge type={article.type} />
          {article.eventName && (
            <span className="text-white/40 text-xs">{article.eventName}</span>
          )}
          {article.publishedAt && (
            <span className="text-white/25 text-xs">{formatDate(article.publishedAt)}</span>
          )}
        </div>

        <h1 className="text-4xl font-bold mb-10 leading-tight">{article.title}</h1>

        {/* Body */}
        <div>
          {article.body && <PortableText value={article.body} components={components} />}
        </div>

        {/* Next / Prev */}
        {(article.prev || article.next) && (
          <div className="mt-20 pt-10 border-t border-white/10 grid grid-cols-2 gap-4">
            <div>
              {article.prev && (
                <a href={`/deals-events/${article.prev.slug}`} className="group block border border-white/10 rounded-xl p-5 hover:border-white/25 transition h-full">
                  <p className="text-white/30 text-xs mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Previous
                  </p>
                  <p className="text-sm font-medium text-white/70 group-hover:text-white transition leading-snug">{article.prev.title}</p>
                </a>
              )}
            </div>
            <div>
              {article.next && (
                <a href={`/deals-events/${article.next.slug}`} className="group block border border-white/10 rounded-xl p-5 hover:border-white/25 transition text-right h-full">
                  <p className="text-white/30 text-xs mb-2 flex items-center gap-1 justify-end">
                    Next
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </p>
                  <p className="text-sm font-medium text-white/70 group-hover:text-white transition leading-snug">{article.next.title}</p>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Back */}
        <div className="mt-10 pt-10 border-t border-white/10">
          <a href="/deals-events" className="text-white/30 text-sm hover:text-white/60 transition">← All deals & events</a>
        </div>
      </article>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/deals-events/[slug]/page.tsx
git commit -m "Add /deals-events/[slug] article page"
```

---

## Task 4: Nav, homepage, sitemap, footer

**Files:**
- Modify: `app/components/Nav.tsx`
- Modify: `app/page.tsx`
- Modify: `app/sitemap.ts`
- Modify: `app/downloads/page.tsx`

- [ ] **Step 1: Add "Deals & Events" to `NAV_LINKS` in `app/components/Nav.tsx`**

Find this array:
```js
const NAV_LINKS = [
  { label: 'About',    href: '/about' },
  { label: 'Lab',      href: '/lab' },
  { label: 'Trending', href: '/trending' },
  { label: 'Writing',  href: '/writing' },
]
```

Replace with:
```js
const NAV_LINKS = [
  { label: 'About',          href: '/about' },
  { label: 'Lab',            href: '/lab' },
  { label: 'Trending',       href: '/trending' },
  { label: 'Deals & Events', href: '/deals-events' },
  { label: 'Writing',        href: '/writing' },
]
```

- [ ] **Step 2: Add Deals & Events section to homepage `app/page.tsx`**

Find the Writing section (it ends with a `</ScrollReveal>` before the Trending section). Add the Deals & Events `<ScrollReveal>` block between the Trending and Writing sections:

```tsx
        {/* Deals & Events */}
        <ScrollReveal delay={350}>
          <div className="border-b border-white/10 py-12">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Deals & Events</p>
            <h2 className="text-2xl font-bold mb-3">Major AI events and acquisitions.</h2>
            <p className="text-white/60 leading-relaxed mb-6 max-w-xl">
              Significant acquisitions and conferences — analysed when they happen.
            </p>
            <a href="/deals-events" className="inline-flex items-center gap-2 text-sm text-white hover:text-white/70 transition border border-white/20 px-4 py-2 rounded-full hover:border-white/40">
              View all →
            </a>
          </div>
        </ScrollReveal>
```

Also add "Deals & Events" to the homepage footer Pages list. Find the footer's pages column and add the link after Trending:

```tsx
<a href="/deals-events" className="text-white/40 text-sm hover:text-white transition">Deals & Events</a>
```

- [ ] **Step 3: Add `/deals-events` to `app/sitemap.ts`**

Find:
```ts
    { url: 'https://anshul.ai/downloads', lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
```

Replace with:
```ts
    { url: 'https://anshul.ai/deals-events', lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: 'https://anshul.ai/downloads',    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
```

Also add a Sanity fetch for `deal-event` slugs. After the existing `articleUrls` block, add:

```ts
  const dealEvents = await client
    .fetch(`*[_type == "deal-event"] { "slug": slug.current, publishedAt }`)
    .catch(() => [])

  const dealEventUrls: MetadataRoute.Sitemap = dealEvents.map((a: any) => ({
    url: `https://anshul.ai/deals-events/${a.slug}`,
    lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))
```

And add `...dealEventUrls` to the returned array.

- [ ] **Step 4: Add "Deals & Events" to footer in `app/downloads/page.tsx`**

Find the Pages column in the footer and add after the Trending link:
```tsx
<a href="/deals-events" className="text-white/40 text-sm hover:text-white transition">Deals & Events</a>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add app/components/Nav.tsx app/page.tsx app/sitemap.ts app/downloads/page.tsx
git commit -m "Wire Deals & Events into nav, homepage, sitemap, and footers"
```

---

## Task 5: Automation script

**Files:**
- Create: `scripts/generate-deals-events.mjs`

- [ ] **Step 1: Create `scripts/generate-deals-events.mjs`**

```js
/**
 * generate-deals-events.mjs
 *
 * Daily automation: scans RSS feeds for significant AI events/deals,
 * writes an analysis article via Claude API, publishes to Sanity.
 * Exits silently (no publish) if nothing significant is found.
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

// ─── RSS feeds ────────────────────────────────────────────────────────────────

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
  console.log('📡  Fetching headlines from RSS feeds...')
  const results = await Promise.allSettled(RSS_FEEDS.map(fetchRSS))
  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  console.log(`   Found ${all.length} headlines`)
  return all
}

// ─── Claude API ───────────────────────────────────────────────────────────────

async function callClaude(prompt, maxTokens = 300) {
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

// ─── Deduplication ────────────────────────────────────────────────────────────

async function fetchRecentTitles() {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const docs = await sanity.fetch(
      `*[_type == "deal-event" && publishedAt > $cutoff] | order(publishedAt desc) { title }`,
      { cutoff }
    )
    return docs.map((d) => d.title)
  } catch {
    return []
  }
}

// ─── Step 1: Significance check ───────────────────────────────────────────────

async function checkSignificance(headlines) {
  console.log('🔍  Checking for significant events or deals...')

  const headlineList = headlines
    .map((h, i) => `${i + 1}. ${h.title}${h.desc ? ' — ' + h.desc : ''}`)
    .join('\n')

  const prompt = `Scan these AI news headlines. Identify whether there is a SIGNIFICANT event or deal:

SIGNIFICANT EVENT = a major tech conference (Google I/O, Microsoft Build, OpenAI DevDay, Apple WWDC, AWS re:Invent), a major product keynote or platform launch by a top-5 AI company, a major model release.

SIGNIFICANT DEAL = an acquisition, merger, or funding round over $200M involving an AI company.

Do NOT flag: general AI news, product updates, minor partnerships, opinion pieces, small funding rounds.

Headlines:
${headlineList}

Reply with ONLY valid JSON, no other text:
{"found": true/false, "type": "event" or "deal" or null, "topic": "one sentence describing what happened" or null, "eventName": "the formal event name like Google I/O 2026" or null}`

  const raw = await callClaude(prompt, 200)

  try {
    // Extract JSON even if Claude adds surrounding text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.log('   Could not parse significance check response:', raw)
    return { found: false }
  }
}

// ─── Step 2: Write article ────────────────────────────────────────────────────

async function writeArticle(significance, recentTitles) {
  console.log(`✍️   Writing ${significance.type} article: "${significance.topic}"`)

  const recentBlock = recentTitles.length > 0
    ? `\nRECENTLY COVERED (do not repeat these topics):\n${recentTitles.map(t => `- ${t}`).join('\n')}\n`
    : ''

  const lengthRule = significance.type === 'event'
    ? '700-900 words. Use 5-6 sections: (1) What happened / context, (2) The 3-4 biggest announcements for business professionals, (3) What changed vs. expectations, (4) What it means for teams using these tools now, (5) Direction and what to watch next.'
    : '400-500 words. Use 4 sections: (1) What happened and the numbers, (2) Why this company wanted it, (3) What it signals for the industry, (4) What to watch next.'

  const prompt = `You are writing an article for Anshul Gupta's website (anshul.ai).

About Anshul: GTM Strategy leader at Google, Kellogg MBA, builds AI products without an engineering background, teaches practical AI to business professionals. His voice is direct, clear, practical — no hype, no jargon.

Topic to cover: ${significance.topic}
Article type: ${significance.type === 'event' ? 'Event coverage' : 'Deal analysis'}
${significance.eventName ? `Event name: ${significance.eventName}` : ''}

STRICT CONTENT RULES:
1. Never say anything negative about Google, its products, leadership, or decisions.
2. Never mention the US government, regulators, legislation, or political figures.
3. No em dashes. No AI clichés. No "Here's why/what", no "What this means for you", no "Why it matters".
4. Human tone. Short punchy sentences. Every sentence earns its place.
5. Length and structure: ${lengthRule}
${recentBlock}
HEADLINE RULES — critical:
Write a plain, human headline. Pick from styles like:
- Plain news: "Google I/O 2026 Changed the AI Stack"
- The contrast: "OpenAI Raised $40B. Then Restructured."
- The named shift: "Enterprise AI Just Got a New Default"
- The bold claim: "This Acquisition Reshapes the AI Infrastructure Market"
- The implication: "Gemini Is Now in Every Google Workspace"
- The verb-led: "Microsoft Bought the Team Behind the Model"
- The observation: "The Conference Circuit Is Setting AI Strategy Now"
- The short take: "Google I/O 2026 Was About Consolidation, Not Novelty"
No second-half explanation ("Here's why", "What this means"). Headline stands alone.

Output in EXACTLY this format (no extra text before or after):

TITLE: [title]
SLUG: [url-slug-lowercase-hyphens, max 60 chars]
TYPE: ${significance.type}
EVENTNAME: ${significance.eventName || ''}
EXCERPT: [2-3 sentences that make someone want to read. No fluff.]
---
[Article body. Use ## for section headings. Blank line between paragraphs.]`

  return await callClaude(prompt, 1500)
}

// ─── Parse Claude output ──────────────────────────────────────────────────────

function parseOutput(raw) {
  const titleMatch    = raw.match(/^TITLE:\s*(.+)$/m)
  const slugMatch     = raw.match(/^SLUG:\s*(.+)$/m)
  const typeMatch     = raw.match(/^TYPE:\s*(.+)$/m)
  const eventMatch    = raw.match(/^EVENTNAME:\s*(.*)$/m)
  const excerptMatch  = raw.match(/^EXCERPT:\s*([\s\S]+?)(?=\n---)/m)
  const bodyMatch     = raw.match(/---\n([\s\S]+)$/)

  if (!titleMatch || !slugMatch || !typeMatch || !bodyMatch) {
    console.error('Raw output:\n', raw)
    throw new Error('Claude output did not match expected format')
  }

  return {
    title:     titleMatch[1].trim(),
    slug:      slugMatch[1].trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
    type:      typeMatch[1].trim() === 'event' ? 'event' : 'deal',
    eventName: eventMatch ? eventMatch[1].trim() : '',
    excerpt:   excerptMatch ? excerptMatch[1].trim() : '',
    bodyRaw:   bodyMatch[1].trim(),
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

// ─── Publish ──────────────────────────────────────────────────────────────────

async function publish({ title, slug, type, eventName, excerpt, bodyRaw }) {
  const body = textToPortableText(bodyRaw)
  const wordCount = bodyRaw.split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  const doc = {
    _type: 'deal-event',
    _id: `deal-event-${slug}`,
    title,
    slug: { _type: 'slug', current: slug },
    type,
    ...(eventName ? { eventName } : {}),
    excerpt,
    publishedAt: new Date().toISOString(),
    readTime,
    body,
  }

  await sanity.createOrReplace(doc)
  console.log(`✅  Published: "${title}"`)
  console.log(`   → https://anshul.ai/deals-events/${slug}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀  Starting deals & events check...\n')

  const headlines = await fetchAllHeadlines()
  if (headlines.length === 0) {
    console.log('⚠️   No headlines fetched — skipping')
    return
  }

  const significance = await checkSignificance(headlines)

  if (!significance.found) {
    console.log('✔️   Nothing significant today — no article published\n')
    return
  }

  console.log(`   Detected: [${significance.type}] ${significance.topic}`)

  // Deduplication
  const recentTitles = await fetchRecentTitles()
  const raw = await writeArticle(significance, recentTitles)
  const article = parseOutput(raw)

  console.log(`\n📄  Article: "${article.title}"`)
  console.log(`   Type: ${article.type} | Slug: ${article.slug}\n`)

  await publish(article)
  console.log('\n✨  Done.\n')
}

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Do a dry-run to verify the script parses and connects (no publish)**

Temporarily add `process.exit(0)` before `await publish(article)` and run:

```bash
node scripts/generate-deals-events.mjs
```

Expected output starts with:
```
🚀  Starting deals & events check...
📡  Fetching headlines from RSS feeds...
   Found N headlines
🔍  Checking for significant events or deals...
```

Remove the `process.exit(0)` line after confirming it runs.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-deals-events.mjs
git commit -m "Add generate-deals-events automation script"
```

---

## Task 6: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/daily-deals-events.yml`

- [ ] **Step 1: Create `.github/workflows/daily-deals-events.yml`**

```yaml
name: Daily Deals & Events Check

on:
  schedule:
    - cron: '0 8 * * *'   # 8am UTC = ~1:30pm IST, 1hr after trending
  workflow_dispatch:        # manual trigger from GitHub Actions tab

jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check for significant deals or events and publish
        run: node scripts/generate-deals-events.mjs
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SANITY_WRITE_TOKEN: ${{ secrets.SANITY_WRITE_TOKEN }}
```

- [ ] **Step 2: Commit and push everything**

```bash
git add .github/workflows/daily-deals-events.yml
git commit -m "Add GitHub Actions workflow for daily deals & events check"
git push
```

- [ ] **Step 3: Verify deployment**

After pushing, confirm:
1. Vercel deploys successfully (check https://vercel.com/anshul-guptas-projects-a3a2c587/free-ai-school)
2. `/deals-events` page loads with empty state
3. "Deals & Events" link appears in the nav
4. Homepage shows the new section

- [ ] **Step 4: Trigger the workflow manually to test end-to-end**

Go to: https://github.com/nocoderdecoder/free-ai-school/actions → "Daily Deals & Events Check" → "Run workflow"

Expected: workflow completes in under 2 minutes. If something significant was in the RSS feeds, a new article appears at `/deals-events`.
