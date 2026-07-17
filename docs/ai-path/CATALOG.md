# AI Path Resource Catalog

## Purpose

The catalog is a versioned decision input, not a set of links embedded in a prompt. It owns the factual metadata used to determine whether a resource is suitable for the initial audience: working professionals who already use general-purpose AI tools and want to build one reliable work workflow.

The model may explain a recommendation selected by application rules. It must not invent, rewrite, or silently substitute resource titles, URLs, prices, durations, prerequisites, or providers.

## Runtime boundary

The production catalog domain lives under `app/ai-path/catalog/`:

- `catalog.ts` defines the versioned schema, structural validation, publication gates, and deterministic eligibility filter.
- `v1.ts` is the published private-alpha snapshot and its recorded review evidence.
- `production.mjs` is the fail-closed adapter from the governed snapshot to the deterministic ranker contract.
- `measurement.ts` defines privacy-safe outcome events and target-user metric computation.

The ranker in `app/ai-path/lib/foundation.ts` has no governed-resource default and its old inline array is retained only as a deprecated migration reference. `buildAssessmentReport` obtains candidates only through `production.mjs`, which requires a published snapshot, passes the complete snapshot through `validateCatalogForPublication`, applies learner eligibility, and then adapts the surviving records. A draft, unchecked, broken, stale, paid-when-free-only, or otherwise ineligible record cannot enter a report. The adapted contract includes the catalog's cost disclosure, including downstream paid-service requirements. When the catalog is unavailable or no resource matches, the report exposes an explicit recommendation status and an empty recommendation list.

## Required metadata

Every resource records:

- immutable schema and catalog versions;
- stable resource ID, title, provider, canonical URL, format, difficulty, and learning modes;
- languages, estimated minutes, quality score, audience, skill mappings, and prerequisites;
- learner outcome and the editorial reason it fits;
- cost kind, amount/currency when applicable, verification date, and a concise downstream-use disclosure;
- provenance origin, source reference, capture date, capture actor, and disclosure;
- editorial-review status, reviewer, review date, cadence, and due date;
- link-health status, check date, next-check date, HTTP status, and redirect target.

These are catalog facts. Learner-specific recommendation reasons belong in the report snapshot, not in the shared resource record.

## Draft versus publication

Structural validation and publication validation are intentionally separate.

`validateCatalogSnapshot` checks schema integrity, bounded fields, taxonomy references, deterministic review dates, duplicate IDs/URLs, provenance, cost shape, and coherent link-health states.

`validateCatalogForPublication` additionally requires every active resource to have:

- an approved, non-stale editorial review;
- a healthy or explicitly redirected external link with a non-stale next-check date; or
- `not-applicable` link health for a first-party resource without a URL.

The V1 snapshot was published after read-only verification on 2026-07-17 UTC. Google Machine Learning Crash Course, the OpenAI API quickstart, and the OWASP prompt-injection cheat sheet returned `200`. DeepLearning.AI returned `308` from the trailing-slash canonical URL to the same HTTPS URL without the slash, followed by `200`; the catalog preserves the canonical URL, records the redirect target, and classifies the course as freemium because the provider page identifies PRO-only graded assignments and certificate features. No enrollment, authentication, purchase, or paid API call was performed.

## Link-health workflow

The eventual link-health job should be deterministic and read-only:

1. Select active external records whose `nextCheckDueAt` is missing or due.
2. Request the canonical URL with a fixed user agent, redirect limit, timeout, and response-size cap.
3. Record `checkedAt`, HTTP status, redirect target, and the next due date.
4. Mark `healthy` for successful canonical responses, `redirected` for allowed HTTPS redirects, and `broken` for terminal errors.
5. Never auto-replace a canonical URL after a redirect. Queue an editorial review.
6. Never activate, purchase, enroll in, or authenticate to a resource.
7. Avoid sending learner or session identifiers to provider URLs.

Link checks require separate network authorization. They are not part of local tests or report generation.

## Review policy

- High-churn vendor documentation: review every 30 days.
- General courses and references: review every 90 days.
- First-party projects: review every 90 days and whenever the assessment rubric changes.
- Paid or freemium prices: verify at least every 30 days and display “last verified” to learners.
- Material title, provider, price, prerequisite, or outcome changes create a new catalog snapshot.

Reviewers should check relevance, accuracy, accessibility, learner effort, prerequisite fit, cost disclosure, and whether the resource produces the promised outcome. Quality score must be editorially justified; sponsorship and affiliate status cannot increase it.

## Recommendation integrity

Eligibility precedes ranking. A record is eligible only when it is active, reviewed, link-valid or first-party, available in the requested language, within the time budget, compatible with free-only preference, and in an allowed format.

Ranking should then use assessed gap, prerequisite readiness, effort fit, quality, and recency. Store the selected resource IDs and catalog version in every report so a recommendation can be reproduced after the catalog changes.

Do not show more than one core lesson, one project, one recurring practice, and an optional stretch resource. The project remains the main prescription.

## First-party evidence sprint

The `free-ai-school-workflow-evidence-sprint` resource has no external URL. Its definition of done is:

1. Map one real workflow's inputs, decisions, outputs, and human checkpoints.
2. Produce a small working artifact.
3. Create at least five representative evaluation examples.
4. Record one failure and the change made in response.
5. Document an outcome or an explicit “not yet measured.”

This resource is eligible only when its first-party content is actually available in the plan experience.

## First-party context evaluation sprint

The `free-ai-school-context-evaluation-sprint` produces a versioned instruction, at least eight representative examples, a simple pass/fail rubric, one controlled context change, and a before/after result table. The learner must record one regression as well as one improvement. This closes the prompt/context gap without requiring an API integration.

## First-party grounded retrieval sprint

The `free-ai-school-grounded-retrieval-sprint` uses a small, learner-owned source set. Its definition of done is a source-grounded prototype, at least eight answerable and four unanswerable test questions, citations linked to the supplied evidence, and an explicit refusal or escalation behavior when evidence is absent. Paid vector storage and paid model APIs are not required.

## First-party bounded agent sprint

The `free-ai-school-bounded-agent-sprint` requires a tool inventory, an allowlist of permitted actions, mocked or reversible tool calls, human approval before consequential actions, and at least six abuse or failure tests. The learner documents one blocked unsafe action and one recovery path. The sprint does not require autonomous or live external execution.

## First-party operational pilot sprint

The `free-ai-school-operational-pilot-sprint` is a simulated or local pilot, not a production launch. Its definition of done includes release criteria, a minimal monitoring checklist, an owner and escalation path, rollback steps, and one incident rehearsal. The learner records pilot evidence and a go, revise, or stop decision; no paid hosting is required.

Together, the five first-party projects cover the seven applied private-alpha skills. `foundations` retains two reviewed provider courses and `coding-apis` retains the reviewed provider quickstart. Across first-party and provider resources, all nine skills are covered. Quality scores remain deliberately below the strongest provider references until moderated learner evidence supports promotion.

## Promotion checklist

- Structural validation passes with zero issues.
- Publication validation passes with zero issues.
- Every active external link has current check evidence.
- Every active record has current editorial approval.
- Price/access claims show a verification date.
- Skill gaps without a reviewed eligible resource return the tested no-resources state; coverage gaps are tracked before broader launch.
- Provider concentration and format concentration are reviewed.
- Sponsorship and affiliate disclosures are recorded separately from rank signals.
- Catalog snapshot is immutable after publication.
- Rollback to the prior snapshot is tested.
