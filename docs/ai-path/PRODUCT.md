# AI Path Advisor

## Product thesis

AI learning fails less from a lack of content than from poor sequencing. People do not know which skill matters for their goal, what they already know, or what credible proof of progress looks like. AI Path Advisor turns a short, evidence-seeking conversation into an editable assessment and a realistic 30-day build plan.

The product is not a quiz, a personality test, or a course marketplace. It is a learning decision system. Voice makes reflection easier; application-owned evidence and recommendation rules keep the result inspectable.

## Initial user

The private alpha is intentionally narrow: working professionals who already use general-purpose AI tools and want to build one reliable work workflow. They may prefer no-code or light code. Later tracks can cover applied-AI engineers, leaders, creators, and career switchers after the assessment model is validated.

## Core promise

In under ten minutes, a learner should leave with:

- a concrete 30-day outcome;
- a reviewed summary of their starting point and constraints;
- evidence-backed skill findings with confidence and unassessed areas;
- one recommended build project and a small set of relevant learning resources;
- a weekly plan sized to their available time;
- a way to return, show evidence, and reassess.

## End-to-end journey

1. **Frame the outcome.** Capture role, desired outcome, time budget, coding comfort, and the usual blocker.
2. **Choose a mode.** Voice is optional. The text path is functionally complete.
3. **Interview adaptively.** Ask one question at a time and seek concrete projects, artifacts, independence, outcomes, failures, evaluation, deployment, and safety practices.
4. **Review the understanding.** The learner edits interpretations and transcript excerpts before they affect the report.
5. **Compute the report.** Versioned application rules turn validated evidence into skill stages and confidence. Missing evidence remains “not assessed,” never zero.
6. **Select a path.** Deterministic ranking chooses from a curated catalog whose links, prerequisites, cost, time, and skill mappings are maintained by the application.
7. **Build and prove.** A 30-day plan centers on one useful artifact, not course completion.
8. **Return and reassess.** Check-ins capture completed work and new evidence; later reports show what changed and why.

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
