# anshul.ai Portfolio Evolution — Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform anshul.ai from an AI education site into a premium portfolio for an "AI strategy leader who builds" — serving as evidence for EB1A/EB2-NIW immigration and AI leadership hiring.

**Architecture:** Next.js 16 App Router on Vercel, Sanity CMS for all content, Supabase for subscribers/rate-limiting, Resend for email, Claude API (Haiku/Sonnet) for interactive tools. Remove Clerk. All tools hosted under `/tools/`. Premium dark-theme design with micro-interactions, scroll-driven animations, and sub-1s performance.

**Tech Stack:** Next.js 16, React 19, Sanity, Supabase, Resend, Claude API (@anthropic-ai/sdk), Tailwind CSS, Vercel Analytics, Google Search Console, View Transitions API, Framer Motion (for animations)

---

## Sub-Plans (execute in order)

Each sub-plan is a separate document that produces working, deployable software on its own. Plans are designed to be executed sequentially — each builds on the previous one.

### Phase 1: Foundation (Week 1-2)
**Plan:** `2026-06-06-phase1-foundation.md`

Structural changes that everything else depends on:
1. Remove Clerk (auth, middleware, dependencies)
2. Restructure routes: rename `/lab` → `/projects`, merge `/trending` + `/deals-events` → `/analysis`, add `/work`, `/contact`
3. Add Vercel Analytics
4. Set up Google Search Console verification
5. Update Nav component for new structure
6. Update sitemap.ts for new routes
7. Update all footer links across pages

### Phase 2: Design System (Week 2-4)
**Plan:** `2026-06-06-phase2-design-system.md`

All 15 premium design elements, in priority order:
1. Hero redesign (animated gradient, stronger typography)
2. Dark theme elevation (depth layers, grain, accent color, glass nav)
3. Spatial rhythm overhaul (generous whitespace, consistent grid)
4. Micro-interactions (hover states, staggered scroll animations)
5. Page transitions (View Transitions API)
6. Custom typography scale
7. Scroll-driven storytelling on homepage
8. Loading/skeleton states
9. Custom cursor system
10. Easter eggs / 404 page
11. Sound design (subtle, toggleable)
12. Mobile-native experience (touch-optimized, swipe, bottom sheets)
13. Performance optimization (Lighthouse 95+)

### Phase 3: Content Architecture (Week 3-5)
**Plan:** `2026-06-07-phase3-content-architecture.md` (to be written when Phase 1 complete)

New content sections and Sanity schemas:
1. Work section — 4 professional accomplishments (Google x2, HUL, Kellogg/Uber)
2. About page rewrite — headshot, endeavor framing, career narrative arc, links to evidence
3. Projects page — case study format with Sanity schema, anshul.ai as flagship
4. Analysis page — merged Trending + Deals & Events, unified listing
5. Writing page — show authored articles (published at top, coming soon at bottom)
6. Homepage repositioning — new hero copy, metrics strip (semi-dynamic), proof points, section previews reflecting new structure

### Phase 4: Tools Platform (Week 4-7)
**Plan:** `2026-06-07-phase4-tools-platform.md` (to be written when Phase 2 complete)

API infrastructure and 6 interactive tools:
1. API route for Claude proxy (`/api/ai/generate`) with rate limiting
2. Supabase table for usage tracking + email capture
3. Rate limit middleware (3 free uses → email signup to unlock)
4. Shared tool UI components (input forms, output display, loading states)
5. Tool 1: AI GTM Playbook Generator
6. Tool 2: AI Readiness Assessment (no API needed — scored questionnaire)
7. Tool 3: AI Tool Recommender
8. Tool 4: AI ROI Calculator (formula-based + AI narrative)
9. Tool 5: Meeting Brief Generator
10. Tool 6: Competitive Analysis Generator
11. Tools index page (`/tools`)

### Phase 5: Downloads System (Week 6-8)
**Plan:** `2026-06-07-phase5-downloads.md` (to be written when Phase 3 complete)

