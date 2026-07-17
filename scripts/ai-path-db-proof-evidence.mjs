#!/usr/bin/env node

import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const AI_PATH_DB_PROOF_EVIDENCE_VERSION = '2026-07-17.v1'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workflowName = 'AI Path disposable PostgreSQL proof'
const workflowFile = '.github/workflows/ai-path-db-proof.yml'
const proofLogName = 'database-proof.log'
const maximumInputBytes = 4 * 1024 * 1024
const commitPattern = /^[0-9a-f]{40}$/
const runIdPattern = /^[1-9][0-9]*$/
const successMarker = /^\[ai-path-db-proof\] PASS: ([1-9][0-9]*) migrations and all disposable database contracts succeeded$/
const prohibitedPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
  /authorization:\s*bearer\s+\S+/i,
  /set-cookie:\s*[^\r\n]+/i,
  /postgres(?:ql)?:\/\/[^:\s/@]+:[^@\s/]+@/i,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}/,
]

const databaseChecks = [
  'migrations-applied',
  'rls-owner-isolation',
  'trusted-writer-binding',
  'bounded-retention',
  'owner-export-delete',
  'account-and-source-cascade',
  'rollback-clean',
]

const ciChecks = [
  'workflow-conclusion-success',
  'database-proof-job-success',
  'source-tests-success',
]

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

function encode(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readBoundedRegularFile(path) {
  if (!existsSync(path)) throw new Error(`input file is missing: ${path}`)
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`input must be a regular non-symlink file: ${path}`)
  if (stat.size > maximumInputBytes) throw new Error(`input exceeds ${maximumInputBytes} bytes: ${path}`)
  const buffer = readFileSync(path)
  const text = buffer.toString('utf8')
  if (prohibitedPatterns.some((pattern) => pattern.test(text))) {
    throw new Error(`input appears to contain prohibited secret material: ${path}`)
  }
  return { buffer, text }
}

function normalizeRunMetadata(value) {
  if (!isRecord(value)) throw new Error('run metadata must be a JSON object')
  const runId = String(value.databaseId ?? '')
  const runUrl = String(value.url ?? '')
  const headSha = String(value.headSha ?? '')
  const event = String(value.event ?? '')
  const conclusion = String(value.conclusion ?? '')
  if (!runIdPattern.test(runId)) throw new Error('run metadata databaseId must be a positive integer')
  if (!Number.isSafeInteger(Number(runId))) throw new Error('run metadata databaseId exceeds the safe integer range')
  if (!commitPattern.test(headSha)) throw new Error('run metadata headSha must be a lowercase 40-character Git commit SHA')
  if (!['push', 'workflow_dispatch', 'pull_request'].includes(event)) throw new Error('run metadata event is unsupported')
  if (conclusion !== 'success') throw new Error('run metadata must describe a completed successful run')
  if (value.workflowName !== workflowName) throw new Error('run metadata workflowName does not match the proof workflow')
  const expectedUrl = new RegExp(`^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/actions/runs/${runId}$`)
  if (!expectedUrl.test(runUrl)) throw new Error('run metadata URL is malformed or does not match databaseId')
  return {
    conclusion: 'success',
    databaseId: Number(runId),
    event,
    headSha,
    url: runUrl,
    workflowName,
  }
}

function normalizeCandidateMetadata(value) {
  if (!isRecord(value)) throw new Error('candidate metadata must be an object')
  const runId = String(value.runId ?? '')
  const runUrl = String(value.runUrl ?? '')
  const headSha = String(value.headSha ?? '')
  const event = String(value.event ?? '')
  if (!runIdPattern.test(runId)) throw new Error('candidate runId must be a positive integer')
  if (!Number.isSafeInteger(Number(runId))) throw new Error('candidate runId exceeds the safe integer range')
  if (!commitPattern.test(headSha)) throw new Error('candidate headSha must be a lowercase 40-character Git commit SHA')
  if (!['push', 'workflow_dispatch', 'pull_request'].includes(event)) throw new Error('candidate event is unsupported')
  const expectedUrl = new RegExp(`^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/actions/runs/${runId}$`)
  if (!expectedUrl.test(runUrl)) throw new Error('candidate run URL is malformed or does not match runId')
  return { event, headSha, runId, runUrl }
}

