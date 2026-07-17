export const AI_PATH_PLAN_VERSION = '2026-07-17.v1' as const
export const AI_PATH_PLAN_TASK_COUNT = 12 as const
export const AI_PATH_PLAN_RETENTION_DAYS = 90 as const

export type LearningPlanPrincipal = { userId: string }
export type LearningPlanStatus = 'active' | 'completed' | 'archived'
export type LearningPlanTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type LearningPlanSnapshotReason = 'initial' | 'adaptation' | 'reassessment'

export type LearningPlanTask = {
  id: string
  ordinal: number
  week: number
  position: number
  title: string
  outcome: string
}

export type LearningPlanSnapshot = {
  version: number
  reason: LearningPlanSnapshotReason
  sourceAssessmentSessionId: string
  title: string
  proof: string
  focusNow: string
  notYet: string
  tasks: LearningPlanTask[]
  createdAt: string
}

export type LearningPlanTaskProgress = {
  taskId: string
  snapshotVersion: number
  status: LearningPlanTaskStatus
  updatedAt: string
  completedAt: string | null
}

export type LearningPlanCheckIn = {
  id: string
  weekNumber: number
  text: string
  createdAt: string
}

export type LearningPlanTimeBudgetChange = {
  id: string
  fromMinutes: number
  toMinutes: number
  reason: string
  source: 'user' | 'adaptation'
  createdAt: string
}

export type LearningPlanAdaptationOperation =
  | { type: 'adjust_time_budget'; weeklyMinutes: number; reason: string }
  | { type: 'swap_task'; taskId: string; title: string; outcome: string }

export type LearningPlanAdaptation = {
  id: string
  proposalText: string
  operations: LearningPlanAdaptationOperation[]
  status: 'proposed' | 'approved' | 'rejected' | 'superseded'
  baseSnapshotVersion: number
  createdAt: string
  decidedAt: string | null
}

export type LearningPlanRecord = {
  id: string
  ownerId: string
  sourceAssessmentSessionId: string
  planVersion: typeof AI_PATH_PLAN_VERSION
  status: LearningPlanStatus
  revision: number
  currentSnapshotVersion: number
  weeklyMinutes: number
  snapshots: LearningPlanSnapshot[]
  taskProgress: LearningPlanTaskProgress[]
  checkIns: LearningPlanCheckIn[]
  adaptations: LearningPlanAdaptation[]
  timeBudgetHistory: LearningPlanTimeBudgetChange[]
  createdAt: string
  updatedAt: string
  retentionExpiresAt: string
}

export type LearningPlanSnapshotInput = Omit<
  LearningPlanSnapshot,
  'version' | 'reason' | 'createdAt'
>

export type CreateLearningPlanInput = LearningPlanSnapshotInput & {
  weeklyMinutes: number
}

export type LearningPlanMutationResult =
  | { ok: true; plan: LearningPlanRecord }
  | { ok: false; reason: 'not_found' | 'conflict' | 'plan_inactive' | 'invalid_transition' | 'duplicate_check_in' | 'stale_proposal' }

export class LearningPlanValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LearningPlanValidationError'
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function requireBoundedText(value: string, field: string, minimum: number, maximum: number) {
  const normalized = value.trim()
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new LearningPlanValidationError(`${field} must be ${minimum}-${maximum} characters`)
  }
  return normalized
}

export function validateWeeklyMinutes(value: number): number {
  if (!Number.isInteger(value) || value < 15 || value > 1200) {
    throw new LearningPlanValidationError('weeklyMinutes must be an integer from 15 to 1200')
  }
  return value
}

