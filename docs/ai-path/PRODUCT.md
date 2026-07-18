# AI Path

## Product thesis

AI learners arrive with two different jobs. Some have a real task or idea and
need to decide what to build, how to test it, what can go wrong, and what to
learn along the way. Others want to improve their AI skills and need an honest
view of what they have actually done, followed by one useful project.

AI Path serves both without becoming a generic chat, a course marketplace, or a
long assessment form. The learner chooses one path, answers six short question
groups one at a time, and receives a project-first recommendation.

## Product decision after visual review

The earlier **Diagnostic Studio / Working Ledger** direction was rejected after
visual review. It exposed all six sections at once, used a persistent evidence
sidebar, chamfered controls, monospaced signal labels, and repeated field-level
voice actions. Although structured, it looked like substantial work before the
learner received value.

That direction is not the target for further polish. The corrected direction is
a calm, progressive conversation:

- one question group in focus;
- one plain-language progress line;
- completed answers summarized and available for editing;
- one global, honest microphone test;
- one clear next action;
- a project-first result with supporting detail below it.

The underlying two-path, six-section domain model remains valid. The correction
is how much of that model the interface exposes at one time.

## The two paths

### Path A — I have a task or idea

Six domain sections establish:

1. **What are you trying to improve?** The person, task, and desired outcome.
2. **How does it work today?** The current process and its main failure point.
3. **What should the AI do?** Inputs, expected output, and an observable success
   check.
4. **What have you already tried?** The highest experience claim the learner can
   support with something they personally made or tested.
5. **What could go wrong?** Data sensitivity, error consequences, and where a
   person must remain in control.
6. **What must the plan fit?** Role, time, coding comfort, approach, team mode,
   and budget.

The result is a **project plan**. Internally it remains a versioned use-case
blueprint with feasibility, smallest useful prototype, system shape, evaluation
checks, safeguards, required skills, four weeks of work, and one first action.

### Path B — I want to improve my AI skills

Six domain sections establish:

1. **What do you want to get better at?** Working context and up to two areas of
   interest.
2. **What have you done so far?** Behaviorally anchored experience across five
   practical domains: using AI at work, automation, building AI tools, working
   with data, and testing quality and safety.
3. **Tell us about your best example.** What the learner personally made or
   improved, what was difficult, and how the result was checked.
4. **How do you make decisions?** Applied judgment in one short scenario.
5. **What are you comfortable using?** Coding, data, and tool foundations.
6. **What must your learning plan fit?** Time, learning preference, pace,
   resource boundary, and whether the project can be public.

The result is a **learning plan**. Internally it remains a versioned capability
prescription with a conservative experience profile, explicit unassessed areas,
one next capability, one proof-producing project, a definition of done, four
weeks of work, and one first action.

## Progressive experience contract

- Exactly two entry paths.
- Exactly six top-level domain sections per path.
- Only one section is presented as the active task at a time.
- The learner can move back and edit a completed answer without losing later
  answers.
- Path switching preserves each draft until the learner explicitly starts over.
- Progress uses plain language such as **2 of 6 complete**. It is not a score.
- Structured choices are used for bounded decisions. Prose is reserved for the
  outcome, current process, personal work, and reasoning.
- Conditional questions appear only when relevant. A higher experience claim
  asks for a concrete example; a sensitive or consequential use case explains
  the required human boundary.
- A learner may say they have not tried something. Missing practical examples
  remain unassessed and are never converted into a low score.
- Learner-facing copy avoids terms such as diagnostic, workbench, signals,
  evidence ledger, aperture, prescription, and calibration.
- Submission produces structurally different results for the two paths even
  though both results share a calm visual shell.

## Voice and typing contract

Voice and typing are two possible ways to answer the same active question. They
never create separate questionnaires or duplicate fields.

In the current preview, live voice transcription is not connected. The product
must say this before microphone permission is requested.

- There is one global **Test microphone** action, not a Voice button repeated on
  every field.
- Opening a path does not request microphone permission.
- The test begins only after an explicit action and remains on the device.
- The local test does not create a Realtime session, peer connection, transcript,
  assessment session, or paid request.
- After success or denial, typing remains available in the same active question.
- An unavailable voice path is never labeled **Start voice conversation** or
  presented as if transcription will follow.
- When live voice is eventually approved and connected, finalized speech will
  populate the same versioned answer state and require learner confirmation.

## Result contract

Every result leads with:

1. the project or smallest useful prototype;
2. one first working session;
3. how the learner will know it works.

System detail, conservative experience interpretation, risks, the four-week
sequence, and no more than three supporting resources follow with lower visual
priority or progressive disclosure. Courses support the project; they are not
the product.

The use-case result and capability-growth result must not collapse into a generic
shared report. The first contains system and risk decisions. The second contains
a conservative capability interpretation and proof-producing project.

## Resource strategy

AI Path does not need to own a course library. The project prescription is the
value; courses and documentation are supporting material. The curated catalog
may combine free courses from multiple providers, official documentation,
vendor-neutral safety references, and original build exercises.

The catalog—not a model—owns canonical titles, URLs, cost flags, prerequisites,
duration, and review state. A recommendation may explain why a selected resource
fits but must not invent a URL or silently substitute a course.

## Trust and spending boundaries

- No raw audio is stored by default.
- Typed diagnostic state stays client-side in this preview.
- Canned examples are labeled and never attributed to the learner.
- No paid API, course enrollment, subscription, or purchase is activated.
- Live Realtime voice remains closed until authentication, ownership,
  persistence, deletion, abuse controls, privacy testing, and an approved spend
  ceiling exist.
- The system must not infer accent, emotion, personality, protected traits,
  employability, or clinical attributes.

## Alpha success criteria

The private alpha is successful when at least 70% of test users can complete one
path without facilitator help, at least 60% say the prescribed project fits
their goal and constraints, fewer than 10% of reviewed statements are materially
wrong, and at least 30% return to act on the first step within seven days.

## Explicit non-goals

- a generic assistant chat;
- an expert-facing diagnostic console;
- a personality or psychometric test;
- a large owned video-course library;
- certificates, grades, or hiring decisions;
- unrestricted model-generated curricula or links;
- automatic purchases or paid-course enrollment;
- production voice traffic before the trust and spend gates are open.
