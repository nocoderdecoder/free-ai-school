# AI Path simulated persona panel report

Date: July 19, 2026  
Build reviewed: `e5857d1` (`codex/ai-path-private-alpha`)  
Mode: text preview; provider-backed adaptation and live voice disabled  
Panel: eight distinct Codex agents running nine simulated persona sessions

## Important evidence qualification

This is rigorous simulated preflight research, not human-user research. It is useful for finding deterministic product failures, audience mismatches, unclear language, unsafe recommendations, and likely usability friction. It cannot establish human completion, satisfaction, behavior change, or product-market fit.

Four personas completed a full primary journey in a real browser. Three combined partial browser observation with deterministic execution of the same routing and plan-composition code used by the UI. Two were deterministic source-backed sessions after browser tooling failed twice. Claims are limited accordingly.

## Executive decision

- Small, moderated, explicitly text-only beta: **conditional go after the P0 fixes in this report**.
- Broad public LinkedIn launch: **not ready**.
- Formal research-template decision: **`INSUFFICIENT_EVIDENCE`**, because the panel was simulated and did not measure independent human completion, export/deletion discovery, two-reviewer accuracy, or seven-day action.
- Realtime voice investment: **defer**. No persona demonstrated that voice materially improves evidence quality or completion. The immediate problem is that the interface currently implies speech input while only offering a local microphone test.

The product direction is sound. Its strongest advantage over ordinary chat is the bounded, evidence-aware diagnostic—not voice. The interview and trust model are substantially stronger than the generated plan's final prose, learning resources, and first action.

## Panel and coverage

| Persona | Evidence strength | Primary journey | Key outcome |
|---|---|---|---|
| Sales/GTM director | Full browser | Known use case | Strong diagnostic; output needs an executive-ready artifact |
| MBA strategy manager | Full browser | Known use case | Valuable structure; prose and strategic depth below peer-sharing bar |
| Finance/FP&A manager | Full browser | Known use case | Strong safeguards; architecture must keep calculations deterministic |
| Nontechnical marketing/HR manager | Full browser | Capability growth | Questions fit; plan ignored the strongest employee-comms example |
| Operations manager | Partial browser + deterministic result | Capability growth | Conservative route; broken task interpolation and time mismatch |
| Senior VP | Partial browser + deterministic result | Known use case | Good governance-first start; needs executive summary and honest effort promise |
| Technical builder | Observed opening + deterministic result | Advanced capability | Under-calibrated; incompatible no-code resource and insufficient depth |
| University student | Deterministic source-backed | Discovery | Constraint fit is good; first action is vague and grammatically broken |
| Career switcher | Deterministic source-backed | Discovery | Honest confidence; employability goal remains only partly answered |

The Student and Career-switcher sessions support no visual, responsive, latency, microphone-permission, or live-adaptation claims. Operations, Senior VP, and Technical Builder conclusions about final plans are source-backed rather than fully browser-observed.

## Comparable score summary

Only dimensions that could reasonably be harmonized were aggregated. Differently named scores were not silently combined.

| Dimension | Numeric responses | Mean | Range |
|---|---:|---:|---:|
| Question/path clarity | 7 | 7.9/10 | 7–8 |
| Relevance/personalization | 9 | 6.8/10 | 5–8 |
| Plan fit/usefulness/feasibility | 8 | 6.4/10 | 5–8 |
| First-action clarity/actionability | 9 | 6.6/10 | 3–8 |
| Trust | 8 | 8.3/10 | 8–9 |
| Willingness to return | 7 | 5.7/10 | 4–7 |
| Willingness to share/recommend | 6 | 5.2/10 | 4–7 |
| Voice value | 5 | 3.0/10 | 1–6 |

Operations described trust as strong but gave no numeric score, so it was excluded from the trust mean. Four personas described voice qualitatively rather than numerically; none showed measured improvement to answers or completion.

The pattern is consistent: people understand and trust the interview, but the recommendation, first action, return intent, and sharing intent are weaker.

