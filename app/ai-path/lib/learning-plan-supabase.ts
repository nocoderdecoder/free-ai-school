import { randomUUID } from 'node:crypto'

import {
  AI_PATH_PLAN_VERSION,
  type LearningPlanAdaptation,
  type LearningPlanAdaptationOperation,
  type LearningPlanCheckIn,
  type LearningPlanMutationResult,
  type LearningPlanRecord,
  type LearningPlanSnapshot,
  type LearningPlanTask,
  type LearningPlanTaskProgress,
  type LearningPlanTaskStatus,
  type LearningPlanTimeBudgetChange,
} from './learning-plan.ts'
import { type CreateOwnedLearningPlanInput, type CreateOwnedLearningPlanResult, type LearningPlanHttpService } from './learning-plan-service.ts'
import { getPlanBlueprint } from './plan.ts'
import { isAiPathGoalType, type AiPathGoalType } from './goal-type.ts'
import type { AssessmentPrincipal } from './session-persistence.ts'

export type LearningPlanGatewayError = { code?: string; message: string }
export type LearningPlanGatewayResult<T> = { data: T | null; error: LearningPlanGatewayError | null }

export type DurablePlanCreateInput = {
  ownerId: string
  assessmentSessionId: string
  goalType: AiPathGoalType
  weeklyMinutes: number
  title: string
  proof: string
  focusNow: string
  notYet: string
  tasks: LearningPlanTask[]
}

export type DurableAssessmentPlanBinding = {
  goalType: AiPathGoalType
  status: string
  hasReport: boolean
}

export interface SupabaseLearningPlanGateway {
  create(input: DurablePlanCreateInput): Promise<LearningPlanGatewayResult<LearningPlanRecord>>
  findOwnedAssessmentBinding(assessmentSessionId: string): Promise<LearningPlanGatewayResult<DurableAssessmentPlanBinding>>
  findOwnedBySourceAssessment(assessmentSessionId: string): Promise<LearningPlanGatewayResult<LearningPlanRecord>>
  findOwned(planId: string): Promise<LearningPlanGatewayResult<LearningPlanRecord>>
  transitionTask(planId: string, taskId: string, status: LearningPlanTaskStatus, expectedRevision: number): Promise<LearningPlanGatewayResult<LearningPlanRecord>>
  adjustTimeBudget(planId: string, weeklyMinutes: number, reason: string, expectedRevision: number): Promise<LearningPlanGatewayResult<LearningPlanRecord>>
  submitCheckIn(planId: string, weekNumber: number, text: string, expectedRevision: number): Promise<LearningPlanGatewayResult<LearningPlanRecord>>
  decideAdaptation(planId: string, adaptationId: string, decision: 'approve' | 'reject', expectedRevision: number): Promise<LearningPlanGatewayResult<LearningPlanRecord>>
  exportOwned(planId: string): Promise<LearningPlanGatewayResult<LearningPlanRecord>>
  deleteOwned(planId: string): Promise<LearningPlanGatewayResult<boolean>>
}

export class SupabaseLearningPlanError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'SupabaseLearningPlanError'
    this.code = code
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function requirePrincipal(principal: AssessmentPrincipal) {
  if (principal.source !== 'supabase' || !uuidPattern.test(principal.userId)) {
    throw new SupabaseLearningPlanError('A verified Supabase principal is required.')
  }
}

function requireUuid(value: string, label: string) {
  if (!uuidPattern.test(value)) throw new SupabaseLearningPlanError(`${label} must be a UUID.`)
}

function mapGatewayFailure(
  error: LearningPlanGatewayError,
  uniqueConflictReason?: 'duplicate_check_in',
): LearningPlanMutationResult {
  if (error.code === 'P0002') return { ok: false, reason: 'not_found' }
  if (error.code === '40001') return { ok: false, reason: 'conflict' }
  if (error.code === '22023') return { ok: false, reason: 'invalid_transition' }
  if (error.code === '23505' && uniqueConflictReason) {
    return { ok: false, reason: uniqueConflictReason }
  }
  throw new SupabaseLearningPlanError('Durable learning-plan mutation failed.', error.code)
}

function requireGatewayData<T>(operation: string, result: LearningPlanGatewayResult<T>): T {
  if (result.error) throw new SupabaseLearningPlanError(`Durable learning-plan ${operation} failed.`, result.error.code)
  if (result.data === null) throw new SupabaseLearningPlanError(`Durable learning-plan ${operation} returned no result.`)
  return result.data
}

