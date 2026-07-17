# Two-reviewer assessment calibration

## Purpose

Two reviewers independently judge whether learner-facing findings are supported by learner-owned evidence and whether the proposed stage is defensible. The exercise evaluates the assessment contract, not the participant.

## Reviewer preparation

Before real sessions, both reviewers score the same synthetic example and discuss definitions. Do not use a real participant for training and then exclude that participant from a five-person packet.

Each real review packet contains only:

- opaque participant and finding IDs;
- the exact de-identified learner turns needed to assess the finding;
- finding skill ID, displayed status, level, confidence, rationale, and evidence links;
- taxonomy, scoring, and report versions.

Remove names, employers, contact details, URLs, secrets, and unrelated transcript turns. Reviewers must not see the other reviewer's ratings until the agreement artifact is saved.

## Rating rules

Create one rating per participant/finding/skill/reviewer.

### Evidence verdict

- `supported`: cited learner text and ownership are sufficient for the finding as written;
- `partially_supported`: relevant evidence exists, but the wording, ownership, scope, or confidence is stronger than the evidence;
- `materially_wrong`: a reasonable learner could be misdirected because the finding lacks evidence, assigns the wrong owner, misses a direct contradiction, or asserts a materially indefensible level;
- `not_assessable`: the packet lacks enough information to judge. This is a packet/calibration problem, not a beginner rating.

### Proposed level

Use `1`–`4` only when the evidence supports an assessed level under the versioned rubric. Use `null` when evidence should remain not assessed. Do not use `0` as a substitute for missing evidence.

### Confidence

Rate `low`, `medium`, or `high` based on evidence quantity, independence, source diversity, and unresolved contradiction—not writing fluency.

### Reason codes

Use zero or more: `missing_quote`, `ownership_unclear`, `artifact_unverified`, `outcome_unmeasured`, `contradiction_unresolved`, `level_too_high`, `level_too_low`, `not_assessed_expected`. Free-form notes are deliberately excluded from the machine packet.

## Packet schema

Use [review-packet.schema.json](./review-packet.schema.json). The calculator also enforces pairing rules JSON Schema cannot express: exactly one record from each of the two distinct reviewers for every participant/finding/skill unit, a maximum of 500 units, exact keys, and no free-form note fields.

Example:

```json
{
  "schemaVersion": "2026-07-17.v1",
  "reviewers": ["reviewer-a", "reviewer-b"],
  "ratings": [
    {
      "participantId": "participant-01",
      "findingId": "finding-01",
      "skillId": "workflow-design",
      "reviewerId": "reviewer-a",
      "evidenceVerdict": "partially_supported",
      "proposedLevel": 1,
      "confidence": "low",
      "reasonCodes": ["ownership_unclear"]
    },
    {
      "participantId": "participant-01",
      "findingId": "finding-01",
      "skillId": "workflow-design",
      "reviewerId": "reviewer-b",
      "evidenceVerdict": "supported",
      "proposedLevel": 1,
      "confidence": "low",
      "reasonCodes": []
    }
  ]
}
```

Run:

```bash
node scripts/ai-path-research-agreement.mjs path/to/review-packet.json
```

The output contains exact agreement and Cohen's kappa for evidence verdict and confidence, exact/within-one agreement and quadratic-weighted kappa for non-null proposed levels, and deterministic field-level disagreement units. Kappa is `null`/`not_estimable` when marginals have no variance; use percent agreement in that case.

## Pilot calibration gates

These are conservative engineering gates for this alpha, not universal psychometric standards:

- evidence-verdict exact agreement at least `0.80`;
- evidence-verdict Cohen's kappa at least `0.60`, when estimable;
- proposed-level exact agreement at least `0.70`;
- proposed-level within-one agreement at least `0.90`;
- no unresolved disagreement about a `materially_wrong` verdict;
- adjudicated materially wrong finding rate at most `0.10`, matching the product guardrail.

With small denominators, report counts and confidence limitations. A high kappa does not prove validity; two reviewers can agree on a bad rubric.

## Adjudication

After calculation:

1. Save the immutable two-reviewer packet and agreement output.
2. Review only listed disagreement units.
3. Record an adjudicated value in a separate artifact, never over an original rating.
4. Classify the root cause: `rubric_ambiguous`, `evidence_missing`, `finding_wording`, `level_boundary`, `reviewer_error`, or `unresolved`.
5. Update rubric/code only after the complete five-participant round, unless a trust or safety defect requires an immediate stop.

