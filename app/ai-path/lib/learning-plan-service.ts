import { randomUUID } from 'node:crypto'

import {
  type LearningPlanAdaptationOperation,
  type LearningPlanMutationResult,
  type LearningPlanPrincipal,
  type LearningPlanRecord,
  type LearningPlanService,
  type LearningPlanTaskStatus,
} from './learning-plan.ts'
import { getPlanBlueprint } from './plan.ts'
import { AI_PATH_GOAL_TYPES, type AiPathGoalType } from './goal-type.ts'
import type { AssessmentPrincipal, AssessmentSessionService } from './session-persistence.ts'

export { AI_PATH_GOAL_TYPES }
export type { AiPathGoalType }

export type CreateOwnedLearningPlanInput = {
  assessmentSessionId: string
  /** Compatibility hint only; persisted session binding remains authoritative. */
  goalType?: AiPathGoalType
  weeklyMinutes: number
}

export type CreateOwnedLearningPlanResult =
  | { ok: true; plan: LearningPlanRecord }
  | { ok: false; reason: 'assessment_not_found' | 'assessment_not_complete' | 'source_session_exists' | 'source_session_conflict' | 'goal_type_mismatch' }

export interface LearningPlanHttpService {
  createOwnedPlan(
    principal: AssessmentPrincipal,
    input: CreateOwnedLearningPlanInput,
  ): Promise<CreateOwnedLearningPlanResult>
  getOwnedPlan(principal: AssessmentPrincipal, planId: string): Promise<LearningPlanRecord | null>
  transitionTask(
    principal: AssessmentPrincipal,
    planId: string,
    taskId: string,
    status: LearningPlanTaskStatus,
    expectedRevision: number,
  ): Promise<LearningPlanMutationResult>
  adjustTimeBudget(
    principal: AssessmentPrincipal,
    planId: string,
    weeklyMinutes: number,
    reason: string,
    expectedRevision: number,
  ): Promise<LearningPlanMutationResult>
  submitWeeklyCheckIn(
    principal: AssessmentPrincipal,
    planId: string,
    weekNumber: number,
    text: string,
    expectedRevision: number,
  ): Promise<LearningPlanMutationResult>
  respondToAdaptation(
    principal: AssessmentPrincipal,
    planId: string,
    adaptationId: string,
    decision: 'approve' | 'reject',
    expectedRevision: number,
  ): Promise<LearningPlanMutationResult>
  exportOwnedPlan(principal: AssessmentPrincipal, planId: string): Promise<LearningPlanRecord | null>
  deleteOwnedPlan(principal: AssessmentPrincipal, planId: string): Promise<boolean>
}

function asPlanPrincipal(principal: AssessmentPrincipal): LearningPlanPrincipal {
  return { userId: principal.userId }
}

/**
 * Application boundary that binds plan creation to an owned, completed report.
 * Plan content is built from server-owned blueprints; the browser supplies only
 * a bounded goal selection and time budget.
 */
export class OwnedLearningPlanService implements LearningPlanHttpService {
  readonly #assessmentSessions: AssessmentSessionService
  readonly #plans: LearningPlanService
  readonly #taskIdFactory: () => string

  constructor(
    assessmentSessions: AssessmentSessionService,
    plans: LearningPlanService,
    taskIdFactory: () => string = randomUUID,
  ) {
    this.#assessmentSessions = assessmentSessions
    this.#plans = plans
    this.#taskIdFactory = taskIdFactory
  }