/** Dormant durable application adapter; construction is code-latch protected. */
export class SupabaseLearningPlanService implements LearningPlanHttpService {
  readonly #gateway: SupabaseLearningPlanGateway
  readonly #taskIdFactory: () => string

  constructor(gateway: SupabaseLearningPlanGateway, taskIdFactory: () => string = randomUUID) {
    this.#gateway = gateway
    this.#taskIdFactory = taskIdFactory
  }

  async createOwnedPlan(
    principal: AssessmentPrincipal,
    input: CreateOwnedLearningPlanInput,
  ): Promise<CreateOwnedLearningPlanResult> {
    requirePrincipal(principal)
    requireUuid(input.assessmentSessionId, 'assessmentSessionId')
    if (input.goalType !== undefined && !isAiPathGoalType(input.goalType)) {
      throw new SupabaseLearningPlanError('The learning-plan goal type is invalid.')
    }
    const binding = await this.#gateway.findOwnedAssessmentBinding(input.assessmentSessionId)
    if (binding.error) {
      throw new SupabaseLearningPlanError('Durable assessment binding lookup failed.', binding.error.code)
    }
    if (!binding.data) return { ok: false, reason: 'assessment_not_found' }
    if (binding.data.status !== 'complete' || !binding.data.hasReport) {
      return { ok: false, reason: 'assessment_not_complete' }
    }
    if (input.goalType && input.goalType !== binding.data.goalType) {
      return { ok: false, reason: 'goal_type_mismatch' }
    }
    const goalType = binding.data.goalType
    const blueprint = getPlanBlueprint(goalType)
    const resumed = await this.#gateway.findOwnedBySourceAssessment(input.assessmentSessionId)
    if (resumed.error) {
      throw new SupabaseLearningPlanError('Durable learning-plan resume lookup failed.', resumed.error.code)
    }
    if (resumed.data) return this.#resumeExisting(resumed.data, goalType, input.weeklyMinutes)
    const tasks = blueprint.weeks.flatMap((week, weekIndex) => week.tasks.map((title, positionIndex) => ({
      id: this.#taskIdFactory(),
      ordinal: weekIndex * 3 + positionIndex + 1,
      week: weekIndex + 1,
      position: positionIndex + 1,
      title,
      outcome: week.outcome,
    })))
    const result = await this.#gateway.create({
      ownerId: principal.userId,
      assessmentSessionId: input.assessmentSessionId,
      goalType,
      weeklyMinutes: input.weeklyMinutes,
      title: blueprint.title,
      proof: blueprint.proof,
      focusNow: blueprint.focusNow,
      notYet: blueprint.notYet,
      tasks,
    })
    if (result.error?.code === '42501') return { ok: false, reason: 'assessment_not_complete' }
    if (result.error?.code === '23505') {
      const raced = await this.#gateway.findOwnedBySourceAssessment(input.assessmentSessionId)
      if (raced.error || !raced.data) return { ok: false, reason: 'source_session_exists' }
      return this.#resumeExisting(raced.data, goalType, input.weeklyMinutes)
    }
    return { ok: true, plan: requireGatewayData('create', result) }
  }

  async getOwnedPlan(principal: AssessmentPrincipal, planId: string) {
    requirePrincipal(principal)
    requireUuid(planId, 'planId')
    const result = await this.#gateway.findOwned(planId)
    if (result.error) throw new SupabaseLearningPlanError('Durable learning-plan read failed.', result.error.code)
    return result.data
  }

  async transitionTask(
    principal: AssessmentPrincipal,
    planId: string,
    taskId: string,
    status: LearningPlanTaskStatus,
    expectedRevision: number,
  ) {
    requirePrincipal(principal)
    requireUuid(planId, 'planId')
    requireUuid(taskId, 'taskId')
    return this.#mutation(this.#gateway.transitionTask(planId, taskId, status, expectedRevision))
  }

  async adjustTimeBudget(
    principal: AssessmentPrincipal,
    planId: string,
    weeklyMinutes: number,
    reason: string,
    expectedRevision: number,
  ) {
    requirePrincipal(principal)
    requireUuid(planId, 'planId')
    return this.#mutation(this.#gateway.adjustTimeBudget(planId, weeklyMinutes, reason, expectedRevision))
  }

  async submitWeeklyCheckIn(
    principal: AssessmentPrincipal,
    planId: string,
    weekNumber: number,
    text: string,
    expectedRevision: number,
  ) {
    requirePrincipal(principal)
    requireUuid(planId, 'planId')
    return this.#mutation(
      this.#gateway.submitCheckIn(planId, weekNumber, text, expectedRevision),
      'duplicate_check_in',
    )
  }

  async respondToAdaptation(
    principal: AssessmentPrincipal,
    planId: string,
    adaptationId: string,
    decision: 'approve' | 'reject',
    expectedRevision: number,
  ) {
    requirePrincipal(principal)
    requireUuid(planId, 'planId')
    requireUuid(adaptationId, 'adaptationId')
    return this.#mutation(this.#gateway.decideAdaptation(
      planId, adaptationId, decision, expectedRevision,
    ))
  }

  async exportOwnedPlan(principal: AssessmentPrincipal, planId: string) {
    requirePrincipal(principal)
    requireUuid(planId, 'planId')
    const result = await this.#gateway.exportOwned(planId)
    if (result.error) throw new SupabaseLearningPlanError('Durable learning-plan export failed.', result.error.code)
    return result.data
  }

  async deleteOwnedPlan(principal: AssessmentPrincipal, planId: string) {
    requirePrincipal(principal)
    requireUuid(planId, 'planId')
    return requireGatewayData('delete', await this.#gateway.deleteOwned(planId))
  }

  async #mutation(
    resultPromise: Promise<LearningPlanGatewayResult<LearningPlanRecord>>,
    uniqueConflictReason?: 'duplicate_check_in',
  ): Promise<LearningPlanMutationResult> {
    const result = await resultPromise
    if (result.error) return mapGatewayFailure(result.error, uniqueConflictReason)
    if (!result.data) return { ok: false, reason: 'not_found' }
    return { ok: true, plan: result.data }
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
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(record: Record<string, unknown>, key: string) {
  const value = record[key]
  if (typeof value !== 'string') throw new SupabaseLearningPlanError(`Stored plan field ${key} is invalid.`)
  return value
}

function numberValue(record: Record<string, unknown>, key: string) {
  const value = record[key]
  if (!Number.isInteger(value)) throw new SupabaseLearningPlanError(`Stored plan field ${key} is invalid.`)
  return Number(value)
}

function arrayValue(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) throw new SupabaseLearningPlanError(`Stored plan field ${key} is invalid.`)
  return value
}

