import {
  CAPABILITY_SECTION_IDS,
  USE_CASE_SECTION_IDS,
  type CapabilitySectionId,
  type DiagnosticPath,
  type UseCaseSectionId,
} from './diagnostic.ts'

export const CONSTRAINED_QUESTION_VERSION = '2026-07-18.v2' as const

export type DiagnosticSectionId = UseCaseSectionId | CapabilitySectionId
export type AdaptiveQuestionSource = 'canonical' | 'deterministic' | 'model-constrained'
export type AdaptiveQuestionAction = 'clarify_current' | 'advance'

export type AdaptiveQuestionPresentation = Readonly<{
  version: typeof CONSTRAINED_QUESTION_VERSION
  path: DiagnosticPath
  sectionId: DiagnosticSectionId
  variantId: string
  title: string
  reason: string
  prompt: string
  context: string | null
  source: AdaptiveQuestionSource
}>

export type AdaptiveQuestionRequest = Readonly<{
  version: typeof CONSTRAINED_QUESTION_VERSION
  path: DiagnosticPath
  completedSectionId: DiagnosticSectionId
  usedClarifierSectionIds: readonly DiagnosticSectionId[]
  answers: Readonly<Record<string, unknown>>
}>

export type ModelVariantSelection = Readonly<{
  version: typeof CONSTRAINED_QUESTION_VERSION
  variantId: string
}>

export type ModelQuestionAdaptation = Readonly<{
  version: typeof CONSTRAINED_QUESTION_VERSION
  action: AdaptiveQuestionAction
  title: string
  reason: string
  prompt: string
  context: string | null
}>

export type AdaptiveQuestionAdaptation = Readonly<{
  action: AdaptiveQuestionAction
  presentation: AdaptiveQuestionPresentation
}>

type QuestionVariant = Readonly<{
  id: string
  title: string
  reason: string
  prompt: string
  context?: string
  signals?: readonly RegExp[]
}>

type QuestionCatalog = Readonly<Record<DiagnosticPath, Readonly<Record<string, readonly QuestionVariant[]>>>>

