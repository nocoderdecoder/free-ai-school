// Keep this validation boundary runtime-self-contained. Node's built-in
// TypeScript test runner does not resolve extensionless TypeScript imports,
// while the application compiler intentionally uses bundler resolution.
// Snapshot validation catches any drift from the foundation contract.
export const AI_PATH_CATALOG_VERSION = '2026-07-17.v2' as const
export const AI_PATH_CATALOG_SCHEMA_VERSION = '2026-07-16.v1' as const
export const AI_PATH_CATALOG_TARGET_AUDIENCE = 'workflow-builder-alpha' as const

export const AI_PATH_CATALOG_SKILL_IDS = [
  'foundations',
  'prompt-context',
  'workflow-design',
  'data-retrieval',
  'coding-apis',
  'agents-tools',
  'evaluation-reliability',
  'deployment-operations',
  'safety-governance',
] as const

export type SkillId = (typeof AI_PATH_CATALOG_SKILL_IDS)[number]
export type SkillLevel = 0 | 1 | 2 | 3 | 4
export type ResourceFormat = 'reading' | 'course' | 'project' | 'reference'

export type CatalogPublicationStatus = 'draft' | 'published' | 'retired'
export type CatalogResourceStatus = 'active' | 'paused' | 'retired'
export type CatalogDifficulty = 'introductory' | 'beginner' | 'intermediate' | 'advanced'
export type CatalogLearningMode = 'guided' | 'hands-on' | 'reference' | 'project'
export type CatalogCodingRequirement = 'none' | 'optional' | 'required'
export type CatalogAccountRequirement = 'none' | 'required'
export type CatalogPaidServiceRequirement = 'none' | 'optional' | 'required'
export type CatalogGoalType = 'workflows' | 'builder' | 'career' | 'leader' | 'foundations' | 'unsure'
export type CatalogCostKind = 'free' | 'freemium' | 'paid'
export type CatalogReviewStatus = 'approved' | 'changes-requested' | 'pending'
export type CatalogLinkStatus = 'unchecked' | 'healthy' | 'redirected' | 'broken' | 'not-applicable'
export type CatalogProvenanceOrigin = 'provider-owned' | 'editorial' | 'first-party'

export type CatalogSkillMapping = {
  skillId: SkillId
  entryLevel: SkillLevel
  exitLevel: SkillLevel
}

export type CatalogPrerequisite = {
  skillId: SkillId
  minimumLevel: SkillLevel
}

export type CatalogResourceV1 = {
  schemaVersion: typeof AI_PATH_CATALOG_SCHEMA_VERSION
  catalogVersion: typeof AI_PATH_CATALOG_VERSION
  id: string
  status: CatalogResourceStatus
  title: string
  provider: string
  canonicalUrl: string | null
  format: ResourceFormat
  difficulty: CatalogDifficulty
  learningModes: CatalogLearningMode[]
  codingRequirement: CatalogCodingRequirement
  accountRequirement: CatalogAccountRequirement
  paidServiceRequirement: CatalogPaidServiceRequirement
  deferredForGoalTypes: CatalogGoalType[]
  languages: string[]
  estimatedMinutes: number
  qualityScore: number
  targetAudiences: Array<typeof AI_PATH_CATALOG_TARGET_AUDIENCE>
  skills: CatalogSkillMapping[]
  prerequisites: CatalogPrerequisite[]
  outcome: string
  reason: string
  cost: {
    kind: CatalogCostKind
    currency: 'USD' | null
    amount: number | null
    verifiedAt: string
    disclosure: string
  }
  provenance: {
    origin: CatalogProvenanceOrigin
    sourceReference: string
    capturedAt: string
    capturedBy: string
    disclosure: string
  }
  review: {
    status: CatalogReviewStatus
    lastReviewedAt: string | null
    reviewCadenceDays: number
    reviewDueAt: string
    reviewerId: string | null
  }
  linkHealth: {
    status: CatalogLinkStatus
    checkedAt: string | null
    nextCheckDueAt: string | null
    httpStatus: number | null
    finalUrl: string | null
  }
}

