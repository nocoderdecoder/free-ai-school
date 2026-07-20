import {
  applyAssessmentRuntimeResponse,
  selectAssessmentRequestRuntime,
} from '../../../../ai-path/lib/session-persistence.server'
import {
  handleSessionDelete,
  handleSessionExport,
} from '../../../../ai-path/lib/session-http'
import {
  aiPathRateLimitResponse,
  checkAiPathRateLimit,
} from '../../../../ai-path/lib/rate-limit.server'

export const runtime = 'nodejs'

type SessionRouteContext = { params: Promise<{ sessionId: string }> }

export async function GET(request: Request, context: SessionRouteContext) {
  const rate = await checkAiPathRateLimit(request, 'ai-path-session-export')
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const sessionRuntime = await selectAssessmentRequestRuntime(request)
  const { sessionId } = await context.params
  return applyAssessmentRuntimeResponse(
    sessionRuntime,
    await handleSessionExport(sessionId.trim(), sessionRuntime),
  )
}

export async function DELETE(request: Request, context: SessionRouteContext) {
  const rate = await checkAiPathRateLimit(request, 'ai-path-session-delete')
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const sessionRuntime = await selectAssessmentRequestRuntime(request)
  const { sessionId } = await context.params
  return applyAssessmentRuntimeResponse(
    sessionRuntime,
    await handleSessionDelete(request, sessionId.trim(), sessionRuntime),
  )
}
