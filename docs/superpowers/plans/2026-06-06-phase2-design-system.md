# Phase 2: Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate anshul.ai from a clean template to a $100k-quality premium dark-theme site with micro-interactions, scroll-driven animations, custom typography, and polished UX across all devices.

**Architecture:** A shared design system layer (CSS variables, animation utilities, shared components) that all pages consume. Framer Motion for animations, CSS custom properties for the design token system, View Transitions API for page transitions. All changes are visual — no new content or features.

**Tech Stack:** Tailwind CSS, Framer Motion, CSS custom properties, View Transitions API, CSS scroll-driven animations

**Depends on:** Phase 1 (Foundation) must be complete — routes and nav structure are final.

---

## File Structure

### Files to create:
- `app/design/tokens.css` — CSS custom properties for colors, spacing, typography scale
- `app/design/grain.css` — Noise/grain texture overlay
- `app/components/AnimatedHero.tsx` — New hero with animated gradient + typewriter effect
- `app/components/GlassNav.tsx` — Replaces current Nav styling with glassmorphism
- `app/components/PageTransition.tsx` — View Transitions wrapper
- `app/components/ScrollSection.tsx` — Replaces ScrollReveal with richer scroll-driven animations
- `app/components/SkeletonCard.tsx` — Loading skeleton component
- `app/components/MetricsStrip.tsx` — Homepage metrics counter strip
- `app/components/CustomCursor.tsx` — Contextual cursor system (replaces CursorSpotlight)
- `app/not-found.tsx` — Custom 404 page with easter egg

### Files to modify:
- `app/globals.css` — Import design tokens, grain, base typography
- `app/layout.tsx` — Add PageTransition, CustomCursor, remove CursorSpotlight
- `app/page.tsx` — Apply new hero, spacing, metrics strip, scroll sections
- `app/components/Nav.tsx` — Apply glass effect styling
- `app/components/ScrollReveal.tsx` — May be replaced by ScrollSection
- `app/components/CursorSpotlight.tsx` — Replaced by CustomCursor
- All page files — Apply new spacing rhythm (larger padding)

### Files to delete:
- `app/components/CursorSpotlight.tsx` (replaced by CustomCursor)
- `app/components/ScrollReveal.tsx` (replaced by ScrollSection)

---

### Task 1: Install Framer Motion

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install framer-motion**

```bash
npm install framer-motion
```

- [ ] **Step 2: Verify installation**

```bash
npm ls framer-motion
```