export type CatalogSnapshotV1 = {
  schemaVersion: typeof AI_PATH_CATALOG_SCHEMA_VERSION
  catalogVersion: typeof AI_PATH_CATALOG_VERSION
  publicationStatus: CatalogPublicationStatus
  generatedAt: string
  publishedAt: string | null
  targetAudience: typeof AI_PATH_CATALOG_TARGET_AUDIENCE
  resources: CatalogResourceV1[]
}

export type CatalogValidationIssue = {
  path: string
  code: string
  message: string
}

export type CatalogValidationResult = {
  ok: boolean
  issues: CatalogValidationIssue[]
}

const skillIds = new Set<string>(AI_PATH_CATALOG_SKILL_IDS)
const resourceFormats = new Set<ResourceFormat>(['reading', 'course', 'project', 'reference'])
const difficulties = new Set<CatalogDifficulty>(['introductory', 'beginner', 'intermediate', 'advanced'])
const learningModes = new Set<CatalogLearningMode>(['guided', 'hands-on', 'reference', 'project'])
const codingRequirements = new Set<CatalogCodingRequirement>(['none', 'optional', 'required'])
const accountRequirements = new Set<CatalogAccountRequirement>(['none', 'required'])
const paidServiceRequirements = new Set<CatalogPaidServiceRequirement>(['none', 'optional', 'required'])
const goalTypes = new Set<CatalogGoalType>(['workflows', 'builder', 'career', 'leader', 'foundations', 'unsure'])
const resourceStatuses = new Set<CatalogResourceStatus>(['active', 'paused', 'retired'])
const publicationStatuses = new Set<CatalogPublicationStatus>(['draft', 'published', 'retired'])
const costKinds = new Set<CatalogCostKind>(['free', 'freemium', 'paid'])
const reviewStatuses = new Set<CatalogReviewStatus>(['approved', 'changes-requested', 'pending'])
const linkStatuses = new Set<CatalogLinkStatus>(['unchecked', 'healthy', 'redirected', 'broken', 'not-applicable'])
const provenanceOrigins = new Set<CatalogProvenanceOrigin>(['provider-owned', 'editorial', 'first-party'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isBoundedString(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length >= minimum && value.trim().length <= maximum
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname)
  } catch {
    return false
  }
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum
}

function isSkillLevel(value: unknown): value is SkillLevel {
  return isIntegerInRange(value, 0, 4)
}

function addIssue(issues: CatalogValidationIssue[], path: string, code: string, message: string) {
  issues.push({ path, code, message })
}

function sorted(issues: CatalogValidationIssue[]): CatalogValidationIssue[] {
  return issues.sort((left, right) =>
    left.path.localeCompare(right.path) || left.code.localeCompare(right.code) || left.message.localeCompare(right.message)
  )
}

export function addDaysIso(timestamp: string, days: number): string {
  return new Date(Date.parse(timestamp) + days * 86_400_000).toISOString()
}

