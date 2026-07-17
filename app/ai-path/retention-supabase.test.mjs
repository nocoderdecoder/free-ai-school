import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_RETENTION_MAXIMUM_DELETES_PER_TARGET,
  AI_PATH_RETENTION_RPC_NAMES,
  AI_PATH_RETENTION_TARGET_TIMEOUT_MS,
  runSupabaseRetentionCycle,
} from './lib/retention-supabase.ts'
import { AiPathRetentionError } from './lib/retention.ts'

const now = () => new Date('2026-07-17T04:00:00.000Z')
const serverSource = await readFile(
  new URL('./lib/retention-supabase.server.ts', import.meta.url),
  'utf8',
)
const routeSource = await readFile(
  new URL('../api/cron/ai-path-retention/route.ts', import.meta.url),
  'utf8',
)
const runtimeSource = await readFile(
  new URL('./lib/retention-runtime.server.ts', import.meta.url),
  'utf8',
)
const boundedRetentionMigration = await readFile(
  new URL('../../supabase/migrations/20260717060000_ai_path_bounded_retention.sql', import.meta.url),
  'utf8',
)

function mockRpcClient(results) {
  const calls = []
  return {
    calls,
    client: {
      async rpc(name, args) {
        calls.push({ name, args })
        const result = results[name]
        if (result instanceof Error) throw result
        return result
      },
    },
  }
}

test('Supabase retention sends the exact bounded purge RPCs and returns bounded counts', async () => {
  const mock = mockRpcClient({
    purge_expired_ai_path_learning_plans: { data: 7, error: null },
    purge_expired_ai_path_sessions: { data: 5, error: null },
  })
  const result = await runSupabaseRetentionCycle(mock.client, {
    runId: 'retention_supabase01',
    now,
  })

  assert.deepEqual(AI_PATH_RETENTION_RPC_NAMES, {
    'assessment-sessions': 'purge_expired_ai_path_sessions',
    'learning-plans': 'purge_expired_ai_path_learning_plans',
  })
  assert.deepEqual(mock.calls, [
    { name: 'purge_expired_ai_path_learning_plans', args: { p_limit: 100_000 } },
    { name: 'purge_expired_ai_path_sessions', args: { p_limit: 100_000 } },
  ])
  assert.deepEqual(result, {
    runId: 'retention_supabase01',
    completedAt: now().toISOString(),
    deleted: { 'assessment-sessions': 5, 'learning-plans': 7 },
  })
})

test('gateway rejects null, fractional, negative, unsafe, and over-bound delete counts', async () => {
  for (const invalid of [
    null,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    AI_PATH_RETENTION_MAXIMUM_DELETES_PER_TARGET + 1,
  ]) {
    const mock = mockRpcClient({
      purge_expired_ai_path_learning_plans: { data: invalid, error: null },
      purge_expired_ai_path_sessions: { data: 0, error: null },
    })
    await assert.rejects(
      runSupabaseRetentionCycle(mock.client, {
        runId: 'retention_badcount01',
        now,
      }),
      error => (
        error instanceof AiPathRetentionError
        && error.code === 'invalid_delete_count'
        && error.target === 'learning-plans'
      ),
    )
  }

  const invalidConfigMock = mockRpcClient({})
  await assert.rejects(
    runSupabaseRetentionCycle(invalidConfigMock.client, {
      runId: 'retention_badbound01',
      maximumDeletesPerTarget: 100_001,
    }),
    error => error instanceof AiPathRetentionError && error.code === 'invalid_configuration',
  )
  assert.deepEqual(invalidConfigMock.calls, [])
})

test('plan failure stops the cycle before sessions and leaks no provider detail', async () => {
  const secretBody = 'private transcript and service credential must not escape'
  const mock = mockRpcClient({
    purge_expired_ai_path_learning_plans: {
      data: null,
      error: { code: 'XX000', message: secretBody },
    },
    purge_expired_ai_path_sessions: { data: 2, error: null },
  })
  const events = []
  await assert.rejects(
    runSupabaseRetentionCycle(mock.client, {
      runId: 'retention_planfail01',
      now,
      onOperationalEvent: event => events.push(event),
    }),
    error => (
      error instanceof AiPathRetentionError
      && error.code === 'purge_failed'
      && error.target === 'learning-plans'
      && !String(error).includes(secretBody)
    ),
  )
  assert.deepEqual(mock.calls, [
    { name: 'purge_expired_ai_path_learning_plans', args: { p_limit: 100_000 } },
  ])
  assert.deepEqual(events, [{
    kind: 'retention_target_failed',
    occurredAt: now().toISOString(),
    runId: 'retention_planfail01',
    target: 'learning-plans',
    errorCode: 'purge_failed',
  }])
  assert.doesNotMatch(JSON.stringify(events), new RegExp(secretBody))
})

test('thrown transport failures are normalized without leaking provider detail', async () => {
  const secretBody = 'transport included a private row body'
  const mock = mockRpcClient({
    purge_expired_ai_path_learning_plans: new Error(secretBody),
  })
  await assert.rejects(
    runSupabaseRetentionCycle(mock.client, {
      runId: 'retention_throwing01',
      now,
    }),
    error => (
      error instanceof AiPathRetentionError
      && error.code === 'purge_failed'
      && error.target === 'learning-plans'
      && !String(error).includes(secretBody)
    ),
  )
})

