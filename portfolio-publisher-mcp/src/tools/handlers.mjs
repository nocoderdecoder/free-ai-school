import fs from "node:fs/promises";
import path from "node:path";
import { listLabProjects, getProjectAssetStatus, readLabSource } from "../lib/labParser.mjs";
import { assertSafeRead } from "../lib/fileSafety.mjs";
import { paths, toRepoRelative } from "../lib/paths.mjs";
import { tools as toolDefinitions } from "./definitions.mjs";

const EXPECTED_LAB_STATUSES = new Set(["Built", "Demo", "Internal", "Live", "Running"]);

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

async function buildScreenshotQueue(projects) {
  const assets = await Promise.all(projects.map(getProjectAssetStatus));
  return projects
    .map((project, index) => ({ project, asset: assets[index] }))
    .filter(({ asset }) => !asset.exists)
    .map(({ project, asset }) => getScreenshotCapture(project, asset));
}

function formatScreenshotCapturePlan(queue) {
  const lines = [];
  const now = new Date().toISOString();
  const ready = queue.filter((item) => item.captureReady);
  const blocked = queue.filter((item) => !item.captureReady);

  lines.push("# Lab screenshot capture plan");
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Missing screenshots: ${queue.length}`);
  lines.push(`- Ready to capture: ${ready.length}`);
  lines.push(`- Blocked: ${blocked.length}`);
  lines.push("");

  lines.push("## Ready to capture");
  lines.push("");
  if (ready.length === 0) {
    lines.push("- No screenshot captures are ready yet.");
  } else {
    for (const item of ready) {
      lines.push(`### ${item.project}`);
      lines.push("");
      lines.push(`- Target: ${item.captureTarget}`);
      lines.push(`- Target type: ${item.captureType}`);
      lines.push(`- Save as: public${item.suggestedImage}`);
      if (item.currentImage) lines.push(`- Current Lab image path: ${item.currentImage}`);
      lines.push(`- Reason: ${item.reason}`);
      lines.push("");
    }
  }
  lines.push("");

  lines.push("## Blocked captures");
  lines.push("");
  if (blocked.length === 0) {
    lines.push("- No screenshot captures are blocked.");
  } else {
    for (const item of blocked) {
      lines.push(`### ${item.project}`);
      lines.push("");
      lines.push(`- Save as: public${item.suggestedImage}`);
      lines.push(`- Blocker: ${item.blocker}`);
      lines.push(`- Reason: ${item.reason}`);
      lines.push("");
    }
  }
  lines.push("");

  lines.push("## Owner next step");
  lines.push("");
  if (ready.length > 0) {
    const first = ready[0];
    lines.push(`- Capture ${first.project} from ${first.captureTarget} and save it as public${first.suggestedImage}.`);
  } else if (blocked.length > 0) {
    lines.push("- Add project URLs or local routes for the blocked captures, then regenerate this plan.");
  } else {
    lines.push("- Screenshot coverage looks complete; run the smoke test before publishing.");
  }
  lines.push("");

  lines.push("## Verification");
  lines.push("");
  lines.push("```bash");
  lines.push("cd portfolio-publisher-mcp");
  lines.push("npm run smoke");
  lines.push("```");
  lines.push("");

  return lines.join("\n");
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

function localRouteFile(url) {
  if (!url || url.startsWith("http")) return null;
  const route = url.replace(/^\/+/, "").replace(/\/+$/, "");
  return route ? `app/${route}/page.tsx` : null;
}

async function getProjectRouteStatus(project) {
  if (!project.url) {
    return {
      project: project.name,
      url: "",
      type: "missing-url",
      status: "missing-url",
      exists: false,
      file: null,
    };
  }

  if (project.url.startsWith("http")) {
    return {
      project: project.name,
      url: project.url,
      type: "external-url",
      status: "external-url-not-checked",
      exists: null,
      file: null,
    };
  }

  const routeFile = localRouteFile(project.url);
  const absolute = routeFile ? path.join(paths.repoRoot, routeFile) : null;

  try {
    await fs.access(assertSafeRead(absolute));
    return {
      project: project.name,
      url: project.url,
      type: "local-route",
      status: "ok",
      exists: true,
      file: toRepoRelative(absolute),
    };
  } catch {
    return {
      project: project.name,
      url: project.url,
      type: "local-route",
      status: "missing-route-file",
      exists: false,
      file: routeFile,
    };
  }
}

