import type { AssessmentReport, SkillId, SkillResult } from './foundation.ts'
import { isAiPathGoalType, type AiPathGoalType } from './goal-type.ts'
import { getPlanBlueprint, type PlanWeek } from './plan.ts'

export const AI_PATH_PLAN_COMPOSER_VERSION = '2026-07-17.v1' as const

export type PlanPace = 'minimum' | 'steady' | 'accelerated'
export type PlanCodingMode = 'no-code' | 'light-code' | 'code-ready'
export type PlanRoleCategory = 'individual-contributor' | 'builder' | 'leader' | 'career-transition' | 'learner'
export type PlanBlockerCategory = 'time' | 'momentum' | 'clarity' | 'access' | 'confidence' | 'other'

export type PersonalizedPlanReason = Readonly<{
  id: 'pace' | 'coding' | 'role' | 'blocker' | 'skill-evidence' | 'unassessed-evidence' | 'resources'
  detail: string
}>

export type PersonalizedPlan = Readonly<{
  version: typeof AI_PATH_PLAN_COMPOSER_VERSION
  goalType: AiPathGoalType
  title: string
  proof: string
  focusNow: string
  notYet: string
  firstTask: string
  weeks: readonly Readonly<PlanWeek>[]
  profile: Readonly<{
    pace: PlanPace
    codingMode: PlanCodingMode
    roleCategory: PlanRoleCategory
    blockerCategory: PlanBlockerCategory
  }>
  prioritySkillIds: readonly SkillId[]
  unassessedSkillIds: readonly SkillId[]
  governedResourceIds: readonly string[]
  reasons: readonly PersonalizedPlanReason[]
}>

export type ComposePersonalizedPlanInput = Readonly<{
  goalType: AiPathGoalType
  weeklyHours: number
  codingComfort: string
  role: string
  blocker: string
  results: readonly SkillResult[]
  growthAreas?: readonly SkillId[]
  recommendations?: AssessmentReport['recommendations']
}>

const goalSkillPriority: Record<AiPathGoalType, readonly SkillId[]> = {
  workflows: ['workflow-design', 'evaluation-reliability', 'prompt-context', 'data-retrieval'],
  builder: ['coding-apis', 'evaluation-reliability', 'agents-tools', 'deployment-operations'],
  career: ['workflow-design', 'coding-apis', 'evaluation-reliability', 'foundations'],
  leader: ['workflow-design', 'evaluation-reliability', 'safety-governance', 'deployment-operations'],
  foundations: ['foundations', 'prompt-context', 'evaluation-reliability', 'safety-governance'],
  unsure: ['foundations', 'workflow-design', 'prompt-context', 'evaluation-reliability'],
}

const skillFocus: Record<SkillId, string> = {
  foundations: 'Build a correct mental model through one controlled comparison.',
  'prompt-context': 'Practice explicit instructions, context boundaries, and structured outputs.',
  'workflow-design': 'Map inputs, decisions, handoffs, and a human review point.',
  'data-retrieval': 'Preserve sources and verify every retrieved claim.',
  'coding-apis': 'Keep the integration to one bounded input, validated output, and failure path.',
  'agents-tools': 'Use one permissioned tool and make every side effect reviewable.',
  'evaluation-reliability': 'Create representative examples and a small quality rubric before expanding scope.',
  'deployment-operations': 'Add authentication, cost bounds, monitoring, and rollback to the smallest useful slice.',
  'safety-governance': 'Define data, permission, human-review, and escalation boundaries before automation.',
}

const fixedAdjustments = {
  minimumPace: [
    'Timebox one 45-minute session and finish the smallest inspectable slice',
    'Use one realistic example and record only the highest-impact failure',
    'Share the smallest safe artifact and choose one next action',
  ],
  noCode: 'Use a no-code or manual prototype before adding an API or custom application.',
  lightCode: 'Start with a visual workflow, then add one small script or API only where it removes a proven bottleneck.',
  codeReady: 'Use one server-side integration with validated input, structured output, and a bounded failure path.',
  time: 'Protect one recurring calendar block and stop when the week’s inspectable outcome exists.',
  momentum: 'End every week with a visible artifact or decision that can be shown to another person.',
  clarity: 'Write the expected output and acceptance criteria before choosing a tool or lesson.',
  access: 'Keep a tool-free or free-tier fallback for every planned exercise.',
  confidence: 'Begin with a reversible example and compare it with a simple checklist before increasing difficulty.',
  other: 'Keep the first experiment reversible and record the constraint that affected it.',
} as const

