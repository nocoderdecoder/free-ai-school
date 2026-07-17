import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import {
  AI_PATH_DURABLE_TEXT_GATE_VERSION,
  durableTextGateExitCode,
  formatDurableTextGate,
  inspectDurableTextGate,
} from '../../scripts/ai-path-durable-text-gate.mjs'

const repositoryRoot = resolve(import.meta.dirname, '../..')
const script = join(repositoryRoot, 'scripts/ai-path-durable-text-gate.mjs')
const releaseCommit = 'a'.repeat(40)
const sourceFiles = [
  '.github/workflows/ai-path-db-proof.yml',
  'app/api/ai-path/session/[sessionId]/route.ts',
  'app/ai-path/lib/supabase-auth.server.ts',
  'app/ai-path/lib/supabase-session-repository.server.ts',
  'app/ai-path/lib/supabase-session-repository.ts',
  'app/ai-path/lib/retention-supabase.server.ts',
  'docs/ai-path/DATABASE_PROOF_RUNBOOK.md',
  'docs/ai-path/RETENTION_OPERATIONS.md',
  'scripts/ai-path-db-proof.sh',
  'scripts/ai-path-db-proof-preflight.mjs',
  'scripts/ai-path-db-proof/10-contracts.sql',
  'scripts/ai-path-db-proof/static.test.mjs',
  'supabase/migrations/20260717000000_ai_path_assessment_sessions.sql',
  'supabase/migrations/20260717020000_ai_path_trusted_report_writer.sql',
  'supabase/migrations/20260717060000_ai_path_bounded_retention.sql',
]
const latchFiles = new Map([
  ['app/ai-path/lib/supabase-persistence.ts', 'export const AI_PATH_SUPABASE_PRODUCTION_LATCH = false as const\n'],
  ['app/ai-path/lib/supabase-session-repository.server.ts', 'export const AI_PATH_TRUSTED_REPORT_WRITER_LATCH = false as const\n'],
  ['app/api/cron/ai-path-retention/route.ts', 'export const AI_PATH_RETENTION_JOB_READY = false as const\n'],
  ['app/ai-path/lib/retention-supabase.server.ts', 'export const AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH = false as const\n'],
])

function sha(value) {
  return createHash('sha256').update(value).digest('hex')
}

function write(root, path, value) {
  const absolute = join(root, path)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, value)
}

function makeSourceFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ai-path-durable-text-gate-'))
  sourceFiles.forEach((path) => write(root, path, `${path}\n`))
  latchFiles.forEach((source, path) => write(root, path, source))
  return root
}

function proofDocuments(root) {
  const runbookSha256 = sha(readFileSync(join(root, 'docs/ai-path/RETENTION_OPERATIONS.md')))
  return {
    'database-proof.json': {
      schemaVersion: 1,
      kind: 'disposable_postgresql_behavioral_proof',
      result: 'pass',
      releaseCommit,
      postgresMajor: 16,
      migrationCount: 8,
      harness: 'scripts/ai-path-db-proof.sh',
      checks: [
        'migrations-applied',
        'rls-owner-isolation',
        'trusted-writer-binding',
        'bounded-retention',
        'owner-export-delete',
        'account-and-source-cascade',
        'rollback-clean',
      ],
      artifact: { path: 'database-proof.log' },
    },
    'auth-proof.json': {
      schemaVersion: 1,
      kind: 'authenticated_text_session_configuration_proof',
      result: 'pass',
      releaseCommit,
      provider: 'supabase',
      transport: 'http-only-cookie',
      checks: [
        'verified-principal',
        'http-only-cookie',
        'same-site-cookie',
        'secure-cookie-in-production',
        'owner-a-access',
        'owner-b-denied',
        'unauthenticated-denied',
        'server-only-service-credential',
      ],
      artifact: { path: 'auth-proof.log' },
    },
    'retention-proof.json': {
      schemaVersion: 1,
      kind: 'retention_operations_proof',
      result: 'pass',
      releaseCommit,
      policyDays: 90,
      runbookSha256,
      checks: [
        'bounded-90-day-purge',
        'owner-hard-delete',
        'account-cascade',
        'source-session-cascade',
        'idempotent-retry',
        'scheduler-auth',
        'backup-retention-reviewed',
        'deletion-latency-alert',
      ],
      artifact: { path: 'retention-proof.log' },
    },
    'export-delete-proof.json': {
      schemaVersion: 1,
      kind: 'assessment_session_export_delete_proof',
      result: 'pass',
      releaseCommit,
      resource: 'assessment-session',
      checks: [
        'owner-export',
        'cross-owner-export-denied',
        'owner-hard-delete',
        'cross-owner-delete-denied',
        'post-delete-not-found',
        'account-cascade',
      ],
      artifact: { path: 'export-delete-proof.log' },
    },
    'ci-proof.json': {
      schemaVersion: 1,
      kind: 'github_actions_release_proof',
      result: 'pass',
      releaseCommit,
      workflowFile: '.github/workflows/ai-path-db-proof.yml',
      conclusion: 'success',
      runId: '123456789',
      runUrl: 'https://github.com/example/free-ai-school/actions/runs/123456789',
      artifactName: 'ai-path-db-proof-123456789',
      checks: [
        'workflow-conclusion-success',
        'database-proof-job-success',
        'source-tests-success',
      ],
      artifact: { path: 'database-proof.log' },
    },
  }
}

