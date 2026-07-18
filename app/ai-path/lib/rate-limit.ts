export const AI_PATH_RATE_LIMIT_SCHEMA_VERSION = '2026-07-17.v1' as const

// Production distributed limiting requires a reviewed code change. Deployment
// configuration and an injected store cannot open this latch.
export const AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH = false as const

export const AI_PATH_RATE_LIMIT_POLICIES = Object.freeze({
  'ai-path-analysis': Object.freeze({ limit: 20, windowMs: 3_600_000 }),
  'ai-path-plan-adaptation': Object.freeze({ limit: 30, windowMs: 3_600_000 }),
  'ai-path-plan-check-in': Object.freeze({ limit: 20, windowMs: 3_600_000 }),
  'ai-path-plan-create': Object.freeze({ limit: 20, windowMs: 3_600_000 }),
  'ai-path-plan-delete': Object.freeze({ limit: 10, windowMs: 3_600_000 }),
  'ai-path-plan-export': Object.freeze({ limit: 20, windowMs: 3_600_000 }),
  'ai-path-plan-read': Object.freeze({ limit: 60, windowMs: 3_600_000 }),
  'ai-path-plan-task': Object.freeze({ limit: 120, windowMs: 3_600_000 }),
  'ai-path-plan-time-budget': Object.freeze({ limit: 30, windowMs: 3_600_000 }),
  'ai-path-question-adaptation': Object.freeze({ limit: 60, windowMs: 3_600_000 }),
  'ai-path-realtime-session': Object.freeze({ limit: 10, windowMs: 3_600_000 }),
  'ai-path-session': Object.freeze({ limit: 30, windowMs: 3_600_000 }),
  'ai-path-session-delete': Object.freeze({ limit: 10, windowMs: 3_600_000 }),
  'ai-path-session-export': Object.freeze({ limit: 20, windowMs: 3_600_000 }),
  'ai-path-session-read': Object.freeze({ limit: 60, windowMs: 3_600_000 }),
})

export type AiPathRateLimitPolicyId = keyof typeof AI_PATH_RATE_LIMIT_POLICIES

export type RateLimitResult = Readonly<{
  allowed: boolean
  remaining: number
  resetAt: number
  reason: 'allowed' | 'exceeded' | 'unavailable'
}>

export type AtomicRateLimitCommand = Readonly<{
  policyId: AiPathRateLimitPolicyId
  keys: readonly string[]
  limit: number
  windowMs: number
  nowMs: number
}>

export interface AtomicRateLimitStore {
  consume(command: AtomicRateLimitCommand): Promise<RateLimitResult>
}

export type DistributedRateLimitActivation = Readonly<{
  enabled?: string
  schemaVersion?: string
  credentialScope?: string
  atomicityProof?: string
  trustedProxyHops?: number
  trustedProxyReviewReference?: string
  rollbackReady?: string
}>

export type DistributedRateLimitCapability = Readonly<{
  available: boolean
  productionReady: boolean
  trustedProxyHops: number | null
  reason: string
}>

function reviewedReference(value: string | undefined) {
  if (!value) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function resolveDistributedRateLimitCapability(
  activation: DistributedRateLimitActivation,
): DistributedRateLimitCapability {
  const disabled = (reason: string): DistributedRateLimitCapability => ({
    available: false,
    productionReady: false,
    trustedProxyHops: null,
    reason,
  })
  if (activation.enabled !== 'true') return disabled('distributed rate limiting is not explicitly enabled')
  if (activation.schemaVersion !== AI_PATH_RATE_LIMIT_SCHEMA_VERSION) return disabled('rate-limit schema is not attested')
  if (activation.credentialScope !== 'server-only') return disabled('rate-limit credentials are not server-only')
  if (activation.atomicityProof !== 'passed') return disabled('atomic multi-key consumption is not attested')
  if (!Number.isInteger(activation.trustedProxyHops)
      || (activation.trustedProxyHops ?? 0) < 1
      || (activation.trustedProxyHops ?? 0) > 4) {
    return disabled('trusted proxy topology is invalid')
  }
  if (!reviewedReference(activation.trustedProxyReviewReference)) {
    return disabled('trusted proxy review reference is required')
  }
  if (activation.rollbackReady !== 'true') return disabled('rate-limit rollback is not attested')
  if (!AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH) return disabled('the distributed rate-limit latch remains closed')
  return {
    available: true,
    productionReady: true,
    trustedProxyHops: activation.trustedProxyHops ?? null,
    reason: 'distributed rate limiting is ready',
  }
}

function validIpv4(value: string) {
  const parts = value.split('.')
  return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function validIpv6(value: string) {
  return value.includes(':') && /^[0-9a-f:]+$/i.test(value) && value.length <= 45
}

function normalizedAddress(value: string) {
  const address = value.trim().replace(/^\[|\]$/g, '').toLowerCase()
  return validIpv4(address) || validIpv6(address) ? address : null
}

/** Selects the client hop only after an exact trusted-proxy topology review. */
export function resolveTrustedClientAddress(
  headers: Pick<Headers, 'get'>,
  trustedProxyHops: number,
): string | null {
  if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 1 || trustedProxyHops > 4) return null
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const hops = forwarded.split(',').map(normalizedAddress)
    if (hops.length > 16 || hops.some(hop => hop === null) || hops.length < trustedProxyHops) return null
    return hops[hops.length - trustedProxyHops]
  }
  if (trustedProxyHops === 1) return normalizedAddress(headers.get('x-real-ip') ?? '')
  return null
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function rateLimitIdentityLabels(input: {
  anonymousAddress: string | null
  verifiedUserId?: string | null
}) {
  const labels = input.anonymousAddress ? [`anonymous:${input.anonymousAddress}`] : ['anonymous:unknown']
  if (input.verifiedUserId && uuidPattern.test(input.verifiedUserId)) labels.push(`principal:${input.verifiedUserId.toLowerCase()}`)
  return Object.freeze(labels)
}

export function policyFor(id: AiPathRateLimitPolicyId) {
  return AI_PATH_RATE_LIMIT_POLICIES[id]
}
