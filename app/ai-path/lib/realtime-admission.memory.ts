import type {
  AtomicCancelResult,
  AtomicFinalizeResult,
  AtomicReserveCommand,
  AtomicReserveResult,
  RealtimeAdmissionRepository,
  RealtimeAdmissionIntent,
  RealtimeAdmissionReservation,
} from './realtime-admission.ts'
import {
  AI_PATH_REALTIME_ADMISSION_LATE_FINALIZE_WINDOW_MS,
  AI_PATH_REALTIME_ADMISSION_VERSION,
  createVerifiedRealtimeAdmissionIntent,
} from './realtime-admission.ts'

type StoredReservation = RealtimeAdmissionReservation & {
  ownerId: string
  assessmentSessionId: string
}

/** Process-local deterministic adapter for unit tests and local development only. */
export class InMemoryRealtimeAdmissionRepository implements RealtimeAdmissionRepository {
  readonly #reservations = new Map<string, StoredReservation>()
  readonly #idempotency = new Map<string, string>()
  readonly #intents = new Map<string, { intent: RealtimeAdmissionIntent; ownerId: string; assessmentSessionId: string }>()
  readonly #idFactory: () => string
  readonly #now: () => Date

  constructor(options: { idFactory?: () => string; now?: () => Date } = {}) {
    this.#idFactory = options.idFactory ?? (() => crypto.randomUUID())
    this.#now = options.now ?? (() => new Date())
  }

