import {
  AI_PATH_REALTIME_ADMISSION_VERSION,
  createVerifiedRealtimeAdmissionIntent,
  isVerifiedRealtimeAdmissionBinding,
  isVerifiedRealtimeAdmissionIntent,
  type AtomicCancelResult,
  type AtomicFinalizeResult,
  type AtomicReserveCommand,
  type AtomicReserveResult,
  type RealtimeAdmissionIntent,
  type RealtimeAdmissionRepository,
  type RealtimeAdmissionReservation,
  type RealtimeReservationStatus,
} from './realtime-admission.ts'

export const AI_PATH_REALTIME_ADMISSION_RPC_NAMES = {
  issueIntent: 'issue_ai_path_realtime_admission_intent',
  reserve: 'reserve_ai_path_realtime_admission',
  finalize: 'finalize_ai_path_realtime_admission',
  cancel: 'cancel_ai_path_realtime_admission',
} as const
export const AI_PATH_REALTIME_ADMISSION_RPC_DEADLINE_MS = 4_000 as const

type RpcName = typeof AI_PATH_REALTIME_ADMISSION_RPC_NAMES[keyof typeof AI_PATH_REALTIME_ADMISSION_RPC_NAMES]
type RpcResult = { data: unknown; error: { code?: string; message: string } | null; count?: number | null; status?: number; statusText?: string }
export type SupabaseRealtimeAdmissionRpcClient = {
  rpc: (name: RpcName, args: Record<string, string | number>, signal: AbortSignal) => PromiseLike<RpcResult>
}

export class SupabaseRealtimeAdmissionGatewayError extends Error {
  readonly code: 'invalid_command' | 'rpc_failed' | 'rpc_timeout' | 'malformed_response'
  constructor(code: SupabaseRealtimeAdmissionGatewayError['code']) {
    super('The durable Realtime admission operation failed closed.')
    this.name = 'SupabaseRealtimeAdmissionGatewayError'
    this.code = code
  }
}
class DeadlineError extends Error {}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const idempotencyPattern = /^[A-Za-z0-9_-]{16,128}$/
const utcDayPattern = /^\d{4}-\d{2}-\d{2}$/
const statuses = new Set<RealtimeReservationStatus>(['reserved', 'finalized', 'cancelled', 'expired'])
const reserveDenials = new Set(['idempotency_conflict', 'idempotency_terminal', 'session_already_reserved', 'user_concurrency_exceeded', 'global_concurrency_exceeded', 'user_daily_budget_exceeded', 'global_daily_budget_exceeded'])
type TerminalKind = 'not_found' | 'binding_mismatch' | 'state_conflict'
const terminalKinds = new Set<TerminalKind>(['not_found', 'binding_mismatch', 'state_conflict'])

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort(); const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}
function onlyKeys(value: Record<string, unknown>, keys: readonly string[]) { const allowed = new Set(keys); return Object.keys(value).every(key => allowed.has(key)) }
function integerBetween(value: unknown, minimum: number, maximum: number): value is number { return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum }
function isoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}
function validPolicyId(value: unknown): value is string { return typeof value === 'string' && value.length >= 1 && value.length <= 256 }
const validBinding = isVerifiedRealtimeAdmissionBinding

function parseIntent(value: unknown, policyId: string, binding: Parameters<RealtimeAdmissionRepository['issueIntent']>[0]['binding']): RealtimeAdmissionIntent {
  if (!isRecord(value) || !exactKeys(value, ['intentId', 'policyId', 'expiresAt'])
    || typeof value.intentId !== 'string' || !uuidPattern.test(value.intentId)
    || value.policyId !== policyId || !isoTimestamp(value.expiresAt)) {
    throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  }
  return createVerifiedRealtimeAdmissionIntent({ intentId: value.intentId, policyId: value.policyId, expiresAt: value.expiresAt }, binding)
}

