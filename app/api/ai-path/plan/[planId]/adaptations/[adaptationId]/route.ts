import {
  handleLearningPlanAdaptationDecision,
} from '../../../../../../ai-path/lib/learning-plan-http'
import {
  selectLearningPlanRequestRuntime,
} from '../../../../../../ai-path/lib/learning-plan-persistence.server'
import {
  applyLearningPlanRuntimeResponse,
} from '../../../../../../ai-path/lib/learning-plan-runtime-response'
import {
  aiPathRateLimitResponse,
  checkAiPathRateLimit,
} from '../../../../../../ai-path/lib/rate-limit.server'

export const runtime = 'nodejs'

type AdaptationRouteContext = { params: Promise<{ planId: string; adaptationId: string }> }

export async function PATCH(request: Request, context: AdaptationRouteContext) {
  const rate = await checkAiPathRateLimit(request, { tool: 'ai-path-plan-adaptation', limit: 30, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const planRuntime = await selectLearningPlanRequestRuntime(request)
  const { planId, adaptationId } = await context.params
  return applyLearningPlanRuntimeResponse(
    planRuntime,
    await handleLearningPlanAdaptationDecision(
      request,
      planId.trim(),
      adaptationId.trim(),
      planRuntime,
    ),
  )
}
