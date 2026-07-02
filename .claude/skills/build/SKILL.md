---
name: build
description: House rules for writing code in this repo — idioms, commit discipline, and the build loop. Use when implementing any planned work, adding API routes, components, Sanity schemas, or pipeline scripts, or when the user says "build", "implement", or "code it up".
---

# Build

Implement work slice-by-slice per the plan (run `/plan` first if there isn't one).
Every slice ends with a green `npm run build` and a commit.

## The loop (per slice)

1. **Read before writing.** Open the file you're changing and one sibling doing
   the same job. Match the local idiom — naming, error style, comment density —
   even where you'd choose differently.
2. **Implement the smallest end-to-end version** of the slice. Hardcode what you
   must; replace hardcoding in later slices, never in the same one as new logic.
3. **Verify as you go:** `npm run lint` and `npm run build` before every commit.
   For UI work, look at the page in `npm run dev` — do not commit UI you have
   never rendered.
4. **Commit one concern.** Imperative message: what + why. If reverting the
   commit would take out an unrelated change, split it.

## House idioms (non-negotiable)

- **Next.js**: this repo runs a version with breaking changes vs. training data.
  Consult `node_modules/next/dist/docs/` for any App Router / API question.
  Heed deprecation notices. Never pattern-match from memory or old tutorials.
- **Every new public API route uses `app/lib/rateLimit.ts`.** Claude-calling
  routes are a cost surface; an unprotected route is an open wallet.
- **Claude API calls are server-side only** (`app/api/`), never in client
  components. `ANTHROPIC_API_KEY` must never reach the client bundle.
- **Treat AI output as untrusted input.** Parse defensively: expect malformed
  JSON, empty strings, over-long output. Set `max_tokens` deliberately (cost
  control). Fail to a friendly user-facing error, never a raw stack.
- **Content lives in Sanity** (`sanity/schemaTypes/`), not hardcoded arrays —
  except developer-owned data like the Lab list, where the portfolio-publisher
  MCP tools are the safe editing path (they generate reviewable patches).
- **Styling is Tailwind**, following existing patterns in `app/components/`.
  No new styling systems.
- **Secrets** come from env vars only. Grep your diff for anything that looks
  like a key before committing.
- **Pipelines** (`scripts/*.mjs`) are standalone Node, run by GitHub Actions
  cron. They must be runnable manually with plain `node scripts/<name>.mjs`,
  fail loudly (non-zero exit) so `notify-failure.mjs` fires, and support a
  dry-run path when they publish or send anything.

## When stuck (>30 min on one problem)

Stop digging. Write down: expected behavior, actual behavior, three untested
hypotheses. Then reduce to the smallest reproducing case — a scratch route, a
10-line script in the scratchpad. If it's a framework behavior question, the
answer is in `node_modules/next/dist/docs/`, not in guessing.

## Definition of done for a slice

- [ ] Lint + build green
- [ ] Behavior exercised at least once (see `/qa` for the full pass)
- [ ] Committed with a what+why message
- [ ] No TODOs without an issue/spec reference; no commented-out code
- [ ] New env vars documented in README's environment section