function publicImageFile(image) {
  if (!image) return null;
  return `public/${image.replace(/^\/+/, "")}`;
}

function auditProjectCardCopy(project, duplicateSlugs) {
  const slug = slugifyProjectName(project.name);
  const issues = [];
  const warnings = [];

  if (!project.name.trim()) {
    issues.push("Project name is blank.");
  }
  if (!project.tagline.trim()) {
    issues.push("Tagline is blank.");
  }
  if (!project.status.trim()) {
    issues.push("Status is blank.");
  } else if (!EXPECTED_LAB_STATUSES.has(project.status)) {
    warnings.push(`Unexpected status value: ${project.status}`);
  }
  if (duplicateSlugs.has(slug)) {
    issues.push(`Project slug is duplicated: ${slug}`);
  }

  if (project.name.trim().length > 36) {
    warnings.push("Project name is long for a compact Lab card.");
  }
  if (project.tagline.trim().length > 72) {
    warnings.push("Tagline is long for a compact Lab card.");
  }
  if (project.tagline.trim() && !/[a-z0-9]/i.test(project.tagline)) {
    warnings.push("Tagline should include descriptive words, not only symbols.");
  }
  if (project.image && !project.image.startsWith("/projects/")) {
    warnings.push("Image path should usually live under /projects/.");
  }
  if (project.image && !/\.(avif|webp|png|jpg|jpeg)$/i.test(project.image)) {
    warnings.push("Image path should end with a common web image extension.");
  }
  if (project.url?.startsWith("/tools/")) {
    const routeSlug = project.url.replace(/^\/tools\/?/, "").replace(/\/+$/, "");
    if (routeSlug && routeSlug !== slug) {
      warnings.push(`Local route slug differs from project slug: ${routeSlug}`);
    }
  }

  return {
    project: project.name,
    slug,
    status: project.status,
    issueCount: issues.length,
    warningCount: warnings.length,
    issues,
    warnings,
  };
}

function auditLabCardCopy(projects) {
  const slugCounts = countBy(projects, (project) => slugifyProjectName(project.name));
  const duplicateSlugs = new Set(
    Object.entries(slugCounts)
      .filter(([slug, count]) => slug && count > 1)
      .map(([slug]) => slug)
  );
  const cards = projects.map((project) => auditProjectCardCopy(project, duplicateSlugs));

  return {
    checked: cards.length,
    cardsWithIssues: cards.filter((card) => card.issueCount > 0).length,
    cardsWithWarnings: cards.filter((card) => card.warningCount > 0).length,
    duplicateSlugs: [...duplicateSlugs],
    statusesSeen: Object.keys(countBy(projects, (project) => project.status)).sort(),
    cards,
  };
}

function formatLabCopyAuditReport(audit) {
  const lines = [];
  const now = new Date().toISOString();
  const issueCards = audit.cards.filter((card) => card.issueCount > 0);
  const warningCards = audit.cards.filter((card) => card.warningCount > 0);

  lines.push("# Lab card copy audit report");
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Cards checked: ${audit.checked}`);
  lines.push(`- Cards with issues: ${audit.cardsWithIssues}`);
  lines.push(`- Cards with warnings: ${audit.cardsWithWarnings}`);
  lines.push(`- Statuses seen: ${audit.statusesSeen.length ? audit.statusesSeen.join(", ") : "None"}`);
  lines.push(`- Duplicate slugs: ${audit.duplicateSlugs.length ? audit.duplicateSlugs.join(", ") : "None"}`);
  lines.push("");

  lines.push("## Issues");
  lines.push("");
  if (issueCards.length === 0) {
    lines.push("- No blocking copy issues found.");
  } else {
    for (const card of issueCards) {
      lines.push(`### ${card.project || "Untitled project"}`);
      lines.push("");
      for (const issue of card.issues) lines.push(`- ${issue}`);
      lines.push("");
    }
  }
  lines.push("");

  lines.push("## Warnings");
  lines.push("");
  if (warningCards.length === 0) {
    lines.push("- No copy convention warnings found.");
  } else {
    for (const card of warningCards) {
      lines.push(`### ${card.project || "Untitled project"}`);
      lines.push("");
      lines.push(`- Slug: ${card.slug || "Missing"}`);
      if (card.status) lines.push(`- Status: ${card.status}`);
      for (const warning of card.warnings) lines.push(`- ${warning}`);
      lines.push("");
    }
  }

  lines.push("## Owner next step");
  lines.push("");
  if (issueCards.length > 0) {
    lines.push("- Fix the listed blocking copy issues before publishing the Lab update.");
  } else if (warningCards.length > 0) {
    lines.push("- Review the warnings and decide whether the Lab card conventions should be updated.");
  } else {
    lines.push("- Copy conventions look ready; continue with screenshot and route readiness checks.");
  }
  lines.push("");

  return lines.join("\n");
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

