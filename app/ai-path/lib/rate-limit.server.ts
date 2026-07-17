import 'server-only'

import { createHash } from 'node:crypto'

import {
  type AiPathRateLimitPolicyId,
  type AtomicRateLimitCommand,
  type AtomicRateLimitStore,
  type RateLimitResult,
  policyFor,
  rateLimitIdentityLabels,
  resolveDistributedRateLimitCapability,
  resolveTrustedClientAddress,
} from './rate-limit.ts'

const processState = globalThis as typeof globalThis & {
  __aiPathRateLimits?: Map<string, { count: number; windowStart: number }>
}
const store = processState.__aiPathRateLimits ??= new Map()
const MAX_BUCKETS = 5_000

function pruneStore(now: number, windowMs: number) {
  if (store.size < MAX_BUCKETS) return
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= windowMs) store.delete(key)
  }
  while (store.size >= MAX_BUCKETS) {
    const oldestKey = store.keys().next().value as string | undefined
    if (!oldestKey) break
    store.delete(oldestKey)
  }
}

function opaqueKey(label: string, salt: string) {
  return createHash('sha256').update(`${salt}:${label}`).digest('hex')
}

class ProcessLocalRateLimitStore implements AtomicRateLimitStore {
  async consume(command: AtomicRateLimitCommand): Promise<RateLimitResult> {
    pruneStore(command.nowMs, command.windowMs)
    const entries = command.keys.map(key => ({ key, entry: store.get(key) }))
    const active = entries.map(item => ({
      ...item,
      entry: item.entry && command.nowMs - item.entry.windowStart < command.windowMs ? item.entry : null,
    }))
    const denied = active.find(item => item.entry && item.entry.count >= command.limit)
    if (denied?.entry) {
      return { allowed: false, remaining: 0, resetAt: denied.entry.windowStart + command.windowMs, reason: 'exceeded' }
    }
    let remaining = command.limit - 1
    let resetAt = command.nowMs + command.windowMs
    for (const item of active) {
      if (!item.entry) {
        store.set(item.key, { count: 1, windowStart: command.nowMs })
      } else {
        item.entry.count += 1
        remaining = Math.min(remaining, command.limit - item.entry.count)
        resetAt = Math.min(resetAt, item.entry.windowStart + command.windowMs)
      }
    }
    return { allowed: true, remaining, resetAt, reason: 'allowed' }
  }
}

const localStore = new ProcessLocalRateLimitStore()

export function createDistributedRateLimitChecker(
  distributedStore: AtomicRateLimitStore,
  activation: Parameters<typeof resolveDistributedRateLimitCapability>[0],
  identitySalt: string,
) {
  const capability = resolveDistributedRateLimitCapability(activation)
  if (!capability.available || !capability.trustedProxyHops || identitySalt.length < 32) {
    throw new Error('Distributed AI Path rate limiting is disabled by the reviewed capability boundary.')
  }
  return async (request: Request, policyId: AiPathRateLimitPolicyId, verifiedUserId?: string | null) => {
    const policy = policyFor(policyId)
    const address = resolveTrustedClientAddress(request.headers, capability.trustedProxyHops!)
    if (!address) return unavailableResult()
    const keys = rateLimitIdentityLabels({ anonymousAddress: address, verifiedUserId })
      .map(label => opaqueKey(label, identitySalt))
    return distributedStore.consume({ policyId, keys, ...policy, nowMs: Date.now() })
  }
}

function unavailableResult(): RateLimitResult {
  return { allowed: false, remaining: 0, resetAt: Date.now() + 60_000, reason: 'unavailable' }
}

/**
 * Deterministic process-local limiter for AI Path routes. It intentionally
 * never falls through to ambient Supabase credentials or any network store.
 */
export async function checkAiPathRateLimit(
  request: Request,
  policyId: AiPathRateLimitPolicyId,
  verifiedUserId?: string | null,
): Promise<RateLimitResult> {
  const policy = policyFor(policyId)
  const now = Date.now()
  if (process.env.NODE_ENV === 'production') {
    // Production never falls back to process-local memory. The future runtime
    // must inject an atomic distributed store after the literal latch review.
    return unavailableResult()
  }
  const keys = rateLimitIdentityLabels({ anonymousAddress: 'local', verifiedUserId })
    .map(label => `${policyId}:${opaqueKey(label, 'ai-path-process-local-test-only')}`)
  return localStore.consume({ policyId, keys, ...policy, nowMs: now })
}

export function aiPathRateLimitResponse(result: RateLimitResult) {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  const unavailable = result.reason === 'unavailable'
  return Response.json({ error: unavailable ? 'rate_limit_unavailable' : 'rate_limit_exceeded', retryAfterSeconds }, {
    status: unavailable ? 503 : 429,
    headers: {
      'Retry-After': String(retryAfterSeconds),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