  #copy(stored: StoredReservation): RealtimeAdmissionReservation {
    const reservation: Partial<StoredReservation> = structuredClone(stored)
    delete reservation.ownerId
    delete reservation.assessmentSessionId
    return reservation as RealtimeAdmissionReservation
  }

  #expire(now: string) {
    const nowMs = Date.parse(now)
    for (const reservation of this.#reservations.values()) {
      if (reservation.status === 'reserved' && Date.parse(reservation.expiresAt) <= nowMs) {
        this.#reservations.set(reservation.id, { ...reservation, status: 'expired' })
      }
    }
  }

  #active() { return [...this.#reservations.values()].filter(item => item.status === 'reserved') }
  #daily(utcDay: string, ownerId?: string) {
    return [...this.#reservations.values()]
      .filter(item => item.utcDay === utcDay && (!ownerId || item.ownerId === ownerId))
      .reduce((sum, item) => sum + (item.status === 'reserved' ? item.estimatedCents : item.status === 'finalized' ? (item.actualCents ?? 0) : 0), 0)
  }

  async issueIntent(command: Parameters<RealtimeAdmissionRepository['issueIntent']>[0]): Promise<RealtimeAdmissionIntent> {
    const now = this.#now()
    const intent = createVerifiedRealtimeAdmissionIntent({
      intentId: this.#idFactory(),
      policyId: command.policy.policyId,
      expiresAt: new Date(now.getTime() + 30_000).toISOString(),
    }, command.binding)
    this.#intents.set(intent.intentId, {
      intent,
      ownerId: command.binding.ownerId,
      assessmentSessionId: command.binding.assessmentSessionId,
    })
    return intent
  }

  async atomicReserve(command: AtomicReserveCommand): Promise<AtomicReserveResult> {
    const now = this.#now().toISOString()
    this.#expire(now)
    const { ownerId, assessmentSessionId } = command.binding
    const issuedIntent = this.#intents.get(command.intent.intentId)
    if (!issuedIntent || issuedIntent.intent.policyId !== command.policy.policyId || issuedIntent.ownerId !== ownerId || issuedIntent.assessmentSessionId !== assessmentSessionId) {
      return { kind: 'denied', reason: 'idempotency_conflict' }
    }
    const limits = command.policy.limits
    const idempotencyScope = `${ownerId}:${command.idempotencyKey}`
    const priorId = this.#idempotency.get(idempotencyScope)
    if (priorId) {
      const prior = this.#reservations.get(priorId)
      if (!prior) throw new Error('idempotency index is inconsistent')
      if (prior.intentId !== command.intent.intentId || prior.assessmentSessionId !== assessmentSessionId || prior.estimatedCents !== command.estimatedCents || prior.policyId !== command.policy.policyId) {
        return { kind: 'denied', reason: 'idempotency_conflict' }
      }
      if (prior.status !== 'reserved') return { kind: 'denied', reason: 'idempotency_terminal' }
      return { kind: 'reserved', reservation: this.#copy(prior), idempotent: true }
    }
    if (Date.parse(issuedIntent.intent.expiresAt) <= Date.parse(now)) return { kind: 'denied', reason: 'idempotency_conflict' }
    const active = this.#active()
    if (active.some(item => item.assessmentSessionId === assessmentSessionId)) return { kind: 'denied', reason: 'session_already_reserved' }
    if (active.filter(item => item.ownerId === ownerId).length >= limits.maxUserConcurrent) return { kind: 'denied', reason: 'user_concurrency_exceeded' }
    if (active.length >= limits.maxGlobalConcurrent) return { kind: 'denied', reason: 'global_concurrency_exceeded' }
    const utcDay = now.slice(0, 10)
    if (this.#daily(utcDay, ownerId) + command.estimatedCents > limits.maxUserDailyCents) return { kind: 'denied', reason: 'user_daily_budget_exceeded' }
    if (this.#daily(utcDay) + command.estimatedCents > limits.maxGlobalDailyCents) return { kind: 'denied', reason: 'global_daily_budget_exceeded' }

    const stored: StoredReservation = {
      id: this.#idFactory(),
      version: AI_PATH_REALTIME_ADMISSION_VERSION,
      policyId: command.policy.policyId,
      intentId: command.intent.intentId,
      assessmentSessionId,
      idempotencyKey: command.idempotencyKey,
      utcDay,
      estimatedCents: command.estimatedCents,
      actualCents: null,
      status: 'reserved',
      createdAt: now,
      expiresAt: new Date(Date.parse(now) + limits.reservationTtlMs).toISOString(),
      finalizedAt: null,
      cancelledAt: null,
      ownerId,
    }
    this.#reservations.set(stored.id, stored)
    this.#idempotency.set(idempotencyScope, stored.id)
    return { kind: 'reserved', reservation: this.#copy(stored), idempotent: false }
  }

  async atomicFinalize(command: Parameters<RealtimeAdmissionRepository['atomicFinalize']>[0]): Promise<AtomicFinalizeResult> {
    const now = this.#now().toISOString()
    this.#expire(now)
    const reservation = this.#reservations.get(command.reservationId)
    if (!reservation) return { kind: 'not_found' }
    const intent = this.#intents.get(command.intent.intentId)
    if (
      !intent
      || reservation.intentId !== command.intent.intentId
      || intent.ownerId !== command.binding.ownerId
      || intent.assessmentSessionId !== command.binding.assessmentSessionId
      || reservation.ownerId !== command.binding.ownerId
      || reservation.assessmentSessionId !== command.binding.assessmentSessionId
    ) return { kind: 'binding_mismatch' }
    if (reservation.policyId !== command.policy.policyId) return { kind: 'state_conflict' }
    if (reservation.status === 'finalized') {
      if (reservation.actualCents !== command.actualCents) return { kind: 'state_conflict' }
      return { kind: 'finalized', reservation: this.#copy(reservation), idempotent: true, userBudgetExceeded: this.#daily(reservation.utcDay, reservation.ownerId) > command.policy.limits.maxUserDailyCents, globalBudgetExceeded: this.#daily(reservation.utcDay) > command.policy.limits.maxGlobalDailyCents }
    }
    if (reservation.status !== 'reserved' && reservation.status !== 'expired') return { kind: 'state_conflict' }
    if (reservation.status === 'expired' && Date.parse(now) > Date.parse(reservation.expiresAt) + AI_PATH_REALTIME_ADMISSION_LATE_FINALIZE_WINDOW_MS) return { kind: 'state_conflict' }
    const updated: StoredReservation = { ...reservation, status: 'finalized', actualCents: command.actualCents, finalizedAt: now }
    this.#reservations.set(updated.id, updated)
    return { kind: 'finalized', reservation: this.#copy(updated), idempotent: false, userBudgetExceeded: this.#daily(updated.utcDay, updated.ownerId) > command.policy.limits.maxUserDailyCents, globalBudgetExceeded: this.#daily(updated.utcDay) > command.policy.limits.maxGlobalDailyCents }
  }

  async atomicCancel(command: Parameters<RealtimeAdmissionRepository['atomicCancel']>[0]): Promise<AtomicCancelResult> {
    const now = this.#now().toISOString()
    this.#expire(now)
    const reservation = this.#reservations.get(command.reservationId)
    if (!reservation) return { kind: 'not_found' }
    const intent = this.#intents.get(command.intent.intentId)
    if (
      !intent
      || reservation.intentId !== command.intent.intentId
      || intent.ownerId !== command.binding.ownerId
      || intent.assessmentSessionId !== command.binding.assessmentSessionId
      || reservation.ownerId !== command.binding.ownerId
      || reservation.assessmentSessionId !== command.binding.assessmentSessionId
    ) return { kind: 'binding_mismatch' }
    if (reservation.policyId !== command.policy.policyId) return { kind: 'state_conflict' }
    if (reservation.status === 'cancelled') return { kind: 'cancelled', reservation: this.#copy(reservation), idempotent: true }
    if (reservation.status !== 'reserved') return { kind: 'state_conflict' }
    const updated: StoredReservation = { ...reservation, status: 'cancelled', cancelledAt: now }
    this.#reservations.set(updated.id, updated)
    return { kind: 'cancelled', reservation: this.#copy(updated), idempotent: false }
  }
}
