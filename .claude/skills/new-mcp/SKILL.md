---
name: new-mcp
description: Build a new local MCP server (or extend portfolio-publisher-mcp) following the house safety ladder — read-only first, allowlisted paths, smoke-tested, preview-not-write. Use when an agent needs new capabilities (not just instructions), or when the user says "add an MCP tool", "build an MCP server", or "give Claude access to X".
---

# Build an MCP server / tool

Skills give agents *instructions*; MCP servers give them *capabilities*. Build
one when the agent needs to repeatedly inspect or act on something that raw
file edits make risky. The house exemplar is `portfolio-publisher-mcp/` —
read its `src/server.mjs` and one file in `src/tools/` before writing anything.

## The safety ladder (non-negotiable)

Every server climbs these rungs in order, shipping and testing each before the
next:

1. **Read** — tools that list/inspect, restricted to an explicit allowlist of
   paths. No writes anywhere.
2. **Validate** — tools that check invariants and report problems (missing
   assets, broken routes, format drift).
3. **Draft / preview** — tools that produce *owner-reviewable output*: a
   Markdown patch preview, a copy-pasteable snippet, a checklist. Still no
   direct writes.
4. **Write** — only if genuinely needed, only with explicit confirmation
   inputs, and never to paths outside the allowlist.

`portfolio-publisher-mcp` deliberately stopped at rung 3. That was the right
call; treat rung 4 as exceptional.

## Extending the existing server (the common case)

1. Add a tool module under `portfolio-publisher-mcp/src/tools/`, following the
   shape of an existing tool (name, description, input schema, handler).
2. Register it in `src/server.mjs` alongside the others.
3. **The description is the API.** Agents choose tools by description alone —
   state what it does, what it returns, and what it does NOT do. A misleading
   description is a bug that damages every future session.
4. Add coverage to `scripts/smoke-test.mjs`, then run:
   ```bash
   cd portfolio-publisher-mcp && npm run smoke
   ```
5. Exercise the tool once for real from a Claude session before calling it done.
6. Document the tool in `portfolio-publisher-mcp/README.md`'s tool list.

## Creating a brand-new server

1. Copy the structure of `portfolio-publisher-mcp/`: plain Node ≥20, ESM,
   stdio JSON-RPC, **zero runtime dependencies** (deliberate — nothing to
   break, nothing to audit).
2. `package.json` with `start` (the server) and `smoke` (the test) scripts.
3. Hardcode the path allowlist in one obvious place; every file access goes
   through it.
4. Write the README *first*: status (read-only?), tool list, safety model,
   how to run. The README's safety-model section is the contract.
5. Register it in the project `.mcp.json` so every session gets it:
   ```json
   { "mcpServers": { "<name>": { "command": "node", "args": ["<path>/src/server.mjs"] } } }
   ```

## QA an MCP change

- [ ] `npm run smoke` green.
- [ ] One real invocation of each new/changed tool from an agent session.
- [ ] Tool descriptions read accurately by someone who can't see the code.
- [ ] Nothing reads or writes outside the allowlist (grep the handlers for
      path construction).
- [ ] README tool list updated.

## When NOT to build an MCP tool

- One-off task → just do it with normal tools.
- The need is knowledge, not capability → write a skill (`/new-skill`).
- The action is outward-facing (publish, email, deploy) → that stays with the
  owner or behind rung-3 previews; don't automate it away.
