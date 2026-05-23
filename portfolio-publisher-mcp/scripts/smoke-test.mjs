import { spawn } from "node:child_process";
import { once } from "node:events";
import readline from "node:readline";

const server = spawn(process.execPath, ["src/server.mjs"], {
  cwd: new URL("..", import.meta.url),
  stdio: ["pipe", "pipe", "inherit"],
});

const rl = readline.createInterface({ input: server.stdout });
const responses = [];
rl.on("line", (line) => responses.push(JSON.parse(line)));

function send(id, method, params = {}) {
  server.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
}

send(1, "initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "smoke-test", version: "0.1.0" },
});
send(2, "tools/list");
send(3, "tools/call", { name: "list_lab_projects", arguments: {} });
send(4, "tools/call", { name: "validate_lab_assets", arguments: {} });
send(5, "tools/call", { name: "publish_readiness_report", arguments: {} });
send(6, "tools/call", { name: "list_lab_projects", arguments: { extra: true } });

const deadline = Date.now() + 2000;
while (responses.length < 6 && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 50));
}
server.kill();
await once(server, "exit");

const failed = responses.some((response) => response.error);
const listedTools = responses.find((response) => response.id === 2)?.result?.tools?.length ?? 0;
const listedProjects = JSON.parse(
  responses.find((response) => response.id === 3)?.result?.content?.[0]?.text ?? "{}"
).count;
const readinessReport = responses.find((response) => response.id === 5)?.result?.content?.[0]?.text ?? "";
const readinessReportOk = typeof readinessReport === "string" && readinessReport.includes("# Publish readiness report");
const argValidationOk = responses.find((response) => response.id === 6)?.result?.isError === true;

console.log(JSON.stringify({
  failed,
  responses: responses.length,
  listedTools,
  listedProjects,
  readinessReportOk,
  argValidationOk,
}, null, 2));

if (failed || listedTools < 1 || listedProjects < 1 || !readinessReportOk || !argValidationOk) {
  process.exitCode = 1;
}
