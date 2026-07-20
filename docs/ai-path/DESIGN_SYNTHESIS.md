# AI Path design synthesis

## Current direction: Calm Guided Path

AI Path is a two-path learning advisor with six domain sections per path. The
interface reveals that structure progressively: one question group in focus,
one clear action, and a concise summary of what has already been answered. The
next scene is a project-first result.

The goal is not to make the domain model smaller by removing important
questions. The goal is to keep the learner from carrying the whole model in
working memory at once.

## Visual-review decision

The previous direction combined **Working Ledger**, **Living Index**,
**Diagnostic Workbench**, **Evidence Aperture**, chamfered controls, and a sticky
six-section sidebar. It displayed all six sections on one long screen and added
field-level Voice controls.

That direction was rejected after visual review because it:

- looked like a large form before value was delivered;
- made internal assessment mechanics more prominent than the learner's task;
- repeated progress in the sidebar, section status, and submit rail;
- used angular/chamfered styling that made simple controls feel technical;
- implied that every field could accept voice even while transcription was not
  connected;
- produced a dense ledger rather than the calm simplicity requested by the user.

Do not revive that direction through visual polish. The ledger, sticky evidence
sidebar, signal vocabulary, chamfered choice system, six simultaneously expanded
sections, and field-level Voice margin are explicitly out of scope.

## Experience structure

### 1. Choose a path

The first screen asks one question: **What would you like help with?**

- **I have a task or idea** — turn it into a small, testable AI project.
- **I want to improve my AI skills** — choose what to learn and build next.

There is no marketing hero, decorative empty column, diagnostic explanation, or
pre-selection questionnaire.

### 2. Answer six question groups

Only the current group is expanded. The learner sees:

- the plain-language question;
- a short explanation only when it helps answer;
- the relevant text or structured controls;
- **Back** and **Continue**;
- progress such as **2 of 6 complete**.

Completed groups collapse to a short human-readable answer summary. Selecting a
completed group reopens it for editing without clearing later answers.

Conditional fields are revealed inside the current group. They do not add a
separate step count:

- higher experience claims request a concrete personal example;
- sensitive or consequential use cases reveal a human-control explanation;
- capability claims ask which skills the example actually supports.

### 3. Show the project first

The result begins with the recommended project or smallest useful prototype,
then the first working session and definition of done. Architecture, safeguards,
conservative capability interpretation, four-week detail, and up to three
resources are supporting information.

The two result types remain structurally distinct:

- the use-case plan contains feasibility, system shape, evaluation, and risk;
- the learning plan contains the current supported level, unassessed areas, next
  capability, and a project that creates proof.

## Plain-language system

Learner-facing language uses:

- **questions**, not signals;
- **your plan**, not diagnostic output;
- **a practical example**, not evidence calibration;
- **not assessed yet**, not missing-evidence status;
- **project plan**, not use-case blueprint;
- **learning plan**, not capability prescription;
- **your next four weeks**, not workpath;
- **what needs human review**, not governance boundary.

Versioned diagnostic, evidence, scoring, and recommendation terms remain valid
inside the domain model, tests, and operational documentation. They should not
become the interface's voice.

## Voice and typing

The current preview has one global microphone test. It is a device check, not a
voice-answer mode.

- Copy says **Live voice is not connected in this preview**.
- The action says **Test microphone**.
- Permission begins only after that action.
- Audio stays on the device and is not transcribed or uploaded.
- The test creates no peer connection, provider session, paid request, or stored
  transcript.
- Typing remains the working input before, during, and after the test.
- Do not repeat a Voice action beside every prose field until voice can actually
  populate that field.

When live voice is approved later, speaking and typing will update the same form
state. Switching modes must preserve every answer and conditional branch.

## Layout by viewport

### 1440px

- Center the active question in a calm shell of approximately 760–920px.
- A compact progress header may sit above it; no persistent section sidebar.
- Project and first action lead the result before any two-column supporting grid.

### 768px

- Use one content column.
- Keep Back, progress, and Continue in predictable positions.
- Completed summaries wrap naturally and never become horizontal navigation.

### 375px

- Use at least 16px page padding.
- Controls are full width with important actions near 44px high.
- The action area respects the safe-area inset and never covers the active field.
- Important text wraps; no horizontal section rail or clipped chips.

## Motion and performance budgets

- One transition between question groups, using opacity and transform only.
- Normal duration 180–240ms; never more than 250ms for question advancement.
- At most two scene elements animate at once.
- Reduced-motion mode removes translation and performs an immediate focus-safe
  content change with an optional short fade.
- No third-party animation runtime, canvas visualization, animated blur, glowing
  orb, chat bubble, or decorative media.
- The active question remains in normal document flow so validation messages do
  not clip and layout height stays content-driven.
- Cumulative layout shift remains below 0.05 during the six questions and result
  transition.

## Accessibility contract

- The path chooser and structured answers use semantic buttons, fieldsets,
  legends, labels, and native inputs.
- After Continue or Back, focus moves to the new question heading.
- A single polite live region announces **Question 3 of 6** or a meaningful
  microphone state; it never announces live audio levels or interim speech.
- Conditional content appears directly after the choice that caused it and is
  reachable in normal keyboard order.
- Hidden sections are unmounted or genuinely `hidden`/`inert`, never concealed
  with opacity alone.
- Reduced motion does not delay focus movement.

## Derivative-safe boundary

AI Path may borrow the general workflow principle of clear mode readiness and a
focused preparation step. It does not copy another product's branding, palette,
background pattern, card proportions, icons, navigation, or wording. AI Path
keeps its own green/lime identity and original language, used with restraint.

## Acceptance boundary

- Exactly two learner intents and six versioned domain sections per intent.
- Only one question group is active at a time.
- Back and edit preserve all applicable answers.
- Conditional fields appear only when relevant.
- Higher capability claims require a described personal example.
- Missing practical examples remain unassessed, never converted to a low score.
- One honest local microphone test and no automatic permission request.
- Use-case and capability paths produce structurally different, project-first
  results.
- Every result contains a measurable definition of done and at most three
  resources.
- No paid or external service is activated by the experience.
