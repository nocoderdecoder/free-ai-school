# Portfolio Publisher MCP

Portfolio Publisher MCP is a local Model Context Protocol server for inspecting and preparing projects for the `anshul.ai` Lab page.

In plain English: it gives an AI assistant a safe control panel for the portfolio. Instead of editing random files, the assistant can call specific tools such as "list Lab projects" or "check missing screenshots."

## Current Status

This first version is intentionally read-only. It can inspect the Lab page, validate screenshot paths, and suggest future projects. Write tools will come after the read-only foundation is tested.

## Tools

- `list_lab_projects`: lists the projects currently shown on `/lab`.
- `inspect_lab_format`: explains the current Lab card format and conventions.
- `validate_lab_assets`: checks whether screenshot paths point to real files.
- `publish_readiness_check`: checks whether Lab projects have the basics needed for publishing.
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

- `app/lab/page.tsx`
- `public/`
- `portfolio-publisher-mcp/`

It refuses blocked paths such as:

- `.env`
- `.git`
- `node_modules`
- `.next`
- `dist`

The first write-capable version should keep this same approach: narrow tools, explicit file targets, no arbitrary shell commands, and no secret access.

## Why This Exists

The long-term goal is to make the portfolio easier to update every week. Future versions can add controlled tools for creating project briefs, adding Lab cards, checking screenshots, and preparing publish summaries.
