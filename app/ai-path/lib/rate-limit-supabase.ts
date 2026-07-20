import type {
  AtomicRateLimitCommand,
  AtomicRateLimitStore,
  RateLimitResult,
} from './rate-limit.ts'

export type SupabaseRateLimitRpcClient = {
  rpc(
    name: 'consume_ai_path_rate_limit',
    args: {
      p_policy_id: string
      p_identity_hashes: string[]
      p_limit: number
      p_window_ms: number
      p_now: string
    },
  ): PromiseLike<{ data: unknown; error: unknown }>
}

export class SupabaseRateLimitError extends Error {
  readonly code: 'rpc_failed' | 'malformed_response'

  constructor(code: 'rpc_failed' | 'malformed_response') {
    super(code)
    this.code = code
    this.name = 'SupabaseRateLimitError'
  }
}

function isResult(value: unknown): value is RateLimitResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const result = value as Record<string, unknown>
  const keys = Object.keys(result).sort()
  return keys.join(',') === 'allowed,reason,remaining,resetAt'
    && typeof result.allowed === 'boolean'
    && Number.isInteger(result.remaining) && Number(result.remaining) >= 0
    && Number.isSafeInteger(result.resetAt) && Number(result.resetAt) > 0
    && (result.reason === 'allowed' || result.reason === 'exceeded')
    && result.allowed === (result.reason === 'allowed')
}

/** Narrow adapter for the one service-role-only, atomic database RPC. */
export class SupabaseAtomicRateLimitStore implements AtomicRateLimitStore {
  private readonly client: SupabaseRateLimitRpcClient

  constructor(client: SupabaseRateLimitRpcClient) {
    this.client = client
  }

  async consume(command: AtomicRateLimitCommand): Promise<RateLimitResult> {
    let response: { data: unknown; error: unknown }
    try {
      response = await this.client.rpc('consume_ai_path_rate_limit', {
        p_policy_id: command.policyId,
        p_identity_hashes: [...command.keys],
        p_limit: command.limit,
        p_window_ms: command.windowMs,
        p_now: new Date(command.nowMs).toISOString(),
      })
    } catch {
      throw new SupabaseRateLimitError('rpc_failed')
    }
    if (response.error) throw new SupabaseRateLimitError('rpc_failed')
    if (!isResult(response.data)) throw new SupabaseRateLimitError('malformed_response')
    return response.data
  }
}
