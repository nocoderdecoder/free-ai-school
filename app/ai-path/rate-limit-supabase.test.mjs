import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  SupabaseAtomicRateLimitStore,
  SupabaseRateLimitError,
} from './lib/rate-limit-supabase.ts'

const command = {
  policyId: 'ai-path-diagnostic',
  keys: ['a'.repeat(64), 'b'.repeat(64)],
  limit: 20,
  windowMs: 3_600_000,
  nowMs: Date.parse('2026-07-18T12:00:00.000Z'),
}

test('Supabase rate-limit adapter invokes only the bounded atomic RPC', async () => {
  let call
  const store = new SupabaseAtomicRateLimitStore({
    rpc(name, args) {
      call = { name, args }
      return Promise.resolve({ data: { allowed: true, remaining: 19, resetAt: command.nowMs + command.windowMs, reason: 'allowed' }, error: null })
    },
  })
  assert.deepEqual(await store.consume(command), {
    allowed: true, remaining: 19, resetAt: command.nowMs + command.windowMs, reason: 'allowed',
  })
  assert.deepEqual(call, {
    name: 'consume_ai_path_rate_limit',
    args: {
      p_policy_id: command.policyId,
      p_identity_hashes: [...command.keys],
      p_limit: command.limit,
      p_window_ms: command.windowMs,
      p_now: '2026-07-18T12:00:00.000Z',
    },
  })
})

test('Supabase rate-limit adapter rejects provider errors and malformed responses', async () => {
  for (const client of [
    { rpc: () => Promise.resolve({ data: null, error: { message: 'private' } }) },
    { rpc: () => Promise.resolve({ data: { allowed: true }, error: null }) },
  ]) {
    await assert.rejects(
      new SupabaseAtomicRateLimitStore(client).consume(command),
      error => error instanceof SupabaseRateLimitError,
    )
  }
})

test('rate-limit SQL is forced-RLS, service-only, opaque, bounded and concurrency locked', async () => {
  const sql = await readFile(new URL('../../supabase/migrations/20260718000000_ai_path_rate_limits.sql', import.meta.url), 'utf8')
  assert.match(sql, /force row level security/i)
  assert.match(sql, /revoke all[\s\S]+from public, anon, authenticated/i)
  assert.match(sql, /grant execute[\s\S]+to service_role/i)
  assert.match(sql, /pg_advisory_xact_lock/i)
  assert.match(sql, /identity_hash ~ '\^\[0-9a-f\]\{64\}\$'/)
  assert.match(sql, /array_length\(v_hashes, 1\)[\s\S]+between 1 and 2/i)
  const bucketColumns = sql.match(
    /create table public\.ai_path_rate_limit_buckets \(([\s\S]*?)\n\);/i,
  )?.[1] ?? ''
  assert.doesNotMatch(bucketColumns, /\b(?:ip_address|user_id|transcript|prompt|answer_text)\b/i)
})

test('production assembly checks both literal latches before credentials', async () => {
  const source = await readFile(new URL('./lib/rate-limit-runtime.server.ts', import.meta.url), 'utf8')
  const latch = source.indexOf('if (!AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH || !AI_PATH_SUPABASE_RATE_LIMIT_GATEWAY_LATCH)')
  assert.ok(latch >= 0)
  for (const secret of ['process.env.SUPABASE_SERVICE_ROLE_KEY', 'process.env.AI_PATH_RATE_LIMIT_IDENTITY_SALT']) {
    assert.ok(source.indexOf(secret) > latch)
  }
  assert.match(source, /AI_PATH_SUPABASE_RATE_LIMIT_GATEWAY_LATCH = false as const/)
})
