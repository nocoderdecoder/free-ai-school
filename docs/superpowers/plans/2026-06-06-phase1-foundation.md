# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Clerk, restructure site routes to match the new "AI strategy leader who builds" identity, add analytics, and update all navigation/footer links.

**Architecture:** Purely structural changes — no new features, no design changes. The site should look the same after this phase but have the correct URL structure and no Clerk dependency. All existing content continues to work at new routes. Old routes redirect where possible.

**Tech Stack:** Next.js 16, Tailwind CSS, Vercel Analytics

---

## File Structure

### Files to delete:
- `middleware.ts` (Clerk middleware — currently making all routes public, doing nothing)

### Files to create:
- `app/work/page.tsx` — new Work section (placeholder content, real content in Phase 3)
- `app/contact/page.tsx` — new Contact page (placeholder, real form in Phase 7)
- `app/analysis/page.tsx` — merged listing of trending + deals-events
- `app/projects/page.tsx` — replaces Lab with case-study framing (moves content from lab/page.tsx)

### Files to modify:
- `package.json` — remove @clerk/nextjs
- `app/layout.tsx` — remove ClerkProvider import and wrapper
- `app/components/Nav.tsx` — update all links to new routes
- `app/page.tsx` — update section links and footer links
- `app/sitemap.ts` — add new routes, update renamed routes
- `app/about/page.tsx` — update footer links
- `app/downloads/page.tsx` — update footer links
- `app/deals-events/page.tsx` — update footer links (page stays for now, analysis page also exists)
- `app/trending/page.tsx` — update footer links (page stays for now, analysis page also exists)
- `app/writing/page.tsx` — update footer links

### Files unchanged:
- `app/trending/[slug]/page.tsx` — slug routes stay, linked from analysis page
- `app/deals-events/[slug]/page.tsx` — slug routes stay, linked from analysis page
- `app/learn/page.tsx` — stays as-is (renamed to "AI School" in nav only)
- `app/learn/[slug]/page.tsx` — stays as-is
- `app/tools/speaking-speed/page.tsx` — stays as-is

---

### Task 1: Remove Clerk

**Files:**
- Delete: `middleware.ts`
- Modify: `app/layout.tsx`
- Modify: `package.json`

- [ ] **Step 1: Delete the middleware file**

```bash
rm middleware.ts
```

The middleware is 100% Clerk — it wraps `clerkMiddleware` and makes all routes public via `isPublicRoute` matching `/(.*)`). It does nothing useful.

- [ ] **Step 2: Remove ClerkProvider from layout.tsx**

In `app/layout.tsx`, remove the Clerk import and wrapper. Change from:

```tsx
import { ClerkProvider } from "@clerk/nextjs";
// ...
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
          <CursorSpotlight />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

To:

```tsx
// (remove ClerkProvider import entirely)
// ...
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <CursorSpotlight />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Uninstall Clerk package**

```bash
npm uninstall @clerk/nextjs
```

- [ ] **Step 4: Verify the dev server starts without errors**

```bash
npm run dev
```

Expected: Server starts on localhost:3000 with no Clerk-related errors.

- [ ] **Step 5: Verify the homepage loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

Expected: `200`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Clerk auth (unused)"
```

---

### Task 2: Add Vercel Analytics

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install Vercel Analytics**

```bash
npm install @vercel/analytics
```

- [ ] **Step 2: Add Analytics component to layout.tsx**

In `app/layout.tsx`, add the import and component:

```tsx
import { Analytics } from "@vercel/analytics/react";
```

Add `<Analytics />` just after `{children}` inside the `<body>`:

```tsx
<body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
  <CursorSpotlight />
  {children}
  <Analytics />
</body>
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected: No errors. Analytics silently initializes (only sends data in production on Vercel).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app/layout.tsx
git commit -m "feat: add Vercel Analytics"
```

---

### Task 3: Add Google Search Console verification

**Files:**
- Create: `public/google-site-verification.html` (or add meta tag to layout)

- [ ] **Step 1: Add meta tag verification to layout.tsx**

In `app/layout.tsx`, add inside the existing `metadata` export:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://anshul.ai'),
  verification: {
    google: 'PLACEHOLDER_VERIFICATION_CODE',
  },
  // ... rest of existing metadata
};
```

