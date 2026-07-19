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
    name: "create_screenshot_capture_plan",
    title: "Create Screenshot Capture Plan",
    description:
      "Create an owner-friendly Markdown checklist for capturing missing Lab screenshots, grouped by ready and blocked items.",
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
        icon: {
          type: "string",
          description: "Optional Lab thumbnail component name. Defaults to <ProjectName>Icon.",
        },
      },
      required: ["name", "tagline"],
      additionalProperties: false,
    },
  },
  {
    name: "create_lab_card_patch_preview",
    title: "Create Lab Card Patch Preview",
    description:
      "Create an owner-reviewable Markdown patch preview for adding one Lab project card without editing files.",
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
        icon: {
          type: "string",
          description: "Optional Lab thumbnail component name. Defaults to <ProjectName>Icon.",
        },
      },
      required: ["name", "tagline"],
      additionalProperties: false,
    },
  },
  {
    name: "create_lab_card_patch_artifact",
    title: "Create Lab Card Patch Artifact",
    description:
      "Create a structured, read-only patch artifact with a unified diff for adding one Lab project card.",
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
        icon: {
          type: "string",
          description: "Optional Lab thumbnail component name. Defaults to <ProjectName>Icon.",
        },
      },
      required: ["name", "tagline"],
      additionalProperties: false,
    },
  },
  {
    name: "validate_lab_card_patch_artifact",
    title: "Validate Lab Card Patch Artifact",
    description:
      "Create and validate a read-only Lab card patch artifact against current Lab projects, routes, and screenshot files.",
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
        icon: {
          type: "string",
          description: "Optional Lab thumbnail component name. Defaults to <ProjectName>Icon.",
        },
      },
      required: ["name", "tagline"],
      additionalProperties: false,
    },
  },
  {
    name: "stage_lab_card_patch_artifact",
    title: "Stage Lab Card Patch Artifact",
    description:
      "Write a validated Lab card patch handoff and .patch file into portfolio-publisher-mcp/generated for owner review.",
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
        icon: {
          type: "string",
          description: "Optional Lab thumbnail component name. Defaults to <ProjectName>Icon.",
        },
        allowNeedsPrep: {
          type: "boolean",
          description:
            "When true, stage a patch that is safe to apply but still needs route, screenshot, or icon prep before publishing.",
        },
      },
      required: ["name", "tagline"],
      additionalProperties: false,
    },
  },
  {
    name: "list_staged_lab_card_patches",
    title: "List Staged Lab Card Patches",
    description:
      "List staged Lab card patch artifacts, including review status, publish readiness, and incomplete file pairs.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "validate_staged_lab_card_patch",
    title: "Validate Staged Lab Card Patch",
    description:
      "Validate staged Lab card patch and handoff files before manual review or application.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Project name used when the Lab card patch was staged.",
        },
      },
      required: ["projectName"],
      additionalProperties: false,
    },
  },
  {
    name: "apply_staged_lab_card_patch",
    title: "Apply Staged Lab Card Patch",
    description:
      "Apply one publish-ready staged Lab card after explicit confirmation and source-bound review-token validation.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Project name used when the Lab card patch was staged.",
        },
        reviewToken: {
          type: "string",
          description: "Exact review token returned by validate_staged_lab_card_patch.",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to authorize the single Lab page write.",
        },
      },
      required: ["projectName", "reviewToken", "confirm"],
      additionalProperties: false,
    },
  },
  {
    name: "discard_staged_lab_card_patch",
    title: "Discard Staged Lab Card Patch",
    description:
      "Delete one project's staged Lab card patch and handoff after explicit confirmation, without changing portfolio source files.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Project name used when the Lab card patch was staged.",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to delete the exact staged patch and handoff pair.",
        },
      },
      required: ["projectName", "confirm"],
      additionalProperties: false,
    },
  },
  {
    name: "inspect_lab_thumbnail_icons",
    title: "Inspect Lab Thumbnail Icons",
    description:
      "Inspect Lab card icon usage against Lab page imports and LabThumbnails exports.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "create_lab_thumbnail_icon_report",
    title: "Create Lab Thumbnail Icon Report",
    description:
      "Create an owner-friendly Markdown report for Lab thumbnail icon coverage and cleanup.",
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
    name: "create_lab_copy_audit_report",
    title: "Create Lab Copy Audit Report",
    description:
      "Create a Markdown report from the Lab card copy audit with owner-friendly issue, warning, and next-action sections.",
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
