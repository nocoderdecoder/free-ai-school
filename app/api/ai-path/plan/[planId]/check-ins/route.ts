import {
  handleLearningPlanCheckIn,
} from '../../../../../ai-path/lib/learning-plan-http'
import {
  selectLearningPlanRequestRuntime,
} from '../../../../../ai-path/lib/learning-plan-persistence.server'
import {
  applyLearningPlanRuntimeResponse,
} from '../../../../../ai-path/lib/learning-plan-runtime-response'
import {
  aiPathRateLimitResponse,
  checkAiPathRateLimit,
} from '../../../../../ai-path/lib/rate-limit.server'

export const runtime = 'nodejs'

type PlanRouteContext = { params: Promise<{ planId: string }> }

export async function POST(request: Request, context: PlanRouteContext) {
  const rate = await checkAiPathRateLimit(request, { tool: 'ai-path-plan-check-in', limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const planRuntime = await selectLearningPlanRequestRuntime(request)
  const { planId } = await context.params
  return applyLearningPlanRuntimeResponse(
    planRuntime,
    await handleLearningPlanCheckIn(request, planId.trim(), planRuntime),
  )
}
