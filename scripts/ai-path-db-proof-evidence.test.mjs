import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import { createDatabaseProofEvidence } from './ai-path-db-proof-evidence.mjs'

const root = resolve(import.meta.dirname, '..')
const script = join(root, 'scripts/ai-path-db-proof-evidence.mjs')
const releaseCommit = 'a'.repeat(40)
const proofText = '[ai-path-db-proof] applying migrations\n[ai-path-db-proof] PASS: 8 migrations and all disposable database contracts succeeded\n'
const proofLog = { buffer: Buffer.from(proofText), text: proofText }
const runMetadata = {
  conclusion: 'success',
  databaseId: 123456789,
  event: 'push',
  headSha: releaseCommit,
  url: 'https://github.com/example/free-ai-school/actions/runs/123456789',
  workflowName: 'AI Path disposable PostgreSQL proof',
}

function candidate(event = runMetadata.event) {
  return createDatabaseProofEvidence({
    mode: 'candidate',
    proofLog,
    postgresMajor: 16,
    candidateMetadata: {
      event,
      headSha: releaseCommit,
      runId: String(runMetadata.databaseId),
      runUrl: runMetadata.url,
    },
  })
}

function sha(value) {
  return createHash('sha256').update(value).digest('hex')
}

test('final accepted-event evidence is deterministic and matches the durable gate document contracts', () => {
  const candidateManifest = candidate().manifest
  const first = createDatabaseProofEvidence({ mode: 'final', proofLog, postgresMajor: 16, runMetadata, candidateManifest })
  const second = createDatabaseProofEvidence({ mode: 'final', proofLog, postgresMajor: 16, runMetadata, candidateManifest })
  assert.deepEqual(first, second)
  assert.equal(first.manifest.releaseEligible, true)
  assert.equal(first.manifest.classification, 'release-candidate')
  assert.equal(first.manifest.gatePacketComplete, false)

  const database = JSON.parse(first.files['database-proof.json'])
  const ci = JSON.parse(first.files['ci-proof.json'])
  const ciRun = JSON.parse(first.files['ci-run.json'])
  assert.equal(database.releaseCommit, releaseCommit)
  assert.equal(database.migrationCount, 8)
  assert.equal(database.artifact.sha256, sha(proofText))
  assert.equal(ci.releaseCommit, releaseCommit)
  assert.equal(ci.artifactName, 'ai-path-db-proof-123456789')
  assert.equal(ci.runMetadata.sha256, sha(first.files['ci-run.json']))
  assert.deepEqual(ciRun, runMetadata)
})

test('pull-request final metadata stays explicitly validation-only', () => {
  const result = createDatabaseProofEvidence({
    mode: 'final',
    proofLog,
    postgresMajor: 16,
    runMetadata: { ...runMetadata, event: 'pull_request' },
    candidateManifest: candidate('pull_request').manifest,
  })
  assert.equal(result.manifest.releaseEligible, false)
  assert.equal(result.manifest.classification, 'validation-only')
  assert.match(result.manifest.reason, /cannot prove the exact release commit/)
  assert.equal(JSON.parse(result.files['ci-run.json']).event, 'pull_request')
})

test('in-workflow candidate metadata is never release eligible, including accepted event types', () => {
  const result = createDatabaseProofEvidence({
    mode: 'candidate',
    proofLog,
    postgresMajor: 16,
    candidateMetadata: {
      event: 'workflow_dispatch',
      headSha: releaseCommit,
      runId: '987654321',
      runUrl: 'https://github.com/example/free-ai-school/actions/runs/987654321',
    },
  })
  assert.equal(result.manifest.releaseEligible, false)
  assert.match(result.manifest.reason, /after the run completes/)
  assert.ok(result.files['ci-run-candidate.json'])
  assert.equal(result.files['ci-run.json'], undefined)
  assert.equal(result.files['ci-proof.json'], undefined)
})

test('unsafe, incomplete, stale, and unsuccessful inputs fail closed', () => {
  const candidateManifest = candidate().manifest
  for (const input of [
    { proofLog: { buffer: Buffer.from('no marker\n'), text: 'no marker\n' }, runMetadata, candidateManifest },
    { proofLog, runMetadata: { ...runMetadata, conclusion: 'failure' }, candidateManifest },
    { proofLog, runMetadata: { ...runMetadata, headSha: releaseCommit.toUpperCase() }, candidateManifest },
    { proofLog, runMetadata: { ...runMetadata, databaseId: 1, url: runMetadata.url }, candidateManifest },
    { proofLog, runMetadata, candidateManifest: { ...candidateManifest, releaseCommit: 'b'.repeat(40) } },
    { proofLog, runMetadata, candidateManifest: { ...candidateManifest, files: { ...candidateManifest.files, 'database-proof.log': 'b'.repeat(64) } } },
    { proofLog: { buffer: Buffer.from(`${proofText}Authorization: Bearer top-secret-value\n`), text: `${proofText}Authorization: Bearer top-secret-value\n` }, runMetadata, candidateManifest },
  ]) {
    assert.throws(() => createDatabaseProofEvidence({ mode: 'final', postgresMajor: 16, ...input }))
  }
})

test('CLI reads only explicit files and emits a validation-only candidate without the environment canary', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'ai-path-db-proof-evidence-'))
  try {
    const log = join(fixture, 'proof.log')
    const output = join(fixture, 'output')
    writeFileSync(log, proofText)
    mkdirSync(output)
    const canary = 'must-not-be-read-from-environment'
    const result = spawnSync(process.execPath, [
      script,
      '--candidate',
      '--proof-log', log,
      '--postgres-major', '16',
      '--event', 'pull_request',
      '--head-sha', releaseCommit,
      '--run-id', '42',
      '--run-url', 'https://github.com/example/free-ai-school/actions/runs/42',
      '--out-dir', output,
    ], {
      encoding: 'utf8',
      env: { ...process.env, AI_PATH_SECRET_CANARY: canary },
    })
    assert.equal(result.status, 0, result.stderr)
    const manifest = JSON.parse(result.stdout)
    assert.equal(manifest.releaseEligible, false)
    const emitted = `${result.stdout}\n${readFileSync(join(output, 'database-proof-evidence-manifest.json'), 'utf8')}`
    assert.doesNotMatch(emitted, new RegExp(canary))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})