test('stalled RPCs fail within a fixed per-target deadline and remain retry-safe', async () => {
  const calls = []
  const client = {
    rpc(name, args) {
      calls.push({ name, args })
      return new Promise(() => {})
    },
  }
  const startedAt = Date.now()
  await assert.rejects(
    runSupabaseRetentionCycle(client, {
      runId: 'retention_timeout01',
      targetTimeoutMs: 10,
    }),
    error => (
      error instanceof AiPathRetentionError
      && error.code === 'purge_failed'
      && error.target === 'learning-plans'
    ),
  )
  assert.ok(Date.now() - startedAt < 1_000)
  assert.deepEqual(calls, [{
    name: 'purge_expired_ai_path_learning_plans',
    args: { p_limit: 100_000 },
  }])

  for (const invalid of [0, 1.5, AI_PATH_RETENTION_TARGET_TIMEOUT_MS + 1]) {
    await assert.rejects(
      runSupabaseRetentionCycle(client, {
        runId: 'retention_badtimeout01',
        targetTimeoutMs: invalid,
      }),
      error => error instanceof AiPathRetentionError && error.code === 'invalid_configuration',
    )
  }
})

test('session failure after a successful plan purge is explicit and retry-safe', async () => {
  const mock = mockRpcClient({
    purge_expired_ai_path_learning_plans: { data: 4, error: null },
    purge_expired_ai_path_sessions: {
      data: null,
      error: { message: 'database internals' },
    },
  })
  const events = []
  await assert.rejects(
    runSupabaseRetentionCycle(mock.client, {
      runId: 'retention_partial01',
      now,
      onOperationalEvent: event => events.push(event),
    }),
    error => (
      error instanceof AiPathRetentionError
      && error.code === 'purge_failed'
      && error.target === 'assessment-sessions'
    ),
  )
  assert.deepEqual(mock.calls.map(call => call.name), [
    'purge_expired_ai_path_learning_plans',
    'purge_expired_ai_path_sessions',
  ])
  assert.equal(events.length, 1)
  assert.equal(events[0].kind, 'retention_target_failed')
  assert.equal(events[0].target, 'assessment-sessions')
  assert.doesNotMatch(JSON.stringify(events), /database internals/)
})

test('bounded service-role grants and both independent code latches remain fail-closed', () => {
  assert.match(serverSource, /import 'server-only'/)
  assert.match(serverSource, /AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH = false as const/)
  assert.match(serverSource, /activation\.credentialScope !== 'service-role'/)
  assert.doesNotMatch(serverSource, /process\.env|console\.|fetch\s*\(/)
  assert.match(routeSource, /AI_PATH_RETENTION_JOB_READY = false as const/)
  assert.match(routeSource, /getAiPathRetentionHttpRuntime\(AI_PATH_RETENTION_JOB_READY\)/)
  assert.match(runtimeSource, /if \(!routeReady \|\| !AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH\)/)
  assert.ok(
    runtimeSource.indexOf('if (!routeReady || !AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH)')
      < runtimeSource.indexOf('process.env.SUPABASE_SERVICE_ROLE_KEY'),
    'literal code latches must be checked before the service credential is read',
  )
  assert.ok(
    runtimeSource.indexOf('process.env.SUPABASE_SERVICE_ROLE_KEY')
      < runtimeSource.indexOf('createClient<Database>'),
    'the service credential must be validated before client construction',
  )
  assert.match(runtimeSource, /maximumDeletesPerTarget: AI_PATH_RETENTION_MAXIMUM_DELETES_PER_TARGET/)
  assert.match(runtimeSource, /targetTimeoutMs: AI_PATH_RETENTION_TARGET_TIMEOUT_MS/)
  assert.doesNotMatch(runtimeSource, /console\.|request\.body|response\.body|transcript|check[_ -]?in[_ -]?text/i)

  assert.match(
    boundedRetentionMigration,
    /revoke all on function public\.purge_expired_ai_path_sessions\(integer\)[\s\S]*from public, anon, authenticated;/i,
  )
  assert.match(
    boundedRetentionMigration,
    /grant execute on function public\.purge_expired_ai_path_sessions\(integer\)[\s\S]*to service_role;/i,
  )
  assert.match(
    boundedRetentionMigration,
    /revoke all on function public\.purge_expired_ai_path_learning_plans\(integer\)[\s\S]*from public, anon, authenticated;/i,
  )
  assert.match(
    boundedRetentionMigration,
    /grant execute on function public\.purge_expired_ai_path_learning_plans\(integer\)[\s\S]*to service_role;/i,
  )
})

test('adapter sources have no request-body or logging surface', async () => {
  const domainSource = await readFile(
    new URL('./lib/retention-supabase.ts', import.meta.url),
    'utf8',
  )
  for (const source of [domainSource, serverSource]) {
    assert.doesNotMatch(source, /console\.|request\.body|response\.body|transcript|check[_ -]?in[_ -]?text/i)
  }
})
