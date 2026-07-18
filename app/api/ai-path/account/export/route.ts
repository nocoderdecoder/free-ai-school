import { handleAccountExportPost } from '@/app/ai-path/lib/account-privacy-http'
import { selectAccountPrivacyRuntime } from '@/app/ai-path/lib/account-privacy.server'
import { checkAiPathRateLimit } from '@/app/ai-path/lib/rate-limit.server'
import { sameOriginMutationResponse } from '@/app/ai-path/lib/request-security'

export async function POST(request: Request) {
  const originError = sameOriginMutationResponse(request)
  if (originError) return originError
  const selection = await selectAccountPrivacyRuntime(request)
  if (!selection.runtime.available || !selection.runtime.principal) {
    return selection.applyResponse(await handleAccountExportPost(request, selection.runtime))
  }
  const rateLimit = await checkAiPathRateLimit(
    request,
    'ai-path-session-export',
    selection.runtime.principal.id,
  )
  if (!rateLimit.allowed) {
    return Response.json({ error: rateLimit.reason === 'unavailable' ? 'account_export_unavailable' : 'rate_limit_exceeded' }, {
      status: rateLimit.reason === 'unavailable' ? 503 : 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1_000))),
      },
    })
  }
  return selection.applyResponse(await handleAccountExportPost(request, selection.runtime))
}
