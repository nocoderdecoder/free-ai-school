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
