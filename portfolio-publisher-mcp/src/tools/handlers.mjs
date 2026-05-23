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

  if (args == null) return null;
  if (typeof args !== "object" || Array.isArray(args)) {
    return `Arguments must be an object.`;
  }

  const properties = schema.properties ?? {};
  const allowAdditional = schema.additionalProperties !== false;

  const issues = [];
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

async function computeReadinessChecks(projects) {
  const checks = await Promise.all(projects.map(async (project) => {
    const asset = await getProjectAssetStatus(project);
    const blockers = [];

    if (!project.name) blockers.push("Missing project name.");
    if (!project.tagline) blockers.push("Missing tagline.");
    if (!project.status) blockers.push("Missing status.");
    if (!project.url) blockers.push("Missing URL or route.");
    if (!project.image) blockers.push("Missing screenshot image path.");
    if (project.image && !asset.exists) blockers.push(`Screenshot file not found: ${asset.file}`);

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
        paths.projectDir,
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

  if (name === "publish_readiness_check") {
    const projects = await listLabProjects();
    const target = args.projectName
      ? projects.filter((project) => project.name.toLowerCase() === String(args.projectName).toLowerCase())
      : projects;

    if (args.projectName && target.length === 0) {
      return textResult({
        projectName: args.projectName,
        ready: false,
        blockers: ["Project is not listed on the Lab page."],
      });
    }

    return textResult(await computeReadinessChecks(target));
  }

  if (name === "publish_readiness_report") {
    const projects = await listLabProjects();
    const projectName = args.projectName ? String(args.projectName) : "";
    const target = projectName
      ? projects.filter((project) => project.name.toLowerCase() === projectName.toLowerCase())
      : projects;

    if (projectName && target.length === 0) {
      return textResult(
        [
          "# Publish readiness report",
          "",
          `Generated: ${new Date().toISOString()}`,
          `Project: ${projectName}`,
          "",
          "Ready: 0/0",
          "",
          "## Blockers",
          "",
          "- Project is not listed on the Lab page.",
          "",
        ].join("\n")
      );
    }

    const readiness = await computeReadinessChecks(target);
    return textResult(formatReadinessReport({ ...readiness, projectName: projectName || null }));
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
