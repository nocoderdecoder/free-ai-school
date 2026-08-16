# Portfolio Publisher MCP

Portfolio Publisher MCP is a local Model Context Protocol server for inspecting and preparing projects for the `anshul.ai` Lab page.

In plain English: it gives an AI assistant a safe control panel for the portfolio. Instead of editing random files, the assistant can call specific tools such as "list Lab projects" or "check missing screenshots."

## Current Status

This version is mostly read-only. It can inspect the Lab page, validate screenshot paths, and suggest future projects. It can stage review artifacts under `portfolio-publisher-mcp/generated/` and apply one publish-ready staged card through a confirmation-and-token-gated tool.

## Tools

- `list_lab_projects`: lists the projects currently shown on `/lab`.
- `inspect_lab_format`: explains the current Lab card format and conventions.
- `validate_lab_assets`: checks whether screenshot paths point to real files.
- `validate_lab_routes`: checks local Lab project routes without contacting external URLs.
- `list_screenshot_queue`: lists projects that need screenshots, capture targets, suggested image paths, and blockers.
- `create_screenshot_capture_plan`: creates an owner-friendly Markdown checklist for missing Lab screenshots, grouped by ready and blocked captures.
- `draft_lab_project_card`: creates a read-only Lab card draft with a slug, suggested screenshot path, route, icon component, and copy-pasteable project object.
- `create_lab_card_patch_preview`: creates an owner-reviewable Markdown patch preview for adding one Lab card, including the object snippet, icon requirement, files to prepare, warnings, and verification command.
- `create_lab_card_patch_artifact`: creates a structured, read-only patch artifact with a unified diff, icon requirement, files to prepare, warnings, and verification command.
- `validate_lab_card_patch_artifact`: creates and validates a structured, read-only Lab card patch artifact against current Lab projects, optional icon input, icon/import requirements, route files, and screenshot files.
- `stage_lab_card_patch_artifact`: writes a validated Lab card patch handoff and `.patch` file into `portfolio-publisher-mcp/generated/` for owner review. It refuses blocked patches and requires `allowNeedsPrep: true` before staging patches that still need route, screenshot, or icon prep.
- `list_staged_lab_card_patches`: lists pending staged patch artifacts with their current review status, machine-readable stale/invalid/incomplete reason codes, live route/screenshot/icon readiness, file paths, and owner next step. Optional exact-match `status`, `reason`, and `publishReadyAfterApply` filters combine with AND semantics so owner tooling can request one recovery or publish queue. Optional `limit` and slug `cursor` arguments page the filtered queue deterministically without changing aggregate counts. It recomputes readiness from current local files, keeps the handoff's historical readiness as a separate field, and identifies incomplete `.patch`/Markdown pairs without changing files.
- `create_staged_lab_card_review_report`: renders the same filtered and optionally paginated staged queue as an owner-friendly Markdown brief. It includes aggregate/page context, artifact paths, blockers, issues, and next steps without changing files or returning controlled-apply review tokens.
- `select_next_staged_lab_card_publish`: deterministically selects the first currently publish-ready staged card and returns its safe inventory record plus a live read-only rehearsal. It reports the publish-ready queue size, never changes files, and never issues a controlled-apply review token.
- `create_next_staged_lab_card_publish_packet`: turns that same deterministic selection into a copy-ready Markdown packet for a non-technical owner. It combines card copy, live readiness, exact files to review, an approval checklist, the safe apply sequence, and verification guidance without changing files or exposing controlled-apply authorization.
- `validate_staged_lab_card_patch`: checks that a staged patch and handoff exist, contain exactly one Lab card addition targeting `app/lab/page.tsx`, match each other, still match the current projects-array insertion point, and refer to the requested project before manual review or application. It returns a source-bound `reviewToken` for future controlled-apply workflows plus `staleReason` (`source-drift` or `already-applied`) and `invalidReason` (`artifact-integrity` or `invalid-project-name`) when applicable.
- `rehearse_staged_lab_card_publish`: produces a read-only, one-project go/no-go rehearsal using the current staged pair plus live local route, screenshot, and icon import/export checks. It never issues an apply token or changes files; a ready rehearsal tells the owner the exact validate, review, controlled-apply, smoke-test, and diff-review sequence.
- `apply_staged_lab_card_patch`: applies exactly one publish-ready staged card to `app/lab/page.tsx` after `confirm: true` and an exact, freshly validated `reviewToken`. It uses an exclusive single-writer lock, rechecks the source-bound token and live route/screenshot/icon readiness while holding that lock, writes atomically, verifies the card after insertion, retains the staged artifacts, and does not commit or publish. Companion prep may be completed after staging; controlled apply uses current files rather than the handoff's historical readiness line.
- `discard_staged_lab_card_patch`: deletes one project's exact staged `.patch` and Markdown handoff pair after `confirm: true`, without changing portfolio source files.
- `inspect_lab_thumbnail_icons`: checks Lab card icon usage against Lab page imports and `LabThumbnails.tsx` exports.
- `create_lab_thumbnail_icon_report`: creates an owner-friendly Markdown report for Lab thumbnail icon coverage, missing prep, and cleanup candidates.
- `publish_readiness_check`: checks whether Lab projects have the basics needed for publishing (supports exact name, slug, or partial match via `projectName`).
- `publish_readiness_report`: returns a human-readable Markdown publish-readiness report (supports exact name, slug, or partial match via `projectName`).
- `create_publish_handoff`: creates a copy-pasteable Markdown handoff with readiness status, screenshot tasks, and owner next actions.
- `create_project_publish_brief`: creates a concise one-project Markdown brief with Lab card copy, blockers, files to check, and next actions. If `projectName` is omitted, it uses the current top-priority project.
- `create_lab_publish_digest`: creates a short Markdown digest of the current Lab inventory, readiness totals, route coverage, screenshot coverage, and next owner action.
- `audit_lab_card_copy`: reviews Lab card names, taglines, statuses, image path conventions, route slugs, and duplicate slugs.
- `create_lab_copy_audit_report`: creates an owner-friendly Markdown report from the Lab card copy audit.
- `prioritize_publish_tasks`: ranks Lab projects by the next practical publishing task, including blockers, screenshot targets, and owner-facing actions.
- `suggest_next_lab_project`: suggests technically distinct future Lab projects.

