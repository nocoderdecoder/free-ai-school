# AI Path Advisor

## Product thesis

AI learning fails less from a lack of content than from poor sequencing. People do not know which skill matters for their goal, what they already know, or what credible proof of progress looks like. AI Path Advisor turns a short, evidence-seeking conversation into an editable assessment and a realistic 30-day build plan.

The product is not a quiz, a personality test, or a course marketplace. It is a learning decision system. Voice makes reflection easier; application-owned evidence and recommendation rules keep the result inspectable.

## Initial user

The private alpha is intentionally narrow: working professionals who already use general-purpose AI tools and want to build one reliable work workflow. They may prefer no-code or light code. Later tracks can cover applied-AI engineers, leaders, creators, and career switchers after the assessment model is validated.

The first screen asks for no form work. It offers a guided conversation and,
only when the reviewed provider capability is open, makes live voice the primary
entry. The learner's goal is discovered in the first conversational turn. Role,
experience, time, coding comfort, and constraints are collected naturally inside
the conversation. The private alpha does not claim broader persona coverage that
the assessment is not yet designed to support.

## Core promise

Talk with an AI learning advisor for about five minutes. Leave with one
practical 30-day project, one immediate action, and no more than three learning
resources that fit the learner's time and experience.

The first-use experience is successful only when the learner can understand the
next action without learning how the assessment system works.

## End-to-end journey

1. **Welcome.** State the outcome and begin without a goal form. Offer live
   voice as the primary action only when it is genuinely available; otherwise
   present the complete guided typed conversation and a clearly labeled local
   microphone-setup preview.
2. **Sound check.** After an explicit action, test the selected microphone and
   show a live local input signal. Keep typing available. No audio leaves the
   device and no provider connection starts during this check.
3. **Talk.** Ask one adaptive question at a time. The first turn discovers the
   goal. Role, prior experience,
   constraints, available time, and coding preference are discovered inside the
   conversation rather than through a separate application form.
4. **Understand.** Show three short, editable summaries: goal, current experience,
   and practical constraints. Detailed evidence provenance is optional.
5. **Get a path.** Lead with one practical project, then one recommended skill
   direction, one 30-minute first action, and no more than three resources. The full
   four-week plan and assessment rationale are collapsed by default.

History, progress tracking, check-ins, export, detailed assessment findings,
and adaptation remain post-adoption capabilities. They must not add work to the
first-use journey.

## Learner-facing simplicity contract

- The complete guided conversation begins in one action when live voice is
  unavailable. When live voice is available, the sound check adds one explicit
  microphone-permission action.
- Every screen has one dominant action.
- The primary journey has no scoring, catalog, provider, versioning, evidence-
  gap, persistence, or infrastructure terminology.
- The conversation uses one focal prompt; transcripts and rationale are
  progressively disclosed.
- Voice is never presented as connected when the provider path is closed. A
  local microphone preview is labeled as a preview and cannot create a peer or
  provider session.
- Privacy, deletion, and export remain accessible without being repeated across
  every step.
- Missing evidence remains unassessed internally, but the default result view
  emphasizes what to do next rather than an exhaustive skill table.

## Assessment model

The long-term model uses six outcome-oriented dimensions:

1. problem and use-case judgment;
2. model, prompt, and context design;
3. data and retrieval;
4. evaluation and iteration;
5. reliability, deployment, and observability;
6. technical communication and portfolio evidence.

The alpha implementation uses a more granular, versioned nine-skill taxonomy so recommendations can target specific gaps. Before public beta, these granular skills should roll up into the six learner-facing dimensions above.

Learner-facing stages are **Explorer**, **Integrator**, **System Builder**, and **Production Builder**. Internally, evidence is scored on a 0–4 rubric, but the UI must never imply false precision with a single 0–100 number.

Every assessed finding must provide:

- learner-owned evidence, linked to exact user transcript turns;
- a confidence level;
- the scoring and taxonomy versions;
- contradictions or uncertainty when present;
- an edit or deletion path.

The system must not infer or score accent, emotion, personality, protected traits, employability, or clinical attributes.

## Course and resource strategy

We do not need to own a course library to create value. The initial catalog combines:

- high-quality free courses from multiple providers;
- official technical documentation;
- vendor-neutral safety and engineering references;
- original “evidence sprint” projects that produce a work artifact;
- recurring practices such as output reviews and evaluation logs.

The catalog—not the model—owns titles, canonical URLs, price flags, duration, prerequisites, skill coverage, and quality review. A model may explain why an already-selected resource fits; it may not invent or silently substitute resources.

The strategic wedge is the project prescription. Courses are supporting material. A good plan may recommend one lesson, one build project, and one recurring practice rather than a playlist of five courses.

## Trust contract

- No raw audio is stored by default.
- Microphone access is requested only after an explicit action and is stopped on every exit from voice mode.
- Transcript retention is opt-in and versioned consent is recorded server-side.
- The learner can inspect, edit, export, or delete retained assessment data.
- Canned examples are clearly labeled and are never attributed to the learner.
- Demo data, simulated state, and live state are visibly distinct.
- Live paid API traffic is disabled by default and requires both deployment configuration and explicit spend approval.
- Realtime sessions require authenticated ownership and a persisted assessment session before live mode can be enabled.

## Alpha success criteria

The private alpha is successful when at least 70% of test users can finish without facilitator help, at least 60% say the recommended project fits their goal and constraints, fewer than 10% of reviewed findings are marked materially wrong, and at least 30% return to mark a plan action complete within seven days. These are learning thresholds, not launch forecasts.

## Explicit non-goals for the private alpha

- owning a large video-course library;
- certificates, grades, hiring decisions, or psychometric claims;
- unrestricted model-generated URLs or curricula;
- automatic purchases or paid-course enrollment;
- production voice traffic before auth, persistence, deletion, abuse controls, and a spend ceiling exist;
- broad personalization for every AI learner persona.