function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (!isObject(value)) throw new SupabaseLearningPlanError(`Stored ${label} is invalid.`)
  return value
}

function parseTask(value: unknown): LearningPlanTask {
  const task = recordValue(value, 'plan task')
  return {
    id: stringValue(task, 'id'),
    ordinal: numberValue(task, 'ordinal'),
    week: numberValue(task, 'week'),
    position: numberValue(task, 'position'),
    title: stringValue(task, 'title'),
    outcome: stringValue(task, 'outcome'),
  }
}

function parseSnapshot(value: unknown): LearningPlanSnapshot {
  const snapshot = recordValue(value, 'plan snapshot')
  const reason = stringValue(snapshot, 'reason')
  if (!['initial', 'adaptation', 'reassessment'].includes(reason)) {
    throw new SupabaseLearningPlanError('Stored plan snapshot reason is invalid.')
  }
  return {
    version: numberValue(snapshot, 'version'),
    reason: reason as LearningPlanSnapshot['reason'],
    sourceAssessmentSessionId: stringValue(snapshot, 'source_assessment_session_id'),
    title: stringValue(snapshot, 'title'),
    proof: stringValue(snapshot, 'proof'),
    focusNow: stringValue(snapshot, 'focus_now'),
    notYet: stringValue(snapshot, 'not_yet'),
    tasks: arrayValue(snapshot, 'tasks').map(parseTask),
    createdAt: stringValue(snapshot, 'created_at'),
  }
}

function parseProgress(value: unknown): LearningPlanTaskProgress {
  const progress = recordValue(value, 'task progress')
  const status = stringValue(progress, 'status')
  if (!['pending', 'in_progress', 'completed', 'skipped'].includes(status)) {
    throw new SupabaseLearningPlanError('Stored task status is invalid.')
  }
  return {
    taskId: stringValue(progress, 'task_id'),
    snapshotVersion: numberValue(progress, 'snapshot_version'),
    status: status as LearningPlanTaskStatus,
    updatedAt: stringValue(progress, 'updated_at'),
    completedAt: progress.completed_at === null ? null : stringValue(progress, 'completed_at'),
  }
}

