import {
  handleLearningPlanExport,
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

export async function GET(request: Request, context: PlanRouteContext) {
  const rate = await checkAiPathRateLimit(request, 'ai-path-plan-export')
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const planRuntime = await selectLearningPlanRequestRuntime(request)
  const { planId } = await context.params
  return applyLearningPlanRuntimeResponse(
    planRuntime,
    await handleLearningPlanExport(planId.trim(), planRuntime),
  )
}