function validateSkillMappings(
  value: unknown,
  path: string,
  issues: CatalogValidationIssue[]
) {
  if (!Array.isArray(value) || value.length === 0 || value.length > AI_PATH_CATALOG_SKILL_IDS.length) {
    addIssue(issues, path, 'invalid_skill_mappings', 'skills must contain 1-9 mappings')
    return
  }
  const seen = new Set<string>()
  value.forEach((mapping, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(mapping)) {
      addIssue(issues, itemPath, 'invalid_skill_mapping', 'skill mapping must be an object')
      return
    }
    if (typeof mapping.skillId !== 'string' || !skillIds.has(mapping.skillId)) {
      addIssue(issues, `${itemPath}.skillId`, 'unknown_skill', 'skillId must exist in the pinned taxonomy')
    } else if (seen.has(mapping.skillId)) {
      addIssue(issues, `${itemPath}.skillId`, 'duplicate_skill', 'skillId must be unique within a resource')
    } else {
      seen.add(mapping.skillId)
    }
    if (!isSkillLevel(mapping.entryLevel)) {
      addIssue(issues, `${itemPath}.entryLevel`, 'invalid_level', 'entryLevel must be 0-4')
    }
    if (!isSkillLevel(mapping.exitLevel)) {
      addIssue(issues, `${itemPath}.exitLevel`, 'invalid_level', 'exitLevel must be 0-4')
    }
    if (isSkillLevel(mapping.entryLevel) && isSkillLevel(mapping.exitLevel) && mapping.exitLevel <= mapping.entryLevel) {
      addIssue(issues, itemPath, 'non_advancing_mapping', 'exitLevel must be higher than entryLevel')
    }
  })
}

function validatePrerequisites(value: unknown, path: string, issues: CatalogValidationIssue[]) {
  if (!Array.isArray(value) || value.length > AI_PATH_CATALOG_SKILL_IDS.length) {
    addIssue(issues, path, 'invalid_prerequisites', 'prerequisites must be an array with at most 9 items')
    return
  }
  const seen = new Set<string>()
  value.forEach((prerequisite, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(prerequisite)) {
      addIssue(issues, itemPath, 'invalid_prerequisite', 'prerequisite must be an object')
      return
    }
    if (typeof prerequisite.skillId !== 'string' || !skillIds.has(prerequisite.skillId)) {
      addIssue(issues, `${itemPath}.skillId`, 'unknown_skill', 'skillId must exist in the pinned taxonomy')
    } else if (seen.has(prerequisite.skillId)) {
      addIssue(issues, `${itemPath}.skillId`, 'duplicate_prerequisite', 'prerequisite skillId must be unique')
    } else {
      seen.add(prerequisite.skillId)
    }
    if (!isSkillLevel(prerequisite.minimumLevel)) {
      addIssue(issues, `${itemPath}.minimumLevel`, 'invalid_level', 'minimumLevel must be 0-4')
    }
  })
}

