# Phase 3: Content Architecture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform placeholder content into a premium portfolio that positions Anshul as an "AI strategy leader who builds" — with a rewritten About page, case study project pages, an authored Writing section, and a repositioned homepage. All changes serve the dual purpose of EB1A evidence and AI leadership hiring.

**Architecture:** All new content lives in existing pages (no new routes). One new Sanity schema (`project`) for case studies. One new Sanity schema (`post`) for authored writing. All pages are server components fetching from Sanity at build time. Static-first where possible.

**Tech Stack:** Next.js 16 App Router, Sanity CMS, Portable Text, existing design system (tokens, ScrollSection, heading classes)

**Depends on:** Phase 2 complete — design tokens, typography classes, scroll animations, all in place.

---

## File Structure

### Files to create:
- `sanity/schemaTypes/project.js` — Case study schema (name, slug, tagline, status, description, impact, tools, year, url, coverImage, featured)
- `sanity/schemaTypes/post.js` — Authored writing schema (title, slug, excerpt, publishedAt, readTime, status: published|draft|coming-soon, body)
- `app/projects/[slug]/page.tsx` — Case study detail page
- `app/writing/[slug]/page.tsx` — Authored post detail page

### Files to modify:
- `sanity/schemaTypes/index.js` — Register new schemas
- `sanity/structure.js` — Add new document types to Studio sidebar
- `app/about/page.tsx` — Full rewrite with endeavor framing, career arc, headshot placeholder, evidence links
- `app/projects/page.tsx` — Fetch from Sanity instead of hardcoded array; keep static fallback
- `app/writing/page.tsx` — Connect to Sanity `post` schema; show published first, coming-soon below
- `app/page.tsx` — Sharpen hero copy for "AI strategy leader who builds" positioning

---

### Task 1: Sanity `project` schema

**Files:**
- Create: `sanity/schemaTypes/project.js`
- Modify: `sanity/schemaTypes/index.js`

- [ ] **Step 1: Create the project schema**

Create `sanity/schemaTypes/project.js`:

```js
export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Project Name',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
      validation: Rule => Rule.required()
    },
    {
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'One-line description shown on listing card',
      validation: Rule => Rule.required()
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Live', value: 'Live' },
          { title: 'Running', value: 'Running' },
          { title: 'Internal', value: 'Internal' },
          { title: 'Demo', value: 'Demo' },
          { title: 'Built', value: 'Built' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Show at top of projects listing',
      initialValue: false,
    },
    {
      name: 'year',
      title: 'Year',
      type: 'number',
      description: 'Year built or launched'
    },
    {
      name: 'url',
      title: 'Live URL',
      type: 'url',
      description: 'Leave blank if private or internal'
    },
    {
      name: 'tools',
      title: 'Tools & Technologies',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'e.g. Claude API, Next.js, Sanity, n8n'
    },
    {
      name: 'impact',
      title: 'Impact Summary',
      type: 'string',
      description: 'One-line quantified outcome e.g. "94 articles automated, 0 manual hours"'
    },
    {
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: '2-3 sentences for the listing card'
    },
    {
      name: 'body',
      title: 'Case Study Body',
      type: 'array',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', title: 'Alt text', type: 'string' },
            { name: 'caption', title: 'Caption', type: 'string' }
          ]
        }
      ]
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'tagline',
    }
  }
}
```

- [ ] **Step 2: Register the schema**

In `sanity/schemaTypes/index.js`, add the import and register:

```js
import article from './article'
import trending from './trending'
import dealEvent from './dealEvent'
import project from './project'

export const schemaTypes = [article, trending, dealEvent, project]
```

- [ ] **Step 3: Commit**

```bash
git add sanity/schemaTypes/project.js sanity/schemaTypes/index.js
git commit -m "feat: add Sanity project case study schema"
```

---

### Task 2: Sanity `post` schema (authored writing)

**Files:**
- Create: `sanity/schemaTypes/post.js`
- Modify: `sanity/schemaTypes/index.js`

- [ ] **Step 1: Create the post schema**

