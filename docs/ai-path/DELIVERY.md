# AI Path Advisor Delivery Plan

## Operating model

The build is split into independently reviewable workstreams with explicit gates. Product validity and privacy come before a high-fidelity voice demo.

| Workstream | Accountable role | Current deliverable | Exit gate |
|---|---|---|---|
| Product and research | Product strategy lead | initial user, promise, taxonomy, success criteria | five target-user interviews validate the problem and language |
| Experience | Senior UX/UI | responsive text-complete assessment and report journey | usability pass on mobile, tablet, desktop; no simulated state presented as live |
| Assessment engine | Engineering lead + learning scientist | evidence schema, scoring fixtures, recommendation ranker | reproducible results and expert rubric review |
| Voice platform | Realtime engineer | mock adapter, then authenticated WebRTC integration | consent, ownership, cost cap, kill switch, fallback, and latency SLO |
| Data and catalog | Data engineer/content curator | versioned reviewed catalog and link-health workflow | every resource has provenance, review date, prerequisite, and valid URL |
| Trust and security | Security/privacy reviewer | threat model, retention/deletion design, abuse tests | no critical findings; deletion and auth tests pass |
| Quality | QA engineer | unit, contract, accessibility, and browser test matrix | required suites and visual viewports pass |
| Delivery | Technical program manager | milestone board, decisions, dependencies, risks | weekly go/no-go review has evidence for every gate |

## Milestones

### M0 — Private-alpha foundation (complete locally)

- New `/ai-path` vertical slice isolated from existing tools.
- Text-complete multistep prototype with honest demo labeling.
- Versioned taxonomy, evidence, scoring, recommendation, and report contracts.
- Small multi-provider seed catalog plus an original evidence-sprint project.
- Mock session and analysis endpoints.
- Realtime boundary that performs no network call by default and fails closed without auth/persistence.
- Unit/contract fixtures, production build, and responsive screenshot QA.
- Architecture, product, and delivery decisions documented.

Verified in the repository on 2026-07-17: 237 deterministic tests, TypeScript, scoped ESLint, production build, and a complete responsive browser journey at 375×812, 768×1024, and 1440×900. The browser proof completed a seven-question adaptive interview, near-limit long-content review, injected report failure and empty-catalog recovery, causal learner corrections, deterministic assessment, numeric-only feedback, personalized plan, time-budget recomposition, explicit adaptation decisions, export, reassessment, and deletion with zero external requests. It validated 15 closed-sink analytics attempts without learner-authored text leakage. The source-readiness gate reports 26/26 private-alpha files, 94/94 production-foundation files, thirteen locked safety gates, and zero broken gates. The browser path remains text-only and makes no paid model call.

### M1 — Research prototype

- Recruit 8–12 target users; conduct moderated sessions using the text path.
- Have two independent reviewers score transcript fixtures and compare agreement.
- Collapse or rename skills that users cannot distinguish.
- Measure correction rate at the understanding checkpoint.
- Deterministic API report rendering is implemented for the private-alpha path.
- Owner-scoped persistence, export, deletion, and trusted report-writing contracts are implemented behind closed production latches. The disposable PostgreSQL 16 behavioral suite passes; hosted auth and exact-release staging evidence remain open.

### M2 — Voice alpha

- Obtain explicit paid-usage approval and define a hard monthly ceiling.
- Implement authenticated OpenAI Realtime WebRTC sessions behind a feature flag.
- Add interruption, reconnect, device-error, and typed-fallback behavior.
- Add post-session candidate evidence extraction with strict structured output.
- Run adversarial transcript, prompt-injection, privacy, and cost tests.
- Invite 25–50 users under an explicit alpha consent and support process.

### M3 — Plan loop

- Save plans and weekly actions.
- Add artifact links or uploads with explicit privacy handling.
- Reassess only dimensions supported by new evidence.
- Show report deltas and why each level changed.
- Add catalog review dates, availability checks, and recommendation outcome feedback.

The owner-scoped plan aggregate, HTTP routes, dormant Supabase adapter, immutable server-bound learner goal preference, SQL/RLS contract, task progress, check-ins, time changes, explicit adaptation decisions, reassessment snapshots, export/delete, and retention purge are implemented behind dormant persistence boundaries. The private-alpha UI currently keeps plan changes in the browser and labels them as a preview. The disposable PostgreSQL 16 behavioral suite passes. Durable activation still requires authenticated non-production runtime wiring, exact-release evidence, and versioned retention disclosure.

