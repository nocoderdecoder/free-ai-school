# Portfolio Publisher MCP

Portfolio Publisher MCP is a local Model Context Protocol server for inspecting and preparing projects for the `anshul.ai` Lab page.

In plain English: it gives an AI assistant a safe control panel for the portfolio. Instead of editing random files, the assistant can call specific tools such as "list Lab projects" or "check missing screenshots."

## Current Status

This version is mostly read-only. It can inspect the Lab page, validate screenshot paths, and suggest future projects. Its first write-capable tool only stages review artifacts under `portfolio-publisher-mcp/generated/`; it does not edit the Lab page directly.

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
- `validate_staged_lab_card_patch`: checks that a staged patch and handoff exist, target only `app/lab/page.tsx`, still match the current projects-array insertion point, and refer to the requested project before manual review or application.
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

This version only reads approved paths:

- `app/`
- `app/lab/page.tsx`
- `public/`
- `portfolio-publisher-mcp/`

It writes only generated review artifacts under:

- `portfolio-publisher-mcp/generated/`

It refuses blocked paths such as:

- `.env`
- `.git`
- `node_modules`
- `.next`
- `dist`

Future write-capable tools should keep this same approach: narrow tools, explicit file targets, no arbitrary shell commands, no secret access, and owner-reviewable artifacts before source edits.

Before manually applying a staged patch, run `validate_staged_lab_card_patch` with the project name. A `ready` result means the artifact structure and current insertion context are intact; it does not replace human review of the card copy or diff.

## Why This Exists

The long-term goal is to make the portfolio easier to update every week. Future versions can add controlled tools for creating project briefs, adding Lab cards, checking screenshots, and preparing publish summaries.
