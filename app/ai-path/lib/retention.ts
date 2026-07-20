export type AiPathRetentionTarget = 'assessment-sessions' | 'learning-plans'

export type AiPathRetentionPurger = {
  target: AiPathRetentionTarget
  purgeExpired: () => Promise<number>
}

export type AiPathRetentionOperationalEvent = {
  kind: 'retention_cycle_completed' | 'retention_target_failed'
  occurredAt: string
  runId: string
  target?: AiPathRetentionTarget
  deleted?: Record<AiPathRetentionTarget, number>
  errorCode?: 'purge_failed' | 'invalid_delete_count'
}

export type AiPathRetentionCycleResult = {
  runId: string
  completedAt: string
  deleted: Record<AiPathRetentionTarget, number>
}

export class AiPathRetentionError extends Error {
  readonly code: 'invalid_configuration' | 'purge_failed' | 'invalid_delete_count'
  readonly target?: AiPathRetentionTarget

  constructor(
    code: AiPathRetentionError['code'],
    message: string,
    target?: AiPathRetentionTarget,
  ) {
    super(message)
    this.name = 'AiPathRetentionError'
    this.code = code
    this.target = target
  }
}

const requiredTargets: readonly AiPathRetentionTarget[] = ['assessment-sessions', 'learning-plans']

function validRunId(value: string) {
  return /^retention_[A-Za-z0-9_-]{8,96}$/.test(value)
}

export async function runAiPathRetentionCycle(
  purgers: readonly AiPathRetentionPurger[],
  options: {
    runId: string
    now?: () => Date
    maximumDeletesPerTarget?: number
    onOperationalEvent?: (event: AiPathRetentionOperationalEvent) => void | Promise<void>
  },
): Promise<AiPathRetentionCycleResult> {
  if (!validRunId(options.runId)) {
    throw new AiPathRetentionError('invalid_configuration', 'Retention run ID is invalid.')
  }
  const maximumDeletes = options.maximumDeletesPerTarget ?? 100_000
  if (!Number.isInteger(maximumDeletes) || maximumDeletes < 1 || maximumDeletes > 1_000_000) {
    throw new AiPathRetentionError('invalid_configuration', 'Retention delete bound is invalid.')
  }
  const byTarget = new Map(purgers.map(purger => [purger.target, purger]))
  if (purgers.length !== requiredTargets.length || byTarget.size !== requiredTargets.length || requiredTargets.some(target => !byTarget.has(target))) {
    throw new AiPathRetentionError('invalid_configuration', 'Every retention target must be configured exactly once.')
  }

  const now = options.now ?? (() => new Date())
  const deleted: Record<AiPathRetentionTarget, number> = {
    'assessment-sessions': 0,
    'learning-plans': 0,
  }

  // Purge plans first. Session deletion also cascades derived plans, and the
  // subsequent session purge remains idempotent if this cycle is retried.
  for (const target of ['learning-plans', 'assessment-sessions'] as const) {
    try {
      const count = await byTarget.get(target)!.purgeExpired()
      if (!Number.isSafeInteger(count) || count < 0 || count > maximumDeletes) {
        await options.onOperationalEvent?.({
          kind: 'retention_target_failed',
          occurredAt: now().toISOString(),
          runId: options.runId,
          target,
          errorCode: 'invalid_delete_count',
        })
        throw new AiPathRetentionError('invalid_delete_count', 'Retention returned an invalid delete count.', target)
      }
      deleted[target] = count
    } catch (error) {
      if (error instanceof AiPathRetentionError) throw error
      await options.onOperationalEvent?.({
        kind: 'retention_target_failed',
        occurredAt: now().toISOString(),
        runId: options.runId,
        target,
        errorCode: 'purge_failed',
      })
      throw new AiPathRetentionError('purge_failed', 'A retention target failed.', target)
    }
  }

  const completedAt = now().toISOString()
  const result = { runId: options.runId, completedAt, deleted }
  await options.onOperationalEvent?.({
    kind: 'retention_cycle_completed',
    occurredAt: completedAt,
    runId: options.runId,
    deleted: { ...deleted },
  })
  return result
}