function inspectProofLog(input) {
  if (prohibitedPatterns.some((pattern) => pattern.test(input.text))) {
    throw new Error('proof log appears to contain prohibited secret material')
  }
  const matches = input.text.split(/\r?\n/).map((line) => successMarker.exec(line)).filter(Boolean)
  if (matches.length !== 1) throw new Error('proof log must contain exactly one content-free success marker')
  const migrationCount = Number(matches[0][1])
  if (migrationCount < 9) throw new Error('proof log migration count is below the required baseline')
  return { migrationCount, sha256: digest(input.buffer) }
}

function classification(event, final) {
  if (event === 'pull_request') {
    return {
      classification: 'validation-only',
      releaseEligible: false,
      reason: 'pull_request runs cannot prove the exact release commit',
    }
  }
  if (!final) {
    return {
      classification: 'validation-only',
      releaseEligible: false,
      reason: 'workflow conclusion must be verified after the run completes',
    }
  }
  return {
    classification: 'release-candidate',
    releaseEligible: true,
    reason: 'completed accepted-event metadata is bound to the exact head SHA',
  }
}

function validateCandidateManifest(value, proof, run, databaseProof) {
  if (!isRecord(value)
      || value.schemaVersion !== 1
      || value.generatorVersion !== AI_PATH_DB_PROOF_EVIDENCE_VERSION
      || value.classification !== 'validation-only'
      || value.releaseEligible !== false
      || value.releaseCommit !== run.headSha
      || String(value.runId) !== String(run.databaseId)
      || value.event !== run.event
      || value.workflowFile !== workflowFile
      || value.gatePacketComplete !== false
      || !isRecord(value.files)) {
    throw new Error('candidate manifest does not match the completed run')
  }
  const expectedCandidateRun = encode({
    conclusion: 'not-final',
    databaseId: run.databaseId,
    event: run.event,
    headSha: run.headSha,
    url: run.url,
    workflowName,
  })
  if (value.files[proofLogName] !== proof.sha256
      || value.files['database-proof.json'] !== digest(encode(databaseProof))
      || value.files['ci-run-candidate.json'] !== digest(expectedCandidateRun)) {
    throw new Error('candidate manifest file digests do not match the supplied proof bundle')
  }
}

export function createDatabaseProofEvidence({
  mode,
  proofLog,
  postgresMajor,
  runMetadata,
  candidateMetadata,
  candidateManifest,
}) {
  if (!['candidate', 'final'].includes(mode)) throw new Error('mode must be candidate or final')
  if (!Number.isInteger(postgresMajor) || postgresMajor < 15) throw new Error('PostgreSQL major must be an integer of at least 15')
  const proof = inspectProofLog(proofLog)
  const normalized = mode === 'final'
    ? normalizeRunMetadata(runMetadata)
    : normalizeCandidateMetadata(candidateMetadata)
  const releaseCommit = normalized.headSha
  const databaseProof = {
    schemaVersion: 1,
    kind: 'disposable_postgresql_behavioral_proof',
    result: 'pass',
    releaseCommit,
    postgresMajor,
    migrationCount: proof.migrationCount,
    harness: 'scripts/ai-path-db-proof.sh',
    checks: databaseChecks,
    artifact: { path: proofLogName, sha256: proof.sha256 },
  }
  const files = {
    [proofLogName]: proofLog.buffer,
    'database-proof.json': encode(databaseProof),
  }
  const event = normalized.event
  const status = classification(event, mode === 'final')

  if (mode === 'final') {
    validateCandidateManifest(candidateManifest, proof, normalized, databaseProof)
    const ciRun = encode(normalized)
    const runId = String(normalized.databaseId)
    files['ci-run.json'] = ciRun
    files['ci-proof.json'] = encode({
      schemaVersion: 1,
      kind: 'github_actions_release_proof',
      result: 'pass',
      releaseCommit,
      workflowFile,
      conclusion: 'success',
      runId,
      runUrl: normalized.url,
      artifactName: `ai-path-db-proof-${runId}`,
      checks: ciChecks,
      artifact: { path: proofLogName, sha256: proof.sha256 },
      runMetadata: { path: 'ci-run.json', sha256: digest(ciRun) },
    })
  } else {
    files['ci-run-candidate.json'] = encode({
      conclusion: 'not-final',
      databaseId: Number(normalized.runId),
      event,
      headSha: releaseCommit,
      url: normalized.runUrl,
      workflowName,
    })
  }

  const fileDigests = Object.fromEntries(Object.entries(files).map(([name, value]) => [name, digest(value)]))
  const manifest = {
    schemaVersion: 1,
    generatorVersion: AI_PATH_DB_PROOF_EVIDENCE_VERSION,
    ...status,
    releaseCommit,
    runId: mode === 'final' ? String(normalized.databaseId) : normalized.runId,
    event,
    workflowFile,
    files: fileDigests,
    gatePacketComplete: false,
    missingGateEvidence: [
      'auth-proof.json',
      'retention-proof.json',
      'export-delete-proof.json',
      'evidence-index.json',
      'four reviewed approvals',
    ],
  }
  files['database-proof-evidence-manifest.json'] = encode(manifest)
  return { files, manifest }
}

