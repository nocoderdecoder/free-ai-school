import type { AssessmentRequestRuntime } from './request-runtime.ts'

function normalizedOrigin(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return value === url.origin ? url.origin : null
  } catch {
    return null
  }
}

function developmentRequestOrigins(request: Request): Set<string> {
  const origins = new Set<string>()
  const requestOrigin = normalizedOrigin(new URL(request.url).origin)
  if (requestOrigin) origins.add(requestOrigin)

  // Next's development proxy can preserve the browser-facing host here while
  // Request.url still uses the internal server origin. Production never trusts
  // these headers; it requires AI_PATH_PUBLIC_ORIGIN below.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost?.includes(',') ? null : (forwardedHost || request.headers.get('host'))
  if (host && !/[\s\\/@]/.test(host)) {
    const forwardedProtocol = request.headers.get('x-forwarded-proto')
    const protocol = forwardedProtocol === 'https' || forwardedProtocol === 'http'
      ? forwardedProtocol
      : new URL(request.url).protocol.slice(0, -1)
    const forwardedOrigin = normalizedOrigin(`${protocol}://${host}`)
    if (forwardedOrigin) origins.add(forwardedOrigin)
  }
  return origins
}

function originMismatchResponse(request: Request): Response | null {
  const origin = request.headers.get('origin')
  if (!origin) {
    return Response.json({ error: 'origin_required' }, {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  const browserOrigin = normalizedOrigin(origin)
  if (browserOrigin) {
    const configuredOrigin = normalizedOrigin(process.env.AI_PATH_PUBLIC_ORIGIN)
    if (configuredOrigin && browserOrigin === configuredOrigin) return null
    if (process.env.NODE_ENV !== 'production'
      && developmentRequestOrigins(request).has(browserOrigin)) return null
  }
  return Response.json({ error: 'cross_origin_request_rejected' }, {
    status: 403,
    headers: { 'Cache-Control': 'no-store' },
  })
}

/** Public browser mutations also require an exact Origin to prevent API freeloading. */
export function sameOriginMutationResponse(request: Request): Response | null {
  return originMismatchResponse(request)
}

/** Cookie-authenticated mutations require an exact browser Origin match. */
export function crossOriginMutationResponse(
  request: Request,
  runtime: AssessmentRequestRuntime,
): Response | null {
  if (runtime.mode !== 'supabase') return null
  return originMismatchResponse(request)
}
