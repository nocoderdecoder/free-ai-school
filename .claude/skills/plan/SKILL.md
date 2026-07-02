---
name: plan
description: Turn a vague feature idea or bug report into a written, sliceable spec with acceptance criteria before any code is written. Use when starting any non-trivial task, when the user says "plan", "spec", "design", or "how should we build", or before touching Sanity schemas, public URLs, database columns, or anything else irreversible.
---

# Plan a piece of work

Produce a short written spec **before writing code**. Output the spec in the
conversation (or `docs/engineering/specs/<slug>.md` if the user wants it kept).
A good spec fits on one screen; if it doesn't, the task needs splitting.

## Procedure

1. **Write the user-visible sentence.**
   "After this ships, a user can ___." For refactors: "…the code can ___ and
   nothing user-visible changes." If you cannot complete the sentence, stop and
   ask the user what outcome they actually want.

2. **Locate the change in the codebase.**
   Read the files you expect to touch AND one existing sibling that does the same
   job (existing API route, schema, script, component). List file paths in the
   spec. If the area is unfamiliar, explore first — never plan against imagined
   code. In this repo, check `AGENTS.md` + `node_modules/next/dist/docs/` before
   planning anything touching Next.js APIs.

3. **Write acceptance criteria — each one testable.**
   3–7 bullets. Each must be checkable by a command, a click, or an observable
   output. Rewrite any criterion containing "fast", "clean", "better", or "works
   well" into a measurable form.

4. **Plan the failure modes.**
   For every external dependency in the plan (Sanity, Supabase, Claude API,
   Resend, third-party API), write one line: what the user sees when it is down,
   slow, or returns garbage. Claude API responses are untrusted input — plan the
   malformed-output path explicitly.

5. **Flag irreversible decisions.**
   Anything creating a public URL, a Sanity schema field, a DB column, a sent
   email, or a published piece of content gets a 3-line decision record: chosen /
   rejected / why. Present these to the user before building — these are the
   decisions they must own.

6. **Slice it.**
   Break the work into slices where **each slice leaves `npm run build` green and
   the site deployable**. Slice 1 is the smallest end-to-end path (skeleton route
   → hardcoded data → real data → polish), not a layer (all the backend, then all
   the frontend). Order slices so an interruption after any one of them strands
   nothing.

7. **State the QA plan in one line per slice.**
   Which verification level (static / exercised / production-verified — see
   `docs/engineering/HANDOFF.md` §2.4) and what specifically will be exercised.

## Spec template

```markdown
## <Title>
**Outcome:** After this ships, a user can ___.
**Files:** <paths, from actual exploration>
**Acceptance criteria:**
- [ ] <testable>
**Failure modes:** <dependency → user-visible behavior>
**Irreversible decisions:** <chosen / rejected / why — or "none">
**Slices:** 1. <smallest e2e> 2. … (each leaves build green)
**QA per slice:** <level + what gets exercised>
```

## Rules

- No code in the planning phase. Reading code: yes. Writing: no.
- A plan with zero rejected alternatives usually means you considered one option.
  Consider a second, even if only to reject it in one line.
- If the task is trivial (typo, copy tweak), say so and skip to `/build` — but
  say it out loud; that's the audit trail.