Create `sanity/schemaTypes/post.js`:

```js
export default {
  name: 'post',
  title: 'Post (Authored Writing)',
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
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Published', value: 'published' },
          { title: 'Coming Soon (show preview)', value: 'coming-soon' },
          { title: 'Draft (hidden)', value: 'draft' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
      validation: Rule => Rule.required()
    },
    {
      name: 'excerpt',
      title: 'Excerpt / Preview',
      type: 'text',
      rows: 3,
      description: 'Shown in listing and on coming-soon cards',
      validation: Rule => Rule.required()
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
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', title: 'Alt text', type: 'string' },
            { name: 'caption', title: 'Caption', type: 'string' }
          ]
        }
      ]
    },
  ],
  orderings: [
    {
      title: 'Published date, newest first',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }]
    }
  ]
}
```

- [ ] **Step 2: Register the schema**

In `sanity/schemaTypes/index.js`:

```js
import article from './article'
import trending from './trending'
import dealEvent from './dealEvent'
import project from './project'
import post from './post'

export const schemaTypes = [article, trending, dealEvent, project, post]
```

- [ ] **Step 3: Commit**

```bash
git add sanity/schemaTypes/post.js sanity/schemaTypes/index.js
git commit -m "feat: add Sanity post schema for authored writing"
```

---

### Task 3: Projects page — fetch from Sanity with static fallback

**Files:**
- Modify: `app/projects/page.tsx`

The projects page currently uses a hardcoded array. Update it to try fetching from Sanity `project` documents, falling back to the hardcoded list if Sanity returns nothing. This way the page works immediately and Anshul can populate Sanity over time.

- [ ] **Step 1: Update the projects page**

Replace `app/projects/page.tsx` with:

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Real products, platforms, and automations — built at the intersection of AI and business strategy, without a traditional engineering background.',
  openGraph: {
    title: 'Projects — Things I Have Built with AI',
    description: 'Real products, platforms, and automations — built at the intersection of AI and business strategy, without a traditional engineering background.',
    url: 'https://anshul.ai/projects',
  },
}

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

type Project = {
  name: string
  tagline: string
  slug?: string
  url?: string
  status: string
  image?: string
  excerpt?: string
  impact?: string
  tools?: string[]
  featured?: boolean
}

// Static fallback — shown if Sanity has no project documents yet
const STATIC_PROJECTS: Project[] = [
  {
    name: "anshul.ai Platform",
    tagline: "Full-stack AI education platform with automated content pipelines",
    status: "Live",
    impact: "94 articles automated, 0 manual hours per publish",
  },
  {
    name: "PromptGrade",
    tagline: "AI prompt scoring and rewriting",
    url: "https://ratemyprompt.pro",
    status: "Live",
  },
  {
    name: "Speaking Speed Tester",
    tagline: "Real-time words-per-minute measurement",
    url: "/tools/speaking-speed",
    status: "Live",
  },
  {
    name: "AI News → LinkedIn Pipeline",
    tagline: "Automated content from signal to draft",
    status: "Running",
  },
  {
    name: "Competitive Intelligence Scraper",
    tagline: "Competitor tracking for strategy teams",
    status: "Internal",
  },
  {
    name: "HR Assistant Chatbot",
    tagline: "RAG-based answers from internal docs",
    status: "Demo",
  },
  {
    name: "CV Tailoring System",
    tagline: "Job-description-aware resume rewriting",
    status: "Built",
  },
]

