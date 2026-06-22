/**
 * Lightweight IP-based rate limiting for the Claude API tool routes.
 *
 * Why Supabase instead of pure in-memory:
 * Vercel serverless/edge functions are stateless across cold starts and are
 * NOT shared across concurrent instances — an in-memory counter only protects
 * a single warm container, which is easy to defeat by just hitting the route
 * a few times (each request can land on a different instance). This project
 * already has Supabase configured (see app/api/subscribe/route.ts), so we
 * reuse it as a durable, shared counter store — no new infra required.
 *
 * If Supabase isn't configured (e.g. local dev without env vars), we fall
 * back to an in-memory fixed-window limiter. That fallback is NOT reliable
 * in production (resets on cold start / isn't shared across instances) but
 * is good enough for local development and acts as a safety net rather than
 * the primary defense.
 *
 * Expected Supabase table (create once via SQL editor / migration):
 *
 *   create table if not exists rate_limits (
 *     bucket_key text primary key,
 *     count integer not null default 0,
 *     window_start timestamptz not null default now()
 *   );
 *
 * No RLS policy is required as long as it's only accessed with the service
 * role key (server-side only, same as the `subscribers` table usage).
 */

import { NextResponse } from 'next/server'

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

type RateLimitOptions = {
  /** Logical name of the tool/route being limited, e.g. "gtm-playbook" */
  tool: string
  /** Max requests allowed per window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

// ---- In-memory fallback (per warm instance only) ----------------------
const memoryStore = new Map<string, { count: number; windowStart: number }>()

function checkInMemory(bucketKey: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = memoryStore.get(bucketKey)

  if (!entry || now - entry.windowStart >= windowMs) {
    memoryStore.set(bucketKey, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.windowStart + windowMs }
  }

  entry.count += 1
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.windowStart + windowMs }
}

// ---- Supabase-backed durable counter -----------------------------------
async function checkInSupabase(
  bucketKey: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const now = Date.now()

    const { data: existing, error: selectError } = await supabase
      .from('rate_limits')
      .select('count, window_start')
      .eq('bucket_key', bucketKey)
      .maybeSingle()

    if (selectError) throw selectError

    // No row yet, or window has expired — start a fresh window.
    if (!existing || now - new Date(existing.window_start).getTime() >= windowMs) {
      const { error: upsertError } = await supabase
        .from('rate_limits')
        .upsert(
          { bucket_key: bucketKey, count: 1, window_start: new Date(now).toISOString() },
          { onConflict: 'bucket_key' }
        )
      if (upsertError) throw upsertError
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
    }

    const windowStartMs = new Date(existing.window_start).getTime()

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: windowStartMs + windowMs }
    }

    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ count: existing.count + 1 })
      .eq('bucket_key', bucketKey)
    if (updateError) throw updateError

    return {
      allowed: true,
      remaining: limit - (existing.count + 1),
      resetAt: windowStartMs + windowMs,
    }
  } catch (err) {
    console.error('Rate limit (Supabase) check failed, falling back to in-memory:', err)
    return null
  }
}

function getClientIp(request: Request): string {
  const headers = request.headers
  // Vercel sets x-forwarded-for; x-real-ip is a common fallback.
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

/**
 * Check + record a request against the rate limit for a given tool.
 * Uses Supabase when configured, otherwise falls back to an in-memory
 * fixed-window counter scoped to the current server instance.
 */
export async function checkRateLimit(
  request: Request,
  { tool, limit, windowMs }: RateLimitOptions
): Promise<RateLimitResult> {
  const ip = getClientIp(request)
  const bucketKey = `${tool}:${ip}`

  const supabaseResult = await checkInSupabase(bucketKey, limit, windowMs)
  if (supabaseResult) return supabaseResult

  return checkInMemory(bucketKey, limit, windowMs)
}

/** Standard 429 JSON response with a friendly message and Retry-After header. */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  return NextResponse.json(
    {
      error:
        "You've hit the rate limit for this tool. Please wait a bit before trying again — this keeps the tool free and fast for everyone.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  )
}
