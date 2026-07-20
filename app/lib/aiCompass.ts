import { compassResourceCatalog, compassToolCatalog } from './aiCompassCatalog'

export const questionCount = 5

export const compassPathways = [
  'AI Essentials',
  'Work Smarter',
  'Create & Communicate',
  'Research & Decide',
  'Learn & Organize',
  'Automate Workflows',
  'Build Apps & Agents',
  'Lead AI Adoption',
] as const

export const capabilityBands = ['0-30', '30-50', '50-75', '75-90'] as const

export type CompassPathway = typeof compassPathways[number]
export type CapabilityBand = typeof capabilityBands[number]

export type CompassQuestion = {
  id: string
  focus: 'outcome' | 'evidence' | 'workflow' | 'baseline' | 'constraints' | 'clarity'
  eyebrow: string
  prompt: string
  helper: string
  placeholder: string
}

export type CompassAnswer = {
  questionId: string
  question: string
  focus: CompassQuestion['focus']
  text: string
}

export type InterviewProfile = {
  oneLineGoal: string
  knownSignals: Array<{ label: string; value: string }>
  stillMissing: string
}

export type InterviewTurn = {
  acknowledgement: string
  interpretation: string
  nextQuestion: CompassQuestion
  profile: InterviewProfile
}

export type CompassRoute = {
  pathway: CompassPathway
  currentBand: CapabilityBand
  targetBand: CapabilityBand
  whyThisRoute: string
  naturalStoppingPoint: string
}

export type CompassTool = {
  id: string
  catalogId: string
  name: string
  role: string
  whyThisTool: string
  setupSteps: string[]
  dataRule: string
  costGuard: string
  fallback: string
}

export type CompassExecutionStep = {
  id: string
  title: string
  minutes: number
  learn: string
  actions: string[]
  toolId?: string
  copyPrompt?: {
    label: string
    text: string
  }
  expectedOutput: string
  successCheck: string
  evidence: string
  ifStuck: {
    symptom: string
    fix: string
    fallback: string
  }
}

export type CompassExecutionPack = {
  outcome: {
    buildThis: string
    forWhom: string
    totalMinutes: number
    availableMinutes: number
    availableTimeEvidence: string
    startNowStepId: string
    finishedWhen: string
    exclusions: string[]
  }
  mentalModel: {
    title: string
    explanation: string
    terms: Array<{ term: string; meaning: string }>
    comprehensionCheck: {
      question: string
      answer: string
    }
  }
  tools: CompassTool[]
  steps: CompassExecutionStep[]
  first72HourStepIds: string[]
  weeks: Array<{
    week: 'Week 1' | 'Week 2' | 'Week 3' | 'Week 4'
    objective: string
    stepIds: string[]
    evidence: string
  }>
  testPlan: {
    cases: string[]
    procedure: string[]
    scorecard: Array<{ criterion: string; passRule: string }>
    passCondition: string
    failureSignals: string[]
  }
  troubleshooting: Array<{
    symptom: string
    likelyCause: string
    correction: string
  }>
  resources: Array<{
    catalogId: string
    useAtStepId: string
    title: string
    whyNow: string
    searchFor: string
    format: string
    durationMinutes: number
    actionAfter: string
  }>
  completion: {
    capability: string
    artifact: string
    proof: string
    nextChoices: string[]
    recommendedNext: string
  }
}

export type CompassPriority = {
  title: string
  whyThisFits: string
  learn: string[]
  skipTrap: string
}

export type CompassAnalysis = {
  schemaVersion: 2
  headline: string
  subhead: string
  currentPosition: string
  targetPosition: string
  confidence: 'High' | 'Medium' | 'Directional'
  route: CompassRoute
  profileSignals: Array<{ label: string; finding: string; evidence: string }>
  strengths: string[]
  gaps: string[]
  priorities: CompassPriority[]
  executionPack: CompassExecutionPack
  notNow: string[]
  assumptions: string[]
}

