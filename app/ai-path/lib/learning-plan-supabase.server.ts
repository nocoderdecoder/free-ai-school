import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json } from './database.types.ts'
import {
  parseSupabaseLearningPlanExport,
  SupabaseLearningPlanService,
  type LearningPlanGatewayError,
  type LearningPlanGatewayResult,
  type SupabaseLearningPlanGateway,
} from './learning-plan-supabase.ts'
import type { LearningPlanRecord, LearningPlanTaskStatus } from './learning-plan.ts'
import { isAiPathGoalType } from './goal-type.ts'

export const AI_PATH_SUPABASE_PLAN_SCHEMA_VERSION = '20260717050000' as const

// This reviewed literal is intentionally independent of deployment flags.
export const AI_PATH_SUPABASE_PLAN_GATEWAY_LATCH = false as const

function normalizedError(error: { code?: string; message: string } | null): LearningPlanGatewayError | null {
  return error ? { code: error.code, message: error.message } : null
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

function createSupabaseLearningPlanGateway(
  authenticatedClient: SupabaseClient<Database>,
  serviceRoleClient: SupabaseClient<Database>,
): SupabaseLearningPlanGateway {
  async function exportPlan(planId: string): Promise<LearningPlanGatewayResult<LearningPlanRecord>> {
    const { data, error } = await authenticatedClient.rpc('export_owned_ai_path_learning_plan', {
      p_plan_id: planId,
    })
    if (error) return { data: null, error: normalizedError(error) }
    if (data === null) return { data: null, error: null }
    try {
      return { data: parseSupabaseLearningPlanExport(data), error: null }
    } catch (parseError) {
      return {
        data: null,
        error: { message: parseError instanceof Error ? parseError.message : 'Malformed plan export.' },
      }
    }
  }

  async function mutateThenExport(
    mutation: PromiseLike<{ data: Json | null; error: { code?: string; message: string } | null }>,
    planId: string,
  ): Promise<LearningPlanGatewayResult<LearningPlanRecord>> {
    const { error } = await mutation
    if (error) return { data: null, error: normalizedError(error) }
    return exportPlan(planId)
  }

  return {
    async create(input) {
      const { data: planId, error } = await serviceRoleClient.rpc('create_ai_path_learning_plan', {
        p_owner_id: input.ownerId,
        p_source_assessment_session_id: input.assessmentSessionId,
        p_goal_type: input.goalType,
        p_weekly_minutes: input.weeklyMinutes,
        p_title: input.title,
        p_proof: input.proof,
        p_focus_now: input.focusNow,
        p_not_yet: input.notYet,
        p_tasks: asJson(input.tasks),
      })
      if (error) return { data: null, error: normalizedError(error) }
      if (typeof planId !== 'string') return { data: null, error: { message: 'Plan creation returned no identifier.' } }
      return exportPlan(planId)
    },
    async findOwnedAssessmentBinding(assessmentSessionId) {
      const { data, error } = await authenticatedClient
        .from('ai_path_assessment_sessions')
        .select('goal_type,status,report_saved_at')
        .eq('id', assessmentSessionId)
        .maybeSingle()
      if (error) return { data: null, error: normalizedError(error) }
      if (!data) return { data: null, error: null }
      if (!isAiPathGoalType(data.goal_type)) {
        return { data: null, error: { message: 'Stored assessment goal type is invalid.' } }
      }
      return {
        data: {
          goalType: data.goal_type,
          status: data.status,
          hasReport: data.report_saved_at !== null,
        },
        error: null,
      }
    },
    async findOwnedBySourceAssessment(assessmentSessionId) {
      const { data, error } = await authenticatedClient
        .from('ai_path_learning_plans')
        .select('id')
        .eq('source_assessment_session_id', assessmentSessionId)
        .maybeSingle()
      if (error) return { data: null, error: normalizedError(error) }
      return data?.id ? exportPlan(data.id) : { data: null, error: null }
    },
    findOwned: exportPlan,
    transitionTask(planId, taskId, status, expectedRevision) {
      return mutateThenExport(authenticatedClient.rpc('set_owned_ai_path_plan_task_progress', {
        p_plan_id: planId,
        p_task_id: taskId,
        p_next_status: status as LearningPlanTaskStatus,
        p_expected_revision: expectedRevision,
      }), planId)
    },
    adjustTimeBudget(planId, weeklyMinutes, reason, expectedRevision) {
      return mutateThenExport(authenticatedClient.rpc('adjust_owned_ai_path_plan_time_budget', {
        p_plan_id: planId,
        p_weekly_minutes: weeklyMinutes,
        p_reason: reason,
        p_expected_revision: expectedRevision,
      }), planId)
    },
    submitCheckIn(planId, weekNumber, text, expectedRevision) {
      return mutateThenExport(authenticatedClient.rpc('add_owned_ai_path_plan_check_in', {
        p_plan_id: planId,
        p_week_number: weekNumber,
        p_check_in_text: text,
        p_expected_revision: expectedRevision,
      }), planId)
    },
    decideAdaptation(planId, adaptationId, decision, expectedRevision) {
      return mutateThenExport(authenticatedClient.rpc('respond_to_owned_ai_path_plan_adaptation', {
        p_plan_id: planId,
        p_adaptation_id: adaptationId,
        p_decision: decision,
        p_expected_revision: expectedRevision,
      }), planId)
    },
    exportOwned: exportPlan,
    async deleteOwned(planId) {
      const { data, error } = await authenticatedClient.rpc('delete_owned_ai_path_learning_plan', {
        p_plan_id: planId,
      })
      return { data, error: normalizedError(error) }
    },
  }
}

export type SupabaseLearningPlanActivation = {
  enabled?: string
  schemaVersion?: string
  credentialScope?: string
}

export type SupabaseLearningPlanGatewayCapability = {
  available: boolean
  reason: string
}

export function resolveSupabaseLearningPlanGatewayCapability(
  activation: SupabaseLearningPlanActivation,
): SupabaseLearningPlanGatewayCapability {
  if (!AI_PATH_SUPABASE_PLAN_GATEWAY_LATCH) {
    return {
      available: false,
      reason: 'the reviewed durable learning-plan gateway latch remains closed',
    }
  }
  if (activation.enabled !== 'true') {
    return { available: false, reason: 'the durable learning-plan gateway is not explicitly enabled' }
  }
  if (activation.schemaVersion !== AI_PATH_SUPABASE_PLAN_SCHEMA_VERSION) {
    return {
      available: false,
      reason: `database migration ${AI_PATH_SUPABASE_PLAN_SCHEMA_VERSION} is not attested`,
    }
  }
  if (activation.credentialScope !== 'authenticated-user+service-role') {
    return {
      available: false,
      reason: 'the split authenticated-user and service-role credential boundary is not attested',
    }
  }
  return { available: true, reason: 'the durable learning-plan gateway is ready' }
}

export function createSupabaseLearningPlanService(
  authenticatedClient: SupabaseClient<Database>,
  serviceRoleClient: SupabaseClient<Database>,
  activation: SupabaseLearningPlanActivation,
) {
  const capability = resolveSupabaseLearningPlanGatewayCapability(activation)
  if (!capability.available) {
    throw new Error(`Durable learning-plan networking is disabled: ${capability.reason}.`)
  }
  return new SupabaseLearningPlanService(
    createSupabaseLearningPlanGateway(authenticatedClient, serviceRoleClient),
  )
}
