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
send(26, "tools/call", {
  name: "validate_lab_card_patch_artifact",
  arguments: {
    name: "Website Change Monitor",
    tagline: "Weekly website screenshot diff report",
    icon: "PromptGradeIcon",
  },
});
send(27, "tools/call", { name: "inspect_lab_thumbnail_icons", arguments: {} });
send(28, "tools/call", { name: "create_lab_thumbnail_icon_report", arguments: {} });
send(29, "tools/call", {
  name: "stage_lab_card_patch_artifact",
  arguments: {
    name: "Website Change Monitor",
    tagline: "Weekly website screenshot diff report",
  },
});
send(30, "tools/call", {
  name: "validate_staged_lab_card_patch",
  arguments: {},
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
  waitForResponse(26),
  waitForResponse(27),
  waitForResponse(28),
  waitForResponse(29),
  waitForResponse(30),
]);
send(31, "tools/call", {
  name: "validate_staged_lab_card_patch",
  arguments: { projectName: "Never Staged Project" },
});
send(32, "tools/call", {
  name: "apply_staged_lab_card_patch",
  arguments: {
    projectName: "Never Staged Project",
    reviewToken: "0".repeat(64),
    confirm: false,
  },
});
send(33, "tools/call", {
  name: "discard_staged_lab_card_patch",
  arguments: { projectName: "Never Staged Project", confirm: false },
});
send(34, "tools/call", { name: "list_staged_lab_card_patches", arguments: {} });
send(35, "tools/call", { name: "list_staged_lab_card_patches", arguments: { extra: true } });
send(36, "tools/call", {
  name: "rehearse_staged_lab_card_publish",
  arguments: { projectName: "Never Staged Project" },
});
send(37, "tools/call", { name: "rehearse_staged_lab_card_publish", arguments: {} });
send(38, "tools/call", {
  name: "list_staged_lab_card_patches",
  arguments: { status: "stale", reason: "source-drift" },
});
send(39, "tools/call", {
  name: "list_staged_lab_card_patches",
  arguments: { status: "unknown" },
});
send(40, "tools/call", {
  name: "list_staged_lab_card_patches",
  arguments: { limit: 1 },
});
send(41, "tools/call", {
  name: "list_staged_lab_card_patches",
  arguments: { limit: 0 },
});
send(42, "tools/call", {
  name: "create_staged_lab_card_review_report",
  arguments: { status: "ready", limit: 1 },
});
send(43, "tools/call", {
  name: "create_staged_lab_card_review_report",
  arguments: { limit: 0 },
});
send(44, "tools/call", {
  name: "list_staged_lab_card_patches",
  arguments: { publishReadyAfterApply: true, limit: 1 },
});
send(45, "tools/call", {
  name: "create_staged_lab_card_review_report",
  arguments: { publishReadyAfterApply: "true" },
});
send(46, "tools/call", {
  name: "select_next_staged_lab_card_publish",
  arguments: {},
});
send(47, "tools/call", {
  name: "select_next_staged_lab_card_publish",
  arguments: { extra: true },
});
send(48, "tools/call", {
  name: "create_next_staged_lab_card_publish_packet",
  arguments: {},
});
send(49, "tools/call", {
  name: "create_next_staged_lab_card_publish_packet",
  arguments: { extra: true },
});
await Promise.all([
  waitForResponse(31),
  waitForResponse(32),
  waitForResponse(33),
  waitForResponse(34),
  waitForResponse(35),
  waitForResponse(36),
  waitForResponse(37),
  waitForResponse(38),
  waitForResponse(39),
  waitForResponse(40),
  waitForResponse(41),
  waitForResponse(42),
  waitForResponse(43),
  waitForResponse(44),
  waitForResponse(45),
  waitForResponse(46),
  waitForResponse(47),
  waitForResponse(48),
  waitForResponse(49),
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
  draft?.project?.icon === "WebsiteChangeMonitorIcon" &&
  draft?.suggestedIcon === "WebsiteChangeMonitorIcon" &&
  draft?.labCardSnippet?.includes('name: "Website Change Monitor"') &&
  draft?.labCardSnippet?.includes("Icon: WebsiteChangeMonitorIcon,") &&
  draft?.warnings?.some((warning) => warning.includes("Lab thumbnail icon"));
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
  labCardPatchPreview.includes("Icon: WebsiteChangeMonitorIcon,") &&
  labCardPatchPreview.includes("Route: app/tools/website-change-monitor/page.tsx") &&
  labCardPatchPreview.includes("Screenshot: public/projects/website-change-monitor.png") &&
  labCardPatchPreview.includes("Icon component: app/components/LabThumbnails.tsx export WebsiteChangeMonitorIcon") &&
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
  labCardPatchArtifact?.labCard?.icon === "WebsiteChangeMonitorIcon" &&
  labCardPatchArtifact?.labCardSnippet?.includes('name: "Website Change Monitor"') &&
  labCardPatchArtifact?.labCardSnippet?.includes("Icon: WebsiteChangeMonitorIcon,") &&
  labCardPatchArtifact?.unifiedDiff?.includes("--- a/app/lab/page.tsx") &&
  labCardPatchArtifact?.unifiedDiff?.includes("+++ b/app/lab/page.tsx") &&
  /^@@ -\d+,1 \+\d+,9 @@$/m.test(labCardPatchArtifact?.unifiedDiff ?? "") &&
  labCardPatchArtifact?.unifiedDiff?.includes('+    name: "Website Change Monitor",') &&
  labCardPatchArtifact?.unifiedDiff?.includes("+    Icon: WebsiteChangeMonitorIcon,") &&
  labCardPatchArtifact?.filesToPrepare?.some((file) =>
    file.type === "route" && file.file === "app/tools/website-change-monitor/page.tsx"
  ) &&
  labCardPatchArtifact?.filesToPrepare?.some((file) =>
    file.type === "screenshot" && file.file === "public/projects/website-change-monitor.png"
  ) &&
  labCardPatchArtifact?.filesToPrepare?.some((file) =>
    file.type === "icon" &&
    file.file === "app/components/LabThumbnails.tsx" &&
    file.symbol === "WebsiteChangeMonitorIcon"
  ) &&
  labCardPatchArtifact?.warnings?.some((warning) => warning.includes("Lab thumbnail icon")) &&
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
  labCardPatchValidation?.readinessBlockers?.some((blocker) =>
    blocker.includes("Lab thumbnail icon is not currently imported on the Lab page: WebsiteChangeMonitorIcon")
  ) &&
  labCardPatchValidation?.filesToPrepare?.some((file) =>
    file.type === "route" && file.file === "app/tools/website-change-monitor/page.tsx"
  ) &&
  labCardPatchValidation?.filesToPrepare?.some((file) =>
    file.type === "icon" &&
    file.file === "app/components/LabThumbnails.tsx" &&
    file.symbol === "WebsiteChangeMonitorIcon"
  ) &&
  labCardPatchValidation?.icon?.name === "WebsiteChangeMonitorIcon" &&
  labCardPatchValidation?.icon?.required === true &&
  labCardPatchValidation?.icon?.validIdentifier === true &&
  labCardPatchValidation?.icon?.availableOnLabPage === false &&
  labCardPatchValidation?.route?.status === "missing-route-file" &&
  labCardPatchValidation?.asset?.status === "missing-file" &&
  labCardPatchValidation?.unifiedDiff?.includes('+    name: "Website Change Monitor",') &&
  labCardPatchValidation?.ownerNextStep?.includes("Create the listed route/screenshot/icon files") &&
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
const existingIconPatchValidationText = responseById.get(26)?.result?.content?.[0]?.text ?? "{}";
const existingIconPatchValidation = JSON.parse(existingIconPatchValidationText);
const existingIconPatchValidationOk =
  existingIconPatchValidation?.applyStatus === "needs-prep" &&
  existingIconPatchValidation?.readyToApply === true &&
  existingIconPatchValidation?.labCard?.icon === "PromptGradeIcon" &&
  existingIconPatchValidation?.icon?.name === "PromptGradeIcon" &&
  existingIconPatchValidation?.icon?.availableOnLabPage === true &&
  !existingIconPatchValidation?.readinessBlockers?.some((blocker) =>
    blocker.includes("Lab thumbnail icon is not currently imported")
  );
const iconInventoryText = responseById.get(27)?.result?.content?.[0]?.text ?? "{}";
const iconInventory = JSON.parse(iconInventoryText);
const iconInventoryOk =
  iconInventory?.checkedProjects === listedProjects &&
  iconInventory?.ready === true &&
  iconInventory?.sourceFiles?.labPage === "app/lab/page.tsx" &&
  iconInventory?.sourceFiles?.thumbnails === "app/components/LabThumbnails.tsx" &&
  iconInventory?.counts?.used === listedProjects &&
  iconInventory?.counts?.imported === listedProjects &&
  iconInventory?.counts?.exported === listedProjects &&
  iconInventory?.counts?.missingImports === 0 &&
  iconInventory?.counts?.missingExports === 0 &&
  iconInventory?.counts?.unusedImports === 0 &&
  iconInventory?.counts?.unusedExports === 0 &&
  iconInventory?.usedIcons?.includes("PromptGradeIcon") &&
  iconInventory?.importedIcons?.includes("SpeakingSpeedIcon") &&
  iconInventory?.exportedIcons?.includes("CvTailoringIcon") &&
  Array.isArray(iconInventory?.cards) &&
  iconInventory.cards.length === listedProjects &&
  iconInventory.cards.every((card) =>
    typeof card.project === "string" &&
    typeof card.icon === "string" &&
    card.imported === true &&
    card.exported === true &&
    card.status === "ok"
  );
const iconReport = responseById.get(28)?.result?.content?.[0]?.text ?? "";
const iconReportOk =
  typeof iconReport === "string" &&
  iconReport.includes("# Lab thumbnail icon report") &&
  iconReport.includes("## Summary") &&
  iconReport.includes("## Card coverage") &&
  iconReport.includes("PromptGrade: PromptGradeIcon (ok)") &&
  iconReport.includes("Current Lab card icons are imported and exported.") &&
  iconReport.includes("No unused Lab thumbnail imports or exports found.") &&
  iconReport.includes("npm run smoke");
const stagedPatchBlockedText = responseById.get(29)?.result?.content?.[0]?.text ?? "{}";
const stagedPatchBlocked = JSON.parse(stagedPatchBlockedText);
const stagedPatchBlockedOk =
  stagedPatchBlocked?.staged === false &&
  stagedPatchBlocked?.applyStatus === "needs-prep" &&
  stagedPatchBlocked?.readyToApply === true &&
  stagedPatchBlocked?.publishReadyAfterApply === false &&
  stagedPatchBlocked?.requiredOptIn?.includes("allowNeedsPrep") &&
  stagedPatchBlocked?.readinessBlockers?.some((blocker) =>
    blocker.includes("Lab thumbnail icon is not currently imported")
  );
const stagedPatchValidationRequiredOk = responseById.get(30)?.result?.isError === true;
const missingStagedPatchText = responseById.get(31)?.result?.content?.[0]?.text ?? "{}";
const missingStagedPatch = JSON.parse(missingStagedPatchText);
const missingStagedPatchOk =
  missingStagedPatch?.status === "missing" &&
  missingStagedPatch?.reviewReady === false &&
  missingStagedPatch?.patchFile === "portfolio-publisher-mcp/generated/never-staged-project-lab-card.patch" &&
  missingStagedPatch?.issues?.some((issue) => issue.includes("missing"));
const unconfirmedApply = JSON.parse(responseById.get(32)?.result?.content?.[0]?.text ?? "{}");
const unconfirmedApplyOk =
  unconfirmedApply?.applied === false &&
  unconfirmedApply?.status === "confirmation-required";
const unconfirmedDiscard = JSON.parse(responseById.get(33)?.result?.content?.[0]?.text ?? "{}");
const unconfirmedDiscardOk =
  unconfirmedDiscard?.discarded === false &&
  unconfirmedDiscard?.status === "confirmation-required";
const stagedInventory = JSON.parse(responseById.get(34)?.result?.content?.[0]?.text ?? "{}");
const stagedInventoryArgValidationOk = responseById.get(35)?.result?.isError === true;
const stagedInventoryOk =
  Number.isInteger(stagedInventory?.checked) &&
  Number.isInteger(stagedInventory?.returned) &&
  Number.isInteger(stagedInventory?.complete) &&
  Number.isInteger(stagedInventory?.incomplete) &&
  stagedInventory?.checked === stagedInventory?.complete + stagedInventory?.incomplete &&
  stagedInventory?.returned === stagedInventory?.items?.length &&
  stagedInventory?.pagination?.limit === null &&
  stagedInventory?.pagination?.cursor === null &&
  stagedInventory?.pagination?.nextCursor === null &&
  stagedInventory?.pagination?.hasMore === false &&
  Number.isInteger(stagedInventory?.reviewReady) &&
  Number.isInteger(stagedInventory?.publishReady) &&
  ["source-drift", "already-applied"].every((reason) =>
    Number.isInteger(stagedInventory?.reasonCounts?.stale?.[reason])
  ) &&
  ["artifact-integrity", "invalid-project-name", "missing-handoff-title"].every((reason) =>
    Number.isInteger(stagedInventory?.reasonCounts?.invalid?.[reason])
  ) &&
  ["missing-patch", "missing-handoff"].every((reason) =>
    Number.isInteger(stagedInventory?.reasonCounts?.incomplete?.[reason])
  ) &&
  Array.isArray(stagedInventory?.items) &&
  stagedInventory.items.length === stagedInventory.checked &&
  stagedInventory.items.every((item, index, items) =>
    index === 0 || items[index - 1].slug.localeCompare(item.slug) <= 0
  );
const missingRehearsal = JSON.parse(responseById.get(36)?.result?.content?.[0]?.text ?? "{}");
const missingRehearsalOk =
  missingRehearsal?.previewOnly === true &&
  missingRehearsal?.sourceFilesChanged === false &&
  missingRehearsal?.rehearsalStatus === "missing" &&
  missingRehearsal?.reviewReady === false &&
  missingRehearsal?.publishReadyAfterApply === false &&
  missingRehearsal?.issues?.some((issue) => issue.includes("missing"));
const rehearsalArgValidationOk = responseById.get(37)?.result?.isError === true;
const filteredStagedInventory = JSON.parse(responseById.get(38)?.result?.content?.[0]?.text ?? "{}");
const filteredStagedInventoryOk =
  filteredStagedInventory?.filters?.status === "stale" &&
  filteredStagedInventory?.filters?.reason === "source-drift" &&
  Number.isInteger(filteredStagedInventory?.totalChecked) &&
  filteredStagedInventory?.returned === filteredStagedInventory?.items?.length &&
  filteredStagedInventory?.items?.every((item) =>
    item.status === "stale" && item.staleReason === "source-drift" && !("reviewToken" in item)
  );
const stagedInventoryEnumValidationOk = responseById.get(39)?.result?.isError === true;
const pagedStagedInventory = JSON.parse(responseById.get(40)?.result?.content?.[0]?.text ?? "{}");
const pagedStagedInventoryOk =
  pagedStagedInventory?.pagination?.limit === 1 &&
  pagedStagedInventory?.pagination?.cursor === null &&
  typeof pagedStagedInventory?.pagination?.hasMore === "boolean" &&
  pagedStagedInventory?.returned === pagedStagedInventory?.items?.length &&
  pagedStagedInventory?.items?.length <= 1 &&
  (pagedStagedInventory?.pagination?.hasMore === false ||
    pagedStagedInventory?.pagination?.nextCursor === pagedStagedInventory?.items?.at(-1)?.slug) &&
  pagedStagedInventory?.items?.every((item) => !("reviewToken" in item));
const stagedInventoryLimitValidationOk = responseById.get(41)?.result?.isError === true;
const stagedReviewReport = JSON.parse(responseById.get(42)?.result?.content?.[0]?.text ?? "{}");
const stagedReviewReportOk =
  stagedReviewReport?.format === "markdown" &&
  stagedReviewReport?.sourceFilesChanged === false &&
  stagedReviewReport?.filters?.status === "ready" &&
  stagedReviewReport?.pagination?.limit === 1 &&
  stagedReviewReport?.returned <= 1 &&
  stagedReviewReport?.markdown?.startsWith("# Staged Lab card review report") &&
  !stagedReviewReport?.markdown?.includes("reviewToken");
const stagedReviewReportValidationOk = responseById.get(43)?.result?.isError === true;
const publishReadyStagedInventory = JSON.parse(responseById.get(44)?.result?.content?.[0]?.text ?? "{}");
const publishReadyStagedInventoryOk =
  publishReadyStagedInventory?.filters?.publishReadyAfterApply === true &&
  publishReadyStagedInventory?.pagination?.limit === 1 &&
  publishReadyStagedInventory?.items?.every((item) =>
    item.publishReadyAfterApply === true && !("reviewToken" in item)
  );
const stagedReviewReportReadinessValidationOk = responseById.get(45)?.result?.isError === true;
const nextStagedPublish = JSON.parse(responseById.get(46)?.result?.content?.[0]?.text ?? "{}");
const nextStagedPublishOk =
  ["empty", "ready"].includes(nextStagedPublish?.selectionStatus) &&
  nextStagedPublish?.sourceFilesChanged === false &&
  nextStagedPublish?.reviewTokenIssued === false &&
  Number.isInteger(nextStagedPublish?.totalChecked) &&
  Number.isInteger(nextStagedPublish?.publishReadyQueued) &&
  !/"reviewToken"\s*:/.test(JSON.stringify(nextStagedPublish)) &&
  (nextStagedPublish.selectionStatus === "empty"
    ? nextStagedPublish.selected === null && nextStagedPublish.rehearsal === null
    : nextStagedPublish.selected?.publishReadyAfterApply === true &&
      nextStagedPublish.rehearsal?.rehearsalStatus === "ready");
const nextStagedPublishArgValidationOk = responseById.get(47)?.result?.isError === true;
const nextStagedPublishPacket = JSON.parse(responseById.get(48)?.result?.content?.[0]?.text ?? "{}");
const nextStagedPublishPacketOk =
  nextStagedPublishPacket?.format === "markdown" &&
  ["empty", "ready"].includes(nextStagedPublishPacket?.selectionStatus) &&
  nextStagedPublishPacket?.sourceFilesChanged === false &&
  nextStagedPublishPacket?.reviewTokenIssued === false &&
  Number.isInteger(nextStagedPublishPacket?.totalChecked) &&
  Number.isInteger(nextStagedPublishPacket?.publishReadyQueued) &&
  Array.isArray(nextStagedPublishPacket?.reviewFiles) &&
  (nextStagedPublishPacket.selectionStatus === "empty"
    ? nextStagedPublishPacket.reviewFiles.length === 0 && nextStagedPublishPacket.allReviewFilesExist === false
    : nextStagedPublishPacket.reviewFiles.length >= 5 &&
      nextStagedPublishPacket.reviewFiles.every((file) => file.exists === true) &&
      nextStagedPublishPacket.allReviewFilesExist === true) &&
  nextStagedPublishPacket?.markdown?.includes("# Lab card publish packet") &&
  !/reviewToken|[a-f0-9]{64}/.test(nextStagedPublishPacket?.markdown ?? "") &&
  !/"reviewToken"\s*:/.test(JSON.stringify(nextStagedPublishPacket));
const nextStagedPublishPacketArgValidationOk = responseById.get(49)?.result?.isError === true;

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
  existingIconPatchValidationOk,
  iconInventoryOk,
  iconReportOk,
  stagedPatchBlockedOk,
  stagedPatchValidationRequiredOk,
  missingStagedPatchOk,
  unconfirmedApplyOk,
  unconfirmedDiscardOk,
  stagedInventoryOk,
  stagedInventoryArgValidationOk,
  missingRehearsalOk,
  rehearsalArgValidationOk,
  filteredStagedInventoryOk,
  stagedInventoryEnumValidationOk,
  pagedStagedInventoryOk,
  stagedInventoryLimitValidationOk,
  stagedReviewReportOk,
  stagedReviewReportValidationOk,
  publishReadyStagedInventoryOk,
  stagedReviewReportReadinessValidationOk,
  nextStagedPublishOk,
  nextStagedPublishArgValidationOk,
  nextStagedPublishPacketOk,
  nextStagedPublishPacketArgValidationOk,
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
  !duplicatePatchValidationOk ||
  !existingIconPatchValidationOk ||
  !iconInventoryOk ||
  !iconReportOk ||
  !stagedPatchBlockedOk ||
  !stagedPatchValidationRequiredOk ||
  !missingStagedPatchOk
  || !unconfirmedApplyOk
  || !unconfirmedDiscardOk
  || !stagedInventoryOk
  || !stagedInventoryArgValidationOk
  || !missingRehearsalOk
  || !rehearsalArgValidationOk
  || !filteredStagedInventoryOk
  || !stagedInventoryEnumValidationOk
  || !pagedStagedInventoryOk
  || !stagedInventoryLimitValidationOk
  || !stagedReviewReportOk
  || !stagedReviewReportValidationOk
  || !publishReadyStagedInventoryOk
  || !stagedReviewReportReadinessValidationOk
  || !nextStagedPublishOk
  || !nextStagedPublishArgValidationOk
  || !nextStagedPublishPacketOk
  || !nextStagedPublishPacketArgValidationOk
) {
  process.exitCode = 1;
}