Expected: Shows framer-motion in the dependency tree.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add framer-motion for animations"
```

---

### Task 2: Design token system

**Files:**
- Create: `app/design/tokens.css`
- Modify: `app/globals.css`

- [ ] **Step 1: Create the design tokens file**

Create `app/design/tokens.css`:

```css
:root {
  /* ── Surfaces ── */
  --bg-deep:    #050505;
  --bg-base:    #0a0a0a;
  --bg-raised:  #111111;
  --bg-overlay: #1a1a1a;
  --bg-card:    rgba(255, 255, 255, 0.03);
  --bg-card-hover: rgba(255, 255, 255, 0.06);

  /* ── Glass ── */
  --glass-bg:   rgba(10, 10, 10, 0.8);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-blur: 16px;

  /* ── Accent ── */
  --accent:       #3B82F6;
  --accent-glow:  rgba(59, 130, 246, 0.15);
  --accent-muted: rgba(59, 130, 246, 0.4);

  /* ── Text ── */
  --text-primary:    rgba(255, 255, 255, 1);
  --text-secondary:  rgba(255, 255, 255, 0.7);
  --text-tertiary:   rgba(255, 255, 255, 0.4);
  --text-muted:      rgba(255, 255, 255, 0.25);
  --text-ghost:      rgba(255, 255, 255, 0.12);

  /* ── Borders ── */
  --border-subtle:  rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-hover:   rgba(255, 255, 255, 0.20);
  --border-active:  rgba(255, 255, 255, 0.30);

  /* ── Typography scale ── */
  --text-xs:   0.75rem;    /* 12px */
  --text-sm:   0.875rem;   /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg:   1.125rem;   /* 18px */
  --text-xl:   1.25rem;    /* 20px */
  --text-2xl:  1.5rem;     /* 24px */
  --text-3xl:  2rem;       /* 32px */
  --text-4xl:  2.5rem;     /* 40px */
  --text-5xl:  3.5rem;     /* 56px */
  --text-hero: 4.5rem;     /* 72px */

  /* ── Spacing rhythm ── */
  --space-section: 10rem;   /* 160px — between major sections */
  --space-block:   5rem;    /* 80px — between blocks within a section */
  --space-element: 2rem;    /* 32px — between elements */
  --space-tight:   1rem;    /* 16px — tight spacing */

  /* ── Timing ── */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out:   cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast:  150ms;
  --duration-base:  300ms;
  --duration-slow:  600ms;
  --duration-enter: 800ms;

  /* ── Radius ── */
  --radius-sm:  0.5rem;
  --radius-md:  0.75rem;
  --radius-lg:  1rem;
  --radius-xl:  1.5rem;
  --radius-full: 9999px;
}
```

- [ ] **Step 2: Import tokens in globals.css**

At the top of `app/globals.css`, add:

```css
@import './design/tokens.css';
```

- [ ] **Step 3: Verify the dev server loads without CSS errors**

```bash
npm run dev
```

Expected: No errors. Existing styles unchanged (tokens aren't applied yet).

- [ ] **Step 4: Commit**

```bash
git add app/design/tokens.css app/globals.css
git commit -m "feat: add design token system (colors, typography, spacing)"
```

---

### Task 3: Grain texture overlay

**Files:**
- Create: `app/design/grain.css`
- Modify: `app/globals.css`

- [ ] **Step 1: Create the grain texture CSS**

Create `app/design/grain.css`:

```css
.grain::before {
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

- [ ] **Step 2: Import grain in globals.css**

Add after the tokens import in `app/globals.css`:

```css
@import './design/grain.css';
```

- [ ] **Step 3: Add the grain class to the body in layout.tsx**

In `app/layout.tsx`, add `grain` to the body className:

```tsx
<body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased grain`}>
```

- [ ] **Step 4: Verify the grain is visible**

Check localhost:3000 — a very subtle film grain should be visible over the entire page. It should not interfere with clicking or scrolling (pointer-events: none).

- [ ] **Step 5: Commit**

```bash
git add app/design/grain.css app/globals.css app/layout.tsx
git commit -m "feat: add subtle grain texture overlay"
```

---

### Task 4: Dark theme elevation (background layering)

**Files:**
- Modify: `app/globals.css`
- Modify: `app/page.tsx`

- [ ] **Step 1: Update the base body background**

In `app/globals.css`, add a base style:

```css
body {
  background-color: var(--bg-deep);
  color: var(--text-primary);
}
```

- [ ] **Step 2: Update the homepage to use layered backgrounds**

In `app/page.tsx`, change the main element from:

```tsx
<main className="min-h-screen bg-black text-white">
```

To:

```tsx
<main className="min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
```

Update the credential strip section to use a raised surface:

```tsx
<section className="border-t border-white/10">
```

Change to:

```tsx
<section className="border-t" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-base)' }}>
```

This creates visible depth — the main content sits on `--bg-deep` (#050505), the credential strip sits on `--bg-base` (#0a0a0a), creating a subtle layering effect.

- [ ] **Step 3: Verify the layering is visible**

Check localhost:3000 — the credential strip section should appear very slightly lighter than the hero and content sections above/below it. The difference is subtle but creates depth.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/page.tsx
git commit -m "feat: add dark theme depth layering"
```

---

### Task 5: Glassmorphism navigation

**Files:**
- Modify: `app/components/Nav.tsx`

- [ ] **Step 1: Update the nav styling for glass effect**

In `app/components/Nav.tsx`, change the nav element from:

```tsx
<nav className="sticky top-0 z-50 flex justify-between items-center px-8 py-6 border-b border-white/10 bg-black/90 backdrop-blur-md">
```

To:

```tsx
<nav
  className="sticky top-0 z-50 flex justify-between items-center px-8 py-5 border-b backdrop-blur-xl"
  style={{
    backgroundColor: 'var(--glass-bg)',
    borderColor: 'var(--glass-border)',
  }}
>
```