function validateResource(
  value: unknown,
  index: number,
  asOf: string,
  issues: CatalogValidationIssue[]
): value is CatalogResourceV1 {
  const path = `resources[${index}]`
  if (!isRecord(value)) {
    addIssue(issues, path, 'invalid_resource', 'resource must be an object')
    return false
  }

  if (value.schemaVersion !== AI_PATH_CATALOG_SCHEMA_VERSION) {
    addIssue(issues, `${path}.schemaVersion`, 'schema_version_mismatch', 'resource schema version must match the snapshot')
  }
  if (value.catalogVersion !== AI_PATH_CATALOG_VERSION) {
    addIssue(issues, `${path}.catalogVersion`, 'catalog_version_mismatch', 'resource catalog version must match the snapshot')
  }
  if (typeof value.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id) || value.id.length > 100) {
    addIssue(issues, `${path}.id`, 'invalid_id', 'id must be a lowercase kebab-case identifier')
  }
  if (typeof value.status !== 'string' || !resourceStatuses.has(value.status as CatalogResourceStatus)) {
    addIssue(issues, `${path}.status`, 'invalid_status', 'status is not supported')
  }
  if (!isBoundedString(value.title, 3, 180)) addIssue(issues, `${path}.title`, 'invalid_title', 'title must contain 3-180 characters')
  if (!isBoundedString(value.provider, 2, 120)) addIssue(issues, `${path}.provider`, 'invalid_provider', 'provider must contain 2-120 characters')
  if (value.canonicalUrl !== null && !isHttpsUrl(value.canonicalUrl)) {
    addIssue(issues, `${path}.canonicalUrl`, 'invalid_url', 'canonicalUrl must be null or an HTTPS URL')
  }
  if (typeof value.format !== 'string' || !resourceFormats.has(value.format as ResourceFormat)) {
    addIssue(issues, `${path}.format`, 'invalid_format', 'format is not supported')
  }
  if (typeof value.difficulty !== 'string' || !difficulties.has(value.difficulty as CatalogDifficulty)) {
    addIssue(issues, `${path}.difficulty`, 'invalid_difficulty', 'difficulty is not supported')
  }
  if (!Array.isArray(value.learningModes) || value.learningModes.length === 0 || value.learningModes.some(mode => !learningModes.has(mode))) {
    addIssue(issues, `${path}.learningModes`, 'invalid_learning_modes', 'learningModes must contain supported values')
  }
  if (typeof value.codingRequirement !== 'string' || !codingRequirements.has(value.codingRequirement as CatalogCodingRequirement)) {
    addIssue(issues, `${path}.codingRequirement`, 'invalid_coding_requirement', 'codingRequirement must be none, optional, or required')
  }
  if (typeof value.accountRequirement !== 'string' || !accountRequirements.has(value.accountRequirement as CatalogAccountRequirement)) {
    addIssue(issues, `${path}.accountRequirement`, 'invalid_account_requirement', 'accountRequirement must be none or required')
  }
  if (typeof value.paidServiceRequirement !== 'string' || !paidServiceRequirements.has(value.paidServiceRequirement as CatalogPaidServiceRequirement)) {
    addIssue(issues, `${path}.paidServiceRequirement`, 'invalid_paid_service_requirement', 'paidServiceRequirement must be none, optional, or required')
  }
  if (!Array.isArray(value.deferredForGoalTypes) || value.deferredForGoalTypes.some(goalType => !goalTypes.has(goalType))) {
    addIssue(issues, `${path}.deferredForGoalTypes`, 'invalid_deferred_goal_types', 'deferredForGoalTypes must contain only supported goal types')
  } else if (new Set(value.deferredForGoalTypes).size !== value.deferredForGoalTypes.length) {
    addIssue(issues, `${path}.deferredForGoalTypes`, 'duplicate_deferred_goal_type', 'deferredForGoalTypes must be unique')
  }
  if (!Array.isArray(value.languages) || value.languages.length === 0 || value.languages.some(language => typeof language !== 'string' || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(language))) {
    addIssue(issues, `${path}.languages`, 'invalid_languages', 'languages must contain BCP-47-like language codes')
  }
  if (!isIntegerInRange(value.estimatedMinutes, 5, 60_000)) {
    addIssue(issues, `${path}.estimatedMinutes`, 'invalid_duration', 'estimatedMinutes must be an integer from 5-60000')
  }
  if (typeof value.qualityScore !== 'number' || value.qualityScore < 0 || value.qualityScore > 1) {
    addIssue(issues, `${path}.qualityScore`, 'invalid_quality_score', 'qualityScore must be from 0-1')
  }
  if (!Array.isArray(value.targetAudiences) || value.targetAudiences.length !== 1 || value.targetAudiences[0] !== AI_PATH_CATALOG_TARGET_AUDIENCE) {
    addIssue(issues, `${path}.targetAudiences`, 'invalid_audience', 'resource must target the alpha audience')
  }
  validateSkillMappings(value.skills, `${path}.skills`, issues)
  validatePrerequisites(value.prerequisites, `${path}.prerequisites`, issues)
  if (!isBoundedString(value.outcome, 20, 500)) addIssue(issues, `${path}.outcome`, 'invalid_outcome', 'outcome must contain 20-500 characters')
  if (!isBoundedString(value.reason, 20, 500)) addIssue(issues, `${path}.reason`, 'invalid_reason', 'reason must contain 20-500 characters')

  if (!isRecord(value.cost)) {
    addIssue(issues, `${path}.cost`, 'invalid_cost', 'cost must be an object')
  } else {
    const kind = typeof value.cost.kind === 'string' && costKinds.has(value.cost.kind as CatalogCostKind)
      ? value.cost.kind as CatalogCostKind
      : null
    if (!kind) addIssue(issues, `${path}.cost.kind`, 'invalid_cost_kind', 'cost kind is not supported')
    if (!isIsoTimestamp(value.cost.verifiedAt) || Date.parse(value.cost.verifiedAt as string) > Date.parse(asOf)) {
      addIssue(issues, `${path}.cost.verifiedAt`, 'invalid_cost_date', 'cost verification must be an ISO timestamp on or before asOf')
    }
    if (!isBoundedString(value.cost.disclosure, 10, 300)) {
      addIssue(issues, `${path}.cost.disclosure`, 'invalid_cost_disclosure', 'cost disclosure must contain 10-300 characters')
    }
    if (kind === 'free' && (value.cost.amount !== null || value.cost.currency !== null)) {
      addIssue(issues, `${path}.cost`, 'invalid_free_cost', 'free resources must have null amount and currency')
    }
    if (kind === 'paid' && (
      value.cost.currency !== 'USD' || typeof value.cost.amount !== 'number' || value.cost.amount < 0
    )) {
      addIssue(issues, `${path}.cost`, 'invalid_paid_cost', 'paid resources require a non-negative USD amount')
    }
    if (kind === 'freemium' && !(
      (value.cost.currency === null && value.cost.amount === null) ||
      (value.cost.currency === 'USD' && typeof value.cost.amount === 'number' && value.cost.amount >= 0)
    )) {
      addIssue(issues, `${path}.cost`, 'invalid_freemium_cost', 'freemium resources require either no price claim or a non-negative USD amount')
    }
  }

  if (!isRecord(value.provenance)) {
    addIssue(issues, `${path}.provenance`, 'missing_provenance', 'provenance must be an object')
  } else {
    const origin = typeof value.provenance.origin === 'string' && provenanceOrigins.has(value.provenance.origin as CatalogProvenanceOrigin)
      ? value.provenance.origin as CatalogProvenanceOrigin
      : null
    if (!origin) addIssue(issues, `${path}.provenance.origin`, 'invalid_origin', 'provenance origin is not supported')
    if (!isBoundedString(value.provenance.sourceReference, 3, 500)) addIssue(issues, `${path}.provenance.sourceReference`, 'invalid_source_reference', 'sourceReference is required')
    if (!isIsoTimestamp(value.provenance.capturedAt) || Date.parse(value.provenance.capturedAt as string) > Date.parse(asOf)) {
      addIssue(issues, `${path}.provenance.capturedAt`, 'invalid_capture_date', 'capturedAt must be an ISO timestamp on or before asOf')
    }
    if (!isBoundedString(value.provenance.capturedBy, 3, 100)) addIssue(issues, `${path}.provenance.capturedBy`, 'invalid_captured_by', 'capturedBy is required')
    if (!isBoundedString(value.provenance.disclosure, 10, 500)) addIssue(issues, `${path}.provenance.disclosure`, 'invalid_disclosure', 'provenance disclosure is required')
    if (value.canonicalUrl === null && origin !== 'first-party') {
      addIssue(issues, `${path}.canonicalUrl`, 'missing_external_url', 'only first-party resources may omit canonicalUrl')
    }
  }

  if (!isRecord(value.review)) {
    addIssue(issues, `${path}.review`, 'missing_review', 'review metadata must be an object')
  } else {
    const reviewStatus = typeof value.review.status === 'string' && reviewStatuses.has(value.review.status as CatalogReviewStatus)
      ? value.review.status as CatalogReviewStatus
      : null
    if (!reviewStatus) addIssue(issues, `${path}.review.status`, 'invalid_review_status', 'review status is not supported')
    if (value.review.lastReviewedAt !== null && (!isIsoTimestamp(value.review.lastReviewedAt) || Date.parse(value.review.lastReviewedAt as string) > Date.parse(asOf))) {
      addIssue(issues, `${path}.review.lastReviewedAt`, 'invalid_review_date', 'lastReviewedAt must be null or an ISO timestamp on or before asOf')
    }
    if (!isIntegerInRange(value.review.reviewCadenceDays, 7, 365)) {
      addIssue(issues, `${path}.review.reviewCadenceDays`, 'invalid_review_cadence', 'review cadence must be 7-365 days')
    }
    if (!isIsoTimestamp(value.review.reviewDueAt)) {
      addIssue(issues, `${path}.review.reviewDueAt`, 'invalid_review_due_date', 'reviewDueAt must be an ISO timestamp')
    }
    if (reviewStatus === 'approved' && (value.review.lastReviewedAt === null || !isBoundedString(value.review.reviewerId, 3, 100))) {
      addIssue(issues, `${path}.review`, 'incomplete_approval', 'approved resources require lastReviewedAt and reviewerId')
    }
    if (
      isIsoTimestamp(value.review.lastReviewedAt) &&
      isIntegerInRange(value.review.reviewCadenceDays, 7, 365) &&
      isIsoTimestamp(value.review.reviewDueAt) &&
      addDaysIso(value.review.lastReviewedAt, Number(value.review.reviewCadenceDays)) !== value.review.reviewDueAt
    ) {
      addIssue(issues, `${path}.review.reviewDueAt`, 'review_due_mismatch', 'reviewDueAt must equal lastReviewedAt plus reviewCadenceDays')
    }
  }

  if (!isRecord(value.linkHealth)) {
    addIssue(issues, `${path}.linkHealth`, 'missing_link_health', 'link health metadata must be an object')
  } else {
    const linkStatus = typeof value.linkHealth.status === 'string' && linkStatuses.has(value.linkHealth.status as CatalogLinkStatus)
      ? value.linkHealth.status as CatalogLinkStatus
      : null
    if (!linkStatus) addIssue(issues, `${path}.linkHealth.status`, 'invalid_link_status', 'link status is not supported')
    if (value.linkHealth.checkedAt !== null && (!isIsoTimestamp(value.linkHealth.checkedAt) || Date.parse(value.linkHealth.checkedAt as string) > Date.parse(asOf))) {
      addIssue(issues, `${path}.linkHealth.checkedAt`, 'invalid_link_check_date', 'checkedAt must be null or an ISO timestamp on or before asOf')
    }
    if (value.linkHealth.nextCheckDueAt !== null && !isIsoTimestamp(value.linkHealth.nextCheckDueAt)) {
      addIssue(issues, `${path}.linkHealth.nextCheckDueAt`, 'invalid_next_check_date', 'nextCheckDueAt must be null or an ISO timestamp')
    }
    if (linkStatus === 'unchecked' && (value.linkHealth.checkedAt !== null || value.linkHealth.httpStatus !== null || value.linkHealth.finalUrl !== null)) {
      addIssue(issues, `${path}.linkHealth`, 'invalid_unchecked_state', 'unchecked links cannot have check results')
    }
    if (linkStatus === 'not-applicable' && value.canonicalUrl !== null) {
      addIssue(issues, `${path}.linkHealth.status`, 'invalid_not_applicable_state', 'not-applicable is only valid without a canonicalUrl')
    }
    if (linkStatus && ['healthy', 'redirected', 'broken'].includes(linkStatus)) {
      if (!isIsoTimestamp(value.linkHealth.checkedAt)) addIssue(issues, `${path}.linkHealth.checkedAt`, 'missing_link_check', 'checked links require checkedAt')
      if (!isIntegerInRange(value.linkHealth.httpStatus, 100, 599)) addIssue(issues, `${path}.linkHealth.httpStatus`, 'invalid_http_status', 'checked links require an HTTP status')
      if (!isIsoTimestamp(value.linkHealth.nextCheckDueAt)) addIssue(issues, `${path}.linkHealth.nextCheckDueAt`, 'missing_next_check', 'checked links require nextCheckDueAt')
    }
    if (linkStatus === 'redirected' && !isHttpsUrl(value.linkHealth.finalUrl)) {
      addIssue(issues, `${path}.linkHealth.finalUrl`, 'missing_redirect_target', 'redirected links require an HTTPS finalUrl')
    }
  }

  return true
}