function createEvidence(root, overrides = {}) {
  const evidencePath = 'evidence'
  const logs = {
    'database-proof.log': 'PostgreSQL 16\n[ai-path-db-proof] PASS: 8 migrations and all disposable database contracts succeeded\n',
    'auth-proof.log': 'PASS: authenticated durable text configuration contracts succeeded\n',
    'retention-proof.log': 'PASS: durable text retention operations contracts succeeded\n',
    'export-delete-proof.log': 'PASS: assessment session export and delete contracts succeeded\n',
    ...overrides.logs,
  }
  const documents = proofDocuments(root)
  const ciRun = {
    conclusion: 'success',
    databaseId: 123456789,
    event: 'push',
    headSha: releaseCommit,
    url: 'https://github.com/example/free-ai-school/actions/runs/123456789',
    workflowName: 'AI Path disposable PostgreSQL proof',
    ...overrides.ciRun,
  }
  const ciRunEncoded = `${JSON.stringify(ciRun, null, 2)}\n`
  write(root, join(evidencePath, 'ci-run.json'), ciRunEncoded)
  documents['ci-proof.json'].runMetadata = {
    path: 'ci-run.json',
    sha256: sha(ciRunEncoded),
  }
  for (const [filename, document] of Object.entries(documents)) {
    Object.assign(document, overrides.documents?.[filename])
    const artifact = logs[document.artifact.path]
    document.artifact.sha256 = sha(artifact)
    write(root, join(evidencePath, document.artifact.path), artifact)
  }
  const documentDigests = {}
  for (const [filename, document] of Object.entries(documents)) {
    const encoded = `${JSON.stringify(document, null, 2)}\n`
    write(root, join(evidencePath, filename), encoded)
    documentDigests[filename] = sha(encoded)
  }
  const index = {
    schemaVersion: 1,
    gateVersion: AI_PATH_DURABLE_TEXT_GATE_VERSION,
    releaseCommit,
    approvals: ['platform', 'privacy', 'release', 'security'].map((role) => ({
      role,
      decision: 'approved',
      reference: `https://example.test/approvals/${role}`,
    })),
    documents: documentDigests,
    ...overrides.index,
  }
  write(root, join(evidencePath, 'evidence-index.json'), `${JSON.stringify(index, null, 2)}\n`)
  return evidencePath
}

test('the repository gate is closed because release evidence has not been supplied', () => {
  const secretCanary = 'durable-text-gate-must-not-print-me'
  process.env.DURABLE_TEXT_GATE_SECRET_CANARY = secretCanary
  try {
    const report = inspectDurableTextGate({ root: repositoryRoot })
    const rendered = `${JSON.stringify(report)}\n${formatDurableTextGate(report)}`
    assert.equal(report.source.ok, true)
    assert.equal(report.state, 'CLOSED_EVIDENCE_MISSING')
    assert.equal(report.activationOpen, false)
    assert.equal(report.readyForReviewedActivation, false)
    assert.equal(durableTextGateExitCode(report), 0)
    assert.equal(durableTextGateExitCode(report, { requireReady: true }), 2)
    assert.doesNotMatch(rendered, new RegExp(secretCanary))
  } finally {
    delete process.env.DURABLE_TEXT_GATE_SECRET_CANARY
  }
})

