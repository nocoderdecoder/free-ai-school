export const tools = [
  {
    name: "list_lab_projects",
    title: "List Lab Projects",
    description: "Read the portfolio Lab page and return the projects currently shown there.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "inspect_lab_format",
    title: "Inspect Lab Format",
    description: "Explain the current Lab page format, required project fields, and publishing conventions.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "validate_lab_assets",
    title: "Validate Lab Assets",
    description: "Check whether Lab project screenshot paths point to real files in public/.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "validate_lab_routes",
    title: "Validate Lab Routes",
    description:
      "Check local Lab project routes without contacting external URLs, including missing route files and blank URLs.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "list_screenshot_queue",
    title: "List Screenshot Queue",
    description:
      "List Lab projects that need a screenshot, including capture targets, suggested image paths, and blockers.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "draft_lab_project_card",
    title: "Draft Lab Project Card",
    description:
      "Create a read-only Lab card draft with a slug, suggested screenshot path, and copy-pasteable project object.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Project name as it should appear on the Lab page.",
        },
        tagline: {
          type: "string",
          description: "Short one-line project description.",
        },
        url: {
          type: "string",
          description: "Optional external URL or local route. Defaults to /tools/<slug>.",
        },
        status: {
          type: "string",
          description: "Optional Lab status. Defaults to Built.",
        },
        image: {
          type: "string",
          description: "Optional screenshot path. Defaults to /projects/<slug>.png.",
        },
      },
      required: ["name", "tagline"],
      additionalProperties: false,
    },
  },
  {
    name: "publish_readiness_check",
    title: "Publish Readiness Check",
    description: "Check whether a project has the basics needed before it is published to the Lab.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Optional project name to check. If omitted, all Lab projects are checked.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "publish_readiness_report",
    title: "Publish Readiness Report",
    description:
      "Return a Markdown report that summarizes publish blockers and screenshot readiness (human-readable).",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Optional project name to report on. If omitted, all Lab projects are included.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_publish_handoff",
    title: "Create Publish Handoff",
    description:
      "Create a copy-pasteable Markdown handoff with readiness status, screenshot tasks, and owner next actions.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Optional project name to include. If omitted, all Lab projects are included.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_project_publish_brief",
    title: "Create Project Publish Brief",
    description:
      "Create a concise one-project Markdown brief with Lab card copy, readiness blockers, files to check, and next actions.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description:
            "Optional project name, slug, or partial name. If omitted, the current top-priority project is used.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_lab_publish_digest",
    title: "Create Lab Publish Digest",
    description:
      "Create a short Markdown digest of the current Lab inventory, readiness totals, route coverage, screenshot coverage, and next owner action.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "audit_lab_card_copy",
    title: "Audit Lab Card Copy",
    description:
      "Review Lab project card copy and conventions, including names, taglines, statuses, image paths, route slugs, and duplicate slugs.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "prioritize_publish_tasks",
    title: "Prioritize Publish Tasks",
    description:
      "Rank Lab projects by the next practical publishing task, with blockers, screenshot targets, and owner-facing actions.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "suggest_next_lab_project",
    title: "Suggest Next Lab Project",
    description: "Suggest technically distinct future Lab projects based on what already exists.",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of ideas to return. Defaults to 5.",
        },
      },
      additionalProperties: false,
    },
  },
];