  async createOwnedPlan(
    principal: AssessmentPrincipal,
    input: CreateOwnedLearningPlanInput,
  ): Promise<CreateOwnedLearningPlanResult> {
    const assessment = await this.#assessmentSessions.getOwnedSession(principal, input.assessmentSessionId)
    if (!assessment) return { ok: false, reason: 'assessment_not_found' }
    if (assessment.status !== 'complete' || !assessment.report) {
      return { ok: false, reason: 'assessment_not_complete' }
    }

    if (input.goalType && input.goalType !== assessment.goalType) {
      return { ok: false, reason: 'goal_type_mismatch' }
    }
    const goalType = assessment.goalType
    const blueprint = getPlanBlueprint(goalType)
    const planPrincipal = asPlanPrincipal(principal)
    const existing = await this.#plans.getOwnedPlanBySourceAssessment(planPrincipal, assessment.id)
    if (existing) return this.#resumeExisting(existing, goalType, input.weeklyMinutes)
    const tasks = blueprint.weeks.flatMap((week, weekIndex) =>
      week.tasks.map((title, positionIndex) => ({
        id: this.#taskIdFactory(),
        ordinal: weekIndex * 3 + positionIndex + 1,
        week: weekIndex + 1,
        position: positionIndex + 1,
        title,
        outcome: week.outcome,
      })),
    )
    const created = await this.#plans.createOwnedPlan(planPrincipal, {
      sourceAssessmentSessionId: assessment.id,
      goalType,
      title: blueprint.title,
      proof: blueprint.proof,
      focusNow: blueprint.focusNow,
      notYet: blueprint.notYet,
      tasks,
      weeklyMinutes: input.weeklyMinutes,
    })
    if (!created.ok) {
      const raced = await this.#plans.getOwnedPlanBySourceAssessment(planPrincipal, assessment.id)
      return raced
        ? this.#resumeExisting(raced, goalType, input.weeklyMinutes)
        : { ok: false, reason: created.reason }
    }
    return created
  }

  #resumeExisting(
    plan: LearningPlanRecord,
    expectedGoalType: AiPathGoalType,
    expectedInitialMinutes: number,
  ): CreateOwnedLearningPlanResult {
    const initialMinutes = plan.timeBudgetHistory[0]?.fromMinutes ?? plan.weeklyMinutes
    if (plan.goalType !== expectedGoalType || initialMinutes !== expectedInitialMinutes) {
      return { ok: false, reason: 'source_session_conflict' }
    }
    return { ok: true, plan }
  }

  getOwnedPlan(principal: AssessmentPrincipal, planId: string) {
    return this.#plans.getOwnedPlan(asPlanPrincipal(principal), planId)
  }

  transitionTask(
    principal: AssessmentPrincipal,
    planId: string,
    taskId: string,
    status: LearningPlanTaskStatus,
    expectedRevision: number,
  ) {
    return this.#plans.transitionTask(asPlanPrincipal(principal), planId, taskId, status, expectedRevision)
  }

  adjustTimeBudget(
    principal: AssessmentPrincipal,
    planId: string,
    weeklyMinutes: number,
    reason: string,
    expectedRevision: number,
  ) {
    return this.#plans.adjustTimeBudget(
      asPlanPrincipal(principal),
      planId,
      weeklyMinutes,
      reason,
      expectedRevision,
    )
  }

  submitWeeklyCheckIn(
    principal: AssessmentPrincipal,
    planId: string,
    weekNumber: number,
    text: string,
    expectedRevision: number,
  ) {
    return this.#plans.submitWeeklyCheckIn(
      asPlanPrincipal(principal),
      planId,
      weekNumber,
      text,
      expectedRevision,
    )
  }

  respondToAdaptation(
    principal: AssessmentPrincipal,
    planId: string,
    adaptationId: string,
    decision: 'approve' | 'reject',
    expectedRevision: number,
  ) {
    return this.#plans.respondToAdaptation(
      asPlanPrincipal(principal),
      planId,
      adaptationId,
      decision,
      expectedRevision,
    )
  }

  exportOwnedPlan(principal: AssessmentPrincipal, planId: string) {
    return this.#plans.exportOwnedPlan(asPlanPrincipal(principal), planId)
  }

  deleteOwnedPlan(principal: AssessmentPrincipal, planId: string) {
    return this.#plans.deleteOwnedPlan(asPlanPrincipal(principal), planId)
  }

  /** Test/trusted-server seam; never expose proposal creation as a browser route. */
  proposeAdaptationForTest(
    principal: AssessmentPrincipal,
    planId: string,
    proposalText: string,
    operations: LearningPlanAdaptationOperation[],
    expectedRevision: number,
  ) {
    return this.#plans.proposeAdaptation(
      asPlanPrincipal(principal),
      planId,
      proposalText,
      operations,
      expectedRevision,
    )
  }
}