- [ ] **Step 2: Update the dropdown panel styling**

In the same file, update the dropdown panel container. Change:

```tsx
<div className="flex rounded-2xl overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)', minWidth: 600 }}>
```

To:

```tsx
<div
  className="flex rounded-2xl overflow-hidden backdrop-blur-xl"
  style={{
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.05) inset',
    minWidth: 600,
  }}
>
```

- [ ] **Step 3: Verify the nav has a frosted glass appearance**

Check localhost:3000 — scroll down so content passes behind the nav. The nav should have a frosted/blurred effect showing content behind it dimly.

- [ ] **Step 4: Commit**

```bash
git add app/components/Nav.tsx
git commit -m "feat: glassmorphism navigation bar"
```

---

### Task 6: Spatial rhythm overhaul

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/about/page.tsx`
- Modify: `app/work/page.tsx`
- Modify: `app/projects/page.tsx`
- Modify: `app/learn/page.tsx`
- Modify: `app/analysis/page.tsx`
- Modify: `app/writing/page.tsx`
- Modify: `app/downloads/page.tsx`
- Modify: `app/contact/page.tsx`

- [ ] **Step 1: Update hero padding across all pages**

On every page, update the hero section padding from `pt-20 pb-12` (or similar) to `pt-28 pb-20`. This gives the hero significantly more breathing room.

For example, in `app/about/page.tsx`:

Change:
```tsx
<section className="max-w-3xl mx-auto px-8 pt-20 pb-16">
```
To:
```tsx
<section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
```

Apply the same pattern to all pages:
- `app/page.tsx`: hero section `py-24` → `pt-32 pb-24`
- `app/about/page.tsx`: `pt-20 pb-16` → `pt-28 pb-20`
- `app/work/page.tsx`: `pt-20 pb-12` → `pt-28 pb-20`
- `app/projects/page.tsx`: `pt-20 pb-12` → `pt-28 pb-20`
- `app/learn/page.tsx`: `pt-20 pb-12` → `pt-28 pb-20`
- `app/analysis/page.tsx`: `pt-20 pb-12` → `pt-28 pb-20`
- `app/writing/page.tsx`: `pt-20 pb-16` → `pt-28 pb-20`
- `app/downloads/page.tsx`: `pt-20 pb-12` → `pt-28 pb-20`
- `app/contact/page.tsx`: `pt-20 pb-20` → `pt-28 pb-20`

- [ ] **Step 2: Update content section padding**

For content sections below the hero, increase bottom padding from `pb-20` to `pb-32`:
- `app/projects/page.tsx`: grid section `pb-20` → `pb-32`
- `app/analysis/page.tsx`: list section `pb-20` → `pb-32`
- `app/work/page.tsx`: accomplishments section `pb-20` → `pb-32`

- [ ] **Step 3: Update homepage section dividers**

On `app/page.tsx`, the section cards inside the grid currently use `py-12`. Change to `py-16` for more breathing room between sections.

- [ ] **Step 4: Verify the spacing feels generous but not empty**

Check several pages at localhost:3000. Sections should feel like they have room to breathe. Nothing should feel cramped. The hero on each page should feel prominent.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/about/page.tsx app/work/page.tsx app/projects/page.tsx app/learn/page.tsx app/analysis/page.tsx app/writing/page.tsx app/downloads/page.tsx app/contact/page.tsx
git commit -m "feat: spatial rhythm overhaul — generous whitespace across all pages"
```

---

### Task 7: Animated hero with gradient

**Files:**
- Create: `app/components/AnimatedHero.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add hero gradient animation to globals.css**

Add to `app/globals.css`:

```css
@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 60% at 50% 40%,
    var(--accent-glow) 0%,
    transparent 70%
  );
  opacity: 0.4;
  animation: gradient-shift 8s ease-in-out infinite;
  background-size: 200% 200%;
  pointer-events: none;
}