## What consistently worked

1. The two-path opening is clear: bring a use case or discover what to learn.
2. The stable six-section spine feels more purposeful and safer than unbounded chat.
3. Adaptation generally remains relevant without replacing the agreed route.
4. Concrete-use-case plans reflect workflow, risk, human review, coding comfort, and weekly time well.
5. Missing evidence is usually left unassessed rather than treated as failure.
6. Confidence and assumptions are visible instead of hidden.
7. Sensitive-data warnings, Privacy and Terms links, local microphone-test copy, and the no-paid-service footer produce high trust.
8. Human approval, traceability, read-only pilots, and representative examples are strong default patterns.
9. Free-only, private-project, manual/no-code, and weekly-time constraints materially affect plans.
10. Edit, local next-step save, and print/PDF controls are useful trust and portability features.

## Cross-persona recurring failures

| Theme | Persona count | Severity | Evidence |
|---|---:|---|---|
| Raw inputs create mechanical, broken, repetitive, or truncated output | 8/9 | High | Titles and first actions contain full role/evidence sentences |
| Resources are generic, non-navigable, level-mismatched, or over budget | 7/9 | High | Internal sprint labels lack destinations; durations exceed plan time |
| Voice is overpromised or shows low/unproven value | 9/9 signal gap | High | “Speak or type” is shown, but only microphone testing exists |
| Default “Not started” counts as completed progress | 5/9 | High | Untouched experience appears complete before user confirmation |
| The plan weakly uses the learner's concrete evidence or level | 5/9 | High | Discovery plans ignore best examples; expert plan resets baseline |
| Jargon or weak hierarchy reduces comprehension | 6/9 | Medium | “Evaluation contract,” “bounded,” “evidence pack,” and similar terms |
| First action lacks artifact, timebox, or done condition | 4/9 | High | Beginner/discovery users must reinterpret what to do |
| Five-minute/six-question promise understates work or waits | 4/9 | Medium | Compound steps feel like 12–15 decisions; observed waits reached 10.4s |
| Privacy, evidence honesty, and safeguards inspire trust | 9/9 | Strength | Trust scores were consistently 8–9/10 |

## Persona findings

### Sales/GTM director

Full-browser scores: first impression 8, clarity 8, personalization 8, usefulness 6, simplicity 7, trust 8, return 6, LinkedIn sharing 5.

The adaptive sales-forecasting route was relevant and commercially sensible. It correctly asked for inputs, output, success criteria, failure containment, human approval, team ownership, no-code fit, and a three-hour weekly pilot. The first action—choose representative examples and agree expected results before tools—was strong.

The plan did not provide the artifact that would create immediate value: a forecast-brief schema, risk rubric, or evaluation table. Final prose was repetitive and mechanically assembled, and internal learning activities were not navigable.

### MBA strategy manager

Full-browser scores: first impression 8, clarity 8, personalization 7, usefulness 7, simplicity 8, trust 8, return 5, recommendation 5.

The route improved a market-entry/customer-insight use case without wandering. Evidence, safeguards, and pilot sizing differentiated it from normal chat. Executive trust fell in the result because raw enum labels, duplicated punctuation, long copied headings, and repeated answers exposed the deterministic assembly. The plan also omitted important strategic decision criteria such as sample bias, segment attractiveness, and explicit market-entry gates.

### Finance/FP&A manager

Full-browser scores: first impression 8, clarity 8, personalization 8, usefulness 8, simplicity 7, trust 8, return 7.

The plan respected a three-hour weekly budget, confidentiality, exact reconciliation, traceability, insufficient-evidence flags, and human approval. The most important domain correction is architectural: financial calculations and reconciliation must remain deterministic; AI should draft narrative only from reconciled figures. Typed-answer provider, retention, and training disclosures must be explicit before any provider is enabled.

### Operations manager

Qualified scores converted to ten-point scale: path clarity 10, question clarity 8, adaptive continuity 8, relevance 6, evidence calibration 8, feasibility 6, actionability 6.

