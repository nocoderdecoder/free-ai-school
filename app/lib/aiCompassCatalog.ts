export type CompassCatalogTool = {
  id: string
  names: string
  useWhen: string
  accessGuard: string
  dataGuard: string
  fallback: string
}

export type CompassCatalogResource = {
  id: string
  topic: string
  useWhen: string
  preferredFormat: string
  title: string
  source: string
  url: string
  section: string
  reviewedAt: string
  searchFor: string
  actionAfter: string
}

// Keep this list deliberately small. It guides the model toward a usable stack
// without turning the recommendation into a volatile product directory.
export const compassToolCatalog: CompassCatalogTool[] = [
  {
    id: 'existing-chat',
    names: 'The learner’s existing approved ChatGPT, Gemini, or Claude chat',
    useWhen: 'Testing a task manually, learning core chat skills, or proving behavior before building.',
    accessGuard: 'Use an account the learner already has. Never require an upgrade, trial, API key, or billing setup.',
    dataGuard: 'Use public, fictional, or explicitly approved sanitized information only.',
    fallback: 'Use another already-available chat tool or complete the exercise on paper with supplied examples.',
  },
  {
    id: 'configured-assistant',
    names: 'Gemini Gem, ChatGPT custom GPT, Claude Project, or equivalent approved workspace assistant',
    useWhen: 'The same instructions and reference material should be reused without a custom interface.',
    accessGuard: 'Availability varies by account and organization. If unavailable or paid, save the instructions in a document and reuse them in normal chat.',
    dataGuard: 'Do not upload confidential workplace files unless the organization has explicitly approved that product and data use.',
    fallback: 'A saved master prompt plus a blank input template in the learner’s existing chat tool.',
  },
  {
    id: 'ai-studio-build',
    names: 'Google AI Studio Build mode',
    useWhen: 'A non-coder has already proven the behavior manually and now needs a private visual prototype.',
    accessGuard: 'Keep the prototype private. Stop if prompted for billing, a paid model, deployment, or a production API setup.',
    dataGuard: 'Use fictional or sanitized inputs; do not connect workplace systems or paste real customer data.',
    fallback: 'Keep the configured assistant, create a clickable mockup, or prepare a developer handoff brief.',
  },
  {
    id: 'spreadsheet',
    names: 'Google Sheets, Microsoft Excel, or a local spreadsheet already available to the learner',
    useWhen: 'Creating test cases, scorecards, before/after comparisons, or a lightweight audit trail.',
    accessGuard: 'Use an existing approved spreadsheet tool; no add-ons or paid templates are required.',
    dataGuard: 'Use synthetic examples or an approved sanitized dataset.',
    fallback: 'Use a plain table in a document or a local CSV file.',
  },
  {
    id: 'automation-builder',
    names: 'The learner’s organization-approved Power Automate, Zapier, Make, n8n, or equivalent',
    useWhen: 'A stable, repeated workflow needs triggers, deterministic steps, AI judgment, approval, and logging.',
    accessGuard: 'Choose only a tool already approved and available. Do not start a trial, connect production accounts, or enable paid actions.',
    dataGuard: 'Prototype with test accounts and synthetic records; minimize permissions and require human approval.',
    fallback: 'Run the workflow manually from a checklist until access, safety, and value are proven.',
  },
  {
    id: 'local-builder',
    names: 'An existing local code editor and Git repository, with an AI coding assistant only if already approved',
    useWhen: 'The learner has coding evidence or a developer partner and needs inspectable, versioned implementation work.',
    accessGuard: 'Use local deterministic tooling first. Do not provision hosting, databases, paid APIs, or cloud services.',
    dataGuard: 'Use local fixtures and synthetic data; keep secrets out of code and version control.',
    fallback: 'Produce a tested specification, mockup, prompt pack, and developer handoff instead of implementation.',
  },
]

