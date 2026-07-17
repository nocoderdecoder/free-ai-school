# Observation, correction, and usefulness rubric

Complete one copy per participant immediately after the session. Use only the participant code and bounded values. Exact transcript text belongs in the restricted reviewer packet, not this form.

## Session metadata

| Field | Allowed value |
|---|---|
| Participant | `participant-01` … `participant-05` |
| Build | commit SHA |
| Mode | `text` |
| Consent | `consented` or `declined` |
| Completion | `complete`, `participant_stopped`, `product_blocked`, `moderator_stopped` |
| Duration | integer minutes, 1–50 |
| Follow-up | `follow_up_yes`, `follow_up_no`, `not_asked` |
| Stop code | `none`, `withdrawn`, `sensitive_data_stop`, `distress`, `deletion_failure`, `material_misrepresentation` |

## Task outcome scale

Score each task once:

- `3 independent`: completed correctly with `none`, `repeat_task`, or one `neutral_prompt` intervention;
- `2 minor_friction`: completed with two or more neutral prompts, but no directional hint;
- `1 assisted`: completed only after a directional hint or takeover;
- `0 incomplete`: not completed, completed incorrectly, or participant stopped;
- `NA`: task became unavailable because an earlier stop was honored.

The scale measures interface usability, not participant ability.

| Task | Score | Highest intervention | Friction codes, up to 3 |
|---|---:|---|---|
| Explain promise |  |  |  |
| Start path |  |  |  |
| Guided assessment |  |  |  |
| Correct understanding |  |  |  |
| Audit report |  |  |  |
| Judge plan / choose first action |  |  |  |
| Find export or deletion |  |  |  |

Allowed friction codes:

`promise_unclear`, `demo_state_unclear`, `consent_unclear`, `default_bias`, `goal_choice_unclear`, `question_repetitive`, `question_jargon`, `answer_pressure`, `insufficient_evidence_unsupported`, `edit_control_missed`, `removal_control_missing`, `evidence_link_unclear`, `finding_overstated`, `recommendation_unexplained`, `plan_generic`, `time_fit_poor`, `coding_fit_poor`, `first_action_unclear`, `export_missed`, `delete_missed`, `persistence_unclear`, `error_unrecoverable`.

## Understanding corrections

| Measure | Value |
|---|---:|
| Interpretations shown | integer 0–20 |
| Interpretations edited | integer 0–20 |
| Interpretations removed | integer 0–20 |
| Unsupported interpretation remaining | integer 0–20 |
| Participant understood disagreement was allowed | `yes`, `no`, `unclear` |

Classify each edit with one code: `factual_error`, `overstatement`, `wrong_owner`, `missing_context`, `wording_only`, `privacy_removal`, `other_not_recorded`. A wording-only edit is not a materially wrong finding.

## Finding review

For every learner-facing skill finding, record:

| Field | Allowed value |
|---|---|
| Skill | one of the nine versioned skill IDs |
| Evidence verdict | `supported`, `partially_supported`, `materially_wrong`, `not_assessable` |
| Finding status | `assessed`, `not_assessed` |
| Displayed level | `1`–`4` or `null` |
| Participant agreed | `yes`, `no`, `unclear` |
| Reason | one two-reviewer reason code |

`materially_wrong` means the finding would change the learner's understanding or recommended path because it lacks learner-owned evidence, assigns the wrong owner, ignores a contradiction, or claims a materially unsupported level. Stylistic disagreement is not materially wrong.

## Plan and trust outcomes

| Measure | Allowed value |
|---|---|
| Plan fit | integer 1–5 |
| Report usefulness | integer 1–5 |
| Could state first action | `yes_independent`, `yes_assisted`, `no` |
| First action appeared feasible this week | `yes`, `no`, `unclear` |
| Plan appeared assessment-specific | `yes`, `goal_only`, `no`, `unclear` |
| Privacy summary understood | `yes`, `no`, `unclear` |
| Export/delete location found | `independent`, `assisted`, `not_found`, `not_available` |
| Voice expected to materially improve answers | `yes`, `no`, `unclear` |

Primary plan mismatch code, one only:

`none`, `wrong_goal`, `wrong_starting_level`, `coding_mismatch`, `time_mismatch`, `missing_artifact`, `resource_mismatch`, `generic_tasks`, `unsafe_for_context`, `other_not_recorded`.

## Seven-day outcome

| Field | Allowed value |
|---|---|
| Follow-up status | `completed`, `started`, `not_started`, `unknown`, `withdrawn` |
| Reminder count | `0` or `1` |

Do not infer completion from a resource click. Do not request or store the work artifact in this round.

