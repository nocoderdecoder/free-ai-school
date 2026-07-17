#!/usr/bin/env node

import { constants, accessSync, readFileSync, readdirSync } from 'node:fs'
import { delimiter, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const AI_PATH_DB_PROOF_PREFLIGHT_VERSION = '2026-07-17.v1'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const requiredMigrations = [
  '20260717000000_ai_path_assessment_sessions.sql',
  '20260717010000_ai_path_learning_plans.sql',
  '20260717020000_ai_path_trusted_report_writer.sql',
  '20260717040000_ai_path_realtime_admission.sql',
  '20260717050000_ai_path_goal_type_binding.sql',
  '20260717060000_ai_path_bounded_retention.sql',
  '20260717070000_ai_path_realtime_admission_lifecycle.sql',
  '20260717080000_ai_path_realtime_admission_continuity_policy.sql',
]
const requiredProofFiles = [
  'scripts/ai-path-db-proof.sh',
  'scripts/ai-path-db-proof/00-local-supabase-compat.sql',
  'scripts/ai-path-db-proof/10-contracts.sql',
  'scripts/ai-path-db-proof/20-concurrency-reserve.sql',
  'scripts/ai-path-db-proof/ci-bootstrap.sql',
]

function executablePath(command, pathValue) {
  for (const directory of String(pathValue ?? '').split(delimiter).filter(Boolean)) {
    const candidate = join(directory, command)
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // Continue through PATH without invoking a shell or reading configuration.
    }
  }
  return null
}

function psqlRuntime(pathValue) {
  const path = executablePath('psql', pathValue)
  if (!path) return { available: false, eligible: false, path: null, version: null, reason: 'psql_not_found' }
  const result = spawnSync(path, ['--version'], { encoding: 'utf8', timeout: 2_000 })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  const match = /psql \(PostgreSQL\) (\d+)(?:\.(\d+))?/i.exec(output)
  if (result.status !== 0 || !match) {
    return { available: true, eligible: false, path, version: null, reason: 'psql_version_unreadable' }
  }
  const major = Number(match[1])
  return {
    available: true,
    eligible: major >= 15,
    path,
    version: match[0].replace(/^psql \(PostgreSQL\) /i, ''),
    reason: major >= 15 ? null : 'postgresql_15_or_newer_required',
  }
}

function sourceInventory(repoRoot) {
  const issues = []
  for (const relativePath of requiredProofFiles) {
    try {
      const contents = readFileSync(join(repoRoot, relativePath), 'utf8')
      if (contents.length < 40) issues.push(`proof_file_too_small:${relativePath}`)
    } catch {
      issues.push(`proof_file_missing:${relativePath}`)
    }
  }

  const migrationDir = join(repoRoot, 'supabase/migrations')
  let migrationNames = []
  try {
    migrationNames = readdirSync(migrationDir).filter(name => /_ai_path_.*\.sql$/.test(name)).sort()
  } catch {
    issues.push('migration_directory_missing')
  }
  for (const migration of requiredMigrations) {
    if (!migrationNames.includes(migration)) issues.push(`migration_missing:${migration}`)
  }
  const continuity = migrationNames.filter(name => /^20260717080000_ai_path_realtime_admission_.*\.sql$/.test(name))
  if (continuity.length !== 1) issues.push(`continuity_migration_count:${continuity.length}`)

  return {
    ok: issues.length === 0,
    requiredMigrationCount: requiredMigrations.length,
    discoveredMigrationCount: migrationNames.length,
    issues,
  }
}

export function inspectDatabaseProofPreflight({
  repoRoot = scriptRoot,
  pathValue = process.env.PATH,
  sourceOnly = false,
} = {}) {
  const source = sourceInventory(repoRoot)
  const runtime = sourceOnly
    ? { required: false, available: null, eligible: null, path: null, version: null, reason: null }
    : { required: true, ...psqlRuntime(pathValue) }
  const ok = source.ok && (sourceOnly || runtime.eligible === true)
  return Object.freeze({
    preflightVersion: AI_PATH_DB_PROOF_PREFLIGHT_VERSION,
    ok,
    mode: sourceOnly ? 'source-only' : 'runtime-required',
    source,
    runtime,
    mutatesDatabase: false,
    connectsToDatabase: false,
  })
}

function printHuman(report) {
  const status = report.ok ? 'PASS' : 'BLOCKED'
  process.stdout.write(`[ai-path-db-proof-preflight] ${status}: source inventory ${report.source.ok ? 'ready' : 'invalid'}\n`)
  if (report.runtime.required) {
    process.stdout.write(`[ai-path-db-proof-preflight] psql ${report.runtime.eligible ? report.runtime.version : report.runtime.reason}\n`)
  }
  for (const issue of report.source.issues) process.stdout.write(`[ai-path-db-proof-preflight] ${issue}\n`)
}

const isCli = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (isCli) {
  const args = new Set(process.argv.slice(2))
  const supported = new Set(['--json', '--source-only'])
  const unknown = [...args].filter(argument => !supported.has(argument))
  if (unknown.length) {
    process.stderr.write(`Unsupported argument: ${unknown[0]}\n`)
    process.exitCode = 2
  } else {
    const report = inspectDatabaseProofPreflight({ sourceOnly: args.has('--source-only') })
    if (args.has('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    else printHuman(report)
    if (!report.ok) process.exitCode = 2
  }
}

