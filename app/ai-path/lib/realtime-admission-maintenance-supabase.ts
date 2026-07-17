export const AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_NAME =
  'maintain_ai_path_realtime_admission' as const
export const AI_PATH_REALTIME_ADMISSION_MAINTENANCE_POLICY_VERSION =
  '2026-07-17.v1' as const
export const AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH = 1_000 as const

type SupabaseRpcError = { code?: string; message: string }
type SupabaseRpcResult = {
  data: unknown
  error: SupabaseRpcError | null
  count?: number | null
  status?: number
  statusText?: string
}

export type SupabaseRealtimeAdmissionMaintenanceRpcClient = {
  rpc: (
    name: typeof AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_NAME,
    args: { p_expire_limit: number; p_purge_limit: number },
  ) => PromiseLike<SupabaseRpcResult>
}

export type RealtimeAdmissionMaintenanceResult = Readonly<{
  policyVersion: typeof AI_PATH_REALTIME_ADMISSION_MAINTENANCE_POLICY_VERSION
  retentionCutoff: string
  transitionedExpiredCount: number
  purgedTotal: number
  purgedByStatus: Readonly<{
    expired: number
    finalized: number
    cancelled: number
  }>
  hasMoreToExpire: boolean
  hasMoreToPurge: boolean
  hasMore: boolean
}>

export class SupabaseRealtimeAdmissionMaintenanceError extends Error {
  readonly code: 'invalid_limits' | 'rpc_failed' | 'malformed_response'

  constructor(code: SupabaseRealtimeAdmissionMaintenanceError['code']) {
    super('The durable Realtime admission maintenance operation failed closed.')
    this.name = 'SupabaseRealtimeAdmissionMaintenanceError'
    this.code = code
  }
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

function integerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
}

function parseMaintenanceResult(
  value: unknown,
  expireLimit: number,
  purgeLimit: number,
): RealtimeAdmissionMaintenanceResult {
  if (!isRecord(value) || !hasExactKeys(value, [
    'policyVersion',
    'retentionCutoff',
    'transitionedExpiredCount',
    'purgedTotal',
    'purgedByStatus',
    'hasMoreToExpire',
    'hasMoreToPurge',
    'hasMore',
  ])) throw new SupabaseRealtimeAdmissionMaintenanceError('malformed_response')

  if (
    value.policyVersion !== AI_PATH_REALTIME_ADMISSION_MAINTENANCE_POLICY_VERSION
    || !isIsoTimestamp(value.retentionCutoff)
    || !integerBetween(value.transitionedExpiredCount, 0, expireLimit)
    || !integerBetween(value.purgedTotal, 0, purgeLimit)
    || !isRecord(value.purgedByStatus)
    || !hasExactKeys(value.purgedByStatus, ['expired', 'finalized', 'cancelled'])
    || !integerBetween(value.purgedByStatus.expired, 0, purgeLimit)
    || !integerBetween(value.purgedByStatus.finalized, 0, purgeLimit)
    || !integerBetween(value.purgedByStatus.cancelled, 0, purgeLimit)
    || value.purgedByStatus.expired
      + value.purgedByStatus.finalized
      + value.purgedByStatus.cancelled !== value.purgedTotal
    || typeof value.hasMoreToExpire !== 'boolean'
    || typeof value.hasMoreToPurge !== 'boolean'
    || typeof value.hasMore !== 'boolean'
    || value.hasMore !== (value.hasMoreToExpire || value.hasMoreToPurge)
  ) throw new SupabaseRealtimeAdmissionMaintenanceError('malformed_response')

  return Object.freeze({
    policyVersion: value.policyVersion,
    retentionCutoff: value.retentionCutoff,
    transitionedExpiredCount: value.transitionedExpiredCount,
    purgedTotal: value.purgedTotal,
    purgedByStatus: Object.freeze({
      expired: value.purgedByStatus.expired,
      finalized: value.purgedByStatus.finalized,
      cancelled: value.purgedByStatus.cancelled,
    }),
    hasMoreToExpire: value.hasMoreToExpire,
    hasMoreToPurge: value.hasMoreToPurge,
    hasMore: value.hasMore,
  })
}

export async function maintainSupabaseRealtimeAdmission(
  client: SupabaseRealtimeAdmissionMaintenanceRpcClient,
  input: { expireLimit: number; purgeLimit: number },
): Promise<RealtimeAdmissionMaintenanceResult> {
  if (
    !integerBetween(input.expireLimit, 1, AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH)
    || !integerBetween(input.purgeLimit, 1, AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH)
  ) throw new SupabaseRealtimeAdmissionMaintenanceError('invalid_limits')

  try {
    const response = await client.rpc(AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_NAME, {
      p_expire_limit: input.expireLimit,
      p_purge_limit: input.purgeLimit,
    })
    if (
      !isRecord(response)
      || !Object.hasOwn(response, 'data')
      || !Object.hasOwn(response, 'error')
      || !hasOnlyKeys(response, ['data', 'error', 'count', 'status', 'statusText'])
      || response.error !== null
      || !(
        response.count === undefined
        || response.count === null
        || integerBetween(response.count, 0, Number.MAX_SAFE_INTEGER)
      )
      || !(response.status === undefined || integerBetween(response.status, 200, 299))
      || !(response.statusText === undefined || typeof response.statusText === 'string')
    ) throw new SupabaseRealtimeAdmissionMaintenanceError('rpc_failed')
    return parseMaintenanceResult(response.data, input.expireLimit, input.purgeLimit)
  } catch (error) {
    if (error instanceof SupabaseRealtimeAdmissionMaintenanceError) throw error
    throw new SupabaseRealtimeAdmissionMaintenanceError('rpc_failed')
  }
}
