# Public portfolio refresh

## Content boundary

The personal site contains broad role and education history, original guides, and independent synthetic demonstrations. It contains no new Google project names, internal metrics, datasets, interfaces, evaluation questions, or proprietary methods. The prior internal-project summaries on Work and the homepage have been replaced. This is not a certification of compliance with employer policies.

Professional roles and dates were reconciled against the user's current CV. No headshot was invented. Uber, Tego, and MATTER are explicitly academic client projects, not employment. The public CV intentionally omits employer project detail.

## Demonstrations

- `/demos/commercial-analyst`: 12 invented product-region-month records; fixed calculations and abstention behaviors; 40 independent reference cases. Downloadable data and reference questions.
- `/demos/gtm-activation`: invented mature signup cohorts; adjustable lift and budget; inspectable assumptions; downloadable program brief.
- Guided analytics and planning run without any API key. They do not constitute a production deployment or an LLM accuracy benchmark.
- Optional free-text analytical routing is disabled by default. Set `PORTFOLIO_ANALYST_ENABLED=true` only after evaluating routing and configuring provider spending limits. It uses the existing server-side Anthropic integration. `PORTFOLIO_ANALYST_MODEL` can override the existing model default. Production requires the existing Supabase rate-limit configuration. The inherited limiter is best-effort under concurrent requests and is not a hard spending cap. No secrets are added or exposed to the browser.
- The calculation-layer test suite does not establish natural-language routing accuracy. Live routing needs separate holdout questions and repeated trials before claiming reliability.

## Editorial change

Existing CMS documents are preserved, not deleted. Articles, legacy posts and project descriptions, news, and deal/event pages require `editorialReviewed: true` to appear in public pages, the sitemap, and the weekly digest. New automated news is saved under `drafts.*` with review unset. This prevents a volume-based publishing pipeline from republishing unsupported claims under the owner's professional identity.

To restore an archive item: verify its claims against primary sources, correct dates and wording, record source URLs, then enable “Reviewed for public publication” in Sanity and publish. Editing a reviewed item should include a fresh editorial check. The portfolio's three new guides are version-controlled original material and use fictional examples.

## Validation

Run `npm run resources:portfolio`, `npm run test:portfolio`, `npm run test:compass`, `npx tsc --noEmit`, and `npm run build`.

Browser QA should cover desktop and narrow layouts, menu, both demos, zero lift, zero budget, missing-period and insufficient-evidence answers, resource downloads, print layout, and contact failure handling. Do not send test messages or call paid model APIs without a deliberate test decision.
