import { spawn } from "node:child_process";
import { once } from "node:events";
import readline from "node:readline";

const server = spawn(process.execPath, ["src/server.mjs"], {
  cwd: new URL("..", import.meta.url),
  stdio: ["pipe", "pipe", "inherit"],
});

const rl = readline.createInterface({ input: server.stdout });
const responses = [];
const responseById = new Map();
rl.on("line", (line) => {
  const response = JSON.parse(line);
  responses.push(response);
  if (response && typeof response === "object" && "id" in response) {
    responseById.set(response.id, response);
  }
});

function send(id, method, params = {}) {
  server.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

async function waitForResponse(id, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const existing = responseById.get(id);
    if (existing) return existing;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return null;
}

send(1, "initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "smoke-test", version: "0.1.0" },
});
send(2, "tools/list");
send(3, "tools/call", { name: "list_lab_projects", arguments: {} });
send(4, "tools/call", { name: "validate_lab_assets", arguments: {} });

await waitForResponse(3);
const listedProjectsText = responseById.get(3)?.result?.content?.[0]?.text ?? "{}";
const firstProjectName = JSON.parse(listedProjectsText).projects?.[0]?.name ?? "";
const firstProjectSlug = slugify(firstProjectName);

send(5, "tools/call", { name: "publish_readiness_check", arguments: { projectName: firstProjectSlug } });
send(6, "tools/call", { name: "publish_readiness_report", arguments: { projectName: firstProjectSlug } });
send(7, "tools/call", { name: "list_lab_projects", arguments: { extra: true } });
send(8, "tools/call", { name: "list_screenshot_queue", arguments: {} });
send(9, "tools/call", {
  name: "draft_lab_project_card",
  arguments: {
    name: "Website Change Monitor",
    tagline: "Weekly website screenshot diff report",
  },
});
send(10, "tools/call", { name: "draft_lab_project_card", arguments: { name: "Missing Tagline" } });
send(11, "tools/call", { name: "create_publish_handoff", arguments: { projectName: firstProjectSlug } });
send(12, "tools/call", { name: "prioritize_publish_tasks", arguments: {} });
send(13, "tools/call", { name: "create_project_publish_brief", arguments: {} });
send(14, "tools/call", { name: "validate_lab_routes", arguments: {} });
send(15, "tools/call", { name: "create_lab_publish_digest", arguments: {} });
send(16, "tools/call", { name: "audit_lab_card_copy", arguments: {} });
send(17, "tools/call", { name: "create_lab_copy_audit_report", arguments: {} });
send(18, "tools/call", { name: "create_screenshot_capture_plan", arguments: {} });
send(19, "tools/call", {
  name: "create_lab_card_patch_preview",
  arguments: {
    name: "Website Change Monitor",
    tagline: "Weekly website screenshot diff report",
  },
});
send(20, "tools/call", { name: "create_lab_card_patch_preview", arguments: { name: "Missing Tagline" } });
send(21, "tools/call", {
  name: "create_lab_card_patch_artifact",
  arguments: {
    name: "Website Change Monitor",
    tagline: "Weekly website screenshot diff report",
  },
});
send(22, "tools/call", { name: "create_lab_card_patch_artifact", arguments: { name: "Missing Tagline" } });
send(23, "tools/call", {
  name: "validate_lab_card_patch_artifact",
  arguments: {
    name: "Website Change Monitor",
    tagline: "Weekly website screenshot diff report",
  },
});
send(24, "tools/call", { name: "validate_lab_card_patch_artifact", arguments: { name: "Missing Tagline" } });
send(25, "tools/call", {
  name: "validate_lab_card_patch_artifact",
  arguments: {
    name: firstProjectName,
    tagline: "Duplicate card test",
    url: "https://example.com",
    image: "/projects/promptgrade.png",
  },
});

await Promise.all([
  waitForResponse(7),
  waitForResponse(8),
  waitForResponse(9),
  waitForResponse(10),
  waitForResponse(11),
  waitForResponse(12),
  waitForResponse(13),
  waitForResponse(14),
  waitForResponse(15),
  waitForResponse(16),
  waitForResponse(17),
  waitForResponse(18),
  waitForResponse(19),
  waitForResponse(20),
  waitForResponse(21),
  waitForResponse(22),
  waitForResponse(23),
  waitForResponse(24),
  waitForResponse(25),
]);
server.kill();
await once(server, "exit");