function formatLabCardPatchPreview(draft) {
  const lines = [];
  const now = new Date().toISOString();
  const imageFile = publicImageFile(draft.project.image);

  lines.push(`# Lab card patch preview: ${draft.project.name}`);
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push("");

  lines.push("## Status");
  lines.push("");
  lines.push("- Preview only: no files were changed.");
  lines.push("- Target file: app/lab/page.tsx");
  lines.push("- Insert location: add this object inside the `projects` array.");
  lines.push("");

  lines.push("## Lab card object");
  lines.push("");
  lines.push("```ts");
  lines.push(draft.labCardSnippet);
  lines.push("```");
  lines.push("");

  lines.push("## Files to prepare");
  lines.push("");
  if (draft.suggestedRoute) lines.push(`- Route: ${draft.suggestedRoute}`);
  if (imageFile) lines.push(`- Screenshot: ${imageFile}`);
  if (!draft.suggestedRoute && !imageFile) lines.push("- No route or screenshot path could be derived from the provided card fields.");
  lines.push("");

  lines.push("## Warnings");
  lines.push("");
  if (draft.warnings.length > 0) {
    for (const warning of draft.warnings) lines.push(`- ${warning}`);
  } else {
    lines.push("- No draft warnings found.");
  }
  lines.push("");

  lines.push("## Owner next step");
  lines.push("");
  lines.push("- Review the card copy, create any listed route/screenshot files, then paste the object into `app/lab/page.tsx`.");
  lines.push("");

  lines.push("## Verification");
  lines.push("");
  lines.push("```bash");
  lines.push("cd portfolio-publisher-mcp");
  lines.push("npm run smoke");
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}

function findProjectsArrayLine(source) {
  const lines = source.split("\n");
  const index = lines.findIndex((line) => line.includes("const projects = ["));
  return index === -1 ? null : index + 1;
}

