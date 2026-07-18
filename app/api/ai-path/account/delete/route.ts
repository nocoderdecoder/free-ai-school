import { handleAccountDeletePost } from '@/app/ai-path/lib/account-privacy-http'
import { selectAccountPrivacyRuntime } from '@/app/ai-path/lib/account-privacy.server'
import { checkAiPathRateLimit } from '@/app/ai-path/lib/rate-limit.server'
import { sameOriginMutationResponse } from '@/app/ai-path/lib/request-security'

export async function POST(request: Request) {
  const originError = sameOriginMutationResponse(request)
  if (originError) return originError
  const selection = await selectAccountPrivacyRuntime(request)
  if (!selection.runtime.available || !selection.runtime.principal) {
    return selection.applyResponse(await handleAccountDeletePost(request, selection.runtime))
  }
  const rateLimit = await checkAiPathRateLimit(
    request,
    'ai-path-session-delete',
    selection.runtime.principal.id,
  )
  if (!rateLimit.allowed) {
    return Response.json({ error: rateLimit.reason === 'unavailable' ? 'account_deletion_unavailable' : 'rate_limit_exceeded' }, {
      status: rateLimit.reason === 'unavailable' ? 503 : 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1_000))),
      },
    })
  }
  const response = await handleAccountDeletePost(request, selection.runtime)
  // A successful deletion deliberately carries Clear-Site-Data and must not
  // append a refreshed auth cookie after the user has been removed.
  return response.status === 204 ? response : selection.applyResponse(response)
}