const failed = responses.some((response) => response.error);
const listedTools = responseById.get(2)?.result?.tools?.length ?? 0;
const listedProjects = JSON.parse(listedProjectsText).count ?? 0;
const readinessCheckText = responseById.get(5)?.result?.content?.[0]?.text ?? "{}";
const readinessCheck = JSON.parse(readinessCheckText);
const readinessCheckSlugOk = readinessCheck?.checked === 1 && Array.isArray(readinessCheck?.checks);
const readinessReport = responseById.get(6)?.result?.content?.[0]?.text ?? "";
const readinessReportOk = typeof readinessReport === "string" && readinessReport.includes("# Publish readiness report");
const argValidationOk = responseById.get(7)?.result?.isError === true;
const screenshotQueueText = responseById.get(8)?.result?.content?.[0]?.text ?? "{}";
const screenshotQueue = JSON.parse(screenshotQueueText);
const screenshotQueueOk =
  screenshotQueue?.queued >= 1 &&
  screenshotQueue?.queued === screenshotQueue?.captureReady + screenshotQueue?.blocked &&
  screenshotQueue?.queue?.every((item) =>
    typeof item.project === "string" &&
    typeof item.suggestedImage === "string" &&
    typeof item.captureReady === "boolean"
  );
const draftText = responseById.get(9)?.result?.content?.[0]?.text ?? "{}";
const draft = JSON.parse(draftText);
const draftOk =
  draft?.slug === "website-change-monitor" &&
  draft?.project?.image === "/projects/website-change-monitor.png" &&
  draft?.project?.url === "/tools/website-change-monitor" &&
  draft?.labCardSnippet?.includes('name: "Website Change Monitor"');
const requiredValidationOk = responseById.get(10)?.result?.isError === true;
const handoff = responseById.get(11)?.result?.content?.[0]?.text ?? "";
const handoffOk =
  typeof handoff === "string" &&
  handoff.includes("# Portfolio Lab publish handoff") &&
  handoff.includes("## Owner checklist") &&
  handoff.includes("npm run smoke");
const prioritiesText = responseById.get(12)?.result?.content?.[0]?.text ?? "{}";
const priorities = JSON.parse(prioritiesText);
const prioritiesOk =
  priorities?.checked === listedProjects &&
  priorities?.needsWork === priorities?.checked - priorities?.ready &&
  Array.isArray(priorities?.tasks) &&
  priorities.tasks.length === listedProjects &&
  priorities.tasks.every((task, index) =>
    task.rank === index + 1 &&
    typeof task.project === "string" &&
    typeof task.ready === "boolean" &&
    typeof task.focus === "string" &&
    Array.isArray(task.nextActions)
  );
const brief = responseById.get(13)?.result?.content?.[0]?.text ?? "";
const briefOk =
  typeof brief === "string" &&
  brief.includes("# Project publish brief:") &&
  brief.includes("## Lab card copy") &&
  brief.includes("## Files to check") &&
  brief.includes("npm run smoke");
const routesText = responseById.get(14)?.result?.content?.[0]?.text ?? "{}";
const routes = JSON.parse(routesText);
const routeValidationOk =
  routes?.checked === listedProjects &&
  routes?.local >= 1 &&
  routes?.external >= 1 &&
  routes?.missing >= 1 &&
  Array.isArray(routes?.routes) &&
  routes.routes.some((route) =>
    route.project === firstProjectName &&
    route.type === "external-url" &&
    route.status === "external-url-not-checked" &&
    route.exists === null
  ) &&
  routes.routes.some((route) =>
    route.project === "Speaking Speed Tester" &&
    route.type === "local-route" &&
    route.status === "ok" &&
    route.exists === true &&
    route.file === "app/tools/speaking-speed/page.tsx"
  ) &&
  routes.routes.some((route) => route.type === "missing-url" && route.status === "missing-url");
const digest = responseById.get(15)?.result?.content?.[0]?.text ?? "";
const digestOk =
  typeof digest === "string" &&
  digest.includes("# Portfolio Lab publish digest") &&
  digest.includes("## Inventory") &&
  digest.includes("## Coverage") &&
  digest.includes("## Current priority") &&
  digest.includes("Ready for owner review:") &&
  digest.includes("Missing screenshots:");
