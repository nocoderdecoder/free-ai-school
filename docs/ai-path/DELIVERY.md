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

Verified in the repository on 2026-07-17: 202 deterministic tests, TypeScript, scoped ESLint, production build, and responsive browser QA at 375×812, 768×1024, and 1440×900. The source-readiness gate reports 14/14 private-alpha files, 88/88 production-foundation files, thirteen locked safety gates, and zero broken gates. The browser path remains text-only and makes no paid model call.

### M1 — Research prototype

- Recruit 8–12 target users; conduct moderated sessions using the text path.
- Have two independent reviewers score transcript fixtures and compare agreement.
- Collapse or rename skills that users cannot distinguish.
- Measure correction rate at the understanding checkpoint.
- Deterministic API report rendering is implemented for the private-alpha path.
- Owner-scoped persistence, export, deletion, and trusted report-writing contracts are implemented behind closed production latches; disposable-database proof and hosted auth remain open.

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

The owner-scoped plan aggregate, HTTP routes, dormant Supabase adapter, immutable server-bound learner goal preference, SQL/RLS contract, task progress, check-ins, time changes, explicit adaptation decisions, reassessment snapshots, export/delete, and retention purge are implemented behind dormant persistence boundaries. The private-alpha UI currently keeps plan changes in the browser and labels them as a preview. Durable activation still requires request-runtime wiring, disposable-database proof, and versioned retention disclosure.

### M4 — Beta decision

- Compare completion, correction, usefulness, return, and artifact-production metrics with thresholds.
- Decide whether the strongest wedge is workflow builders, applied-AI engineers, or team leaders.
- Decide whether to create original lessons only where the external catalog repeatedly fails.
- Complete legal/privacy review, accessibility audit, incident plan, and production capacity model.

## Current critical path

1. Wire the dormant durable plan adapter into request selection only after the new goal-binding migration passes the disposable-database suite; keep both code latches closed until then.
2. Enforce the exact policy ID and versioned HMAC binding tuples in SQL/RPCs, then run the fail-closed disposable-database harness under races, rollback, seven-day reconciliation, 90-day purge/archive, timeout, rotation, backlog, and deletion before activation.
3. Apply all seven dormant migrations to a disposable Supabase-compatible PostgreSQL project and behaviorally prove RLS and RPC behavior with two users plus the service role. The harness is implemented, but this machine still needs `psql` and a disposable local database.
4. Configure monitored retention, distributed abuse controls, deletion alerts, and secret rotation after infrastructure and privacy decisions are supplied.
5. Run five moderated text-alpha sessions and two independent assessment reviewers; this needs recruited participants and reviewer availability.
6. Complete accessibility, adversarial, and long-content audits, then resolve every release-blocking result.
7. Obtain explicit paid-usage approval and a bounded budget before enabling or testing live OpenAI Realtime traffic.
8. Stage voice behind authenticated ownership, atomic admission, distributed limits, concurrency/spend caps, a kill switch, and transcript-free operational telemetry.

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
