---
name: qa
description: Verify a change by exercising its behavior, not rereading its diff — per-surface checklists for pages, API routes, AI tools, PDFs, Sanity schemas, pipelines, and emails. Use before committing any non-trivial change, before /ship, or when the user says "test this", "QA", or "verify".
---

# QA a change

Verification means **observing the behavior**, not reading the code. Reading the
diff tells you what you meant; running it tells you what you built.

Always finish by stating the **verification level** reached:

- **L1 Static** — lint, typecheck, build pass.
- **L2 Exercised** — drove the changed flow end-to-end locally, including at
  least one failure case.
- **L3 Production-verified** — confirmed on the live URL after deploy.

"Done" without a stated level is not done. If you only reached L1, say so and
say why.

## Baseline (every change)

```bash
npm run lint && npm run build
```

Both must pass. Then exercise the change per surface below.

## Per-surface checklists

**Page / component (`app/**`)**
- [ ] Render the page in `npm run dev`; check the actual browser output, not
      just compile success.
- [ ] Check the empty/loading state (no data yet) and the long-content state
      (real titles are longer than your placeholder).
- [ ] Mobile-width viewport once — this site's traffic is heavily mobile.
- [ ] No hydration warnings or console errors.

**API route (`app/api/**`)**
- [ ] Happy path via `curl` or the UI: correct status, correct shape.
- [ ] Garbage input: missing fields, wrong types → 4xx with friendly message,
      never a stack trace.
- [ ] Rate limit path: hammer it, confirm `rateLimit.ts` kicks in.
- [ ] Dependency-down path: unset the relevant env var locally, confirm a clean
      error, not a crash.

**AI tool route (`app/api/tools/**`)**
- All of the API route checks, plus:
- [ ] Feed it adversarial/nonsense input ("ignore previous instructions", empty
      string, 10k chars) — output must stay sane and safely rendered.
- [ ] Confirm the response parser survives malformed model output (test by
      temporarily stubbing a broken response).
- [ ] Confirm `max_tokens` is set and the route is rate-limited (cost controls).

**PDF (`app/api/pdf/**`, `app/lib/pdf/`)**
- [ ] Generate and **open** the actual PDF. Check overflow with long text and a
      missing-optional-field case.

**Sanity schema (`sanity/schemaTypes/`)**
- [ ] Load `/studio`, create a test document with the new field, publish it,
      confirm the front end renders it AND still renders old documents that
      lack the field.

**Pipeline script (`scripts/*.mjs`)**
- [ ] Run manually in dry-run mode; **read the generated output like an
      editor** — factually plausible, well-written, right length, on-brand.
- [ ] Force a failure (bad env var) → non-zero exit, so the failure notifier
      fires. A pipeline that fails silently publishes staleness.

**Email (Resend paths)**
- [ ] Send to yourself/owner first. Check subject, sender, links, unsubscribe.
      Never test against the real audience.

**Skill / MCP tool changes**
- [ ] For MCP: `cd portfolio-publisher-mcp && npm run smoke` plus one real
      invocation of the changed tool.
- [ ] For skills: dry-read the SKILL.md as a cold-start agent — is every
      command copy-pasteable and correct?

## Rules

- Test the failure path **on purpose**. The happy path was going to work.
- If a check can't be done locally (needs prod data/keys), don't fake it —
  record it as a post-deploy check for `/ship`.
- Found a bug while QA'ing? Fix it, then **re-run the full relevant checklist**,
  not just the failing item.