const QUESTION_CATALOG: QuestionCatalog = Object.freeze({
  'use-case': Object.freeze({
    outcome: Object.freeze([
      { id: 'outcome-core', title: 'What are you trying to improve?', reason: 'Who it is for and what should be better', prompt: 'What do you want AI to help someone accomplish?' },
    ]),
    workflow: Object.freeze([
      { id: 'workflow-core', title: 'How does it work today?', reason: 'The current steps and where they break down', prompt: 'What happens today, and where does it become unreliable?' },
      { id: 'workflow-handoff', title: 'Where does the work get stuck?', reason: 'The handoffs, searches or reviews slowing the outcome down', prompt: 'Walk us through the current work. Where do people wait, repeat work, search for information or need another person to check it?', signals: [/team|sales|customer|client|manager|approval|review|handoff/i] },
      { id: 'workflow-information', title: 'How does the information move today?', reason: 'The sources, manual steps and unreliable transformations', prompt: 'How is the information found, changed and delivered today—and which step is slowest or least reliable?', signals: [/document|research|report|data|spreadsheet|email|content|information/i] },
    ]),
    specification: Object.freeze([
      { id: 'specification-core', title: 'What should the AI do?', reason: 'The smallest useful version', prompt: 'For the first version, what will the AI receive, what should it give back, and what would make that result useful?' },
      { id: 'specification-cited', title: 'What should a trustworthy first version produce?', reason: 'The source material, reviewable output and proof that it worked', prompt: 'What should it receive, what should it produce, and what evidence should accompany the result?', signals: [/document|source|research|policy|knowledge|citation|report/i] },
      { id: 'specification-structured', title: 'What should a useful first version produce?', reason: 'The input, repeatable output and observable success test', prompt: 'What goes in, what exact output comes out, and what would make that output useful every time?', signals: [/workflow|repeat|spreadsheet|form|record|route|classif|extract/i] },
    ]),
    experience: Object.freeze([
      { id: 'experience-core', title: 'What have you already tried?', reason: 'The highest level you can support', prompt: 'How far have you taken this idea? Choose the highest option you can back up.' },
      { id: 'experience-test', title: 'What have you tested already?', reason: 'Separate an idea from something you have actually tried', prompt: 'Which statement best describes what you have personally made, changed or tested for this use case?', signals: [/test|measure|prototype|built|made|tried|experiment/i] },
    ]),
    risk: Object.freeze([
      { id: 'risk-core', title: 'What could go wrong?', reason: 'Where a person must stay in control', prompt: 'How sensitive is the information, what happens if the result is wrong, and should a person approve it before it is used?' },
      { id: 'risk-sensitive', title: 'Where must a person stay in control?', reason: 'Sensitive information and consequential outputs need explicit safeguards', prompt: 'Before this can be used, what data needs protection, what mistakes matter most and who must approve the result?', signals: [/confidential|private|legal|health|financial|security|customer|employee|personal|approval/i] },
      { id: 'risk-accuracy', title: 'How will you contain incorrect answers?', reason: 'Define the checks and human review around a fallible model', prompt: 'If the AI is confidently wrong, what could happen and where should a person verify or approve its work?', signals: [/answer|recommend|decision|send|publish|respond|claim|citation/i] },
    ]),
    constraints: Object.freeze([
      { id: 'constraints-core', title: 'What must the plan fit?', reason: 'Your time, skills and budget', prompt: 'Tell us how much time you have, how comfortable you are with code, and what kind of tools you can use.' },
      { id: 'constraints-first-build', title: 'What can you realistically build first?', reason: 'Match the project to your role, available time and technical comfort', prompt: 'Tell us who will build this, how much time is available and whether the first version should use code or no-code tools.', signals: [/none|exposure|guided|not started|first/i] },
      { id: 'constraints-pilot', title: 'What must a pilot fit?', reason: 'Turn the design into a small project your team can actually run', prompt: 'Set the owner, weekly time, build approach and budget for a small test—not a full production rollout.', signals: [/team|demonstrated|independent|adapted|serious|critical/i] },
    ]),
  }),
  'capability-growth': Object.freeze({
    direction: Object.freeze([
      { id: 'direction-core', title: 'What do you want to get better at?', reason: 'Where AI could expand your work', prompt: 'Which outcomes matter to you right now?' },
    ]),
    experience: Object.freeze([
      { id: 'experience-core', title: 'What have you done so far?', reason: 'Choose the statement that feels closest', prompt: 'Which statement sounds most like you today?' },
      { id: 'experience-everyday', title: 'How are you using AI in real work?', reason: 'Start from what you already do, not from course titles', prompt: 'Which statement best matches how far you have gone beyond everyday writing, research, email or presentation tasks?', signals: [/everyday-work|writing|email|research|presentation|content/i] },
      { id: 'experience-automation', title: 'How far have you taken AI workflows?', reason: 'Distinguish trying tools from creating repeatable work', prompt: 'Which statement best reflects the most repeatable AI workflow you have personally created or tested?', signals: [/automate-repeated-work|automation|workflow|repeated/i] },
      { id: 'experience-builder', title: 'How far have you taken an AI build?', reason: 'Start from the strongest thing you can demonstrate', prompt: 'Which statement best reflects the most complete AI tool, application or system you have personally built and tested?', signals: [/build-ai-tool|application|assistant|app|system/i] },
      { id: 'experience-discovery', title: 'What is your current starting point?', reason: 'A broad starting point helps us narrow the right next capability', prompt: 'Which statement feels closest to what you have actually done with AI so far?', signals: [/discover-fit/i] },
    ]),
    evidence: Object.freeze([
      { id: 'evidence-core', title: 'Tell us about your best example', reason: 'What you made, improved or tested', prompt: 'Tell us about the best thing you have done with AI—even if it was small. What did you do, and what happened?' },
      { id: 'evidence-new', title: 'Tell us about one real attempt', reason: 'A small example is enough to find your practical starting point', prompt: 'What is one task where you tried AI yourself? If you have not tried one yet, say what you would like to attempt first.', signals: [/"none"|"exposure"|just getting started|not built/i] },
      { id: 'evidence-builder', title: 'Show us your strongest tested build', reason: 'We need evidence of your decisions, evaluation and outcome', prompt: 'Describe the strongest AI tool or system you built. What did you own, what was difficult and how did you evaluate it?', signals: [/"independent"|"demonstrated"|application|build/i] },
      { id: 'evidence-workflow', title: 'Show us your strongest repeatable workflow', reason: 'What you changed, checked and learned matters more than the tool name', prompt: 'Describe one AI workflow you personally adapted or created. What did you change, and how did you check whether it worked?', signals: [/"adapted"|workflow|automation/i] },
    ]),
    reasoning: Object.freeze([
      { id: 'reasoning-core', title: 'How do you make decisions?', reason: 'How you test, limit risk and review', prompt: 'What would you do, and why?', context: 'How would you decide which parts of a recurring task should be handled by AI and which should remain with a person?' },
      { id: 'reasoning-automation', title: 'How would you check AI’s work?', reason: 'What you would review before relying on it', prompt: 'Before using the AI’s suggestion, what would you check yourself—and when should another person review it?', context: 'Imagine AI suggests a result for one of your real work tasks. Sometimes it may miss context or make a confident mistake.', signals: [/automate-repeated-work|automation|workflow|repeated/i] },
      { id: 'reasoning-builder', title: 'How would you decide an AI tool is ready?', reason: 'Use examples and failure evidence instead of a good-looking demo', prompt: 'How would you use the examples to decide whether the assistant is ready for users?', context: 'You have 50 example questions and trusted answers for an AI assistant you are building.', signals: [/build-ai-tool|application|assistant|app|system/i] },
      { id: 'reasoning-reliability', title: 'How would you improve unreliable AI output?', reason: 'Measure usefulness, errors and uncertainty', prompt: 'What would you measure, and how would you improve the weak cases?', context: 'An AI tool looks impressive in a demo, but nobody has measured how often it is useful, wrong or uncertain.', signals: [/improve-reliability|reliab|evaluat|accurate|quality/i] },
    ]),
    foundations: Object.freeze([
      { id: 'foundations-core', title: 'What are you comfortable using?', reason: 'Coding, data and AI tools', prompt: 'Choose what you could use in a small project today, even if you would still need occasional help.' },
      { id: 'foundations-builder', title: 'Which technical foundations can support your next build?', reason: 'Calibrate the project to what you can implement and debug', prompt: 'Choose the level of code, data and AI tooling you can personally use and troubleshoot.', signals: [/"independent"|"demonstrated"|application|build/i] },
      { id: 'foundations-practical', title: 'What can you work with today?', reason: 'Match the next project to your current technical foundation', prompt: 'For coding, data and AI tools, choose what you could use in a small project today—not what you have only watched.', signals: [/"guided"|"adapted"|workflow|automation/i] },
    ]),
    constraints: Object.freeze([
      { id: 'constraints-core', title: 'What must your learning plan fit?', reason: 'Your time, pace and preferred format', prompt: 'Choose a weekly time, pace, and mix of guidance and projects that you can realistically keep up.' },
      { id: 'constraints-project', title: 'What kind of practice can you sustain?', reason: 'Fit a real project into your time, pace and preferred format', prompt: 'How many hours can you protect each week, and what balance of guidance and hands-on building will you actually maintain?', signals: [/projects|build|workflow|automation|application/i] },
      { id: 'constraints-guided', title: 'What learning rhythm will work for you?', reason: 'Choose a manageable pace before adding more material', prompt: 'Set the weekly time, level of guidance and pace that will help you practice consistently.', signals: [/new|exposure|guided|discover/i] },
    ]),
  }),
})

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  return Object.freeze(value)
}