The route was conservative and trusted. The result inserted evidence as a grammatical task, failed to recognize “keep manager approval” as a review boundary, and recommended roughly thirteen hours of resources inside an eight-hour monthly commitment.

### Senior VP

Qualified scores: opening 9, relevance 8, time efficiency 6, executive polish 7, actionability 8, personalization 8, trust 8, voice value 2, overall 7.5, sharing 7.

The evidence-and-governance-first start was strong for portfolio prioritization. The result needs a concise executive summary with recommendation, owner, risk boundary, decision gate, and first 30-minute action. “Six short questions” understates the number of decisions and required typing.

### Nontechnical marketing/HR manager

Full-browser scores: path choice 9, clarity 8, adaptive relevance 8, ease 5, visual usability 8, plain-language accessibility 5, result personalization 5, actionability 5, trust 9, overall/share readiness 6, return 6, public sharing 4.

Question four correctly anchored to a real employee-announcement example, but the final plan ignored that evidence and returned generic opportunity discovery. Terms such as bounded experiment, quality rubric, evidence pack, input/output contract, mocked request, and reassessment were too technical. One transition took 10.4 seconds and final generation took 6.2 seconds.

### Technical builder

Qualified scores: first impression 8, clarity 7, technical calibration 4, personalization 6, architecture depth 4, evaluation depth 6, plan fit 6, resource fit 2, trust 8, return 4, voice value 4.

The capability route is too coarse for an engineer already using model APIs and a 100-ticket evaluation set. The product under-classified advanced work, recommended a no-code integration sprint, and reduced an existing evaluation practice to a new ten-example baseline. The advanced path needs architecture, authorization/threat modeling, offline and online evaluation, observability, release gates, rollback, latency, and cost.

### University student

Source-backed scores: constraint fit 8, recommendation relevance 6, first-action clarity 3, feasibility 6, readability 5, trust 8, privacy 9, voice 1, overall 6, return 5, sharing 4.

The plan respected two hours per week, free-only, guided learning, no coding, and uncertainty about public sharing. It assigned the meta-capability “Finding valuable AI opportunities” without giving a specific beginner assignment. The first action had no named input, output, timebox, or completion test, and its grammar was broken by raw answer interpolation.

### Career switcher

Source-backed scores: path clarity 9, question clarity 8, persona fit 7, plan fit 7, first-action clarity 5, employability 6, jargon accessibility 6, confidence calibration 9, trust 9, voice 2, overall 7, return 7, sharing 6.

“Limited confidence” and “missing evidence is not a zero score” were reassuring. The plan respected free, no-code, spreadsheet, private, and weekly-time constraints. It did not translate learning into target roles, hiring evidence, portfolio artifacts, resume language, or an employer-facing completion criterion.

## Product contradictions to resolve

### Beginners versus advanced builders

Beginners need examples, vocabulary support, and concrete employability outcomes. Advanced builders need architecture, evaluation, security, and operating depth. A single difficulty level cannot serve both credibly.

### Executives versus practitioners

Executives need a short decision summary, owner, governance, and checkpoint. Practitioners need step-by-step instruction and examples. Keep one diagnostic spine, but adapt the result hierarchy.

### Evidence honesty versus progress UI

The product responsibly labels missing evidence as unassessed, then undermines that integrity by counting default nonresponses as completed progress.

### Privacy trust versus typed-data ambiguity

The current warning performs well, but workplace users want typed-data processing, external-provider use, saving, retention, and deletion explained beside the input—not only on a legal page.

### Voice promise versus measured value

Voice may improve convenience for long narrative answers, particularly for nontechnical professionals. It did not demonstrate improved evidence or completion in this panel. Technical and beginner users often preferred text for exact details.

## Voice recommendation

Do not make Realtime voice the next milestone.

Immediate action:

- Replace “Speak or type” with “Type your answers” and label the existing control “Test microphone for a future voice mode.”

If voice is later tested:

