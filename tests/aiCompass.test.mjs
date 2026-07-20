import assert from 'node:assert/strict'
import test from 'node:test'
import compassModule from '../app/lib/aiCompass.ts'
import catalogModule from '../app/lib/aiCompassCatalog.ts'

const { isCompassAnalysis, isInterviewTurn, normalizeCompassAnalysis, serializeAnalysis } = compassModule
const { compassResourceCatalog, compassToolCatalog } = catalogModule

export function fixture() {
  return {
    schemaVersion: 2,
    headline: 'Build a trustworthy sales assistant',
    subhead: 'Prove the behavior manually. Then create a private interface.',
    currentPosition: 'You know the sales workflow but have not built an AI system.',
    targetPosition: 'You can create, test, and explain a bounded private prototype.',
    confidence: 'High',
    route: {
      pathway: 'Build Apps & Agents',
      currentBand: '0-30',
      targetBand: '30-50',
      whyThisRoute: 'Your domain knowledge is strong, while your build experience is new.',
      naturalStoppingPoint: 'A tested configured assistant is enough if users do not need a custom interface.',
    },
    profileSignals: Array.from({ length: 5 }, (_, index) => ({ label: `Signal ${index + 1}`, finding: `Finding ${index + 1}`, evidence: `Answer ${index + 1}` })),
    strengths: ['Sales judgment', 'Clear user group', 'Recurring workflow', 'Access to testers'],
    gaps: ['System vocabulary', 'Prompt testing', 'Interface building', 'Failure analysis'],
    priorities: Array.from({ length: 4 }, (_, index) => ({ title: `Capability ${index + 1}`, whyThisFits: `This closes gap ${index + 1}.`, learn: [`Concept ${index + 1}`], skipTrap: `Avoid distraction ${index + 1}.` })),
    executionPack: {
      outcome: {
        buildThis: 'A private Sales Call Prep Assistant',
        forWhom: 'Sales representatives preparing for discovery calls',
        totalMinutes: 150,
        availableMinutes: 240,
        availableTimeEvidence: 'The learner has one hour each week for four weeks.',
        startNowStepId: 'step-1',
        finishedWhen: 'It passes five synthetic cases and two users can use it without help.',
        exclusions: ['No CRM connection', 'No real customer data', 'No deployment'],
      },
      mentalModel: {
        title: 'Input → instructions → model → output → tests',
        explanation: 'The interface collects input, instructions constrain the model, and tests reveal whether the output can be trusted.',
        terms: [
          { term: 'Chat', meaning: 'One conversation with a general assistant.' },
          { term: 'App', meaning: 'A purpose-built interface around a bounded capability.' },
          { term: 'Agent', meaning: 'A system that chooses actions and uses tools toward a goal.' },
        ],
        comprehensionCheck: { question: 'Where does the no-invention rule belong?', answer: 'In both the instructions and the tests.' },
      },
      tools: [
        { id: 'tool-chat', catalogId: 'existing-chat', name: 'Existing approved AI chat', role: 'Prove the behavior manually', whyThisTool: 'It avoids building before the task works.', setupSteps: ['Open a new chat.', 'Prepare fictional deal notes.'], dataRule: 'Use fictional or sanitized information only.', costGuard: 'Do not upgrade or enter billing details.', fallback: 'Use another already-available chat tool.' },
        { id: 'tool-sheet', catalogId: 'spreadsheet', name: 'Existing spreadsheet', role: 'Record cases and scores', whyThisTool: 'It creates an inspectable test trail.', setupSteps: ['Create columns for input, output, and score.'], dataRule: 'Use synthetic cases only.', costGuard: 'Do not install paid add-ons.', fallback: 'Use a table in a document.' },
      ],
      steps: [
        { id: 'step-1', title: 'Write the promise', minutes: 20, learn: 'A useful prototype solves one bounded job.', actions: ['Complete the supplied promise sentence.', 'Remove secondary users and extra features.'], copyPrompt: { label: 'Scope critique', text: 'Critique this one-sentence product promise. Identify the user, input, output, and any unnecessary scope: [PROMISE]' }, expectedOutput: 'One sentence naming one user, input, and useful output.', successCheck: 'A colleague can repeat the promise accurately.', evidence: 'Save the final promise.', ifStuck: { symptom: 'The promise contains several jobs.', fix: 'Keep only the most frequent decision.', fallback: 'Use the supplied sales example.' } },
        { id: 'step-2', title: 'Prove the behavior in chat', minutes: 35, learn: 'Manual behavior comes before an interface.', actions: ['Open the approved chat tool.', 'Paste the fictional notes and supplied prompt.', 'Mark facts and unsupported claims.'], toolId: 'tool-chat', copyPrompt: { label: 'Sales call preparation', text: 'Use only the fictional notes below. Separate confirmed facts, missing information, hypotheses, discovery questions, and risks. Never invent names, budgets, dates, or commitments.\n\n[FICTIONAL NOTES]' }, expectedOutput: 'A structured brief that labels missing information and hypotheses.', successCheck: 'The output contains no invented customer facts.', evidence: 'Save the input, prompt, output, and corrections.', ifStuck: { symptom: 'The model invents details.', fix: 'Add an explicit fact-versus-hypothesis rule and rerun.', fallback: 'Use a shorter input and mark every sentence manually.' } },
        { id: 'step-3', title: 'Create the test sheet', minutes: 30, learn: 'Representative cases are more useful than one impressive demo.', actions: ['Create five case rows.', 'Add grounding, usefulness, and safety columns.'], toolId: 'tool-sheet', expectedOutput: 'A sheet containing normal, sparse, conflicting, and unsafe cases.', successCheck: 'Every case has expected behavior and a score.', evidence: 'Save the completed test sheet.', ifStuck: { symptom: 'Cases are nearly identical.', fix: 'Add sparse, conflicting, and irrelevant inputs.', fallback: 'Use the five supplied case categories.' } },
        { id: 'step-4', title: 'Assemble the private prototype', minutes: 35, learn: 'An app is an interface around already-tested behavior.', actions: ['Create an input screen.', 'Add the tested instructions.', 'Keep the prototype private.'], toolId: 'tool-chat', expectedOutput: 'A private interface or configured assistant using the tested instructions.', successCheck: 'A user can enter a fictional deal and receive the expected sections.', evidence: 'Save screenshots and the final instructions.', ifStuck: { symptom: 'The builder requests billing or deployment.', fix: 'Stop and return to the configured-assistant fallback.', fallback: 'Demonstrate the workflow in normal chat.' } },
        { id: 'step-5', title: 'Test and choose the stopping point', minutes: 30, learn: 'User evidence determines whether more complexity is justified.', actions: ['Run all five cases.', 'Ask two users to try it.', 'Record failures and choose stop or continue.'], toolId: 'tool-sheet', expectedOutput: 'Scores, user observations, limitations, and a next-step decision.', successCheck: 'All failures are documented and the decision cites evidence.', evidence: 'Save the scorecard, user notes, and decision.', ifStuck: { symptom: 'Users disagree about value.', fix: 'Return to the single job and compare their actual workflow.', fallback: 'Keep the assistant private and repeat testing.' } },
      ],
      first72HourStepIds: ['step-1', 'step-2'],
      weeks: [
        { week: 'Week 1', objective: 'Scope and prove behavior', stepIds: ['step-1', 'step-2'], evidence: 'Promise and corrected chat output' },
        { week: 'Week 2', objective: 'Create the evaluation set', stepIds: ['step-3'], evidence: 'Five scored cases' },
        { week: 'Week 3', objective: 'Assemble the prototype', stepIds: ['step-4'], evidence: 'Private working demo' },
        { week: 'Week 4', objective: 'Test and decide', stepIds: ['step-5'], evidence: 'User notes and stopping decision' },
      ],
      testPlan: {
        cases: ['Complete notes', 'Sparse notes', 'Conflicting notes', 'Unsupported budget claim', 'Irrelevant input'],
        procedure: ['Run each case without changing the instructions.', 'Record the output and score every rule before revising.'],
        scorecard: [
          { criterion: 'Grounding', passRule: 'Every factual claim appears in the supplied notes.' },
          { criterion: 'Usefulness', passRule: 'At least three discovery questions are specific and usable.' },
          { criterion: 'Safety', passRule: 'Missing information is labeled instead of invented.' },
        ],
        passCondition: 'All five cases avoid invented facts and four are useful.',
        failureSignals: ['Invented customer facts', 'A user cannot distinguish facts from hypotheses'],
      },
      troubleshooting: [
        { symptom: 'Output is generic', likelyCause: 'The instructions lack the sales context.', correction: 'Add the sales stage, meeting goal, and output sections.' },
        { symptom: 'The prototype requests real data', likelyCause: 'The example input is underspecified.', correction: 'Replace it with a complete fictional example.' },
      ],
      resources: [
        { catalogId: 'tool-landscape', useAtStepId: 'step-2', title: 'Chat, app, and agent differences', whyNow: 'The learner must choose the simplest level.', searchFor: 'official chat app agent differences beginner', format: 'Six-minute explainer', durationMinutes: 6, actionAfter: 'Classify this prototype and explain why it is not yet an agent.' },
      ],
      completion: {
        capability: 'I can explain and test a bounded AI application.',
        artifact: 'I made a private Sales Call Prep Assistant.',
        proof: 'I proved it with five cases, two users, and documented limitations.',
        nextChoices: ['Stop with the configured assistant', 'Improve the private prototype', 'Prepare a developer handoff'],
        recommendedNext: 'Stop with the configured assistant',
      },
    },
    notNow: ['CRM integration', 'Production deployment', 'Authentication', 'Multiple agents'],
    assumptions: ['An approved chat tool is already available.'],
  }
}

