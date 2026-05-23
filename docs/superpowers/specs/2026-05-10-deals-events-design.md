# Deals & Events — Design Spec
**Date:** 2026-05-10  
**Status:** Approved  

---

## Overview

A new standalone section at `/deals-events` that publishes automated analysis of significant AI events (conferences, product launches, keynotes) and M&A deals (acquisitions, mergers, large funding rounds). Separate from `/trending`, which covers daily general AI news. Published only when something significant is detected — could go days without a post.

---

## Nav Placement

Added as a top-level text link in the desktop and mobile nav, positioned after Trending:

> About · Lab · Trending · **Deals & Events** · Writing · Downloads · Learn

`NAV_LINKS` in `app/components/Nav.tsx` gains:
```js
{ label: 'Deals & Events', href: '/deals-events' }
```

---

## Pages

### `/deals-events` — List page

- **Hero:** Label "Deals & Events", h1 "Major moves in AI.", subheading: "Significant events and acquisitions — analysed for business professionals. Published when something worth reading happens."
- **Feed:** Chronological list of all published articles, newest first
- **Card fields shown:** Type badge (EVENT or DEAL), title, excerpt, date, estimated read time
- **Badge colours:**
  - `EVENT` — purple background/border (`#7C3AED` family), consistent with existing site palette
  - `DEAL` — teal background/border (`#0F766E` family)
- **Empty state:** Shown when no articles published yet — "Nothing yet. Check back when something significant happens."
- **Footer:** Same two-column footer as all other pages

### `/deals-events/[slug]` — Article page

- Breadcrumb: `Deals & Events › [Title]`
- Reading progress bar (reuses existing `ReadingProgress` component)
- Type badge at top of article
- For `event` type: optional `eventName` shown as a subtitle (e.g. "Google I/O 2026")
- Body rendered as Portable Text (reuses existing renderer from `/trending/[slug]`)
- Prev / next navigation within the same section (ordered by `publishedAt`)
- Dynamic OG metadata via `generateMetadata`

---

## Sanity Schema — `deal-event` document type

**File:** `sanity/schemaTypes/dealEvent.js`

| Field | Type | Notes |
|---|---|---|
| `title` | string | Required |
| `slug` | slug | Required, source: title |
| `type` | string (list) | Required. Values: `event` \| `deal` |
| `eventName` | string | Optional. Human name of event, e.g. "Google I/O 2026" |
| `excerpt` | text | 2–3 sentences for listing cards |
| `publishedAt` | datetime | Set at publish time |
| `readTime` | number | Minutes, set by script |
| `body` | block array | Portable Text — same config as `article` and `trending` |

`sanity/schemaTypes/index.js` updated to export `dealEvent` alongside `article` and `trending`.

---

## Automation Script — `scripts/generate-deals-events.mjs`

Mirrors the structure of `generate-trending.mjs`. Runs daily.

### Step 1 — Fetch RSS headlines
Same 5 feeds as trending: TechCrunch AI, VentureBeat AI, The Verge AI, Wired AI, Ars Technica.

### Step 2 — Significance check (first Claude call)
Short, cheap call (~200 tokens). Prompt asks Claude:

> "Scan these headlines. Is there a significant AI event (major conference, product keynote, platform launch) or M&A deal (acquisition, merger, funding round over $200M) in today's news? Reply in JSON: `{ found: boolean, type: 'event'|'deal'|null, topic: string|null, eventName: string|null }`"

If `found: false` → log "Nothing significant today" and exit. No article published.

### Step 3 — Deduplication check
Before writing, fetch last 30 days of `deal-event` titles from Sanity. If the detected topic overlaps with a recent title → exit without publishing.

### Step 4 — Write article (second Claude call)
Full article generation with type-specific prompts:

**For `deal` (~400–500 words, 4 sections):**
1. What happened (the deal, the numbers)
2. Why this company wanted it (strategic rationale)
3. What it signals for the industry
4. What to watch next

**For `event` (~700–900 words, 5–6 sections):**
1. What happened / context
2. The 3–4 biggest announcements for business professionals
3. What changed vs. expectations
4. What it means for teams using these tools now
5. Anshul's read on the direction

**Shared prompt rules (same as trending):**
- Nothing negative about Google, its products, or leadership
- No US government, regulators, or policy
- No em dashes
- Human tone, no AI clichés
- Varied headline style (same 20-style rule as trending)
- No "Here's why/what", no "What this means for you"

### Step 5 — Estimate read time
Word count ÷ 200, rounded up. Stored in `readTime` field.

### Step 6 — Publish to Sanity
`createOrReplace` with `_id: deal-event-{slug}`, `_type: 'deal-event'`. Sets `publishedAt` to current ISO timestamp.

### Output format from Claude
```
TITLE: [title]
SLUG: [slug]
TYPE: event|deal
EVENTNAME: [optional event name or blank]
EXCERPT: [2-3 sentences]
---
[body]
```

---

## GitHub Actions — `.github/workflows/daily-deals-events.yml`

- Schedule: `cron: '0 8 * * *'` (8am UTC = 1:30pm IST, 30 mins after trending)
- `workflow_dispatch` for manual trigger
- Secrets used: `ANTHROPIC_API_KEY`, `SANITY_WRITE_TOKEN` (already in repo)
- Node version: 20
- Steps: checkout → install `@sanity/client` → `node scripts/generate-deals-events.mjs`

---

## Homepage

A new "Deals & Events" section added to `app/page.tsx` between Trending and Writing:

```
Deals & Events
Major AI events and acquisitions.
Significant acquisitions and conferences — analysed when they happen.
→ View all →
```

Same visual weight as the Lab/Writing/Trending sections (text-2xl, outlined CTA).

---

## Sitemap

`app/sitemap.ts` updated to include:
- `https://anshul.ai/deals-events` (weekly, priority 0.8)
- All `/deals-events/[slug]` URLs fetched from Sanity

---

## Footer

All page footers (homepage, downloads, learn, deals-events) updated to include "Deals & Events" in the Pages column.

---

## Files Created / Modified

| File | Action |
|---|---|
| `sanity/schemaTypes/dealEvent.js` | Create |
| `sanity/schemaTypes/index.js` | Modify — add dealEvent |
| `scripts/generate-deals-events.mjs` | Create |
| `.github/workflows/daily-deals-events.yml` | Create |
| `app/deals-events/page.tsx` | Create |
| `app/deals-events/[slug]/page.tsx` | Create |
| `app/components/Nav.tsx` | Modify — add nav link |
| `app/page.tsx` | Modify — add homepage section + footer link |
| `app/sitemap.ts` | Modify — add deals-events URLs |

---

## Out of Scope

- Manual publishing UI (use Sanity Studio if needed)
- Email notifications when a new piece publishes
- Integration with `/trending` feed
- Tagging companies or people mentioned in articles