@keyframes shimmer-shift {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.shimmer-text {
  background: linear-gradient(
    90deg,
    var(--text-primary) 0%,
    var(--accent) 25%,
    var(--text-primary) 50%,
    var(--accent) 75%,
    var(--text-primary) 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer-shift 6s linear infinite;
}
```

- [ ] **Step 2: Create the AnimatedHero component**

Create `app/components/AnimatedHero.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
}

export function AnimatedHero({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      className="relative max-w-3xl mx-auto px-8 pt-32 pb-24"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="hero-gradient" />
      <div className="relative z-10">{children}</div>
    </motion.section>
  )
}

export function HeroItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 3: Apply AnimatedHero to the homepage**

In `app/page.tsx`, replace the hero section. Change from:

```tsx
<section className="max-w-3xl mx-auto px-8 py-24">
  <p className="hero-label text-white/40 text-sm mb-4 uppercase tracking-widest">
    anshul.ai
  </p>
  <h1 className="hero-heading text-5xl font-bold leading-tight mb-6">
    <span className="shimmer-text">I build with AI.</span>
    <br />I teach what I learn.
  </h1>
  {/* ... rest of hero content */}
</section>
```

To:

```tsx
<AnimatedHero>
  <HeroItem>
    <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">
      anshul.ai
    </p>
  </HeroItem>
  <HeroItem>
    <h1 style={{ fontSize: 'var(--text-hero)', lineHeight: 1.05, letterSpacing: '-0.03em' }} className="font-bold mb-6">
      <span className="shimmer-text">I build with AI.</span>
      <br />I teach what I learn.
    </h1>
  </HeroItem>
  <HeroItem>
    <p className="text-white/60 text-xl leading-relaxed mb-10">
      GTM Strategy at Google. Kellogg MBA. I ship real AI products without an engineering background and share everything along the way.
    </p>
  </HeroItem>
  <HeroItem>
    {/* CTAs — same as current */}
    <div className="flex items-center gap-4 flex-wrap">
      {/* ... existing CTA buttons ... */}
    </div>
  </HeroItem>
</AnimatedHero>
```

Add the imports at the top of `app/page.tsx`:

```tsx
import { AnimatedHero, HeroItem } from './components/AnimatedHero'
```

- [ ] **Step 4: Verify the hero animation**

Check localhost:3000 — the hero should:
1. Have a subtle blue gradient glow behind the text
2. Each element (label, heading, description, CTAs) should fade up with a stagger
3. The shimmer text should have a more refined gradient animation
4. The heading should be larger (72px)

- [ ] **Step 5: Commit**

```bash
git add app/components/AnimatedHero.tsx app/globals.css app/page.tsx
git commit -m "feat: animated hero with gradient glow and staggered entrance"
```

---

### Task 8: Micro-interactions (hover states + scroll animations)

**Files:**
- Create: `app/components/ScrollSection.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add interactive hover utilities to globals.css**

Add to `app/globals.css`:

```css
/* ── Card hover lift ── */
.card-hover {
  transition: transform var(--duration-base) var(--ease-out-expo),
              border-color var(--duration-base) var(--ease-in-out),
              box-shadow var(--duration-base) var(--ease-in-out);
}

.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* ── Button press ── */
.btn-press {
  transition: transform var(--duration-fast) var(--ease-out-expo),
              background-color var(--duration-fast);
}

.btn-press:active {
  transform: scale(0.97);
}

/* ── Link underline slide ── */
.link-slide {
  position: relative;
}

.link-slide::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--text-primary);
  transition: width var(--duration-base) var(--ease-out-expo);
}

.link-slide:hover::after {
  width: 100%;
}
```

- [ ] **Step 2: Create ScrollSection component**

Create `app/components/ScrollSection.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'

