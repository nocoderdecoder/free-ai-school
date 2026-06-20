# Site-Wide Editorial Theme — Design Addendum

## Summary

Extend the warm editorial design (approved for the homepage in `2026-06-20-homepage-redesign-design.md`) to the remaining 25 pages on anshul.ai. Same palette, same fonts, same card language — applied to each page's existing layout and content. No layout restructuring; this is a visual theme conversion, not a redesign of information architecture.

## Architecture

The homepage redesign established an **opt-in light variant** pattern: dark stays the default, pages opt into the editorial theme via a `variant="light"` prop. This addendum keeps that pattern and extends it to the few shared components that hardcode dark-theme colors. Once every page passes `variant="light"`, dark becomes vestigial but isn't removed — it remains the formal default to avoid a flag-day rewrite of every component's defaults.

## Shared component changes

### `Nav`
Already supports `variant="light"` (done in homepage redesign). All 25 pages switch their `<Nav />` call to `<Nav variant="light" />`.

### `PortableTextComponents.tsx`
Add a new export `editorialComponents` (parallel to existing `components`/`portableTextComponents`) for the editorial theme:

| Element | Dark (existing) | Editorial (new) |
|---|---|---|
| Paragraph | `text-white/80 text-lg` | `text-[var(--ed-text-muted)] text-lg` (DM Sans) |
| H2 | `text-white` bold | `font-serif text-[var(--ed-text-dark)]` (Instrument Serif, weight 400) |
| H3 | `text-white` semibold | `font-serif text-[var(--ed-text-dark)]` (Instrument Serif, weight 400) |
| Blockquote | `border-l-2 border-white/20 text-white/50 italic` | `border-l-2 border-[var(--ed-trending-dot)] bg-[var(--ed-card-warm)] text-[var(--ed-text-secondary)] italic` rounded-r-lg, padded |
| Bold | `text-white` | `text-[var(--ed-text)]` |
| Italic | `text-white/70` | `text-[var(--ed-text-muted)]` |
| Link | `text-white underline hover:text-white/70` | `text-[var(--ed-text)] underline hover:text-[var(--ed-text-secondary)]` |
| Bullet marker | `text-white/30 —` | `text-[var(--ed-text-light)] —` |
| Bullet text | `text-white/80` | `text-[var(--ed-text-muted)]` |

Article pages pick whichever export matches their `Nav` variant.

### `ToolShell.tsx`
Add a `variant?: 'dark' | 'light'` prop, default `'dark'`. When light:
- Outer card backgrounds: `var(--ed-card-warm)` instead of `var(--bg-card)` / `white/5`
- Borders: `var(--ed-border)` instead of `white/10`
- Input/select/textarea text: `var(--ed-text)`, placeholder `var(--ed-text-light)`
- Labels: `var(--ed-text-faint)` uppercase (unchanged structure)
- Primary CTA button: dark pill (`background: var(--ed-cta)`, `color: var(--ed-bg)`) — same as homepage's "See what I've built" button, replacing the dark theme's white-bg/black-text button
- Secondary buttons: `var(--ed-card-warm)` background, `var(--ed-text-secondary)` text
- `RenderResult`'s internal h3/h4/p/strong color classes get an equivalent light path (pass a `variant` down or branch on a module-level flag passed as prop)
- Error state: keep red accent but on `var(--ed-card-warm)` background with `var(--ed-border)` border instead of `red-500/5` / `red-500/20`

### `ContactForm` (in `PortableTextComponents.tsx`)
Add a `variant?: 'dark' | 'light'` prop, default `'dark'`. Light: inputs use `var(--ed-card-warm)` background, `var(--ed-border)` border, `var(--ed-text)` text, `var(--ed-text-light)` placeholder. Submit button becomes the dark pill (`var(--ed-cta)` bg, `var(--ed-bg)` text). Success state uses `var(--ed-card-warm)` card.

### `ReadingProgress.tsx`
Add a `variant?: 'dark' | 'light'` prop, default `'dark'`. Light: track `var(--ed-border)`, fill `var(--ed-cta)` (dark bar on light track — inverse of the current light-bar-on-dark-track).

