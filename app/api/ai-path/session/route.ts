import {
  applyAssessmentRuntimeResponse,
  selectAssessmentRequestRuntime,
} from '../../../ai-path/lib/session-persistence.server'
import {
  handleLegacySessionGet,
  handleSessionPost,
} from '../../../ai-path/lib/session-http'
import {
  aiPathRateLimitResponse,
  checkAiPathRateLimit,
} from '../../../ai-path/lib/rate-limit.server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const rate = await checkAiPathRateLimit(request, { tool: 'ai-path-session', limit: 30, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const sessionRuntime = await selectAssessmentRequestRuntime(request)
  return applyAssessmentRuntimeResponse(
    sessionRuntime,
    await handleSessionPost(request, sessionRuntime),
  )
}
export async function GET(request: Request) {
  const rate = await checkAiPathRateLimit(request, { tool: 'ai-path-session-read', limit: 60, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const sessionRuntime = await selectAssessmentRequestRuntime(request)
  return applyAssessmentRuntimeResponse(
    sessionRuntime,
    await handleLegacySessionGet(request, sessionRuntime),
  )
}
