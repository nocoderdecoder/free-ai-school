import type { SessionStatus } from './foundation.ts'
import type { AssessmentPrincipal } from './session-persistence.ts'

export const AI_PATH_REALTIME_ADMISSION_VERSION = '2026-07-16.v1' as const
export const AI_PATH_REALTIME_ADMISSION_LATE_FINALIZE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const AI_PATH_REALTIME_ADMISSION_INTENT_TTL_MS = 2 * 60 * 1000
export const AI_PATH_REALTIME_ADMISSION_CLOCK_SKEW_MS = 30 * 1000
export const AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH = false as const

export type RealtimeAdmissionCapability = {
  mode: 'disabled' | 'local-test' | 'production'
  available: boolean
  productionReady: boolean
  reason: string
}

export function resolveRealtimeAdmissionCapability(environment: {
  nodeEnv?: string
  enableLocalTest?: string
  enableProduction?: string
  durableStoreReady?: string
  atomicLimitsReady?: string
  spendApprovalReady?: string
}): RealtimeAdmissionCapability {
  if (environment.nodeEnv === 'test' || environment.nodeEnv === 'development') {
    return environment.enableLocalTest === 'true'
      ? { mode: 'local-test', available: true, productionReady: false, reason: 'deterministic process-local admission is enabled for tests only' }
      : { mode: 'disabled', available: false, productionReady: false, reason: 'local admission is not explicitly enabled' }
  }
  const disabled = (reason: string): RealtimeAdmissionCapability => ({ mode: 'disabled', available: false, productionReady: false, reason })
  if (environment.nodeEnv !== 'production') return disabled('admission requires an explicit runtime environment')
  if (environment.enableProduction !== 'true') return disabled('production admission is not explicitly enabled')
  if (environment.durableStoreReady !== 'true') return disabled('the durable admission store is not attested')
  if (environment.atomicLimitsReady !== 'true') return disabled('atomic concurrency and budget limits are not attested')
  if (environment.spendApprovalReady !== 'true') return disabled('the approved spend policy is not attested')
  if (!AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH) return disabled('the reviewed code-level admission latch remains closed')
  return { mode: 'production', available: true, productionReady: true, reason: 'durable Realtime admission is ready' }
}

const verifiedBindingMarker: unique symbol = Symbol('ai-path-verified-realtime-admission-ownership')
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const reservableStatuses = new Set<SessionStatus>(['consented', 'connecting'])

/**
 * A server-verified ownership assertion. It is deliberately not a storage key:
 * the authenticated database derives and owns continuity identity.
 */
export type RealtimeAdmissionBinding = Readonly<{
  ownerId: string
  assessmentSessionId: string
  [verifiedBindingMarker]: true
}>

export function createVerifiedRealtimeAdmissionBinding(input: {
  principal: AssessmentPrincipal
  ownedSession: { id: string; ownerId: string; status: SessionStatus }
}): RealtimeAdmissionBinding {
  if (input.principal.source !== 'supabase') throw new Error('a verified production principal is required')
  if (input.principal.userId !== input.ownedSession.ownerId) throw new Error('session ownership is not verified')
  if (!uuidPattern.test(input.principal.userId)) throw new Error('verified user id is invalid')
  if (!uuidPattern.test(input.ownedSession.id)) throw new Error('assessment session id is invalid')
  if (!reservableStatuses.has(input.ownedSession.status)) throw new Error('assessment session is not reservable')
  return Object.freeze({
    ownerId: input.principal.userId,
    assessmentSessionId: input.ownedSession.id,
    [verifiedBindingMarker]: true as const,
  })
}

export function isVerifiedRealtimeAdmissionBinding(value: unknown): value is RealtimeAdmissionBinding {
  if (typeof value !== 'object' || value === null) return false
  const binding = value as RealtimeAdmissionBinding
  return binding[verifiedBindingMarker] === true
    && uuidPattern.test(binding.ownerId)
    && uuidPattern.test(binding.assessmentSessionId)
}