const statusColor: Record<string, string> = {
  Live:     "bg-emerald-500",
  Running:  "bg-blue-500",
  Internal: "bg-amber-500",
  Demo:     "bg-purple-500",
  Built:    "bg-white/40",
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function ProjectCard({ project }: { project: Project }) {
  const isExternalUrl = project.url?.startsWith('http')
  const hasDetailPage = !!project.slug
  const href = hasDetailPage ? `/projects/${project.slug}` : (project.url ?? '')

  const inner = (
    <>
      {/* Image / placeholder — fixed 16:9 */}
      <div className="relative w-full aspect-video overflow-hidden bg-white/[0.03]">
        {project.image ? (
          <img
            src={project.image}
            alt={project.name}
            className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(255,255,255,0.04) 24px),' +
                'repeating-linear-gradient(90deg,transparent,transparent 23px,rgba(255,255,255,0.04) 24px)',
            }}
          >
            <span className="text-3xl font-bold text-white/10 tracking-widest select-none">
              {initials(project.name)}
            </span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor[project.status] ?? 'bg-white/20'}`} />
          <span className="text-[10px] text-white/50">{project.status}</span>
        </div>
      </div>

      {/* Text */}
      <div className="p-4">
        <h2 className="font-semibold text-sm mb-1 group-hover:text-white transition">{project.name}</h2>
        <p className="text-white/40 text-xs leading-relaxed">{project.tagline}</p>
        {project.impact && (
          <p className="text-emerald-400/60 text-xs mt-2 font-medium">{project.impact}</p>
        )}
      </div>
    </>
  )

  const shared = "block border border-white/10 rounded-xl overflow-hidden hover:border-white/25 transition group card-hover"

  if (href) {
    return (
      <a
        href={href}
        target={isExternalUrl && !hasDetailPage ? '_blank' : undefined}
        rel={isExternalUrl && !hasDetailPage ? 'noopener noreferrer' : undefined}
        data-cursor="View"
        className={shared}
      >
        {inner}
      </a>
    )
  }

  return <div className={shared}>{inner}</div>
}

export default async function Projects() {
  let projects: Project[] = []

  try {
    const sanityProjects = await client.fetch(
      `*[_type == "project"] | order(featured desc, _createdAt asc) {
        name,
        "slug": slug.current,
        tagline,
        status,
        featured,
        url,
        impact,
        tools,
        excerpt,
        "image": coverImage.asset->url,
      }`
    )
    projects = sanityProjects?.length > 0 ? sanityProjects : STATIC_PROJECTS
  } catch {
    projects = STATIC_PROJECTS
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4">Projects</p>
        <h1 className="heading-page mb-6">Things I have built with AI.</h1>
        <p className="text-white/60 text-xl leading-relaxed">
          Real products, platforms, and automations — built at the intersection of AI and business strategy, without a traditional engineering background.
        </p>
      </section>

      {/* Grid */}
      <section className="max-w-5xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/projects/page.tsx
git commit -m "feat: projects page fetches from Sanity with static fallback"
```

---

### Task 4: Projects case study detail page

**Files:**
- Create: `app/projects/[slug]/page.tsx`

- [ ] **Step 1: Create the case study detail page**

Create `app/projects/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Nav } from '../../components/Nav'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import { portableTextComponents } from '../../components/PortableTextComponents'

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

export async function generateStaticParams() {
  try {
    const projects = await client.fetch(
      `*[_type == "project" && defined(slug.current)] { "slug": slug.current }`
    )
    return (projects ?? []).map((p: { slug: string }) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const project = await client.fetch(
      `*[_type == "project" && slug.current == $slug][0] { name, tagline, excerpt }`,
      { slug }
    )
    if (!project) return { title: 'Project Not Found' }
    return {
      title: project.name,
      description: project.excerpt ?? project.tagline,
      openGraph: {
        title: `${project.name} — Anshul Gupta`,
        description: project.excerpt ?? project.tagline,
        url: `https://anshul.ai/projects/${slug}`,
      },
    }
  } catch {
    return { title: 'Project' }
  }
}