interface ScrollSectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function ScrollSection({ children, className, delay = 0 }: ScrollSectionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.7,
        delay: delay * 0.001,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 3: Apply card-hover class to interactive cards across the site**

On any page with cards (projects, analysis, learn, downloads), add `card-hover` to the card's className. For example, in `app/projects/page.tsx`:

Change:
```tsx
const shared = "block border border-white/10 rounded-xl overflow-hidden hover:border-white/25 transition group"
```
To:
```tsx
const shared = "block border border-white/10 rounded-xl overflow-hidden hover:border-white/25 transition group card-hover"
```

Apply the same to card elements in `app/analysis/page.tsx`, `app/learn/page.tsx`, `app/work/page.tsx`.

- [ ] **Step 4: Apply btn-press to all CTA buttons**

On the homepage and other pages, add `btn-press` to primary CTA buttons. For example in `app/page.tsx`:

```tsx
<a href="/learn" className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition btn-press">
```

- [ ] **Step 5: Replace ScrollReveal usage with ScrollSection on the homepage**

In `app/page.tsx`, replace `ScrollReveal` imports and usage with `ScrollSection`. Change:

```tsx
import { ScrollReveal } from './components/ScrollReveal'
```
To:
```tsx
import { ScrollSection } from './components/ScrollSection'
```

And replace each `<ScrollReveal delay={N}>` with `<ScrollSection delay={N}>`.

- [ ] **Step 6: Verify interactions**

Check localhost:3000:
- Cards should lift slightly on hover with a shadow
- Buttons should press down slightly when clicked
- Scroll reveal animations should be smooth with framer-motion

- [ ] **Step 7: Commit**

```bash
git add app/components/ScrollSection.tsx app/globals.css app/page.tsx app/projects/page.tsx app/analysis/page.tsx app/learn/page.tsx app/work/page.tsx
git commit -m "feat: micro-interactions — card hover lift, button press, scroll animations"
```

---

### Task 9: Page transitions (View Transitions API)

**Files:**
- Create: `app/components/PageTransition.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add View Transition CSS**

Add to `app/globals.css`:

```css
/* ── Page transitions ── */
@view-transition {
  navigation: auto;
}

::view-transition-old(root) {
  animation: fade-out var(--duration-base) var(--ease-in-out);
}

::view-transition-new(root) {
  animation: fade-in var(--duration-base) var(--ease-in-out);
}

@keyframes fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Step 2: Enable View Transitions in next.config.ts**

Check `next.config.ts` for the experimental viewTransition flag. In Next.js 16, add:

```ts
const nextConfig = {
  experimental: {
    viewTransition: true,
  },
  // ... existing config
}
```

Read the Next.js 16 docs at `node_modules/next/dist/docs/` first to verify the exact API, as this may differ from training data.

- [ ] **Step 3: Verify page transitions**

Navigate between pages on localhost:3000. Content should fade out/in smoothly rather than hard-cutting.

Note: View Transitions API is still being adopted across browsers. This will work in Chrome/Edge and gracefully degrade (instant navigation) in Firefox/Safari.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css next.config.ts
git commit -m "feat: page transitions via View Transitions API"
```

---

### Task 10: Custom typography scale

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add base typography styles**

Add to `app/globals.css`:

```css
/* ── Typography ── */
h1 {
  letter-spacing: -0.03em;
  line-height: 1.08;
}

h2 {
  letter-spacing: -0.02em;
  line-height: 1.15;
}

h3 {
  letter-spacing: -0.01em;
  line-height: 1.2;
}

/* ── Section labels (uppercase tracking) ── */
.section-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-tertiary);
}

