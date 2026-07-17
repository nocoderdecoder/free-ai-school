import { createHmac } from 'node:crypto'

import type { AssessmentPrincipal } from './session-persistence.ts'
import type { SessionStatus } from './foundation.ts'

export const AI_PATH_REALTIME_ADMISSION_VERSION = '2026-07-16.v1' as const

// Environment variables may attest deployment state, but they cannot open this
// production boundary. Enabling it requires a reviewed code change after the
// durable adapter and its atomic integration tests exist.
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
      ? {
          mode: 'local-test',
          available: true,
          productionReady: false,
          reason: 'deterministic process-local admission is enabled for tests only',
        }
      : {
          mode: 'disabled',
          available: false,
          productionReady: false,
          reason: 'local admission is not explicitly enabled',
        }
  }
  if (environment.nodeEnv !== 'production') {
    return {
      mode: 'disabled',
      available: false,
      productionReady: false,
      reason: 'admission requires an explicit runtime environment',
    }
  }

  const disabled = (reason: string): RealtimeAdmissionCapability => ({
    mode: 'disabled',
    available: false,
    productionReady: false,
    reason,
  })
  if (environment.enableProduction !== 'true') return disabled('production admission is not explicitly enabled')
  if (environment.durableStoreReady !== 'true') return disabled('the durable admission store is not attested')
  if (environment.atomicLimitsReady !== 'true') return disabled('atomic concurrency and budget limits are not attested')
  if (environment.spendApprovalReady !== 'true') return disabled('the approved spend policy is not attested')
  if (!AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH) {
    return disabled('the reviewed code-level admission latch remains closed')
  }
  return {
    mode: 'production',
    available: true,
    productionReady: true,
    reason: 'durable Realtime admission is ready',
  }
}

const verifiedBindingMarker: unique symbol = Symbol('ai-path-verified-realtime-admission-binding')

export type RealtimeAdmissionBinding = Readonly<{
  version: typeof AI_PATH_REALTIME_ADMISSION_VERSION
  userKey: string
  sessionKey: string
  [verifiedBindingMarker]: true
}>

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const opaqueKeyPattern = /^[0-9a-f]{64}$/
const reservableStatuses = new Set<SessionStatus>(['consented', 'connecting'])

function opaqueKey(secret: string, domain: 'user' | 'session', value: string) {
  return createHmac('sha256', secret).update(`${domain}\0${value}`).digest('hex')
}

/**
 * Creates storage-safe keys only after server-verified identity and ownership
 * agree. Raw user and session identifiers must never enter the admission store.
 */
export function createVerifiedRealtimeAdmissionBinding(input: {
  principal: AssessmentPrincipal
  ownedSession: { id: string; ownerId: string; status: SessionStatus }
  secret: string
}): RealtimeAdmissionBinding {
  const secret = input.secret.trim()
  if (input.principal.source !== 'supabase') throw new Error('a verified production principal is required')
  if (input.principal.userId !== input.ownedSession.ownerId) throw new Error('session ownership is not verified')
  if (!uuidPattern.test(input.principal.userId)) throw new Error('verified user id is invalid')
  if (!uuidPattern.test(input.ownedSession.id)) throw new Error('assessment session id is invalid')
  if (!reservableStatuses.has(input.ownedSession.status)) throw new Error('assessment session is not reservable')
  if (secret.length < 32) throw new Error('admission binding secret must contain at least 32 characters')
  return Object.freeze({
    version: AI_PATH_REALTIME_ADMISSION_VERSION,
    userKey: opaqueKey(secret, 'user', input.principal.userId),
    sessionKey: opaqueKey(secret, 'session', input.ownedSession.id),
    [verifiedBindingMarker]: true as const,
  })
}

export type RealtimeAdmissionPolicy = Readonly<{
  maxGlobalConcurrent: number
  maxUserConcurrent: number
  maxUserDailyCents: number
  maxGlobalDailyCents: number
  maxReservationCents: number
  reservationTtlMs: number
}>

export type RealtimeReservationStatus = 'reserved' | 'finalized' | 'cancelled' | 'expired'

export type RealtimeAdmissionReservation = Readonly<{
  id: string
  version: typeof AI_PATH_REALTIME_ADMISSION_VERSION
  idempotencyKey: string
  userKey: string
  sessionKey: string
  utcDay: string
  estimatedCents: number
  actualCents: number | null
  status: RealtimeReservationStatus
  createdAt: string
  expiresAt: string
  finalizedAt: string | null
  cancelledAt: string | null
}>

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
  idempotencyKey: string
  utcDay: string
  estimatedCents: number
  now: string
  expiresAt: string
  policy: RealtimeAdmissionPolicy
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

/**
 * A production adapter must implement each method as one durable atomic
 * transaction. A read/check followed by a separate write is not conformant.
 */
export interface RealtimeAdmissionRepository {
  atomicReserve(command: AtomicReserveCommand): Promise<AtomicReserveResult>
  atomicFinalize(command: {
    reservationId: string
    binding: RealtimeAdmissionBinding
    actualCents: number
    now: string
    policy: RealtimeAdmissionPolicy
  }): Promise<AtomicFinalizeResult>
  atomicCancel(command: {
    reservationId: string
    binding: RealtimeAdmissionBinding
    now: string
  }): Promise<AtomicCancelResult>
}

