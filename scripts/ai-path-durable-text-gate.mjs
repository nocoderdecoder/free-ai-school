#!/usr/bin/env node

import {
  createHash,
} from 'node:crypto'
import {
  existsSync,
  lstatSync,
  readFileSync,
} from 'node:fs'
import {
  dirname,
  join,
  resolve,
} from 'node:path'
import {
  fileURLToPath,
  pathToFileURL,
} from 'node:url'

export const AI_PATH_DURABLE_TEXT_GATE_VERSION = '2026-07-17.v1'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultEvidenceDirectory = 'artifacts/ai-path-durable-text-release'
const sha256Pattern = /^[0-9a-f]{64}$/
const commitPattern = /^[0-9a-f]{40}$/
const maxJsonBytes = 64 * 1024
const maxArtifactBytes = 4 * 1024 * 1024

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
  'scripts/ai-path-db-proof-evidence.mjs',
  'scripts/ai-path-db-proof-evidence.test.mjs',
  'scripts/ai-path-db-proof-preflight.mjs',
  'scripts/ai-path-db-proof/10-contracts.sql',
  'scripts/ai-path-db-proof/static.test.mjs',
  'supabase/migrations/20260717000000_ai_path_assessment_sessions.sql',
  'supabase/migrations/20260717020000_ai_path_trusted_report_writer.sql',
  'supabase/migrations/20260717060000_ai_path_bounded_retention.sql',
]

const closedLatches = [
  {
    id: 'durable_sessions',
    file: 'app/ai-path/lib/supabase-persistence.ts',
    constant: 'AI_PATH_SUPABASE_PRODUCTION_LATCH',
  },
  {
    id: 'trusted_report_writer',
    file: 'app/ai-path/lib/supabase-session-repository.server.ts',
    constant: 'AI_PATH_TRUSTED_REPORT_WRITER_LATCH',
  },
  {
    id: 'retention_job',
    file: 'app/api/cron/ai-path-retention/route.ts',
    constant: 'AI_PATH_RETENTION_JOB_READY',
  },
  {
    id: 'durable_retention_gateway',
    file: 'app/ai-path/lib/retention-supabase.server.ts',
    constant: 'AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH',
  },
]

const evidenceSpecs = [
  {
    id: 'database_proof',
    document: 'database-proof.json',
    artifact: 'database-proof.log',
    kind: 'disposable_postgresql_behavioral_proof',
    requiredChecks: [
      'migrations-applied',
      'rls-owner-isolation',
      'trusted-writer-binding',
      'bounded-retention',
      'owner-export-delete',
      'account-and-source-cascade',
      'rollback-clean',
    ],
  },
  {
    id: 'auth_configuration',
    document: 'auth-proof.json',
    artifact: 'auth-proof.log',
    kind: 'authenticated_text_session_configuration_proof',
    requiredChecks: [
      'verified-principal',
      'http-only-cookie',
      'same-site-cookie',
      'secure-cookie-in-production',
      'owner-a-access',
      'owner-b-denied',
      'unauthenticated-denied',
      'server-only-service-credential',
    ],
  },
  {
    id: 'retention_operations',
    document: 'retention-proof.json',
    artifact: 'retention-proof.log',
    kind: 'retention_operations_proof',
    requiredChecks: [
      'bounded-90-day-purge',
      'owner-hard-delete',
      'account-cascade',
      'source-session-cascade',
      'idempotent-retry',
      'scheduler-auth',
      'backup-retention-reviewed',
      'deletion-latency-alert',
    ],
  },
  {
    id: 'export_delete',
    document: 'export-delete-proof.json',
    artifact: 'export-delete-proof.log',
    kind: 'assessment_session_export_delete_proof',
    requiredChecks: [
      'owner-export',
      'cross-owner-export-denied',
      'owner-hard-delete',
      'cross-owner-delete-denied',
      'post-delete-not-found',
      'account-cascade',
    ],
  },
  {
    id: 'ci_evidence',
    document: 'ci-proof.json',
    artifact: 'database-proof.log',
    kind: 'github_actions_release_proof',
    requiredChecks: [
      'workflow-conclusion-success',
      'database-proof-job-success',
      'source-tests-success',
    ],
  },
]

const prohibitedArtifactPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
  /authorization:\s*bearer\s+\S+/i,
  /set-cookie:\s*[^\r\n]+/i,
  /postgres(?:ql)?:\/\/[^:\s/@]+:[^@\s/]+@/i,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}/,
]

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function uncommentedSource(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

export function inspectLiteralFalse(source, constant) {
  const sanitized = uncommentedSource(source)
  const escaped = constant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const declaration = new RegExp(`\\bexport\\s+const\\s+${escaped}\\s*=\\s*([^;\\r\\n]+)`, 'g')
  const values = [...sanitized.matchAll(declaration)].map((match) => match[1].trim())
  return values.length === 1 && values[0] === 'false as const'
}

function inspectSource(root) {
  const inventory = sourceFiles.map((file) => ({ file, present: existsSync(join(root, file)) }))
  const latches = closedLatches.map((latch) => {
    const path = join(root, latch.file)
    if (!existsSync(path)) return { ...latch, status: 'broken', reason: 'source file is missing' }
    const safe = inspectLiteralFalse(readFileSync(path, 'utf8'), latch.constant)
    return {
      ...latch,
      status: safe ? 'locked' : 'broken',
      reason: safe ? 'one literal false export verified' : 'expected one literal false export',
    }
  })
  const missing = inventory.filter((item) => !item.present).map((item) => item.file)
  const broken = latches.filter((latch) => latch.status === 'broken')
  return {
    ok: missing.length === 0 && broken.length === 0,
    inventory: { present: inventory.length - missing.length, required: inventory.length, missing },
    latches,
  }
}

function readBoundedRegularFile(path, maxBytes) {
  if (!existsSync(path)) return { ok: false, reason: 'missing' }
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.isSymbolicLink()) return { ok: false, reason: 'not a regular non-symlink file' }
  if (stat.size > maxBytes) return { ok: false, reason: 'exceeds the allowed size' }
  return { ok: true, buffer: readFileSync(path) }
}