export const initialQuestion: CompassQuestion = {
  id: 'destination',
  focus: 'outcome',
  eyebrow: 'Start with the change you want',
  prompt: 'Imagine it is six months from now and AI has genuinely helped you. What is different?',
  helper: 'Tell me the role, industry, project, or work outcome you care about—and what success would look like in real life. The more context you give, the less generic your roadmap will be.',
  placeholder: 'In six months, I want to be able to… This matters because… I would know it worked if…',
}

function lines(values: string[], indent = '') {
  return values.filter(Boolean).map(value => `${indent}- ${value}`).join('\n')
}

export function serializeAnalysis(analysis: CompassAnalysis) {
  const pack = analysis.executionPack
  const toolById = new Map(pack.tools.map(tool => [tool.id, tool]))
  const stepById = new Map(pack.steps.map(step => [step.id, step]))
  const resourceById = new Map(compassResourceCatalog.map(resource => [resource.id, resource]))
  const tools = pack.tools.map(tool => `${tool.name} — ${tool.role}\nWhy: ${tool.whyThisTool}\nSetup:\n${lines(tool.setupSteps)}\nData rule: ${tool.dataRule}\nCost guard: ${tool.costGuard}\nFallback: ${tool.fallback}`).join('\n\n')
  const steps = pack.steps.map((step, index) => {
    const tool = step.toolId ? toolById.get(step.toolId)?.name : undefined
    const prompt = step.copyPrompt ? `\nPrompt — ${step.copyPrompt.label}:\n${step.copyPrompt.text}` : ''
    return `${index + 1}. ${step.title} (${step.minutes} min)\nLearn: ${step.learn}${tool ? `\nTool: ${tool}` : ''}\nActions:\n${lines(step.actions)}${prompt}\nExpected: ${step.expectedOutput}\nDone when: ${step.successCheck}\nSave: ${step.evidence}\nIf stuck: ${step.ifStuck.symptom} → ${step.ifStuck.fix}\nFallback: ${step.ifStuck.fallback}`
  }).join('\n\n')
  const weeks = pack.weeks.map(week => `${week.week}: ${week.objective}\nSteps: ${week.stepIds.map(id => stepById.get(id)?.title ?? id).join(', ')}\nEvidence: ${week.evidence}`).join('\n\n')
  const resources = pack.resources.map(resource => {
    const catalog = resourceById.get(resource.catalogId)
    return `${resource.title} (${resource.format}, ${resource.durationMinutes} min)\nUse at: ${stepById.get(resource.useAtStepId)?.title ?? resource.useAtStepId}\nWhy now: ${resource.whyNow}${catalog ? `\nOpen: ${catalog.url}\nSource: ${catalog.source} · ${catalog.section} · reviewed ${catalog.reviewedAt}` : `\nFind: ${resource.searchFor}`}\nThen: ${resource.actionAfter}`
  }).join('\n\n')
  const troubleshooting = pack.troubleshooting.map(item => `${item.symptom}\nLikely cause: ${item.likelyCause}\nCorrection: ${item.correction}`).join('\n\n')

  return `${analysis.headline}\n${analysis.subhead}\n\nYOUR ROUTE\n${analysis.route.pathway} · ${analysis.route.currentBand} → ${analysis.route.targetBand}\nWhy: ${analysis.route.whyThisRoute}\nNatural stopping point: ${analysis.route.naturalStoppingPoint}\n\nBUILD THIS\n${pack.outcome.buildThis}\nFor: ${pack.outcome.forWhom}\nTime: ${pack.outcome.totalMinutes} of ${pack.outcome.availableMinutes} available minutes\nTime evidence: ${pack.outcome.availableTimeEvidence}\nFinished when: ${pack.outcome.finishedWhen}\nExclude:\n${lines(pack.outcome.exclusions)}\n\nMINIMUM MENTAL MODEL\n${pack.mentalModel.title}\n${pack.mentalModel.explanation}\n${pack.mentalModel.terms.map(item => `${item.term}: ${item.meaning}`).join('\n')}\nCheck: ${pack.mentalModel.comprehensionCheck.question}\nAnswer: ${pack.mentalModel.comprehensionCheck.answer}\n\nTOOLS\n${tools}\n\nEXACT BUILD RECIPE\n${steps}\n\nFOUR-WEEK SEQUENCE\n${weeks}\n\nTEST PLAN\nCases:\n${lines(pack.testPlan.cases)}\nProcedure:\n${pack.testPlan.procedure.map((item, index) => `${index + 1}. ${item}`).join('\n')}\nScorecard:\n${pack.testPlan.scorecard.map(item => `- ${item.criterion}: ${item.passRule}`).join('\n')}\nPass when: ${pack.testPlan.passCondition}\nFailure signals:\n${lines(pack.testPlan.failureSignals)}\n\nTROUBLESHOOTING\n${troubleshooting}${resources ? `\n\nJUST-IN-TIME RESOURCES\n${resources}` : ''}\n\nYOUR ENDING\nI can: ${pack.completion.capability}\nI made: ${pack.completion.artifact}\nI proved it with: ${pack.completion.proof}\nMy recommended next choice: ${pack.completion.recommendedNext}\nOther choices:\n${lines(pack.completion.nextChoices)}\n\nNOT NOW\n${lines(analysis.notNow)}${analysis.assumptions.length ? `\n\nASSUMPTIONS TO VERIFY\n${lines(analysis.assumptions)}` : ''}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isText(value: unknown, maxLength = 4000): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isTextArray(value: unknown, min: number, max: number) {
  return Array.isArray(value) && value.length >= min && value.length <= max && value.every(item => isText(item))
}

function hasUniqueIds(items: Array<{ id: string }>) {
  return new Set(items.map(item => item.id)).size === items.length
}

export function isInterviewTurn(value: unknown): value is InterviewTurn {
  if (!isRecord(value)) return false
  const turn = value as Partial<InterviewTurn>
  return Boolean(
    isText(turn.acknowledgement) &&
    isText(turn.interpretation) &&
    isRecord(turn.nextQuestion) &&
    isText(turn.nextQuestion.id) &&
    ['outcome', 'evidence', 'workflow', 'baseline', 'constraints', 'clarity'].includes(String(turn.nextQuestion.focus)) &&
    isText(turn.nextQuestion.eyebrow) &&
    isText(turn.nextQuestion.prompt) &&
    isText(turn.nextQuestion.helper) &&
    isText(turn.nextQuestion.placeholder) &&
    isRecord(turn.profile) &&
    isText(turn.profile.oneLineGoal) &&
    Array.isArray(turn.profile.knownSignals) &&
    turn.profile.knownSignals.every(signal => isRecord(signal) && isText(signal.label) && isText(signal.value)) &&
    isText(turn.profile.stillMissing)
  )
}

export function isCompassAnalysis(value: unknown): value is CompassAnalysis {
  if (!isRecord(value)) return false
  const analysis = value as Partial<CompassAnalysis>
  if (
    analysis.schemaVersion !== 2 ||
    !isText(analysis.headline) ||
    !isText(analysis.subhead) ||
    !isText(analysis.currentPosition) ||
    !isText(analysis.targetPosition) ||
    !['High', 'Medium', 'Directional'].includes(String(analysis.confidence)) ||
    !isRecord(analysis.route) ||
    !compassPathways.includes(analysis.route.pathway as CompassPathway) ||
    !capabilityBands.includes(analysis.route.currentBand as CapabilityBand) ||
    !capabilityBands.includes(analysis.route.targetBand as CapabilityBand) ||
    !isText(analysis.route.whyThisRoute) ||
    !isText(analysis.route.naturalStoppingPoint) ||
    !Array.isArray(analysis.profileSignals) || analysis.profileSignals.length !== 5 ||
    !analysis.profileSignals.every(signal => isRecord(signal) && isText(signal.label) && isText(signal.finding) && isText(signal.evidence)) ||
    !isTextArray(analysis.strengths, 4, 4) ||
    !isTextArray(analysis.gaps, 4, 4) ||
    !Array.isArray(analysis.priorities) || analysis.priorities.length !== 4 ||
    !analysis.priorities.every(priority => isRecord(priority) && isText(priority.title) && isText(priority.whyThisFits) && isTextArray(priority.learn, 1, 3) && isText(priority.skipTrap)) ||
    !isTextArray(analysis.notNow, 3, 5) ||
    !isTextArray(analysis.assumptions, 0, 3) ||
    !isRecord(analysis.executionPack)
  ) return false

  const pack = analysis.executionPack as Partial<CompassExecutionPack>
  const currentBandIndex = capabilityBands.indexOf(analysis.route.currentBand as CapabilityBand)
  const targetBandIndex = capabilityBands.indexOf(analysis.route.targetBand as CapabilityBand)
  if (targetBandIndex < currentBandIndex || targetBandIndex > currentBandIndex + 1) return false
  if (!isRecord(pack.outcome) || !isText(pack.outcome.buildThis) || !isText(pack.outcome.forWhom) ||
    !Number.isInteger(pack.outcome.totalMinutes) || Number(pack.outcome.totalMinutes) <= 0 || Number(pack.outcome.totalMinutes) > 10000 ||
    !Number.isInteger(pack.outcome.availableMinutes) || Number(pack.outcome.availableMinutes) <= 0 || Number(pack.outcome.availableMinutes) > 10000 ||
    Number(pack.outcome.totalMinutes) > Number(pack.outcome.availableMinutes) || !isText(pack.outcome.availableTimeEvidence) ||
    !isText(pack.outcome.startNowStepId) || !isText(pack.outcome.finishedWhen) || !isTextArray(pack.outcome.exclusions, 2, 6) ||
    !isRecord(pack.mentalModel) || !isText(pack.mentalModel.title) || !isText(pack.mentalModel.explanation) ||
    !Array.isArray(pack.mentalModel.terms) || pack.mentalModel.terms.length < 3 || pack.mentalModel.terms.length > 6 ||
    !pack.mentalModel.terms.every(item => isRecord(item) && isText(item.term) && isText(item.meaning)) ||
    !isRecord(pack.mentalModel.comprehensionCheck) || !isText(pack.mentalModel.comprehensionCheck.question) || !isText(pack.mentalModel.comprehensionCheck.answer) ||
    !Array.isArray(pack.tools) || pack.tools.length < 1 || pack.tools.length > 3 ||
    !Array.isArray(pack.steps) || pack.steps.length < 5 || pack.steps.length > 10 ||
    !Array.isArray(pack.first72HourStepIds) || pack.first72HourStepIds.length < 1 || pack.first72HourStepIds.length > 3 ||
    !Array.isArray(pack.weeks) || pack.weeks.length !== 4 ||
    !isRecord(pack.testPlan) || !Array.isArray(pack.troubleshooting) || !Array.isArray(pack.resources) || !isRecord(pack.completion)
  ) return false

  const tools = pack.tools as CompassTool[]
  const steps = pack.steps as CompassExecutionStep[]
  const toolCatalogIds = new Set(compassToolCatalog.map(tool => tool.id))
  if (!tools.every(tool => isRecord(tool) && isText(tool.id) && isText(tool.catalogId) && toolCatalogIds.has(tool.catalogId) && isText(tool.name) && !/\sor\s|\//i.test(tool.name) && isText(tool.role) && isText(tool.whyThisTool) && isTextArray(tool.setupSteps, 1, 5) && isText(tool.dataRule) && isText(tool.costGuard) && isText(tool.fallback))) return false
  if (!hasUniqueIds(tools) || !hasUniqueIds(steps)) return false

  const toolIds = new Set(tools.map(tool => tool.id))
  const stepIds = new Set(steps.map(step => step.id))
  if (!steps.every(step => isRecord(step) && isText(step.id) && isText(step.title) && Number.isInteger(step.minutes) && step.minutes > 0 && step.minutes <= 480 && isText(step.learn) && isTextArray(step.actions, 1, 8) && (step.toolId === undefined || (isText(step.toolId) && toolIds.has(step.toolId))) && (step.copyPrompt === undefined || (isRecord(step.copyPrompt) && isText(step.copyPrompt.label) && isText(step.copyPrompt.text, 3000))) && isText(step.expectedOutput) && isText(step.successCheck) && isText(step.evidence) && isRecord(step.ifStuck) && isText(step.ifStuck.symptom) && isText(step.ifStuck.fix) && isText(step.ifStuck.fallback))) return false

  const calculatedMinutes = steps.reduce((total, step) => total + step.minutes, 0)
  if (calculatedMinutes !== pack.outcome.totalMinutes || pack.outcome.startNowStepId !== steps[0].id) return false

  const first72 = pack.first72HourStepIds as string[]
  if (new Set(first72).size !== first72.length || !first72.every((id, index) => id === steps[index]?.id)) return false

  const expectedWeeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
  const weeks = pack.weeks as CompassExecutionPack['weeks']
  if (!weeks.every((week, index) => isRecord(week) && week.week === expectedWeeks[index] && isText(week.objective) && Array.isArray(week.stepIds) && week.stepIds.length >= 1 && new Set(week.stepIds).size === week.stepIds.length && week.stepIds.every(id => stepIds.has(id)) && isText(week.evidence))) return false
  const scheduledIds = new Set(weeks.flatMap(week => week.stepIds))
  const flattenedWeekIds = weeks.flatMap(week => week.stepIds)
  if (scheduledIds.size !== steps.length || flattenedWeekIds.length !== steps.length || !flattenedWeekIds.every((id, index) => id === steps[index].id) || !first72.every(id => weeks[0].stepIds.includes(id))) return false

  const testPlan = pack.testPlan as CompassExecutionPack['testPlan']
  if (!isTextArray(testPlan.cases, 5, 10) || !isTextArray(testPlan.procedure, 2, 6) || !Array.isArray(testPlan.scorecard) || testPlan.scorecard.length < 3 || testPlan.scorecard.length > 6 || !testPlan.scorecard.every(item => isRecord(item) && isText(item.criterion) && isText(item.passRule)) || !isText(testPlan.passCondition) || !isTextArray(testPlan.failureSignals, 2, 5)) return false
  if (pack.troubleshooting.length < 2 || pack.troubleshooting.length > 6 || !pack.troubleshooting.every(item => isRecord(item) && isText(item.symptom) && isText(item.likelyCause) && isText(item.correction))) return false
  const resourceCatalogIds = new Set(compassResourceCatalog.map(resource => resource.id))
  if (pack.resources.length > 3 || !pack.resources.every(resource => isRecord(resource) && isText(resource.catalogId) && resourceCatalogIds.has(resource.catalogId) && stepIds.has(resource.useAtStepId) && isText(resource.title) && isText(resource.whyNow) && isText(resource.searchFor) && isText(resource.format) && Number.isInteger(resource.durationMinutes) && resource.durationMinutes > 0 && resource.durationMinutes <= 90 && isText(resource.actionAfter))) return false

  const completion = pack.completion as CompassExecutionPack['completion']
  return Boolean(
    isText(completion.capability) &&
    isText(completion.artifact) &&
    isText(completion.proof) &&
    isTextArray(completion.nextChoices, 3, 5) &&
    isText(completion.recommendedNext) &&
    completion.nextChoices.includes(completion.recommendedNext)
  )
}

export function normalizeCompassAnalysis(value: unknown) {
  if (!isRecord(value) || !isRecord(value.executionPack)) return value
  const pack = value.executionPack
  if (isRecord(pack.outcome) && Array.isArray(pack.steps)) {
    const minutes = pack.steps.reduce((total, step) => isRecord(step) && typeof step.minutes === 'number' ? total + step.minutes : total, 0)
    pack.outcome.totalMinutes = minutes
  }
  if (isRecord(pack.completion) && Array.isArray(pack.completion.nextChoices) && !pack.completion.nextChoices.includes(pack.completion.recommendedNext)) {
    pack.completion.recommendedNext = pack.completion.nextChoices[0]
  }
  return value
}
