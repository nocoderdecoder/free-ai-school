# Homepage Redesign — "The Editorial" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the anshul.ai homepage from dark monochrome to a warm editorial design — off-white backgrounds, serif/sans-serif font pairing, colored content cards, magazine-like layout.

**Architecture:** Homepage-scoped redesign. Global tokens are preserved (other pages still use the dark theme). The homepage gets its own inline styles and component structure. Fonts are added globally via `next/font/google` in `layout.tsx`. The Nav component is updated to support both light and dark variants via a `variant` prop so other pages aren't broken.

**Tech Stack:** Next.js (App Router), Tailwind CSS, next/font/google (Instrument Serif, DM Sans), Sanity CMS (trending articles), Framer Motion (existing, keep for hero animations).

**Spec:** `docs/superpowers/specs/2026-06-20-homepage-redesign-design.md`
**Mockup:** `.superpowers/brainstorm/33167-1781981809/content/editorial-full.html`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/layout.tsx` | Modify | Add Instrument Serif + DM Sans fonts, expose as CSS variables, remove CustomCursor + noise overlay |
| `app/design/tokens.css` | Modify | Add editorial color tokens (prefixed `--ed-*`) alongside existing dark tokens |
| `app/globals.css` | Modify | Add editorial utility classes, keep existing dark styles for other pages |
| `app/components/Nav.tsx` | Modify | Add `variant="light"` prop — warm off-white nav with serif logo, frosted glass, dark Contact CTA. Default stays dark for other pages. |
| `app/page.tsx` | Rewrite | New homepage layout: two-column hero with trending sidebar, featured cards (School, Projects), bottom cards (Writing, Lab), minimal footer |
| `app/design/grain.css` | Modify | Scope grain to dark pages only (add `.grain-dark` class) |

Components **not touched** (only removed from homepage imports): `AnimatedHero.tsx`, `MetricsStrip.tsx`, `ToolsMarquee.tsx`, `ScrollSection.tsx`. They remain for other pages that use them.

---

### Task 1: Add editorial fonts to layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Import Instrument Serif and DM Sans**

Open `app/layout.tsx` and add the font imports alongside the existing Geist fonts:

```tsx
import { Geist, Geist_Mono } from "next/font/google";
import { Instrument_Serif, DM_Sans } from "next/font/google";
```

Add the font instances below the existing ones:

```tsx
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});
```

- [ ] **Step 2: Add font variables to body className**

Update the `<body>` tag to include the new font variables:

```tsx
<body
  className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${dmSans.variable} h-full antialiased`}
>
```

- [ ] **Step 3: Remove CustomCursor and noise overlay from layout**

Remove the `CustomCursor` import and both `<CustomCursor />` and `<div className="noise-overlay" />` from the JSX. The `grain` class on body should also be removed. The resulting body content:

```tsx
<body
  className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${dmSans.variable} h-full antialiased`}
>
  {children}
  <Analytics />
</body>
```

- [ ] **Step 4: Verify the dev server starts without errors**

Run: `npm run dev`
Expected: Server starts, no font loading errors. Existing pages still render (they use Geist, which is unchanged).

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add Instrument Serif + DM Sans fonts, remove custom cursor and noise overlay"
```

---

### Task 2: Add editorial design tokens

**Files:**
- Modify: `app/design/tokens.css`
- Modify: `app/design/grain.css`

- [ ] **Step 1: Add editorial tokens to tokens.css**

Add these at the end of the `:root` block in `app/design/tokens.css`, after the existing tokens:

```css
/* ── Editorial theme (homepage) ── */
--ed-bg:           #FDFCFA;
--ed-card-warm:    #F3F0EB;
--ed-card-school:  #E8F0FE;
--ed-card-projects:#F3E8FF;
--ed-text:         #222222;
--ed-text-dark:    #1a1a1a;
--ed-text-secondary:#555555;
--ed-text-muted:   #888888;
--ed-text-faint:   #999999;
--ed-text-light:   #bbbbbb;
--ed-border:       #E8E5E0;
--ed-card-hover:   #EBE7E0;
--ed-cta:          #222222;
--ed-trending-dot: #4CAF50;

--font-serif:      var(--font-instrument-serif), serif;
--font-sans:       var(--font-dm-sans), sans-serif;
```

