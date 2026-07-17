import {
  AI_PATH_REALTIME_ADMISSION_VERSION,
  type AtomicCancelResult,
  type AtomicFinalizeResult,
  type AtomicReserveCommand,
  type AtomicReserveResult,
  type RealtimeAdmissionBinding,
  type RealtimeAdmissionPolicy,
  type RealtimeAdmissionRepository,
  type RealtimeAdmissionReservation,
  type RealtimeReservationStatus,
} from './realtime-admission.ts'

export const AI_PATH_REALTIME_ADMISSION_RPC_NAMES = {
  reserve: 'reserve_ai_path_realtime_admission',
  finalize: 'finalize_ai_path_realtime_admission',
  cancel: 'cancel_ai_path_realtime_admission',
} as const

type SupabaseRealtimeAdmissionRpcName =
  typeof AI_PATH_REALTIME_ADMISSION_RPC_NAMES[keyof typeof AI_PATH_REALTIME_ADMISSION_RPC_NAMES]

type SupabaseRpcError = { code?: string; message: string }
type SupabaseRpcResult = {
  data: unknown
  error: SupabaseRpcError | null
  count?: number | null
  status?: number
  statusText?: string
}

export type SupabaseRealtimeAdmissionRpcClient = {
  rpc: (
    name: SupabaseRealtimeAdmissionRpcName,
    args: Record<string, string | number>,
  ) => PromiseLike<SupabaseRpcResult>
}

export class SupabaseRealtimeAdmissionGatewayError extends Error {
  readonly code: 'invalid_command' | 'rpc_failed' | 'malformed_response'

  constructor(code: SupabaseRealtimeAdmissionGatewayError['code']) {
    super('The durable Realtime admission operation failed closed.')
    this.name = 'SupabaseRealtimeAdmissionGatewayError'
    this.code = code
  }
}

const opaqueKeyPattern = /^[0-9a-f]{64}$/
const idempotencyKeyPattern = /^[A-Za-z0-9_-]{16,128}$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const utcDayPattern = /^\d{4}-\d{2}-\d{2}$/
const statuses = new Set<RealtimeReservationStatus>(['reserved', 'finalized', 'cancelled', 'expired'])
const reserveDenials = new Set([
  'idempotency_conflict',
  'idempotency_terminal',
  'session_already_reserved',
  'user_concurrency_exceeded',
  'global_concurrency_exceeded',
  'user_daily_budget_exceeded',
  'global_daily_budget_exceeded',
])
type TerminalKind = 'not_found' | 'binding_mismatch' | 'state_conflict'
const terminalKinds = new Set<TerminalKind>(['not_found', 'binding_mismatch', 'state_conflict'])

function isTerminalKind(value: string): value is TerminalKind {
  return terminalKinds.has(value as TerminalKind)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys)
  return Object.keys(value).every(key => allowed.has(key))
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
}

function validBinding(binding: RealtimeAdmissionBinding) {
  return isRecord(binding)
    && binding.version === AI_PATH_REALTIME_ADMISSION_VERSION
    && typeof binding.userKey === 'string'
    && opaqueKeyPattern.test(binding.userKey)
    && typeof binding.sessionKey === 'string'
    && opaqueKeyPattern.test(binding.sessionKey)
}

function validPolicy(policy: RealtimeAdmissionPolicy) {
  return isRecord(policy)
    && isIntegerBetween(policy.maxGlobalConcurrent, 1, 100_000)
    && isIntegerBetween(policy.maxUserConcurrent, 1, policy.maxGlobalConcurrent)
    && isIntegerBetween(policy.maxUserDailyCents, 1, 100_000_000)
    && isIntegerBetween(policy.maxGlobalDailyCents, policy.maxUserDailyCents, 1_000_000_000)
    && isIntegerBetween(policy.maxReservationCents, 1, policy.maxUserDailyCents)
    && isIntegerBetween(policy.reservationTtlMs, 30_000, 14_400_000)
}

