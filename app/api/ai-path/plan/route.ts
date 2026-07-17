import {
  handleLearningPlanCreate,
} from '../../../ai-path/lib/learning-plan-http'
import {
  selectLearningPlanRequestRuntime,
} from '../../../ai-path/lib/learning-plan-persistence.server'
import {
  applyLearningPlanRuntimeResponse,
} from '../../../ai-path/lib/learning-plan-runtime-response'
import {
  aiPathRateLimitResponse,
  checkAiPathRateLimit,
} from '../../../ai-path/lib/rate-limit.server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const rate = await checkAiPathRateLimit(request, { tool: 'ai-path-plan-create', limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const planRuntime = await selectLearningPlanRequestRuntime(request)
  return applyLearningPlanRuntimeResponse(
    planRuntime,
    await handleLearningPlanCreate(request, planRuntime),
  )
}
