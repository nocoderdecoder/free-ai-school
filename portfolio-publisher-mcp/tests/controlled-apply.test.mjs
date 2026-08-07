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

async function createFixtureClient(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-publisher-mcp-"));
  const labPage = await writeFixture(repoRoot);
  const client = createClient(repoRoot);
  t.after(async () => {
    await client.close();
    await fs.rm(repoRoot, { recursive: true, force: true });
  });
  return { repoRoot, labPage, client };
}

test("controlled apply cleans up after prep rejection and successful apply", async (t) => {
  const { repoRoot, labPage, client } = await createFixtureClient(t);
  const originalSource = await fs.readFile(labPage, "utf8");

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
  assert.equal(validation.staleReason, null);
  assert.equal(validation.invalidReason, null);
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

test("staged validation rejects structural and content tampering", async (t) => {
  const { repoRoot, client } = await createFixtureClient(t);
  const projectName = "Tamper Fixture";
  const stage = await client.call("stage_lab_card_patch_artifact", {
    name: projectName,
    tagline: "Original reviewed copy",
    url: "https://example.com/tamper-fixture",
    image: "/projects/tamper-fixture.png",
    icon: "FixtureIcon",
    allowNeedsPrep: true,
  });
  const patchPath = path.join(repoRoot, stage.patchFile);
  const originalPatch = await fs.readFile(patchPath, "utf8");

  await fs.writeFile(
    patchPath,
    `${originalPatch}@@ -1,1 +1,1 @@\n-import { FixtureIcon } from "../components/LabThumbnails";\n+import { CompromisedIcon } from "../components/LabThumbnails";\n`,
    "utf8",
  );
  const structuralTamper = await client.call("validate_staged_lab_card_patch", { projectName });
  assert.equal(structuralTamper.status, "invalid");
  assert.equal(structuralTamper.staleReason, null);
  assert.equal(structuralTamper.invalidReason, "artifact-integrity");
  assert.equal(structuralTamper.reviewReady, false);
  assert.ok(structuralTamper.issues.some((issue) => issue.includes("exactly one projects-array hunk")));
  assert.ok(structuralTamper.issues.some((issue) => issue.includes("does not exactly match")));

  await fs.writeFile(
    patchPath,
    originalPatch.replace("Original reviewed copy", "Unexpected altered copy"),
    "utf8",
  );
  const contentTamper = await client.call("validate_staged_lab_card_patch", { projectName });
  assert.equal(contentTamper.status, "invalid");
  assert.equal(contentTamper.invalidReason, "artifact-integrity");
  assert.equal(contentTamper.reviewReady, false);
  assert.ok(contentTamper.issues.some((issue) => issue.includes("does not exactly match")));
});

test("controlled apply rejects contention, mismatched tokens, and replay", async (t) => {
  const { repoRoot, labPage, client } = await createFixtureClient(t);
  const projectName = "Lock Fixture";
  await client.call("stage_lab_card_patch_artifact", {
    name: projectName,
    tagline: "Proves the single-writer boundary",
    url: "https://example.com/lock-fixture",
    image: "/projects/lock-fixture.png",
    icon: "FixtureIcon",
    allowNeedsPrep: true,
  });
  const validation = await client.call("validate_staged_lab_card_patch", { projectName });
  const lockPath = `${labPage}.portfolio-publisher.lock`;
  await fs.writeFile(lockPath, "test lock", "utf8");

  const locked = await client.call("apply_staged_lab_card_patch", {
    projectName,
    reviewToken: validation.reviewToken,
    confirm: true,
  });
  assert.equal(locked.status, "apply-locked");
  assert.equal(locked.applied, false);
  await fs.rm(lockPath);

  const mismatch = await client.call("apply_staged_lab_card_patch", {
    projectName,
    reviewToken: "0".repeat(64),
    confirm: true,
  });
  assert.equal(mismatch.status, "token-mismatch");
  assert.equal(mismatch.applied, false);

  await fs.writeFile(path.join(repoRoot, "public", "projects", "lock-fixture.png"), "fixture", "utf8");
  const applied = await client.call("apply_staged_lab_card_patch", {
    projectName,
    reviewToken: validation.reviewToken,
    confirm: true,
  });
  assert.equal(applied.status, "applied");
  assert.equal(applied.applied, true);

  const replay = await client.call("apply_staged_lab_card_patch", {
    projectName,
    reviewToken: validation.reviewToken,
    confirm: true,
  });
  assert.equal(replay.status, "stale");
  assert.equal(replay.applied, false);
  assert.deepEqual(await listApplyArtifacts(labPage), []);
});

test("rehearsal is read-only and discard only removes the staged pair", async (t) => {
  const { repoRoot, labPage, client } = await createFixtureClient(t);
  const projectName = "Lifecycle Fixture";
  const stage = await client.call("stage_lab_card_patch_artifact", {
    name: projectName,
    tagline: "Proves rehearsal and discard safety",
    url: "https://example.com/lifecycle-fixture",
    image: "/projects/lifecycle-fixture.png",
    icon: "FixtureIcon",
    allowNeedsPrep: true,
  });
  const patchPath = path.join(repoRoot, stage.patchFile);
  const handoffPath = path.join(repoRoot, stage.handoffFile);
  const before = await Promise.all([
    fs.readFile(labPage, "utf8"),
    fs.readFile(patchPath, "utf8"),
    fs.readFile(handoffPath, "utf8"),
  ]);

  const needsPrep = await client.call("rehearse_staged_lab_card_publish", { projectName });
  assert.equal(needsPrep.rehearsalStatus, "needs-prep");
  assert.equal(needsPrep.previewOnly, true);
  assert.equal(needsPrep.sourceFilesChanged, false);
  assert.ok(needsPrep.readinessBlockers.some((blocker) => blocker.includes("Screenshot file not found")));

  await fs.writeFile(
    path.join(repoRoot, "public", "projects", "lifecycle-fixture.png"),
    "fixture",
    "utf8",
  );
  const ready = await client.call("rehearse_staged_lab_card_publish", { projectName });
  assert.equal(ready.rehearsalStatus, "ready");
  assert.equal(ready.publishReadyAfterApply, true);
  assert.equal(ready.reviewTokenIssued, false);
  assert.equal("reviewToken" in ready, false);
  assert.deepEqual(await Promise.all([
    fs.readFile(labPage, "utf8"),
    fs.readFile(patchPath, "utf8"),
    fs.readFile(handoffPath, "utf8"),
  ]), before);

  const unconfirmed = await client.call("discard_staged_lab_card_patch", {
    projectName,
    confirm: false,
  });
  assert.equal(unconfirmed.status, "confirmation-required");
  assert.equal(await fs.readFile(labPage, "utf8"), before[0]);

  const discarded = await client.call("discard_staged_lab_card_patch", {
    projectName,
    confirm: true,
  });
  assert.equal(discarded.status, "discarded");
  assert.equal(discarded.discarded, true);
  assert.equal(discarded.sourceFilesChanged, false);
  assert.equal(discarded.filesDeleted.length, 2);
  assert.equal(await fs.readFile(labPage, "utf8"), before[0]);
  await assert.rejects(fs.access(patchPath), { code: "ENOENT" });
  await assert.rejects(fs.access(handoffPath), { code: "ENOENT" });

  const missing = await client.call("discard_staged_lab_card_patch", {
    projectName,
    confirm: true,
  });
  assert.equal(missing.status, "missing");
  assert.equal(missing.discarded, false);
});

test("staged inventory is ordered and recomputes live readiness", async (t) => {
  const { repoRoot, labPage, client } = await createFixtureClient(t);
  const generatedDir = path.join(repoRoot, "portfolio-publisher-mcp", "generated");
  const originalSource = await fs.readFile(labPage, "utf8");

  const empty = await client.call("list_staged_lab_card_patches", {});
  assert.equal(empty.checked, 0);
  assert.equal(empty.totalChecked, 0);
  assert.deepEqual(empty.filters, { status: null, reason: null });
  assert.deepEqual(empty.reasonCounts, {
    stale: { "source-drift": 0, "already-applied": 0 },
    invalid: { "artifact-integrity": 0, "invalid-project-name": 0, "missing-handoff-title": 0 },
    incomplete: { "missing-patch": 0, "missing-handoff": 0 },
  });

  await client.call("stage_lab_card_patch_artifact", {
    name: "Zulu Fixture",
    tagline: "Starts with a missing screenshot",
    url: "https://example.com/zulu-fixture",
    image: "/projects/zulu-fixture.png",
    icon: "FixtureIcon",
    allowNeedsPrep: true,
  });
  await client.call("stage_lab_card_patch_artifact", {
    name: "Beta Fixture",
    tagline: "Has all companion files ready",
    url: "https://example.com/beta-fixture",
    image: "/projects/beta-fixture.png",
    icon: "FixtureIcon",
    allowNeedsPrep: true,
  });
  await fs.writeFile(
    path.join(repoRoot, "public", "projects", "beta-fixture.png"),
    "fixture",
    "utf8",
  );
  await Promise.all([
    fs.writeFile(path.join(generatedDir, "alpha-orphan-lab-card.patch"), "orphan", "utf8"),
    fs.writeFile(path.join(generatedDir, "gamma-orphan-lab-card.md"), "# Orphan\n", "utf8"),
  ]);

  const before = await client.call("list_staged_lab_card_patches", {});
  assert.equal(await fs.readFile(labPage, "utf8"), originalSource);
  assert.ok(before.items.every((item) => !("reviewToken" in item)));
  assert.deepEqual(before.items.map((item) => item.slug), [
    "alpha-orphan",
    "beta-fixture",
    "gamma-orphan",
    "zulu-fixture",
  ]);
  assert.deepEqual(
    {
      checked: before.checked,
      complete: before.complete,
      incomplete: before.incomplete,
      reviewReady: before.reviewReady,
      publishReady: before.publishReady,
      stale: before.stale,
      invalid: before.invalid,
    },
    {
      checked: 4,
      complete: 2,
      incomplete: 2,
      reviewReady: 2,
      publishReady: 1,
      stale: 0,
      invalid: 0,
    },
  );
  assert.deepEqual(before.reasonCounts, {
    stale: { "source-drift": 0, "already-applied": 0 },
    invalid: { "artifact-integrity": 0, "invalid-project-name": 0, "missing-handoff-title": 0 },
    incomplete: { "missing-patch": 1, "missing-handoff": 1 },
  });
  assert.equal(before.totalChecked, 4);
  assert.deepEqual(before.filters, { status: null, reason: null });

  const readyOnly = await client.call("list_staged_lab_card_patches", { status: "ready" });
  assert.equal(readyOnly.totalChecked, 4);
  assert.equal(readyOnly.checked, 2);
  assert.deepEqual(readyOnly.filters, { status: "ready", reason: null });
  assert.deepEqual(readyOnly.items.map((item) => item.slug), ["beta-fixture", "zulu-fixture"]);
  assert.ok(readyOnly.items.every((item) => item.status === "ready" && !("reviewToken" in item)));

  const missingPatchOnly = await client.call("list_staged_lab_card_patches", { reason: "missing-patch" });
  assert.equal(missingPatchOnly.totalChecked, 4);
  assert.equal(missingPatchOnly.checked, 1);
  assert.deepEqual(missingPatchOnly.filters, { status: null, reason: "missing-patch" });
  assert.deepEqual(missingPatchOnly.items.map((item) => item.slug), ["gamma-orphan"]);
  assert.equal(missingPatchOnly.reasonCounts.incomplete["missing-patch"], 1);

  const combined = await client.call("list_staged_lab_card_patches", {
    status: "incomplete",
    reason: "missing-handoff",
  });
  assert.equal(combined.checked, 1);
  assert.deepEqual(combined.items.map((item) => item.slug), ["alpha-orphan"]);

  const emptyIntersection = await client.call("list_staged_lab_card_patches", {
    status: "ready",
    reason: "missing-handoff",
  });
  assert.equal(emptyIntersection.totalChecked, 4);
  assert.equal(emptyIntersection.checked, 0);
  assert.deepEqual(emptyIntersection.items, []);
  assert.match(emptyIntersection.ownerNextStep, /No staged artifacts match/);

  const alphaOrphan = before.items[0];
  assert.equal(alphaOrphan.status, "incomplete");
  assert.equal(alphaOrphan.incompleteReason, "missing-handoff");
  assert.equal(alphaOrphan.staleReason, null);
  assert.equal(alphaOrphan.invalidReason, null);
  assert.equal(alphaOrphan.patchFile?.endsWith("alpha-orphan-lab-card.patch"), true);
  assert.equal(alphaOrphan.handoffFile, null);
  assert.ok(alphaOrphan.issues.some((issue) => issue.includes("Markdown handoff")));
  assert.equal(
    alphaOrphan.ownerNextStep,
    "Discard the incomplete artifact or stage this Lab card patch again.",
  );

  const beta = before.items[1];
  assert.equal(beta.reviewReady, true);
  assert.equal(beta.publishReadyAfterApply, true);
  assert.equal(beta.handoffPublishReadyAfterApply, false);
  assert.deepEqual(beta.readinessBlockers, []);
  assert.equal(
    beta.ownerNextStep,
    "Review this currently publish-ready handoff and patch before controlled apply.",
  );

  const zuluBefore = before.items[3];
  assert.equal(zuluBefore.reviewReady, true);
  assert.equal(zuluBefore.publishReadyAfterApply, false);
  assert.equal(zuluBefore.handoffPublishReadyAfterApply, false);
  assert.ok(zuluBefore.readinessBlockers.some((blocker) => blocker.includes("Screenshot file not found")));
  assert.equal(
    zuluBefore.ownerNextStep,
    "Complete the listed live readiness blockers, then review and validate this staged patch before controlled apply.",
  );
  assert.equal(
    before.ownerNextStep,
    "Review currently publish-ready items first; complete live readiness blockers, restage stale or invalid items, and discard incomplete artifacts.",
  );

  await fs.writeFile(
    path.join(repoRoot, "public", "projects", "zulu-fixture.png"),
    "fixture",
    "utf8",
  );
  const after = await client.call("list_staged_lab_card_patches", {});
  const zuluAfter = after.items.find((item) => item.slug === "zulu-fixture");
  assert.equal(await fs.readFile(labPage, "utf8"), originalSource);
  assert.ok(after.items.every((item) => !("reviewToken" in item)));
  assert.equal(after.publishReady, 2);
  assert.equal(zuluAfter.publishReadyAfterApply, true);
  assert.equal(zuluAfter.handoffPublishReadyAfterApply, false);
  assert.deepEqual(zuluAfter.readinessBlockers, []);
});

test("staged inventory classifies stale and invalid complete pairs", async (t) => {
  const { repoRoot, client } = await createFixtureClient(t);

  const invalidProjectName = "Invalid Inventory Fixture";
  const invalidStage = await client.call("stage_lab_card_patch_artifact", {
    name: invalidProjectName,
    tagline: "Will be changed after staging",
    url: "https://example.com/invalid-inventory-fixture",
    image: "/projects/invalid-inventory-fixture.png",
    icon: "FixtureIcon",
    allowNeedsPrep: true,
  });
  const invalidPatchPath = path.join(repoRoot, invalidStage.patchFile);
  const invalidPatch = await fs.readFile(invalidPatchPath, "utf8");
  await fs.writeFile(
    invalidPatchPath,
    invalidPatch.replace("Will be changed after staging", "Unexpected altered copy"),
    "utf8",
  );

  const staleProjectName = "Stale Inventory Fixture";
  await client.call("stage_lab_card_patch_artifact", {
    name: staleProjectName,
    tagline: "Will already be present in the Lab",
    url: "https://example.com/stale-inventory-fixture",
    image: "/projects/stale-inventory-fixture.png",
    icon: "FixtureIcon",
    allowNeedsPrep: true,
  });
  await fs.writeFile(
    path.join(repoRoot, "public", "projects", "stale-inventory-fixture.png"),
    "fixture",
    "utf8",
  );
  const staleValidation = await client.call("validate_staged_lab_card_patch", {
    projectName: staleProjectName,
  });
  const applied = await client.call("apply_staged_lab_card_patch", {
    projectName: staleProjectName,
    reviewToken: staleValidation.reviewToken,
    confirm: true,
  });
  assert.equal(applied.status, "applied");

  const inventory = await client.call("list_staged_lab_card_patches", {});
  assert.deepEqual(
    {
      checked: inventory.checked,
      complete: inventory.complete,
      incomplete: inventory.incomplete,
      reviewReady: inventory.reviewReady,
      publishReady: inventory.publishReady,
      stale: inventory.stale,
      invalid: inventory.invalid,
    },
    {
      checked: 2,
      complete: 2,
      incomplete: 0,
      reviewReady: 0,
      publishReady: 0,
      stale: 1,
      invalid: 1,
    },
  );
  assert.deepEqual(inventory.reasonCounts, {
    stale: { "source-drift": 0, "already-applied": 1 },
    invalid: { "artifact-integrity": 1, "invalid-project-name": 0, "missing-handoff-title": 0 },
    incomplete: { "missing-patch": 0, "missing-handoff": 0 },
  });
  assert.ok(inventory.items.every((item) => !("reviewToken" in item)));

  const staleOnly = await client.call("list_staged_lab_card_patches", { status: "stale" });
  assert.equal(staleOnly.totalChecked, 2);
  assert.equal(staleOnly.checked, 1);
  assert.deepEqual(staleOnly.items.map((item) => item.projectName), [staleProjectName]);
  assert.equal(staleOnly.reasonCounts.stale["already-applied"], 1);

  const integrityOnly = await client.call("list_staged_lab_card_patches", { reason: "artifact-integrity" });
  assert.equal(integrityOnly.checked, 1);
  assert.deepEqual(integrityOnly.items.map((item) => item.projectName), [invalidProjectName]);
  assert.equal(integrityOnly.invalid, 1);

  const invalid = inventory.items.find((item) => item.projectName === invalidProjectName);
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.staleReason, null);
  assert.equal(invalid.invalidReason, "artifact-integrity");
  assert.equal(invalid.incompleteReason, null);
  assert.equal(invalid.reviewReady, false);
  assert.equal(invalid.publishReadyAfterApply, false);
  assert.ok(invalid.issues.some((issue) => issue.includes("does not exactly match")));
  assert.equal(
    invalid.ownerNextStep,
    "Stage a fresh Lab card patch, then validate it again before review.",
  );

  const stale = inventory.items.find((item) => item.projectName === staleProjectName);
  assert.equal(stale.status, "stale");
  assert.equal(stale.staleReason, "already-applied");
  assert.equal(stale.invalidReason, null);
  assert.equal(stale.incompleteReason, null);
  assert.equal(stale.reviewReady, false);
  assert.equal(stale.publishReadyAfterApply, false);
  assert.deepEqual(stale.issues, []);
  assert.ok(stale.warnings.some((warning) => warning.includes("already present")));
  assert.equal(
    stale.ownerNextStep,
    "Confirm whether the Lab card was already applied; otherwise stage a fresh patch.",
  );
  assert.equal(
    inventory.ownerNextStep,
    "Review currently publish-ready items first; complete live readiness blockers, restage stale or invalid items, and discard incomplete artifacts.",
  );
});

test("staged inventory distinguishes source drift from malformed handoffs", async (t) => {
  const { repoRoot, labPage, client } = await createFixtureClient(t);
  const generatedDir = path.join(repoRoot, "portfolio-publisher-mcp", "generated");

  const driftedProjectName = "Source Drift Fixture";
  await client.call("stage_lab_card_patch_artifact", {
    name: driftedProjectName,
    tagline: "Will become stale after unrelated source movement",
    url: "https://example.com/source-drift-fixture",
    image: "/projects/source-drift-fixture.png",
    icon: "FixtureIcon",
    allowNeedsPrep: true,
  });
  const source = await fs.readFile(labPage, "utf8");
  await fs.writeFile(labPage, `// unrelated source movement\n${source}`, "utf8");

  await Promise.all([
    fs.writeFile(path.join(generatedDir, "malformed-fixture-lab-card.patch"), "not a patch\n", "utf8"),
    fs.writeFile(path.join(generatedDir, "malformed-fixture-lab-card.md"), "# Missing staged title\n", "utf8"),
  ]);

  const inventory = await client.call("list_staged_lab_card_patches", {});
  assert.deepEqual(
    {
      checked: inventory.checked,
      complete: inventory.complete,
      incomplete: inventory.incomplete,
      reviewReady: inventory.reviewReady,
      publishReady: inventory.publishReady,
      stale: inventory.stale,
      invalid: inventory.invalid,
    },
    {
      checked: 2,
      complete: 2,
      incomplete: 0,
      reviewReady: 0,
      publishReady: 0,
      stale: 1,
      invalid: 1,
    },
  );
  assert.deepEqual(inventory.reasonCounts, {
    stale: { "source-drift": 1, "already-applied": 0 },
    invalid: { "artifact-integrity": 0, "invalid-project-name": 0, "missing-handoff-title": 1 },
    incomplete: { "missing-patch": 0, "missing-handoff": 0 },
  });
  assert.ok(inventory.items.every((item) => !("reviewToken" in item)));

  const drifted = inventory.items.find((item) => item.projectName === driftedProjectName);
  assert.equal(drifted.status, "stale");
  assert.equal(drifted.staleReason, "source-drift");
  assert.equal(drifted.invalidReason, null);
  assert.equal(drifted.incompleteReason, null);
  assert.equal(drifted.reviewReady, false);
  assert.equal(drifted.publishReadyAfterApply, false);
  assert.ok(drifted.issues.some((issue) => issue.includes("no longer matches")));
  assert.equal(
    drifted.ownerNextStep,
    "Confirm whether the Lab card was already applied; otherwise stage a fresh patch.",
  );

  const malformed = inventory.items.find((item) => item.slug === "malformed-fixture");
  assert.equal(malformed.projectName, null);
  assert.equal(malformed.status, "invalid");
  assert.equal(malformed.staleReason, null);
  assert.equal(malformed.invalidReason, "missing-handoff-title");
  assert.equal(malformed.incompleteReason, null);
  assert.equal(malformed.reviewReady, false);
  assert.equal(malformed.publishReadyAfterApply, false);
  assert.deepEqual(malformed.issues, ["Handoff is missing the staged project title."]);
  assert.equal(malformed.ownerNextStep, "Stage a fresh Lab card patch before review.");
});
