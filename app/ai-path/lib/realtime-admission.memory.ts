import type {
  AtomicCancelResult,
  AtomicFinalizeResult,
  AtomicReserveCommand,
  AtomicReserveResult,
  RealtimeAdmissionBinding,
  RealtimeAdmissionPolicy,
  RealtimeAdmissionRepository,
  RealtimeAdmissionReservation,
} from './realtime-admission.ts'
import { AI_PATH_REALTIME_ADMISSION_VERSION } from './realtime-admission.ts'

type MutableReservation = {
  -readonly [Key in keyof RealtimeAdmissionReservation]: RealtimeAdmissionReservation[Key]
}

/** Process-local deterministic adapter for unit tests and local development only. */
export class InMemoryRealtimeAdmissionRepository implements RealtimeAdmissionRepository {
  readonly #reservations = new Map<string, MutableReservation>()
  readonly #idempotency = new Map<string, string>()
  readonly #idFactory: () => string

  constructor(options: { idFactory?: () => string } = {}) {
    this.#idFactory = options.idFactory ?? (() => crypto.randomUUID())
  }

  #copy(reservation: MutableReservation): RealtimeAdmissionReservation {
    return structuredClone(reservation)
  }

  #expire(now: string) {
    const nowMs = Date.parse(now)
    for (const reservation of this.#reservations.values()) {
      if (reservation.status === 'reserved' && Date.parse(reservation.expiresAt) <= nowMs) {
        reservation.status = 'expired'
      }
    }
  }

  #active() {
    return [...this.#reservations.values()].filter(reservation => reservation.status === 'reserved')
  }

  #daily(utcDay: string, userKey?: string) {
    return [...this.#reservations.values()]
      .filter(reservation => reservation.utcDay === utcDay && (!userKey || reservation.userKey === userKey))
      .reduce((sum, reservation) => {
        if (reservation.status === 'reserved') return sum + reservation.estimatedCents
        if (reservation.status === 'finalized') return sum + (reservation.actualCents ?? 0)
        return sum
      }, 0)
  }

  async atomicReserve(command: AtomicReserveCommand): Promise<AtomicReserveResult> {
    this.#expire(command.now)
    const idempotencyScope = `${command.binding.userKey}:${command.idempotencyKey}`
    const priorId = this.#idempotency.get(idempotencyScope)
    if (priorId) {
      const prior = this.#reservations.get(priorId)
      if (!prior) throw new Error('idempotency index is inconsistent')
      if (
        prior.userKey !== command.binding.userKey
        || prior.sessionKey !== command.binding.sessionKey
        || prior.estimatedCents !== command.estimatedCents
      ) return { kind: 'denied', reason: 'idempotency_conflict' }
      if (prior.status !== 'reserved') return { kind: 'denied', reason: 'idempotency_terminal' }
      return { kind: 'reserved', reservation: this.#copy(prior), idempotent: true }
    }

    const active = this.#active()
    if (active.some(reservation => reservation.sessionKey === command.binding.sessionKey)) {
      return { kind: 'denied', reason: 'session_already_reserved' }
    }
    if (active.filter(reservation => reservation.userKey === command.binding.userKey).length >= command.policy.maxUserConcurrent) {
      return { kind: 'denied', reason: 'user_concurrency_exceeded' }
    }
    if (active.length >= command.policy.maxGlobalConcurrent) {
      return { kind: 'denied', reason: 'global_concurrency_exceeded' }
    }
    if (this.#daily(command.utcDay, command.binding.userKey) + command.estimatedCents > command.policy.maxUserDailyCents) {
      return { kind: 'denied', reason: 'user_daily_budget_exceeded' }
    }
    if (this.#daily(command.utcDay) + command.estimatedCents > command.policy.maxGlobalDailyCents) {
      return { kind: 'denied', reason: 'global_daily_budget_exceeded' }
    }

    const reservation: MutableReservation = {
      id: this.#idFactory(),
      version: AI_PATH_REALTIME_ADMISSION_VERSION,
      idempotencyKey: command.idempotencyKey,
      userKey: command.binding.userKey,
      sessionKey: command.binding.sessionKey,
      utcDay: command.utcDay,
      estimatedCents: command.estimatedCents,
      actualCents: null,
      status: 'reserved',
      createdAt: command.now,
      expiresAt: command.expiresAt,
      finalizedAt: null,
      cancelledAt: null,
    }
    this.#reservations.set(reservation.id, reservation)
    this.#idempotency.set(idempotencyScope, reservation.id)
    return { kind: 'reserved', reservation: this.#copy(reservation), idempotent: false }
  }

  async atomicFinalize(command: {
    reservationId: string
    binding: RealtimeAdmissionBinding
    actualCents: number
    now: string
    policy: RealtimeAdmissionPolicy
  }): Promise<AtomicFinalizeResult> {
    this.#expire(command.now)
    const reservation = this.#reservations.get(command.reservationId)
    if (!reservation) return { kind: 'not_found' }
    if (reservation.userKey !== command.binding.userKey || reservation.sessionKey !== command.binding.sessionKey) {
      return { kind: 'binding_mismatch' }
    }
    if (reservation.status === 'finalized') {
      if (reservation.actualCents !== command.actualCents) return { kind: 'state_conflict' }
      return {
        kind: 'finalized',
        reservation: this.#copy(reservation),
        idempotent: true,
        userBudgetExceeded: this.#daily(reservation.utcDay, reservation.userKey) > command.policy.maxUserDailyCents,
        globalBudgetExceeded: this.#daily(reservation.utcDay) > command.policy.maxGlobalDailyCents,
      }
    }
    // A late usage reconciliation must still record spend after a lease expires.
    // Expiry releases concurrency; it must not erase provider usage already incurred.
    if (reservation.status !== 'reserved' && reservation.status !== 'expired') {
      return { kind: 'state_conflict' }
    }
    reservation.status = 'finalized'
    reservation.actualCents = command.actualCents
    reservation.finalizedAt = command.now
    return {
      kind: 'finalized',
      reservation: this.#copy(reservation),
      idempotent: false,
      userBudgetExceeded: this.#daily(reservation.utcDay, reservation.userKey) > command.policy.maxUserDailyCents,
      globalBudgetExceeded: this.#daily(reservation.utcDay) > command.policy.maxGlobalDailyCents,
    }
  }

  async atomicCancel(command: {
    reservationId: string
    binding: RealtimeAdmissionBinding
    now: string
  }): Promise<AtomicCancelResult> {
    this.#expire(command.now)
    const reservation = this.#reservations.get(command.reservationId)
    if (!reservation) return { kind: 'not_found' }
    if (reservation.userKey !== command.binding.userKey || reservation.sessionKey !== command.binding.sessionKey) {
      return { kind: 'binding_mismatch' }
    }
    if (reservation.status === 'cancelled') {
      return { kind: 'cancelled', reservation: this.#copy(reservation), idempotent: true }
    }
    if (reservation.status !== 'reserved') return { kind: 'state_conflict' }
    reservation.status = 'cancelled'
    reservation.cancelledAt = command.now
    return { kind: 'cancelled', reservation: this.#copy(reservation), idempotent: false }
  }
}
