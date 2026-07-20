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
  const rate = await checkAiPathRateLimit(request, 'ai-path-session')
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const sessionRuntime = await selectAssessmentRequestRuntime(request)
  return applyAssessmentRuntimeResponse(
    sessionRuntime,
    await handleSessionPost(request, sessionRuntime),
  )
}
export async function GET(request: Request) {
  const rate = await checkAiPathRateLimit(request, 'ai-path-session-read')
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const sessionRuntime = await selectAssessmentRequestRuntime(request)
  return applyAssessmentRuntimeResponse(
    sessionRuntime,
    await handleLegacySessionGet(request, sessionRuntime),
  )
}