export type RealtimeAdmissionPolicy = Readonly<{
  maxGlobalConcurrent: number
  maxUserConcurrent: number
  maxUserDailyCents: number
  maxGlobalDailyCents: number
  maxReservationCents: number
  reservationTtlMs: number
}>

export type RealtimeAdmissionPolicySelection = Readonly<{
  version: string
  policyId: string
  limits: RealtimeAdmissionPolicy
}>

export type RealtimeReservationStatus = 'reserved' | 'finalized' | 'cancelled' | 'expired'

export type RealtimeAdmissionReservation = Readonly<{
  id: string
  version: typeof AI_PATH_REALTIME_ADMISSION_VERSION
  policyId: string
  intentId: string
  idempotencyKey: string
  utcDay: string
  estimatedCents: number
  actualCents: number | null
  status: RealtimeReservationStatus
  createdAt: string
  expiresAt: string
  finalizedAt: string | null
  cancelledAt: string | null
}>

const verifiedIntentMarker: unique symbol = Symbol('ai-path-verified-realtime-admission-intent')

export type RealtimeAdmissionIntent = Readonly<{
  intentId: string
  policyId: string
  expiresAt: string
  [verifiedIntentMarker]: string
}>

/** Attaches the locally verified session to the exact content-free DB response. */
export function createVerifiedRealtimeAdmissionIntent(
  response: { intentId: string; policyId: string; expiresAt: string },
  binding: RealtimeAdmissionBinding,
): RealtimeAdmissionIntent {
  if (!isVerifiedRealtimeAdmissionBinding(binding)) throw new Error('verified ownership is required')
  const intent = { ...response } as RealtimeAdmissionIntent
  Object.defineProperty(intent, verifiedIntentMarker, {
    value: binding.assessmentSessionId,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  return Object.freeze(intent)
}

export function isVerifiedRealtimeAdmissionIntent(
  value: unknown,
  binding: RealtimeAdmissionBinding,
): value is RealtimeAdmissionIntent {
  if (typeof value !== 'object' || value === null || !isVerifiedRealtimeAdmissionBinding(binding)) return false
  return (value as RealtimeAdmissionIntent)[verifiedIntentMarker] === binding.assessmentSessionId
}

export type RealtimeAdmissionDenialReason =
  | 'invalid_request'
  | 'store_unavailable'
  | 'idempotency_conflict'
  | 'idempotency_terminal'
  | 'session_already_reserved'
  | 'user_concurrency_exceeded'
  | 'global_concurrency_exceeded'
  | 'user_daily_budget_exceeded'
  | 'global_daily_budget_exceeded'

export type AtomicReserveCommand = {
  binding: RealtimeAdmissionBinding
  intent: RealtimeAdmissionIntent
  idempotencyKey: string
  estimatedCents: number
  policy: RealtimeAdmissionPolicySelection
}

export type AtomicReserveResult =
  | { kind: 'reserved'; reservation: RealtimeAdmissionReservation; idempotent: boolean }
  | { kind: 'denied'; reason: Exclude<RealtimeAdmissionDenialReason, 'invalid_request' | 'store_unavailable'> }
export type AtomicFinalizeResult =
  | { kind: 'finalized'; reservation: RealtimeAdmissionReservation; idempotent: boolean; userBudgetExceeded: boolean; globalBudgetExceeded: boolean }
  | { kind: 'not_found' | 'binding_mismatch' | 'state_conflict' }
export type AtomicCancelResult =
  | { kind: 'cancelled'; reservation: RealtimeAdmissionReservation; idempotent: boolean }
  | { kind: 'not_found' | 'binding_mismatch' | 'state_conflict' }

export interface RealtimeAdmissionRepository {
  issueIntent(command: {
    binding: RealtimeAdmissionBinding
    policy: RealtimeAdmissionPolicySelection
  }): Promise<RealtimeAdmissionIntent>
  atomicReserve(command: AtomicReserveCommand): Promise<AtomicReserveResult>
  atomicFinalize(command: {
    reservationId: string
    binding: RealtimeAdmissionBinding
    intent: RealtimeAdmissionIntent
    actualCents: number
    policy: RealtimeAdmissionPolicySelection
  }): Promise<AtomicFinalizeResult>
  atomicCancel(command: {
    reservationId: string
    binding: RealtimeAdmissionBinding
    intent: RealtimeAdmissionIntent
    policy: RealtimeAdmissionPolicySelection
  }): Promise<AtomicCancelResult>
}

export type ReserveRealtimeResult =
  | { status: 'admitted'; reservation: RealtimeAdmissionReservation; idempotent: boolean }
  | { status: 'denied'; reason: RealtimeAdmissionDenialReason }
export type IssueRealtimeIntentResult =
  | { status: 'issued'; intent: RealtimeAdmissionIntent }
  | { status: 'denied'; reason: 'invalid_request' | 'store_unavailable' }
export type CompleteRealtimeResult =
  | { status: 'finalized'; reservation: RealtimeAdmissionReservation; idempotent: boolean; budgetExceeded: boolean }
  | { status: 'not_found' | 'binding_mismatch' | 'state_conflict' | 'store_unavailable' | 'invalid_request' }
export type CancelRealtimeResult =
  | { status: 'cancelled'; reservation: RealtimeAdmissionReservation; idempotent: boolean }
  | { status: 'not_found' | 'binding_mismatch' | 'state_conflict' | 'store_unavailable' | 'invalid_request' }

function positiveInteger(value: number, maximum: number) {
  return Number.isInteger(value) && value > 0 && value <= maximum
}

function validatePolicy(policy: RealtimeAdmissionPolicySelection) {
  const limits = policy.limits
  if (!/^\d{4}-\d{2}-\d{2}\.v[1-9]\d{0,8}$/.test(policy.version)) throw new Error('policy version is invalid')
  if (typeof policy.policyId !== 'string' || policy.policyId.length < 1 || policy.policyId.length > 256) throw new Error('policyId is invalid')
  if (!positiveInteger(limits.maxGlobalConcurrent, 100_000)) throw new Error('maxGlobalConcurrent is invalid')
  if (!positiveInteger(limits.maxUserConcurrent, limits.maxGlobalConcurrent)) throw new Error('maxUserConcurrent is invalid')
  if (!positiveInteger(limits.maxUserDailyCents, 100_000_000)) throw new Error('maxUserDailyCents is invalid')
  if (!positiveInteger(limits.maxGlobalDailyCents, 1_000_000_000) || limits.maxUserDailyCents > limits.maxGlobalDailyCents) throw new Error('global budget is invalid')
  if (!positiveInteger(limits.maxReservationCents, limits.maxUserDailyCents)) throw new Error('maxReservationCents is invalid')
  if (!positiveInteger(limits.reservationTtlMs, 4 * 60 * 60 * 1000) || limits.reservationTtlMs < 30_000) throw new Error('reservationTtlMs is invalid')
}

const validBinding = isVerifiedRealtimeAdmissionBinding

function validIdempotencyKey(value: string) { return /^[A-Za-z0-9_-]{16,128}$/.test(value) }
function validReservationId(value: string) { return uuidPattern.test(value) }
function isIsoTimestamp(value: string | null): value is string {
  if (!value) return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

function safeReservationBase(reservation: RealtimeAdmissionReservation, policy: RealtimeAdmissionPolicySelection) {
  return Boolean(reservation)
    && validReservationId(reservation.id)
    && reservation.version === AI_PATH_REALTIME_ADMISSION_VERSION
    && reservation.policyId === policy.policyId
    && validIdempotencyKey(reservation.idempotencyKey)
    && /^\d{4}-\d{2}-\d{2}$/.test(reservation.utcDay)
    && positiveInteger(reservation.estimatedCents, 100_000_000)
    && isIsoTimestamp(reservation.createdAt)
    && isIsoTimestamp(reservation.expiresAt)
    && Date.parse(reservation.expiresAt) > Date.parse(reservation.createdAt)
    && Date.parse(reservation.expiresAt) - Date.parse(reservation.createdAt) >= 30_000
    && Date.parse(reservation.expiresAt) - Date.parse(reservation.createdAt) <= 4 * 60 * 60 * 1000
    && reservation.utcDay === reservation.createdAt.slice(0, 10)
}

function safeReservedResult(reservation: RealtimeAdmissionReservation, command: AtomicReserveCommand) {
  return safeReservationBase(reservation, command.policy)
    && reservation.intentId === command.intent.intentId
    && reservation.status === 'reserved'
    && reservation.idempotencyKey === command.idempotencyKey
    && reservation.estimatedCents === command.estimatedCents
    && reservation.actualCents === null
    && reservation.finalizedAt === null
    && reservation.cancelledAt === null
}

function safeIntent(intent: RealtimeAdmissionIntent, binding: RealtimeAdmissionBinding, policy: RealtimeAdmissionPolicySelection) {
  return isVerifiedRealtimeAdmissionIntent(intent, binding)
    && validReservationId(intent.intentId)
    && intent.policyId === policy.policyId
    && isIsoTimestamp(intent.expiresAt)
    && intent[verifiedIntentMarker] === binding.assessmentSessionId
}

function intentWithinMaximumHorizon(intent: RealtimeAdmissionIntent, now: number) {
  return Date.parse(intent.expiresAt)
    <= now + AI_PATH_REALTIME_ADMISSION_INTENT_TTL_MS + AI_PATH_REALTIME_ADMISSION_CLOCK_SKEW_MS
}

function safeFinalizedResult(reservation: RealtimeAdmissionReservation, binding: RealtimeAdmissionBinding, intent: RealtimeAdmissionIntent, policy: RealtimeAdmissionPolicySelection, actualCents: number) {
  return isVerifiedRealtimeAdmissionIntent(intent, binding)
    && safeReservationBase(reservation, policy)
    && reservation.intentId === intent.intentId
    && reservation.status === 'finalized'
    && reservation.actualCents === actualCents
    && isIsoTimestamp(reservation.finalizedAt)
    && Date.parse(reservation.finalizedAt) >= Date.parse(reservation.createdAt)
    && reservation.cancelledAt === null
}

function safeCancelledResult(reservation: RealtimeAdmissionReservation, binding: RealtimeAdmissionBinding, intent: RealtimeAdmissionIntent, policy: RealtimeAdmissionPolicySelection) {
  return isVerifiedRealtimeAdmissionIntent(intent, binding)
    && safeReservationBase(reservation, policy)
    && reservation.intentId === intent.intentId
    && reservation.status === 'cancelled'
    && reservation.actualCents === null
    && reservation.finalizedAt === null
    && isIsoTimestamp(reservation.cancelledAt)
    && Date.parse(reservation.cancelledAt) >= Date.parse(reservation.createdAt)
}

type AtomicReserveDenialReason = Extract<AtomicReserveResult, { kind: 'denied' }>['reason']
const reserveDenials = new Set<AtomicReserveDenialReason>([
  'idempotency_conflict', 'idempotency_terminal', 'session_already_reserved',
  'user_concurrency_exceeded', 'global_concurrency_exceeded',
  'user_daily_budget_exceeded', 'global_daily_budget_exceeded',
])

export class RealtimeAdmissionService {
  readonly #repository: RealtimeAdmissionRepository
  readonly #policy: RealtimeAdmissionPolicySelection
  readonly #now: () => Date

  constructor(repository: RealtimeAdmissionRepository, policy: RealtimeAdmissionPolicySelection, options: { now?: () => Date } = {}) {
    validatePolicy(policy)
    this.#repository = repository
    this.#policy = Object.freeze({ ...policy, limits: Object.freeze({ ...policy.limits }) })
    this.#now = options.now ?? (() => new Date())
  }

  async issueIntent(input: { binding: RealtimeAdmissionBinding }): Promise<IssueRealtimeIntentResult> {
    if (!validBinding(input.binding)) return { status: 'denied', reason: 'invalid_request' }
    try {
      const intent = await this.#repository.issueIntent({ binding: input.binding, policy: this.#policy })
      const now = this.#now().getTime()
      const expiresAt = Date.parse(intent.expiresAt)
      if (
        !safeIntent(intent, input.binding, this.#policy)
        || expiresAt <= now
        || expiresAt > now + AI_PATH_REALTIME_ADMISSION_INTENT_TTL_MS + AI_PATH_REALTIME_ADMISSION_CLOCK_SKEW_MS
      ) {
        return { status: 'denied', reason: 'store_unavailable' }
      }
      return { status: 'issued', intent }
    } catch {
      return { status: 'denied', reason: 'store_unavailable' }
    }
  }

  async reserve(input: { binding: RealtimeAdmissionBinding; intent: RealtimeAdmissionIntent; idempotencyKey: string; estimatedCents: number }): Promise<ReserveRealtimeResult> {
    if (!validBinding(input.binding) || !safeIntent(input.intent, input.binding, this.#policy) || !intentWithinMaximumHorizon(input.intent, this.#now().getTime()) || !validIdempotencyKey(input.idempotencyKey) || !positiveInteger(input.estimatedCents, this.#policy.limits.maxReservationCents)) {
      return { status: 'denied', reason: 'invalid_request' }
    }
    const command = { ...input, policy: this.#policy }
    try {
      const result = await this.#repository.atomicReserve(command)
      if (result.kind === 'denied') return reserveDenials.has(result.reason) ? { status: 'denied', reason: result.reason } : { status: 'denied', reason: 'store_unavailable' }
      if (!safeReservedResult(result.reservation, command)) return { status: 'denied', reason: 'store_unavailable' }
      return { status: 'admitted', reservation: result.reservation, idempotent: result.idempotent }
    } catch {
      return { status: 'denied', reason: 'store_unavailable' }
    }
  }

  async finalize(input: { reservationId: string; binding: RealtimeAdmissionBinding; intent: RealtimeAdmissionIntent; actualCents: number }): Promise<CompleteRealtimeResult> {
    if (!validReservationId(input.reservationId) || !validBinding(input.binding) || !safeIntent(input.intent, input.binding, this.#policy) || !intentWithinMaximumHorizon(input.intent, this.#now().getTime()) || !Number.isInteger(input.actualCents) || input.actualCents < 0 || input.actualCents > 100_000_000) return { status: 'invalid_request' }
    try {
      const result = await this.#repository.atomicFinalize({ ...input, policy: this.#policy })
      if (!['finalized', 'not_found', 'binding_mismatch', 'state_conflict'].includes(result.kind)) return { status: 'store_unavailable' }
      if (result.kind !== 'finalized') return { status: result.kind }
      if (!safeFinalizedResult(result.reservation, input.binding, input.intent, this.#policy, input.actualCents)) return { status: 'store_unavailable' }
      return { status: 'finalized', reservation: result.reservation, idempotent: result.idempotent, budgetExceeded: result.userBudgetExceeded || result.globalBudgetExceeded }
    } catch {
      return { status: 'store_unavailable' }
    }
  }

  async cancel(input: { reservationId: string; binding: RealtimeAdmissionBinding; intent: RealtimeAdmissionIntent }): Promise<CancelRealtimeResult> {
    if (!validReservationId(input.reservationId) || !validBinding(input.binding) || !safeIntent(input.intent, input.binding, this.#policy) || !intentWithinMaximumHorizon(input.intent, this.#now().getTime())) return { status: 'invalid_request' }
    try {
      const result = await this.#repository.atomicCancel({ ...input, policy: this.#policy })
      if (!['cancelled', 'not_found', 'binding_mismatch', 'state_conflict'].includes(result.kind)) return { status: 'store_unavailable' }
      if (result.kind !== 'cancelled') return { status: result.kind }
      if (!safeCancelledResult(result.reservation, input.binding, input.intent, this.#policy)) return { status: 'store_unavailable' }
      return { status: 'cancelled', reservation: result.reservation, idempotent: result.idempotent }
    } catch {
      return { status: 'store_unavailable' }
    }
  }
}