const copyAuditText = responseById.get(16)?.result?.content?.[0]?.text ?? "{}";
const copyAudit = JSON.parse(copyAuditText);
const copyAuditOk =
  copyAudit?.checked === listedProjects &&
  Array.isArray(copyAudit?.duplicateSlugs) &&
  Array.isArray(copyAudit?.statusesSeen) &&
  Array.isArray(copyAudit?.cards) &&
  copyAudit.cards.length === listedProjects &&
  copyAudit.cards.some((card) =>
    card.project === "Speaking Speed Tester" &&
    card.slug === "speaking-speed-tester" &&
    Array.isArray(card.warnings) &&
    card.warnings.some((warning) => warning.includes("Local route slug differs"))
  ) &&
  copyAudit.cards.every((card) =>
    typeof card.project === "string" &&
    typeof card.slug === "string" &&
    typeof card.issueCount === "number" &&
    typeof card.warningCount === "number" &&
    Array.isArray(card.issues) &&
    Array.isArray(card.warnings)
  );
const copyAuditReport = responseById.get(17)?.result?.content?.[0]?.text ?? "";
const copyAuditReportOk =
  typeof copyAuditReport === "string" &&
  copyAuditReport.includes("# Lab card copy audit report") &&
  copyAuditReport.includes("## Summary") &&
  copyAuditReport.includes("Cards with warnings:") &&
  copyAuditReport.includes("## Owner next step") &&
  copyAuditReport.includes("Speaking Speed Tester") &&
  copyAuditReport.includes("Local route slug differs");
const screenshotCapturePlan = responseById.get(18)?.result?.content?.[0]?.text ?? "";
const screenshotCapturePlanOk =
  typeof screenshotCapturePlan === "string" &&
  screenshotCapturePlan.includes("# Lab screenshot capture plan") &&
  screenshotCapturePlan.includes("## Ready to capture") &&
  screenshotCapturePlan.includes("## Blocked captures") &&
  screenshotCapturePlan.includes("Ready to capture:") &&
  screenshotCapturePlan.includes("Speaking Speed Tester") &&
  screenshotCapturePlan.includes("public/projects/speaking-speed-tester.png") &&
  screenshotCapturePlan.includes("npm run smoke");
const labCardPatchPreview = responseById.get(19)?.result?.content?.[0]?.text ?? "";
const labCardPatchPreviewOk =
  typeof labCardPatchPreview === "string" &&
  labCardPatchPreview.includes("# Lab card patch preview: Website Change Monitor") &&
  labCardPatchPreview.includes("Preview only: no files were changed.") &&
  labCardPatchPreview.includes("Target file: app/lab/page.tsx") &&
  labCardPatchPreview.includes('name: "Website Change Monitor"') &&
  labCardPatchPreview.includes("Route: app/tools/website-change-monitor/page.tsx") &&
  labCardPatchPreview.includes("Screenshot: public/projects/website-change-monitor.png") &&
  labCardPatchPreview.includes("npm run smoke");
const patchPreviewRequiredValidationOk = responseById.get(20)?.result?.isError === true;
const labCardPatchArtifactText = responseById.get(21)?.result?.content?.[0]?.text ?? "{}";
const labCardPatchArtifact = JSON.parse(labCardPatchArtifactText);
const labCardPatchArtifactOk =
  labCardPatchArtifact?.previewOnly === true &&
  labCardPatchArtifact?.targetFile === "app/lab/page.tsx" &&
  labCardPatchArtifact?.insertionHint?.includes("projects") &&
  labCardPatchArtifact?.labCard?.name === "Website Change Monitor" &&
  labCardPatchArtifact?.labCard?.image === "/projects/website-change-monitor.png" &&
  labCardPatchArtifact?.labCardSnippet?.includes('name: "Website Change Monitor"') &&
  labCardPatchArtifact?.unifiedDiff?.includes("--- a/app/lab/page.tsx") &&
  labCardPatchArtifact?.unifiedDiff?.includes("+++ b/app/lab/page.tsx") &&
  /^@@ -\d+,1 \+\d+,8 @@$/m.test(labCardPatchArtifact?.unifiedDiff ?? "") &&
  labCardPatchArtifact?.unifiedDiff?.includes('+    name: "Website Change Monitor",') &&
  labCardPatchArtifact?.filesToPrepare?.some((file) =>
    file.type === "route" && file.file === "app/tools/website-change-monitor/page.tsx"
  ) &&
  labCardPatchArtifact?.filesToPrepare?.some((file) =>
    file.type === "screenshot" && file.file === "public/projects/website-change-monitor.png"
  ) &&
  labCardPatchArtifact?.ownerNextStep?.includes("Review the generated diff") &&
  labCardPatchArtifact?.verificationCommand === "cd portfolio-publisher-mcp && npm run smoke";
