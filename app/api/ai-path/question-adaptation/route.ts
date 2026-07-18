import { handleAdaptiveQuestionPost } from '../../../ai-path/lib/adaptive-question-http'
import {
  createAdaptiveQuestionModelGenerator,
  getAdaptiveQuestionModelCapability,
} from '../../../ai-path/lib/constrained-question.server'
import {
  checkAiPathRateLimit,
} from '../../../ai-path/lib/rate-limit.server'
import {
  applyAssessmentRuntimeResponse,
  selectAssessmentRequestRuntime,
} from '../../../ai-path/lib/session-persistence.server'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function POST(request: Request) {
  const capability = getAdaptiveQuestionModelCapability()
  if (!capability.liveEnabled) return handleAdaptiveQuestionPost(request)

  const sessionRuntime = await selectAssessmentRequestRuntime(request)
  if (sessionRuntime.mode !== 'supabase' || !sessionRuntime.principal) {
    return handleAdaptiveQuestionPost(request)
  }
  const rate = await checkAiPathRateLimit(
    request,
    'ai-path-question-adaptation',
    sessionRuntime.principal.userId,
  )
  if (!rate.allowed) return handleAdaptiveQuestionPost(request)

  return applyAssessmentRuntimeResponse(
    sessionRuntime,
    await handleAdaptiveQuestionPost(request, {
      generate: createAdaptiveQuestionModelGenerator(),
    }),
  )
}