### M4 — Beta decision

- Compare completion, correction, usefulness, return, and artifact-production metrics with thresholds.
- Decide whether the strongest wedge is workflow builders, applied-AI engineers, or team leaders.
- Decide whether to create original lessons only where the external catalog repeatedly fails.
- Complete legal/privacy review, accessibility audit, incident plan, and production capacity model.

## Current critical path

1. Configure an isolated non-production Supabase-compatible project, verified authentication, server-only credential rotation, monitored bounded retention, deletion alerts, backups, rollback, and incident revocation; this requires platform/operator decisions.
2. Run authenticated owner/cross-owner, export/delete, retention, rollback, and cookie-refresh checks in that staging environment. Re-run the green disposable PostgreSQL 16 workflow for the exact release commit using an accepted push or workflow-dispatch event.
3. Create the commit-bound durable-text evidence packet from successful database, authenticated staging, retention-operations, and owner/cross-owner export-delete runs. Keep all four durable-text latches closed until the offline gate reports only `READY_FOR_REVIEWED_ACTIVATION` and a separate change is approved.
4. Run the checked-in five-participant moderated protocol and two independent assessment reviews; recruiting, consent, restricted research storage, and human adjudication remain operator work.
5. Review the responsive browser screenshots and decide whether the current high-signal accessibility checks require a separately approved full WCAG audit or multi-browser baseline before inviting participants.
6. Choose and privacy-review a production analytics sink, region, access model, cohort floor, retention, and deletion implementation before opening the analytics latch.
7. Obtain explicit paid-usage approval and bounded budgets before enabling or testing live OpenAI Realtime traffic.
8. Only after calibrated text results, stage voice behind authenticated ownership, atomic database admission, distributed limits, concurrency/spend caps, a kill switch, typed fallback, and transcript-free operational telemetry.

## Decision log

- **2026-07-16:** Build a clean-sheet vertical slice rather than extending existing learning tools.
- **2026-07-16:** Keep voice optional and assessment logic outside the Realtime model.
- **2026-07-16:** Start with external curated resources and original projects; do not build a course library first.
- **2026-07-16:** Use stages, evidence, and confidence rather than a 0–100 score.
- **2026-07-16:** Disable paid/live traffic by default; explicit spend approval remains a release dependency.
- **2026-07-16:** Require authenticated persisted-session ownership before enabling Realtime, even when deployment flags are set.
- **2026-07-17:** Treat every production integration as a literal code-latched capability; environment flags alone cannot enable durable writes, analytics sinks, retention mutation, or paid voice.
- **2026-07-17:** Align derived-plan retention with the 90-day source-assessment lifecycle and preserve immediate account/session deletion cascades.
- **2026-07-17:** Require atomic reservation, owner binding, per-user/global concurrency, and daily spend ceilings before a Realtime call can become reachable.
- **2026-07-17:** Replace application-trusted rotating HMAC tuples with an authenticated database intent and stable DB-owned continuity handles; keep raw identities out of the accounting ledger.
- **2026-07-17:** Make Postgres authoritative for admission policy, clock, UTC day, lease TTL, and kill switch; seed admission disabled and remove all caller-cap RPC overloads.
- **2026-07-17:** Replace the fixed interview script with a deterministic five-to-seven-question engine that asks only application-owned follow-ups for missing evidence dimensions.
- **2026-07-17:** Recompose plans from assessed growth areas and bounded learner constraints while keeping unassessed skills explicit and raw free-form profile text out of generated instructions.
- **2026-07-17:** Instrument only typed, governed funnel and numeric-feedback events; keep random analytics IDs in memory and the production sink code-latched off.
- **2026-07-17:** Require a five-participant moderated packet plus two independent coded reviewers before interpreting private-alpha assessment validity.
- **2026-07-17:** Bind durable-text activation evidence to the exact successful GitHub database-proof commit and require separate platform, privacy, release, and security approvals.
- **2026-07-17:** Fill catalog gaps with first-party evidence sprints that can be completed without paid infrastructure; retain external provider resources for foundations and API implementation.
- **2026-07-17:** Keep the GA unified WebRTC boundary dormant; Realtime remains downstream of durable text, calibrated voice evidence, and explicit spend approval.