/* ── Hero heading ── */
.heading-hero {
  font-size: var(--text-hero);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

/* ── Page heading ── */
.heading-page {
  font-size: var(--text-5xl);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.08;
}

/* ── Section heading ── */
.heading-section {
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
```

- [ ] **Step 2: Apply typography classes to page headings**

Across all pages, replace inline text sizing with the new classes. For example, on each page's h1:

Change:
```tsx
<h1 className="text-5xl font-bold leading-tight mb-6">
```
To:
```tsx
<h1 className="heading-page mb-6">
```

And for section labels like `<p className="text-white/40 text-sm mb-4 uppercase tracking-widest">`:

Change to:
```tsx
<p className="section-label mb-4">
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/page.tsx app/about/page.tsx app/work/page.tsx app/projects/page.tsx app/learn/page.tsx app/analysis/page.tsx app/writing/page.tsx app/downloads/page.tsx app/contact/page.tsx
git commit -m "feat: custom typography scale with heading and label classes"
```

---

### Task 11: Homepage metrics strip

**Files:**
- Create: `app/components/MetricsStrip.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create the MetricsStrip component**

Create `app/components/MetricsStrip.tsx`:

```tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const duration = 1500
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value])

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  )
}

interface Metric {
  value: number
  suffix?: string
  label: string
}

export function MetricsStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <motion.div
      className="border-y py-8"
      style={{ borderColor: 'var(--border-subtle)' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-3xl mx-auto px-8 flex items-center justify-between">
        {metrics.map((metric, i) => (
          <div key={metric.label} className="text-center">
            <p className="text-2xl font-bold tracking-tight">
              <AnimatedNumber value={metric.value} suffix={metric.suffix} />
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {metric.label}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Add MetricsStrip to the homepage**

In `app/page.tsx`, import and place it after the credential strip section:

```tsx
import { MetricsStrip } from './components/MetricsStrip'
```

Add after the credential/tools section, before the content sections:

```tsx
<MetricsStrip
  metrics={[
    { value: 94, suffix: '+', label: 'Articles published' },
    { value: 5, label: 'Learning modules' },
    { value: 6, label: 'Tools built' },
    { value: 365, label: 'Daily AI analysis' },
  ]}
/>
```

Note: In Phase 3 we'll make these counts dynamic (fetched from Sanity at build time). For now, hardcoded values are fine.

- [ ] **Step 3: Verify the metrics strip**

Check localhost:3000 — scroll down to the metrics strip. Numbers should animate/count up from 0 when they come into view.

- [ ] **Step 4: Commit**

```bash
git add app/components/MetricsStrip.tsx app/page.tsx
git commit -m "feat: animated metrics strip on homepage"
```

---

### Task 12: Scroll-driven storytelling on homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace flat section grid with staggered scroll sections**

In `app/page.tsx`, the main content sections are currently in a grid with `ScrollReveal`. Update to use `ScrollSection` with increasing delays and alternating visual weight.

The primary section (AI School) should have a larger card treatment, while secondary sections (Projects, Analysis, Writing) should be slightly smaller. This creates visual hierarchy as you scroll.

Update the sections grid from `gap-0` to `gap-6`:

```tsx
<section className="max-w-3xl mx-auto px-8 py-24 grid grid-cols-1 gap-6">
```

For each section card, replace the `border-b` divider pattern with bordered cards:

Change each section wrapper from:
```tsx
<div className="border-b border-white/10 py-12">
```
To:
```tsx
<div className="border border-white/10 rounded-xl p-8 hover:border-white/20 transition card-hover" style={{ backgroundColor: 'var(--bg-card)' }}>
```

This turns the flat list into a card-based layout that feels more premium and interactive.

- [ ] **Step 2: Verify the homepage scroll experience**

Check localhost:3000 — scrolling down the page should reveal each section as a card, with staggered fade-up animations and hover lift effects.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: scroll-driven card layout on homepage"
```

---

### Task 13: Loading/skeleton states

**Files:**
- Create: `app/components/SkeletonCard.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add shimmer keyframe to globals.css**

```css
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-card) 25%,
    rgba(255, 255, 255, 0.06) 50%,
    var(--bg-card) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}