function parseReservation(value: unknown): RealtimeAdmissionReservation {
  const keys = ['id', 'version', 'policyId', 'intentId', 'idempotencyKey', 'utcDay', 'estimatedCents', 'actualCents', 'status', 'createdAt', 'expiresAt', 'finalizedAt', 'cancelledAt']
  if (!isRecord(value) || !exactKeys(value, keys)
    || typeof value.id !== 'string' || !uuidPattern.test(value.id)
    || value.version !== AI_PATH_REALTIME_ADMISSION_VERSION
    || !validPolicyId(value.policyId)
    || typeof value.intentId !== 'string' || !uuidPattern.test(value.intentId)
    || typeof value.idempotencyKey !== 'string' || !idempotencyPattern.test(value.idempotencyKey)
    || typeof value.utcDay !== 'string' || !utcDayPattern.test(value.utcDay)
    || !integerBetween(value.estimatedCents, 1, 100_000_000)
    || !(value.actualCents === null || integerBetween(value.actualCents, 0, 100_000_000))
    || typeof value.status !== 'string' || !statuses.has(value.status as RealtimeReservationStatus)
    || !isoTimestamp(value.createdAt) || !isoTimestamp(value.expiresAt)
    || !(value.finalizedAt === null || isoTimestamp(value.finalizedAt))
    || !(value.cancelledAt === null || isoTimestamp(value.cancelledAt))) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  const created = Date.parse(value.createdAt); const expires = Date.parse(value.expiresAt)
  const lifecycle = (value.status === 'reserved' || value.status === 'expired')
    ? value.actualCents === null && value.finalizedAt === null && value.cancelledAt === null
    : value.status === 'finalized'
      ? value.actualCents !== null && value.finalizedAt !== null && value.cancelledAt === null && Date.parse(value.finalizedAt as string) >= created
      : value.actualCents === null && value.finalizedAt === null && value.cancelledAt !== null && Date.parse(value.cancelledAt as string) >= created
  if (value.utcDay !== value.createdAt.slice(0, 10) || expires - created < 30_000 || expires - created > 14_400_000 || !lifecycle) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  return Object.freeze(value as unknown as RealtimeAdmissionReservation)
}

function parseReserve(value: unknown, command: AtomicReserveCommand): AtomicReserveResult {
  if (!isRecord(value) || typeof value.kind !== 'string') throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  if (value.kind === 'denied') {
    if (!exactKeys(value, ['kind', 'reason']) || typeof value.reason !== 'string' || !reserveDenials.has(value.reason)) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
    return { kind: 'denied', reason: value.reason as Extract<AtomicReserveResult, { kind: 'denied' }>['reason'] }
  }
  if (value.kind !== 'reserved' || !exactKeys(value, ['kind', 'reservation', 'idempotent']) || typeof value.idempotent !== 'boolean') throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  const reservation = parseReservation(value.reservation)
  if (reservation.policyId !== command.policy.policyId || reservation.intentId !== command.intent.intentId || reservation.idempotencyKey !== command.idempotencyKey || reservation.estimatedCents !== command.estimatedCents || reservation.status !== 'reserved') throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  return { kind: 'reserved', reservation, idempotent: value.idempotent }
}

function parseFinalize(value: unknown, command: Parameters<RealtimeAdmissionRepository['atomicFinalize']>[0]): AtomicFinalizeResult {
  if (!isRecord(value) || typeof value.kind !== 'string') throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  if (terminalKinds.has(value.kind as TerminalKind)) {
    if (!exactKeys(value, ['kind'])) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
    return { kind: value.kind as TerminalKind }
  }
  if (value.kind !== 'finalized' || !exactKeys(value, ['kind', 'reservation', 'idempotent', 'userBudgetExceeded', 'globalBudgetExceeded']) || typeof value.idempotent !== 'boolean' || typeof value.userBudgetExceeded !== 'boolean' || typeof value.globalBudgetExceeded !== 'boolean') throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  const reservation = parseReservation(value.reservation)
  if (reservation.id !== command.reservationId || reservation.policyId !== command.policy.policyId || reservation.intentId !== command.intent.intentId || reservation.status !== 'finalized' || reservation.actualCents !== command.actualCents) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  return { kind: 'finalized', reservation, idempotent: value.idempotent, userBudgetExceeded: value.userBudgetExceeded, globalBudgetExceeded: value.globalBudgetExceeded }
}

function parseCancel(value: unknown, command: Parameters<RealtimeAdmissionRepository['atomicCancel']>[0]): AtomicCancelResult {
  if (!isRecord(value) || typeof value.kind !== 'string') throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  if (terminalKinds.has(value.kind as TerminalKind)) {
    if (!exactKeys(value, ['kind'])) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
    return { kind: value.kind as TerminalKind }
  }
  if (value.kind !== 'cancelled' || !exactKeys(value, ['kind', 'reservation', 'idempotent']) || typeof value.idempotent !== 'boolean') throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  const reservation = parseReservation(value.reservation)
  if (reservation.id !== command.reservationId || reservation.policyId !== command.policy.policyId || reservation.intentId !== command.intent.intentId || reservation.status !== 'cancelled') throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  return { kind: 'cancelled', reservation, idempotent: value.idempotent }
}