function parseCli(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--candidate') options.mode = 'candidate'
    else if (['--proof-log', '--postgres-major', '--run-metadata', '--candidate-manifest', '--event', '--head-sha', '--run-id', '--run-url', '--out-dir'].includes(arg)) {
      const value = argv[++index]
      if (!value) throw new Error(`missing value for ${arg}`)
      options[arg.slice(2)] = value
    } else throw new Error(`unsupported argument: ${arg}`)
  }
  if (!options.mode) options.mode = 'final'
  for (const required of ['proof-log', 'postgres-major', 'out-dir']) {
    if (!options[required]) throw new Error(`--${required} is required`)
  }
  if (options.mode === 'final') {
    if (!options['run-metadata']) throw new Error('--run-metadata is required in final mode')
    if (!options['candidate-manifest']) throw new Error('--candidate-manifest is required in final mode')
  }
  if (options.mode === 'candidate') {
    for (const required of ['event', 'head-sha', 'run-id', 'run-url']) {
      if (!options[required]) throw new Error(`--${required} is required in candidate mode`)
    }
  }
  return options
}

function main() {
  try {
    const options = parseCli(process.argv.slice(2))
    const proofLog = readBoundedRegularFile(resolve(scriptRoot, options['proof-log']))
    let runMetadata
    let candidateManifest
    if (options.mode === 'final') {
      const input = readBoundedRegularFile(resolve(scriptRoot, options['run-metadata']))
      const candidateInput = readBoundedRegularFile(resolve(scriptRoot, options['candidate-manifest']))
      try {
        runMetadata = JSON.parse(input.text)
        candidateManifest = JSON.parse(candidateInput.text)
      } catch {
        throw new Error('run metadata or candidate manifest is not valid JSON')
      }
    }
    const result = createDatabaseProofEvidence({
      mode: options.mode,
      proofLog,
      postgresMajor: Number(options['postgres-major']),
      runMetadata,
      candidateManifest,
      candidateMetadata: options.mode === 'candidate' ? {
        event: options.event,
        headSha: options['head-sha'],
        runId: options['run-id'],
        runUrl: options['run-url'],
      } : undefined,
    })
    const outputDirectory = resolve(scriptRoot, options['out-dir'])
    if (existsSync(outputDirectory)) {
      const outputStat = lstatSync(outputDirectory)
      if (!outputStat.isDirectory() || outputStat.isSymbolicLink()) {
        throw new Error('--out-dir must be a regular non-symlink directory')
      }
    } else {
      mkdirSync(outputDirectory, { recursive: true })
    }
    for (const name of Object.keys(result.files)) {
      if (existsSync(join(outputDirectory, name))) {
        throw new Error(`refusing to overwrite existing evidence file: ${name}`)
      }
    }
    for (const [name, value] of Object.entries(result.files)) writeFileSync(join(outputDirectory, name), value, { flag: 'wx' })
    process.stdout.write(`${encode(result.manifest)}`)
  } catch (error) {
    process.stderr.write(`AI Path database proof evidence: ${error instanceof Error ? error.message : 'invalid invocation'}\n`)
    process.exitCode = 64
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
