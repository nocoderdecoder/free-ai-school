export type PlanWeek = {
  week: string
  theme: string
  outcome: string
  tasks: [string, string, string]
}

export type PlanBlueprint = {
  title: string
  proof: string
  focusNow: string
  notYet: string
  firstTask: string
  weeks: [PlanWeek, PlanWeek, PlanWeek, PlanWeek]
}

const commonFinalTasks: [string, string, string] = [
  'Package the work, evidence, and operating notes',
  'Ask one relevant person to review or use it',
  'Capture what changed and choose the next learning edge',
]

const blueprints: Record<string, PlanBlueprint> = {
  workflows: {
    title: 'From a manual process to a reliable AI-assisted workflow.',
    proof: 'A documented workflow a colleague can run, review, and improve without you.',
    focusNow: 'Workflow decomposition, structured outputs, human checkpoints, and a lightweight quality rubric.',
    notYet: 'Multi-agent orchestration, fine-tuning, and infrastructure that the first useful workflow does not require.',
    firstTask: 'Map one recurring workflow from input to trusted output',
    weeks: [
      { week: 'Week 1', theme: 'Map the workflow', outcome: 'A one-page map with inputs, decisions, outputs, and failure points.', tasks: ['Choose one recurring task with a measurable outcome', 'Map the current process and human decisions', 'Write a five-point quality checklist'] },
      { week: 'Week 2', theme: 'Build the first version', outcome: 'One end-to-end run on realistic material.', tasks: ['Create a constrained prompt and output format', 'Run the workflow on a real example', 'Review every output against the checklist'] },
      { week: 'Week 3', theme: 'Make it repeatable', outcome: 'Two runs that surface failures consistently.', tasks: ['Repeat the workflow on a different example', 'Log quality, source, and handoff failures', 'Add one verification or recovery step'] },
      { week: 'Week 4', theme: 'Prove and share', outcome: 'A workflow package another person can operate.', tasks: commonFinalTasks },
    ],
  },
  builder: {
    title: 'From an idea to a bounded, tested AI application.',
    proof: 'A small deployed app with one model interaction, clear failure handling, and a short evaluation set.',
    focusNow: 'One user job, structured model output, API boundaries, evaluation examples, and a deployable vertical slice.',
    notYet: 'Multi-agent systems, custom model training, elaborate retrieval, and scale architecture before usage exists.',
    firstTask: 'Write the one-sentence user job and success test',
    weeks: [
      { week: 'Week 1', theme: 'Bound the product', outcome: 'A one-page spec with user, job, input, output, and failure cases.', tasks: ['Write one user story and success condition', 'Choose the smallest model-backed interaction', 'Create five representative input-output examples'] },
      { week: 'Week 2', theme: 'Build the vertical slice', outcome: 'A local end-to-end path with validated structured output.', tasks: ['Connect one model API behind a server route', 'Validate the model response before rendering', 'Add loading, error, and refusal states'] },
      { week: 'Week 3', theme: 'Test and deploy', outcome: 'A private deployment with repeatable checks.', tasks: ['Run the five examples and record failures', 'Fix the highest-impact failure mode', 'Deploy behind authentication and cost limits'] },
      { week: 'Week 4', theme: 'Prove and share', outcome: 'A demo and evidence package a reviewer can inspect.', tasks: commonFinalTasks },
    ],
  },
  career: {
    title: 'From learning activity to role-relevant proof.',
    proof: 'A public-safe portfolio case study mapped to a real role and reviewed by one person in that field.',
    focusNow: 'Target-role evidence, one representative project, decision documentation, and clear before/after outcomes.',
    notYet: 'Broad certificate collecting, advanced topics absent from target job descriptions, and generic tutorial clones.',
    firstTask: 'Compare five target roles and extract repeated proof requirements',
    weeks: [
      { week: 'Week 1', theme: 'Choose the proof', outcome: 'A role-to-evidence map based on real job descriptions.', tasks: ['Collect five representative target roles', 'Highlight repeated skills and outcomes', 'Choose one project that can prove two repeated needs'] },
      { week: 'Week 2', theme: 'Build the case', outcome: 'A working artifact that solves a role-relevant problem.', tasks: ['Write the user, constraint, and success measure', 'Build the smallest useful project version', 'Record decisions, failures, and tradeoffs'] },
      { week: 'Week 3', theme: 'Make the proof legible', outcome: 'A concise case study with evidence instead of claims.', tasks: ['Capture before-and-after workflow evidence', 'Write a one-page case study', 'Remove confidential data and unsupported claims'] },
      { week: 'Week 4', theme: 'Test the signal', outcome: 'Feedback from someone close to the target role.', tasks: commonFinalTasks },
    ],
  },
  leader: {
    title: 'From AI enthusiasm to an accountable initiative.',
    proof: 'A decision-ready pilot brief with value, risk, ownership, measurement, and stop criteria.',
    focusNow: 'Use-case selection, workflow ownership, baseline metrics, risk review, and a bounded pilot decision.',
    notYet: 'Organization-wide platform bets, vendor lock-in, and autonomous deployment before a pilot earns expansion.',
    firstTask: 'Score three candidate use cases on value, feasibility, and risk',
    weeks: [
      { week: 'Week 1', theme: 'Choose deliberately', outcome: 'A ranked use-case shortlist with explicit tradeoffs.', tasks: ['Collect three recurring team pain points', 'Score value, feasibility, data readiness, and risk', 'Select one use case and name an accountable owner'] },
      { week: 'Week 2', theme: 'Design the pilot', outcome: 'A pilot brief with boundaries and human oversight.', tasks: ['Map the current workflow and baseline', 'Define user, data, permission, and review boundaries', 'Write success and stop criteria'] },
      { week: 'Week 3', theme: 'Pressure-test', outcome: 'A reviewed risk register and measurement plan.', tasks: ['Run a failure-mode workshop', 'Choose outcome, quality, adoption, and cost measures', 'Plan incident, rollback, and escalation ownership'] },
      { week: 'Week 4', theme: 'Make the decision', outcome: 'A go, revise, or stop recommendation leaders can inspect.', tasks: commonFinalTasks },
    ],
  },
  foundations: {
    title: 'From scattered concepts to an applied mental model.',
    proof: 'A plain-language concept map plus one small experiment that explains capabilities, limits, and evaluation.',
    focusNow: 'Model behavior, prompting and context, hallucination, evaluation, privacy, and choosing suitable tasks.',
    notYet: 'Training mathematics, framework churn, and infrastructure internals before the core mental model is stable.',
    firstTask: 'Write your current explanation of how an LLM produces an answer',
    weeks: [
      { week: 'Week 1', theme: 'Build the mental model', outcome: 'A one-page map of models, context, outputs, and limits.', tasks: ['Write your current explanation before studying', 'Learn the core model and context concepts', 'Revise the map and mark remaining questions'] },
      { week: 'Week 2', theme: 'Run controlled experiments', outcome: 'A comparison showing how instructions and context change outputs.', tasks: ['Choose one bounded task and three prompt variants', 'Hold the input constant and compare results', 'Explain the differences in plain language'] },
      { week: 'Week 3', theme: 'Learn to evaluate', outcome: 'A small rubric that exposes plausible but wrong output.', tasks: ['Define four quality criteria', 'Test strong, weak, and adversarial examples', 'Add privacy and human-review boundaries'] },
      { week: 'Week 4', theme: 'Teach and apply', outcome: 'A public-safe explainer and useful mini-workflow.', tasks: commonFinalTasks },
    ],
  },
  unsure: {
    title: 'From curiosity to one evidence-based learning direction.',
    proof: 'Three tiny experiments, a comparison log, and a justified choice of what to learn next.',
    focusNow: 'Exploring real tasks, comparing usefulness and risk, and noticing which kind of work creates energy and value.',
    notYet: 'Committing to a long course, tool stack, or job title before small experiments clarify the direction.',
    firstTask: 'List three recurring tasks where better speed or quality would matter',
    weeks: [
      { week: 'Week 1', theme: 'Find candidate problems', outcome: 'Three bounded tasks worth a short experiment.', tasks: ['List recurring tasks that consume attention', 'Score each for value, repetition, and privacy risk', 'Choose three different task types to explore'] },
      { week: 'Week 2', theme: 'Run three experiments', outcome: 'Comparable notes from three 30-minute trials.', tasks: ['Try a synthesis or writing task', 'Try an analysis or classification task', 'Try a workflow or building task'] },
      { week: 'Week 3', theme: 'Compare honestly', outcome: 'A direction chosen from evidence rather than hype.', tasks: ['Compare usefulness, enjoyment, difficulty, and risk', 'Identify the repeated skill gap', 'Choose one 30-day direction and define proof'] },
      { week: 'Week 4', theme: 'Commit lightly', outcome: 'A first artifact and a clear continue-or-change decision.', tasks: commonFinalTasks },
    ],
  },
}

export function getPlanBlueprint(goalType: string): PlanBlueprint {
  return structuredClone(blueprints[goalType] ?? blueprints.unsure)
}
