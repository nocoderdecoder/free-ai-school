<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# How to work in this repo

Full doctrine and repo map: `docs/engineering/HANDOFF.md`. The workflow is five
skills, in order: `/plan` → `/build` → `/qa` → `/ship` → `/write`. Meta-tooling:
`/new-skill` (capture a procedure), `/new-mcp` (add agent capabilities). The
`portfolio-publisher` MCP server (registered in `.mcp.json`) is the safe way to
inspect and draft changes to the Lab page.

Non-negotiables, always in effect:

- Every new public API route uses `app/lib/rateLimit.ts`; Claude API calls are
  server-side only. Unprotected AI routes are an open wallet.
- Treat AI/model output as untrusted input; parse defensively, set `max_tokens`.
- `npm run lint && npm run build` must pass before every commit.
- Anything outward-facing (emails, publishing content, schema changes to live
  documents, removing public URLs) gets a dry run and owner approval first.
- End every task by stating the verification level reached: L1 static /
  L2 exercised / L3 production-verified (defined in `/qa`).