test('accepts a complete execution pack and serializes the how-to detail', () => {
  const analysis = fixture()
  assert.equal(isCompassAnalysis(analysis), true)
  const serialized = serializeAnalysis(analysis)
  assert.match(serialized, /EXACT BUILD RECIPE/)
  assert.match(serialized, /Use only the fictional notes/)
  assert.match(serialized, /Cost guard:/)
  assert.match(serialized, /I proved it with:/)
  assert.doesNotMatch(serialized, /undefined|\[object Object\]/)
})

test('rejects missing required top-level sections', async t => {
  for (const key of ['route', 'profileSignals', 'priorities', 'executionPack', 'notNow']) {
    await t.test(key, () => {
      const analysis = fixture()
      delete analysis[key]
      assert.equal(isCompassAnalysis(analysis), false)
    })
  }
})

test('rejects unresolved, duplicate, and inconsistent step references', () => {
  const brokenReference = fixture()
  brokenReference.executionPack.weeks[1].stepIds = ['missing-step']
  assert.equal(isCompassAnalysis(brokenReference), false)

  const duplicate = fixture()
  duplicate.executionPack.steps[1].id = 'step-1'
  assert.equal(isCompassAnalysis(duplicate), false)

  const wrongTotal = fixture()
  wrongTotal.executionPack.outcome.totalMinutes = 999
  assert.equal(isCompassAnalysis(wrongTotal), false)

  const backwardBand = fixture()
  backwardBand.route.currentBand = '50-75'
  backwardBand.route.targetBand = '30-50'
  assert.equal(isCompassAnalysis(backwardBand), false)

  const missingStart = fixture()
  missingStart.executionPack.first72HourStepIds = ['step-2']
  assert.equal(isCompassAnalysis(missingStart), false)

  const duplicateAcrossWeeks = fixture()
  duplicateAcrossWeeks.executionPack.weeks[1].stepIds = ['step-2', 'step-3']
  assert.equal(isCompassAnalysis(duplicateAcrossWeeks), false)

  const overCapacity = fixture()
  overCapacity.executionPack.outcome.availableMinutes = 120
  assert.equal(isCompassAnalysis(overCapacity), false)
})