export type ReserveRealtimeResult =
  | { status: 'admitted'; reservation: RealtimeAdmissionReservation; idempotent: boolean }
  | { status: 'denied'; reason: RealtimeAdmissionDenialReason }

export type CompleteRealtimeResult =
  | { status: 'finalized'; reservation: RealtimeAdmissionReservation; idempotent: boolean; budgetExceeded: boolean }
  | { status: 'not_found' | 'binding_mismatch' | 'state_conflict' | 'store_unavailable' | 'invalid_request' }

export type CancelRealtimeResult =
  | { status: 'cancelled'; reservation: RealtimeAdmissionReservation; idempotent: boolean }
  | { status: 'not_found' | 'binding_mismatch' | 'state_conflict' | 'store_unavailable' | 'invalid_request' }

type RealtimeAdmissionServiceOptions = {
  now?: () => Date
}

function positiveInteger(value: number, maximum: number) {
  return Number.isInteger(value) && value > 0 && value <= maximum
}

function validatePolicy(policy: RealtimeAdmissionPolicy) {
  if (!positiveInteger(policy.maxGlobalConcurrent, 100_000)) throw new Error('maxGlobalConcurrent is invalid')
  if (!positiveInteger(policy.maxUserConcurrent, policy.maxGlobalConcurrent)) throw new Error('maxUserConcurrent is invalid')
  if (!positiveInteger(policy.maxUserDailyCents, 100_000_000)) throw new Error('maxUserDailyCents is invalid')
  if (!positiveInteger(policy.maxGlobalDailyCents, 1_000_000_000)) throw new Error('maxGlobalDailyCents is invalid')
  if (policy.maxUserDailyCents > policy.maxGlobalDailyCents) throw new Error('user budget exceeds global budget')
  if (!positiveInteger(policy.maxReservationCents, policy.maxUserDailyCents)) throw new Error('maxReservationCents is invalid')
  if (!positiveInteger(policy.reservationTtlMs, 4 * 60 * 60 * 1000) || policy.reservationTtlMs < 30_000) {
    throw new Error('reservationTtlMs is invalid')
  }
}

function validBinding(binding: RealtimeAdmissionBinding) {
  return binding[verifiedBindingMarker] === true
    && binding.version === AI_PATH_REALTIME_ADMISSION_VERSION
    && opaqueKeyPattern.test(binding.userKey)
    && opaqueKeyPattern.test(binding.sessionKey)
}

function validIdempotencyKey(value: string) {
  return /^[A-Za-z0-9_-]{16,128}$/.test(value)
}

function validReservationId(value: string) {
  return uuidPattern.test(value)
}

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

