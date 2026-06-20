# Homepage Redesign — "The Editorial"

## Summary

Complete visual redesign of anshul.ai from dark monochrome (#050505 background, white text, blue accent) to a warm editorial style — off-white backgrounds, serif/sans-serif font pairing, colored content cards, and a magazine-like layout.

## Design Direction

**Style**: Warm editorial — inspired by high-end brand sites (Ragged Edge) and thought-leader personal sites. Feels like a personal publication, not a tech portfolio.

**Primary feeling**: "This person is building cool things" — maker energy, projects-first, the work is the brand.

**Card style**: Clean & typographic — mostly text with subtle color accents, no screenshots or rich previews.

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#FDFCFA` | Page background — warm off-white |
| Card warm | `#F3F0EB` | Trending sidebar, Writing card, Lab card |
| Card school | `#E8F0FE` | AI School featured card — soft blue |
| Card projects | `#F3E8FF` | Projects featured card — soft purple |
| Text primary | `#222` / `#1a1a1a` | Headlines, body |
| Text secondary | `#555` | Credentials, strong labels |
| Text muted | `#888` | Descriptions |
| Text faint | `#999` / `#bbb` | Meta, dates, nav links |
| Border | `#E8E5E0` | Dividers, nav border |
| Card border hover | darken via `filter:brightness(0.96)` | Card hover state |
| CTA dark | `#222` | Primary buttons, contact CTA |
| Trending dot | `#4CAF50` | Live pulse indicator |

## Typography

| Element | Font | Size | Weight | Tracking |
|---------|------|------|--------|----------|
| Logo | Instrument Serif | 22px | 400 | default |
| Hero h1 | Instrument Serif | 54px | 400 | -0.01em |
| Featured card h3 | Instrument Serif | 28px | 400 | default |
| Bottom card h3 | Instrument Serif | 24px | 400 | default |
| Nav links | DM Sans | 13px | 500 | default |
| Body text | DM Sans | 17px (hero), 14px (cards) | 400 | default |
| Labels | DM Sans | 11px | 600 | 0.08em, uppercase |
| Trending h4 | DM Sans | 14px | 500 | default |

**Font stack**: `'Instrument Serif', serif` for headlines/logo. `'DM Sans', sans-serif` for everything else.

## Layout

### Nav (sticky)
- Frosted glass: `background:rgba(253,252,250,0.92); backdrop-filter:blur(12px)`
- Logo left (serif), links right, Contact as dark pill CTA
- Border bottom: 1px solid `#E8E5E0`
- Padding: 18px 48px

### Hero (two-column grid)
- Grid: `1fr 360px`, gap 56px
- Left: headline, description, two CTA buttons (dark + light), credential strip (Google / Kellogg / Uber) with top border
- Right: trending sidebar card — warm stone bg, green pulse dot, 4 article links with dates, "Browse all" link at bottom
- Padding: 80px 48px 64px

### Featured Cards (two-column grid)
- Two cards: AI School (soft blue `#E8F0FE`) and Projects (soft purple `#F3E8FF`)
- Padding inside: 44px, border-radius: 14px
- Label (uppercase, faint) → serif h3 → description → link with arrow
- Hover: brightness(0.96) + translateY(-2px)

### Bottom Row (two-column grid)
- Two cards: Writing and Lab (both warm stone `#F3F0EB`)
- Padding inside: 36px, border-radius: 14px
- Hover: darker stone + translateY(-1px)

### Footer
- Simple flex row: name + copyright left, GitHub/LinkedIn/Contact links right
- Top border, max-width 1080px

## Pages NOT on homepage

- Deals & Events — removed from homepage, still accessible from its own route
- Tools marquee — removed
- Stats/metrics strip — removed

## Interactions

- Cards: hover lifts (translateY) + subtle darkening
- Trending items: hover slides right (padding-left:6px)
- Featured card links: arrow gap widens on hover
- Nav: sticky with blur backdrop
- Trending dot: 2s pulse animation

## Responsive (≤900px)

- Hero collapses to single column, trending sidebar stacks below
- Featured and bottom rows collapse to single column
- Hero h1 shrinks to 38px
- Padding reduces from 48px to 24px

## What stays the same

- All existing routes (/learn, /projects, /trending, /writing, /about, /contact, /lab, /work, /analysis, /deals-events)
- Sanity CMS integration for trending articles
- All existing components that serve inner pages (PortableText, ReadingProgress, etc.)
- The page content itself — only visual treatment changes

## What changes

- `app/design/tokens.css` — new color tokens, typography tokens
- `app/globals.css` — new base styles, remove dark-mode specific styles (noise overlay, shimmer, hero gradient)
- `app/page.tsx` — new homepage layout matching this spec
- `app/components/Nav.tsx` — new light nav with serif logo
- `app/components/AnimatedHero.tsx` — likely replaced or heavily modified
- `app/components/MetricsStrip.tsx` — removed from homepage
- `app/components/ToolsMarquee.tsx` — removed from homepage
- Google Fonts: add Instrument Serif + DM Sans
- `app/layout.tsx` — font imports

## Reference mockup

Full HTML mockup: `.superpowers/brainstorm/33167-1781981809/content/editorial-full.html`
