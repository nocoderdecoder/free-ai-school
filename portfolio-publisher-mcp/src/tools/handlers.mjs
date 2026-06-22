import { listLabProjects, getProjectAssetStatus } from "../lib/labParser.mjs";
import { paths } from "../lib/paths.mjs";
import { tools as toolDefinitions } from "./definitions.mjs";

function textResult(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return {
    content: [{ type: "text", text }],
    isError: false,
  };
}

function errorResult(message) {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function idea(name, angle, why) {
  return { name, angle, why };
}

function getToolDefinition(name) {
  return toolDefinitions.find((tool) => tool.name === name) ?? null;
}

function validateToolArguments(toolName, args) {
  const tool = getToolDefinition(toolName);
  if (!tool) return null;

  const schema = tool.inputSchema;
  if (!schema || schema.type !== "object") return null;

  if (args == null) {
    return schema.required?.length
      ? schema.required.map((key) => `Missing required argument: ${key}`).join("; ")
      : null;
  }
  if (typeof args !== "object" || Array.isArray(args)) {
    return `Arguments must be an object.`;
  }

  const properties = schema.properties ?? {};
  const required = schema.required ?? [];
  const allowAdditional = schema.additionalProperties !== false;

  const issues = [];
  for (const key of required) {
    if (!(key in args)) issues.push(`Missing required argument: ${key}`);
  }

  if (!allowAdditional) {
    for (const key of Object.keys(args)) {
      if (!(key in properties)) issues.push(`Unexpected argument: ${key}`);
    }
  }

  for (const [key, value] of Object.entries(args)) {
    const expected = properties[key]?.type;
    if (!expected) continue;
    if (expected === "string" && typeof value !== "string") issues.push(`${key} must be a string`);
    if (expected === "number" && typeof value !== "number") issues.push(`${key} must be a number`);
    if (expected === "boolean" && typeof value !== "boolean") issues.push(`${key} must be a boolean`);
  }

  if (issues.length === 0) return null;
  return issues.join("; ");
}

function slugifyProjectName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function suggestedScreenshotPath(projectName) {
  const slug = slugifyProjectName(projectName);
  return slug ? `/projects/${slug}.png` : "/projects/<project-slug>.png";
}

function getScreenshotCapture(project, asset) {
  const captureTarget = project.url || null;
  const captureType = captureTarget
    ? captureTarget.startsWith("http")
      ? "external-url"
      : "local-route"
    : "unavailable";
  const reason = asset.status === "missing-file"
    ? `Image path is set, but the file does not exist: ${asset.file}`
    : "Project has no screenshot image path.";
  const suggestedImage = project.image || suggestedScreenshotPath(project.name);
  const captureReady = Boolean(captureTarget);

  return {
    project: project.name,
    reason,
    currentImage: project.image || null,
    suggestedImage,
    captureTarget,
    captureType,
    captureReady,
    blocker: captureReady ? null : "Add a project URL or local route before capturing a screenshot.",
  };
}

function normalizeDraftValue(value) {
  return String(value ?? "").trim();
}

function escapeProjectString(value) {
  return normalizeDraftValue(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatProjectObject(project) {
  return [
    "  {",
    `    name: "${escapeProjectString(project.name)}",`,
    `    tagline: "${escapeProjectString(project.tagline)}",`,
    `    image: "${escapeProjectString(project.image)}",`,
    `    url: "${escapeProjectString(project.url)}",`,
    `    status: "${escapeProjectString(project.status)}",`,
    "  },",
  ].join("\n");
}

function draftLabProjectCard(projects, args) {
  const name = normalizeDraftValue(args.name);
  const tagline = normalizeDraftValue(args.tagline);
  const slug = slugifyProjectName(name);
  const status = normalizeDraftValue(args.status) || "Built";
  const image = normalizeDraftValue(args.image) || suggestedScreenshotPath(name);
  const url = normalizeDraftValue(args.url) || (slug ? `/tools/${slug}` : "");
  const warnings = [];

  if (!name) warnings.push("Project name is blank.");
  if (!tagline) warnings.push("Tagline is blank.");
  if (!slug) warnings.push("Could not derive a slug from the project name.");
  if (projects.some((project) => project.name.toLowerCase() === name.toLowerCase())) {
    warnings.push("A Lab project with this name already exists.");
  }
  if (!image.startsWith("/projects/")) {
    warnings.push("Screenshot path should usually live under /projects/.");
  }
  if (url.startsWith("/tools/")) {
    warnings.push(`Create the local route before publishing: app${url}/page.tsx`);
  }

  const project = { name, tagline, image, url, status };

  return {
    slug,
    suggestedScreenshot: image,
    suggestedRoute: url.startsWith("/tools/") ? `app${url}/page.tsx` : null,
    project,
    labCardSnippet: formatProjectObject(project),
    warnings,
  };
}

function normalizeProjectQuery(value) {
  return String(value ?? "").trim();
}

function findMatchingProjects(projects, query) {
  const normalized = normalizeProjectQuery(query);
  if (!normalized) {
    return { matches: projects, query: normalized, issue: null };
  }

  const lowered = normalized.toLowerCase();
  const slugged = slugifyProjectName(normalized);

  const exact = projects.filter((project) => project.name.toLowerCase() === lowered);
  if (exact.length > 0) return { matches: exact, query: normalized, issue: null };

  const slugMatches = projects.filter((project) => slugifyProjectName(project.name) === slugged);
  if (slugMatches.length > 0) return { matches: slugMatches, query: normalized, issue: null };

  const contains = projects.filter((project) => project.name.toLowerCase().includes(lowered));
  if (contains.length === 1) return { matches: contains, query: normalized, issue: null };

  if (contains.length > 1) {
    return {
      matches: [],
      query: normalized,
      issue: `Project name is ambiguous. Matches: ${contains.map((project) => project.name).join(", ")}`,
    };
  }

  return { matches: [], query: normalized, issue: "Project is not listed on the Lab page." };
}

async function computeReadinessChecks(projects) {
  const checks = await Promise.all(projects.map(async (project) => {
    const asset = await getProjectAssetStatus(project);
    const blockers = [];

    if (!project.name) blockers.push("Missing project name.");
    if (!project.tagline) blockers.push("Missing tagline.");
    if (!project.status) blockers.push("Missing status.");
    if (!project.url) blockers.push("Missing URL or route.");
    if (!project.image) blockers.push("Missing screenshot image path.");
    if (project.image && !asset.exists) {
      blockers.push(`Screenshot file not found: ${asset.file ?? project.image}`);
    }

    const screenshotSuggested =
      !project.image || (project.image && !asset.exists)
        ? suggestedScreenshotPath(project.name)
        : null;

    return {
      project: project.name,
      ready: blockers.length === 0,
      blockers,
      url: project.url,
      image: project.image,
      screenshotSuggested,
    };
  }));

  return {
    checked: checks.length,
    ready: checks.filter((check) => check.ready).length,
    checks,
  };
}

function formatReadinessReport({ checked, ready, checks, projectName }) {
  const lines = [];
  const now = new Date().toISOString();
  const scopeLabel = projectName ? `Project: ${projectName}` : "Scope: all Lab projects";

  lines.push("# Publish readiness report");
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push(scopeLabel);
  lines.push("");
  lines.push(`Ready: ${ready}/${checked}`);
  lines.push("");

  const notReady = checks.filter((check) => !check.ready);
  if (notReady.length === 0) {
    lines.push("All checked projects look publish-ready.");
    return lines.join("\n");
  }

  lines.push("## Blockers");
  lines.push("");

  for (const check of notReady) {
    lines.push(`### ${check.project}`);
    lines.push("");
    for (const blocker of check.blockers) {
      lines.push(`- ${blocker}`);
    }
    if (check.screenshotSuggested) {
      lines.push(`- Suggested screenshot path: ${check.screenshotSuggested}`);
    }
    if (check.url) lines.push(`- URL: ${check.url}`);
    if (check.image) lines.push(`- Image: ${check.image}`);
    lines.push("");
  }

  lines.push("## Next actions");
  lines.push("");
  lines.push("- Capture missing screenshots and add them under `public/projects/`.");
  lines.push("- Ensure each Lab project has: `name`, `tagline`, `status`, `url`, `image`.");
  lines.push("");

  return lines.join("\n");
}

function formatPublishHandoff({ checks, projectName }) {
  const lines = [];
  const now = new Date().toISOString();
  const notReady = checks.filter((check) => !check.ready);
  const ready = checks.length - notReady.length;
  const scopeLabel = projectName ? `Project: ${projectName}` : "Scope: all Lab projects";

  lines.push("# Portfolio Lab publish handoff");
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push(scopeLabel);
  lines.push("");
  lines.push("## Status");
  lines.push("");
  lines.push(`- Ready projects: ${ready}/${checks.length}`);
  lines.push(`- Projects needing work: ${notReady.length}`);
  lines.push("");

  if (checks.length === 0) {
    lines.push("## Blockers");
    lines.push("");
    lines.push("- No matching Lab projects were found.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("## Owner checklist");
  lines.push("");
  lines.push("- [ ] Confirm every listed project should appear on the Lab page.");
  lines.push("- [ ] Capture or replace each missing screenshot under `public/projects/`.");
  lines.push("- [ ] Open every project URL or route and confirm it loads cleanly.");
  lines.push("- [ ] Re-run `npm run smoke` from `portfolio-publisher-mcp` before publishing.");
  lines.push("");

  lines.push("## Project tasks");
  lines.push("");

  for (const check of checks) {
    lines.push(`### ${check.project}`);
    lines.push("");
    lines.push(`- Status: ${check.ready ? "Ready" : "Needs work"}`);
    if (check.url) lines.push(`- URL: ${check.url}`);
    if (check.image) lines.push(`- Image: ${check.image}`);
    if (check.screenshotSuggested) {
      lines.push(`- Suggested screenshot path: ${check.screenshotSuggested}`);
    }

    if (check.blockers.length > 0) {
      for (const blocker of check.blockers) {
        lines.push(`- [ ] ${blocker}`);
      }
    } else {
      lines.push("- [x] Required Lab card fields and screenshot file are present.");
    }

    lines.push("");
  }

  lines.push("## Verification");
  lines.push("");
  lines.push("```bash");
  lines.push("cd portfolio-publisher-mcp");
  lines.push("npm run smoke");
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}

export async function callTool(name, args = {}) {
  const argIssue = validateToolArguments(name, args);
  if (argIssue) return errorResult(`Invalid arguments for ${name}: ${argIssue}`);

  if (name === "list_lab_projects") {
    const projects = await listLabProjects();
    return textResult({
      count: projects.length,
      projects,
    });
  }

  if (name === "inspect_lab_format") {
    return textResult({
      labPage: "app/lab/page.tsx",
      projectFields: ["name", "tagline", "image", "url", "status"],
      currentPattern: "Projects are stored in a hard-coded `projects` array and rendered as cards.",
      screenshotConvention: "Images should use public paths such as /projects/project-name.png.",
      routeConvention: "Interactive tools should usually live under app/tools/<slug>/page.tsx.",
      statusValuesSeen: ["Live", "Running", "Internal", "Demo", "Built"],
      allowedReadScope: [
        paths.labPage,
        paths.publicDir,
        paths.projectsDir,
      ],
    });
  }

  if (name === "validate_lab_assets") {
    const projects = await listLabProjects();
    const assets = await Promise.all(projects.map(getProjectAssetStatus));
    return textResult({
      checked: assets.length,
      missing: assets.filter((asset) => !asset.exists).length,
      assets,
    });
  }

  if (name === "list_screenshot_queue") {
    const projects = await listLabProjects();
    const assets = await Promise.all(projects.map(getProjectAssetStatus));
    const queue = projects
      .map((project, index) => ({ project, asset: assets[index] }))
      .filter(({ asset }) => !asset.exists)
      .map(({ project, asset }) => getScreenshotCapture(project, asset));

    return textResult({
      queued: queue.length,
      captureReady: queue.filter((item) => item.captureReady).length,
      blocked: queue.filter((item) => !item.captureReady).length,
      queue,
    });
  }

  if (name === "draft_lab_project_card") {
    const projects = await listLabProjects();
    return textResult(draftLabProjectCard(projects, args));
  }

  if (name === "publish_readiness_check") {
    const projects = await listLabProjects();
    const { matches, issue, query } = findMatchingProjects(projects, args.projectName);

    if (issue) {
      return textResult({
        projectName: query,
        ready: false,
        blockers: [issue],
      });
    }

    return textResult(await computeReadinessChecks(matches));
  }

  if (name === "publish_readiness_report") {
    const projects = await listLabProjects();
    const projectName = normalizeProjectQuery(args.projectName);
    const { matches, issue, query } = findMatchingProjects(projects, projectName);

    if (issue) {
      return textResult(
        [
          "# Publish readiness report",
          "",
          `Generated: ${new Date().toISOString()}`,
          `Project: ${query}`,
          "",
          "Ready: 0/0",
          "",
          "## Blockers",
          "",
          `- ${issue}`,
          "",
        ].join("\n")
      );
    }

    const readiness = await computeReadinessChecks(matches);
    return textResult(formatReadinessReport({ ...readiness, projectName: projectName || null }));
  }

  if (name === "create_publish_handoff") {
    const projects = await listLabProjects();
    const projectName = normalizeProjectQuery(args.projectName);
    const { matches, issue, query } = findMatchingProjects(projects, projectName);

    if (issue) {
      return textResult(
        formatPublishHandoff({
          checks: [{
            project: query || "Unknown project",
            ready: false,
            blockers: [issue],
            url: "",
            image: "",
            screenshotSuggested: null,
          }],
          projectName: query || null,
        })
      );
    }

    const readiness = await computeReadinessChecks(matches);
    return textResult(formatPublishHandoff({ checks: readiness.checks, projectName: projectName || null }));
  }

  if (name === "suggest_next_lab_project") {
    const projects = await listLabProjects();
    const existingNames = new Set(projects.map((project) => project.name.toLowerCase()));
    const candidates = [
      idea("Portfolio Publisher MCP", "MCP server", "Turns the portfolio itself into a safe, AI-manageable publishing system."),
      idea("Website Change Monitor", "Python automation", "Tracks public website changes, screenshots diffs, and produces a weekly intelligence report."),
      idea("GitHub Builder Dashboard", "Local analytics dashboard", "Visualizes project velocity, commit themes, and visible builder progress across repos."),
      idea("AI Tool Directory Radar", "Scraper plus static report", "Scrapes public AI tool directories and publishes trend snapshots without a production API."),
      idea("Local Knowledge Graph Builder", "Python parser plus visualization", "Turns markdown notes or articles into an explorable topic graph."),
      idea("Automation Workflow Auditor", "Static workflow inspector", "Reads exported automation files and explains triggers, actions, risks, and missing safeguards."),
      idea("Prompt Pattern Library Compiler", "Static content pipeline", "Turns saved prompt examples into a searchable local library and portfolio artifact."),
    ].filter((candidate) => !existingNames.has(candidate.name.toLowerCase()));

    const count = Number.isFinite(args.count) ? Math.max(1, Math.min(Number(args.count), 10)) : 5;
    return textResult({
      count: Math.min(count, candidates.length),
      ideas: candidates.slice(0, count),
    });
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
}
