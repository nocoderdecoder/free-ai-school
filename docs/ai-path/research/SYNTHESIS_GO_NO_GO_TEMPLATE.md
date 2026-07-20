# Moderated research synthesis and go/no-go

## Study header

- Decision date:
- Build commit:
- Product/measurement version:
- Taxonomy/scoring/report/catalog versions:
- Completed participant codes:
- Screen-out counts by bounded reason:
- Mode: `text`
- Research-material deletion due date:

If fewer than five sessions completed, stop. The result is `INSUFFICIENT_EVIDENCE`, not no-go and not zero percent.

## Cohort coverage

| Participant | AI-use band | Coding band | Workflow maturity | Completed | Follow-up consent |
|---|---|---|---|---|---|
| participant-01 |  |  |  |  |  |
| participant-02 |  |  |  |  |  |
| participant-03 |  |  |  |  |  |
| participant-04 |  |  |  |  |  |
| participant-05 |  |  |  |  |  |

Name sampling gaps without collecting protected traits.

## Outcome counts

| Outcome | Count / denominator | Directional threshold | Result |
|---|---:|---:|---|
| Completed without directional hint/takeover | /5 | at least 4/5 for this moderated round |  |
| Plan fit rated 4–5 | /5 | at least 3/5 |  |
| Report usefulness rated 4–5 | /5 | baseline only |  |
| Could state a feasible first action independently | /5 | at least 4/5 |  |
| Plan judged assessment-specific, not goal-only | /5 | at least 3/5 |  |
| Found export/delete independently | /5 | at least 4/5 |  |
| Seven-day first task completed | /eligible follow-ups | product target ≥30%; report count |  |

Do not present five-person percentages without counts. The product's ≥70% completion, ≥60% plan-fit, ≤10% materially-wrong, and ≥30% seven-day-action targets require larger denominators for reliable rate decisions.

## Accuracy and calibration

- Findings reviewed:
- Participant-marked materially wrong findings:
- Adjudicated materially wrong findings:
- Adjudicated materially wrong rate:
- Understanding review sessions with at least one correction:
- Total edits / removals:
- Evidence-verdict agreement / kappa:
- Proposed-level exact / within-one / weighted kappa:
- Confidence agreement / kappa:
- Unresolved materially-wrong disagreements:

Attach the content-free agreement output. Do not attach transcripts to this synthesis.

## Themes

Include only themes observed in at least two participants or one severe trust/safety incident.

| Theme | Participant codes | Observable evidence category | Severity | Product decision |
|---|---|---|---|---|
|  |  |  | `critical`, `high`, `medium`, `low` |  |

Do not invent or lightly paraphrase quotes. If a restricted exact quote is essential, keep it in the approved research location and reference its opaque evidence ID.

## Personalization audit

For each participant, answer:

1. Which report or plan element changed because of evidence rather than selected goal?
2. Did coding comfort change task format or difficulty?
3. Did the blocker/time constraint change scope?
4. Did missing evidence remain explicitly unassessed?
5. Was the recommended project actually available and actionable?

If three or more plans are judged `goal_only`, the next milestone must improve report-to-plan causality before adding voice.

## Voice value signal

| Response | Count |
|---|---:|
| Voice would materially improve evidence quality/completion |  |
| Voice would improve convenience only |  |
| Text preferred |  |
| Unclear |  |

This signal prioritizes future research. It is not spend approval and cannot open a Realtime latch.

## Automatic no-go conditions

Choose `NO_GO_FIX_TRUST` if any occurs:

- consent, deletion, or sensitive-data handling fails;
- the product presents fabricated learner evidence or an example as learner-owned;
- an unsupported finding or unsafe recommendation could materially misdirect a learner;
- a paid/live service is contacted without approval;
- a critical accessibility blocker prevents the target user from completing the core path;
- an unresolved reviewer disagreement concerns whether a finding is materially wrong.

## Decision

Select exactly one:

- `GO_TEXT_ITERATION`: no automatic stop; all five completed; at least 4/5 independent completion; at least 3/5 plan fit 4–5; at least 4/5 independently identify a feasible first action; calibration gates pass.
- `CONDITIONAL_TEXT_ITERATION`: no automatic stop, but one or more directional gates miss. Ship only the listed bounded fixes and repeat the affected tasks.
- `NO_GO_FIX_TRUST`: an automatic stop occurred. Do not expand access until verified fixed.
- `INSUFFICIENT_EVIDENCE`: fewer than five completed sessions or reviewer packet is incomplete.

Decision:

Evidence supporting decision:

Top three fixes, each with owner and verification:

1.
2.
3.

Explicitly deferred work:

Next review date and required evidence:

