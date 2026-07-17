import type { AssessmentRequestRuntime } from './request-runtime.ts'
import { AI_PATH_VOICE_CONSENT_VERSION } from './foundation.ts'
import {
  createVerifiedRealtimeAdmissionBinding,
  type RealtimeAdmissionIntent,
  type RealtimeAdmissionReservation,
  type RealtimeAdmissionService,
  type RealtimeAdmissionBinding,
  type RealtimeAdmissionDenialReason,
} from './realtime-admission.ts'
import { readBoundedJson } from './request-body.ts'
import { crossOriginMutationResponse } from './request-security.ts'

export const AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH = false as const
export const AI_PATH_REALTIME_BOOTSTRAP_ESTIMATED_CENTS = 100 as const

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const reservableStatuses = new Set(['consented', 'connecting'])

type RealtimeBootstrapInput = Readonly<{
  assessmentSessionId: string
  sdp: string
}>

export type PreparedRealtimeBootstrap = Readonly<{
  assessmentSessionId: string
  verifiedUserId: string
  sdp: string
  binding: RealtimeAdmissionBinding
  intent: RealtimeAdmissionIntent
  reservation: RealtimeAdmissionReservation
  idempotent: boolean
}>

export type RealtimeBootstrapPreparation =
  | { ok: true; value: PreparedRealtimeBootstrap }
  | { ok: false; response: Response }

function json(error: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ error, ...extra }, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const keys = Object.keys(value)
  return keys.length === expected.length && expected.every(key => Object.hasOwn(value, key))
}

function parseInput(value: unknown): RealtimeBootstrapInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (!exactKeys(record, ['assessmentSessionId', 'sdp'])) return null
  if (typeof record.assessmentSessionId !== 'string' || !uuidPattern.test(record.assessmentSessionId)) return null
  if (typeof record.sdp !== 'string' || record.sdp.length < 3 || record.sdp.length > 200_000) return null
  if (!/^v=0(?:\r?\n|$)/.test(record.sdp) || record.sdp.includes('\0')) return null
  return Object.freeze({ assessmentSessionId: record.assessmentSessionId, sdp: record.sdp })
}

/**
 * The reserve key is server-owned and replay-stable for the database-owned,
 * single-use intent. Retrying an ambiguous issuance/reserve attempt therefore
 * cannot accidentally mint a second reservation with a different key.
 */
export function realtimeReservationIdempotencyKey(intent: RealtimeAdmissionIntent) {
  if (!uuidPattern.test(intent.intentId)) throw new Error('Realtime intent id is invalid.')
  return `rt_${intent.intentId.replaceAll('-', '')}`
}

function deniedAdmission(reason: RealtimeAdmissionDenialReason) {
  if (reason === 'user_daily_budget_exceeded' || reason === 'global_daily_budget_exceeded') {
    return json('realtime_admission_denied', 429, { reason: 'budget_unavailable' })
  }
  if (
    reason === 'session_already_reserved'
    || reason === 'user_concurrency_exceeded'
    || reason === 'global_concurrency_exceeded'
    || reason === 'idempotency_conflict'
    || reason === 'idempotency_terminal'
  ) {
    return json('realtime_admission_denied', 409, { reason: 'capacity_unavailable' })
  }
  return json('realtime_admission_unavailable', 503)
}

/**
 * Authenticated, provider-free bootstrap preparation. This function stops at
 * an exact atomic admission reservation. It deliberately has no provider
 * client, URL, credential, fetch implementation, or public response presenter.
 */
export async function prepareAuthenticatedRealtimeBootstrap(
  request: Request,
  runtime: AssessmentRequestRuntime,
  admission: Pick<RealtimeAdmissionService, 'issueIntent' | 'reserve'>,
): Promise<RealtimeBootstrapPreparation> {
  const crossOrigin = crossOriginMutationResponse(request, runtime)
  if (crossOrigin) return { ok: false, response: crossOrigin }

  if (
    runtime.mode !== 'supabase'
    || !runtime.capability.available
    || !runtime.capability.productionReady
    || !runtime.service
  ) {
    return { ok: false, response: json('authenticated_realtime_unavailable', 503) }
  }
  if (!runtime.principal) return { ok: false, response: json('authentication_required', 401) }
  if (runtime.principal.source !== 'supabase') {
    return { ok: false, response: json('verified_authentication_required', 401) }
  }

  const body = await readBoundedJson(request, 210_000)
  if (!body.ok) return { ok: false, response: json(body.error, body.status) }
  const input = parseInput(body.value)
  if (!input) return { ok: false, response: json('invalid_realtime_bootstrap', 400) }

  let ownedSession
  try {
    ownedSession = await runtime.service.getOwnedSession(runtime.principal, input.assessmentSessionId)
  } catch {
    return { ok: false, response: json('authenticated_realtime_unavailable', 503) }
  }
  if (!ownedSession) return { ok: false, response: json('assessment_session_not_found', 404) }
  if (
    ownedSession.ownerId !== runtime.principal.userId
    || ownedSession.mode !== 'voice'
    || ownedSession.consentVersion !== AI_PATH_VOICE_CONSENT_VERSION
    || !reservableStatuses.has(ownedSession.status)
  ) {
    return { ok: false, response: json('assessment_session_not_reservable', 409) }
  }

  let binding: RealtimeAdmissionBinding
  try {
    binding = createVerifiedRealtimeAdmissionBinding({ principal: runtime.principal, ownedSession })
  } catch {
    return { ok: false, response: json('assessment_session_not_reservable', 409) }
  }

  const issued = await admission.issueIntent({ binding })
  if (issued.status !== 'issued') {
    return { ok: false, response: deniedAdmission(issued.reason) }
  }
  const reserved = await admission.reserve({
    binding,
    intent: issued.intent,
    idempotencyKey: realtimeReservationIdempotencyKey(issued.intent),
    estimatedCents: AI_PATH_REALTIME_BOOTSTRAP_ESTIMATED_CENTS,
  })
  if (reserved.status !== 'admitted') {
    return { ok: false, response: deniedAdmission(reserved.reason) }
  }

  return {
    ok: true,
    value: Object.freeze({
      assessmentSessionId: input.assessmentSessionId,
      verifiedUserId: runtime.principal.userId,
      sdp: input.sdp,
      binding,
      intent: issued.intent,
      reservation: reserved.reservation,
      idempotent: reserved.idempotent,
    }),
  }
}