function parseReservation(value: unknown): RealtimeAdmissionReservation {
  if (!isRecord(value) || !hasExactKeys(value, [
    'id',
    'version',
    'idempotencyKey',
    'userKey',
    'sessionKey',
    'utcDay',
    'estimatedCents',
    'actualCents',
    'status',
    'createdAt',
    'expiresAt',
    'finalizedAt',
    'cancelledAt',
  ])) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')

  if (
    typeof value.id !== 'string' || !uuidPattern.test(value.id)
    || value.version !== AI_PATH_REALTIME_ADMISSION_VERSION
    || typeof value.idempotencyKey !== 'string' || !idempotencyKeyPattern.test(value.idempotencyKey)
    || typeof value.userKey !== 'string' || !opaqueKeyPattern.test(value.userKey)
    || typeof value.sessionKey !== 'string' || !opaqueKeyPattern.test(value.sessionKey)
    || typeof value.utcDay !== 'string' || !utcDayPattern.test(value.utcDay)
    || !isIntegerBetween(value.estimatedCents, 1, 100_000_000)
    || !(value.actualCents === null || isIntegerBetween(value.actualCents, 0, 100_000_000))
    || typeof value.status !== 'string' || !statuses.has(value.status as RealtimeReservationStatus)
    || !isIsoTimestamp(value.createdAt)
    || !isIsoTimestamp(value.expiresAt)
    || !(value.finalizedAt === null || isIsoTimestamp(value.finalizedAt))
    || !(value.cancelledAt === null || isIsoTimestamp(value.cancelledAt))
  ) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')

  const createdAt = Date.parse(value.createdAt)
  const expiresAt = Date.parse(value.expiresAt)
  const finalizedAt = value.finalizedAt === null ? null : Date.parse(value.finalizedAt)
  const cancelledAt = value.cancelledAt === null ? null : Date.parse(value.cancelledAt)
  const validLifecycle = (
    (value.status === 'reserved' || value.status === 'expired')
      ? value.actualCents === null && finalizedAt === null && cancelledAt === null
      : value.status === 'finalized'
        ? value.actualCents !== null && finalizedAt !== null && finalizedAt >= createdAt && cancelledAt === null
        : value.actualCents === null && finalizedAt === null && cancelledAt !== null && cancelledAt >= createdAt
  )
  if (
    value.utcDay !== value.createdAt.slice(0, 10)
    || expiresAt - createdAt < 30_000
    || expiresAt - createdAt > 14_400_000
    || !validLifecycle
  ) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')

  return Object.freeze({
    id: value.id,
    version: value.version,
    idempotencyKey: value.idempotencyKey,
    userKey: value.userKey,
    sessionKey: value.sessionKey,
    utcDay: value.utcDay,
    estimatedCents: value.estimatedCents,
    actualCents: value.actualCents,
    status: value.status as RealtimeReservationStatus,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
    finalizedAt: value.finalizedAt,
    cancelledAt: value.cancelledAt,
  })
}

function parseReserveResult(value: unknown, command: AtomicReserveCommand): AtomicReserveResult {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  }
  if (value.kind === 'denied') {
    if (!hasExactKeys(value, ['kind', 'reason']) || typeof value.reason !== 'string' || !reserveDenials.has(value.reason)) {
      throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
    }
    return { kind: 'denied', reason: value.reason as Extract<AtomicReserveResult, { kind: 'denied' }>['reason'] }
  }
  if (value.kind !== 'reserved' || !hasExactKeys(value, ['kind', 'reservation', 'idempotent']) || typeof value.idempotent !== 'boolean') {
    throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  }
  const reservation = parseReservation(value.reservation)
  if (
    reservation.userKey !== command.binding.userKey
    || reservation.sessionKey !== command.binding.sessionKey
    || reservation.idempotencyKey !== command.idempotencyKey
    || reservation.status !== 'reserved'
    || reservation.estimatedCents !== command.estimatedCents
  ) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  return { kind: 'reserved', reservation, idempotent: value.idempotent }
}

function parseFinalizeResult(
  value: unknown,
  command: Parameters<RealtimeAdmissionRepository['atomicFinalize']>[0],
): AtomicFinalizeResult {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  }
  if (isTerminalKind(value.kind)) {
    if (!hasExactKeys(value, ['kind'])) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
    return { kind: value.kind }
  }
  if (
    value.kind !== 'finalized'
    || !hasExactKeys(value, ['kind', 'reservation', 'idempotent', 'userBudgetExceeded', 'globalBudgetExceeded'])
    || typeof value.idempotent !== 'boolean'
    || typeof value.userBudgetExceeded !== 'boolean'
    || typeof value.globalBudgetExceeded !== 'boolean'
  ) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  const reservation = parseReservation(value.reservation)
  if (
    reservation.id !== command.reservationId
    || reservation.userKey !== command.binding.userKey
    || reservation.sessionKey !== command.binding.sessionKey
    || reservation.status !== 'finalized'
    || reservation.actualCents !== command.actualCents
  ) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  return {
    kind: 'finalized',
    reservation,
    idempotent: value.idempotent,
    userBudgetExceeded: value.userBudgetExceeded,
    globalBudgetExceeded: value.globalBudgetExceeded,
  }
}

function parseCancelResult(
  value: unknown,
  command: Parameters<RealtimeAdmissionRepository['atomicCancel']>[0],
): AtomicCancelResult {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  }
  if (isTerminalKind(value.kind)) {
    if (!hasExactKeys(value, ['kind'])) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
    return { kind: value.kind }
  }
  if (value.kind !== 'cancelled' || !hasExactKeys(value, ['kind', 'reservation', 'idempotent']) || typeof value.idempotent !== 'boolean') {
    throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  }
  const reservation = parseReservation(value.reservation)
  if (
    reservation.id !== command.reservationId
    || reservation.userKey !== command.binding.userKey
    || reservation.sessionKey !== command.binding.sessionKey
    || reservation.status !== 'cancelled'
  ) throw new SupabaseRealtimeAdmissionGatewayError('malformed_response')
  return { kind: 'cancelled', reservation, idempotent: value.idempotent }
}