function formatLabCardPatchArtifact(draft, source) {
  const targetFile = "app/lab/page.tsx";
  const routeFile = draft.suggestedRoute;
  const imageFile = publicImageFile(draft.project.image);
  const insertedLines = draft.labCardSnippet.split("\n").map((line) => `+${line}`);
  const projectsArrayLine = findProjectsArrayLine(source);
  const hunkHeader = projectsArrayLine
    ? `@@ -${projectsArrayLine},1 +${projectsArrayLine},${insertedLines.length + 1} @@`
    : "@@";

  return {
    generatedAt: new Date().toISOString(),
    previewOnly: true,
    targetFile,
    insertionHint: "Insert this object as a new item inside the `projects` array.",
    labCard: draft.project,
    labCardSnippet: draft.labCardSnippet,
    unifiedDiff: [
      `--- a/${targetFile}`,
      `+++ b/${targetFile}`,
      hunkHeader,
      " const projects = [",
      ...insertedLines,
    ].join("\n"),
    filesToPrepare: [
      ...(routeFile ? [{ type: "route", file: routeFile }] : []),
      ...(imageFile ? [{ type: "screenshot", file: imageFile }] : []),
    ],
    warnings: draft.warnings,
    ownerNextStep:
      "Review the generated diff, create any listed route/screenshot files, then apply the Lab card change.",
    verificationCommand: "cd portfolio-publisher-mcp && npm run smoke",
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
    const [asset, route] = await Promise.all([
      getProjectAssetStatus(project),
      getProjectRouteStatus(project),
    ]);
    const blockers = [];

    if (!project.name) blockers.push("Missing project name.");
    if (!project.tagline) blockers.push("Missing tagline.");
    if (!project.status) blockers.push("Missing status.");
    if (!project.url) blockers.push("Missing URL or route.");
    if (route.status === "missing-route-file") {
      blockers.push(`Local route file not found: ${route.file}`);
    }
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
      route,
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

function classifyNextPublishTask(project, asset, readiness) {
  const capture = getScreenshotCapture(project, asset);
  const missingFieldBlockers = readiness.blockers.filter((blocker) => !blocker.startsWith("Screenshot file not found"));
  const actions = [];
  let focus = "Ready for owner review";
  let priorityScore = 0;

  if (!project.url) {
    focus = "Add URL or route";
    priorityScore += 90;
    actions.push("Add a working external URL or local route to the Lab card.");
  }

  if (!project.image) {
    focus = project.url ? "Add screenshot path and capture image" : focus;
    priorityScore += project.url ? 100 : 60;
    actions.push(`Set image to ${capture.suggestedImage}.`);
  } else if (!asset.exists) {
    focus = project.url ? "Capture missing screenshot" : focus;
    priorityScore += project.url ? 110 : 70;
    actions.push(`Create the screenshot file at ${asset.file ?? capture.suggestedImage}.`);
  }

  for (const blocker of missingFieldBlockers) {
    if (blocker.includes("Missing project name")) actions.push("Add the project name.");
    if (blocker.includes("Missing tagline")) actions.push("Add a one-line tagline.");
    if (blocker.includes("Missing status")) actions.push("Add a Lab status.");
  }

  if (readiness.ready) {
    actions.push("Open the project URL and confirm the visible experience is ready to publish.");
  } else if (actions.length === 0) {
    actions.push("Resolve the listed blockers, then re-run the smoke test.");
  }

  if (capture.captureReady && !asset.exists) priorityScore += 20;
  priorityScore += readiness.blockers.length * 5;

  return {
    project: project.name,
    priorityScore,
    ready: readiness.ready,
    focus,
    blockers: readiness.blockers,
    captureTarget: capture.captureTarget,
    captureType: capture.captureType,
    suggestedScreenshot: readiness.screenshotSuggested,
    nextActions: [...new Set(actions)],
  };
}

async function prioritizePublishTasks(projects) {
  const [readiness, assets] = await Promise.all([
    computeReadinessChecks(projects),
    Promise.all(projects.map(getProjectAssetStatus)),
  ]);

  const tasks = projects
    .map((project, index) => classifyNextPublishTask(project, assets[index], readiness.checks[index]))
    .sort((left, right) => {
      if (left.ready !== right.ready) return left.ready ? 1 : -1;
      if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore;
      return left.project.localeCompare(right.project);
    })
    .map((task, index) => ({
      rank: index + 1,
      project: task.project,
      ready: task.ready,
      focus: task.focus,
      blockers: task.blockers,
      captureTarget: task.captureTarget,
      captureType: task.captureType,
      suggestedScreenshot: task.suggestedScreenshot,
      nextActions: task.nextActions,
    }));

  return {
    checked: readiness.checked,
    ready: readiness.ready,
    needsWork: readiness.checked - readiness.ready,
    topPriority: tasks.find((task) => !task.ready)?.project ?? null,
    tasks,
  };
}

function countBy(values, getKey) {
  return values.reduce((counts, value) => {
    const key = getKey(value) || "Unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function formatCounts(counts) {
  const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return "None";
  return entries.map(([key, count]) => `${key}: ${count}`).join(", ");
}

function formatLabPublishDigest({ projects, readiness, routes, priorities }) {
  const lines = [];
  const now = new Date().toISOString();
  const missingScreenshots = readiness.checks.filter((check) => check.blockers.some((blocker) =>
    blocker.startsWith("Missing screenshot") || blocker.startsWith("Screenshot file not found")
  ));
  const routeIssues = routes.filter((route) =>
    route.status === "missing-url" || route.status === "missing-route-file"
  );
  const topTask = priorities.tasks.find((task) => !task.ready) ?? priorities.tasks[0] ?? null;

  lines.push("# Portfolio Lab publish digest");
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push("");

  lines.push("## Inventory");
  lines.push("");
  lines.push(`- Projects listed: ${projects.length}`);
  lines.push(`- Status mix: ${formatCounts(countBy(projects, (project) => project.status))}`);
  lines.push(`- Ready for owner review: ${readiness.ready}/${readiness.checked}`);
  lines.push("");

  lines.push("## Coverage");
  lines.push("");
  lines.push(`- Local routes: ${routes.filter((route) => route.type === "local-route").length}`);
  lines.push(`- External URLs: ${routes.filter((route) => route.type === "external-url").length}`);
  lines.push(`- Missing URLs or route files: ${routeIssues.length}`);
  lines.push(`- Missing screenshots: ${missingScreenshots.length}`);
  lines.push("");

  lines.push("## Current priority");
  lines.push("");
  if (topTask) {
    lines.push(`- Project: ${topTask.project}`);
    lines.push(`- Focus: ${topTask.focus}`);
    if (topTask.captureTarget) lines.push(`- Screenshot target: ${topTask.captureTarget}`);
    for (const action of topTask.nextActions.slice(0, 3)) {
      lines.push(`- [ ] ${action}`);
    }
  } else {
    lines.push("- No Lab projects were found.");
  }
  lines.push("");

  lines.push("## Owner next step");
  lines.push("");
  if (missingScreenshots.length > 0) {
    lines.push("- Capture the highest-priority missing screenshot, then re-run `npm run smoke`.");
  } else if (routeIssues.length > 0) {
    lines.push("- Add URLs or route files for projects with route blockers, then re-run `npm run smoke`.");
  } else {
    lines.push("- Open the listed URLs/routes for visual review, then publish the Lab update.");
  }
  lines.push("");

  return lines.join("\n");
}

function formatProjectPublishBrief({ project, readiness, asset, task, requestedProjectName }) {
  const lines = [];
  const now = new Date().toISOString();
  const routeFile = localRouteFile(project.url);
  const currentImageFile = asset.file ?? publicImageFile(project.image);
  const suggestedImage = task.suggestedScreenshot ?? project.image ?? suggestedScreenshotPath(project.name);
  const suggestedImageFile = publicImageFile(suggestedImage);
  const scopeLabel = requestedProjectName
    ? `Requested project: ${requestedProjectName}`
    : "Requested project: current top priority";

  lines.push(`# Project publish brief: ${project.name}`);
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push(scopeLabel);
  lines.push("");

  lines.push("## Status");
  lines.push("");
  lines.push(`- Publish status: ${readiness.ready ? "Ready for owner review" : "Needs work"}`);
  lines.push(`- Current focus: ${task.focus}`);
  if (project.status) lines.push(`- Lab badge: ${project.status}`);
  if (task.captureTarget) lines.push(`- Screenshot target: ${task.captureTarget}`);
  lines.push("");

  lines.push("## Lab card copy");
  lines.push("");
  lines.push(`- Name: ${project.name || "Missing"}`);
  lines.push(`- Tagline: ${project.tagline || "Missing"}`);
  lines.push(`- URL: ${project.url || "Missing"}`);
  lines.push(`- Image: ${project.image || "Missing"}`);
  lines.push("");

  lines.push("## Files to check");
  lines.push("");
  if (routeFile) lines.push(`- Route: ${routeFile}`);
  if (currentImageFile) lines.push(`- Current image file: ${currentImageFile}`);
  if (suggestedImageFile && suggestedImageFile !== currentImageFile) {
    lines.push(`- Suggested image file: ${suggestedImageFile}`);
  }
  if (!routeFile && !currentImageFile && !suggestedImageFile) {
    lines.push("- No route or screenshot file can be checked until the Lab card has a URL and image path.");
  }
  lines.push("");

  lines.push("## Blockers");
  lines.push("");
  if (readiness.blockers.length > 0) {
    for (const blocker of readiness.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push("- No required Lab card blockers found.");
  }
  lines.push("");

  lines.push("## Next actions");
  lines.push("");
  for (const action of task.nextActions) lines.push(`- [ ] ${action}`);
  lines.push("- [ ] Re-run `npm run smoke` from `portfolio-publisher-mcp` after changes.");
  lines.push("");

  lines.push("## Verification command");
  lines.push("");
  lines.push("```bash");
  lines.push("cd portfolio-publisher-mcp");
  lines.push("npm run smoke");
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}

async function createProjectPublishBrief(projects, projectName) {
  const requestedProjectName = normalizeProjectQuery(projectName);
  let matches = [];

  if (requestedProjectName) {
    const result = findMatchingProjects(projects, requestedProjectName);
    if (result.issue) {
      return [
        `# Project publish brief: ${result.query || "Unknown project"}`,
        "",
        `Generated: ${new Date().toISOString()}`,
        `Requested project: ${result.query}`,
        "",
        "## Status",
        "",
        "- Publish status: Needs work",
        "- Current focus: Find the matching Lab project",
        "",
        "## Blockers",
        "",
        `- ${result.issue}`,
        "",
      ].join("\n");
    }
    matches = result.matches;
  } else {
    const priorities = await prioritizePublishTasks(projects);
    const topProjectName = priorities.topPriority ?? priorities.tasks[0]?.project ?? "";
    matches = projects.filter((project) => project.name === topProjectName);
  }

  const project = matches[0];
  if (!project) {
    return [
      "# Project publish brief",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Blockers",
      "",
      "- No Lab projects were found.",
      "",
    ].join("\n");
  }

  const [readinessResult, asset] = await Promise.all([
    computeReadinessChecks([project]),
    getProjectAssetStatus(project),
  ]);
  const readiness = readinessResult.checks[0];
  const task = classifyNextPublishTask(project, asset, readiness);

  return formatProjectPublishBrief({
    project,
    readiness,
    asset,
    task,
    requestedProjectName: requestedProjectName || null,
  });
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
        paths.appDir,
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

  if (name === "validate_lab_routes") {
    const projects = await listLabProjects();
    const routes = await Promise.all(projects.map(getProjectRouteStatus));
    return textResult({
      checked: routes.length,
      local: routes.filter((route) => route.type === "local-route").length,
      external: routes.filter((route) => route.type === "external-url").length,
      missing: routes.filter((route) => route.status === "missing-url" || route.status === "missing-route-file").length,
      routes,
    });
  }

  if (name === "list_screenshot_queue") {
    const projects = await listLabProjects();
    const queue = await buildScreenshotQueue(projects);

    return textResult({
      queued: queue.length,
      captureReady: queue.filter((item) => item.captureReady).length,
      blocked: queue.filter((item) => !item.captureReady).length,
      queue,
    });
  }

  if (name === "create_screenshot_capture_plan") {
    const projects = await listLabProjects();
    const queue = await buildScreenshotQueue(projects);

    return textResult(formatScreenshotCapturePlan(queue));
  }

  if (name === "draft_lab_project_card") {
    const projects = await listLabProjects();
    return textResult(draftLabProjectCard(projects, args));
  }

  if (name === "create_lab_card_patch_preview") {
    const projects = await listLabProjects();
    return textResult(formatLabCardPatchPreview(draftLabProjectCard(projects, args)));
  }

  if (name === "create_lab_card_patch_artifact") {
    const [projects, source] = await Promise.all([listLabProjects(), readLabSource()]);
    return textResult(formatLabCardPatchArtifact(draftLabProjectCard(projects, args), source));
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

  if (name === "create_project_publish_brief") {
    const projects = await listLabProjects();
    return textResult(await createProjectPublishBrief(projects, args.projectName));
  }

  if (name === "create_lab_publish_digest") {
    const projects = await listLabProjects();
    const [readiness, routes, priorities] = await Promise.all([
      computeReadinessChecks(projects),
      Promise.all(projects.map(getProjectRouteStatus)),
      prioritizePublishTasks(projects),
    ]);
    return textResult(formatLabPublishDigest({ projects, readiness, routes, priorities }));
  }

  if (name === "audit_lab_card_copy") {
    const projects = await listLabProjects();
    return textResult(auditLabCardCopy(projects));
  }

  if (name === "create_lab_copy_audit_report") {
    const projects = await listLabProjects();
    return textResult(formatLabCopyAuditReport(auditLabCardCopy(projects)));
  }

  if (name === "prioritize_publish_tasks") {
    const projects = await listLabProjects();
    return textResult(await prioritizePublishTasks(projects));
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
