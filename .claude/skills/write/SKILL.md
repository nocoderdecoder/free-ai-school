---
name: write
description: Standards for all prose produced in this repo — commit messages, PR descriptions, docs, README sections, and site content (articles, tool copy, generated pipelines). Use when writing or reviewing any documentation or content, or when the user says "write it up", "document this", or "draft the copy".
---

# Write

Everything written here has one real reader: **someone with zero context** —
the owner returning after two weeks, or a fresh AI session with no memory.
Write for that reader every time.

## Commit messages

- Imperative, what + why: `feat: rate-limit GTM playbook route (open Claude-spend surface)`.
- The diff shows *how*; the message earns its keep by recording *why*.
- Prefixes in use here: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- Never: `updates`, `wip`, `fix stuff`. A future `git log --oneline` is the
  repo's only changelog.

## PR descriptions / handoffs

Lead with the outcome ("After this, a user can ___"), then: what changed, how
it was verified (state the L1/L2/L3 level from `/qa`), what's deferred, and any
decision the owner must know about. If a screenshot would save the reader a
checkout, include one.

## Documentation

- **Placement rule — a doc nobody's tooling surfaces doesn't exist:**
  - Repo-wide conventions agents must always follow → `AGENTS.md` (loaded
    automatically every session; keep it short and imperative).
  - Executable procedures → `.claude/skills/<name>/SKILL.md`.
  - Narrative, rationale, onboarding → `docs/`.
  - Setup/run instructions → `README.md`.
- Every doc answers within its first three lines: who is this for, when do
  they need it.
- Prefer one worked example over three paragraphs of abstraction.
- **Delete stale docs on sight.** A wrong doc is worse than none — readers
  trust it. If you touch code a doc describes, updating the doc is part of
  the change, not a follow-up.

## Site content (articles, tool copy, `/learn`, generated pipelines)

- Voice: practical, first-person, plain English. The site's audience is
  non-engineers learning AI — expand jargon on first use or cut it.
- Every claim that could be checked, check. Publishing wrong facts under the
  owner's name is a reputation cost no amount of volume repays.
- Pipeline-generated content (`scripts/*.mjs` prompts) gets edited like human
  content: when changing a generation prompt, generate 2–3 samples and read
  them as an editor before shipping the prompt. The prompt is the writer;
  QA the writer, not just the plumbing.
- Titles and meta descriptions are part of the content — check them; they're
  what search and social actually show.

## Universal rules

- Lead with the conclusion; details after.
- Short sentences. Concrete nouns. Active voice.
- Read it back once as the zero-context reader before calling it done. If any
  sentence needs the conversation you just had to make sense, rewrite it.