const statusColor: Record<string, string> = {
  Live:     "bg-emerald-500",
  Running:  "bg-blue-500",
  Internal: "bg-amber-500",
  Demo:     "bg-purple-500",
  Built:    "bg-white/40",
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let project: any = null
  try {
    project = await client.fetch(
      `*[_type == "project" && slug.current == $slug][0] {
        name,
        tagline,
        status,
        year,
        url,
        tools,
        impact,
        excerpt,
        body,
        "coverImage": coverImage.asset->url,
      }`,
      { slug }
    )
  } catch {}

  if (!project) notFound()

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      {/* Header */}
      <section className="max-w-3xl mx-auto px-8 pt-28 pb-12">
        <a href="/projects" className="section-label mb-8 inline-block hover:text-white transition">
          ← Projects
        </a>

        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor[project.status] ?? 'bg-white/20'}`} />
            <span className="text-[10px] text-white/50 uppercase tracking-widest">{project.status}</span>
          </div>
          {project.year && (
            <span className="text-white/30 text-xs">{project.year}</span>
          )}
        </div>

        <h1 className="heading-page mb-4">{project.name}</h1>
        <p className="text-white/60 text-xl leading-relaxed mb-8">{project.tagline}</p>

        {/* Meta strip */}
        <div className="flex flex-wrap gap-6 py-6 border-y border-white/10">
          {project.impact && (
            <div>
              <p className="section-label mb-1">Impact</p>
              <p className="text-emerald-400 text-sm font-medium">{project.impact}</p>
            </div>
          )}
          {project.url && (
            <div>
              <p className="section-label mb-1">Live at</p>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/70 hover:text-white transition underline underline-offset-2"
              >
                {project.url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {project.tools?.length > 0 && (
            <div>
              <p className="section-label mb-2">Built with</p>
              <div className="flex flex-wrap gap-1.5">
                {project.tools.map((tool: string) => (
                  <span
                    key={tool}
                    className="text-[10px] uppercase tracking-widest text-white/30 border border-white/10 px-2.5 py-1 rounded-full"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Cover image */}
      {project.coverImage && (
        <section className="max-w-3xl mx-auto px-8 mb-12">
          <img
            src={project.coverImage}
            alt={project.name}
            className="w-full rounded-xl border border-white/10"
          />
        </section>
      )}

      {/* Case study body */}
      {project.body && (
        <section className="max-w-3xl mx-auto px-8 pb-32">
          <div className="prose prose-invert prose-lg max-w-none">
            <PortableText value={project.body} components={portableTextComponents} />
          </div>
        </section>
      )}

      {!project.body && (
        <section className="max-w-3xl mx-auto px-8 pb-32">
          <div className="border border-white/10 rounded-xl p-10 text-center">
            <p className="text-white/30 text-sm">Case study coming soon.</p>
          </div>
        </section>
      )}

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/projects/[slug]/page.tsx
git commit -m "feat: project case study detail page"
```

---

### Task 5: Writing page — connect to Sanity

**Files:**
- Modify: `app/writing/page.tsx`

- [ ] **Step 1: Update the writing page**

Replace `app/writing/page.tsx` with:

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Honest takes on AI in business — what I am building, what is working, what failed, and what is actually happening in AI from someone doing it daily.',
  openGraph: {
    title: 'Writing — Honest Takes on AI in Business',
    description: 'What I am building, what is working, what failed, and what is actually happening in AI — from someone doing it daily, not just writing about it.',
    url: 'https://anshul.ai/writing',
  },
}

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

// Static coming-soon previews — shown when no Sanity posts exist yet
const UPCOMING_TOPICS = [
  {
    title: "Why your company's AI strategy is backwards",
    preview: "Most organisations are asking 'what can AI do?' The question that produces results is different.",
  },
  {
    title: "What I learned building 6 AI products without writing code",
    preview: "The tools changed. The thinking required did not. Here is what actually matters when you build.",
  },
  {
    title: "The AI adoption gap nobody talks about",
    preview: "It is not about access to tools. Almost everyone has access. The gap is something else entirely.",
  },
  {
    title: "How to evaluate an AI vendor without a technical team",
    preview: "The questions that expose whether a product is real, the red flags that do not show up in demos.",
  },
  {
    title: "How I built a 94-article AI school without writing content manually",
    preview: "The automation pipeline, the tools, the decisions — and what it means for content creation at scale.",
  },
  {
    title: "The real ROI of AI in business — a framework",
    preview: "Executives want numbers. Here is how I think about measuring AI impact when the outcomes are messy.",
  },
]