Branded PDF generation and all resources:
1. Design branded PDF template (light theme, anshul.ai branding, credential line)
2. Build PDF generation pipeline (using Claude API for content + template)
3. Generate all 25+ PDFs across 6 categories
4. Update Downloads page with populated resources
5. Add download tracking to Supabase

### Phase 6: Email Automation (Week 7-9)
**Plan:** `2026-06-07-phase6-email-automation.md` (to be written when Phase 4 complete)

Full email system:
1. Resend account setup + API integration
2. Supabase subscribers table schema
3. Email signup component (reusable across site)
4. Welcome email sequence (3-email drip: welcome → best resources → tool intro)
5. Weekly newsletter automation (cron job + Claude API for content generation)
6. Email templates (branded, light theme, matching PDF style)
7. Unsubscribe handling
8. Integration points: tool rate-limit unlock, Downloads page, homepage CTA

### Phase 7: Polish & Meta (Week 9-11)
**Plan:** `2026-06-07-phase7-polish.md` (to be written when Phase 5 complete)

Final quality pass:
1. Dynamic OG image generation for all pages (articles, tools, projects)
2. SEO audit and optimization (meta tags, structured data, schema.org)
3. Contact page with categorized form
4. GitHub repos documentation (README, architecture)
5. Final performance pass (Lighthouse 95+, Core Web Vitals)
6. Cross-browser testing
7. Mobile experience audit and polish

### Phase 8: Authored Content (Ongoing, Week 4-12)
**Plan:** Not a code plan — content creation schedule

Write and publish 12 authored articles, ~1 per week starting Week 4:
1. How I Built a 94-Article AI School Without Writing Code
2. How I Built an Automated Daily AI Analysis Pipeline
3. Building AI Products Without an Engineering Degree
4. How I Use Claude Code to Ship Real Products
5. What I Learned Building AI Dashboards for Global Teams at Google
6. Why Most Companies' AI Strategy Is Backwards
7. The AI Adoption Gap Nobody Talks About
8. How to Evaluate AI Tools When You're Not Technical
9. AI in GTM — What's Working and What's Hype
10. The Real ROI of AI in Business — A Framework
11. Why Business Professionals Should Build With AI, Not Just Use It
12. What the Next 2 Years of AI Mean for Business Leaders

---

## Timeline Summary

```
Week 1-2:   Phase 1 (Foundation) + Phase 2 start (Design)
Week 2-4:   Phase 2 (Design System)
Week 3-5:   Phase 3 (Content Architecture) — overlaps with Phase 2
Week 4-7:   Phase 4 (Tools Platform) + Authored articles begin
Week 6-8:   Phase 5 (Downloads System)
Week 7-9:   Phase 6 (Email Automation)
Week 9-11:  Phase 7 (Polish & Meta)
Week 4-12:  Phase 8 (Authored Content — ongoing)
```

## Key Dependencies

- Phase 2 (Design) depends on Phase 1 (Foundation) for route structure
- Phase 3 (Content) depends on Phase 1 for new routes
- Phase 4 (Tools) depends on Phase 2 for UI components/design system
- Phase 5 (Downloads) depends on Phase 3 for content architecture
- Phase 6 (Email) depends on Phase 4 for rate-limit integration
- Phase 7 (Polish) depends on all prior phases
- Phase 8 (Content) can run in parallel from Week 4 onward

## Evidence Checklist (for EB1A/EB2-NIW)

By end of 3 months, the site should demonstrate:
- [ ] Original contributions: 6 AI tools, automated content platform, education curriculum
- [ ] Authorship: 12 authored articles with original analysis
- [ ] Professional impact: Work section with quantified accomplishments
- [ ] Platform reach: Analytics data (Vercel + GSC) showing visitor/country metrics
- [ ] Ongoing expertise: Daily automated AI analysis, weekly newsletter
- [ ] Shareable artifacts: 25+ downloadable resources
- [ ] Open source: Public GitHub with documented repos
- [ ] Professional presentation: Premium site design signaling credibility
- [ ] Subscriber list: Email signups as evidence of demand
