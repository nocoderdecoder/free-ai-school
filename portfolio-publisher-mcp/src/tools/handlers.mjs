import { listLabProjects, getProjectAssetStatus } from "../lib/labParser.mjs";
import { paths } from "../lib/paths.mjs";

function textResult(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return {
    content: [{ type: "text", text }],
    isError: false,
  };
}

function idea(name, angle, why) {
  return { name, angle, why };
}

export async function callTool(name, args = {}) {
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

    const checks = await Promise.all(target.map(async (project) => {
      const asset = await getProjectAssetStatus(project);
      const blockers = [];
      if (!project.name) blockers.push("Missing project name.");
      if (!project.tagline) blockers.push("Missing tagline.");
      if (!project.status) blockers.push("Missing status.");
      if (!project.url) blockers.push("Missing URL or route.");
      if (!project.image) blockers.push("Missing screenshot image path.");
      if (project.image && !asset.exists) blockers.push(`Screenshot file not found: ${asset.file}`);

      return {
        project: project.name,
        ready: blockers.length === 0,
        blockers,
        url: project.url,
        image: project.image,
      };
    }));

    return textResult({
      checked: checks.length,
      ready: checks.filter((check) => check.ready).length,
      checks,
    });
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