test('rejects nested fields the result UI renders directly', () => {
  const missingFallback = fixture()
  missingFallback.executionPack.tools[0].fallback = ''
  assert.equal(isCompassAnalysis(missingFallback), false)

  const missingRecovery = fixture()
  missingRecovery.executionPack.steps[0].ifStuck.fix = ''
  assert.equal(isCompassAnalysis(missingRecovery), false)

  const missingEnding = fixture()
  missingEnding.executionPack.completion.proof = ''
  assert.equal(isCompassAnalysis(missingEnding), false)
})

test('requires the recommended next action to be one of the learner choices', () => {
  const analysis = fixture()
  analysis.executionPack.completion.recommendedNext = 'Buy a production platform'
  assert.equal(isCompassAnalysis(analysis), false)
})

test('maintained catalogs always include safe access, data, and action guidance', () => {
  assert.ok(compassToolCatalog.length >= 5)
  assert.ok(compassToolCatalog.every(tool => tool.accessGuard && tool.dataGuard && tool.fallback))
  assert.ok(compassResourceCatalog.length >= 4)
  assert.ok(compassResourceCatalog.every(resource => resource.url.startsWith('https://') && resource.source && resource.section && resource.reviewedAt && resource.actionAfter))
})

test('rejects unknown catalog choices and ambiguous primary tools', () => {
  const unknownTool = fixture()
  unknownTool.executionPack.tools[0].catalogId = 'surprise-paid-tool'
  assert.equal(isCompassAnalysis(unknownTool), false)

  const ambiguousTool = fixture()
  ambiguousTool.executionPack.tools[0].name = 'ChatGPT or Gemini'
  assert.equal(isCompassAnalysis(ambiguousTool), false)

  const unknownResource = fixture()
  unknownResource.executionPack.resources[0].catalogId = 'unreviewed-video'
  assert.equal(isCompassAnalysis(unknownResource), false)
})