export const compassResourceCatalog: CompassCatalogResource[] = [
  {
    id: 'tool-landscape',
    topic: 'Chat vs configured assistant vs automation vs app vs agent',
    useWhen: 'The learner cannot yet explain which level their outcome needs.',
    preferredFormat: 'Short official guide excerpt.',
    title: 'Get started with Gems in Gemini Apps',
    source: 'Google Gemini Apps Help',
    url: 'https://support.google.com/gemini/answer/15236321?hl=en',
    section: 'What are Gems?',
    reviewedAt: '2026-07-19',
    searchFor: 'chat assistant automation app agent differences beginner',
    actionAfter: 'Classify the planned solution and explain why a simpler level is or is not enough.',
  },
  {
    id: 'prompt-basics',
    topic: 'Goal, context, constraints, output format, and verification',
    useWhen: 'The learner cannot reliably improve a first chat response.',
    preferredFormat: 'Official guide excerpt or 5-minute walkthrough followed by one rewrite exercise.',
    title: 'Prompt engineering best practices',
    source: 'OpenAI API documentation',
    url: 'https://platform.openai.com/docs/guides/prompt-engineering',
    section: 'Read the first examples and the section most relevant to your task.',
    reviewedAt: '2026-07-19',
    searchFor: 'official prompt writing guide goal context constraints output verification',
    actionAfter: 'Rewrite the supplied prompt and compare both outputs with the plan’s scorecard.',
  },
  {
    id: 'builder-clickthrough',
    topic: 'Create and inspect a private AI prototype',
    useWhen: 'The learner has proven behavior manually but has never used a visual app builder.',
    preferredFormat: 'Official 5–10 minute click-through for the exact recommended builder.',
    title: 'Build apps in Google AI Studio',
    source: 'Google AI for Developers',
    url: 'https://ai.google.dev/gemini-api/docs/aistudio-build-mode',
    section: 'Get started and What is created?',
    reviewedAt: '2026-07-19',
    searchFor: 'official build mode create private prototype live preview instructions',
    actionAfter: 'Create only the empty interface, inspect its data and cost behavior, then continue the recipe.',
  },
  {
    id: 'workflow-safety',
    topic: 'Human approval, permissions, logs, failures, and recovery',
    useWhen: 'The pathway introduces automation or agent actions.',
    preferredFormat: 'Official documentation section plus a failure-mapping exercise.',
    title: 'Employ robust error handling',
    source: 'Microsoft Learn: Power Automate',
    url: 'https://learn.microsoft.com/en-us/power-automate/guidance/coding-guidelines/error-handling',
    section: 'Configure Run after settings and Log errors and send notifications.',
    reviewedAt: '2026-07-19',
    searchFor: 'official automation human approval least privilege logging error recovery',
    actionAfter: 'Add one approval point, one failure signal, and one manual fallback to the workflow.',
  },
  {
    id: 'evaluation-basics',
    topic: 'Test cases, rubrics, holdouts, and failure analysis',
    useWhen: 'The learner is moving from a promising demo to a repeatable or reliable system.',
    preferredFormat: 'Short practical tutorial using a spreadsheet scorecard.',
    title: 'Evaluation best practices',
    source: 'OpenAI API documentation',
    url: 'https://platform.openai.com/docs/guides/evaluation-best-practices',
    section: 'Read the evaluation workflow and criteria examples.',
    reviewedAt: '2026-07-19',
    searchFor: 'AI evaluation test cases rubric failure analysis beginner tutorial',
    actionAfter: 'Create five representative cases and score the current system before changing it.',
  },
]

export function compassCatalogForPrompt() {
  const tools = compassToolCatalog.map(tool => `- ${tool.id}: choose exactly one product from ${tool.names}. Use when: ${tool.useWhen} Access: ${tool.accessGuard} Data: ${tool.dataGuard} Fallback: ${tool.fallback}`).join('\n')
  const resources = compassResourceCatalog.map(resource => `- ${resource.id}: ${resource.topic}. Official resource: ${resource.title} by ${resource.source}, ${resource.url}. Read/watch: ${resource.section} Format: ${resource.preferredFormat} Use when: ${resource.useWhen} Then: ${resource.actionAfter}`).join('\n')
  return `APPROVED TOOL STARTING POINTS\n${tools}\n\nJUST-IN-TIME RESOURCE STARTING POINTS\n${resources}`
}
