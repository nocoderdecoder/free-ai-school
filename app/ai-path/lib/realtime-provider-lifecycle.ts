import {
  AI_PATH_REALTIME_ADMISSION_VERSION,
  isVerifiedRealtimeAdmissionBinding,
  isVerifiedRealtimeAdmissionIntent,
  type CancelRealtimeResult,
  type CompleteRealtimeResult,
  type RealtimeAdmissionService,
} from './realtime-admission.ts'
import type { PreparedRealtimeBootstrap } from './realtime-bootstrap.ts'

// Production lifecycle orchestration remains independently disabled. This file
// is a deterministic mock contract and contains no provider transport surface.
export const AI_PATH_REALTIME_PROVIDER_LIFECYCLE_LATCH = false as const

export type MockProviderLifecycleObservation =
  | Readonly<{ kind: 'unknown_commit' }>
  | Readonly<{ kind: 'confirmed_absent' }>
  | Readonly<{ kind: 'confirmed_active' }>
  | Readonly<{ kind: 'confirmed_ended'; actualCents: number }>

export type MockProviderLifecycleDecision =
  | Readonly<{ status: 'reconciliation_required'; mutation: 'none' }>
  | Readonly<{ status: 'provider_active'; mutation: 'none' }>
  | Readonly<{ status: 'confirmed_absent'; mutation: 'cancel' }>
  | Readonly<{ status: 'confirmed_ended'; mutation: 'finalize'; actualCents: number }>
  | Readonly<{ status: 'invalid'; mutation: 'none' }>

export type MockProviderLifecycleReconciliation =
  | Readonly<{
    status: 'reconciliation_required' | 'provider_active'
    admissionMutation: 'none'
    retryProviderBootstrap: false
  }>
  | Readonly<{
    status: 'reservation_cancelled'
    admissionMutation: 'cancel'
    retryProviderBootstrap: false
    idempotent: boolean
  }>
  | Readonly<{
    status: 'usage_finalized'
    admissionMutation: 'finalize'
    retryProviderBootstrap: false
    idempotent: boolean
    budgetExceeded: boolean
  }>
  | Readonly<{
    status: 'reconciliation_failed'
    admissionMutation: 'none' | 'cancel' | 'finalize'
    retryProviderBootstrap: false
    reason: Exclude<CancelRealtimeResult['status'] | CompleteRealtimeResult['status'], 'cancelled' | 'finalized'>
  }>

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index])
}

function validPrepared(value: unknown): value is PreparedRealtimeBootstrap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prepared = value as PreparedRealtimeBootstrap
  return isVerifiedRealtimeAdmissionBinding(prepared.binding)
    && isVerifiedRealtimeAdmissionIntent(prepared.intent, prepared.binding)
    && prepared.assessmentSessionId === prepared.binding.assessmentSessionId
    && prepared.verifiedUserId === prepared.binding.ownerId
    && prepared.reservation?.intentId === prepared.intent.intentId
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(prepared.reservation.id)
    && prepared.reservation.version === AI_PATH_REALTIME_ADMISSION_VERSION
    && prepared.reservation.policyId === prepared.intent.policyId
    && prepared.reservation.status === 'reserved'
    && Number.isInteger(prepared.reservation.estimatedCents)
    && prepared.reservation.estimatedCents > 0
    && prepared.reservation.actualCents === null
    && prepared.reservation.finalizedAt === null
    && prepared.reservation.cancelledAt === null
}

function parseObservation(value: unknown): MockProviderLifecycleObservation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (record.kind === 'confirmed_ended') {
    return exactKeys(record, ['kind', 'actualCents'])
      && Number.isInteger(record.actualCents)
      && (record.actualCents as number) >= 0
      && (record.actualCents as number) <= 100_000_000
      ? Object.freeze({ kind: 'confirmed_ended', actualCents: record.actualCents as number })
      : null
  }
  if (
    (record.kind === 'unknown_commit' || record.kind === 'confirmed_absent' || record.kind === 'confirmed_active')
    && exactKeys(record, ['kind'])
  ) {
    return Object.freeze({ kind: record.kind })
  }
  return null
}