export function validateCatalogSnapshot(value: unknown, asOf: string): CatalogValidationResult {
  const issues: CatalogValidationIssue[] = []
  if (!isIsoTimestamp(asOf)) {
    return { ok: false, issues: [{ path: 'asOf', code: 'invalid_as_of', message: 'asOf must be an ISO timestamp' }] }
  }
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: 'snapshot', code: 'invalid_snapshot', message: 'catalog snapshot must be an object' }] }
  }
  if (value.schemaVersion !== AI_PATH_CATALOG_SCHEMA_VERSION) addIssue(issues, 'schemaVersion', 'schema_version_mismatch', 'snapshot schema version is not supported')
  if (value.catalogVersion !== AI_PATH_CATALOG_VERSION) addIssue(issues, 'catalogVersion', 'catalog_version_mismatch', 'snapshot catalog version is not supported')
  if (typeof value.publicationStatus !== 'string' || !publicationStatuses.has(value.publicationStatus as CatalogPublicationStatus)) addIssue(issues, 'publicationStatus', 'invalid_publication_status', 'publication status is not supported')
  if (!isIsoTimestamp(value.generatedAt) || Date.parse(value.generatedAt as string) > Date.parse(asOf)) addIssue(issues, 'generatedAt', 'invalid_generated_at', 'generatedAt must be on or before asOf')
  if (value.publishedAt !== null && (!isIsoTimestamp(value.publishedAt) || Date.parse(value.publishedAt as string) > Date.parse(asOf))) addIssue(issues, 'publishedAt', 'invalid_published_at', 'publishedAt must be null or on or before asOf')
  if (value.publicationStatus === 'published' && value.publishedAt === null) addIssue(issues, 'publishedAt', 'missing_published_at', 'published snapshots require publishedAt')
  if (value.targetAudience !== AI_PATH_CATALOG_TARGET_AUDIENCE) addIssue(issues, 'targetAudience', 'invalid_audience', 'snapshot target audience is not supported')
  if (!Array.isArray(value.resources) || value.resources.length === 0 || value.resources.length > 500) {
    addIssue(issues, 'resources', 'invalid_resources', 'resources must contain 1-500 items')
    return { ok: false, issues: sorted(issues) }
  }

  const ids = new Map<string, number>()
  const urls = new Map<string, number>()
  value.resources.forEach((resource, index) => {
    validateResource(resource, index, asOf, issues)
    if (!isRecord(resource)) return
    if (typeof resource.id === 'string') {
      const prior = ids.get(resource.id)
      if (prior !== undefined) addIssue(issues, `resources[${index}].id`, 'duplicate_resource_id', `resource id duplicates resources[${prior}]`)
      else ids.set(resource.id, index)
    }
    if (typeof resource.canonicalUrl === 'string') {
      const prior = urls.get(resource.canonicalUrl)
      if (prior !== undefined) addIssue(issues, `resources[${index}].canonicalUrl`, 'duplicate_canonical_url', `canonical URL duplicates resources[${prior}]`)
      else urls.set(resource.canonicalUrl, index)
    }
  })

  return { ok: issues.length === 0, issues: sorted(issues) }
}

