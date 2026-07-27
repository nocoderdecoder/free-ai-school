import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function writeFixture(repoRoot) {
  const labPage = path.join(repoRoot, "app", "lab", "page.tsx");
  const thumbnails = path.join(repoRoot, "app", "components", "LabThumbnails.tsx");
  await Promise.all([
    fs.mkdir(path.dirname(labPage), { recursive: true }),
    fs.mkdir(path.dirname(thumbnails), { recursive: true }),
    fs.mkdir(path.join(repoRoot, "portfolio-publisher-mcp", "generated"), { recursive: true }),
    fs.mkdir(path.join(repoRoot, "public", "projects"), { recursive: true }),
  ]);
  await fs.writeFile(
    labPage,
    [
      'import { FixtureIcon } from "../components/LabThumbnails";',
      "",
      "const projects = [",
      "];",
      "",
      "export default function LabPage() {",
      "  return projects.length;",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    thumbnails,
    "export function FixtureIcon() { return null; }\n",
    "utf8",
  );
  return labPage;
}

function createClient(repoRoot) {
  const server = spawn(process.execPath, ["src/server.mjs"], {
    cwd: projectDir,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORTFOLIO_PUBLISHER_TEST_REPO_ROOT: repoRoot,
    },
    stdio: ["pipe", "pipe", "inherit"],
  });
  const responses = new Map();
  const waiting = new Map();
  const lines = readline.createInterface({ input: server.stdout });
  lines.on("line", (line) => {
    const response = JSON.parse(line);
    responses.set(response.id, response);
    waiting.get(response.id)?.(response);
    waiting.delete(response.id);
  });
  let nextId = 1;

  return {
    server,
    async call(name, args) {
      const id = nextId++;
      server.stdin.write(`${JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name, arguments: args },
      })}\n`);
      const response = responses.get(id) ?? await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timed out waiting for response ${id}`)), 2_000);
        waiting.set(id, (value) => {
          clearTimeout(timeout);
          resolve(value);
        });
      });
      assert.equal(response.error, undefined);
      return JSON.parse(response.result.content[0].text);
    },
    async close() {
      server.kill();
      await once(server, "exit");
      lines.close();
    },
  };
}

async function listApplyArtifacts(labPage) {
  const entries = await fs.readdir(path.dirname(labPage));
  return entries.filter((name) => name.includes(".portfolio-publisher"));
}

test("controlled apply cleans up after prep rejection and successful apply", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-publisher-mcp-"));
  const labPage = await writeFixture(repoRoot);
  const originalSource = await fs.readFile(labPage, "utf8");
  const client = createClient(repoRoot);
  t.after(async () => {
    await client.close();
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  const projectName = "Hermetic Fixture";
  const stage = await client.call("stage_lab_card_patch_artifact", {
    name: projectName,
    tagline: "Proves controlled apply cleanup",
    url: "https://example.com/hermetic-fixture",
    image: "/projects/hermetic-fixture.png",
    icon: "FixtureIcon",
    allowNeedsPrep: true,
  });
  assert.equal(stage.staged, true);

  const validation = await client.call("validate_staged_lab_card_patch", { projectName });
  assert.equal(validation.status, "ready");
  assert.match(validation.reviewToken, /^[a-f0-9]{64}$/);

  const blocked = await client.call("apply_staged_lab_card_patch", {
    projectName,
    reviewToken: validation.reviewToken,
    confirm: true,
  });
  assert.equal(blocked.status, "prep-required");
  assert.equal(await fs.readFile(labPage, "utf8"), originalSource);
  assert.deepEqual(await listApplyArtifacts(labPage), []);

  await fs.writeFile(
    path.join(repoRoot, "public", "projects", "hermetic-fixture.png"),
    "fixture",
    "utf8",
  );
  const applied = await client.call("apply_staged_lab_card_patch", {
    projectName,
    reviewToken: validation.reviewToken,
    confirm: true,
  });
  assert.equal(applied.status, "applied");
  assert.equal(applied.readinessVerifiedUnderLock, true);
  assert.match(await fs.readFile(labPage, "utf8"), /name: "Hermetic Fixture"/);
  assert.deepEqual(await listApplyArtifacts(labPage), []);
});
