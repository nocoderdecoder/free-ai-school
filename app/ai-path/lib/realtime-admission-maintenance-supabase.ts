export const AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_NAME =
  'maintain_ai_path_realtime_admission' as const
export const AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH = 1_000 as const
export const AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_DEADLINE_MS = 15_000 as const

type SupabaseRpcResult = {
  data: unknown
  error: { code?: string; message: string } | null
  count?: number | null
  status?: number
  statusText?: string
}

type MaintenanceRpcArgs = {
  p_policy_id: string
  p_expire_limit: number
  p_purge_limit: number
  p_intent_cleanup_limit: number
  p_mapping_gc_limit: number
}

export type SupabaseRealtimeAdmissionMaintenanceRpcClient = {
  rpc: (
    name: typeof AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_NAME,
    args: MaintenanceRpcArgs,
    signal: AbortSignal,
  ) => PromiseLike<SupabaseRpcResult>
}

export type RealtimeAdmissionMaintenanceLimits = Readonly<{
  expireLimit: number
  purgeLimit: number
  intentCleanupLimit: number
  mappingGcLimit: number
}>

export type RealtimeAdmissionMaintenanceResult = Readonly<{
  policyId: string
  retentionCutoff: string
  transitionedExpiredCount: number
  purgedTotal: number
  purgedByStatus: Readonly<{ expired: number; finalized: number; cancelled: number }>
  cleanedIntentCount: number
  cleanedSessionMappingCount: number
  cleanedOwnerMappingCount: number
  hasMoreToExpire: boolean
  hasMoreToPurge: boolean
  hasMoreIntents: boolean
  hasMoreMappings: boolean
  hasMore: boolean
}>

export class SupabaseRealtimeAdmissionMaintenanceError extends Error {
  readonly code: 'invalid_policy' | 'invalid_limits' | 'rpc_failed' | 'rpc_timeout' | 'malformed_response'

  constructor(code: SupabaseRealtimeAdmissionMaintenanceError['code']) {
    super('The durable Realtime admission maintenance operation failed closed.')
    this.name = 'SupabaseRealtimeAdmissionMaintenanceError'
    this.code = code
  }
}

class SupabaseRealtimeAdmissionMaintenanceDeadlineError extends Error {}

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

function validPolicyId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 256
}

function parseMaintenanceResult(
  value: unknown,
  policyId: string,
  limits: RealtimeAdmissionMaintenanceLimits,
): RealtimeAdmissionMaintenanceResult {
  if (!isRecord(value) || !hasExactKeys(value, [
    'policyId',
    'retentionCutoff',
    'transitionedExpiredCount',
    'purgedTotal',
    'purgedByStatus',
    'cleanedIntentCount',
    'cleanedSessionMappingCount',
    'cleanedOwnerMappingCount',
    'hasMoreToExpire',
    'hasMoreToPurge',
    'hasMoreIntents',
    'hasMoreMappings',
    'hasMore',
  ])) throw new SupabaseRealtimeAdmissionMaintenanceError('malformed_response')

  if (
    value.policyId !== policyId
    || !isIsoTimestamp(value.retentionCutoff)
    || !integerBetween(value.transitionedExpiredCount, 0, limits.expireLimit)
    || !integerBetween(value.purgedTotal, 0, limits.purgeLimit)
    || !isRecord(value.purgedByStatus)
    || !hasExactKeys(value.purgedByStatus, ['expired', 'finalized', 'cancelled'])
    || !integerBetween(value.purgedByStatus.expired, 0, limits.purgeLimit)
    || !integerBetween(value.purgedByStatus.finalized, 0, limits.purgeLimit)
    || !integerBetween(value.purgedByStatus.cancelled, 0, limits.purgeLimit)
    || value.purgedByStatus.expired + value.purgedByStatus.finalized
      + value.purgedByStatus.cancelled !== value.purgedTotal
    || !integerBetween(value.cleanedIntentCount, 0, limits.intentCleanupLimit)
    || !integerBetween(value.cleanedSessionMappingCount, 0, limits.mappingGcLimit)
    || !integerBetween(value.cleanedOwnerMappingCount, 0, limits.mappingGcLimit)
    || value.cleanedSessionMappingCount + value.cleanedOwnerMappingCount > limits.mappingGcLimit
    || typeof value.hasMoreToExpire !== 'boolean'
    || typeof value.hasMoreToPurge !== 'boolean'
    || typeof value.hasMoreIntents !== 'boolean'
    || typeof value.hasMoreMappings !== 'boolean'
    || typeof value.hasMore !== 'boolean'
    || value.hasMore !== (
      value.hasMoreToExpire
      || value.hasMoreToPurge
      || value.hasMoreIntents
      || value.hasMoreMappings
    )
  ) throw new SupabaseRealtimeAdmissionMaintenanceError('malformed_response')

  return Object.freeze({
    policyId: value.policyId,
    retentionCutoff: value.retentionCutoff,
    transitionedExpiredCount: value.transitionedExpiredCount,
    purgedTotal: value.purgedTotal,
    purgedByStatus: Object.freeze({
      expired: value.purgedByStatus.expired,
      finalized: value.purgedByStatus.finalized,
      cancelled: value.purgedByStatus.cancelled,
    }),
    cleanedIntentCount: value.cleanedIntentCount,
    cleanedSessionMappingCount: value.cleanedSessionMappingCount,
    cleanedOwnerMappingCount: value.cleanedOwnerMappingCount,
    hasMoreToExpire: value.hasMoreToExpire,
    hasMoreToPurge: value.hasMoreToPurge,
    hasMoreIntents: value.hasMoreIntents,
    hasMoreMappings: value.hasMoreMappings,
    hasMore: value.hasMore,
  })
}