export function validateLearningPlanTasks(tasks: readonly LearningPlanTask[]): LearningPlanTask[] {
  if (tasks.length !== AI_PATH_PLAN_TASK_COUNT) {
    throw new LearningPlanValidationError(`a learning-plan snapshot must contain exactly ${AI_PATH_PLAN_TASK_COUNT} tasks`)
  }

  const ids = new Set<string>()
  const slots = new Set<string>()
  const ordinals = new Set<number>()
  const normalized = tasks.map((task) => {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(task.id)) {
      throw new LearningPlanValidationError('task ids must be opaque, bounded identifiers')
    }
    if (!Number.isInteger(task.ordinal) || task.ordinal < 1 || task.ordinal > 12) {
      throw new LearningPlanValidationError('task ordinals must be unique integers from 1 to 12')
    }
    if (!Number.isInteger(task.week) || task.week < 1 || task.week > 4) {
      throw new LearningPlanValidationError('task week must be an integer from 1 to 4')
    }
    if (!Number.isInteger(task.position) || task.position < 1 || task.position > 3) {
      throw new LearningPlanValidationError('task position must be an integer from 1 to 3')
    }
    const slot = `${task.week}:${task.position}`
    if (ids.has(task.id) || ordinals.has(task.ordinal) || slots.has(slot)) {
      throw new LearningPlanValidationError('task ids, ordinals, and week positions must be unique')
    }
    ids.add(task.id)
    ordinals.add(task.ordinal)
    slots.add(slot)
    return {
      ...task,
      title: requireBoundedText(task.title, 'task title', 3, 240),
      outcome: requireBoundedText(task.outcome, 'task outcome', 3, 500),
    }
  })

  for (let ordinal = 1; ordinal <= 12; ordinal += 1) {
    if (!ordinals.has(ordinal)) throw new LearningPlanValidationError('task ordinals must cover 1 through 12')
  }
  for (let week = 1; week <= 4; week += 1) {
    for (let position = 1; position <= 3; position += 1) {
      if (!slots.has(`${week}:${position}`)) {
        throw new LearningPlanValidationError('each of four weeks must contain three task positions')
      }
    }
  }
  return normalized.sort((left, right) => left.ordinal - right.ordinal)
}

function validateSnapshotInput(input: LearningPlanSnapshotInput) {
  return {
    sourceAssessmentSessionId: requireBoundedText(input.sourceAssessmentSessionId, 'assessment session id', 3, 128),
    title: requireBoundedText(input.title, 'title', 3, 500),
    proof: requireBoundedText(input.proof, 'proof', 3, 1200),
    focusNow: requireBoundedText(input.focusNow, 'focusNow', 3, 1200),
    notYet: requireBoundedText(input.notYet, 'notYet', 3, 1200),
    tasks: validateLearningPlanTasks(input.tasks),
  }
}

export interface LearningPlanRepository {
  create(plan: LearningPlanRecord): Promise<{ ok: true; plan: LearningPlanRecord } | { ok: false; reason: 'source_session_exists' }>
  findOwnedById(planId: string, ownerId: string): Promise<LearningPlanRecord | null>
  findOwnedBySourceAssessment(sourceAssessmentSessionId: string, ownerId: string): Promise<LearningPlanRecord | null>
  replaceOwned(plan: LearningPlanRecord, expectedRevision: number): Promise<'saved' | 'not_found' | 'conflict'>
  deleteOwnedById(planId: string, ownerId: string): Promise<boolean>
  listExpired(nowIso: string): Promise<LearningPlanRecord[]>
}

/** Deterministic process-local adapter for tests. It is not a production persistence layer. */
export class InMemoryLearningPlanRepository implements LearningPlanRepository {
  readonly #plans = new Map<string, LearningPlanRecord>()

  async create(plan: LearningPlanRecord) {
    for (const existing of this.#plans.values()) {
      if (
        existing.ownerId === plan.ownerId &&
        existing.sourceAssessmentSessionId === plan.sourceAssessmentSessionId
      ) {
        return { ok: false as const, reason: 'source_session_exists' as const }
      }
    }
    this.#plans.set(plan.id, clone(plan))
    return { ok: true as const, plan: clone(plan) }
  }

  async findOwnedById(planId: string, ownerId: string) {
    const plan = this.#plans.get(planId)
    return plan?.ownerId === ownerId ? clone(plan) : null
  }