const rolePractice: Record<PlanRoleCategory, string> = {
  'individual-contributor': 'Prepare a handoff that another colleague can follow without hidden context.',
  builder: 'Add one automated regression check and record the expected failure behavior.',
  leader: 'Write a decision memo covering value, ownership, risk, and the human-review boundary.',
  'career-transition': 'Turn the artifact into a role-relevant case study with decisions, evidence, and limitations.',
  learner: 'Explain the artifact, one failure, and one lesson in plain language to another person.',
}

function classifyPace(hours: number): PlanPace {
  if (hours <= 1) return 'minimum'
  if (hours >= 6) return 'accelerated'
  return 'steady'
}

function classifyCoding(value: string): PlanCodingMode {
  if (/\b(?:no[- ]?code|avoid code|non[- ]?technical|without code)\b/i.test(value)) return 'no-code'
  if (/\b(?:comfortable|advanced|developer|engineer|python|javascript|typescript|code-first)\b/i.test(value)) return 'code-ready'
  return 'light-code'
}

function classifyRole(value: string): PlanRoleCategory {
  if (/\b(?:lead|leader|manager|director|head|executive|founder|vp)\b/i.test(value)) return 'leader'
  if (/\b(?:engineer|developer|builder|technical|data scientist|architect)\b/i.test(value)) return 'builder'
  if (/\b(?:career|student|job seeker|transition|switch)\b/i.test(value)) return 'career-transition'
  if (/\b(?:learn|beginner|explor)\b/i.test(value)) return 'learner'
  return 'individual-contributor'
}

function classifyBlocker(value: string): PlanBlockerCategory {
  if (/\b(?:access|budget|cost|paid|permission|tool|free[- ]?tier)\b/i.test(value)) return 'access'
  if (/\b(?:time|calendar|busy|hours?|schedule|deadline)\b/i.test(value)) return 'time'
  if (/\b(?:momentum|finish|follow through|abandon|start courses|lose|consisten)\b/i.test(value)) return 'momentum'
  if (/\b(?:unclear|clarity|where to start|what to learn|overwhelm|too many)\b/i.test(value)) return 'clarity'
  if (/\b(?:confidence|afraid|fear|intimidat|not technical)\b/i.test(value)) return 'confidence'
  return 'other'
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  return Object.freeze(value)
}

function validInput(input: ComposePersonalizedPlanInput) {
  return isAiPathGoalType(input.goalType)
    && Number.isInteger(input.weeklyHours) && input.weeklyHours >= 1 && input.weeklyHours <= 20
    && typeof input.codingComfort === 'string' && input.codingComfort.length <= 200
    && typeof input.role === 'string' && input.role.length <= 200
    && typeof input.blocker === 'string' && input.blocker.length <= 600
    && Array.isArray(input.results)
    && input.results.every(result => (
      Boolean(result)
      && typeof result === 'object'
      && typeof result.skillId === 'string'
      && (result.status === 'assessed' || result.status === 'not_assessed')
      && (result.level === null || (Number.isInteger(result.level) && result.level >= 0 && result.level <= 4))
    ))
    && (input.growthAreas === undefined || (
      Array.isArray(input.growthAreas)
      && input.growthAreas.every(skillId => typeof skillId === 'string')
    ))
    && (input.recommendations === undefined || (
      Array.isArray(input.recommendations)
      && input.recommendations.every(resource => Boolean(resource) && typeof resource === 'object' && typeof resource.id === 'string')
    ))
}

function choosePrioritySkills(input: ComposePersonalizedPlanInput): SkillId[] {
  const byId = new Map(input.results.map(result => [result.skillId, result]))
  const requested = new Set(input.growthAreas ?? [])
  return goalSkillPriority[input.goalType]
    .filter(skillId => {
      const result = byId.get(skillId)
      return result?.status === 'assessed' && (requested.size === 0 || requested.has(skillId))
    })
    .sort((left, right) => (byId.get(left)?.level ?? 4) - (byId.get(right)?.level ?? 4))
    .slice(0, 2)
}

