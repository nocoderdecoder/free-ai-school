# Principal Engineer Handoff

*From the departing principal engineer, to whoever holds this role next — human or AI.*

This document is everything I would tell you across your first month, written down.
It covers **how to build anything here** (and honestly, anywhere): how to plan, how to
build, how to QA, how to write, and how to extend your own tooling with skills and MCP
servers. The repo-specific facts are at the top; the durable engineering doctrine is
below it. The step-by-step procedures live as executable skills in `.claude/skills/`
— this document explains *why*, the skills explain *how*.

---

## Part 0 — The one-paragraph orientation

This repo is `anshul.ai`: a single Next.js 16 (App Router) application combining a
personal portfolio, an AI School (`/learn`), Claude-powered interactive tools
(`/tools`), and daily auto-generated content (`/trending`, `/deals-events`). Content
lives in Sanity (Studio embedded at `/studio`), auth/data in Supabase, email via
Resend, AI via the Anthropic API, hosting on Vercel. There is **no engineering team**
— the owner builds everything with AI assistance. That constraint shapes every rule
in this document: processes must be executable by one person plus an agent, with no
tribal knowledge and no "ask Bob."

**Read `AGENTS.md` first, always.** This repo runs a Next.js version with breaking
changes vs. what you (if you're an AI) were trained on. The docs shipped inside
`node_modules/next/dist/docs/` are the source of truth, not your memory.

## Part 1 — The map of the repo

| Path | What it is | When you touch it |
|---|---|---|
| `app/` | All routes, components, API routes (App Router) | Any product feature |
| `app/api/tools/` | Server-side Claude API calls for interactive tools | New/changed AI tools |
| `app/api/pdf/[slug]/` + `app/lib/pdf/` | PDF generation via `@react-pdf/renderer` | Downloadable outputs |
| `app/lib/rateLimit.ts` | Rate limiting for API routes | Any new public API route (use it!) |
| `sanity/schemaTypes/` | CMS content schemas | New content types |
| `scripts/` | Standalone Node pipelines (trending, deals, publishing) | Automated content changes |
| `.github/workflows/` | Cron jobs running the pipelines daily | Scheduling/automation changes |
| `portfolio-publisher-mcp/` | Local MCP server: a safe control panel for the Lab page | Extending agent tooling |
| `.claude/skills/` | Executable procedures for planning, building, QA, shipping | Every session |
| `.mcp.json` | Registers project MCP servers | Adding MCP servers |
| `docs/engineering/` | This handoff | Onboarding, doctrine changes |

**Environment variables you must have to run anything real:** Sanity project
ID/dataset/write token, Supabase URL/keys, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`.
The site builds without them; the tools, contact form, and pipelines do not work.

**Daily loop:** `npm run dev` → change → `npm run lint` → `npm run build` → ship via
Vercel (push to `main` deploys). GitHub Actions cron jobs generate content daily; if
they fail, `scripts/notify-failure.mjs` fires. Check Actions history when content
sections look stale.

---

## Part 2 — Doctrine: how to build literally anything

These are the rules I actually used, in priority order. They are stack-agnostic.

### 2.1 The universal loop

Everything — a feature, a bugfix, a pipeline, an MCP tool — goes through the same
five phases. The corresponding skills are in parentheses.

1. **Plan** (`/plan`) — turn a vague desire into a written spec with acceptance
   criteria *before* touching code.
2. **Build** (`/build`) — smallest end-to-end slice first, then widen.
3. **QA** (`/qa`) — verify by *exercising the behavior*, not by rereading the diff.
4. **Ship** (`/ship`) — pre-deploy checklist, deploy, then *verify in production*.
5. **Write** (`/write`) — commit messages, docs, and content that the next person
   (probably you in three months) can actually use.

Skipping a phase is allowed only when you can say out loud *why* it doesn't apply.
"I'm in a hurry" is not a why.

### 2.2 Planning doctrine

- **Write the user-visible sentence first.** Every plan starts with: "After this
  ships, a user can ___." If you can't complete that sentence, you're doing a
  refactor — fine, but then the sentence is "After this ships, the code can ___
  and nothing user-visible changes," and QA is a no-regression check.
- **Acceptance criteria are testable or they are wishes.** "Fast" is a wish.
  "The tools page responds in under 2s on a cold serverless start" is a criterion.
- **Plan the failure modes, not just the happy path.** For every external
  dependency (Sanity, Supabase, Claude API, Resend), the plan must say what happens
  when it's down, slow, or returns garbage. Half of this codebase's real bugs have
  been unhandled AI-output edge cases.
- **Decide reversibility before deciding effort.** Reversible decisions (a component
  API, a copy change) get minutes of thought. Irreversible ones (a Sanity schema
  field, a public URL, a database column, an email sent to subscribers) get a
  written note in the plan: what we chose, what we rejected, why. Schema and URL
  changes are the ones that will still hurt in a year.
- **Cut the plan into slices that each survive alone.** If you get interrupted after
  slice 1, the site must still build and deploy. This is non-negotiable in a
  single-maintainer repo — half-finished work with no team to hand it to is dead work.

### 2.3 Building doctrine

- **Read before you write.** Before editing any file, read it and at least one
  sibling that does the same job (an existing API route before writing a new API
  route, an existing schema before a new schema). Match the local idiom even when
  you'd personally do it differently. Consistency is worth more than your taste.
- **This repo's specific idioms:**
  - New public API routes **must** use `app/lib/rateLimit.ts`. Every Claude-calling
    route is a cost surface; an unprotected one is an open wallet.
  - Claude API calls live server-side only (`app/api/`), never in client components.
  - AI output is untrusted input: validate/parse it defensively before rendering or
    storing it. Assume the model will occasionally return malformed JSON, empty
    strings, or 3× the expected length.
  - Content types belong in Sanity, not hardcoded arrays — *unless* they're
    developer-owned (like the Lab project list), in which case the
    portfolio-publisher MCP is the safe editing path.
  - Tailwind for styling; follow the existing component patterns in `app/components/`.
- **One concern per commit.** A commit is a unit of revert. If reverting your commit
  would take out an unrelated fix, split it.
- **Never let the tree stay red.** `npm run build` must pass at every commit. On
  Vercel, a broken `main` is a broken production deploy pipeline.
- **When stuck for more than ~30 minutes**, stop digging: write down (1) what you
  expected, (2) what happened, (3) the three hypotheses you haven't tested. The act
  of writing usually finds it. If not, reduce to the smallest reproducing case —
  that's the debugging move that always works.

### 2.4 QA doctrine

- **The diff is not the verification.** Reading code you just wrote tells you what
  you *meant*. Run the route. Click the button. Generate the PDF. Send the test
  email. The `/qa` skill lists the concrete checks per surface.
- **Three levels of verification — always state which one you did:**
  1. *Static*: lint + typecheck + build pass.
  2. *Exercised*: you drove the changed flow end-to-end locally and observed the
     right behavior, including one failure case.
  3. *Production-verified*: after deploy, you hit the real URL and confirmed.
  Anything shipped at level 1 only must say so explicitly in the handoff/commit.
- **Test the failure path on purpose.** Unset the API key, feed the tool nonsense
  input, submit the form twice fast. The happy path was going to work anyway —
  that's why you wrote it.
- **Content pipelines get QA'd on output, not code.** For `scripts/*.mjs`, run the
  script against a draft/dry-run target and *read the generated content* like an
  editor: is it true, is it well-written, would the owner be embarrassed by it?
  A pipeline that publishes junk daily is worse than no pipeline.

### 2.5 Shipping doctrine

- **Deploys are cheap; broken production is not.** Push small, push often, verify
  each one. Never batch a week of changes into one deploy.
- **The post-deploy check is part of the deploy.** Visit the changed pages on the
  production URL. For cron/pipeline changes, either trigger the workflow manually
  once (`workflow_dispatch`) or calendar-check the next scheduled run's output.
- **Anything that emails real people or publishes real content gets a dry run
  first.** No exceptions. Resend sends and Sanity publishes are outward-facing and
  effectively irreversible.

### 2.6 Writing doctrine

- **Write for the reader who has zero context.** In this repo that reader is real:
  it's the owner returning after two weeks, or a fresh AI session with no memory.
  Every doc, commit, and comment must survive that reader.
- **Commit messages: what changed and why, in the imperative.** The diff shows the
  how. `feat: rate-limit the GTM playbook route (was an open Claude-spend surface)`
  beats `updated api route`.
- **Docs go where they'll be found**, which means: repo conventions in `AGENTS.md`
  (agents read it automatically), procedures in `.claude/skills/`, narrative and
  rationale in `docs/`. A doc nobody's tooling surfaces is a doc that doesn't exist.
- **Delete stale docs on sight.** A wrong doc is worse than no doc; readers trust it.

### 2.7 Tooling doctrine — skills and MCP servers

This is the part most handoffs skip and the part that compounds the most.

- **The second time you explain a procedure to an agent, turn it into a skill.**
  A skill (`.claude/skills/<name>/SKILL.md`) is a written procedure the agent loads
  on demand. Skills are how a one-person team scales: your judgment, executable by
  your tools. Use `/new-skill` — it contains the format and quality bar.
- **When an agent needs *capabilities* rather than *instructions*, build an MCP
  server.** Skills tell the agent what to do; MCP tools let it do things safely.
  `portfolio-publisher-mcp/` is the house example and the template: it started
  **read-only on an allowlist of paths**, earned trust via a smoke test
  (`npm run smoke`), and only then grew preview/draft tools that still never write
  directly — they produce owner-reviewable patches. Copy that safety ladder for
  every new MCP server: **read → validate → draft/preview → (only if truly needed)
  write with confirmation.** Use `/new-mcp` to scaffold one.
- **Register project MCP servers in `.mcp.json`** so every session gets them
  without setup. Keep them dependency-light (the house server is plain Node, zero
  runtime deps — that's deliberate: nothing to break).
- **Tooling is product.** QA your skills and MCP tools like features: a skill with
  a wrong command, or an MCP tool with a misleading description, actively damages
  every future session that trusts it.

### 2.8 Operating alone with AI — the meta-rules

- **You are the review process.** With no second engineer, the compensating controls
  are: small diffs, the `/qa` skill run honestly, dry runs for outward-facing
  actions, and reversibility bias. Don't waive them because "it's just me."
- **Make the agent state its verification level** (see 2.4) at the end of every
  task. "Done" without a level is not done.
- **Budget awareness:** every Claude-calling surface (tools, pipelines) costs real
  money per request. Rate limits, output caps (`max_tokens`), and cron frequency
  are financial controls, not just performance ones.
- **When in doubt about content or outward-facing behavior, stop and ask the
  owner.** Code is reversible; a published article or a sent email is reputation.

---

## Part 3 — Your first week

1. Run the app locally; click every top-level route. You cannot maintain what you
   haven't seen.
2. Read `AGENTS.md`, then skim the Next.js docs in `node_modules/next/dist/docs/`
   for App Router changes — this version differs from training data and from most
   tutorials.
3. Read one exemplar of each pattern end-to-end: one AI tool route
   (`app/api/tools/...` + its page), one Sanity schema + its rendering page, one
   pipeline script + its workflow file, and `portfolio-publisher-mcp/src/server.mjs`.
4. Run the MCP smoke test: `cd portfolio-publisher-mcp && npm run smoke`.
5. Do one tiny end-to-end change with the full loop — `/plan` → `/build` → `/qa` →
   `/ship` — even if it's a copy fix. The loop matters more than the change.
6. Check the last two weeks of GitHub Actions runs. The content pipelines fail
   quietly from the user's point of view; the Actions tab is where you notice.

Good luck. Keep the tree green, keep the wallet closed, and write everything down.
