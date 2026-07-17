import 'server-only'

type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number }

const processState = globalThis as typeof globalThis & {
  __aiPathRateLimits?: Map<string, { count: number; windowStart: number }>
}
const store = processState.__aiPathRateLimits ??= new Map()
const MAX_BUCKETS = 5_000

function pruneStore(now: number, windowMs: number) {
  if (store.size < MAX_BUCKETS) return
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= windowMs) store.delete(key)
  }
  while (store.size >= MAX_BUCKETS) {
    const oldestKey = store.keys().next().value as string | undefined
    if (!oldestKey) break
    store.delete(oldestKey)
  }
}

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

/**
 * Deterministic process-local limiter for AI Path routes. It intentionally
 * never falls through to ambient Supabase credentials or any network store.
 */
export async function checkAiPathRateLimit(
  request: Request,
  options: { tool: string; limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const now = Date.now()
  pruneStore(now, options.windowMs)
  const key = `${options.tool}:${clientIp(request)}`
  const entry = store.get(key)
  if (!entry || now - entry.windowStart >= options.windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: options.limit - 1, resetAt: now + options.windowMs }
  }
  if (entry.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.windowStart + options.windowMs }
  }
  entry.count += 1
  return { allowed: true, remaining: options.limit - entry.count, resetAt: entry.windowStart + options.windowMs }
}

export function aiPathRateLimitResponse(result: RateLimitResult) {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  return Response.json({ error: 'rate_limit_exceeded', retryAfterSeconds }, {
    status: 429,
    headers: { 'Retry-After': String(retryAfterSeconds), 'Cache-Control': 'no-store' },
  })
}