function sectionIds(path: DiagnosticPath): readonly DiagnosticSectionId[] {
  return path === 'use-case' ? USE_CASE_SECTION_IDS : CAPABILITY_SECTION_IDS
}

export function diagnosticQuestionSectionIds(path: DiagnosticPath) {
  return sectionIds(path)
}

export function nextDiagnosticQuestionSection(path: DiagnosticPath, completedSectionId: DiagnosticSectionId) {
  const ids = sectionIds(path)
  const index = ids.indexOf(completedSectionId as never)
  return index >= 0 ? ids[index + 1] ?? null : null
}

function variantsFor(path: DiagnosticPath, sectionId: DiagnosticSectionId): readonly QuestionVariant[] {
  return QUESTION_CATALOG[path][sectionId] ?? []
}

function presentation(path: DiagnosticPath, sectionId: DiagnosticSectionId, variant: QuestionVariant, source: AdaptiveQuestionSource): AdaptiveQuestionPresentation {
  return deepFreeze({
    version: CONSTRAINED_QUESTION_VERSION,
    path,
    sectionId,
    variantId: variant.id,
    title: variant.title,
    reason: variant.reason,
    prompt: variant.prompt,
    context: variant.context ?? null,
    source,
  })
}

export function canonicalQuestionPresentation(path: DiagnosticPath, sectionId: DiagnosticSectionId) {
  const variant = variantsFor(path, sectionId)[0]
  if (!variant) throw new Error(`Unknown diagnostic section: ${path}/${sectionId}`)
  return presentation(path, sectionId, variant, 'canonical')
}