type Post = {
  title: string
  slug?: string
  excerpt: string
  publishedAt?: string
  readTime?: number
  status: 'published' | 'coming-soon' | 'draft'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function Writing() {
  let published: Post[] = []
  let comingSoon: Post[] = []

  try {
    const posts = await client.fetch(
      `*[_type == "post" && status != "draft"] | order(publishedAt desc) {
        title,
        "slug": slug.current,
        excerpt,
        publishedAt,
        readTime,
        status,
      }`
    )

    if (posts?.length > 0) {
      published = posts.filter((p: Post) => p.status === 'published')
      comingSoon = posts.filter((p: Post) => p.status === 'coming-soon')
    }
  } catch {}

  // If no Sanity posts, use static upcoming topics as coming-soon
  if (comingSoon.length === 0 && published.length === 0) {
    comingSoon = UPCOMING_TOPICS.map(t => ({
      title: t.title,
      excerpt: t.preview,
      status: 'coming-soon' as const,
    }))
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4">Writing</p>
        <h1 className="heading-page mb-6">
          Honest takes on<br />AI in business.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          What I am building, what is working, what failed, and what I think is actually happening in AI — from someone doing it daily, not just writing about it.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32 space-y-16">

        {/* Published articles */}
        {published.length > 0 && (
          <div>
            <p className="section-label mb-8">Published</p>
            <div className="space-y-3">
              {published.map((post) => (
                <a
                  key={post.slug ?? post.title}
                  href={`/writing/${post.slug}`}
                  className="group block border border-white/10 rounded-xl p-6 hover:border-white/25 transition card-hover"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h2 className="text-base font-semibold mb-2 text-white/90 group-hover:text-white transition leading-snug">
                        {post.title}
                      </h2>
                      <p className="text-white/40 text-sm leading-relaxed">{post.excerpt}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {post.publishedAt && (
                        <p className="text-white/25 text-xs">{formatDate(post.publishedAt)}</p>
                      )}
                      {post.readTime && (
                        <p className="text-white/20 text-xs mt-1">{post.readTime} min read</p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Coming soon */}
        {comingSoon.length > 0 && (
          <div>
            <p className="section-label mb-8">{published.length > 0 ? 'Coming soon' : 'Upcoming'}</p>
            <div className="space-y-0">
              {comingSoon.map((post, i) => (
                <div
                  key={post.title}
                  className={`py-7 ${i < comingSoon.length - 1 ? 'border-b border-white/10' : ''}`}
                >
                  <h2 className="text-lg font-semibold mb-2 text-white/60">{post.title}</h2>
                  <p className="text-white/35 text-sm leading-relaxed">{post.excerpt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LinkedIn bridge */}
        <div className="border border-white/10 rounded-xl p-8">
          <p className="section-label mb-4">In the meantime</p>
          <p className="text-white/70 leading-relaxed mb-6">
            Shorter takes, tool discoveries, and things I am thinking about appear more frequently on LinkedIn. Follow along there while longer pieces take shape here.
          </p>
          <a
            href="https://www.linkedin.com/in/anshul-gupta1/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-medium text-sm hover:bg-white/90 transition btn-press"
          >
            Follow on LinkedIn →
          </a>
        </div>

      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/writing/page.tsx
git commit -m "feat: writing page connects to Sanity post schema"
```

---

### Task 6: Writing detail page

**Files:**
- Create: `app/writing/[slug]/page.tsx`

- [ ] **Step 1: Create the writing detail page**

Create `app/writing/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Nav } from '../../components/Nav'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import { portableTextComponents } from '../../components/PortableTextComponents'

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

export async function generateStaticParams() {
  try {
    const posts = await client.fetch(
      `*[_type == "post" && status == "published" && defined(slug.current)] { "slug": slug.current }`
    )
    return (posts ?? []).map((p: { slug: string }) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const post = await client.fetch(
      `*[_type == "post" && slug.current == $slug][0] { title, excerpt }`,
      { slug }
    )
    if (!post) return { title: 'Post Not Found' }
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: {
        title: `${post.title} — Anshul Gupta`,
        description: post.excerpt,
        url: `https://anshul.ai/writing/${slug}`,
      },
    }
  } catch {
    return { title: 'Post' }
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function WritingPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let post: any = null
  try {
    post = await client.fetch(
      `*[_type == "post" && slug.current == $slug && status == "published"][0] {
        title, excerpt, publishedAt, readTime, body
      }`,
      { slug }
    )
  } catch {}

  if (!post) notFound()

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <article className="max-w-3xl mx-auto px-8 pt-28 pb-32">
        <a href="/writing" className="section-label mb-8 inline-block hover:text-white transition">
          ← Writing
        </a>

        <header className="mt-4 mb-12">
          <h1 className="heading-page mb-6">{post.title}</h1>
          <div className="flex items-center gap-4">
            {post.publishedAt && (
              <span className="text-white/30 text-sm">{formatDate(post.publishedAt)}</span>
            )}
            {post.readTime && (
              <span className="text-white/20 text-sm">{post.readTime} min read</span>
            )}
          </div>
          {post.excerpt && (
            <p className="text-white/60 text-xl leading-relaxed mt-6 border-l-2 border-white/10 pl-6">
              {post.excerpt}
            </p>
          )}
        </header>

        {post.body && (
          <div className="prose prose-invert prose-lg max-w-none">
            <PortableText value={post.body} components={portableTextComponents} />
          </div>
        )}
      </article>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/writing/[slug]/page.tsx"
git commit -m "feat: writing post detail page"
```

---

### Task 7: About page rewrite

**Files:**
- Modify: `app/about/page.tsx`

Full rewrite with headshot placeholder, endeavor framing, career arc narrative, and evidence links.

- [ ] **Step 1: Replace the About page**

Replace `app/about/page.tsx` with:

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { ScrollSection } from '../components/ScrollSection'

export const metadata: Metadata = {
  title: 'About',
  description: 'Anshul Gupta — AI strategy leader building at the intersection of business and AI. GTM at Google, Kellogg MBA, EB1A petitioner democratizing AI for business professionals.',
  openGraph: {
    title: 'About — Anshul Gupta',
    description: 'AI strategy leader building at the intersection of business and AI. GTM at Google, Kellogg MBA.',
    url: 'https://anshul.ai/about',
  },
}

const timeline = [
  {
    period: "2013–2018",
    org: "Hindustan Unilever / GSK",
    role: "Brand Manager & GTM Lead",
    detail: "Built commercial operations across rural and urban India. Led national go-to-market integration for Hindustan Unilever's acquisition of GSK Consumer Healthcare — merging sales teams, order management systems, analytics tools, and incentive structures across thousands of distributors during the pandemic.",
    tags: ["GTM", "Change Management", "Digital Transformation"],
  },
  {
    period: "2019–2020",
    org: "Kellogg School of Management",
    role: "MBA — Northwestern University",
    detail: "Strategy, leadership, and management from one of the world's leading business schools. Consulting engagement with Uber on go-to-market strategy for their shuttle service launch.",
    tags: ["Strategy", "MBA", "Consulting"],
  },
  {
    period: "2021–Present",
    org: "Google",
    role: "GTM Strategy & Business Intelligence",
    detail: "Go-to-market strategy and business intelligence for one of the world's most advanced AI organisations. Built AI-powered dashboards adopted by 300+ professionals for competitive intelligence and market analysis. Working at the frontier of how AI reshapes commercial strategy.",
    tags: ["AI", "GTM", "Business Intelligence"],
  },
  {
    period: "2024–Present",
    org: "anshul.ai",
    role: "Builder & Educator",
    detail: "Building an AI education platform and toolset from scratch — no engineering team, no funding, no prior coding experience. 94 articles automated, 6 tools shipped, thousands of learners. The platform is both a proof of concept and a live demonstration of what's possible when business professionals build with AI.",
    tags: ["Building", "Education", "AI Tools"],
  },
]

export default function About() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 pt-28 pb-16">
        <div className="flex flex-col sm:flex-row gap-10 items-start">
          {/* Headshot placeholder */}
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-white/10 flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-card)' }}
            aria-label="Headshot placeholder"
          >
            <span className="text-white/20 text-2xl font-bold">AG</span>
          </div>

          <div className="flex-1">
            <p className="section-label mb-3">About</p>
            <h1 className="heading-page mb-4">
              Anshul Gupta
            </h1>
            <p className="text-white/50 text-lg leading-relaxed">
              GTM Strategy at Google · Kellogg MBA · Builder
            </p>
          </div>
        </div>
      </section>

      {/* Endeavor framing */}
      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-16">
          <div className="space-y-5">
            <p className="text-white/80 text-lg leading-relaxed">
              I am working on democratizing AI for business and GTM professionals. The gap I keep seeing: most people in commercial roles know AI exists but do not know how to use it in their actual work — how to evaluate it, how to build with it, or how to lead a team through adopting it.
            </p>
            <p className="text-white/70 text-lg leading-relaxed">
              My answer is to build tools and education in public, share the process openly, and prove that meaningful AI products can be built by business-minded people without an engineering background.
            </p>
            <p className="text-white/70 text-lg leading-relaxed">
              This site is both the work and the evidence — a live platform built and operated by one person using AI tools, reaching learners and practitioners who want to actually use AI, not just read about it.
            </p>
          </div>
        </section>
      </ScrollSection>

      {/* Career arc */}
      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-16">
          <p className="section-label mb-10">Career</p>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <div
                key={item.org}
                className={`py-8 ${i < timeline.length - 1 ? 'border-b border-white/10' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 sm:justify-between mb-3">
                  <div>
                    <span className="text-white font-semibold">{item.org}</span>
                    <span className="text-white/40 text-sm ml-3">{item.role}</span>
                  </div>
                  <span className="text-white/25 text-xs sm:ml-4 shrink-0">{item.period}</span>
                </div>
                <p className="text-white/55 text-sm leading-relaxed mb-4">{item.detail}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-widest text-white/25 border border-white/10 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollSection>

      {/* Evidence links */}
      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-32">
          <p className="section-label mb-8">Explore</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { href: '/work',      label: 'Professional work',     desc: 'AI dashboards, GTM transformation, strategic impact at scale' },
              { href: '/projects',  label: 'What I have built',     desc: 'Products, tools, and automations shipped without an engineering team' },
              { href: '/learn',     label: 'The AI School',         desc: '94 articles, 5 modules — practical AI for business professionals' },
              { href: '/writing',   label: 'Writing',               desc: 'Honest takes on building with AI and what is actually happening in the field' },
              { href: '/analysis',  label: 'Daily AI analysis',     desc: 'What is happening in AI, every day, analysed for business context' },
              { href: '/downloads', label: 'Downloadable resources', desc: 'Cheatsheets, frameworks, and guides for AI practitioners' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="border border-white/10 rounded-xl p-6 hover:border-white/25 transition card-hover group"
              >
                <h2 className="font-semibold text-sm mb-1.5 group-hover:text-white transition">{link.label} →</h2>
                <p className="text-white/40 text-xs leading-relaxed">{link.desc}</p>
              </a>
            ))}
          </div>
        </section>
      </ScrollSection>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/about/page.tsx
git commit -m "feat: About page rewrite with endeavor framing and career arc"
```

---

### Task 8: Homepage hero repositioning

**Files:**
- Modify: `app/page.tsx`

Sharpen hero copy to position Anshul as "AI strategy leader who builds" rather than educator. The learner CTA moves to secondary.

- [ ] **Step 1: Update hero copy in app/page.tsx**

In `app/page.tsx`, find the `<AnimatedHero>` block and update the hero text:

Change the `<h1>` from:
```tsx
<h1 style={{ fontSize: 'var(--text-hero)', lineHeight: 1.05, letterSpacing: '-0.03em' }} className="font-bold mb-6">
  <span className="shimmer-text">I build with AI.</span>
  <br />I teach what I learn.
</h1>
```
To:
```tsx
<h1 style={{ fontSize: 'var(--text-hero)', lineHeight: 1.05, letterSpacing: '-0.03em' }} className="font-bold mb-6">
  <span className="shimmer-text">AI strategy.</span>
  <br />Built in public.
</h1>
```

Change the subtitle from:
```tsx
<p className="text-white/60 text-xl leading-relaxed mb-10">
  GTM Strategy at Google. Kellogg MBA. I ship real AI products without an engineering background and share everything along the way.
</p>
```
To:
```tsx
<p className="text-white/60 text-xl leading-relaxed mb-10">
  GTM Strategy at Google. Kellogg MBA. Building AI tools and education for business professionals — and sharing everything openly.
</p>
```

Change the CTAs from:
```tsx
<div className="flex items-center gap-4 flex-wrap">
  <a href="/learn" className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition btn-press">
    Learn AI with me
  </a>
  <a href="/projects" className="border border-white/20 px-6 py-3 rounded-full font-medium hover:border-white/40 transition btn-press">
    See what I built
  </a>
  <a
    href="https://www.linkedin.com/in/anshul-gupta1/"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 text-white/40 hover:text-white transition text-sm"
  >
    <LinkedInIcon />
    LinkedIn
  </a>
</div>
```
To:
```tsx
<div className="flex items-center gap-4 flex-wrap">
  <a href="/projects" className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition btn-press">
    See what I built
  </a>
  <a href="/work" className="border border-white/20 px-6 py-3 rounded-full font-medium hover:border-white/40 transition btn-press">
    Professional work
  </a>
  <a href="/learn" className="flex items-center gap-1 text-white/40 hover:text-white transition text-sm">
    AI School →
  </a>
</div>
```

- [ ] **Step 2: Verify homepage renders correctly**

Read the updated file to make sure edits are clean. Check there are no broken imports or mismatched tags.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: homepage hero repositioned for AI strategy leader framing"
```

---

### Task 9: Update sitemap for new routes

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add /writing/[slug] and /projects/[slug] to sitemap**

In `app/sitemap.ts`, the sitemap currently fetches trending articles for dynamic routes. Add fetches for published posts and project slugs.

Read the current sitemap file first. Then add:

```ts
// Fetch authored posts
const posts = await sanity.fetch(
  `*[_type == "post" && status == "published" && defined(slug.current)] { "slug": slug.current, publishedAt }`
).catch(() => [])

// Fetch project case studies
const projects = await sanity.fetch(
  `*[_type == "project" && defined(slug.current)] { "slug": slug.current, _updatedAt }`
).catch(() => [])
```

Then add the dynamic routes to the return array:

```ts
// In the return array, add after trending articles:
...posts.map((p: any) => ({
  url: `${base}/writing/${p.slug}`,
  lastModified: p.publishedAt ? new Date(p.publishedAt) : new Date(),
  changeFrequency: 'monthly' as const,
  priority: 0.7,
})),
...projects.map((p: any) => ({
  url: `${base}/projects/${p.slug}`,
  lastModified: p._updatedAt ? new Date(p._updatedAt) : new Date(),
  changeFrequency: 'monthly' as const,
  priority: 0.7,
})),
```

Also add static routes for `/writing` if not already there.

- [ ] **Step 2: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: sitemap includes writing posts and project case studies"
```

---

## Self-Review

**Spec coverage:**
- ✅ Work section — exists and good as-is (4 accomplishments, card layout). No detail pages needed yet.
- ✅ About page rewrite — Task 7 (headshot placeholder, endeavor framing, career arc, evidence links)
- ✅ Projects case study schema + detail page — Tasks 1, 3, 4
- ✅ Analysis page — already merged in Phase 1
- ✅ Writing page — Task 5 (Sanity `post` schema), Task 6 (detail page)
- ✅ Homepage repositioning — Task 8 (hero copy, CTA order)
- ✅ Sitemap updated — Task 9

**What's NOT in this plan (deferred to later phases):**
- Headshot photo upload — requires Anshul to upload photo to Sanity (can do anytime)
- Seeding Sanity with project documents — Anshul does this via /studio
- Writing the actual authored articles — Phase 8 (ongoing)
- OG image generation — Phase 7