function isIsoTimestamp(value: string | null): value is string {
  if (!value) return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

function safeReservationBase(
  reservation: RealtimeAdmissionReservation,
  binding: RealtimeAdmissionBinding,
) {
  return Boolean(reservation)
    && validReservationId(reservation.id)
    && reservation.version === AI_PATH_REALTIME_ADMISSION_VERSION
    && reservation.userKey === binding.userKey
    && reservation.sessionKey === binding.sessionKey
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

function safeReservedResult(
  reservation: RealtimeAdmissionReservation,
  command: AtomicReserveCommand,
  idempotent: boolean,
) {
  const common = safeReservationBase(reservation, command.binding)
    && reservation.status === 'reserved'
    && reservation.idempotencyKey === command.idempotencyKey
    && reservation.estimatedCents === command.estimatedCents
    && reservation.actualCents === null
    && reservation.finalizedAt === null
    && reservation.cancelledAt === null
  if (!common) return false
  return idempotent
    ? Date.parse(reservation.createdAt) <= Date.parse(command.now)
      && Date.parse(command.now) < Date.parse(reservation.expiresAt)
    : reservation.utcDay === command.utcDay
      && reservation.createdAt === command.now
      && reservation.expiresAt === command.expiresAt
}

function safeFinalizedResult(
  reservation: RealtimeAdmissionReservation,
  binding: RealtimeAdmissionBinding,
  actualCents: number,
  finalizedAt: string,
  idempotent: boolean,
) {
  const common = safeReservationBase(reservation, binding)
    && reservation.status === 'finalized'
    && reservation.actualCents === actualCents
    && isIsoTimestamp(reservation.finalizedAt)
    && reservation.cancelledAt === null
  if (!common) return false
  return idempotent
    ? Date.parse(reservation.finalizedAt) >= Date.parse(reservation.createdAt)
      && Date.parse(reservation.finalizedAt) <= Date.parse(finalizedAt)
    : reservation.finalizedAt === finalizedAt
      && Date.parse(reservation.finalizedAt) >= Date.parse(reservation.createdAt)
}

function safeCancelledResult(
  reservation: RealtimeAdmissionReservation,
  binding: RealtimeAdmissionBinding,
  cancelledAt: string,
  idempotent: boolean,
) {
  const common = safeReservationBase(reservation, binding)
    && reservation.status === 'cancelled'
    && reservation.actualCents === null
    && reservation.finalizedAt === null
    && isIsoTimestamp(reservation.cancelledAt)
  if (!common) return false
  return idempotent
    ? Date.parse(reservation.cancelledAt) >= Date.parse(reservation.createdAt)
      && Date.parse(reservation.cancelledAt) <= Date.parse(cancelledAt)
    : reservation.cancelledAt === cancelledAt
      && Date.parse(reservation.cancelledAt) >= Date.parse(reservation.createdAt)
}

type AtomicReserveDenialReason = Extract<AtomicReserveResult, { kind: 'denied' }>['reason']

const reserveDenials = new Set<AtomicReserveDenialReason>([
  'idempotency_conflict',
  'idempotency_terminal',
  'session_already_reserved',
  'user_concurrency_exceeded',
  'global_concurrency_exceeded',
  'user_daily_budget_exceeded',
  'global_daily_budget_exceeded',
])

export class RealtimeAdmissionService {
  readonly #repository: RealtimeAdmissionRepository
  readonly #policy: RealtimeAdmissionPolicy
  readonly #now: () => Date

  constructor(
    repository: RealtimeAdmissionRepository,
    policy: RealtimeAdmissionPolicy,
    options: RealtimeAdmissionServiceOptions = {},
  ) {
    validatePolicy(policy)
    this.#repository = repository
    this.#policy = Object.freeze({ ...policy })
    this.#now = options.now ?? (() => new Date())
  }

  async reserve(input: {
    binding: RealtimeAdmissionBinding
    idempotencyKey: string
    estimatedCents: number
  }): Promise<ReserveRealtimeResult> {
    if (
      !validBinding(input.binding)
      || !validIdempotencyKey(input.idempotencyKey)
      || !positiveInteger(input.estimatedCents, this.#policy.maxReservationCents)
    ) return { status: 'denied', reason: 'invalid_request' }

    const now = this.#now()
    try {
      const command: AtomicReserveCommand = {
        binding: input.binding,
        idempotencyKey: input.idempotencyKey,
        utcDay: utcDay(now),
        estimatedCents: input.estimatedCents,
        now: now.toISOString(),
        expiresAt: new Date(now.getTime() + this.#policy.reservationTtlMs).toISOString(),
        policy: this.#policy,
      }
      const result = await this.#repository.atomicReserve(command)
      if (result.kind === 'denied') {
        return reserveDenials.has(result.reason)
          ? { status: 'denied', reason: result.reason }
          : { status: 'denied', reason: 'store_unavailable' }
      }
      if (!safeReservedResult(result.reservation, command, result.idempotent)) {
        return { status: 'denied', reason: 'store_unavailable' }
      }
      return { status: 'admitted', reservation: result.reservation, idempotent: result.idempotent }
    } catch {
      return { status: 'denied', reason: 'store_unavailable' }
    }
  }

  async finalize(input: {
    reservationId: string
    binding: RealtimeAdmissionBinding
    actualCents: number
  }): Promise<CompleteRealtimeResult> {
    if (
      !validReservationId(input.reservationId)
      || !validBinding(input.binding)
      || !Number.isInteger(input.actualCents)
      || input.actualCents < 0
      || input.actualCents > 100_000_000
    ) return { status: 'invalid_request' }

    try {
      const now = this.#now().toISOString()
      const result = await this.#repository.atomicFinalize({
        reservationId: input.reservationId,
        binding: input.binding,
        actualCents: input.actualCents,
        now,
        policy: this.#policy,
      })
      if (!['finalized', 'not_found', 'binding_mismatch', 'state_conflict'].includes(result.kind)) {
        return { status: 'store_unavailable' }
      }
      if (result.kind !== 'finalized') return { status: result.kind }
      if (!safeFinalizedResult(result.reservation, input.binding, input.actualCents, now, result.idempotent)) {
        return { status: 'store_unavailable' }
      }
      return {
        status: 'finalized',
        reservation: result.reservation,
        idempotent: result.idempotent,
        budgetExceeded: result.userBudgetExceeded || result.globalBudgetExceeded,
      }
    } catch {
      return { status: 'store_unavailable' }
    }
  }

  async cancel(input: {
    reservationId: string
    binding: RealtimeAdmissionBinding
  }): Promise<CancelRealtimeResult> {
    if (!validReservationId(input.reservationId) || !validBinding(input.binding)) {
      return { status: 'invalid_request' }
    }
    try {
      const now = this.#now().toISOString()
      const result = await this.#repository.atomicCancel({
        reservationId: input.reservationId,
        binding: input.binding,
        now,
      })
      if (!['cancelled', 'not_found', 'binding_mismatch', 'state_conflict'].includes(result.kind)) {
        return { status: 'store_unavailable' }
      }
      if (result.kind !== 'cancelled') return { status: result.kind }
      if (!safeCancelledResult(result.reservation, input.binding, now, result.idempotent)) {
        return { status: 'store_unavailable' }
      }
      return {
        status: 'cancelled',
        reservation: result.reservation,
        idempotent: result.idempotent,
      }
    } catch {
      return { status: 'store_unavailable' }
    }
  }
}