function answerValues(value: unknown, depth = 0): string[] {
  if (depth > 5 || value === null || value === undefined) return []
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [JSON.stringify(value)]
  }
  if (Array.isArray(value)) return value.flatMap(item => answerValues(item, depth + 1))
  if (typeof value !== 'object') return []
  return Object.values(value as Record<string, unknown>).flatMap(item => answerValues(item, depth + 1))
}

function searchableAnswerText(answers: Readonly<Record<string, unknown>>) {
  // Field names describe our data model, not learner intent. Searching only
  // leaf values prevents keys such as `automation` from biasing a question.
  return answerValues(answers).sort().join(' ').slice(0, 20_000)
}

function meaningfulWordCount(value: string) {
  return value.match(/[a-z0-9]+(?:'[a-z]+)?/gi)?.filter(word => !['a', 'an', 'and', 'for', 'i', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'we'].includes(word.toLowerCase())).length ?? 0
}

export function selectDeterministicQuestionPresentation(
  path: DiagnosticPath,
  sectionId: DiagnosticSectionId,
  answers: Readonly<Record<string, unknown>>,
) {
  const variants = variantsFor(path, sectionId)
  if (!variants.length) return canonicalQuestionPresentation(path, sectionId)
  const text = searchableAnswerText(answers)
  if (path === 'use-case' && sectionId === 'workflow' && meaningfulWordCount(text) < 8) {
    return presentation(path, sectionId, variants[0], 'canonical')
  }
  const matched = variants.slice(1).find(variant => variant.signals?.some(signal => signal.test(text)))
  return presentation(path, sectionId, matched ?? variants[0], matched ? 'deterministic' : 'canonical')
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort()
  return actual.length === keys.length && keys.slice().sort().every((key, index) => key === actual[index])
}

export function resolveModelVariantSelection(
  path: DiagnosticPath,
  sectionId: DiagnosticSectionId,
  value: unknown,
  fallback: AdaptiveQuestionPresentation,
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  const candidate = value as Record<string, unknown>
  if (!exactKeys(candidate, ['version', 'variantId'])) return fallback
  if (candidate.version !== CONSTRAINED_QUESTION_VERSION || typeof candidate.variantId !== 'string') return fallback
  const variant = variantsFor(path, sectionId).find(item => item.id === candidate.variantId)
  return variant ? presentation(path, sectionId, variant, 'model-constrained') : fallback
}

export function approvedVariantIds(path: DiagnosticPath, sectionId: DiagnosticSectionId) {
  return Object.freeze(variantsFor(path, sectionId).map(variant => variant.id))
}

export function approvedQuestionPresentation(
  path: DiagnosticPath,
  sectionId: DiagnosticSectionId,
  variantId: string,
  source: AdaptiveQuestionSource,
) {
  const variant = variantsFor(path, sectionId).find(item => item.id === variantId)
  return variant ? presentation(path, sectionId, variant, source) : null
}

export function approvedClarifierPresentation(
  path: DiagnosticPath,
  sectionId: DiagnosticSectionId,
  clarifier: Readonly<{ id: string; reason: string; prompt: string; answerGuidance: string }>,
) {
  return deepFreeze({
    version: CONSTRAINED_QUESTION_VERSION,
    path,
    sectionId,
    variantId: clarifier.id,
    title: 'One quick follow-up',
    reason: clarifier.reason,
    prompt: clarifier.prompt,
    context: clarifier.answerGuidance,
    source: 'deterministic' as const,
  })
}

const unsafeModelCopy = /https?:\/\/|www\.|<\/?[a-z]|\b(?:buy|purchase|subscribe|payment|credit card|password|api key|course|product|calibrat\w*|epistem\w*|taxonomy|input-to-output|capability matrix|artifact provenance)\b/i

function boundedModelText(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === 'string'
    && value.trim() === value
    && value.length >= minimum
    && value.length <= maximum
    && !unsafeModelCopy.test(value)
}

export function resolveModelQuestionAdaptation(
  path: DiagnosticPath,
  currentSectionId: DiagnosticSectionId,
  nextSectionId: DiagnosticSectionId,
  allowedActions: readonly AdaptiveQuestionAction[],
  value: unknown,
  fallback: AdaptiveQuestionAdaptation,
): AdaptiveQuestionAdaptation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  const candidate = value as Record<string, unknown>
  if (!exactKeys(candidate, ['action', 'context', 'prompt', 'reason', 'title', 'version'])) return fallback
  if (candidate.version !== CONSTRAINED_QUESTION_VERSION) return fallback
  if (candidate.action !== 'clarify_current' && candidate.action !== 'advance') return fallback
  if (!allowedActions.includes(candidate.action)) return fallback
  if (!boundedModelText(candidate.title, 4, 100)) return fallback
  if (!boundedModelText(candidate.reason, 8, 180)) return fallback
  if (!boundedModelText(candidate.prompt, 12, 400) || !candidate.prompt.includes('?')) return fallback
  if (candidate.context !== null && !boundedModelText(candidate.context, 8, 500)) return fallback
  const sectionId = candidate.action === 'clarify_current' ? currentSectionId : nextSectionId
  return deepFreeze({
    action: candidate.action,
    presentation: {
      version: CONSTRAINED_QUESTION_VERSION,
      path,
      sectionId,
      variantId: candidate.action === 'clarify_current' ? 'model-clarifier' : 'model-contextual',
      title: candidate.title,
      reason: candidate.reason,
      prompt: candidate.prompt,
      context: candidate.context,
      source: 'model-constrained',
    },
  })
}

export function parseAdaptiveQuestionRequest(value: unknown): AdaptiveQuestionRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (!exactKeys(candidate, ['answers', 'completedSectionId', 'path', 'usedClarifierSectionIds', 'version'])) return null
  if (candidate.version !== CONSTRAINED_QUESTION_VERSION) return null
  if (candidate.path !== 'use-case' && candidate.path !== 'capability-growth') return null
  if (typeof candidate.completedSectionId !== 'string') return null
  if (!candidate.answers || typeof candidate.answers !== 'object' || Array.isArray(candidate.answers)) return null
  if (!Array.isArray(candidate.usedClarifierSectionIds)) return null
  if (!sectionIds(candidate.path).includes(candidate.completedSectionId as never)) return null
  if (candidate.usedClarifierSectionIds.length > 2) return null
  if (!candidate.usedClarifierSectionIds.every(id => typeof id === 'string' && sectionIds(candidate.path as DiagnosticPath).includes(id as never))) return null
  if (new Set(candidate.usedClarifierSectionIds).size !== candidate.usedClarifierSectionIds.length) return null
  if (JSON.stringify(candidate.answers).length > 20_000) return null
  return deepFreeze({
    version: CONSTRAINED_QUESTION_VERSION,
    path: candidate.path,
    completedSectionId: candidate.completedSectionId as DiagnosticSectionId,
    usedClarifierSectionIds: [...candidate.usedClarifierSectionIds] as DiagnosticSectionId[],
    answers: structuredClone(candidate.answers as Record<string, unknown>),
  })
}