function readJson(path) {
  const file = readBoundedRegularFile(path, maxJsonBytes)
  if (!file.ok) return file
  try {
    const text = file.buffer.toString('utf8')
    if (prohibitedArtifactPatterns.some((pattern) => pattern.test(text))) {
      return { ok: false, reason: 'appears to contain prohibited secret material' }
    }
    return { ok: true, buffer: file.buffer, value: JSON.parse(text) }
  } catch {
    return { ok: false, reason: 'is not valid JSON' }
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function checksInclude(value, requiredChecks) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return false
  if (new Set(value).size !== value.length) return false
  return requiredChecks.every((check) => value.includes(check))
}

function validateArtifact(evidenceRoot, document, spec) {
  if (!isRecord(document.artifact)
      || document.artifact.path !== spec.artifact
      || typeof document.artifact.sha256 !== 'string'
      || !sha256Pattern.test(document.artifact.sha256)) {
    return { ok: false, reason: 'artifact binding is malformed' }
  }
  const artifact = readBoundedRegularFile(join(evidenceRoot, spec.artifact), maxArtifactBytes)
  if (!artifact.ok) return { ok: false, reason: `artifact ${artifact.reason}` }
  if (digest(artifact.buffer) !== document.artifact.sha256) {
    return { ok: false, reason: 'artifact digest does not match' }
  }
  const text = artifact.buffer.toString('utf8')
  if (prohibitedArtifactPatterns.some((pattern) => pattern.test(text))) {
    return { ok: false, reason: 'artifact appears to contain prohibited secret material' }
  }
  return { ok: true, text }
}

function validateCiRunMetadata(evidenceRoot, document) {
  if (!isRecord(document.runMetadata)
      || document.runMetadata.path !== 'ci-run.json'
      || typeof document.runMetadata.sha256 !== 'string'
      || !sha256Pattern.test(document.runMetadata.sha256)) {
    return { ok: false, reason: 'CI run metadata binding is malformed' }
  }
  const metadata = readJson(join(evidenceRoot, 'ci-run.json'))
  if (!metadata.ok || digest(metadata.buffer) !== document.runMetadata.sha256) {
    return { ok: false, reason: 'CI run metadata is missing, invalid, or digest-mismatched' }
  }
  const value = metadata.value
  if (!isRecord(value)
      || String(value.databaseId) !== document.runId
      || value.headSha !== document.releaseCommit
      || value.conclusion !== 'success'
      || value.url !== document.runUrl
      || value.workflowName !== 'AI Path disposable PostgreSQL proof'
      || !['push', 'workflow_dispatch'].includes(value.event)) {
    return { ok: false, reason: 'CI run metadata does not prove the exact release commit' }
  }
  return { ok: true }
}

function validateDocument(document, spec, context) {
  if (!isRecord(document)
      || document.schemaVersion !== 1
      || document.kind !== spec.kind
      || document.result !== 'pass'
      || document.releaseCommit !== context.releaseCommit
      || !checksInclude(document.checks, spec.requiredChecks)) {
    return { ok: false, reason: 'document contract is incomplete or commit-mismatched' }
  }

  if (spec.id === 'database_proof') {
    if (!Number.isInteger(document.postgresMajor) || document.postgresMajor < 15
        || !Number.isInteger(document.migrationCount) || document.migrationCount < 8
        || document.harness !== 'scripts/ai-path-db-proof.sh') {
      return { ok: false, reason: 'database proof metadata is incomplete' }
    }
  }
  if (spec.id === 'auth_configuration'
      && (document.provider !== 'supabase' || document.transport !== 'http-only-cookie')) {
    return { ok: false, reason: 'auth proof must attest Supabase cookie authentication' }
  }
  if (spec.id === 'retention_operations') {
    const runbook = readFileSync(join(context.root, 'docs/ai-path/RETENTION_OPERATIONS.md'))
    if (document.policyDays !== 90 || document.runbookSha256 !== digest(runbook)) {
      return { ok: false, reason: 'retention policy or runbook digest does not match source' }
    }
  }
  if (spec.id === 'export_delete' && document.resource !== 'assessment-session') {
    return { ok: false, reason: 'export/delete proof covers the wrong resource' }
  }
  if (spec.id === 'ci_evidence') {
    const expectedRunUrl = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/[1-9][0-9]*$/
    if (document.workflowFile !== '.github/workflows/ai-path-db-proof.yml'
        || document.conclusion !== 'success'
        || typeof document.runId !== 'string'
        || !/^[1-9][0-9]*$/.test(document.runId)
        || document.artifactName !== `ai-path-db-proof-${document.runId}`
        || typeof document.runUrl !== 'string'
        || !expectedRunUrl.test(document.runUrl)) {
      return { ok: false, reason: 'CI proof metadata is incomplete' }
    }
    const metadata = validateCiRunMetadata(context.evidenceRoot, document)
    if (!metadata.ok) return metadata
  }

  const artifact = validateArtifact(context.evidenceRoot, document, spec)
  if (!artifact.ok) return artifact
  const expectedMarker = spec.id === 'database_proof'
    ? `PASS: ${document.migrationCount} migrations and all disposable database contracts succeeded`
    : spec.id === 'auth_configuration'
      ? 'PASS: authenticated durable text configuration contracts succeeded'
      : spec.id === 'retention_operations'
        ? 'PASS: durable text retention operations contracts succeeded'
        : spec.id === 'export_delete'
          ? 'PASS: assessment session export and delete contracts succeeded'
          : null
  const lines = artifact.text.split(/\r?\n/)
  const markerFound = spec.id === 'ci_evidence'
    ? lines.some((line) => /^\[ai-path-db-proof\] PASS: [1-9][0-9]* migrations and all disposable database contracts succeeded$/.test(line))
    : lines.includes(expectedMarker) || lines.includes(`[ai-path-db-proof] ${expectedMarker}`)
  if (!markerFound) {
    return { ok: false, reason: 'artifact success marker is absent or inconsistent' }
  }
  return { ok: true }
}

function validateApprovals(index) {
  const roles = ['platform', 'privacy', 'release', 'security']
  if (!Array.isArray(index.approvals) || index.approvals.length !== roles.length) return false
  const seen = new Set()
  for (const approval of index.approvals) {
    if (!isRecord(approval)
        || !roles.includes(approval.role)
        || seen.has(approval.role)
        || approval.decision !== 'approved'
        || typeof approval.reference !== 'string'
        || !/^https:\/\//.test(approval.reference)) return false
    seen.add(approval.role)
  }
  return roles.every((role) => seen.has(role))
}

function inspectEvidence(root, evidenceRoot, expectedCommit) {
  const indexFile = readJson(join(evidenceRoot, 'evidence-index.json'))
  if (!indexFile.ok) {
    return {
      ok: false,
      releaseCommit: null,
      index: { status: 'missing_or_invalid', reason: `evidence index ${indexFile.reason}` },
      checks: evidenceSpecs.map((spec) => ({ id: spec.id, status: 'missing', reason: 'evidence index is unavailable' })),
    }
  }
  const index = indexFile.value
  const releaseCommit = isRecord(index) && typeof index.releaseCommit === 'string'
    ? index.releaseCommit
    : null
  const documents = isRecord(index) && isRecord(index.documents) ? index.documents : null
  const indexValid = isRecord(index)
    && index.schemaVersion === 1
    && index.gateVersion === AI_PATH_DURABLE_TEXT_GATE_VERSION
    && typeof releaseCommit === 'string'
    && commitPattern.test(releaseCommit)
    && (!expectedCommit || releaseCommit === expectedCommit)
    && documents !== null
    && validateApprovals(index)

  if (!indexValid) {
    return {
      ok: false,
      releaseCommit,
      index: { status: 'invalid', reason: 'index version, commit, document map, or approvals are invalid' },
      checks: evidenceSpecs.map((spec) => ({ id: spec.id, status: 'blocked', reason: 'evidence index is invalid' })),
    }
  }

  const checks = evidenceSpecs.map((spec) => {
    const expectedDigest = documents[spec.document]
    const file = readJson(join(evidenceRoot, spec.document))
    if (!file.ok) return { id: spec.id, status: 'missing', reason: `${spec.document} ${file.reason}` }
    if (typeof expectedDigest !== 'string'
        || !sha256Pattern.test(expectedDigest)
        || digest(file.buffer) !== expectedDigest) {
      return { id: spec.id, status: 'invalid', reason: 'document digest is missing or mismatched' }
    }
    const result = validateDocument(file.value, spec, { root, evidenceRoot, releaseCommit })
    return {
      id: spec.id,
      status: result.ok ? 'verified' : 'invalid',
      reason: result.ok ? 'commit-bound document and artifact verified' : result.reason,
    }
  })
  return {
    ok: checks.every((check) => check.status === 'verified'),
    releaseCommit,
    index: { status: 'verified', reason: 'index contract and role approvals verified' },
    checks,
  }
}

export function inspectDurableTextGate(options = {}) {
  const root = resolve(options.root ?? scriptRoot)
  const evidenceRoot = resolve(root, options.evidenceDirectory ?? defaultEvidenceDirectory)
  const expectedCommit = options.releaseCommit ?? null
  const source = inspectSource(root)
  const evidence = inspectEvidence(root, evidenceRoot, expectedCommit)
  const readyForReviewedActivation = source.ok && evidence.ok
  return {
    gateVersion: AI_PATH_DURABLE_TEXT_GATE_VERSION,
    scope: 'authenticated-durable-text-sessions-only',
    state: !source.ok
      ? 'CLOSED_SOURCE_UNSAFE'
      : readyForReviewedActivation
        ? 'READY_FOR_REVIEWED_ACTIVATION'
        : 'CLOSED_EVIDENCE_MISSING',
    activationOpen: false,
    readyForReviewedActivation,
    source,
    evidence,
    policy: {
      readsEnvironment: false,
      readsCredentialStores: false,
      printsEvidenceContents: false,
      rejectsKnownSecretPatterns: true,
      makesNetworkCalls: false,
      launchesSubprocesses: false,
      mutatesWorkspace: false,
      opensLatches: false,
      permitsRealtime: false,
    },
  }
}

export function durableTextGateExitCode(report, options = {}) {
  if (!report.source.ok) return 1
  if (options.requireReady && !report.readyForReviewedActivation) return 2
  return 0
}

export function formatDurableTextGate(report) {
  const lines = [
    'AI Path authenticated durable text gate',
    `State: ${report.state}`,
    'Activation open: NO',
    `Ready for reviewed activation change: ${report.readyForReviewedActivation ? 'YES' : 'NO'}`,
    `Source inventory: ${report.source.inventory.present}/${report.source.inventory.required}`,
    `Evidence index: ${report.evidence.index.status}`,
  ]
  report.source.latches.forEach((latch) => lines.push(`  - [${latch.status.toUpperCase()}] ${latch.id}: ${latch.reason}`))
  report.evidence.checks.forEach((check) => lines.push(`  - [${check.status.toUpperCase()}] ${check.id}: ${check.reason}`))
  lines.push('This gate never reads environment variables or secrets, calls a network, opens a latch, or permits Realtime.')
  return lines.join('\n')
}

function parseCli(argv) {
  const options = { json: false, requireReady: false, evidenceDirectory: undefined, releaseCommit: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--json') options.json = true
    else if (arg === '--require-ready') options.requireReady = true
    else if (arg === '--evidence-dir') options.evidenceDirectory = argv[++index]
    else if (arg === '--release-commit') options.releaseCommit = argv[++index]
    else throw new Error(`Unknown or incomplete argument: ${arg}`)
  }
  if (options.releaseCommit && !commitPattern.test(options.releaseCommit)) {
    throw new Error('--release-commit must be a lowercase 40-character Git commit SHA.')
  }
  return options
}

function main() {
  try {
    const options = parseCli(process.argv.slice(2))
    const report = inspectDurableTextGate(options)
    process.stdout.write(options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : `${formatDurableTextGate(report)}\n`)
    process.exitCode = durableTextGateExitCode(report, options)
  } catch (error) {
    process.stderr.write(`AI Path durable text gate: ${error instanceof Error ? error.message : 'invalid invocation'}\n`)
    process.exitCode = 64
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
