import type {
  CatalogDifficulty,
  CatalogLearningMode,
  CatalogResourceV1,
  CatalogSnapshotV1,
  ResourceFormat,
  SkillId,
  SkillLevel,
} from './catalog'

// Deliberately pinned here so this draft snapshot remains directly loadable by
// Node's TypeScript test runner. validateCatalogSnapshot detects version drift.
const AI_PATH_CATALOG_VERSION = '2026-07-16.v1' as const
const AI_PATH_CATALOG_SCHEMA_VERSION = '2026-07-16.v1' as const
const AI_PATH_CATALOG_TARGET_AUDIENCE = 'workflow-builder-alpha' as const

const CAPTURED_AT = '2026-07-16T00:00:00.000Z'
const VERIFIED_AT = '2026-07-17T01:17:17.000Z'
const LINK_CHECK_DUE_AT = '2026-08-16T01:17:17.000Z'
const REVIEW_DUE_AT = '2026-10-15T01:17:17.000Z'

type SeedInput = {
  id: string
  title: string
  provider: string
  canonicalUrl: string | null
  format: ResourceFormat
  difficulty: CatalogDifficulty
  learningModes: CatalogLearningMode[]
  estimatedMinutes: number
  qualityScore: number
  skills: Array<{ skillId: SkillId; entryLevel: SkillLevel; exitLevel: SkillLevel }>
  prerequisites: Array<{ skillId: SkillId; minimumLevel: SkillLevel }>
  outcome: string
  reason: string
  provenanceOrigin: 'provider-owned' | 'editorial' | 'first-party'
  sourceReference: string
  disclosure: string
  costDisclosure: string
  costKind?: 'free' | 'freemium'
  linkHealth?: {
    status: 'healthy' | 'redirected'
    httpStatus: number
    finalUrl: string | null
  }
}

function seed(input: SeedInput): CatalogResourceV1 {
  const internal = input.canonicalUrl === null
  return {
    schemaVersion: AI_PATH_CATALOG_SCHEMA_VERSION,
    catalogVersion: AI_PATH_CATALOG_VERSION,
    id: input.id,
    status: 'active',
    title: input.title,
    provider: input.provider,
    canonicalUrl: input.canonicalUrl,
    format: input.format,
    difficulty: input.difficulty,
    learningModes: input.learningModes,
    languages: ['en'],
    estimatedMinutes: input.estimatedMinutes,
    qualityScore: input.qualityScore,
    targetAudiences: [AI_PATH_CATALOG_TARGET_AUDIENCE],
    skills: input.skills,
    prerequisites: input.prerequisites,
    outcome: input.outcome,
    reason: input.reason,
    cost: {
      kind: input.costKind ?? 'free',
      currency: null,
      amount: null,
      verifiedAt: VERIFIED_AT,
      disclosure: input.costDisclosure,
    },
    provenance: {
      origin: input.provenanceOrigin,
      sourceReference: input.sourceReference,
      capturedAt: CAPTURED_AT,
      capturedBy: 'catalog-review:private-alpha-v1',
      disclosure: input.disclosure,
    },
    review: {
      status: 'approved',
      lastReviewedAt: VERIFIED_AT,
      reviewCadenceDays: 90,
      reviewDueAt: REVIEW_DUE_AT,
      reviewerId: 'catalog-editor:private-alpha',
    },
    linkHealth: internal
      ? {
          status: 'not-applicable',
          checkedAt: null,
          nextCheckDueAt: null,
          httpStatus: null,
          finalUrl: null,
        }
      : input.linkHealth
        ? {
            ...input.linkHealth,
            checkedAt: VERIFIED_AT,
            nextCheckDueAt: LINK_CHECK_DUE_AT,
          }
        : {
            status: 'unchecked',
            checkedAt: null,
            nextCheckDueAt: null,
            httpStatus: null,
            finalUrl: null,
          },
  }
}

