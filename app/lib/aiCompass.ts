export const questionCount = 5

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

export type CompassTask = {
  action: string
  deliverable: string
  successCheck: string
  time: string
}

export type CompassPriority = {
  title: string
  whyThisFits: string
  learn: string[]
  tasks: CompassTask[]
  skipTrap: string
}

export type CompassAnalysis = {
  headline: string
  subhead: string
  currentPosition: string
  targetPosition: string
  confidence: 'High' | 'Medium' | 'Directional'
  profileSignals: Array<{ label: string; finding: string; evidence: string }>
  strengths: string[]
  gaps: string[]
  priorities: CompassPriority[]
  first72Hours: CompassTask[]
  weeks: Array<{
    week: string
    objective: string
    learn: string
    build: string
    evidence: string
  }>
  capstone: {
    title: string
    brief: string
    requirements: string[]
    proof: string[]
  }
  resources: Array<{
    topic: string
    why: string
    searchFor: string
    format: string
  }>
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

function lines(values: string[]) {
  return values.filter(Boolean).map(value => `- ${value}`).join('\n')
}

export function serializeAnalysis(analysis: CompassAnalysis) {
  const priorities = analysis.priorities.map((priority, index) => {
    const tasks = priority.tasks.map(task => `  - ${task.action} | Deliverable: ${task.deliverable} | Done when: ${task.successCheck} | ${task.time}`).join('\n')
    return `${index + 1}. ${priority.title}\nWhy: ${priority.whyThisFits}\nLearn:\n${lines(priority.learn)}\nTasks:\n${tasks}`
  }).join('\n\n')

  const weeks = analysis.weeks.map(week => `${week.week}: ${week.objective}\nLearn: ${week.learn}\nBuild: ${week.build}\nEvidence: ${week.evidence}`).join('\n\n')

  return `${analysis.headline}\n${analysis.subhead}\n\nWHERE YOU ARE\n${analysis.currentPosition}\n\nWHERE YOU ARE GOING\n${analysis.targetPosition}\n\nYOUR PRIORITIES\n${priorities}\n\nYOUR 30-DAY PLAN\n${weeks}\n\nCAPSTONE: ${analysis.capstone.title}\n${analysis.capstone.brief}\n\nNOT NOW\n${lines(analysis.notNow)}`
}

export function isInterviewTurn(value: unknown): value is InterviewTurn {
  if (!value || typeof value !== 'object') return false
  const turn = value as InterviewTurn
  return Boolean(
    turn.acknowledgement &&
    turn.interpretation &&
    turn.nextQuestion?.prompt &&
    turn.nextQuestion?.helper &&
    turn.profile?.oneLineGoal &&
    Array.isArray(turn.profile.knownSignals)
  )
}

export function isCompassAnalysis(value: unknown): value is CompassAnalysis {
  if (!value || typeof value !== 'object') return false
  const analysis = value as CompassAnalysis
  return Boolean(
    analysis.headline &&
    analysis.currentPosition &&
    analysis.targetPosition &&
    Array.isArray(analysis.profileSignals) && analysis.profileSignals.length >= 3 &&
    Array.isArray(analysis.priorities) && analysis.priorities.length >= 4 &&
    analysis.priorities.every(priority => Array.isArray(priority.tasks) && priority.tasks.length >= 2) &&
    Array.isArray(analysis.first72Hours) && analysis.first72Hours.length >= 3 &&
    Array.isArray(analysis.weeks) && analysis.weeks.length === 4 &&
    Boolean(analysis.capstone?.title) &&
    Array.isArray(analysis.notNow)
  )
}
