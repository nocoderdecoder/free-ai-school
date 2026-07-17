import { NextResponse } from 'next/server.js'

import type { AssessmentRequestRuntime } from './request-runtime.ts'

const allowedSupabaseResponseHeaders = new Set(['cache-control', 'expires', 'pragma'])

export function applyAssessmentRuntimeResponse(
  runtime: AssessmentRequestRuntime,
  response: Response,
): NextResponse {
  const output = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
  for (const [name, value] of Object.entries(runtime.pendingHeaders)) {
    if (allowedSupabaseResponseHeaders.has(name.toLowerCase())) output.headers.set(name, value)
  }
  for (const cookie of runtime.pendingCookies) {
    output.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  output.headers.set('Cache-Control', runtime.pendingCookies.length
    ? 'private, no-cache, no-store, must-revalidate, max-age=0'
    : output.headers.get('Cache-Control') || 'no-store')
  return output
}
