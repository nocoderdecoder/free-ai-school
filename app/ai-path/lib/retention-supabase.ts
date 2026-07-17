import {
  AiPathRetentionError,
  runAiPathRetentionCycle,
  type AiPathRetentionCycleResult,
  type AiPathRetentionOperationalEvent,
  type AiPathRetentionPurger,
  type AiPathRetentionTarget,
} from './retention.ts'

export const AI_PATH_RETENTION_MAXIMUM_DELETES_PER_TARGET = 100_000 as const

export const AI_PATH_RETENTION_RPC_NAMES = {
  'assessment-sessions': 'purge_expired_ai_path_sessions',
  'learning-plans': 'purge_expired_ai_path_learning_plans',
} as const

export type AiPathRetentionRpcName = typeof AI_PATH_RETENTION_RPC_NAMES[AiPathRetentionTarget]

type SupabaseRpcError = {
  code?: string
  message: string
}

type SupabaseRpcResult = {
  data: number | null
  error: SupabaseRpcError | null
}

export type SupabaseRetentionRpcClient = {
  rpc: (
    name: AiPathRetentionRpcName,
    args: { p_limit: number },
  ) => PromiseLike<SupabaseRpcResult>
}

export class SupabaseRetentionGatewayError extends Error {
  readonly target: AiPathRetentionTarget

  constructor(target: AiPathRetentionTarget) {
    super('The durable retention target could not be purged.')
    this.name = 'SupabaseRetentionGatewayError'
    this.target = target
  }
}

/**
 * Minimal deterministic transport for the two service-role-only purge RPCs.
 * It accepts an already-created client and never reads credentials or logs the
 * provider response. PostgreSQL EXECUTE grants remain the final role check.
 */
function createSupabaseRetentionPurgers(
  client: SupabaseRetentionRpcClient,
  maximumDeletesPerTarget: number,
): readonly AiPathRetentionPurger[] {
  const purger = (target: AiPathRetentionTarget): AiPathRetentionPurger => ({
    target,
    async purgeExpired() {
      try {
        const { data, error } = await client.rpc(AI_PATH_RETENTION_RPC_NAMES[target], {
          p_limit: maximumDeletesPerTarget,
        })
        if (error) throw new SupabaseRetentionGatewayError(target)
        // The cycle validates this untrusted runtime value before reporting it.
        // Supabase's generated type is numeric, while mocks can exercise null
        // and malformed values to prove that boundary.
        return data as number
      } catch (error) {
        if (error instanceof SupabaseRetentionGatewayError) throw error
        throw new SupabaseRetentionGatewayError(target)
      }
    },
  })

  return [purger('assessment-sessions'), purger('learning-plans')]
}

export async function runSupabaseRetentionCycle(
  client: SupabaseRetentionRpcClient,
  options: {
    runId: string
    now?: () => Date
    maximumDeletesPerTarget?: number
    onOperationalEvent?: (
      event: AiPathRetentionOperationalEvent,
    ) => void | Promise<void>
  },
): Promise<AiPathRetentionCycleResult> {
  const maximumDeletesPerTarget = options.maximumDeletesPerTarget
    ?? AI_PATH_RETENTION_MAXIMUM_DELETES_PER_TARGET
  if (
    !Number.isInteger(maximumDeletesPerTarget)
    || maximumDeletesPerTarget < 1
    || maximumDeletesPerTarget > AI_PATH_RETENTION_MAXIMUM_DELETES_PER_TARGET
  ) {
    throw new AiPathRetentionError(
      'invalid_configuration',
      'Supabase retention batch limit is invalid.',
    )
  }
  return runAiPathRetentionCycle(
    createSupabaseRetentionPurgers(client, maximumDeletesPerTarget),
    {
      runId: options.runId,
      now: options.now,
      maximumDeletesPerTarget,
      onOperationalEvent: options.onOperationalEvent,
    },
  )
}