  async findOwnedBySourceAssessment(sourceAssessmentSessionId: string, ownerId: string) {
    const plan = [...this.#plans.values()].find((candidate) =>
      candidate.ownerId === ownerId
      && candidate.sourceAssessmentSessionId === sourceAssessmentSessionId)
    return plan ? clone(plan) : null
  }

  async replaceOwned(plan: LearningPlanRecord, expectedRevision: number) {
    const current = this.#plans.get(plan.id)
    if (!current || current.ownerId !== plan.ownerId) return 'not_found' as const
    if (current.revision !== expectedRevision) return 'conflict' as const
    this.#plans.set(plan.id, clone(plan))
    return 'saved' as const
  }

  async deleteOwnedById(planId: string, ownerId: string) {
    const plan = this.#plans.get(planId)
    if (!plan || plan.ownerId !== ownerId) return false
    return this.#plans.delete(planId)
  }

  async listExpired(nowIso: string) {
    return [...this.#plans.values()]
      .filter((plan) => plan.retentionExpiresAt <= nowIso)
      .map(clone)
  }
}

type LearningPlanServiceOptions = {
  idFactory?: () => string
  now?: () => Date
}

const allowedTaskTransitions: Record<LearningPlanTaskStatus, ReadonlySet<LearningPlanTaskStatus>> = {
  pending: new Set(['in_progress', 'completed', 'skipped']),
  in_progress: new Set(['completed', 'skipped']),
  completed: new Set(),
  skipped: new Set(['pending']),
}

export class LearningPlanService {
  readonly #repository: LearningPlanRepository
  readonly #idFactory: () => string
  readonly #now: () => Date

  constructor(repository: LearningPlanRepository, options: LearningPlanServiceOptions = {}) {
    this.#repository = repository
    this.#idFactory = options.idFactory ?? (() => crypto.randomUUID())
    this.#now = options.now ?? (() => new Date())
  }

  async createOwnedPlan(principal: LearningPlanPrincipal, input: CreateLearningPlanInput) {
    const snapshotInput = validateSnapshotInput(input)
    const now = this.#now()
    const createdAt = now.toISOString()
    const snapshot: LearningPlanSnapshot = {
      ...snapshotInput,
      version: 1,
      reason: 'initial',
      createdAt,
    }
    const plan: LearningPlanRecord = {
      id: this.#idFactory(),
      ownerId: principal.userId,
      sourceAssessmentSessionId: snapshot.sourceAssessmentSessionId,
      planVersion: AI_PATH_PLAN_VERSION,
      status: 'active',
      revision: 1,
      currentSnapshotVersion: 1,
      weeklyMinutes: validateWeeklyMinutes(input.weeklyMinutes),
      snapshots: [snapshot],
      taskProgress: snapshot.tasks.map((task) => ({
        taskId: task.id,
        snapshotVersion: 1,
        status: 'pending',
        updatedAt: createdAt,
        completedAt: null,
      })),
      checkIns: [],
      adaptations: [],
      timeBudgetHistory: [],
      createdAt,
      updatedAt: createdAt,
      retentionExpiresAt: new Date(now.getTime() + AI_PATH_PLAN_RETENTION_DAYS * 86_400_000).toISOString(),
    }
    return this.#repository.create(plan)
  }

  getOwnedPlan(principal: LearningPlanPrincipal, planId: string) {
    return this.#repository.findOwnedById(planId, principal.userId)
  }

  getOwnedPlanBySourceAssessment(
    principal: LearningPlanPrincipal,
    sourceAssessmentSessionId: string,
  ) {
    return this.#repository.findOwnedBySourceAssessment(sourceAssessmentSessionId, principal.userId)
  }