export function validateCatalogForPublication(value: unknown, asOf: string): CatalogValidationResult {
  const structural = validateCatalogSnapshot(value, asOf)
  const issues = [...structural.issues]
  if (!isRecord(value) || !Array.isArray(value.resources) || !isIsoTimestamp(asOf)) {
    return { ok: false, issues: sorted(issues) }
  }

  value.resources.forEach((resource, index) => {
    if (!isRecord(resource) || resource.status !== 'active') return
    const path = `resources[${index}]`
    if (!isRecord(resource.review) || resource.review.status !== 'approved') {
      addIssue(issues, `${path}.review.status`, 'review_not_approved', 'active resources require approved editorial review')
    } else if (!isIsoTimestamp(resource.review.reviewDueAt) || Date.parse(resource.review.reviewDueAt) < Date.parse(asOf)) {
      addIssue(issues, `${path}.review.reviewDueAt`, 'review_stale', 'active resource review is overdue')
    }

    if (!isRecord(resource.linkHealth)) {
      addIssue(issues, `${path}.linkHealth`, 'link_health_missing', 'active resources require link-health metadata')
      return
    }
    if (resource.canonicalUrl === null) {
      if (resource.linkHealth.status !== 'not-applicable') addIssue(issues, `${path}.linkHealth.status`, 'invalid_internal_link_status', 'internal resources without URLs require not-applicable link status')
      return
    }
    if (resource.linkHealth.status !== 'healthy' && resource.linkHealth.status !== 'redirected') {
      addIssue(issues, `${path}.linkHealth.status`, 'link_unverified', 'active external resources require a healthy or redirected link check')
    }
    if (!isIsoTimestamp(resource.linkHealth.nextCheckDueAt) || Date.parse(resource.linkHealth.nextCheckDueAt) < Date.parse(asOf)) {
      addIssue(issues, `${path}.linkHealth.nextCheckDueAt`, 'link_check_stale', 'active external resource link check is overdue')
    }
  })

  return { ok: issues.length === 0, issues: sorted(issues) }
}

