#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const commitPattern = /^[0-9a-f]{40}$/
const maxLogBytes = 4 * 1024 * 1024
const prohibitedPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
  /authorization:\s*bearer\s+\S+/i,
  /set-cookie:\s*[^\r\n]+/i,
  /postgres(?:ql)?:\/\/[^:\s/@]+:[^@\s/]+@/i,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}/,
]

export const STAGING_EVIDENCE_SPECS = [
  {
    id: 'auth',
    option: 'authLog',
    log: 'auth-proof.log',
    document: 'auth-proof.json',
    kind: 'authenticated_text_session_configuration_proof',
    marker: 'PASS: authenticated durable text configuration contracts succeeded',
    checks: [
      'verified-principal', 'http-only-cookie', 'same-site-cookie',
      'secure-cookie-in-production', 'owner-a-access', 'owner-b-denied',
      'unauthenticated-denied', 'server-only-service-credential',
    ],
    metadata: { provider: 'supabase', transport: 'http-only-cookie' },
  },
  {
    id: 'retention',
    option: 'retentionLog',
    log: 'retention-proof.log',
    document: 'retention-proof.json',
    kind: 'retention_operations_proof',
    marker: 'PASS: durable text retention operations contracts succeeded',
    checks: [
      'bounded-90-day-purge', 'owner-hard-delete', 'account-cascade',
      'source-session-cascade', 'idempotent-retry', 'scheduler-auth',
      'backup-retention-reviewed', 'deletion-latency-alert',
    ],
    metadata: { policyDays: 90 },
  },
  {
    id: 'export-delete',
    option: 'exportDeleteLog',
    log: 'export-delete-proof.log',
    document: 'export-delete-proof.json',
    kind: 'assessment_session_export_delete_proof',
    marker: 'PASS: assessment session export and delete contracts succeeded',
    checks: [
      'owner-export', 'cross-owner-export-denied', 'owner-hard-delete',
      'cross-owner-delete-denied', 'post-delete-not-found', 'account-cascade',
    ],
    metadata: { resource: 'assessment-session' },
  },
]

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

function readSafeLog(path, spec) {
  if (!path || !existsSync(path)) throw new Error(`${spec.id} evidence log is missing`)
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${spec.id} evidence must be a regular non-symlink file`)
  }
  if (stat.size > maxLogBytes) throw new Error(`${spec.id} evidence exceeds 4 MiB`)
  const bytes = readFileSync(path)
  const text = bytes.toString('utf8')
  if (prohibitedPatterns.some((pattern) => pattern.test(text))) {
    throw new Error(`${spec.id} evidence appears to contain prohibited secret material`)
  }
  const lines = text.split(/\r?\n/)
  if (!lines.includes(spec.marker)) throw new Error(`${spec.id} evidence success marker is absent`)
  for (const check of spec.checks) {
    if (!lines.includes(`PASS: ${check}`)) {
      throw new Error(`${spec.id} evidence check is absent: ${check}`)
    }
  }
  return bytes
}

export function finalizeStagingEvidence(options) {
  if (!commitPattern.test(options.releaseCommit ?? '')) {
    throw new Error('release commit must be a lowercase 40-character Git SHA')
  }
  const root = resolve(options.root ?? scriptRoot)
  const outputDirectory = resolve(options.outputDirectory)
  if (existsSync(outputDirectory)) throw new Error('output directory already exists; refusing to overwrite evidence')

  const prepared = STAGING_EVIDENCE_SPECS.map((spec) => ({
    spec,
    bytes: readSafeLog(resolve(options[spec.option]), spec),
  }))
  const retentionRunbookSha256 = digest(readFileSync(join(root, 'docs/ai-path/RETENTION_OPERATIONS.md')))

  mkdirSync(outputDirectory, { recursive: false, mode: 0o700 })
  const written = []
  for (const { spec, bytes } of prepared) {
    writeFileSync(join(outputDirectory, spec.log), bytes, { mode: 0o600, flag: 'wx' })
    const document = {
      schemaVersion: 1,
      kind: spec.kind,
      result: 'pass',
      releaseCommit: options.releaseCommit,
      checks: spec.checks,
      ...spec.metadata,
      ...(spec.id === 'retention' ? { runbookSha256: retentionRunbookSha256 } : {}),
      artifact: { path: spec.log, sha256: digest(bytes) },
    }
    writeFileSync(
      join(outputDirectory, spec.document),
      `${JSON.stringify(document, null, 2)}\n`,
      { encoding: 'utf8', mode: 0o600, flag: 'wx' },
    )
    written.push(spec.document, spec.log)
  }
  return {
    state: 'EVIDENCE_FINALIZED_NOT_APPROVED',
    releaseCommit: options.releaseCommit,
    outputDirectory,
    written,
    opensLatches: false,
    createsApprovalIndex: false,
  }
}

function parseCli(argv) {
  const options = {}
  const names = new Map([
    ['--release-commit', 'releaseCommit'],
    ['--auth-log', 'authLog'],
    ['--retention-log', 'retentionLog'],
    ['--export-delete-log', 'exportDeleteLog'],
    ['--output-dir', 'outputDirectory'],
  ])
  for (let index = 0; index < argv.length; index += 1) {
    const name = names.get(argv[index])
    if (!name || !argv[index + 1]) throw new Error(`unknown or incomplete argument: ${argv[index]}`)
    options[name] = argv[++index]
  }
  for (const name of names.values()) {
    if (!options[name]) throw new Error(`missing required option for ${name}`)
  }
  return options
}

function main() {
  try {
    const report = finalizeStagingEvidence(parseCli(process.argv.slice(2)))
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } catch (error) {
    process.stderr.write(`AI Path staging evidence: ${error instanceof Error ? error.message : 'invalid invocation'}\n`)
    process.exitCode = 64
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
