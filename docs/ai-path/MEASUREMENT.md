# AI Path Measurement Plan

## Decision this measurement system supports

The private alpha is testing one proposition:

> Can a working professional who already uses general-purpose AI tools complete a short, trustworthy assessment and take a concrete first step toward one reliable work workflow?

Voice novelty, page views, time in product, and number of recommended resources are not success measures. The core progression is reviewed understanding → credible plan → first completed action → evidence artifact → reassessment.

## Target cohort

All alpha metrics use the pinned audience value `workflow-builder-alpha`. Do not blend later applied-engineer, leader, creator, or career-switcher tracks into these denominators.

Each metric window must specify:

- start and end timestamps;
- product/measurement version;
- catalog, taxonomy, scoring, and report versions when analyzing validated reports;
- acquisition source as a bounded category;
- text versus voice mode.

Report text-only and voice cohorts separately until voice reaches comparable completion and assessment quality.

## North-star behavior

The primary behavior is **first plan task completed within seven days of report view**. This measures whether the product created enough clarity and confidence for action.

It must be paired with guardrails:

- assessment completion;
- learner-rated plan fit;
- materially wrong finding rate;
- correction rate at the editable-understanding checkpoint;
- privacy/deletion success;
- resource link and catalog-review health.

## Alpha targets

| Metric | Definition | Initial target |
|---|---|---:|
| Assessment completion | Started sessions that reach completion | ≥ 70% |
| Plan fit | Feedback sessions rating plan fit 4–5 | ≥ 60% |
| Materially wrong finding rate | Wrong findings / findings reviewed | ≤ 10% |
| Seven-day first-task completion | Report sessions completing the first task within 7 days | ≥ 30% |

Additional diagnostic metrics have no launch target until the alpha establishes a baseline:

- landing → profile completion;
- report → plan save;
- seven-day first-task start;
- review correction rate;
- report usefulness rating;
- 30-day artifact addition;
- 45-day reassessment.

## Event taxonomy

The coded contract is `app/ai-path/catalog/measurement.ts`. Each event uses an opaque anonymous ID, an opaque assessment-session ID when required, an ISO timestamp, the pinned measurement version, and allowlisted categorical/numeric properties.

| Event | When emitted | Required outcome property |
|---|---|---|
| `landing_viewed` | Alpha landing is visible | bounded acquisition source |
| `profile_completed` | Goal/constraint form passes validation | intent and weekly-hours bands |
| `assessment_started` | First assessment question is shown | text/voice mode |
| `assessment_completed` | Interview reaches its normal completion state | mode and duration |
| `understanding_reviewed` | Learner approves the editable understanding | correction/removal counts |
| `report_viewed` | Illustrative or validated result is visible | result status |
| `plan_saved` | Learner saves a plan snapshot | plan version |
| `first_task_started` | First planned action starts | lesson/project/practice |
| `first_task_completed` | First planned action is marked done | task kind and elapsed minutes |
| `catalog_resource_opened` | Learner opens a recommended resource | resource ID and rank |
| `project_artifact_added` | Learner adds evidence of a build | bounded artifact type |
| `weekly_check_in_completed` | Learner submits a check-in | ordinal and blocked flag |
| `reassessment_completed` | Follow-up assessment completes | days since initial assessment |
| `feedback_submitted` | Learner rates plan/report | two 1–5 ratings |
| `finding_feedback_submitted` | Learner reviews assessment accuracy | total and materially wrong findings |
| `data_deleted` | Requested preview/session/account data is deleted | deletion scope |

## Privacy rules

Analytics must not contain:

- raw audio;
- transcript text, exact quotes, answers, prompts, or goals;
- names, emails, phone numbers, employers, job titles, or free-form roles;
- resource URLs or user-supplied artifact URLs;
- secrets, tokens, repositories, or file contents;
- model-generated narrative.

The validator rejects unknown properties and property names that imply sensitive/free-form content. Resource provider and other descriptive catalog facts should be joined by resource ID in controlled analysis rather than duplicated into events.

Ordinary logs must not contain complete analytics payloads. Log only event name, validation result, version, and a request correlation ID.

## Metric definitions

- **Profile completion rate:** unique landing visitors who complete a profile / unique landing visitors.
- **Assessment completion rate:** sessions with both started and completed events / started sessions.
- **Correction rate:** reviewed sessions with one or more corrections / reviewed sessions. This is diagnostic: both zero and very high correction can be warning signs.
- **Report-to-plan-save rate:** report sessions with a plan save / report sessions.
- **Seven-day task start/completion:** report sessions with the respective event from 0–7 days after first report view / report sessions.
- **Plan fit/report usefulness:** distinct feedback sessions rating the dimension 4–5 / feedback sessions.
- **Thirty-day artifact rate:** report sessions adding an artifact from 0–30 days after report view / report sessions.
- **Forty-five-day reassessment rate:** report sessions completing reassessment from 0–45 days after report view / report sessions.
- **Materially wrong finding rate:** materially wrong findings / total reviewed findings.

The deterministic implementation intersects downstream sessions with the correct upstream denominator and treats zero denominators as insufficient data, not 0%.

## Experiment guardrails

- Do not optimize copy for completion if materially wrong findings or corrections rise.
- Do not compare voice and text outcomes without controlling for target intent and starting point.
- Do not infer learning or skill gains from resource clicks.
- Do not use peer percentiles until sample sizes, cohort definitions, and assessment reliability are defensible.
- Do not sell or share individual analytics with employers.
- Do not run paid acquisition or paid service experiments without explicit approval.

## Weekly alpha review

Review a compact evidence packet:

1. Funnel counts and target status by text/voice mode.
2. Completion and first-action rates by acquisition source.
3. Correction and materially wrong finding rates by rubric dimension.
4. Top resource opens, broken/stale catalog records, and provider concentration.
5. Moderated-session notes, separated from analytics and de-identified.
6. Privacy/deletion incidents and event-validation rejects.
7. Cost per valid completed report only after paid services are explicitly approved.

Do not make roadmap decisions from fewer than five completed moderated sessions or from a rate whose denominator is below 20. Treat such rates as directional.