export type CatalogEligibilityInput = {
  asOf: string
  language: string
  maximumMinutes: number
  freeOnly?: boolean
  formats?: ResourceFormat[]
  codingPreference?: 'no-code' | 'light-code' | 'code-ready'
  accessPreference?: 'open-only' | 'account-ok'
  allowPaidServiceExercise?: boolean
  goalType?: CatalogGoalType
}

export function selectEligibleCatalogResources(
  snapshot: CatalogSnapshotV1,
  input: CatalogEligibilityInput
): CatalogResourceV1[] {
  const allowedFormats = input.formats?.length ? new Set(input.formats) : null
  return snapshot.resources
    .filter(resource => resource.status === 'active')
    .filter(resource => resource.review.status === 'approved' && Date.parse(resource.review.reviewDueAt) >= Date.parse(input.asOf))
    .filter(resource => resource.canonicalUrl === null
      ? resource.linkHealth.status === 'not-applicable'
      : (resource.linkHealth.status === 'healthy' || resource.linkHealth.status === 'redirected') &&
        Boolean(resource.linkHealth.nextCheckDueAt) &&
        Date.parse(resource.linkHealth.nextCheckDueAt as string) >= Date.parse(input.asOf))
    .filter(resource => resource.languages.includes(input.language))
    .filter(resource => resource.estimatedMinutes <= input.maximumMinutes)
    .filter(resource => !input.freeOnly || resource.cost.kind === 'free')
    .filter(resource => !allowedFormats || allowedFormats.has(resource.format))
    .filter(resource => input.codingPreference !== 'no-code' || resource.codingRequirement === 'none')
    .filter(resource => input.codingPreference !== 'light-code' || resource.codingRequirement !== 'required')
    .filter(resource => input.accessPreference !== 'open-only' || resource.accountRequirement === 'none')
    .filter(resource => input.allowPaidServiceExercise === true || resource.paidServiceRequirement === 'none')
    .filter(resource => !input.goalType || !resource.deferredForGoalTypes.includes(input.goalType))
    .sort((left, right) => left.id.localeCompare(right.id))
}
