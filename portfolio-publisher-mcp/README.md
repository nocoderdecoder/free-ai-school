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
- `list_staged_lab_card_patches`: lists pending staged patch artifacts with their current review status, publish readiness, file paths, and owner next step. It also identifies incomplete `.patch`/Markdown pairs without changing files.
- `validate_staged_lab_card_patch`: checks that a staged patch and handoff exist, contain exactly one Lab card addition targeting `app/lab/page.tsx`, match each other, still match the current projects-array insertion point, and refer to the requested project before manual review or application. It returns a source-bound `reviewToken` for future controlled-apply workflows.
- `apply_staged_lab_card_patch`: applies exactly one publish-ready staged card to `app/lab/page.tsx` after `confirm: true` and an exact, freshly validated `reviewToken`. It uses an exclusive single-writer lock, rechecks the source-bound token while holding that lock, writes atomically, verifies the card after insertion, retains the staged artifacts, and does not commit or publish.
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

Start with `list_staged_lab_card_patches` to see every pending review artifact and prioritize publish-ready items. Before applying one, run `validate_staged_lab_card_patch` with the project name. A `ready` result means the artifact is one exact card-only diff, matches its handoff, and still matches the current insertion context. Review the handoff and diff, then pass that result's token to `apply_staged_lab_card_patch` with `confirm: true`. The apply tool refuses patches that still need route, screenshot, or icon prep. It also returns `apply-locked` rather than competing with another controlled apply; retry after that apply finishes. The `reviewToken` changes when either the patch or current Lab source changes and is checked again under the apply lock; it does not replace human review of the card copy or diff.

When a staged card is obsolete or has already been handled, use `discard_staged_lab_card_patch` with the same project name and `confirm: true`. It requires both generated review files to exist and never edits `app/lab/page.tsx`.

## Why This Exists

The long-term goal is to make the portfolio easier to update every week. Future versions can add controlled tools for creating project briefs, adding Lab cards, checking screenshots, and preparing publish summaries.