async function invokeRpc(client: SupabaseRealtimeAdmissionRpcClient, name: RpcName, args: Record<string, string | number>) {
  const signal = AbortSignal.timeout(AI_PATH_REALTIME_ADMISSION_RPC_DEADLINE_MS)
  try {
    const rpc = Promise.resolve(client.rpc(name, args, signal))
    const deadline = new Promise<never>((_, reject) => {
      const fail = () => reject(new DeadlineError())
      if (signal.aborted) fail(); else signal.addEventListener('abort', fail, { once: true })
    })
    const result = await Promise.race([rpc, deadline])
    if (!isRecord(result) || !Object.hasOwn(result, 'data') || !Object.hasOwn(result, 'error') || !onlyKeys(result, ['data', 'error', 'count', 'status', 'statusText']) || result.error !== null || !(result.count === undefined || result.count === null || integerBetween(result.count, 0, Number.MAX_SAFE_INTEGER)) || !(result.status === undefined || integerBetween(result.status, 200, 299)) || !(result.statusText === undefined || typeof result.statusText === 'string')) throw new SupabaseRealtimeAdmissionGatewayError('rpc_failed')
    return result.data
  } catch (error) {
    if (error instanceof SupabaseRealtimeAdmissionGatewayError) throw error
    if (error instanceof DeadlineError || signal.aborted) throw new SupabaseRealtimeAdmissionGatewayError('rpc_timeout')
    throw new SupabaseRealtimeAdmissionGatewayError('rpc_failed')
  }
}

/**
 * Two-credential boundary: authenticated issuance proves auth.uid ownership;
 * privileged lifecycle RPCs can consume only an opaque intent/reservation ID.
 */
export class SupabaseRealtimeAdmissionRepository implements RealtimeAdmissionRepository {
  readonly #authenticatedClient: SupabaseRealtimeAdmissionRpcClient
  readonly #serviceRoleClient: SupabaseRealtimeAdmissionRpcClient
  constructor(clients: { authenticatedClient: SupabaseRealtimeAdmissionRpcClient; serviceRoleClient: SupabaseRealtimeAdmissionRpcClient }) {
    this.#authenticatedClient = clients.authenticatedClient
    this.#serviceRoleClient = clients.serviceRoleClient
  }

  async issueIntent(command: Parameters<RealtimeAdmissionRepository['issueIntent']>[0]): Promise<RealtimeAdmissionIntent> {
    if (!validBinding(command.binding) || !validPolicyId(command.policy.policyId)) throw new SupabaseRealtimeAdmissionGatewayError('invalid_command')
    return parseIntent(await invokeRpc(this.#authenticatedClient, AI_PATH_REALTIME_ADMISSION_RPC_NAMES.issueIntent, {
      p_policy_id: command.policy.policyId,
      p_assessment_session_id: command.binding.assessmentSessionId,
    }), command.policy.policyId, command.binding)
  }

  async atomicReserve(command: AtomicReserveCommand): Promise<AtomicReserveResult> {
    if (!validBinding(command.binding) || !isVerifiedRealtimeAdmissionIntent(command.intent, command.binding) || !uuidPattern.test(command.intent.intentId) || command.intent.policyId !== command.policy.policyId || !isoTimestamp(command.intent.expiresAt) || !idempotencyPattern.test(command.idempotencyKey) || !integerBetween(command.estimatedCents, 1, command.policy.limits.maxReservationCents)) throw new SupabaseRealtimeAdmissionGatewayError('invalid_command')
    return parseReserve(await invokeRpc(this.#serviceRoleClient, AI_PATH_REALTIME_ADMISSION_RPC_NAMES.reserve, {
      p_policy_id: command.policy.policyId,
      p_intent_id: command.intent.intentId,
      p_idempotency_key: command.idempotencyKey,
      p_estimated_cents: command.estimatedCents,
    }), command)
  }

  async atomicFinalize(command: Parameters<RealtimeAdmissionRepository['atomicFinalize']>[0]): Promise<AtomicFinalizeResult> {
    if (!uuidPattern.test(command.reservationId) || !validBinding(command.binding) || !isVerifiedRealtimeAdmissionIntent(command.intent, command.binding) || !uuidPattern.test(command.intent.intentId) || command.intent.policyId !== command.policy.policyId || !validPolicyId(command.policy.policyId) || !integerBetween(command.actualCents, 0, 100_000_000)) throw new SupabaseRealtimeAdmissionGatewayError('invalid_command')
    return parseFinalize(await invokeRpc(this.#serviceRoleClient, AI_PATH_REALTIME_ADMISSION_RPC_NAMES.finalize, {
      p_policy_id: command.policy.policyId,
      p_reservation_id: command.reservationId,
      p_intent_id: command.intent.intentId,
      p_actual_cents: command.actualCents,
    }), command)
  }

  async atomicCancel(command: Parameters<RealtimeAdmissionRepository['atomicCancel']>[0]): Promise<AtomicCancelResult> {
    if (!uuidPattern.test(command.reservationId) || !validBinding(command.binding) || !isVerifiedRealtimeAdmissionIntent(command.intent, command.binding) || !uuidPattern.test(command.intent.intentId) || command.intent.policyId !== command.policy.policyId || !validPolicyId(command.policy.policyId)) throw new SupabaseRealtimeAdmissionGatewayError('invalid_command')
    return parseCancel(await invokeRpc(this.#serviceRoleClient, AI_PATH_REALTIME_ADMISSION_RPC_NAMES.cancel, {
      p_policy_id: command.policy.policyId,
      p_reservation_id: command.reservationId,
      p_intent_id: command.intent.intentId,
    }), command)
  }
}