function parseCheckIn(value: unknown): LearningPlanCheckIn {
  const checkIn = recordValue(value, 'check-in')
  return {
    id: stringValue(checkIn, 'id'),
    weekNumber: numberValue(checkIn, 'week_number'),
    text: stringValue(checkIn, 'check_in_text'),
    createdAt: stringValue(checkIn, 'created_at'),
  }
}

function parseOperation(value: unknown): LearningPlanAdaptationOperation {
  const operation = recordValue(value, 'adaptation operation')
  if (operation.type === 'adjust_time_budget') {
    return {
      type: 'adjust_time_budget',
      weeklyMinutes: numberValue(operation, 'weeklyMinutes'),
      reason: stringValue(operation, 'reason'),
    }
  }
  if (operation.type === 'swap_task') {
    return {
      type: 'swap_task',
      taskId: stringValue(operation, 'taskId'),
      title: stringValue(operation, 'title'),
      outcome: stringValue(operation, 'outcome'),
    }
  }
  throw new SupabaseLearningPlanError('Stored adaptation operation is invalid.')
}

function parseAdaptation(value: unknown): LearningPlanAdaptation {
  const adaptation = recordValue(value, 'adaptation')
  const status = stringValue(adaptation, 'status')
  if (!['proposed', 'approved', 'rejected', 'superseded'].includes(status)) {
    throw new SupabaseLearningPlanError('Stored adaptation status is invalid.')
  }
  return {
    id: stringValue(adaptation, 'id'),
    proposalText: stringValue(adaptation, 'proposal_text'),
    operations: arrayValue(adaptation, 'operations').map(parseOperation),
    status: status as LearningPlanAdaptation['status'],
    baseSnapshotVersion: numberValue(adaptation, 'base_snapshot_version'),
    createdAt: stringValue(adaptation, 'created_at'),
    decidedAt: adaptation.decided_at === null ? null : stringValue(adaptation, 'decided_at'),
  }
}

function parseBudgetChange(value: unknown): LearningPlanTimeBudgetChange {
  const change = recordValue(value, 'time-budget change')
  const source = stringValue(change, 'source')
  if (source !== 'user' && source !== 'adaptation') {
    throw new SupabaseLearningPlanError('Stored time-budget source is invalid.')
  }
  return {
    id: stringValue(change, 'id'),
    fromMinutes: numberValue(change, 'from_minutes'),
    toMinutes: numberValue(change, 'to_minutes'),
    reason: stringValue(change, 'reason'),
    source,
    createdAt: stringValue(change, 'created_at'),
  }
}

/** Fails closed on unsupported versions or malformed nested RPC exports. */
export function parseSupabaseLearningPlanExport(value: unknown): LearningPlanRecord {
  const plan = recordValue(value, 'learning plan')
  if (plan.plan_version !== AI_PATH_PLAN_VERSION) {
    throw new SupabaseLearningPlanError('Stored learning plan uses an unsupported version.')
  }
  const status = stringValue(plan, 'status')
  if (!['active', 'completed', 'archived'].includes(status)) {
    throw new SupabaseLearningPlanError('Stored learning-plan status is invalid.')
  }
  return {
    id: stringValue(plan, 'id'),
    ownerId: stringValue(plan, 'owner_id'),
    sourceAssessmentSessionId: stringValue(plan, 'source_assessment_session_id'),
    goalType: isAiPathGoalType(plan.goal_type)
      ? plan.goal_type
      : (() => { throw new SupabaseLearningPlanError('Stored learning-plan goal type is invalid.') })(),
    planVersion: AI_PATH_PLAN_VERSION,
    status: status as LearningPlanRecord['status'],
    revision: numberValue(plan, 'revision'),
    currentSnapshotVersion: numberValue(plan, 'current_snapshot_version'),
    weeklyMinutes: numberValue(plan, 'weekly_minutes'),
    snapshots: arrayValue(plan, 'snapshots').map(parseSnapshot),
    taskProgress: arrayValue(plan, 'taskProgress').map(parseProgress),
    checkIns: arrayValue(plan, 'checkIns').map(parseCheckIn),
    adaptations: arrayValue(plan, 'adaptations').map(parseAdaptation),
    timeBudgetHistory: arrayValue(plan, 'timeBudgetHistory').map(parseBudgetChange),
    createdAt: stringValue(plan, 'created_at'),
    updatedAt: stringValue(plan, 'updated_at'),
    retentionExpiresAt: stringValue(plan, 'retention_expires_at'),
  }
}
