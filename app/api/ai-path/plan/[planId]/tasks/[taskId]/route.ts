import {
  handleLearningPlanTaskProgress,
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

type TaskRouteContext = { params: Promise<{ planId: string; taskId: string }> }

export async function PATCH(request: Request, context: TaskRouteContext) {
  const rate = await checkAiPathRateLimit(request, 'ai-path-plan-task')
  if (!rate.allowed) return aiPathRateLimitResponse(rate)
  const planRuntime = await selectLearningPlanRequestRuntime(request)
  const { planId, taskId } = await context.params
  return applyLearningPlanRuntimeResponse(
    planRuntime,
    await handleLearningPlanTaskProgress(request, planId.trim(), taskId.trim(), planRuntime),
  )
}