const patchArtifactRequiredValidationOk = responseById.get(22)?.result?.isError === true;
const labCardPatchValidationText = responseById.get(23)?.result?.content?.[0]?.text ?? "{}";
const labCardPatchValidation = JSON.parse(labCardPatchValidationText);
const labCardPatchValidationOk =
  labCardPatchValidation?.previewOnly === true &&
  labCardPatchValidation?.applyStatus === "needs-prep" &&
  labCardPatchValidation?.readyToApply === true &&
  labCardPatchValidation?.publishReadyAfterApply === false &&
  labCardPatchValidation?.targetFile === "app/lab/page.tsx" &&
  labCardPatchValidation?.slug === "website-change-monitor" &&
  Number.isInteger(labCardPatchValidation?.insertionLine) &&
  Array.isArray(labCardPatchValidation?.blockingIssues) &&
  labCardPatchValidation.blockingIssues.length === 0 &&
  labCardPatchValidation?.readinessBlockers?.some((blocker) =>
    blocker.includes("Local route file not found: app/tools/website-change-monitor/page.tsx")
  ) &&
  labCardPatchValidation?.readinessBlockers?.some((blocker) =>
    blocker.includes("Screenshot file not found: public/projects/website-change-monitor.png")
  ) &&
  labCardPatchValidation?.filesToPrepare?.some((file) =>
    file.type === "route" && file.file === "app/tools/website-change-monitor/page.tsx"
  ) &&
  labCardPatchValidation?.route?.status === "missing-route-file" &&
  labCardPatchValidation?.asset?.status === "missing-file" &&
  labCardPatchValidation?.unifiedDiff?.includes('+    name: "Website Change Monitor",') &&
  labCardPatchValidation?.ownerNextStep?.includes("Create the listed route/screenshot files") &&
  labCardPatchValidation?.verificationCommand === "cd portfolio-publisher-mcp && npm run smoke";
const patchValidationRequiredValidationOk = responseById.get(24)?.result?.isError === true;
const duplicatePatchValidationText = responseById.get(25)?.result?.content?.[0]?.text ?? "{}";
const duplicatePatchValidation = JSON.parse(duplicatePatchValidationText);
const duplicatePatchValidationOk =
  duplicatePatchValidation?.applyStatus === "blocked" &&
  duplicatePatchValidation?.readyToApply === false &&
  duplicatePatchValidation?.publishReadyAfterApply === false &&
  duplicatePatchValidation?.blockingIssues?.some((issue) => issue.includes("slug already exists")) &&
  duplicatePatchValidation?.blockingIssues?.some((issue) => issue.includes("name already exists")) &&
  duplicatePatchValidation?.ownerNextStep?.includes("Fix the blocking issues");

console.log(JSON.stringify({
  failed,
  responses: responseById.size,
  listedTools,
  listedProjects,
  readinessCheckSlugOk,
  readinessReportOk,
  argValidationOk,
  screenshotQueueOk,
  draftOk,
  requiredValidationOk,
  handoffOk,
  prioritiesOk,
  briefOk,
  routeValidationOk,
  digestOk,
  copyAuditOk,
  copyAuditReportOk,
  screenshotCapturePlanOk,
  labCardPatchPreviewOk,
  patchPreviewRequiredValidationOk,
  labCardPatchArtifactOk,
  patchArtifactRequiredValidationOk,
  labCardPatchValidationOk,
  patchValidationRequiredValidationOk,
  duplicatePatchValidationOk,
}, null, 2));

if (
  failed ||
  listedTools < 1 ||
  listedProjects < 1 ||
  !readinessCheckSlugOk ||
  !readinessReportOk ||
  !argValidationOk ||
  !screenshotQueueOk ||
  !draftOk ||
  !requiredValidationOk ||
  !handoffOk ||
  !prioritiesOk ||
  !briefOk ||
  !routeValidationOk ||
  !digestOk ||
  !copyAuditOk ||
  !copyAuditReportOk ||
  !screenshotCapturePlanOk ||
  !labCardPatchPreviewOk ||
  !patchPreviewRequiredValidationOk ||
  !labCardPatchArtifactOk ||
  !patchArtifactRequiredValidationOk ||
  !labCardPatchValidationOk ||
  !patchValidationRequiredValidationOk ||
  !duplicatePatchValidationOk
) {
  process.exitCode = 1;
}
