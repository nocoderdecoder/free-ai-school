---
name: new-skill
description: Create a new Claude Code skill in .claude/skills/ — format, quality bar, and QA for skills. Use when a procedure has been explained twice and should become executable knowledge, or when the user says "make this a skill" or "add a skill for X".
---

# Create a new skill

A skill is a written procedure an agent loads on demand — your judgment, made
executable by every future session. **The trigger for writing one: the second
time a procedure gets explained in chat, it becomes a skill.**

## Format

Create `.claude/skills/<kebab-name>/SKILL.md`:

```markdown
---
name: <kebab-name>
description: <what it does + WHEN to use it, including trigger phrases. This is
  the only part the agent sees before deciding to load the skill — make the
  "use when" explicit and concrete.>
---

# <Title>

<One paragraph: what this procedure produces and the standard it must meet.>

## Procedure
<Numbered steps. Every command copy-pasteable. Every file path real.>

## Rules
<The judgment calls: what's non-negotiable, common mistakes, when NOT to
apply this skill.>
```

Supporting files (templates, example outputs, reference docs) can sit next to
SKILL.md in the same folder and be referenced by relative path.

## Quality bar

- **The description is the trigger.** A skill with a vague description never
  fires. Include the situations and the literal phrases a user might say.
- **Cold-start test:** a fresh session with zero conversation context must be
  able to execute it. No "as discussed", no unexplained shorthand.
- **Commands over prose.** `npm run smoke` beats "run the smoke test".
- **Include the failure judgment**, not just happy-path steps: when to stop,
  what not to do, what needs owner approval.
- **One skill, one procedure.** If the SKILL.md needs section headers for two
  unrelated workflows, it's two skills.
- Keep it under ~150 lines. Skills are loaded into context; bloat taxes every
  future invocation. Long reference material goes in a sibling file, linked.

## QA a skill (before committing)

1. Re-read it as a cold-start agent: is anything ambiguous or context-dependent?
2. Run every command in it verbatim; fix any that fail or prompt unexpectedly.
3. Check it doesn't contradict `AGENTS.md` or an existing skill — if it
   overlaps one, merge or explicitly cross-reference instead of forking the
   procedure.
4. Commit with a message saying what recurring situation this skill captures.

## Maintenance

Skills rot like docs. When a skill gives a wrong instruction in a session,
fixing the skill **is part of that session's task** — never just work around it.