export async function maintainSupabaseRealtimeAdmission(
  client: SupabaseRealtimeAdmissionMaintenanceRpcClient,
  policyId: string,
  input: RealtimeAdmissionMaintenanceLimits,
): Promise<RealtimeAdmissionMaintenanceResult> {
  if (!validPolicyId(policyId)) {
    throw new SupabaseRealtimeAdmissionMaintenanceError('invalid_policy')
  }
  if (
    !integerBetween(input.expireLimit, 1, AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH)
    || !integerBetween(input.purgeLimit, 1, AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH)
    || !integerBetween(input.intentCleanupLimit, 1, AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH)
    || !integerBetween(input.mappingGcLimit, 1, AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH)
  ) throw new SupabaseRealtimeAdmissionMaintenanceError('invalid_limits')

  const signal = AbortSignal.timeout(AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_DEADLINE_MS)
  try {
    const rpc = Promise.resolve(client.rpc(AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_NAME, {
      p_policy_id: policyId,
      p_expire_limit: input.expireLimit,
      p_purge_limit: input.purgeLimit,
      p_intent_cleanup_limit: input.intentCleanupLimit,
      p_mapping_gc_limit: input.mappingGcLimit,
    }, signal))
    const deadline = new Promise<never>((_, reject) => {
      const rejectForDeadline = () => reject(new SupabaseRealtimeAdmissionMaintenanceDeadlineError())
      if (signal.aborted) rejectForDeadline()
      else signal.addEventListener('abort', rejectForDeadline, { once: true })
    })
    const response = await Promise.race([rpc, deadline])
    if (
      !isRecord(response)
      || !Object.hasOwn(response, 'data')
      || !Object.hasOwn(response, 'error')
      || !hasOnlyKeys(response, ['data', 'error', 'count', 'status', 'statusText'])
      || response.error !== null
      || !(response.count === undefined || response.count === null
        || integerBetween(response.count, 0, Number.MAX_SAFE_INTEGER))
      || !(response.status === undefined || integerBetween(response.status, 200, 299))
      || !(response.statusText === undefined || typeof response.statusText === 'string')
    ) throw new SupabaseRealtimeAdmissionMaintenanceError('rpc_failed')
    return parseMaintenanceResult(response.data, policyId, input)
  } catch (error) {
    if (error instanceof SupabaseRealtimeAdmissionMaintenanceError) throw error
    if (error instanceof SupabaseRealtimeAdmissionMaintenanceDeadlineError || signal.aborted) {
      throw new SupabaseRealtimeAdmissionMaintenanceError('rpc_timeout')
    }
    throw new SupabaseRealtimeAdmissionMaintenanceError('rpc_failed')
  }
}