## Run Locally

From this folder:

```bash
npm run smoke
```

The smoke command first runs focused lifecycle tests against disposable miniature repositories, then runs a non-mutating MCP protocol, schema, and readiness suite against the real local project. The disposable fixtures own staged tamper, lock contention, review-token mismatch, apply/replay, rehearsal, and discard safety coverage, so smoke verification never edits the real Lab source or creates real lock and screenshot fixtures.

To start the MCP server:

```bash
npm run start
```

The server communicates over stdio using JSON-RPC MCP messages.

## Safety Model

This version reads only approved paths:

- `app/`
- `app/lab/page.tsx`
- `public/`
- `portfolio-publisher-mcp/`

It writes generated review artifacts under:

- `portfolio-publisher-mcp/generated/`

The controlled apply tool may also write exactly:

- `app/lab/page.tsx`

It refuses blocked paths such as:

- `.env`
- `.git`
- `node_modules`
- `.next`
- `dist`

Write-capable tools keep this same approach: narrow tools, explicit file targets, no arbitrary shell commands, no secret access, and owner-reviewable artifacts before source edits.

Start with `list_staged_lab_card_patches` to see every pending review artifact and prioritize items that are publish-ready under current local route, screenshot, and icon checks. Its `publishReadyAfterApply` value is live; `handoffPublishReadyAfterApply` preserves what the staged handoff said when it was created. Run `rehearse_staged_lab_card_publish` for the selected project to inspect the same current readiness without changing files or issuing a token. Complete any companion prep without restaging the unchanged card, then rehearse again. When the rehearsal is ready, run `validate_staged_lab_card_patch` with the project name. A `ready` result means the artifact is one exact card-only diff, matches its handoff, and still matches the current insertion context. Review the handoff and diff, then pass that fresh result's token to `apply_staged_lab_card_patch` with `confirm: true`. The apply tool recomputes live route, screenshot, and icon readiness while holding its single-writer lock and refuses any current blocker, even when the staged handoff once said it was publish ready. It also returns `apply-locked` rather than competing with another controlled apply; retry after that apply finishes. The `reviewToken` changes when either the patch or current Lab source changes and is checked again under the apply lock; it does not replace human review of the card copy or diff.

Automation should branch on the staged status and reason fields instead of parsing human-readable issue text. `staleReason` distinguishes `source-drift` from `already-applied`; `invalidReason` distinguishes general `artifact-integrity` failures from an inventory handoff with a `missing-handoff-title`; and `incompleteReason` identifies `missing-patch` or `missing-handoff`. Non-applicable reason fields are `null`. Pass `status` (`ready`, `stale`, `invalid`, or `incomplete`), any documented reason code, `publishReadyAfterApply` (`true` for the live publish queue or `false` for blockers), or a combination to request an exact queue; combined filters use AND semantics and invalid values are rejected. Pass `limit` from 1 to 100 to cap returned `items`, and pass the previous response's `pagination.nextCursor` as `cursor` to continue after that slug in deterministic order. `totalChecked` reports the complete staged inventory inspected before filtering; `checked`, scalar counts, and zero-filled grouped `reasonCounts` describe the full filtered queue before pagination; `returned`, `pagination`, and `items` describe the current page. A missing `limit` preserves the historical behavior of returning all filtered items.

For owner review outside raw JSON, call `create_staged_lab_card_review_report` with the same `status`, `reason`, `publishReadyAfterApply`, `limit`, and `cursor` arguments. The response keeps machine-readable filter and pagination metadata next to a copy-ready `markdown` brief; use `pagination.nextCursor` to render the next page. The report is read-only and deliberately omits controlled-apply review tokens.

For the shortest safe weekly workflow, call `select_next_staged_lab_card_publish`. It uses the same deterministic slug ordering and live readiness checks to choose one card, then embeds `rehearse_staged_lab_card_publish` guidance for that selection. An `empty` result means no staged card currently passes both staged validation and live route, screenshot, and icon checks; inspect the inventory rather than applying anything. A `ready` result is still a review handoff, not approval to write: review its files and follow the rehearsal sequence to obtain a fresh token through `validate_staged_lab_card_patch` before controlled apply.

When the owner needs a review document instead of raw selection JSON, call `create_next_staged_lab_card_publish_packet`. Its Markdown selects the same first publish-ready card and lays out the staged patch and handoff, Lab destination, route, screenshot, icon definition, card copy, readiness, approval checklist, controlled-apply sequence, and smoke command. An empty packet explains that readiness or recovery work must happen first. The packet is strictly read-only and deliberately omits controlled-apply authorization; validate only after the owner approves the reviewed files.

When a staged card is obsolete or has already been handled, use `discard_staged_lab_card_patch` with the same project name and `confirm: true`. It requires both generated review files to exist and never edits `app/lab/page.tsx`.

## Why This Exists

The long-term goal is to make the portfolio easier to update every week. Future versions can add controlled tools for creating project briefs, adding Lab cards, checking screenshots, and preparing publish summaries.
