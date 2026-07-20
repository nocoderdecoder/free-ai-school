import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH,
  AI_PATH_RATE_LIMIT_POLICIES,
  AI_PATH_RATE_LIMIT_SCHEMA_VERSION,
  rateLimitIdentityLabels,
  resolveDistributedRateLimitCapability,
  resolveTrustedClientAddress,
} from './lib/rate-limit.ts'

const reviewedActivation = {
  enabled: 'true',
  schemaVersion: AI_PATH_RATE_LIMIT_SCHEMA_VERSION,
  credentialScope: 'server-only',
  atomicityProof: 'passed',
  trustedProxyHops: 2,
  trustedProxyReviewReference: 'https://governance.example/ai-path/proxy-topology',
  rollbackReady: 'true',
}

function headers(values) {
  return { get: name => values[name.toLowerCase()] ?? null }
}

test('all route policies are fixed, bounded, and immutable', () => {
  assert.deepEqual(Object.keys(AI_PATH_RATE_LIMIT_POLICIES).sort(), [
    'ai-path-analysis', 'ai-path-auth-callback', 'ai-path-auth-email',
    'ai-path-auth-sign-in', 'ai-path-diagnostic',
    'ai-path-plan-adaptation', 'ai-path-plan-check-in', 'ai-path-plan-create',
    'ai-path-plan-delete', 'ai-path-plan-export', 'ai-path-plan-read',
    'ai-path-plan-task', 'ai-path-plan-time-budget',
    'ai-path-question-adaptation', 'ai-path-realtime-session', 'ai-path-session',
    'ai-path-session-delete', 'ai-path-session-export', 'ai-path-session-read',
  ])
  assert.deepEqual(AI_PATH_RATE_LIMIT_POLICIES['ai-path-auth-callback'], { limit: 10, windowMs: 15 * 60_000 })
  assert.deepEqual(AI_PATH_RATE_LIMIT_POLICIES['ai-path-auth-email'], { limit: 3, windowMs: 3_600_000 })
  assert.deepEqual(AI_PATH_RATE_LIMIT_POLICIES['ai-path-auth-sign-in'], { limit: 5, windowMs: 15 * 60_000 })
  assert.deepEqual(AI_PATH_RATE_LIMIT_POLICIES['ai-path-question-adaptation'], { limit: 60, windowMs: 3_600_000 })
  for (const [id, policy] of Object.entries(AI_PATH_RATE_LIMIT_POLICIES)) {
    assert.match(id, /^ai-path-[a-z-]+$/)
    assert.equal(Number.isInteger(policy.limit) && policy.limit >= 1 && policy.limit <= 120, true)
    assert.equal(Number.isInteger(policy.windowMs) && policy.windowMs >= 15 * 60_000 && policy.windowMs <= 3_600_000, true)
    assert.equal(Object.isFrozen(policy), true)
  }
  assert.equal(Object.isFrozen(AI_PATH_RATE_LIMIT_POLICIES), true)
})

test('complete activation cannot open the literal-false distributed latch', () => {
  assert.equal(AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH, false)
  const capability = resolveDistributedRateLimitCapability(reviewedActivation)
  assert.equal(capability.available, false)
  assert.equal(capability.productionReady, false)
  assert.match(capability.reason, /latch remains closed/)
})

test('every distributed and proxy attestation fails closed independently', () => {
  for (const [key, value] of [
    ['enabled', 'false'], ['schemaVersion', 'wrong'], ['credentialScope', 'browser'],
    ['atomicityProof', 'claimed'], ['trustedProxyHops', 0],
    ['trustedProxyReviewReference', 'not-reviewed'], ['rollbackReady', 'false'],
  ]) {
    const capability = resolveDistributedRateLimitCapability({ ...reviewedActivation, [key]: value })
    assert.equal(capability.available, false, key)
    assert.doesNotMatch(capability.reason, /is ready$/)
  }
})

test('trusted proxy parsing selects the reviewed hop and rejects malformed chains', () => {
  const chain = headers({ 'x-forwarded-for': '203.0.113.7, 2001:db8::1, 10.0.0.2' })
  assert.equal(resolveTrustedClientAddress(chain, 1), '10.0.0.2')
  assert.equal(resolveTrustedClientAddress(chain, 2), '2001:db8::1')
  assert.equal(resolveTrustedClientAddress(chain, 3), '203.0.113.7')
  assert.equal(resolveTrustedClientAddress(chain, 4), null)
  assert.equal(resolveTrustedClientAddress(headers({ 'x-real-ip': '198.51.100.9' }), 1), '198.51.100.9')
  assert.equal(resolveTrustedClientAddress(headers({ 'x-forwarded-for': 'attacker, 10.0.0.2' }), 1), null)
})

test('identity labels layer anonymous and verified-principal buckets only', () => {
  assert.deepEqual(rateLimitIdentityLabels({ anonymousAddress: '203.0.113.7' }), ['anonymous:203.0.113.7'])
  assert.deepEqual(rateLimitIdentityLabels({
    anonymousAddress: '203.0.113.7',
    verifiedUserId: '11111111-1111-4111-8111-111111111111',
  }), ['anonymous:203.0.113.7', 'principal:11111111-1111-4111-8111-111111111111'])
  assert.deepEqual(rateLimitIdentityLabels({ anonymousAddress: null, verifiedUserId: 'forged' }), ['anonymous:unknown'])
})

test('production server path never falls back to memory and responses are private', async () => {
  const source = await readFile(new URL('./lib/rate-limit.server.ts', import.meta.url), 'utf8')
  assert.match(source, /process\.env\.NODE_ENV === 'production'[\s\S]*return unavailableResult\(\)/)
  assert.match(source, /X-Content-Type-Options': 'nosniff'/)
  assert.doesNotMatch(source, /x-forwarded-for.*split\(', '\)\[0\]/)
})
