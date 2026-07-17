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
  const rate = await checkAiPathRateLimit(request, { tool: 'ai-path-session-export', limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const sessionRuntime = await selectAssessmentRequestRuntime(request)
  const { sessionId } = await context.params
  return applyAssessmentRuntimeResponse(
    sessionRuntime,
    await handleSessionExport(sessionId.trim(), sessionRuntime),
  )
}

export async function DELETE(request: Request, context: SessionRouteContext) {
  const rate = await checkAiPathRateLimit(request, { tool: 'ai-path-session-delete', limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const sessionRuntime = await selectAssessmentRequestRuntime(request)
  const { sessionId } = await context.params
  return applyAssessmentRuntimeResponse(
    sessionRuntime,
    await handleSessionDelete(request, sessionId.trim(), sessionRuntime),
  )
}