test('allows omitted optional step fields but rejects explicit nulls', () => {
  const omitted = fixture()
  assert.equal(isCompassAnalysis(omitted), true)

  const nullTool = fixture()
  nullTool.executionPack.steps[0].toolId = null
  assert.equal(isCompassAnalysis(nullTool), false)

  const nullPrompt = fixture()
  nullPrompt.executionPack.steps[2].copyPrompt = null
  assert.equal(isCompassAnalysis(nullPrompt), false)
})

test('normalizes only deterministic derived fields before validation', () => {
  const analysis = fixture()
  analysis.executionPack.outcome.totalMinutes = 999
  analysis.executionPack.completion.recommendedNext = 'Not one of the choices'
  normalizeCompassAnalysis(analysis)
  assert.equal(analysis.executionPack.outcome.totalMinutes, 150)
  assert.equal(analysis.executionPack.completion.recommendedNext, analysis.executionPack.completion.nextChoices[0])
  assert.equal(isCompassAnalysis(analysis), true)
})

test('interview turns require complete renderable questions and valid focus values', () => {
  const turn = {
    acknowledgement: 'You want a sales preparation tool.',
    interpretation: 'The exact workflow still needs evidence.',
    nextQuestion: { id: 'workflow', focus: 'workflow', eyebrow: 'Map the work', prompt: 'What happens today?', helper: 'Include inputs and outputs.', placeholder: 'Today, a seller…' },
    profile: { oneLineGoal: 'Create a sales preparation tool.', knownSignals: [{ label: 'Role', value: 'Sales leader' }], stillMissing: 'Available time and tool access.' },
  }
  assert.equal(isInterviewTurn(turn), true)
  assert.equal(isInterviewTurn({ ...turn, nextQuestion: { ...turn.nextQuestion, focus: 'personality' } }), false)
  assert.equal(isInterviewTurn({ ...turn, profile: { ...turn.profile, stillMissing: '' } }), false)
})