- Use it only for narrative steps such as current workflow, real example, and review reasoning.
- Keep structured selections as visible controls.
- Produce an editable transcript and structured summary before submission.
- Measure completion time, evidence quality, correction rate, and first-action quality against text—not enthusiasm alone.

## Severity-ranked backlog

### P0 — before broader beta

1. Remove the live-voice implication until speech input actually works.
2. Require explicit answers before a section is marked complete.
3. Stop interpolating raw role/evidence strings into titles and first actions.
4. Add high-stakes domain policies, beginning with deterministic finance calculations plus AI-only narrative drafting.
5. Put typed-data processing, provider, retention, saving, and deletion disclosure beside the input before external processing is enabled.

### P1 — before a useful public text beta

1. Make every recommendation produce one evidence-specific artifact.
2. Give every first action a task, input, artifact, timebox, and done condition.
3. Make resources real and navigable, with prerequisites, outcomes, ownership, and a reason for selection.
4. Map resources to weeks and reconcile their durations with the weekly budget.
5. Add beginner, intermediate, and advanced plan branches.
6. For discovery users, show three concrete role-matched experiments.
7. For career users, add target-role mapping, portfolio evidence, a resume-bullet template, and an employer-facing completion test.
8. Add an executive result summary: recommendation, reason, owner, risk boundary, first decision, and checkpoint.

### P2 — quality and comprehension

- Replace curriculum jargon with plain language or contextual explanations.
- Shorten titles and eliminate repeated answers.
- Show which goal is primary and which is secondary.
- Make the time estimate honest and reduce transition latency.
- Explain why an architecture or approach was selected.
- Add concrete confidential-data examples.
- Name the accountable reviewer/owner in workplace pilots.
- Specify unsaved diagnostic retention.
- Add role examples for sales, operations, marketing/HR, finance, students, and career switchers.

### P3 — polish

- Remove duplicate punctuation and raw enum labels.
- Improve truncation and long-role handling.
- Explain terms such as “approved reviewer.”
- Require explicit resource-budget and sharing choices when they alter the plan.
- Improve print/share formatting after recommendation quality is fixed.

## Ten most important next actions

1. Correct voice labeling.
2. Fix default-progress assessment integrity.
3. Add a semantic output composer that never concatenates raw answers.
4. Redesign first actions around artifact, timebox, and completion criteria.
5. Make resources actionable, linked, week-mapped, and time-budget consistent.
6. Strengthen evidence-to-project causality, especially for discovery users.
7. Add beginner/intermediate/advanced plan branching.
8. Add finance and other high-stakes domain safety templates.
9. Adapt result hierarchy for beginner guidance versus executive summary.
10. Run five to eight real moderated text sessions and a seven-day action check.

## Recommended initial audience

Start with:

> Nontechnical or lightly technical workplace practitioners and mid-level managers in sales, GTM, operations, marketing, or general business roles who already have one recurring work use case, basic AI exposure, and two to four hours per week for a bounded no-code pilot.

Do not initially claim equal fit for advanced technical builders, students or career switchers without a use case, consequential finance automation, or senior executives seeking enterprise operating-model guidance.

## Evidence required before public launch

1. At least five real moderated participants from the intended initial audience.
2. At least four complete independently without takeover.
3. At least three rate plan fit 4–5 on the project rubric.
4. At least four independently state a feasible first action.
5. At least four independently find export/deletion controls.
6. Two-reviewer adjudication of potentially wrong recommendations.
7. No unresolved finance, privacy, fabricated-evidence, or accessibility concern.
8. A seven-day follow-up showing whether the first action was attempted.

## Final CTO recommendation

Keep the product's two-path structure, six-section spine, evidence honesty, safety defaults, constraint-aware planning, and strong privacy posture.

The next milestone should not be voice, more questions, or more infrastructure. It should make the text result consistently concise, grammatically sound, evidence-specific, immediately actionable, and backed by real learning artifacts. After those corrections, run a small moderated text beta with the narrow initial audience above.
