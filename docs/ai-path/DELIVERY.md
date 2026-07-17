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

### M0 — Private-alpha foundation (current)

- New `/ai-path` vertical slice isolated from existing tools.
- Text-complete multistep prototype with honest demo labeling.
- Versioned taxonomy, evidence, scoring, recommendation, and report contracts.
- Small multi-provider seed catalog plus an original evidence-sprint project.
- Mock session and analysis endpoints.
- Realtime boundary that performs no network call by default and fails closed without auth/persistence.
- Unit/contract fixtures, production build, and responsive screenshot QA.
- Architecture, product, and delivery decisions documented.

### M1 — Research prototype

- Recruit 8–12 target users; conduct moderated sessions using the text path.
- Have two independent reviewers score transcript fixtures and compare agreement.
- Collapse or rename skills that users cannot distinguish.
- Measure correction rate at the understanding checkpoint.
- Replace canned report content with the deterministic API result.
- Add basic authenticated persistence, export, and deletion.

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

### M4 — Beta decision

- Compare completion, correction, usefulness, return, and artifact-production metrics with thresholds.
- Decide whether the strongest wedge is workflow builders, applied-AI engineers, or team leaders.
- Decide whether to create original lessons only where the external catalog repeatedly fails.
- Complete legal/privacy review, accessibility audit, incident plan, and production capacity model.

## Current critical path

1. Remove any UI behavior that pretends canned or random data is live.
2. Stop microphone tracks on every navigation path and make typed mode complete.
3. Connect the UI to the mock session and deterministic analysis contracts.
4. Add exact transcript-turn evidence fixtures and scoring/recommendation tests.
5. Reject all live Realtime calls until authentication and session ownership exist.
6. Verify lint, TypeScript/production build, API behavior, keyboard flow, and responsive layouts.
7. Run five moderated alpha sessions before expanding taxonomy or catalog depth.

## Decision log

- **2026-07-16:** Build a clean-sheet vertical slice rather than extending existing learning tools.
- **2026-07-16:** Keep voice optional and assessment logic outside the Realtime model.
- **2026-07-16:** Start with external curated resources and original projects; do not build a course library first.
- **2026-07-16:** Use stages, evidence, and confidence rather than a 0–100 score.
- **2026-07-16:** Disable paid/live traffic by default; explicit spend approval remains a release dependency.
- **2026-07-16:** Require authenticated persisted-session ownership before enabling Realtime, even when deployment flags are set.