  async transitionTask(
    principal: LearningPlanPrincipal,
    planId: string,
    taskId: string,
    nextStatus: LearningPlanTaskStatus,
    expectedRevision: number,
  ): Promise<LearningPlanMutationResult> {
    const plan = await this.#repository.findOwnedById(planId, principal.userId)
    if (!plan) return { ok: false, reason: 'not_found' }
    if (plan.status !== 'active') return { ok: false, reason: 'plan_inactive' }
    if (plan.revision !== expectedRevision) return { ok: false, reason: 'conflict' }
    const progress = plan.taskProgress.find(
      (candidate) => candidate.taskId === taskId && candidate.snapshotVersion === plan.currentSnapshotVersion,
    )
    if (!progress || !allowedTaskTransitions[progress.status].has(nextStatus)) {
      return { ok: false, reason: 'invalid_transition' }
    }
    const updatedAt = this.#now().toISOString()
    progress.status = nextStatus
    progress.updatedAt = updatedAt
    progress.completedAt = nextStatus === 'completed' ? updatedAt : null
    return this.#saveMutation(plan, expectedRevision, updatedAt)
  }

  async adjustTimeBudget(
    principal: LearningPlanPrincipal,
    planId: string,
    weeklyMinutes: number,
    reason: string,
    expectedRevision: number,
  ): Promise<LearningPlanMutationResult> {
    const plan = await this.#repository.findOwnedById(planId, principal.userId)
    if (!plan) return { ok: false, reason: 'not_found' }
    if (plan.status !== 'active') return { ok: false, reason: 'plan_inactive' }
    if (plan.revision !== expectedRevision) return { ok: false, reason: 'conflict' }
    const nextMinutes = validateWeeklyMinutes(weeklyMinutes)
    const normalizedReason = requireBoundedText(reason, 'time budget reason', 3, 500)
    const updatedAt = this.#now().toISOString()
    plan.timeBudgetHistory.push({
      id: this.#idFactory(),
      fromMinutes: plan.weeklyMinutes,
      toMinutes: nextMinutes,
      reason: normalizedReason,
      source: 'user',
      createdAt: updatedAt,
    })
    plan.weeklyMinutes = nextMinutes
    return this.#saveMutation(plan, expectedRevision, updatedAt)
  }

  async submitWeeklyCheckIn(
    principal: LearningPlanPrincipal,
    planId: string,
    weekNumber: number,
    text: string,
    expectedRevision: number,
  ): Promise<LearningPlanMutationResult> {
    const plan = await this.#repository.findOwnedById(planId, principal.userId)
    if (!plan) return { ok: false, reason: 'not_found' }
    if (plan.status !== 'active') return { ok: false, reason: 'plan_inactive' }
    if (plan.revision !== expectedRevision) return { ok: false, reason: 'conflict' }
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 52) {
      throw new LearningPlanValidationError('check-in weekNumber must be an integer from 1 to 52')
    }
    if (plan.checkIns.some((checkIn) => checkIn.weekNumber === weekNumber)) {
      return { ok: false, reason: 'duplicate_check_in' }
    }
    const updatedAt = this.#now().toISOString()
    plan.checkIns.push({
      id: this.#idFactory(),
      weekNumber,
      text: requireBoundedText(text, 'check-in text', 1, 2000),
      createdAt: updatedAt,
    })
    return this.#saveMutation(plan, expectedRevision, updatedAt)
  }

  async proposeAdaptation(
    principal: LearningPlanPrincipal,
    planId: string,
    proposalText: string,
    operations: LearningPlanAdaptationOperation[],
    expectedRevision: number,
  ): Promise<LearningPlanMutationResult> {
    const plan = await this.#repository.findOwnedById(planId, principal.userId)
    if (!plan) return { ok: false, reason: 'not_found' }
    if (plan.status !== 'active') return { ok: false, reason: 'plan_inactive' }
    if (plan.revision !== expectedRevision) return { ok: false, reason: 'conflict' }
    const normalizedOperations = this.#validateAdaptationOperations(plan, operations)
    const updatedAt = this.#now().toISOString()
    for (const pending of plan.adaptations.filter((item) => item.status === 'proposed')) {
      pending.status = 'superseded'
      pending.decidedAt = updatedAt
    }
    plan.adaptations.push({
      id: this.#idFactory(),
      proposalText: requireBoundedText(proposalText, 'proposal text', 3, 1200),
      operations: normalizedOperations,
      status: 'proposed',
      baseSnapshotVersion: plan.currentSnapshotVersion,
      createdAt: updatedAt,
      decidedAt: null,
    })
    return this.#saveMutation(plan, expectedRevision, updatedAt)
  }

