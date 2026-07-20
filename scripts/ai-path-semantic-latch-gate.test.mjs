import assert from 'node:assert/strict'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import {
  AI_PATH_SEMANTIC_LATCH_FILES,
  inspectAiPathSemanticLatchGate,
  semanticLatchGateExitCode,
} from './ai-path-semantic-latch-gate.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const script = join(repositoryRoot, 'scripts', 'ai-path-semantic-latch-gate.mjs')

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'ai-path-semantic-latch-'))
  for (const file of AI_PATH_SEMANTIC_LATCH_FILES) {
    const destination = join(root, file)
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, readFileSync(join(repositoryRoot, file)))
  }
  return root
}

function replace(root, file, before, after) {
  const path = join(root, file)
  const source = readFileSync(path, 'utf8')
  assert.match(source, before)
  writeFileSync(path, source.replace(before, after))
}

test('current source has semantic guards or bindings before every reviewed sensitive effect', () => {
  const report = inspectAiPathSemanticLatchGate({ root: repositoryRoot })
  assert.equal(report.ok, true)
  assert.equal(report.state, 'LOCKED_SIDE_EFFECTS_VERIFIED')
  assert.equal(report.verified, report.required)
  assert.equal(report.required, 19)
  assert.equal(semanticLatchGateExitCode(report), 0)
  assert.deepEqual(report.policy, {
    readsEnvironment: false,
    readsCredentials: false,
    makesNetworkCalls: false,
    launchesSubprocesses: false,
    mutatesWorkspace: false,
    opensLatches: false,
  })
})

test('a literal-false but decorative lifecycle latch fails closed', () => {
  const root = fixture()
  try {
    replace(
      root,
      'app/ai-path/lib/realtime-provider-lifecycle.ts',
      /if \(!AI_PATH_REALTIME_PROVIDER_LIFECYCLE_LATCH\)/,
      'if (false)',
    )
    const report = inspectAiPathSemanticLatchGate({ root })
    const check = report.checks.find(item => item.id === 'realtime_provider_lifecycle_mutation')
    assert.equal(report.ok, false)
    assert.equal(check?.status, 'broken')
    assert.match(check?.failures.join('\n') ?? '', /no terminating guard/)
    assert.equal(semanticLatchGateExitCode(report), 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a credential read or provider call before its latch guard fails closed', () => {
  const root = fixture()
  try {
    replace(
      root,
      'app/ai-path/lib/retention-runtime.server.ts',
      /\): AiPathRetentionHttpRuntime \{\n/,
      '): AiPathRetentionHttpRuntime {\n  void process.env.SUPABASE_SERVICE_ROLE_KEY\n',
    )
    replace(
      root,
      'app/ai-path/lib/realtime.server.ts',
      /\}\): Promise<LiveRealtimeResult> \{\n/,
      '}): Promise<LiveRealtimeResult> {\n  await fetch(OPENAI_REALTIME_CLIENT_SECRETS_URL)\n',
    )
    const report = inspectAiPathSemanticLatchGate({ root })
    const retention = report.checks.find(item => item.id === 'durable_retention_runtime_credentials')
    const provider = report.checks.find(item => item.id === 'public_realtime_provider_call')
    assert.equal(report.ok, false)
    assert.match(retention?.failures.join('\n') ?? '', /precedes the terminating guard/)
    assert.match(provider?.failures.join('\n') ?? '', /precedes the terminating guard/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('positive activation branches and route-to-runtime bindings cannot bypass their latches', () => {
  const root = fixture()
  try {
    replace(
      root,
      'app/ai-path/lib/learning-plan-capability.ts',
      /AI_PATH_DURABLE_LEARNING_PLAN_LATCH\n    &&/,
      'true\n    &&',
    )
    replace(
      root,
      'app/api/cron/ai-path-retention/route.ts',
      /getAiPathRetentionHttpRuntime\(AI_PATH_RETENTION_JOB_READY\)/,
      'getAiPathRetentionHttpRuntime(true)',
    )
    const report = inspectAiPathSemanticLatchGate({ root })
    assert.equal(report.ok, false)
    assert.equal(report.checks.find(item => item.id === 'durable_plan_activation')?.status, 'broken')
    assert.equal(report.checks.find(item => item.id === 'retention_route_to_runtime_binding')?.status, 'broken')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('CLI is deterministic and reports the verified semantic contract count', () => {
  const first = spawnSync(process.execPath, [script, '--json'], {
    cwd: tmpdir(),
    encoding: 'utf8',
  })
  const second = spawnSync(process.execPath, [script, '--json'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
  assert.equal(first.status, 0, first.stderr)
  assert.equal(second.status, 0, second.stderr)
  assert.equal(first.stdout, second.stdout)
  const report = JSON.parse(first.stdout)
  assert.equal(report.ok, true)
  assert.equal(report.verified, 19)
})