```

- [ ] **Step 2: Create SkeletonCard component**

Create `app/components/SkeletonCard.tsx`:

```tsx
export function SkeletonCard() {
  return (
    <div className="border border-white/10 rounded-xl p-6 space-y-4">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-6 w-3/4" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-2/3" />
    </div>
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
```

These skeleton components can be used as loading states in any page that fetches from Sanity. They'll be applied to specific pages in Phase 3 when we add Suspense boundaries.

- [ ] **Step 3: Commit**

```bash
git add app/components/SkeletonCard.tsx app/globals.css
git commit -m "feat: skeleton loading state components"
```

---

### Task 14: Custom cursor system

**Files:**
- Create: `app/components/CustomCursor.tsx`
- Modify: `app/layout.tsx`
- Delete: `app/components/CursorSpotlight.tsx`

- [ ] **Step 1: Create the CustomCursor component**

Create `app/components/CustomCursor.tsx`:

```tsx
'use client'

import { useEffect, useState, useRef } from 'react'

export function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const [label, setLabel] = useState('')
  const [visible, setVisible] = useState(false)
  const raf = useRef(0)
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouchDevice) return

    setVisible(true)

    function onMove(e: MouseEvent) {
      target.current = { x: e.clientX, y: e.clientY }
    }

    function tick() {
      setPos((prev) => ({
        x: prev.x + (target.current.x - prev.x) * 0.15,
        y: prev.y + (target.current.y - prev.y) * 0.15,
      }))
      raf.current = requestAnimationFrame(tick)
    }

    function onOver(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest('[data-cursor]')
      if (el) {
        setHovered(true)
        setLabel(el.getAttribute('data-cursor') || '')
      }
    }

    function onOut(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest('[data-cursor]')
      if (el) {
        setHovered(false)
        setLabel('')
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    window.addEventListener('mouseout', onOut)
    raf.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mouseout', onOut)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Outer glow — follows with lag */}
      <div
        className="fixed pointer-events-none z-[9998] rounded-full transition-transform duration-300"
        style={{
          width: hovered ? 64 : 32,
          height: hovered ? 64 : 32,
          transform: `translate(${pos.x - (hovered ? 32 : 16)}px, ${pos.y - (hovered ? 32 : 16)}px)`,
          background: `radial-gradient(circle, var(--accent-glow), transparent 70%)`,
          opacity: 0.6,
        }}
      />
      {/* Label */}
      {hovered && label && (
        <div
          className="fixed pointer-events-none z-[9999] text-[10px] uppercase tracking-widest font-medium"
          style={{
            transform: `translate(${pos.x + 20}px, ${pos.y + 20}px)`,
            color: 'var(--accent)',
          }}
        >
          {label}
        </div>
      )}
    </>
  )
}
```

Usage: Add `data-cursor="Read"` to article links, `data-cursor="Try"` to tool links, `data-cursor="View"` to project cards. The cursor expands and shows the label on hover.

- [ ] **Step 2: Replace CursorSpotlight with CustomCursor in layout.tsx**

In `app/layout.tsx`:

Change:
```tsx
import { CursorSpotlight } from "./components/CursorSpotlight";
```
To:
```tsx
import { CustomCursor } from "./components/CustomCursor";
```

And change:
```tsx
<CursorSpotlight />
```
To:
```tsx
<CustomCursor />
```

- [ ] **Step 3: Delete the old CursorSpotlight component**

```bash
rm app/components/CursorSpotlight.tsx
```

- [ ] **Step 4: Add data-cursor attributes to key interactive elements**

Add `data-cursor="Read"` to article links on the Analysis and Learn pages.
Add `data-cursor="Try"` to tool links on the Projects page.
Add `data-cursor="View"` to project cards.

For example, in `app/analysis/page.tsx`, on the article link:
```tsx
<a
  data-cursor="Read"
  href={href}
  className="group block border border-white/10 rounded-xl p-6 hover:border-white/25 transition card-hover"
>
```

- [ ] **Step 5: Verify cursor behavior**

Check localhost:3000 on a desktop browser (not touch device). The cursor should:
- Show a subtle accent-colored glow following the mouse with slight lag
- Expand when hovering over elements with `data-cursor`
- Show a label ("Read", "Try", "View") next to the cursor

- [ ] **Step 6: Commit**

```bash
git add app/components/CustomCursor.tsx app/layout.tsx app/analysis/page.tsx app/projects/page.tsx
git rm app/components/CursorSpotlight.tsx
git commit -m "feat: contextual custom cursor system"
```

---

### Task 15: Custom 404 page

**Files:**
- Modify: `app/not-found.tsx`

- [ ] **Step 1: Create a delightful 404 page**

Replace `app/not-found.tsx` with:

```tsx
import { Nav } from './components/Nav'

export default function NotFound() {
  return (
    <main className="min-h-screen text-white" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <Nav />

      <section className="max-w-xl mx-auto px-8 pt-32 pb-20 text-center">
        <p className="text-8xl font-bold mb-6" style={{ color: 'var(--text-ghost)' }}>
          404
        </p>
        <h1 className="heading-section mb-4">
          This page wandered off.
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-tertiary)' }}>
          Maybe it is being built by an AI agent right now.
          <br />In the meantime, here are some places that do exist:
        </p>
        <div className="flex flex-col items-center gap-3">
          <a href="/" className="text-sm hover:text-white transition link-slide" style={{ color: 'var(--text-secondary)' }}>
            Home
          </a>
          <a href="/projects" className="text-sm hover:text-white transition link-slide" style={{ color: 'var(--text-secondary)' }}>
            Projects
          </a>
          <a href="/learn" className="text-sm hover:text-white transition link-slide" style={{ color: 'var(--text-secondary)' }}>
            AI School
          </a>
          <a href="/analysis" className="text-sm hover:text-white transition link-slide" style={{ color: 'var(--text-secondary)' }}>
            Analysis
          </a>
        </div>
      </section>

      <footer className="border-t px-8 py-8 text-center text-sm" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify by navigating to a non-existent page**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/this-does-not-exist
```

Expected: `404` — and the page should show the custom design.

- [ ] **Step 3: Commit**

```bash
git add app/not-found.tsx
git commit -m "feat: custom 404 page"
```

---

### Task 16: Mobile-native experience improvements

**Files:**
- Modify: `app/globals.css`
- Modify: `app/components/MetricsStrip.tsx`

- [ ] **Step 1: Add responsive overrides to globals.css**

```css
/* ── Mobile typography ── */
@media (max-width: 640px) {
  :root {
    --text-hero: 2.75rem;  /* 44px on mobile */
    --text-5xl:  2.25rem;  /* 36px on mobile */
    --space-section: 6rem;
    --space-block: 3rem;
  }

  .heading-hero {
    font-size: var(--text-hero);
  }

  .heading-page {
    font-size: var(--text-5xl);
  }
}

/* ── Touch-friendly tap targets ── */
@media (pointer: coarse) {
  a, button {
    min-height: 44px;
    min-width: 44px;
  }
}
```

- [ ] **Step 2: Make MetricsStrip stack on mobile**

In `app/components/MetricsStrip.tsx`, update the grid layout:

Change:
```tsx
<div className="max-w-3xl mx-auto px-8 flex items-center justify-between">
```
To:
```tsx
<div className="max-w-3xl mx-auto px-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0">
```

And update each metric's alignment:

Change:
```tsx
<div key={metric.label} className="text-center">
```
To:
```tsx
<div key={metric.label} className="text-center sm:text-center">
```

- [ ] **Step 3: Verify on mobile viewport**

In the browser, use responsive mode (375px width) and check:
- Hero text is readable and not too large
- Metrics strip shows 2x2 grid
- All tap targets are at least 44x44px
- Spacing feels balanced on mobile

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/components/MetricsStrip.tsx
git commit -m "feat: mobile-native typography, spacing, and tap targets"
```

---

### Task 17: Performance baseline

**Files:**
- No file changes — measurement only

- [ ] **Step 1: Run a production build**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 2: Check bundle size**

After build, Next.js outputs route sizes. Note any routes over 100KB — these may need optimization in Phase 7.

- [ ] **Step 3: Commit any outstanding changes**

```bash
git add -A
git commit -m "chore: Phase 2 design system complete"
```

---

## Self-Review Results

**Spec coverage:** All 15 design elements from the master plan are covered:
1. ✅ Hero redesign (Task 7)
2. ✅ Dark theme elevation (Tasks 3, 4)
3. ✅ Spatial rhythm (Task 6)
4. ❌ Dynamic OG images — deferred to Phase 7 (depends on content architecture)
5. ✅ Micro-interactions (Task 8)
6. ✅ Page transitions (Task 9)
7. ✅ Custom typography scale (Task 10)
8. ✅ Scroll-driven storytelling (Task 12)
9. ✅ Loading/skeleton states (Task 13)
10. ✅ Mobile-native experience (Task 16)
11. ✅ Custom cursor system (Task 14)
12. ✅ Easter eggs / 404 (Task 15)
13. ❌ Sound design — deferred to Phase 7 (low priority, needs design decision)
14. ✅ Performance optimization (Task 17 baseline, full pass in Phase 7)
15. ✅ Mobile responsive (Task 16)

**Placeholder scan:** No TBDs. All code is complete. Two items (OG images, sound) deferred to Phase 7 with rationale.

**Type consistency:** Component props consistent. CSS variables used consistently via `var()` references. `data-cursor` attribute API consistent between CustomCursor consumer and producer.
