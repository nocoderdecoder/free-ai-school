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

await Promise.all([waitForResponse(7), waitForResponse(8), waitForResponse(9), waitForResponse(10)]);
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
  !requiredValidationOk
) {
  process.exitCode = 1;
}