/**
 * Published private-alpha catalog. External links were checked read-only using
 * a bounded HEAD request and reviewed against provider-owned page content.
 * Publication remains fail-closed at report time when any gate becomes stale.
 */
export const AI_PATH_CATALOG_V1: CatalogSnapshotV1 = {
  schemaVersion: AI_PATH_CATALOG_SCHEMA_VERSION,
  catalogVersion: AI_PATH_CATALOG_VERSION,
  publicationStatus: 'published',
  generatedAt: VERIFIED_AT,
  publishedAt: VERIFIED_AT,
  targetAudience: AI_PATH_CATALOG_TARGET_AUDIENCE,
  resources: [
    seed({
      id: 'google-machine-learning-crash-course',
      title: 'Machine Learning Crash Course',
      provider: 'Google for Developers',
      canonicalUrl: 'https://developers.google.com/machine-learning/crash-course',
      format: 'course',
      difficulty: 'beginner',
      learningModes: ['guided', 'hands-on'],
      estimatedMinutes: 720,
      qualityScore: 0.93,
      skills: [{ skillId: 'foundations', entryLevel: 0, exitLevel: 2 }],
      prerequisites: [],
      outcome: 'Explain core machine-learning concepts and apply them in guided exercises.',
      reason: 'Offers a structured, provider-authored foundation for learners who need conceptual depth before implementation.',
      provenanceOrigin: 'provider-owned',
      sourceReference: 'https://developers.google.com/machine-learning/crash-course',
      disclosure: 'Provider page verified the title, practical course format, modules, and exercises; duration remains an editorial estimate.',
      costDisclosure: 'The provider page is openly accessible and no purchase is required to use the course materials.',
      linkHealth: { status: 'healthy', httpStatus: 200, finalUrl: null },
    }),
    seed({
      id: 'deeplearning-ai-generative-ai-for-everyone',
      title: 'Generative AI for Everyone',
      provider: 'DeepLearning.AI',
      canonicalUrl: 'https://www.deeplearning.ai/courses/generative-ai-for-everyone/',
      format: 'course',
      difficulty: 'introductory',
      learningModes: ['guided'],
      estimatedMinutes: 300,
      qualityScore: 0.91,
      skills: [
        { skillId: 'foundations', entryLevel: 0, exitLevel: 2 },
        { skillId: 'workflow-design', entryLevel: 0, exitLevel: 2 },
      ],
      prerequisites: [],
      outcome: 'Identify practical generative-AI use cases, limitations, and organizational considerations.',
      reason: 'Fits non-coding workflow builders who need capability judgment before choosing tools or architecture.',
      provenanceOrigin: 'provider-owned',
      sourceReference: 'https://www.deeplearning.ai/courses/generative-ai-for-everyone/',
      disclosure: 'Provider page verified a five-hour beginner course and identifies graded assignments and certificates as PRO features.',
      costDisclosure: 'Course access is freemium; graded assignments and certificates require DeepLearning.AI PRO.',
      costKind: 'freemium',
      linkHealth: {
        status: 'redirected',
        httpStatus: 308,
        finalUrl: 'https://www.deeplearning.ai/courses/generative-ai-for-everyone',
      },
    }),
    seed({
      id: 'openai-api-quickstart',
      title: 'OpenAI API quickstart',
      provider: 'OpenAI',
      canonicalUrl: 'https://developers.openai.com/api/docs/quickstart',
      format: 'reading',
      difficulty: 'beginner',
      learningModes: ['guided', 'hands-on'],
      estimatedMinutes: 120,
      qualityScore: 0.92,
      skills: [
        { skillId: 'coding-apis', entryLevel: 1, exitLevel: 2 },
        { skillId: 'prompt-context', entryLevel: 1, exitLevel: 2 },
      ],
      prerequisites: [{ skillId: 'foundations', minimumLevel: 1 }],
      outcome: 'Build and inspect a small model-backed API integration with structured application code.',
      reason: 'Provides a short bridge from conceptual knowledge to a bounded implementation for learners ready to code.',
      provenanceOrigin: 'provider-owned',
      sourceReference: 'https://developers.openai.com/api/docs/quickstart',
      disclosure: 'Provider documentation may lead to optional paid API use; the catalog recommendation itself does not enable or purchase access.',
      costDisclosure: 'Reading the guide is free; completing the API exercise can require paid API usage.',
      linkHealth: { status: 'healthy', httpStatus: 200, finalUrl: null },
    }),
    seed({
      id: 'owasp-llm-prompt-injection-prevention',
      title: 'LLM Prompt Injection Prevention Cheat Sheet',
      provider: 'OWASP',
      canonicalUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html',
      format: 'reference',
      difficulty: 'intermediate',
      learningModes: ['reference', 'hands-on'],
      estimatedMinutes: 120,
      qualityScore: 0.97,
      skills: [
        { skillId: 'safety-governance', entryLevel: 1, exitLevel: 3 },
        { skillId: 'agents-tools', entryLevel: 1, exitLevel: 2 },
      ],
      prerequisites: [],
      outcome: 'Recognize prompt-injection attack paths and apply bounded mitigations to tool-using workflows.',
      reason: 'Adds a vendor-neutral security reference for learners whose project handles untrusted content or tools.',
      provenanceOrigin: 'provider-owned',
      sourceReference: 'https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html',
      disclosure: 'Provider page and canonical URL were verified; duration remains an editorial estimate.',
      costDisclosure: 'The provider reference is openly accessible and does not require a purchase.',
      linkHealth: { status: 'healthy', httpStatus: 200, finalUrl: null },
    }),
    seed({
      id: 'free-ai-school-workflow-evidence-sprint',
      title: 'AI workflow evidence sprint',
      provider: 'Free AI School',
      canonicalUrl: null,
      format: 'project',
      difficulty: 'beginner',
      learningModes: ['project', 'hands-on'],
      estimatedMinutes: 360,
      qualityScore: 0.88,
      skills: [
        { skillId: 'workflow-design', entryLevel: 1, exitLevel: 3 },
        { skillId: 'evaluation-reliability', entryLevel: 1, exitLevel: 2 },
      ],
      prerequisites: [{ skillId: 'foundations', minimumLevel: 1 }],
      outcome: 'Produce a workflow map, a small evaluation set, a tested artifact, and a short outcome log.',
      reason: 'Turns learning into inspectable evidence and anchors the plan in a useful work artifact rather than course completion.',
      provenanceOrigin: 'first-party',
      sourceReference: 'docs/ai-path/CATALOG.md#first-party-evidence-sprint',
      disclosure: 'Original project specification; it has no external URL and must be delivered as first-party plan content.',
      costDisclosure: 'This first-party project is free and does not require a paid service.',
    }),
    seed({
      id: 'free-ai-school-context-evaluation-sprint',
      title: 'Context and instruction evaluation sprint',
      provider: 'Free AI School',
      canonicalUrl: null,
      format: 'project',
      difficulty: 'beginner',
      learningModes: ['project', 'hands-on'],
      estimatedMinutes: 240,
      qualityScore: 0.87,
      skills: [
        { skillId: 'prompt-context', entryLevel: 1, exitLevel: 3 },
        { skillId: 'evaluation-reliability', entryLevel: 1, exitLevel: 3 },
      ],
      prerequisites: [{ skillId: 'foundations', minimumLevel: 1 }],
      outcome: 'Produce a versioned instruction, a representative test set, and evidence showing which context changes improve results.',
      reason: 'Provides a free, tool-agnostic route from ad hoc prompting to repeatable context design and evaluation.',
      provenanceOrigin: 'first-party',
      sourceReference: 'docs/ai-path/CATALOG.md#first-party-context-evaluation-sprint',
      disclosure: 'Original project specification; it has no external URL and must be delivered as first-party plan content.',
      costDisclosure: 'This first-party project is free and can be completed with tools the learner already has.',
    }),
    seed({
      id: 'free-ai-school-grounded-retrieval-sprint',
      title: 'Grounded retrieval evidence sprint',
      provider: 'Free AI School',
      canonicalUrl: null,
      format: 'project',
      difficulty: 'intermediate',
      learningModes: ['project', 'hands-on'],
      estimatedMinutes: 300,
      qualityScore: 0.88,
      skills: [
        { skillId: 'data-retrieval', entryLevel: 1, exitLevel: 3 },
        { skillId: 'evaluation-reliability', entryLevel: 1, exitLevel: 3 },
      ],
      prerequisites: [{ skillId: 'prompt-context', minimumLevel: 1 }],
      outcome: 'Build a source-grounded prototype with citations, retrieval tests, and documented behavior when evidence is missing.',
      reason: 'Fills the retrieval gap with an inspectable artifact that tests grounding quality without requiring a paid API.',
      provenanceOrigin: 'first-party',
      sourceReference: 'docs/ai-path/CATALOG.md#first-party-grounded-retrieval-sprint',
      disclosure: 'Original project specification; it has no external URL and must be delivered as first-party plan content.',
      costDisclosure: 'This first-party project is free and does not require a hosted vector database or paid API.',
    }),
    seed({
      id: 'free-ai-school-bounded-agent-sprint',
      title: 'Bounded tool-using agent sprint',
      provider: 'Free AI School',
      canonicalUrl: null,
      format: 'project',
      difficulty: 'intermediate',
      learningModes: ['project', 'hands-on'],
      estimatedMinutes: 360,
      qualityScore: 0.89,
      skills: [
        { skillId: 'agents-tools', entryLevel: 1, exitLevel: 3 },
        { skillId: 'safety-governance', entryLevel: 1, exitLevel: 3 },
        { skillId: 'evaluation-reliability', entryLevel: 1, exitLevel: 2 },
      ],
      prerequisites: [{ skillId: 'workflow-design', minimumLevel: 1 }],
      outcome: 'Produce a constrained tool workflow with explicit permissions, human approval points, and abuse-case tests.',
      reason: 'Turns agent concepts into a bounded safety artifact before a learner attempts broader autonomy.',
      provenanceOrigin: 'first-party',
      sourceReference: 'docs/ai-path/CATALOG.md#first-party-bounded-agent-sprint',
      disclosure: 'Original project specification; it has no external URL and must be delivered as first-party plan content.',
      costDisclosure: 'This first-party project is free and may be completed with mocked tool calls instead of a paid service.',
    }),
    seed({
      id: 'free-ai-school-operational-pilot-sprint',
      title: 'Reliable AI workflow pilot sprint',
      provider: 'Free AI School',
      canonicalUrl: null,
      format: 'project',
      difficulty: 'intermediate',
      learningModes: ['project', 'hands-on'],
      estimatedMinutes: 360,
      qualityScore: 0.88,
      skills: [
        { skillId: 'deployment-operations', entryLevel: 1, exitLevel: 3 },
        { skillId: 'evaluation-reliability', entryLevel: 1, exitLevel: 3 },
        { skillId: 'safety-governance', entryLevel: 1, exitLevel: 2 },
      ],
      prerequisites: [{ skillId: 'workflow-design', minimumLevel: 2 }],
      outcome: 'Run a bounded pilot with release checks, monitoring signals, rollback steps, and an incident rehearsal.',
      reason: 'Fills the operations gap with evidence of safe, repeatable delivery rather than a production launch requirement.',
      provenanceOrigin: 'first-party',
      sourceReference: 'docs/ai-path/CATALOG.md#first-party-operational-pilot-sprint',
      disclosure: 'Original project specification; it has no external URL and must be delivered as first-party plan content.',
      costDisclosure: 'This first-party project is free and can use a local or simulated pilot with no paid infrastructure.',
    }),
  ],
}
