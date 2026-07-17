# AI Path moderated research toolkit

Status: repository-native protocol for the text-only `workflow-builder-alpha` private-alpha decision. It does not recruit people, record sessions, activate production systems, or call a paid service.

## Decision and scope

The study asks whether a working professional who already uses a general-purpose AI tool can complete the text assessment, correct the product's understanding, judge the resulting project as relevant, and identify a realistic first action without facilitator help.

Five completed moderated sessions are the minimum qualitative packet. Five participants are not enough to establish population rates. The packet may support another bounded text-alpha iteration; it cannot justify public launch or production voice.

## Files

- [PARTICIPANT_PROTOCOL.md](./PARTICIPANT_PROTOCOL.md): cohort, screening, scheduling, session IDs, and follow-up.
- [CONSENT_AND_PRIVACY.md](./CONSENT_AND_PRIVACY.md): read-aloud consent and research-data handling.
- [MODERATOR_GUIDE.md](./MODERATOR_GUIDE.md): neutral facilitation and exact task script.
- [OBSERVATION_RUBRIC.md](./OBSERVATION_RUBRIC.md): coded observations, corrections, usefulness, and session form.
- [TWO_REVIEWER_CALIBRATION.md](./TWO_REVIEWER_CALIBRATION.md): independent assessment review and agreement rules.
- [review-packet.schema.json](./review-packet.schema.json): machine-readable two-reviewer input contract.
- [SYNTHESIS_GO_NO_GO_TEMPLATE.md](./SYNTHESIS_GO_NO_GO_TEMPLATE.md): evidence table and bounded decision template.
- `scripts/ai-path-research-agreement.mjs`: deterministic agreement calculator.
- `scripts/ai-path-research-agreement.test.mjs`: calculator contract tests with synthetic opaque fixtures.

## Execution order

1. Assign opaque codes `participant-01` through `participant-05`. Keep recruitment contact details outside this repository and outside research exports.
2. Screen against the pinned audience using the participant protocol. Do not collect protected traits unless a separately approved research plan requires them.
3. Read the consent note verbatim. Default to no audio, video, or screen recording. Stop if the participant declines or shares sensitive information that cannot be removed.
4. Run the same text-only task script. The moderator observes before helping and codes every intervention.
5. Complete the observation form immediately after each session. Store exact learner text only in the approved restricted research location, never in analytics, issues, commits, or ordinary logs.
6. Give both reviewers the same de-identified transcript/report packet. They score independently before discussion.
7. Validate and calculate agreement:

   ```bash
   node scripts/ai-path-research-agreement.mjs path/to/review-packet.json
   node --test scripts/ai-path-research-agreement.test.mjs
   ```

8. Adjudicate only after preserving both original ratings and the agreement output.
9. Complete the synthesis template. Report counts with denominators (`3/5`), not percentages alone.
10. Delete raw research material on the approved schedule and record only a content-free deletion confirmation.

## Non-negotiable interpretation rules

- “Not assessed” is not a beginner score.
- Mentioning a tool or term is not evidence of independent capability.
- A recommended resource click is not evidence of learning.
- Moderator assistance must not be counted as independent completion.
- Corrections are diagnostic. Zero corrections can mean either accuracy or that the review interaction failed to invite correction.
- Never average ordinal skill levels across unrelated skills or people.
- Never resolve reviewer disagreement by silently overwriting an original rating.
- A qualitative theme needs participant codes and observable evidence, not an invented quote.