- [ ] **Step 2: Scope grain effect to opt-in class**

In `app/design/grain.css`, change `.grain::before` to `.grain-dark::before`:

```css
.grain-dark::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
}
```

- [ ] **Step 3: Add `grain-dark` class to pages that need it**

The grain effect was previously on the `<body>` in layout.tsx (removed in Task 1). Pages that want grain should add `grain-dark` to their own wrapper. This is a follow-up concern for other pages — the homepage won't use it.

- [ ] **Step 4: Commit**

```bash
git add app/design/tokens.css app/design/grain.css
git commit -m "feat: add editorial design tokens, scope grain to opt-in class"
```

---

### Task 3: Update Nav to support light variant

**Files:**
- Modify: `app/components/Nav.tsx`

- [ ] **Step 1: Add variant prop to Nav**

Update the Nav component signature to accept a `variant` prop:

```tsx
export function Nav({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
```

- [ ] **Step 2: Add light variant styles**

Create style constants at the top of the component based on the variant:

```tsx
const isLight = variant === 'light'

const navStyle = isLight
  ? {
      backgroundColor: 'rgba(253,252,250,0.92)',
      borderColor: 'var(--ed-border)',
    }
  : {
      backgroundColor: 'var(--glass-bg)',
      borderColor: 'var(--glass-border)',
    }

const logoClass = isLight
  ? 'text-lg'
  : 'font-bold text-lg'

const logoStyle = isLight
  ? { fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#222' }
  : {}

const linkClass = (active: boolean) => isLight
  ? `transition ${active ? 'text-[#222]' : 'text-[#999] hover:text-[#222]'}`
  : `transition ${active ? 'text-white' : 'text-white/50 hover:text-white'}`

const mobileOverlayBg = isLight ? 'bg-[#FDFCFA]' : 'bg-black'
const mobileLinkClass = (active: boolean) => isLight
  ? `py-3 text-xl font-medium border-b border-[#E8E5E0] transition ${active ? 'text-[#222]' : 'text-[#999]'}`
  : `py-3 text-xl font-medium border-b border-white/[0.06] transition ${active ? 'text-white' : 'text-white/50'}`
```

- [ ] **Step 3: Update nav JSX to use variant styles**

Replace the `<nav>` element's static styles with the variant-driven ones:

```tsx
<nav
  className="sticky top-0 z-50 flex justify-between items-center px-8 py-5 border-b backdrop-blur-xl"
  style={navStyle}
>
  <a href="/" className={logoClass} style={logoStyle}>Anshul Gupta</a>
```

Update each nav link to use `linkClass(isActive(link.href))` instead of the hardcoded dark class.

For the Contact CTA in light mode, render a dark pill:

```tsx
{isLight ? (
  <a
    href="/contact"
    className="text-xs font-semibold px-5 py-2 rounded-md transition"
    style={{ background: '#222', color: '#FDFCFA', fontSize: '12px' }}
  >
    Contact
  </a>
) : (
  /* existing Downloads pill + Learn dropdown */
)}
```

- [ ] **Step 4: Update light nav link list**

For the light variant, use a different set of nav links matching the spec:

```tsx
const LIGHT_NAV_LINKS = [
  { label: 'AI School', href: '/learn' },
  { label: 'Projects',  href: '/projects' },
  { label: 'Trending',  href: '/trending' },
  { label: 'Writing',   href: '/writing' },
  { label: 'About',     href: '/about' },
]
```

Render `LIGHT_NAV_LINKS` when `isLight`, `NAV_LINKS` + Downloads + Learn dropdown when dark.

- [ ] **Step 5: Update mobile overlay for light variant**

Update the mobile menu overlay to use `mobileOverlayBg` and `mobileLinkClass`. The close button should use `text-[#999]` in light mode instead of `text-white/60`.

- [ ] **Step 6: Verify both variants work**

Check that:
- Homepage (will use `variant="light"` after Task 4) renders the warm nav
- Any other page (e.g. `/learn`) still renders the dark nav by default

- [ ] **Step 7: Commit**

```bash
git add app/components/Nav.tsx
git commit -m "feat: add light variant to Nav for editorial homepage"
```

---

### Task 4: Rewrite the homepage

**Files:**
- Rewrite: `app/page.tsx`

This is the main task. The new homepage has: Nav (light), two-column hero with trending sidebar, two featured cards, two bottom cards, minimal footer.

- [ ] **Step 1: Write the new page.tsx**

Replace the entire contents of `app/page.tsx` with the new homepage. The structure:

```tsx
import type { Metadata } from 'next'
import { createClient } from 'next-sanity'
import { Nav } from './components/Nav'

export const metadata: Metadata = {
  title: 'Anshul Gupta — AI Builder & Educator',
  description: 'GTM Strategy at Google. Kellogg MBA. I build AI products without an engineering degree and teach practical AI to business professionals.',
  openGraph: {
    title: 'Anshul Gupta — AI Builder & Educator',
    description: 'GTM Strategy at Google. Kellogg MBA. I build AI products and teach practical AI to business professionals.',
    url: 'https://anshul.ai',
    type: 'website',
  },
  twitter: {
    title: 'Anshul Gupta — AI Builder & Educator',
    description: 'GTM Strategy at Google. Kellogg MBA. I build AI products and teach practical AI to business professionals.',
  },
}

export const revalidate = 60

const sanity = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export default async function Home() {
  let trendingArticles: { title: string; slug: string; publishedAt: string }[] = []
  let totalTrending = 0
  try {
    const [articles, count] = await Promise.all([
      sanity.fetch(
        `*[_type == "trending"] | order(publishedAt desc)[0...4] { title, "slug": slug.current, publishedAt }`
      ),
      sanity.fetch(`count(*[_type == "trending"])`),
    ])
    trendingArticles = articles || []
    totalTrending = count || 0
  } catch {}

  return (
    <main style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      {/* Hero */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: '56px',
          alignItems: 'start',
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '80px 48px 64px',
        }}
        className="ed-hero"
      >
        {/* Left */}
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '54px',
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: '-0.01em',
              color: 'var(--ed-text-dark)',
              marginBottom: '20px',
            }}
          >
            Building AI tools for people who run things.
          </h1>
          <p style={{ fontSize: '17px', lineHeight: 1.7, color: 'var(--ed-text-muted)', marginBottom: '32px', maxWidth: '480px' }}>
            GTM Strategy at Google. Kellogg MBA. I build AI products without an engineering degree and teach what I learn — all of it, openly.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
            <a
              href="/projects"
              style={{ background: 'var(--ed-cta)', color: 'var(--ed-bg)', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s' }}
            >
              See what I&apos;ve built
            </a>
            <a
              href="/learn"
              style={{ background: 'var(--ed-card-warm)', color: 'var(--ed-text-secondary)', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s' }}
            >
              Start learning →
            </a>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '32px',
              fontSize: '13px',
              color: 'var(--ed-text-light)',
              paddingTop: '24px',
              borderTop: '1px solid var(--ed-border)',
            }}
          >
            <div><strong style={{ color: 'var(--ed-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '1px' }}>Google</strong>GTM Strategy</div>
            <div><strong style={{ color: 'var(--ed-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '1px' }}>Kellogg</strong>Northwestern MBA</div>
            <div><strong style={{ color: 'var(--ed-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '1px' }}>Previously</strong>Uber</div>
          </div>
        </div>

        {/* Right — Trending sidebar */}
        <aside
          style={{
            background: 'var(--ed-card-warm)',
            borderRadius: '14px',
            padding: '28px',
          }}
        >
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ed-text-faint)', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ed-trending-dot)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Trending today
          </div>
          {trendingArticles.map((article, i) => (
            <a
              key={article.slug}
              href={`/trending/${article.slug}`}
              className="ed-trend-item"
              style={{
                display: 'block',
                padding: '14px 0',
                borderTop: i === 0 ? 'none' : '1px solid #E0DCD6',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'padding-left 0.15s',
              }}
            >
              <h4 style={{ fontSize: '14px', fontWeight: 500, color: '#333', lineHeight: 1.4, marginBottom: '3px' }}>
                {article.title}
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--ed-text-light)' }}>
                {new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </a>
          ))}
          {totalTrending > 4 && (
            <a
              href="/trending"
              style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--ed-text-faint)',
                fontWeight: 500,
                textDecoration: 'none',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid #E0DCD6',
                transition: 'color 0.15s',
              }}
              className="ed-trend-all"
            >
              Browse all {totalTrending}+ articles →
            </a>
          )}
        </aside>
      </section>

      {/* Featured cards */}
      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 48px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="ed-cards">
        <a href="/learn" className="ed-feat-card" style={{ padding: '44px', borderRadius: '14px', background: 'var(--ed-card-school)', textDecoration: 'none', color: 'var(--ed-text)', display: 'flex', flexDirection: 'column', transition: 'filter 0.25s, transform 0.25s' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '16px', opacity: 0.5 }}>Education</span>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, lineHeight: 1.2, marginBottom: '12px' }}>Free AI School</h3>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ed-text-muted)', marginBottom: '20px', flex: 1 }}>
            Five modules, ninety-nine articles. A complete curriculum for business professionals — no prerequisites, no engineering degree.
          </p>
          <span className="ed-feat-link" style={{ fontSize: '13px', color: 'var(--ed-text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>Start learning →</span>
        </a>
        <a href="/projects" className="ed-feat-card" style={{ padding: '44px', borderRadius: '14px', background: 'var(--ed-card-projects)', textDecoration: 'none', color: 'var(--ed-text)', display: 'flex', flexDirection: 'column', transition: 'filter 0.25s, transform 0.25s' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '16px', opacity: 0.5 }}>Projects</span>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, lineHeight: 1.2, marginBottom: '12px' }}>AI tools I&apos;ve built</h3>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ed-text-muted)', marginBottom: '20px', flex: 1 }}>
            Prompt scoring, competitive intelligence, learning compass — real products I built and shipped in public.
          </p>
          <span className="ed-feat-link" style={{ fontSize: '13px', color: 'var(--ed-text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>View all projects →</span>
        </a>
      </section>

      {/* Bottom cards */}
      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 48px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="ed-cards">
        <a href="/writing" className="ed-bottom-card" style={{ padding: '36px', background: 'var(--ed-card-warm)', borderRadius: '14px', textDecoration: 'none', color: 'var(--ed-text)', display: 'flex', flexDirection: 'column', transition: 'background 0.25s, transform 0.25s' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, marginBottom: '8px', lineHeight: 1.25 }}>Writing</h3>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ed-text-muted)', marginBottom: '18px', flex: 1 }}>
            Honest takes on building with AI. What&apos;s working, what failed, and what I think is actually happening right now.
          </p>
          <span style={{ fontSize: '12px', color: 'var(--ed-text-secondary)', fontWeight: 600 }}>Read the essays →</span>
        </a>
        <a href="/lab" className="ed-bottom-card" style={{ padding: '36px', background: 'var(--ed-card-warm)', borderRadius: '14px', textDecoration: 'none', color: 'var(--ed-text)', display: 'flex', flexDirection: 'column', transition: 'background 0.25s, transform 0.25s' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, marginBottom: '8px', lineHeight: 1.25 }}>Lab</h3>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ed-text-muted)', marginBottom: '18px', flex: 1 }}>
            Interactive AI tools you can try right now — prompt scorer, learning compass, and more.
          </p>
          <span style={{ fontSize: '12px', color: 'var(--ed-text-secondary)', fontWeight: 600 }}>Open the lab →</span>
        </a>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--ed-border)', maxWidth: '1080px', margin: '0 auto', padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--ed-text-light)' }}>
          <strong style={{ color: 'var(--ed-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Anshul Gupta</strong>
          © {new Date().getFullYear()} · anshul.ai
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="https://github.com/nocoderdecoder" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--ed-text-faint)', textDecoration: 'none', transition: 'color 0.15s' }} className="ed-footer-link">GitHub</a>
          <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--ed-text-faint)', textDecoration: 'none', transition: 'color 0.15s' }} className="ed-footer-link">LinkedIn</a>
          <a href="/contact" style={{ fontSize: '13px', color: 'var(--ed-text-faint)', textDecoration: 'none', transition: 'color 0.15s' }} className="ed-footer-link">Contact</a>
        </div>
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: rewrite homepage with editorial design"
```

---

### Task 5: Add editorial CSS utilities

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add editorial hover and interaction styles**

Add these at the end of `app/globals.css`:

```css
/* ── Editorial homepage styles ── */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.ed-feat-card:hover {
  filter: brightness(0.96);
  transform: translateY(-2px);
}

.ed-bottom-card:hover {
  background: var(--ed-card-hover) !important;
  transform: translateY(-1px);
}

.ed-trend-item:hover {
  padding-left: 6px;
}

.ed-trend-item:hover h4 {
  color: #111 !important;
}

.ed-trend-all:hover {
  color: var(--ed-text) !important;
}

.ed-feat-card:hover .ed-feat-link {
  gap: 10px;
}

.ed-footer-link:hover {
  color: var(--ed-text) !important;
}

/* Editorial responsive */
@media (max-width: 900px) {
  .ed-hero {
    grid-template-columns: 1fr !important;
    padding: 48px 24px 40px !important;
    gap: 32px !important;
  }

  .ed-hero h1 {
    font-size: 38px !important;
  }

  .ed-cards {
    grid-template-columns: 1fr !important;
    padding-left: 24px !important;
    padding-right: 24px !important;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add editorial hover states and responsive styles"
```

---

### Task 6: Visual verification

**Files:** None (read-only)

- [ ] **Step 1: Start the dev server and open the homepage**

Run: `npm run dev`
Open: `http://localhost:3000`

Check:
- Warm off-white background renders
- Serif font (Instrument Serif) loads for logo, h1, card headings
- Sans-serif font (DM Sans) loads for body text, nav links
- Trending sidebar shows real articles from Sanity
- Green pulse dot animates
- Cards hover with lift + darken
- Trending items slide right on hover
- Footer links work

- [ ] **Step 2: Check responsive layout**

Resize browser to ≤900px width. Check:
- Hero collapses to single column
- Trending sidebar stacks below hero
- Featured cards stack vertically
- Bottom cards stack vertically
- H1 shrinks to 38px

- [ ] **Step 3: Check other pages aren't broken**

Navigate to `/learn`, `/projects`, `/about`, `/trending`. Check:
- Dark theme still renders (dark backgrounds, white text)
- Nav renders in dark variant (default)
- No console errors

- [ ] **Step 4: Commit any fixes needed**

If any visual issues found, fix and commit with descriptive message.

---

### Task 7: Clean up unused imports and dead CSS

**Files:**
- Modify: `app/globals.css` (remove noise-overlay if nothing uses it now)

- [ ] **Step 1: Check if noise-overlay is used anywhere besides layout**

Run: `grep -r "noise-overlay" app/ --include="*.tsx" --include="*.css"`

If only referenced in `globals.css` (the class definition) and nowhere in any TSX file (since we removed it from layout.tsx), remove the `.noise-overlay` CSS block from `globals.css`.

- [ ] **Step 2: Check if shimmer-text is used anywhere besides homepage**

Run: `grep -r "shimmer-text\|shimmer-shift" app/ --include="*.tsx"`

If only used in the old `page.tsx` (now rewritten), remove the `.shimmer-text` and `@keyframes shimmer-shift` blocks from `globals.css`.

- [ ] **Step 3: Check if hero-gradient is used anywhere besides homepage**

Run: `grep -r "hero-gradient\|gradient-shift" app/ --include="*.tsx"`

If only used in the old homepage (via AnimatedHero), remove `.hero-gradient` and `@keyframes gradient-shift` blocks from `globals.css`.

- [ ] **Step 4: Commit cleanup**

```bash
git add app/globals.css
git commit -m "chore: remove unused dark-theme CSS from homepage redesign"
```
