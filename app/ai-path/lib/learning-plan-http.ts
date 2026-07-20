import { LearningPlanValidationError, type LearningPlanMutationResult, type LearningPlanRecord } from './learning-plan.ts'
import type { LearningPlanRequestRuntime } from './learning-plan-runtime.ts'
import { AI_PATH_GOAL_TYPES, type AiPathGoalType } from './learning-plan-service.ts'
import { readBoundedJson } from './request-body.ts'

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireRuntime(runtime: LearningPlanRequestRuntime): Response | null {
  if (!runtime.capability.available || !runtime.service) {
    return json({
      error: 'learning_plan_persistence_unavailable',
      productionReady: false,
    }, 503)
  }
  if (!runtime.principal) return json({ error: 'authentication_required' }, 401)
  return null
}

function sameOriginMutation(request: Request, runtime: LearningPlanRequestRuntime): Response | null {
  if (runtime.mode !== 'supabase') return null
  const origin = request.headers.get('origin')
  if (!origin) return json({ error: 'origin_required' }, 403)
  try {
    if (new URL(origin).origin === new URL(request.url).origin) return null
  } catch {
    // Use the same non-disclosing response for malformed and foreign origins.
  }
  return json({ error: 'cross_origin_request_rejected' }, 403)
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const localIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

function validId(value: string, runtime: LearningPlanRequestRuntime) {
  return runtime.mode === 'supabase' ? uuidPattern.test(value) : localIdPattern.test(value)
}

function expectedRevision(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 2_147_483_647
    ? Number(value)
    : null
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number | null {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : null
}

function boundedText(value: unknown, minimum: number, maximum: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length >= minimum && normalized.length <= maximum ? normalized : null
}

function presentPlan(plan: LearningPlanRecord) {
  return {
    id: plan.id,
    sourceAssessmentSessionId: plan.sourceAssessmentSessionId,
    goalType: plan.goalType,
    planVersion: plan.planVersion,
    status: plan.status,
    revision: plan.revision,
    currentSnapshotVersion: plan.currentSnapshotVersion,
    weeklyMinutes: plan.weeklyMinutes,
    snapshots: plan.snapshots,
    taskProgress: plan.taskProgress,
    checkIns: plan.checkIns,
    adaptations: plan.adaptations,
    timeBudgetHistory: plan.timeBudgetHistory,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    retentionExpiresAt: plan.retentionExpiresAt,
  }
}

function mutationResponse(result: LearningPlanMutationResult): Response {
  if (result.ok) return json({ plan: presentPlan(result.plan), owned: true })
  if (result.reason === 'not_found') return json({ error: 'learning_plan_not_found' }, 404)
  return json({ error: result.reason }, 409)
}

async function readMutationBody(
  request: Request,
  maximumBytes = 8_192,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: Response }> {
  const result = await readBoundedJson(request, maximumBytes)
  if (!result.ok) return { ok: false, response: json({ error: result.error }, result.status) }
  if (!isRecord(result.value)) return { ok: false, response: json({ error: 'invalid_body' }, 400) }
  return { ok: true, body: result.value }
}

export async function handleLearningPlanCreate(
  request: Request,
  runtime: LearningPlanRequestRuntime,
): Promise<Response> {
  const originError = sameOriginMutation(request, runtime)
  if (originError) return originError
  const unavailable = requireRuntime(runtime)
  if (unavailable) return unavailable
  const bodyResult = await readMutationBody(request)
  if (!bodyResult.ok) return bodyResult.response
  const body = bodyResult.body
  const assessmentSessionId = boundedText(body.assessmentSessionId, 1, 128)
  const weeklyMinutes = boundedInteger(body.weeklyMinutes, 15, 1200)
  const goalType = body.goalType === undefined
    ? undefined
    : typeof body.goalType === 'string' && AI_PATH_GOAL_TYPES.includes(body.goalType as AiPathGoalType)
      ? body.goalType as AiPathGoalType
      : null
  if (!assessmentSessionId || !validId(assessmentSessionId, runtime) || weeklyMinutes === null || goalType === null) {
    return json({ error: 'invalid_learning_plan' }, 400)
  }
  try {
    const created = await runtime.service!.createOwnedPlan(runtime.principal!, {
      assessmentSessionId,
      goalType,
      weeklyMinutes,
    })
    if (!created.ok) {
      if (created.reason === 'assessment_not_found') return json({ error: created.reason }, 404)
      return json({ error: created.reason }, 409)
    }
    return json({
      plan: presentPlan(created.plan),
      owned: true,
      persistence: runtime.capability.persistence,
      productionReady: runtime.capability.productionReady,
    }, 201)
  } catch (error) {
    if (error instanceof LearningPlanValidationError) return json({ error: 'invalid_learning_plan' }, 400)
    throw error
  }
}

export async function handleLearningPlanGet(
  planId: string,
  runtime: LearningPlanRequestRuntime,
): Promise<Response> {
  const unavailable = requireRuntime(runtime)
  if (unavailable) return unavailable
  if (!validId(planId, runtime)) return json({ error: 'invalid_learning_plan_id' }, 400)
  const plan = await runtime.service!.getOwnedPlan(runtime.principal!, planId)
  if (!plan) return json({ error: 'learning_plan_not_found' }, 404)
  return json({ plan: presentPlan(plan), owned: true, persistence: runtime.capability.persistence })
}

export async function handleLearningPlanExport(
  planId: string,
  runtime: LearningPlanRequestRuntime,
): Promise<Response> {
  const unavailable = requireRuntime(runtime)
  if (unavailable) return unavailable
  if (!validId(planId, runtime)) return json({ error: 'invalid_learning_plan_id' }, 400)
  const plan = await runtime.service!.exportOwnedPlan(runtime.principal!, planId)
  if (!plan) return json({ error: 'learning_plan_not_found' }, 404)
  return json({
    exportedAt: new Date().toISOString(),
    persistence: runtime.capability.persistence,
    plan: presentPlan(plan),
  })
}

export async function handleLearningPlanDelete(
  request: Request,
  planId: string,
  runtime: LearningPlanRequestRuntime,
): Promise<Response> {
  const originError = sameOriginMutation(request, runtime)
  if (originError) return originError
  const unavailable = requireRuntime(runtime)
  if (unavailable) return unavailable
  if (!validId(planId, runtime)) return json({ error: 'invalid_learning_plan_id' }, 400)
  const deleted = await runtime.service!.deleteOwnedPlan(runtime.principal!, planId)
  return deleted
    ? json({ deleted: true, planId })
    : json({ error: 'learning_plan_not_found' }, 404)
}

export async function handleLearningPlanTaskProgress(
  request: Request,
  planId: string,
  taskId: string,
  runtime: LearningPlanRequestRuntime,
): Promise<Response> {
  const originError = sameOriginMutation(request, runtime)
  if (originError) return originError
  const unavailable = requireRuntime(runtime)
  if (unavailable) return unavailable
  if (!validId(planId, runtime) || !validId(taskId, runtime)) return json({ error: 'invalid_identifier' }, 400)
  const bodyResult = await readMutationBody(request, 2_048)
  if (!bodyResult.ok) return bodyResult.response
  const revision = expectedRevision(bodyResult.body.expectedRevision)
  const status = bodyResult.body.status
  if (revision === null || !['in_progress', 'completed', 'skipped', 'pending'].includes(String(status))) {
    return json({ error: 'invalid_task_progress' }, 400)
  }
  return mutationResponse(await runtime.service!.transitionTask(
    runtime.principal!,
    planId,
    taskId,
    status as 'pending' | 'in_progress' | 'completed' | 'skipped',
    revision,
  ))
}

export async function handleLearningPlanTimeBudget(
  request: Request,
  planId: string,
  runtime: LearningPlanRequestRuntime,
): Promise<Response> {
  const originError = sameOriginMutation(request, runtime)
  if (originError) return originError
  const unavailable = requireRuntime(runtime)
  if (unavailable) return unavailable
  if (!validId(planId, runtime)) return json({ error: 'invalid_learning_plan_id' }, 400)
  const bodyResult = await readMutationBody(request, 2_048)
  if (!bodyResult.ok) return bodyResult.response
  const revision = expectedRevision(bodyResult.body.expectedRevision)
  const weeklyMinutes = boundedInteger(bodyResult.body.weeklyMinutes, 15, 1200)
  const reason = boundedText(bodyResult.body.reason, 3, 500)
  if (revision === null || weeklyMinutes === null || !reason) return json({ error: 'invalid_time_budget' }, 400)
  try {
    return mutationResponse(await runtime.service!.adjustTimeBudget(
      runtime.principal!, planId, weeklyMinutes, reason, revision,
    ))
  } catch (error) {
    if (error instanceof LearningPlanValidationError) return json({ error: 'invalid_time_budget' }, 400)
    throw error
  }
}

export async function handleLearningPlanCheckIn(
  request: Request,
  planId: string,
  runtime: LearningPlanRequestRuntime,
): Promise<Response> {
  const originError = sameOriginMutation(request, runtime)
  if (originError) return originError
  const unavailable = requireRuntime(runtime)
  if (unavailable) return unavailable
  if (!validId(planId, runtime)) return json({ error: 'invalid_learning_plan_id' }, 400)
  const bodyResult = await readMutationBody(request, 4_096)
  if (!bodyResult.ok) return bodyResult.response
  const revision = expectedRevision(bodyResult.body.expectedRevision)
  const weekNumber = boundedInteger(bodyResult.body.weekNumber, 1, 52)
  const text = boundedText(bodyResult.body.text, 1, 2000)
  if (revision === null || weekNumber === null || !text) return json({ error: 'invalid_check_in' }, 400)
  try {
    return mutationResponse(await runtime.service!.submitWeeklyCheckIn(
      runtime.principal!, planId, weekNumber, text, revision,
    ))
  } catch (error) {
    if (error instanceof LearningPlanValidationError) return json({ error: 'invalid_check_in' }, 400)
    throw error
  }
}

export async function handleLearningPlanAdaptationDecision(
  request: Request,
  planId: string,
  adaptationId: string,
  runtime: LearningPlanRequestRuntime,
): Promise<Response> {
  const originError = sameOriginMutation(request, runtime)
  if (originError) return originError
  const unavailable = requireRuntime(runtime)
  if (unavailable) return unavailable
  if (!validId(planId, runtime) || !validId(adaptationId, runtime)) return json({ error: 'invalid_identifier' }, 400)
  const bodyResult = await readMutationBody(request, 2_048)
  if (!bodyResult.ok) return bodyResult.response
  const revision = expectedRevision(bodyResult.body.expectedRevision)
  const decision = bodyResult.body.decision
  if (revision === null || (decision !== 'approve' && decision !== 'reject')) {
    return json({ error: 'invalid_adaptation_decision' }, 400)
  }
  return mutationResponse(await runtime.service!.respondToAdaptation(
    runtime.principal!, planId, adaptationId, decision, revision,
  ))
}
