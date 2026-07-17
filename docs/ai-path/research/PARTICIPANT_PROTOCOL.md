# Five-participant protocol

## Pinned cohort

Recruit exactly five completed sessions from `workflow-builder-alpha`:

- currently working in a professional role or doing equivalent independent professional work;
- uses a general-purpose AI assistant at least monthly;
- wants to improve one recurring work process during the next 30 days;
- can complete a 35–45 minute text-only session in English for this first calibration round;
- is not being evaluated for employment, certification, academic credit, or clinical suitability.

Do not broaden this round to people primarily seeking advanced model research, a generic course directory, certificates, or a hiring score. Log screen-outs only as a bounded reason code: `not_workflow_goal`, `no_recent_ai_use`, `unavailable`, `accessibility_mismatch`, or `other_not_recorded`.

## Sampling matrix

Use this matrix to avoid five near-identical convenience participants. These are experience dimensions, not demographic quotas.

| Code | AI-use pattern | Coding comfort | Workflow maturity |
|---|---|---|---|
| `participant-01` | occasional | no-code preferred | idea, no artifact |
| `participant-02` | weekly | light code/no-code | manual process exists |
| `participant-03` | weekly | API comfortable | prototype attempted |
| `participant-04` | frequent | any | workflow used by another person |
| `participant-05` | frequent | any | has evaluation or reliability concern |

Substitution is allowed when recruitment reality differs, but the synthesis must name the resulting coverage gap. Never place names, employers, emails, phone numbers, profile URLs, calendar links, or exact job titles in the repository.

## Screening script

Ask only these questions before consent:

1. “Do you currently have a recurring work process you would like AI to make faster, clearer, or more reliable?”
2. “About how often have you used a general-purpose AI assistant during the last three months: never, less than monthly, monthly, weekly, or most workdays?”
3. “Which best describes your coding comfort: no code, light code, API comfortable, or professional engineer?”
4. “Can you use a text-only prototype for up to 45 minutes and optionally complete a seven-day follow-up?”

Do not request the workflow's confidential contents during screening.

## Session setup

- Use the reviewed local/private-alpha build and record its commit SHA, catalog, taxonomy, scoring, and report versions.
- Use a fresh browser context for every participant.
- Use text mode only. Do not test microphone permission or OpenAI Realtime in this study.
- Turn off unrelated browser extensions and notifications.
- Prepare a visible “stop and delete notes” action.
- Use one moderator and, when available, one silent note-taker. A product builder may observe but must not answer for the interface.

## Timing

| Segment | Target |
|---|---:|
| Consent and safety reminder | 3 minutes |
| Context interview | 5 minutes |
| Unassisted product tasks | 20 minutes |
| Finding and plan review | 10 minutes |
| Debrief and deletion choice | 5 minutes |

Stop at 50 minutes. Incomplete work remains incomplete; do not rush the learner through to create a success.

## Seven-day follow-up

Ask permission separately. Send one neutral reminder through the approved recruitment channel: “Were you able to start or complete the first action you selected? Reply yes, no, or prefer not to answer.” Record only `started`, `completed`, `not_started`, `unknown`, or `withdrawn` against the participant code. Do not collect artifact links or work content in this round.