Note: The actual verification code needs to come from Google Search Console when Anshul sets up the property. For now, add the structure with a placeholder. Replace `PLACEHOLDER_VERIFICATION_CODE` with the real code after registering anshul.ai in GSC.

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add Google Search Console verification placeholder"
```

---

### Task 4: Create Analysis page (merged Trending + Deals & Events)

**Files:**
- Create: `app/analysis/page.tsx`

- [ ] **Step 1: Create the merged Analysis page**

Create `app/analysis/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'AI Analysis',
  description: 'Daily AI trending articles and major deals & events — analysed for business professionals.',
  openGraph: {
    title: 'AI Analysis — Daily Trends, Deals & Events',
    description: 'Daily AI trending articles and major deals & events — analysed for business professionals.',
    url: 'https://anshul.ai/analysis',
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

function TypeBadge({ type }: { type: 'trending' | 'event' | 'deal' }) {
  const styles: Record<string, { bg: string; color: string; border: string; label: string }> = {
    trending: { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: 'rgba(59,130,246,0.3)', label: 'Trending' },
    event:    { bg: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: 'rgba(124,58,237,0.3)', label: 'Event' },
    deal:     { bg: 'rgba(15,118,110,0.15)', color: '#2DD4BF', border: 'rgba(15,118,110,0.3)', label: 'Deal' },
  }
  const s = styles[type] ?? styles.trending
  return (
    <span
      className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  )
}

type AnalysisItem = {
  title: string
  slug: string
  excerpt?: string
  publishedAt: string
  source: 'trending' | 'deal-event'
  type?: 'event' | 'deal'
  eventName?: string
}

export default async function Analysis() {
  let items: AnalysisItem[] = []

  try {
    const [trending, dealEvents] = await Promise.all([
      client.fetch(
        `*[_type == "trending"] | order(publishedAt desc) { title, "slug": slug.current, excerpt, publishedAt }`
      ),
      client.fetch(
        `*[_type == "deal-event"] | order(publishedAt desc) { title, "slug": slug.current, excerpt, publishedAt, type, eventName }`
      ),
    ])

    const trendingItems: AnalysisItem[] = (trending ?? []).map((t: any) => ({
      ...t,
      source: 'trending' as const,
    }))

    const dealEventItems: AnalysisItem[] = (dealEvents ?? []).map((d: any) => ({
      ...d,
      source: 'deal-event' as const,
    }))

    items = [...trendingItems, ...dealEventItems].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch {
    items = []
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Analysis</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          AI trends, deals<br />& events.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          Daily AI analysis and coverage of major industry moves — written for business professionals, not researchers.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-20">
        {items.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-10 text-center">
            <p className="text-white/30 text-sm">Analysis articles coming soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const href = item.source === 'trending'
                ? `/trending/${item.slug}`
                : `/deals-events/${item.slug}`
              const badgeType = item.source === 'trending'
                ? 'trending'
                : (item.type ?? 'deal')

              return (
                <a
                  key={`${item.source}-${item.slug}`}
                  href={href}
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
                        <TypeBadge type={badgeType} />
                        {item.eventName && (
                          <span className="text-white/30 text-xs">{item.eventName}</span>
                        )}
                      </div>
                      <h2 className="text-base font-semibold mb-2 group-hover:text-white transition text-white/90 leading-snug">
                        {item.title}
                      </h2>
                      {item.excerpt && (
                        <p className="text-white/40 text-sm leading-relaxed line-clamp-2">
                          {item.excerpt}
                        </p>
                      )}
                    </div>
                    {item.publishedAt && (
                      <p className="text-white/25 text-xs shrink-0 mt-0.5">
                        {formatDate(item.publishedAt)}
                      </p>
                    )}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify the page loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/analysis
```

Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add app/analysis/page.tsx
git commit -m "feat: add merged Analysis page (trending + deals-events)"
```

---

### Task 5: Create Projects page (replaces Lab)

**Files:**
- Create: `app/projects/page.tsx`

- [ ] **Step 1: Create the Projects page**

Create `app/projects/page.tsx`. This is the Lab page content reframed as case studies. Copy the project data and card component from `app/lab/page.tsx` but update the framing:

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'AI products, tools, and platforms I have built — from automated content systems to interactive AI tools for business professionals.',
  openGraph: {
    title: 'Projects — AI Products I Have Built',
    description: 'AI products, tools, and platforms built at the intersection of AI and business strategy.',
    url: 'https://anshul.ai/projects',
  },
}

const projects = [
  {
    name: "anshul.ai Platform",
    tagline: "Full-stack AI education platform with automated content pipelines",
    image: "",
    url: "",
    status: "Live",
  },
  {
    name: "PromptGrade",
    tagline: "AI prompt scoring and rewriting",
    image: "/projects/promptgrade.png",
    url: "https://ratemyprompt.pro",
    status: "Live",
  },
  {
    name: "Speaking Speed Tester",
    tagline: "Real-time words-per-minute measurement",
    image: "",
    url: "/tools/speaking-speed",
    status: "Live",
  },
  {
    name: "AI News → LinkedIn Pipeline",
    tagline: "Automated content from signal to draft",
    image: "",
    url: "",
    status: "Running",
  },
  {
    name: "Competitive Intelligence Scraper",
    tagline: "Competitor tracking for strategy teams",
    image: "",
    url: "",
    status: "Internal",
  },
  {
    name: "HR Assistant Chatbot",
    tagline: "RAG-based answers from internal docs",
    image: "",
    url: "",
    status: "Demo",
  },
  {
    name: "CV Tailoring System",
    tagline: "Job-description-aware resume rewriting",
    image: "",
    url: "",
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

function ProjectCard({ project }: { project: typeof projects[number] }) {
  const isExternal = project.url.startsWith('http')

  const inner = (
    <>
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
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor[project.status] ?? 'bg-white/20'}`} />
          <span className="text-[10px] text-white/50">{project.status}</span>
        </div>
      </div>
      <div className="p-4">
        <h2 className="font-semibold text-sm mb-1 group-hover:text-white transition">{project.name}</h2>
        <p className="text-white/40 text-xs leading-relaxed">{project.tagline}</p>
      </div>
    </>
  )

  const shared = "block border border-white/10 rounded-xl overflow-hidden hover:border-white/25 transition group"

  if (project.url) {
    return (
      <a
        href={project.url}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className={shared}
      >
        {inner}
      </a>
    )
  }

  return <div className={shared}>{inner}</div>
}

export default function Projects() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Projects</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">Things I have<br />built with AI.</h1>
        <p className="text-white/60 text-xl leading-relaxed">
          Real products, platforms, and automations — built at the intersection of AI and business strategy, without a traditional engineering background.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-8 pb-20">
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

- [ ] **Step 2: Verify the page loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/projects
```

Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add app/projects/page.tsx
git commit -m "feat: add Projects page (case study framing, replaces Lab)"
```

---

### Task 6: Create Work page (placeholder)

**Files:**
- Create: `app/work/page.tsx`

- [ ] **Step 1: Create the Work page with placeholder structure**

Create `app/work/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Professional accomplishments in AI, GTM strategy, and digital transformation at Google, Unilever, and beyond.',
  openGraph: {
    title: 'Work — Professional Impact',
    description: 'AI strategy, digital transformation, and GTM leadership across Google, Unilever, and Kellogg.',
    url: 'https://anshul.ai/work',
  },
}

const accomplishments = [
  {
    org: "Google",
    title: "AI-Powered Competitive Intelligence Dashboard",
    description: "Led development of an AI dashboard enabling global teams to analyse consumer ratings and reviews at scale, driving data-informed business decisions across markets.",
    tags: ["AI", "GTM Strategy", "Business Intelligence"],
  },
  {
    org: "Google",
    title: "AI Analytics Dashboard — 300+ Users",
    description: "Built an AI-powered analytics dashboard adopted by 300+ professionals year-to-date, transforming how teams access and act on business intelligence.",
    tags: ["AI", "Product Development", "Adoption"],
  },
  {
    org: "Hindustan Unilever",
    title: "National GTM Transformation — GSK Acquisition",
    description: "Led national-scale change management for Hindustan Unilever's acquisition of GSK Consumer Healthcare. Unified sales teams, distributors, order processing tools, and analytics systems. Designed new GTM models during the pandemic and built incentive structures for the integrated sales force.",
    tags: ["Change Management", "GTM", "Digital Transformation"],
  },
  {
    org: "Kellogg / Uber",
    title: "Shuttle Service Launch Strategy",
    description: "Developed go-to-market strategy for Uber's shuttle service launch during a 3-month consulting engagement through Kellogg School of Management.",
    tags: ["GTM Strategy", "Consulting", "Product Launch"],
  },
]

export default function Work() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Work</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Professional<br />impact.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          AI strategy, digital transformation, and GTM leadership — applying technology to business problems at national and global scale.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-20">
        <div className="space-y-6">
          {accomplishments.map((item, i) => (
            <div
              key={i}
              className="border border-white/10 rounded-xl p-8 hover:border-white/20 transition"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-white/40 text-xs uppercase tracking-widest">{item.org}</span>
              </div>
              <h2 className="text-xl font-bold mb-3">{item.title}</h2>
              <p className="text-white/60 leading-relaxed mb-4">{item.description}</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-widest text-white/30 border border-white/10 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
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

- [ ] **Step 2: Verify the page loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/work
```

Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add app/work/page.tsx
git commit -m "feat: add Work page with professional accomplishments"
```

---

### Task 7: Create Contact page (placeholder)

**Files:**
- Create: `app/contact/page.tsx`

- [ ] **Step 1: Create the Contact page**

Create `app/contact/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch for speaking, media, collaboration, or other inquiries.',
  openGraph: {
    title: 'Contact — Anshul Gupta',
    description: 'Get in touch for speaking, media, collaboration, or other inquiries.',
    url: 'https://anshul.ai/contact',
  },
}

export default function Contact() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-xl mx-auto px-8 pt-20 pb-20">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Contact</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Get in touch.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed mb-12">
          Open to speaking engagements, media interviews, collaborations, and advisory opportunities in AI and GTM strategy.
        </p>

        <form className="space-y-6">
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Category</label>
            <select className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition appearance-none">
              <option value="speaking">Speaking inquiry</option>
              <option value="media">Media request</option>
              <option value="collaboration">Collaboration</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Name</label>
            <input
              type="text"
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Email</label>
            <input
              type="email"
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Message</label>
            <textarea
              rows={5}
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition resize-none"
              placeholder="What would you like to discuss?"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white text-black py-3 rounded-full font-medium text-sm hover:bg-white/90 transition"
          >
            Send message
          </button>
          <p className="text-white/20 text-xs text-center">
            Form submission will be enabled shortly.
          </p>
        </form>
      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify the page loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/contact
```

Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add app/contact/page.tsx
git commit -m "feat: add Contact page with categorized form placeholder"
```

---

### Task 8: Update Nav component

**Files:**
- Modify: `app/components/Nav.tsx`

- [ ] **Step 1: Update NAV_LINKS to reflect new site structure**

In `app/components/Nav.tsx`, change the `NAV_LINKS` constant from:

```tsx
const NAV_LINKS = [
  { label: 'About',    href: '/about' },
  { label: 'Lab',      href: '/lab' },
  { label: 'Trending',      href: '/trending' },
  { label: 'Deals & Events', href: '/deals-events' },
  { label: 'Writing',       href: '/writing' },
]
```

To:

```tsx
const NAV_LINKS = [
  { label: 'About',    href: '/about' },
  { label: 'Work',     href: '/work' },
  { label: 'Projects', href: '/projects' },
  { label: 'Analysis', href: '/analysis' },
  { label: 'Writing',  href: '/writing' },
  { label: 'Contact',  href: '/contact' },
]
```

- [ ] **Step 2: Update the Learn dropdown label**

The Learn nav item stays in the same position (mega-dropdown on the right). No changes needed to its structure — the label "Learn" is fine for now (it will be updated to "AI School" in Phase 3 when the content architecture is reworked).

- [ ] **Step 3: Update the mobile nav to include the same links**

The mobile nav uses the same `NAV_LINKS` array, so it will update automatically. Verify that the `DOWNLOADS_LINK` constant remains unchanged:

```tsx
const DOWNLOADS_LINK = { label: 'Downloads', href: '/downloads' }
```

This stays as-is.

- [ ] **Step 4: Verify the nav renders correctly on the homepage**

```bash
curl -s http://localhost:3000/ | grep -o 'href="/[^"]*"' | sort -u
```

Expected: Should include `/about`, `/work`, `/projects`, `/analysis`, `/writing`, `/contact`, `/downloads`, `/learn`, plus any other existing links.

- [ ] **Step 5: Commit**

```bash
git add app/components/Nav.tsx
git commit -m "feat: update Nav links for new site structure"
```

---

### Task 9: Update homepage section links and footer

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update the section link references on the homepage**

In `app/page.tsx`, make the following changes:

1. Update the "Lab" section link from `/lab` to `/projects`:

Change:
```tsx
<a href="/lab" className="border border-white/20 px-6 py-3 rounded-full font-medium hover:border-white/40 transition">
  See what I built
</a>
```
To:
```tsx
<a href="/projects" className="border border-white/20 px-6 py-3 rounded-full font-medium hover:border-white/40 transition">
  See what I built
</a>
```

2. Update the Lab section preview:

Change `<a href="/lab"` to `<a href="/projects"` and update the label from "Lab" to "Projects".

3. Update the Trending section to link to `/analysis`:

Change `<a href="/trending"` to `<a href="/analysis"`.

4. Update the Deals & Events section to link to `/analysis`:

Change `<a href="/deals-events"` to `<a href="/analysis"`.

5. Update all footer links to match the new structure. Change the footer's "Pages" column from:

```tsx
<a href="/about"     className="text-white/40 text-sm hover:text-white transition">About</a>
<a href="/lab"       className="text-white/40 text-sm hover:text-white transition">Lab</a>
<a href="/learn"     className="text-white/40 text-sm hover:text-white transition">Learn</a>
<a href="/trending"     className="text-white/40 text-sm hover:text-white transition">Trending</a>
<a href="/deals-events" className="text-white/40 text-sm hover:text-white transition">Deals & Events</a>
<a href="/writing"      className="text-white/40 text-sm hover:text-white transition">Writing</a>
<a href="/downloads"    className="text-white/40 text-sm hover:text-white transition">Downloads</a>
```

To:

```tsx
<a href="/about"     className="text-white/40 text-sm hover:text-white transition">About</a>
<a href="/work"      className="text-white/40 text-sm hover:text-white transition">Work</a>
<a href="/projects"  className="text-white/40 text-sm hover:text-white transition">Projects</a>
<a href="/learn"     className="text-white/40 text-sm hover:text-white transition">AI School</a>
<a href="/analysis"  className="text-white/40 text-sm hover:text-white transition">Analysis</a>
<a href="/writing"   className="text-white/40 text-sm hover:text-white transition">Writing</a>
<a href="/downloads" className="text-white/40 text-sm hover:text-white transition">Downloads</a>
<a href="/contact"   className="text-white/40 text-sm hover:text-white transition">Contact</a>
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: update homepage links for new site structure"
```

---

### Task 10: Update footer links on all other pages

**Files:**
- Modify: `app/about/page.tsx`
- Modify: `app/downloads/page.tsx`
- Modify: `app/deals-events/page.tsx`
- Modify: `app/trending/page.tsx`
- Modify: `app/writing/page.tsx`

- [ ] **Step 1: Update footer links on pages that have full footers**

For `app/about/page.tsx` — this has a simple footer with no links, no changes needed.

For `app/downloads/page.tsx` and `app/deals-events/page.tsx` — these have full footers with page links. Update the same way as the homepage footer (Task 9, Step 1, item 5).

For `app/trending/page.tsx` and `app/writing/page.tsx` — these have simple footers with no links, no changes needed.

- [ ] **Step 2: Verify all pages load without errors**

```bash
for path in / /about /work /projects /learn /analysis /trending /deals-events /writing /downloads /contact; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$path: $code"
done
```

Expected: All return `200`.

- [ ] **Step 3: Commit**

```bash
git add app/about/page.tsx app/downloads/page.tsx app/deals-events/page.tsx app/trending/page.tsx app/writing/page.tsx
git commit -m "feat: update footer links across all pages"
```

---

### Task 11: Update sitemap

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add new routes and update renamed routes in sitemap.ts**

In `app/sitemap.ts`, update the static routes array:

Change:

```tsx
return [
  { url: 'https://anshul.ai',              lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
  { url: 'https://anshul.ai/learn',        lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
  { url: 'https://anshul.ai/lab',          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  { url: 'https://anshul.ai/writing',      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
  { url: 'https://anshul.ai/deals-events', lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
  { url: 'https://anshul.ai/about',        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  { url: 'https://anshul.ai/downloads',    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
  ...articleUrls,
  ...dealEventUrls,
]
```

To:

```tsx
return [
  { url: 'https://anshul.ai',              lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
  { url: 'https://anshul.ai/work',         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
  { url: 'https://anshul.ai/projects',     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
  { url: 'https://anshul.ai/learn',        lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
  { url: 'https://anshul.ai/analysis',     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
  { url: 'https://anshul.ai/writing',      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
  { url: 'https://anshul.ai/downloads',    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
  { url: 'https://anshul.ai/about',        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  { url: 'https://anshul.ai/contact',      lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
  ...articleUrls,
  ...dealEventUrls,
]
```

Also add trending articles to the sitemap. Add this fetch after the existing `dealEvents` fetch:

```tsx
const trendingArticles = await client
  .fetch(`*[_type == "trending"] { "slug": slug.current, publishedAt }`)
  .catch(() => [])

const trendingUrls: MetadataRoute.Sitemap = trendingArticles.map((t: any) => ({
  url: `https://anshul.ai/trending/${t.slug}`,
  lastModified: t.publishedAt ? new Date(t.publishedAt) : new Date(),
  changeFrequency: 'weekly',
  priority: 0.7,
}))
```

And add `...trendingUrls` to the return array.

- [ ] **Step 2: Verify sitemap generates**

```bash
curl -s http://localhost:3000/sitemap.xml | head -20
```

Expected: Valid XML with the new routes.

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: update sitemap with new routes and trending articles"
```

---

### Task 12: Keep old routes accessible (no breaking links)

**Files:**
- No new files — existing routes remain

- [ ] **Step 1: Verify old routes still work**

The original pages at `/lab`, `/trending`, and `/deals-events` still exist as files and will continue to serve. The slug routes (`/trending/[slug]`, `/deals-events/[slug]`) are linked from the new Analysis page. No redirects needed yet — both old and new URLs work.

```bash
for path in /lab /trending /deals-events; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$path: $code"
done
```

Expected: All return `200`.

Note: In a future cleanup task, we can add `next.config.ts` redirects from `/lab` → `/projects` and `/trending` → `/analysis` for SEO. Not needed now.

- [ ] **Step 2: Final verification — all routes**

```bash
for path in / /about /work /projects /lab /learn /analysis /trending /deals-events /writing /downloads /contact /tools/speaking-speed; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$path: $code"
done
```

Expected: All return `200`.

- [ ] **Step 3: Commit (if any changes were needed)**

No commit needed if everything passes.

---

## Self-Review Results

**Spec coverage:** All items from Phase 1 scope are covered:
- ✅ Remove Clerk (Task 1)
- ✅ Restructure routes: `/projects`, `/analysis`, `/work`, `/contact` (Tasks 4-7)
- ✅ Add Vercel Analytics (Task 2)
- ✅ Google Search Console (Task 3)
- ✅ Update Nav (Task 8)
- ✅ Update sitemap (Task 11)
- ✅ Update footer links (Tasks 9-10)
- ✅ Old routes remain accessible (Task 12)

**Placeholder scan:** No TBDs or vague instructions. All code is complete. The Contact form is visually complete but submission is labeled as "coming shortly" — this is intentional, wired up in Phase 6.

**Type consistency:** All route paths used consistently across Nav, footer, sitemap, and page files. `NAV_LINKS` array matches actual created routes.