function adaptWeeks(
  weeks: readonly PlanWeek[],
  pace: PlanPace,
  codingMode: PlanCodingMode,
  roleCategory: PlanRoleCategory,
  blockerCategory: PlanBlockerCategory,
  prioritySkillIds: readonly SkillId[],
): PlanWeek[] {
  const copied = structuredClone(weeks) as PlanWeek[]
  if (pace === 'minimum') {
    copied.forEach((week, index) => {
      week.tasks = [fixedAdjustments.minimumPace[Math.min(index, 2)], week.tasks[0], 'Record what changed and stop before adding scope']
    })
  }
  const codingTask = codingMode === 'no-code' ? fixedAdjustments.noCode : codingMode === 'code-ready' ? fixedAdjustments.codeReady : fixedAdjustments.lightCode
  copied[1].tasks[0] = codingTask
  copied[0].tasks[2] = fixedAdjustments[blockerCategory]
  if (prioritySkillIds[0]) copied[2].tasks[0] = skillFocus[prioritySkillIds[0]]
  copied[2].tasks[1] = rolePractice[roleCategory]
  if (pace === 'accelerated') {
    copied[3].tasks[1] = 'Run two additional edge cases, compare the results, and document the release decision.'
  }
  return copied
}

export function composePersonalizedPlan(input: ComposePersonalizedPlanInput): PersonalizedPlan | null {
  if (!validInput(input)) return null
  const blueprint = getPlanBlueprint(input.goalType)
  const pace = classifyPace(input.weeklyHours)
  const codingMode = classifyCoding(input.codingComfort)
  const roleCategory = classifyRole(input.role)
  const blockerCategory = classifyBlocker(input.blocker)
  const prioritySkillIds = choosePrioritySkills(input)
  const unassessedSkillIds = goalSkillPriority[input.goalType]
    .filter(skillId => input.results.find(result => result.skillId === skillId)?.status !== 'assessed')
  const governedResourceIds = (input.recommendations ?? [])
    .map(resource => resource.id)
    .filter(id => /^[a-z0-9][a-z0-9-]{1,99}$/.test(id))
    .slice(0, 4)
  const focusNow = prioritySkillIds.length
    ? `${blueprint.focusNow} Evidence priority: ${skillFocus[prioritySkillIds[0]]}`
    : `${blueprint.focusNow} Begin by collecting evidence for the currently unassessed areas.`
  const reasons: PersonalizedPlanReason[] = [
    { id: 'pace', detail: pace === 'minimum' ? 'The plan protects one essential task per week.' : pace === 'accelerated' ? 'The plan keeps the full task sequence for the larger weekly budget.' : 'The plan uses a steady three-task weekly rhythm.' },
    { id: 'coding', detail: codingMode === 'no-code' ? 'The build begins with a no-code or manual prototype.' : codingMode === 'code-ready' ? 'The build includes one bounded code integration.' : 'The build starts visually and adds code only after a bottleneck is proven.' },
    { id: 'role', detail: roleCategory === 'leader' ? 'Decision, risk, and review artifacts are emphasized.' : roleCategory === 'builder' ? 'A working, testable artifact is emphasized.' : roleCategory === 'career-transition' ? 'Role-relevant proof is emphasized.' : 'A useful artifact and clear handoff are emphasized.' },
    { id: 'blocker', detail: `The first week includes the application-owned ${blockerCategory} recovery pattern.` },
    ...(prioritySkillIds.length ? [{ id: 'skill-evidence' as const, detail: 'Assessed growth areas determine the week-three practice.' }] : []),
    ...(unassessedSkillIds.length ? [{ id: 'unassessed-evidence' as const, detail: 'Unassessed areas are named without treating missing evidence as a zero score.' }] : []),
    ...(governedResourceIds.length ? [{ id: 'resources' as const, detail: 'Only governed catalog resource identifiers are attached to the plan.' }] : []),
  ]

  return deepFreeze({
    version: AI_PATH_PLAN_COMPOSER_VERSION,
    goalType: input.goalType,
    title: blueprint.title,
    proof: blueprint.proof,
    focusNow,
    notYet: blueprint.notYet,
    firstTask: pace === 'minimum' ? fixedAdjustments.minimumPace[0] : blueprint.firstTask,
    weeks: adaptWeeks(blueprint.weeks, pace, codingMode, roleCategory, blockerCategory, prioritySkillIds),
    profile: { pace, codingMode, roleCategory, blockerCategory },
    prioritySkillIds,
    unassessedSkillIds,
    governedResourceIds,
    reasons,
  })
}