  async respondToAdaptation(
    principal: LearningPlanPrincipal,
    planId: string,
    adaptationId: string,
    decision: 'approve' | 'reject',
    expectedRevision: number,
  ): Promise<LearningPlanMutationResult> {
    const plan = await this.#repository.findOwnedById(planId, principal.userId)
    if (!plan) return { ok: false, reason: 'not_found' }
    if (plan.status !== 'active') return { ok: false, reason: 'plan_inactive' }
    if (plan.revision !== expectedRevision) return { ok: false, reason: 'conflict' }
    const adaptation = plan.adaptations.find((item) => item.id === adaptationId)
    if (
      !adaptation ||
      adaptation.status !== 'proposed' ||
      adaptation.baseSnapshotVersion !== plan.currentSnapshotVersion
    ) {
      return { ok: false, reason: 'stale_proposal' }
    }
    const updatedAt = this.#now().toISOString()
    adaptation.status = decision === 'approve' ? 'approved' : 'rejected'
    adaptation.decidedAt = updatedAt
    if (decision === 'approve') this.#applyAdaptation(plan, adaptation, updatedAt)
    return this.#saveMutation(plan, expectedRevision, updatedAt)
  }

  async addReassessmentSnapshot(
    principal: LearningPlanPrincipal,
    planId: string,
    input: LearningPlanSnapshotInput,
    expectedRevision: number,
  ): Promise<LearningPlanMutationResult> {
    const plan = await this.#repository.findOwnedById(planId, principal.userId)
    if (!plan) return { ok: false, reason: 'not_found' }
    if (plan.status !== 'active') return { ok: false, reason: 'plan_inactive' }
    if (plan.revision !== expectedRevision) return { ok: false, reason: 'conflict' }
    if (input.sourceAssessmentSessionId === plan.sourceAssessmentSessionId) {
      throw new LearningPlanValidationError('a reassessment snapshot must reference a new assessment session')
    }
    const normalized = validateSnapshotInput(input)
    const updatedAt = this.#now().toISOString()
    const nextVersion = plan.currentSnapshotVersion + 1
    plan.snapshots.push({ ...normalized, version: nextVersion, reason: 'reassessment', createdAt: updatedAt })
    plan.currentSnapshotVersion = nextVersion
    plan.taskProgress.push(...normalized.tasks.map((task) => ({
      taskId: task.id,
      snapshotVersion: nextVersion,
      status: 'pending' as const,
      updatedAt,
      completedAt: null,
    })))
    for (const pending of plan.adaptations.filter((item) => item.status === 'proposed')) {
      pending.status = 'superseded'
      pending.decidedAt = updatedAt
    }
    return this.#saveMutation(plan, expectedRevision, updatedAt)
  }

  exportOwnedPlan(principal: LearningPlanPrincipal, planId: string) {
    return this.#repository.findOwnedById(planId, principal.userId)
  }

  deleteOwnedPlan(principal: LearningPlanPrincipal, planId: string) {
    return this.#repository.deleteOwnedById(planId, principal.userId)
  }

  async purgeExpiredPlans(): Promise<number> {
    const expired = await this.#repository.listExpired(this.#now().toISOString())
    let deleted = 0
    for (const plan of expired) {
      if (await this.#repository.deleteOwnedById(plan.id, plan.ownerId)) deleted += 1
    }
    return deleted
  }

  async #saveMutation(plan: LearningPlanRecord, expectedRevision: number, updatedAt: string): Promise<LearningPlanMutationResult> {
    plan.revision = expectedRevision + 1
    plan.updatedAt = updatedAt
    const result = await this.#repository.replaceOwned(plan, expectedRevision)
    if (result === 'not_found') return { ok: false, reason: 'not_found' }
    if (result === 'conflict') return { ok: false, reason: 'conflict' }
    return { ok: true, plan: clone(plan) }
  }