function assertReserveCommand(command: AtomicReserveCommand) {
  if (
    !validBinding(command.binding)
    || !idempotencyKeyPattern.test(command.idempotencyKey)
    || !utcDayPattern.test(command.utcDay)
    || !isIntegerBetween(command.estimatedCents, 1, 100_000_000)
    || !isIsoTimestamp(command.now)
    || !isIsoTimestamp(command.expiresAt)
    || !validPolicy(command.policy)
    || command.utcDay !== command.now.slice(0, 10)
    || Date.parse(command.expiresAt) - Date.parse(command.now) !== command.policy.reservationTtlMs
    || command.estimatedCents > command.policy.maxReservationCents
  ) throw new SupabaseRealtimeAdmissionGatewayError('invalid_command')
}

async function invokeRpc(
  client: SupabaseRealtimeAdmissionRpcClient,
  name: SupabaseRealtimeAdmissionRpcName,
  args: Record<string, string | number>,
) {
  try {
    const result = await client.rpc(name, args)
    if (
      !isRecord(result)
      || !Object.hasOwn(result, 'data')
      || !Object.hasOwn(result, 'error')
      || !hasOnlyKeys(result, ['data', 'error', 'count', 'status', 'statusText'])
      || result.error !== null
      || !(
        result.count === undefined
        || result.count === null
        || isIntegerBetween(result.count, 0, Number.MAX_SAFE_INTEGER)
      )
      || !(result.status === undefined || isIntegerBetween(result.status, 200, 299))
      || !(result.statusText === undefined || typeof result.statusText === 'string')
    ) {
      throw new SupabaseRealtimeAdmissionGatewayError('rpc_failed')
    }
    return result.data
  } catch (error) {
    if (error instanceof SupabaseRealtimeAdmissionGatewayError) throw error
    throw new SupabaseRealtimeAdmissionGatewayError('rpc_failed')
  }
}

export class SupabaseRealtimeAdmissionRepository implements RealtimeAdmissionRepository {
  readonly #client: SupabaseRealtimeAdmissionRpcClient

  constructor(client: SupabaseRealtimeAdmissionRpcClient) {
    this.#client = client
  }

  async atomicReserve(command: AtomicReserveCommand): Promise<AtomicReserveResult> {
    assertReserveCommand(command)
    const data = await invokeRpc(this.#client, AI_PATH_REALTIME_ADMISSION_RPC_NAMES.reserve, {
      p_user_key: command.binding.userKey,
      p_session_key: command.binding.sessionKey,
      p_idempotency_key: command.idempotencyKey,
      p_utc_day: command.utcDay,
      p_now: command.now,
      p_expires_at: command.expiresAt,
      p_estimated_cents: command.estimatedCents,
      p_max_global_concurrent: command.policy.maxGlobalConcurrent,
      p_max_user_concurrent: command.policy.maxUserConcurrent,
      p_max_user_daily_cents: command.policy.maxUserDailyCents,
      p_max_global_daily_cents: command.policy.maxGlobalDailyCents,
      p_max_reservation_cents: command.policy.maxReservationCents,
      p_reservation_ttl_ms: command.policy.reservationTtlMs,
    })
    return parseReserveResult(data, command)
  }

  async atomicFinalize(
    command: Parameters<RealtimeAdmissionRepository['atomicFinalize']>[0],
  ): Promise<AtomicFinalizeResult> {
    if (
      !uuidPattern.test(command.reservationId)
      || !validBinding(command.binding)
      || !isIntegerBetween(command.actualCents, 0, 100_000_000)
      || !isIsoTimestamp(command.now)
      || !validPolicy(command.policy)
    ) throw new SupabaseRealtimeAdmissionGatewayError('invalid_command')
    const data = await invokeRpc(this.#client, AI_PATH_REALTIME_ADMISSION_RPC_NAMES.finalize, {
      p_reservation_id: command.reservationId,
      p_user_key: command.binding.userKey,
      p_session_key: command.binding.sessionKey,
      p_actual_cents: command.actualCents,
      p_now: command.now,
      p_max_user_daily_cents: command.policy.maxUserDailyCents,
      p_max_global_daily_cents: command.policy.maxGlobalDailyCents,
    })
    return parseFinalizeResult(data, command)
  }

  async atomicCancel(
    command: Parameters<RealtimeAdmissionRepository['atomicCancel']>[0],
  ): Promise<AtomicCancelResult> {
    if (!uuidPattern.test(command.reservationId) || !validBinding(command.binding) || !isIsoTimestamp(command.now)) {
      throw new SupabaseRealtimeAdmissionGatewayError('invalid_command')
    }
    const data = await invokeRpc(this.#client, AI_PATH_REALTIME_ADMISSION_RPC_NAMES.cancel, {
      p_reservation_id: command.reservationId,
      p_user_key: command.binding.userKey,
      p_session_key: command.binding.sessionKey,
      p_now: command.now,
    })
    return parseCancelResult(data, command)
  }
}