/** Pure, provider-free decision contract. It cannot mutate admission state. */
export function decideMockRealtimeProviderLifecycle(
  prepared: PreparedRealtimeBootstrap,
  rawObservation: unknown,
): MockProviderLifecycleDecision {
  if (!validPrepared(prepared)) return Object.freeze({ status: 'invalid', mutation: 'none' })
  const observation = parseObservation(rawObservation)
  if (!observation) return Object.freeze({ status: 'invalid', mutation: 'none' })
  if (observation.kind === 'unknown_commit') {
    return Object.freeze({ status: 'reconciliation_required', mutation: 'none' })
  }
  if (observation.kind === 'confirmed_active') {
    return Object.freeze({ status: 'provider_active', mutation: 'none' })
  }
  if (observation.kind === 'confirmed_absent') {
    return Object.freeze({ status: 'confirmed_absent', mutation: 'cancel' })
  }
  return Object.freeze({ status: 'confirmed_ended', mutation: 'finalize', actualCents: observation.actualCents })
}

/**
 * Mock-only reconciliation contract for an already reserved bootstrap attempt.
 * Unknown or active provider state never authorizes another provider bootstrap
 * and never guesses that a reservation can be cancelled. Only a trusted future
 * adapter's exact confirmed-absent/confirmed-ended observation may select one
 * idempotent admission mutation.
 */
export async function reconcileMockRealtimeProviderLifecycle(
  prepared: PreparedRealtimeBootstrap,
  rawObservation: unknown,
  admission: Pick<RealtimeAdmissionService, 'cancel' | 'finalize'>,
): Promise<MockProviderLifecycleReconciliation> {
  if (!AI_PATH_REALTIME_PROVIDER_LIFECYCLE_LATCH) {
    return Object.freeze({
      status: 'reconciliation_failed',
      admissionMutation: 'none',
      retryProviderBootstrap: false,
      reason: 'store_unavailable',
    })
  }

  const decision = decideMockRealtimeProviderLifecycle(prepared, rawObservation)
  if (decision.status === 'invalid') {
    return Object.freeze({
      status: 'reconciliation_failed',
      admissionMutation: 'none',
      retryProviderBootstrap: false,
      reason: 'invalid_request',
    })
  }

  if (decision.status === 'reconciliation_required' || decision.status === 'provider_active') {
    return Object.freeze({
      status: decision.status,
      admissionMutation: 'none',
      retryProviderBootstrap: false,
    })
  }

  if (decision.status === 'confirmed_absent') {
    let result: CancelRealtimeResult
    try {
      result = await admission.cancel({
        reservationId: prepared.reservation.id,
        binding: prepared.binding,
        intent: prepared.intent,
      })
    } catch {
      result = { status: 'store_unavailable' }
    }
    return result.status === 'cancelled'
      ? Object.freeze({
        status: 'reservation_cancelled',
        admissionMutation: 'cancel',
        retryProviderBootstrap: false,
        idempotent: result.idempotent,
      })
      : Object.freeze({
        status: 'reconciliation_failed',
        admissionMutation: 'cancel',
        retryProviderBootstrap: false,
        reason: result.status,
      })
  }

  let result: CompleteRealtimeResult
  try {
    result = await admission.finalize({
      reservationId: prepared.reservation.id,
      binding: prepared.binding,
      intent: prepared.intent,
      actualCents: decision.actualCents,
    })
  } catch {
    result = { status: 'store_unavailable' }
  }
  return result.status === 'finalized'
    ? Object.freeze({
      status: 'usage_finalized',
      admissionMutation: 'finalize',
      retryProviderBootstrap: false,
      idempotent: result.idempotent,
      budgetExceeded: result.budgetExceeded,
    })
    : Object.freeze({
      status: 'reconciliation_failed',
      admissionMutation: 'finalize',
      retryProviderBootstrap: false,
      reason: result.status,
    })
}