test('complete commit-bound, approved, hashed evidence becomes ready but never opens activation', () => {
  const root = makeSourceFixture()
  try {
    const evidenceDirectory = createEvidence(root)
    const report = inspectDurableTextGate({ root, evidenceDirectory, releaseCommit })
    assert.equal(report.source.ok, true)
    assert.equal(report.evidence.ok, true)
    assert.equal(report.state, 'READY_FOR_REVIEWED_ACTIVATION')
    assert.equal(report.readyForReviewedActivation, true)
    assert.equal(report.activationOpen, false)
    assert.deepEqual(report.evidence.checks.map((check) => check.status), Array(5).fill('verified'))
    assert.equal(durableTextGateExitCode(report, { requireReady: true }), 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('evidence is rejected for a mismatched release commit or an unapproved role', () => {
  const root = makeSourceFixture()
  try {
    const evidenceDirectory = createEvidence(root)
    const mismatch = inspectDurableTextGate({ root, evidenceDirectory, releaseCommit: 'b'.repeat(40) })
    assert.equal(mismatch.evidence.index.status, 'invalid')
    assert.equal(mismatch.readyForReviewedActivation, false)

    createEvidence(root, {
      index: {
        approvals: ['platform', 'privacy', 'release', 'security'].map((role) => ({
          role,
          decision: role === 'security' ? 'pending' : 'approved',
          reference: `https://example.test/approvals/${role}`,
        })),
      },
    })
    const pending = inspectDurableTextGate({ root, evidenceDirectory, releaseCommit })
    assert.equal(pending.evidence.index.status, 'invalid')
    assert.equal(pending.readyForReviewedActivation, false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('tampered, stale-runbook, incomplete, or secret-bearing evidence fails closed', () => {
  const root = makeSourceFixture()
  try {
    const evidenceDirectory = createEvidence(root)
    write(root, join(evidenceDirectory, 'database-proof.log'), 'tampered\n')
    let report = inspectDurableTextGate({ root, evidenceDirectory, releaseCommit })
    assert.equal(report.evidence.checks.find((check) => check.id === 'database_proof')?.status, 'invalid')

    createEvidence(root)
    write(root, 'docs/ai-path/RETENTION_OPERATIONS.md', 'changed after evidence\n')
    report = inspectDurableTextGate({ root, evidenceDirectory, releaseCommit })
    assert.equal(report.evidence.checks.find((check) => check.id === 'retention_operations')?.status, 'invalid')

    write(root, 'docs/ai-path/RETENTION_OPERATIONS.md', 'docs/ai-path/RETENTION_OPERATIONS.md\n')
    createEvidence(root, { ciRun: { event: 'pull_request' } })
    report = inspectDurableTextGate({ root, evidenceDirectory, releaseCommit })
    assert.equal(report.evidence.checks.find((check) => check.id === 'ci_evidence')?.status, 'invalid')
    assert.match(report.evidence.checks.find((check) => check.id === 'ci_evidence')?.reason ?? '', /exact release commit/)

    createEvidence(root, {
      logs: {
        'auth-proof.log': 'Authorization: Bearer top-secret-value\nPASS: authenticated durable text configuration contracts succeeded\n',
      },
    })
    report = inspectDurableTextGate({ root, evidenceDirectory, releaseCommit })
    assert.equal(report.evidence.checks.find((check) => check.id === 'auth_configuration')?.status, 'invalid')
    assert.match(report.evidence.checks.find((check) => check.id === 'auth_configuration')?.reason ?? '', /prohibited secret material/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('opening any durable-text latch is a broken source invariant even with complete evidence', () => {
  const root = makeSourceFixture()
  try {
    const evidenceDirectory = createEvidence(root)
    write(root, 'app/ai-path/lib/supabase-persistence.ts', 'export const AI_PATH_SUPABASE_PRODUCTION_LATCH = true as const\n')
    const report = inspectDurableTextGate({ root, evidenceDirectory, releaseCommit })
    assert.equal(report.state, 'CLOSED_SOURCE_UNSAFE')
    assert.equal(report.activationOpen, false)
    assert.equal(report.readyForReviewedActivation, false)
    assert.equal(durableTextGateExitCode(report), 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('CLI is deterministic, closed by default, and release enforcement exits two', () => {
  const first = spawnSync(process.execPath, [script, '--json'], { cwd: tmpdir(), encoding: 'utf8' })
  const second = spawnSync(process.execPath, [script, '--json'], { cwd: tmpdir(), encoding: 'utf8' })
  const enforced = spawnSync(process.execPath, [script, '--require-ready'], { encoding: 'utf8' })
  const invalid = spawnSync(process.execPath, [script, '--release-commit', 'HEAD'], { encoding: 'utf8' })
  assert.equal(first.status, 0, first.stderr)
  assert.equal(second.status, 0, second.stderr)
  assert.equal(first.stdout, second.stdout)
  assert.equal(JSON.parse(first.stdout).state, 'CLOSED_EVIDENCE_MISSING')
  assert.equal(enforced.status, 2, enforced.stderr)
  assert.match(enforced.stdout, /Activation open: NO/)
  assert.equal(invalid.status, 64)
  assert.match(invalid.stderr, /40-character Git commit SHA/)
})
