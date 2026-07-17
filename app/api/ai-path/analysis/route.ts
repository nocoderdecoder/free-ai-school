import { handleAnalysisPost } from '../../../ai-path/lib/analysis-http'
import {
  aiPathRateLimitResponse,
  checkAiPathRateLimit,
} from '../../../ai-path/lib/rate-limit.server'
import {
  applyAssessmentRuntimeResponse,
  selectAssessmentRequestRuntime,
} from '../../../ai-path/lib/session-persistence.server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const rate = await checkAiPathRateLimit(request, { tool: 'ai-path-analysis', limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const sessionRuntime = await selectAssessmentRequestRuntime(request)
  return applyAssessmentRuntimeResponse(
    sessionRuntime,
    await handleAnalysisPost(request, sessionRuntime),
  )
}
