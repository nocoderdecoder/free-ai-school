import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import {
  formatHumanReadiness,
  inspectAiPathReadiness,
  inspectLiteralFalse,
  readinessExitCode,
} from '../../scripts/ai-path-readiness.mjs'

const repositoryRoot = resolve(import.meta.dirname, '../..')
const script = join(repositoryRoot, 'scripts/ai-path-readiness.mjs')

const mandatorySafetyFiles = new Map([
  [
    'app/ai-path/lib/supabase-persistence.ts',
    'export const AI_PATH_SUPABASE_PRODUCTION_LATCH = false as const\n',
  ],
  [
    'app/ai-path/lib/supabase-session-repository.server.ts',
    'export const AI_PATH_TRUSTED_REPORT_WRITER_LATCH = false as const\n',
  ],
  [
    'app/ai-path/lib/analytics.ts',
    'export const AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH = false as const\n',
  ],
  [
    'app/api/cron/ai-path-retention/route.ts',
    'export const AI_PATH_RETENTION_JOB_READY = false as const\n',
  ],
  [
    'app/ai-path/lib/foundation.ts',
    'export const AI_PATH_PUBLIC_REALTIME_BOOTSTRAP_READY = false as const\n',
  ],
  [
    'app/api/ai-path/realtime/session/route.ts',
    'export async function POST() { return Response.json({ mode: "mock" }) }\n',
  ],
])

function writeFixtureFile(root, relativePath, source) {
  const absolutePath = join(root, relativePath)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, source)
}

function createSafetyFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ai-path-readiness-'))
  mandatorySafetyFiles.forEach((source, path) => writeFixtureFile(root, path, source))
  return root
}

test('current repository is safe for private alpha but not claimed production-ready', () => {
  const secretCanary = 'readiness-must-not-read-this-value'
  process.env.READINESS_TEST_SECRET_CANARY = secretCanary
  try {
    const report = inspectAiPathReadiness({ root: repositoryRoot })
    const rendered = `${JSON.stringify(report)}\n${formatHumanReadiness(report)}`

    assert.equal(report.safePrivateAlpha, true)
    assert.equal(report.productionReady, false)
    assert.equal(report.safety.ok, true)
    assert.equal(report.safety.broken, 0)
    assert.deepEqual(
      report.safety.checks.filter((check) => check.status === 'locked').map((check) => check.id),
      [
        'durable_sessions',
        'trusted_report_writer',
        'durable_plans',
        'durable_plan_gateway',
        'analytics_sink',
        'retention_job',
        'durable_retention_gateway',
        'realtime_public_bootstrap',
        'realtime_admission',
        'durable_realtime_admission_gateway',
        'realtime_admission_maintenance_gateway',
        'realtime_route_network_isolation',
      ],
    )
    assert.equal(report.inventory.privateAlpha.complete, true)
    assert.equal(report.inventory.productionFoundation.complete, true)
    assert.equal(report.externalBlockers.length, 12)
    assert.deepEqual(
      report.externalBlockers.slice(0, 4).map((blocker) => blocker.id),
      [
        'durable_plan_runtime_engineering',
        'realtime_route_engineering',
        'realtime_admission_proof_and_rollout',
        'retention_adapter_engineering',
      ],
    )
    assert.deepEqual(report.policy, {
      readsSecrets: false,
      makesNetworkCalls: false,
      mutatesWorkspace: false,
      defaultExitNonzeroOnlyForBrokenSafety: true,
    })
    assert.doesNotMatch(rendered, new RegExp(secretCanary))
  } finally {
    delete process.env.READINESS_TEST_SECRET_CANARY
  }
})

test('literal latch inspection accepts exactly one literal false export', () => {
  assert.deepEqual(
    inspectLiteralFalse('export const SAFE = false as const\n', 'SAFE'),
    { declarations: 1, literalFalse: true },
  )
  assert.equal(inspectLiteralFalse('export const SAFE = true as const\n', 'SAFE').literalFalse, false)
  assert.equal(inspectLiteralFalse('export const SAFE = process.env.READY === "yes"\n', 'SAFE').literalFalse, false)
  assert.equal(inspectLiteralFalse('// export const SAFE = false as const\n', 'SAFE').literalFalse, false)
  assert.equal(
    inspectLiteralFalse(
      'export const SAFE = false as const\nexport const SAFE = false as const\n',
      'SAFE',
    ).literalFalse,
    false,
  )
})

test('default exit is zero for incomplete source inventory when safety remains locked', () => {
  const root = createSafetyFixture()
  try {
    const report = inspectAiPathReadiness({ root })
    assert.equal(report.safety.ok, true)
    assert.equal(report.safePrivateAlpha, false)
    assert.equal(report.productionReady, false)
    assert.equal(report.safety.optionalNotPresent, 6)
    assert.equal(readinessExitCode(report), 0)
    assert.equal(readinessExitCode(report, { requireProduction: true }), 2)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('an unlocked production latch is a broken safety invariant and exits nonzero', () => {
  const root = createSafetyFixture()
  try {
    writeFixtureFile(
      root,
      'app/ai-path/lib/analytics.ts',
      'export const AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH = true as const\n',
    )
    const report = inspectAiPathReadiness({ root })
    const analytics = report.safety.checks.find((check) => check.id === 'analytics_sink')

    assert.equal(report.safety.ok, false)
    assert.equal(analytics?.status, 'broken')
    assert.equal(readinessExitCode(report), 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a direct network call in the public Realtime route breaks safety', () => {
  const root = createSafetyFixture()
  try {
    writeFixtureFile(
      root,
      'app/api/ai-path/realtime/session/route.ts',
      'export async function POST() { return fetch("https://api.openai.com/v1/realtime") }\n',
    )
    const report = inspectAiPathReadiness({ root })
    const isolation = report.safety.checks.find(
      (check) => check.id === 'realtime_route_network_isolation',
    )

    assert.equal(report.safety.ok, false)
    assert.equal(isolation?.status, 'broken')
    assert.equal(readinessExitCode(report), 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('CLI output is deterministic from another working directory', () => {
  const first = spawnSync(process.execPath, [script, '--json'], {
    cwd: tmpdir(),
    encoding: 'utf8',
  })
  const second = spawnSync(process.execPath, [script, '--json'], {
    cwd: tmpdir(),
    encoding: 'utf8',
  })

  assert.equal(first.status, 0, first.stderr)
  assert.equal(second.status, 0, second.stderr)
  assert.equal(first.stdout, second.stdout)
  const report = JSON.parse(first.stdout)
  assert.equal(report.safePrivateAlpha, true)
  assert.equal(report.productionReady, false)
})

test('CLI human output is successful by default and production enforcement exits two', () => {
  const human = spawnSync(process.execPath, [script], { encoding: 'utf8' })
  const production = spawnSync(process.execPath, [script, '--require-production'], {
    encoding: 'utf8',
  })

  assert.equal(human.status, 0, human.stderr)
  assert.match(human.stdout, /Safe private alpha: YES/)
  assert.match(human.stdout, /Production ready: NO/)
  assert.match(human.stdout, /Actionable external blockers:/)
  assert.equal(production.status, 2, production.stderr)
})