## Per-template page treatment

All templates share: page background `var(--ed-bg)`, base text `var(--ed-text)`, `font-family: var(--font-sans)`, `<Nav variant="light" />`.

### List/Index pages (analysis, deals-events, learn, trending, projects, writing, downloads)
- Hero: `section-label` → uppercase `var(--ed-text-faint)`; `heading-page` → serif, `var(--ed-text-dark)`, weight 400; intro paragraph → `var(--ed-text-muted)`
- Cards: `var(--ed-card-warm)` background (rounded-xl), replacing `border border-white/10`. On hover: `var(--ed-card-hover)` background + `translateY(-1px)`, replacing `hover:border-white/25`
- Category/type badges: soft pastel backgrounds matching the homepage's card-school (`#E8F0FE`) / card-projects (`#F3E8FF`) palette, extended with a soft green/amber as needed per category — text color a darker shade of the same hue, not `emerald-400/80`
- Metadata (dates, read time): `var(--ed-text-light)`

### Article/Detail pages (learn/[slug], deals-events/[slug], trending/[slug], writing/[slug])
- Breadcrumb: `var(--ed-text-faint)`, links hover to `var(--ed-text)`
- H1: serif, `var(--ed-text-dark)`, weight 400 (matches homepage hero treatment, scaled down e.g. 40px)
- Metadata row (date/read-time/badge): `var(--ed-text-light)`
- Body: `editorialComponents` from PortableTextComponents (see above)
- Prev/Next nav cards: `var(--ed-card-warm)` background, same hover lift as list cards
- `<ReadingProgress variant="light" />`

### Interactive tool pages (7 tool pages)
- `<ToolShell variant="light" ... >`
- Page chrome (back link, name, description) outside ToolShell: `var(--ed-text-faint)` back link, serif name heading, `var(--ed-text-muted)` description

### Static content pages (about, work, lab)
- Hero: same as list pages
- Timeline items (about): divider `var(--ed-border)`, role/title `var(--ed-text-dark)`, dates `var(--ed-text-light)`, description `var(--ed-text-muted)`
- Tags/pills: soft pastel background per category, replacing `border border-white/10 text-white/25`
- Status dots (lab): keep semantic colors (emerald/blue/amber/purple) but on light background — same hues work fine on off-white
- Cards (lab project grid): `var(--ed-card-warm)` with category-tinted variants where it adds clarity

### Tool index page (tools)
- Same card treatment as homepage featured cards: `var(--ed-card-warm)` default, category-tinted backgrounds optional
- Status badge "Live": soft green pastel bg + dark green text, replacing `emerald-400/10` / `emerald-400/80`
- Status badge "Coming soon": `var(--ed-card-warm)` bg + `var(--ed-text-light)` text

### Contact page
- `<ContactForm variant="light" />`
- Hero same as list pages

## Out of scope

- `tools/speaking-speed/page.tsx` and its `SpeakingSpeedApp.tsx` — fully standalone client app with its own undefined CSS custom properties (`--color-background-primary` etc., not wired to this site's design system at all), no `Nav`, no shared layout. Left untouched.
- `AnimatedHero`, `MetricsStrip`, `ToolsMarquee` — homepage-only components, not used by any of the 25 pages in scope. No changes needed.
- `ScrollSection` — pure animation wrapper, no color logic. No changes needed.

## What stays the same

- All page layouts, content, copy, and information architecture
- All routing and data-fetching logic
- Dark theme remains the formal default for `Nav`, `ToolShell`, `ContactForm`, `ReadingProgress`, and `PortableTextComponents`'s default export — only the 25 pages opt into light

## What changes

- `app/components/PortableTextComponents.tsx` — add `editorialComponents` export + light `ContactForm` variant
- `app/components/ToolShell.tsx` — add `variant` prop
- `app/components/ReadingProgress.tsx` — add `variant` prop
- 25 page files — switch to `variant="light"`, recolor inline/Tailwind classes per the per-template rules above