  #validateAdaptationOperations(
    plan: LearningPlanRecord,
    operations: LearningPlanAdaptationOperation[],
  ): LearningPlanAdaptationOperation[] {
    if (operations.length < 1 || operations.length > 4) {
      throw new LearningPlanValidationError('an adaptation must contain one to four bounded operations')
    }
    const swaps = operations.filter((operation) => operation.type === 'swap_task')
    const budgets = operations.filter((operation) => operation.type === 'adjust_time_budget')
    if (swaps.length > 3 || budgets.length > 1) {
      throw new LearningPlanValidationError('an adaptation may swap at most three tasks and adjust time once')
    }
    const currentSnapshot = plan.snapshots.find((snapshot) => snapshot.version === plan.currentSnapshotVersion)
    if (!currentSnapshot) throw new LearningPlanValidationError('current snapshot is missing')
    const seenTasks = new Set<string>()
    return operations.map((operation) => {
      if (operation.type === 'adjust_time_budget') {
        return {
          type: 'adjust_time_budget' as const,
          weeklyMinutes: validateWeeklyMinutes(operation.weeklyMinutes),
          reason: requireBoundedText(operation.reason, 'adaptation budget reason', 3, 500),
        }
      }
      if (seenTasks.has(operation.taskId)) {
        throw new LearningPlanValidationError('an adaptation cannot swap the same task twice')
      }
      seenTasks.add(operation.taskId)
      const progress = plan.taskProgress.find(
        (item) => item.taskId === operation.taskId && item.snapshotVersion === plan.currentSnapshotVersion,
      )
      if (!currentSnapshot.tasks.some((task) => task.id === operation.taskId) || progress?.status === 'completed') {
        throw new LearningPlanValidationError('adaptations may only swap incomplete current-snapshot tasks')
      }
      return {
        type: 'swap_task' as const,
        taskId: operation.taskId,
        title: requireBoundedText(operation.title, 'replacement task title', 3, 240),
        outcome: requireBoundedText(operation.outcome, 'replacement task outcome', 3, 500),
      }
    })
  }

  #applyAdaptation(plan: LearningPlanRecord, adaptation: LearningPlanAdaptation, updatedAt: string) {
    const current = plan.snapshots.find((snapshot) => snapshot.version === plan.currentSnapshotVersion)
    if (!current) throw new LearningPlanValidationError('current snapshot is missing')
    const nextVersion = plan.currentSnapshotVersion + 1
    const nextTasks = current.tasks.map((task) => {
      const swap = adaptation.operations.find(
        (operation): operation is Extract<LearningPlanAdaptationOperation, { type: 'swap_task' }> =>
          operation.type === 'swap_task' && operation.taskId === task.id,
      )
      return swap ? { ...task, id: this.#idFactory(), title: swap.title, outcome: swap.outcome } : clone(task)
    })
    plan.snapshots.push({
      ...clone(current),
      version: nextVersion,
      reason: 'adaptation',
      tasks: nextTasks,
      createdAt: updatedAt,
    })
    const previousProgress = new Map(
      plan.taskProgress
        .filter((item) => item.snapshotVersion === plan.currentSnapshotVersion)
        .map((item) => [item.taskId, item]),
    )
    plan.taskProgress.push(...nextTasks.map((task) => {
      const carried = previousProgress.get(task.id)
      return {
        taskId: task.id,
        snapshotVersion: nextVersion,
        status: carried?.status ?? 'pending',
        updatedAt,
        completedAt: carried?.completedAt ?? null,
      }
    }))
    plan.currentSnapshotVersion = nextVersion
    for (const operation of adaptation.operations) {
      if (operation.type !== 'adjust_time_budget') continue
      plan.timeBudgetHistory.push({
        id: this.#idFactory(),
        fromMinutes: plan.weeklyMinutes,
        toMinutes: operation.weeklyMinutes,
        reason: operation.reason,
        source: 'adaptation',
        createdAt: updatedAt,
      })
      plan.weeklyMinutes = operation.weeklyMinutes
    }
  }
}
