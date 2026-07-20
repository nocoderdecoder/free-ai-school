export const AI_PATH_MEASUREMENT_VERSION = '2026-07-16.v1' as const
const AI_PATH_CATALOG_TARGET_AUDIENCE = 'workflow-builder-alpha' as const

export const AI_PATH_EVENT_NAMES = [
  'landing_viewed',
  'profile_completed',
  'assessment_started',
  'assessment_completed',
  'understanding_reviewed',
  'report_viewed',
  'plan_saved',
  'first_task_started',
  'first_task_completed',
  'catalog_resource_opened',
  'project_artifact_added',
  'weekly_check_in_completed',
  'reassessment_completed',
  'feedback_submitted',
  'finding_feedback_submitted',
  'data_deleted',
] as const

export type AiPathEventName = (typeof AI_PATH_EVENT_NAMES)[number]
export type AiPathAnalyticsValue = string | number | boolean | null

export type AiPathEvent = {
  measurementVersion: typeof AI_PATH_MEASUREMENT_VERSION
  eventName: AiPathEventName
  occurredAt: string
  anonymousId: string
  assessmentSessionId: string | null
  properties: Record<string, AiPathAnalyticsValue>
}

export type MeasurementValidationIssue = {
  path: string
  code: string
  message: string
}

export type MeasurementValidationResult = {
  ok: boolean
  issues: MeasurementValidationIssue[]
}

type PropertyRule = {
  required?: boolean
  type: 'string' | 'number' | 'boolean'
  enum?: readonly AiPathAnalyticsValue[]
  integer?: boolean
  minimum?: number
  maximum?: number
  pattern?: RegExp
}

type EventSchema = {
  requiresSession: boolean
  properties: Record<string, PropertyRule>
}

const audienceRule: PropertyRule = {
  required: true,
  type: 'string',
  enum: [AI_PATH_CATALOG_TARGET_AUDIENCE],
}

const identifierRule: PropertyRule = {
  required: true,
  type: 'string',
  pattern: /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/,
}

const modeRule: PropertyRule = {
  required: true,
  type: 'string',
  enum: ['text', 'voice'],
}

const EVENT_SCHEMAS: Record<AiPathEventName, EventSchema> = {
  landing_viewed: {
    requiresSession: false,
    properties: { audience: audienceRule, source: { type: 'string', enum: ['direct', 'referral', 'partner', 'organic', 'unknown'] } },
  },
  profile_completed: {
    requiresSession: false,
    properties: {
      audience: audienceRule,
      pathIntent: { required: true, type: 'string', enum: ['workflows', 'builder', 'career', 'leader', 'foundations', 'unsure'] },
      weeklyHoursBand: { required: true, type: 'string', enum: ['1', '2-3', '4-6', '7-plus'] },
    },
  },
  assessment_started: {
    requiresSession: true,
    properties: { audience: audienceRule, mode: modeRule },
  },
  assessment_completed: {
    requiresSession: true,
    properties: {
      audience: audienceRule,
      mode: modeRule,
      durationSeconds: { required: true, type: 'number', integer: true, minimum: 1, maximum: 3_600 },
    },
  },
  understanding_reviewed: {
    requiresSession: true,
    properties: {
      audience: audienceRule,
      correctionCount: { required: true, type: 'number', integer: true, minimum: 0, maximum: 100 },
      removedObservationCount: { required: true, type: 'number', integer: true, minimum: 0, maximum: 100 },
    },
  },
  report_viewed: {
    requiresSession: true,
    properties: { audience: audienceRule, resultStatus: { required: true, type: 'string', enum: ['illustrative', 'validated'] } },
  },
  plan_saved: {
    requiresSession: true,
    properties: { audience: audienceRule, planVersion: identifierRule },
  },
  first_task_started: {
    requiresSession: true,
    properties: { audience: audienceRule, taskKind: { required: true, type: 'string', enum: ['lesson', 'project', 'practice'] } },
  },
  first_task_completed: {
    requiresSession: true,
    properties: {
      audience: audienceRule,
      taskKind: { required: true, type: 'string', enum: ['lesson', 'project', 'practice'] },
      elapsedMinutes: { required: true, type: 'number', integer: true, minimum: 1, maximum: 43_200 },
    },
  },
  catalog_resource_opened: {
    requiresSession: true,
    properties: {
      audience: audienceRule,
      resourceId: identifierRule,
      recommendationRank: { required: true, type: 'number', integer: true, minimum: 1, maximum: 10 },
    },
  },
  project_artifact_added: {
    requiresSession: true,
    properties: {
      audience: audienceRule,
      artifactType: { required: true, type: 'string', enum: ['link', 'file', 'description', 'repository'] },
    },
  },
  weekly_check_in_completed: {
    requiresSession: true,
    properties: {
      audience: audienceRule,
      checkInNumber: { required: true, type: 'number', integer: true, minimum: 1, maximum: 12 },
      blocked: { required: true, type: 'boolean' },
    },
  },
  reassessment_completed: {
    requiresSession: true,
    properties: {
      audience: audienceRule,
      daysSinceInitial: { required: true, type: 'number', integer: true, minimum: 1, maximum: 365 },
    },
  },
  feedback_submitted: {
    requiresSession: true,
    properties: {
      audience: audienceRule,
      planFitRating: { required: true, type: 'number', integer: true, minimum: 1, maximum: 5 },
      reportUsefulnessRating: { required: true, type: 'number', integer: true, minimum: 1, maximum: 5 },
    },
  },
  finding_feedback_submitted: {
    requiresSession: true,
    properties: {
      audience: audienceRule,
      totalFindings: { required: true, type: 'number', integer: true, minimum: 1, maximum: 100 },
      materiallyWrongFindings: { required: true, type: 'number', integer: true, minimum: 0, maximum: 100 },
    },
  },
  data_deleted: {
    requiresSession: false,
    properties: { audience: audienceRule, scope: { required: true, type: 'string', enum: ['session', 'account', 'all-preview-data'] } },
  },
}

const forbiddenPropertyFragments = [
  'answer',
  'audio',
  'email',
  'employer',
  'goal',
  'name',
  'phone',
  'prompt',
  'quote',
  'role',
  'transcript',
  'url',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

function addIssue(issues: MeasurementValidationIssue[], path: string, code: string, message: string) {
  issues.push({ path, code, message })
}

function sorted(issues: MeasurementValidationIssue[]): MeasurementValidationIssue[] {
  return issues.sort((left, right) =>
    left.path.localeCompare(right.path) || left.code.localeCompare(right.code) || left.message.localeCompare(right.message)
  )
}

function validOpaqueId(value: unknown, prefix: string): boolean {
  return typeof value === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9_-]{6,96}$`).test(value)
}

export function validateAiPathEvent(value: unknown): MeasurementValidationResult {
  const issues: MeasurementValidationIssue[] = []
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: 'event', code: 'invalid_event', message: 'event must be an object' }] }
  }
  if (value.measurementVersion !== AI_PATH_MEASUREMENT_VERSION) addIssue(issues, 'measurementVersion', 'version_mismatch', 'measurement version is not supported')
  const eventName = typeof value.eventName === 'string' && (AI_PATH_EVENT_NAMES as readonly string[]).includes(value.eventName)
    ? value.eventName as AiPathEventName
    : null
  if (!eventName) addIssue(issues, 'eventName', 'unknown_event', 'event name is not supported')
  if (!isIsoTimestamp(value.occurredAt)) addIssue(issues, 'occurredAt', 'invalid_timestamp', 'occurredAt must be an ISO timestamp')
  if (!validOpaqueId(value.anonymousId, 'anon')) addIssue(issues, 'anonymousId', 'invalid_anonymous_id', 'anonymousId must be a non-identifying opaque id')
  if (value.assessmentSessionId !== null && !validOpaqueId(value.assessmentSessionId, 'assessment')) {
    addIssue(issues, 'assessmentSessionId', 'invalid_session_id', 'assessmentSessionId must be null or an opaque assessment id')
  }

  const schema = eventName ? EVENT_SCHEMAS[eventName] : null
  if (schema?.requiresSession && value.assessmentSessionId === null) {
    addIssue(issues, 'assessmentSessionId', 'missing_session_id', `${eventName} requires an assessment session id`)
  }
  if (!isRecord(value.properties)) {
    addIssue(issues, 'properties', 'invalid_properties', 'properties must be an object')
    return { ok: false, issues: sorted(issues) }
  }

  const properties = value.properties
  for (const key of Object.keys(properties)) {
    if (forbiddenPropertyFragments.some(fragment => key.toLowerCase().includes(fragment))) {
      addIssue(issues, `properties.${key}`, 'forbidden_sensitive_property', 'free-form learner content and direct identifiers are prohibited')
    }
    if (!schema || !Object.hasOwn(schema.properties, key)) {
      addIssue(issues, `properties.${key}`, 'unknown_property', 'property is not allowlisted for this event')
    }
  }

  if (schema) {
    for (const [key, rule] of Object.entries(schema.properties)) {
      const property = properties[key]
      if (property === undefined) {
        if (rule.required) addIssue(issues, `properties.${key}`, 'missing_property', 'required property is missing')
        continue
      }
      if (typeof property !== rule.type) {
        addIssue(issues, `properties.${key}`, 'invalid_property_type', `property must be ${rule.type}`)
        continue
      }
      if (rule.enum && !rule.enum.includes(property as AiPathAnalyticsValue)) {
        addIssue(issues, `properties.${key}`, 'invalid_property_value', 'property value is not supported')
      }
      if (typeof property === 'number') {
        if (rule.integer && !Number.isInteger(property)) addIssue(issues, `properties.${key}`, 'non_integer_property', 'property must be an integer')
        if (rule.minimum !== undefined && property < rule.minimum) addIssue(issues, `properties.${key}`, 'property_below_minimum', `property must be at least ${rule.minimum}`)
        if (rule.maximum !== undefined && property > rule.maximum) addIssue(issues, `properties.${key}`, 'property_above_maximum', `property must be at most ${rule.maximum}`)
      }
      if (typeof property === 'string' && rule.pattern && !rule.pattern.test(property)) {
        addIssue(issues, `properties.${key}`, 'invalid_property_identifier', 'property must be a bounded opaque identifier')
      }
    }
  }

  if (
    eventName === 'finding_feedback_submitted' &&
    typeof properties.materiallyWrongFindings === 'number' &&
    typeof properties.totalFindings === 'number' &&
    properties.materiallyWrongFindings > properties.totalFindings
  ) {
    addIssue(issues, 'properties.materiallyWrongFindings', 'wrong_findings_exceed_total', 'materially wrong findings cannot exceed total findings')
  }

  return { ok: issues.length === 0, issues: sorted(issues) }
}

export const AI_PATH_ALPHA_TARGETS = {
  assessmentCompletionRate: 0.7,
  planFitRate: 0.6,
  maximumMateriallyWrongFindingRate: 0.1,
  sevenDayFirstTaskCompletionRate: 0.3,
} as const

export type TargetUserMetrics = {
  audience: typeof AI_PATH_CATALOG_TARGET_AUDIENCE
  window: { start: string; end: string }
  counts: {
    landedVisitors: number
    profileCompletedVisitors: number
    assessmentStartedSessions: number
    assessmentCompletedSessions: number
    reviewedSessions: number
    correctedSessions: number
    reportViewedSessions: number
    planSavedSessions: number
    sevenDayTaskStartedSessions: number
    sevenDayTaskCompletedSessions: number
    feedbackSessions: number
    artifactAddedSessions: number
    reassessedSessions: number
    totalFindingsReviewed: number
    materiallyWrongFindings: number
  }
  rates: {
    profileCompletionRate: number | null
    assessmentCompletionRate: number | null
    correctionRate: number | null
    reportToPlanSaveRate: number | null
    sevenDayFirstTaskStartRate: number | null
    sevenDayFirstTaskCompletionRate: number | null
    planFitRate: number | null
    reportUsefulnessRate: number | null
    thirtyDayArtifactRate: number | null
    fortyFiveDayReassessmentRate: number | null
    materiallyWrongFindingRate: number | null
  }
  targetStatus: {
    assessmentCompletion: 'met' | 'missed' | 'insufficient-data'
    planFit: 'met' | 'missed' | 'insufficient-data'
    findingAccuracy: 'met' | 'missed' | 'insufficient-data'
    sevenDayAction: 'met' | 'missed' | 'insufficient-data'
  }
}

export type MetricsComputationResult =
  | { ok: true; value: TargetUserMetrics }
  | { ok: false; issues: MeasurementValidationIssue[] }

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Number((numerator / denominator).toFixed(4))
}

function status(value: number | null, target: number, comparison: 'minimum' | 'maximum'): 'met' | 'missed' | 'insufficient-data' {
  if (value === null) return 'insufficient-data'
  return comparison === 'minimum'
    ? value >= target ? 'met' : 'missed'
    : value <= target ? 'met' : 'missed'
}

function eventSessionId(event: AiPathEvent): string | null {
  return event.assessmentSessionId
}

function sessionsFor(events: AiPathEvent[], eventName: AiPathEventName): Set<string> {
  return new Set(events.filter(event => event.eventName === eventName).map(eventSessionId).filter((id): id is string => Boolean(id)))
}

function firstEventAt(events: AiPathEvent[], eventName: AiPathEventName): Map<string, number> {
  const result = new Map<string, number>()
  for (const event of events) {
    if (event.eventName !== eventName || !event.assessmentSessionId) continue
    const timestamp = Date.parse(event.occurredAt)
    const prior = result.get(event.assessmentSessionId)
    if (prior === undefined || timestamp < prior) result.set(event.assessmentSessionId, timestamp)
  }
  return result
}

function sessionsWithin(
  events: AiPathEvent[],
  eventName: AiPathEventName,
  anchorBySession: Map<string, number>,
  maximumDays: number
): Set<string> {
  const result = new Set<string>()
  const maximumMs = maximumDays * 86_400_000
  for (const event of events) {
    if (event.eventName !== eventName || !event.assessmentSessionId) continue
    const anchor = anchorBySession.get(event.assessmentSessionId)
    if (anchor === undefined) continue
    const elapsed = Date.parse(event.occurredAt) - anchor
    if (elapsed >= 0 && elapsed <= maximumMs) result.add(event.assessmentSessionId)
  }
  return result
}

export function computeTargetUserMetrics(
  values: unknown[],
  window: { start: string; end: string }
): MetricsComputationResult {
  const issues: MeasurementValidationIssue[] = []
  if (!isIsoTimestamp(window.start) || !isIsoTimestamp(window.end) || Date.parse(window.start) > Date.parse(window.end)) {
    return { ok: false, issues: [{ path: 'window', code: 'invalid_window', message: 'window requires ordered ISO timestamps' }] }
  }
  values.forEach((value, index) => {
    const validation = validateAiPathEvent(value)
    validation.issues.forEach(issue => issues.push({ ...issue, path: `events[${index}].${issue.path}` }))
  })
  if (issues.length) return { ok: false, issues: sorted(issues) }

  const events = (values as AiPathEvent[])
    .filter(event => event.properties.audience === AI_PATH_CATALOG_TARGET_AUDIENCE)
    .filter(event => Date.parse(event.occurredAt) >= Date.parse(window.start) && Date.parse(event.occurredAt) <= Date.parse(window.end))
    .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt) || left.eventName.localeCompare(right.eventName))

  const landedVisitors = new Set(events.filter(event => event.eventName === 'landing_viewed').map(event => event.anonymousId))
  const profileVisitors = new Set(events.filter(event => event.eventName === 'profile_completed').map(event => event.anonymousId))
  const started = sessionsFor(events, 'assessment_started')
  const completedRaw = sessionsFor(events, 'assessment_completed')
  const completed = new Set([...completedRaw].filter(id => started.has(id)))
  const reviewed = sessionsFor(events, 'understanding_reviewed')
  const corrected = new Set(events
    .filter(event => event.eventName === 'understanding_reviewed' && Number(event.properties.correctionCount) > 0)
    .map(eventSessionId)
    .filter((id): id is string => Boolean(id)))
  const reports = sessionsFor(events, 'report_viewed')
  const planSaved = new Set([...sessionsFor(events, 'plan_saved')].filter(id => reports.has(id)))
  const reportAt = firstEventAt(events, 'report_viewed')
  const taskStarted = sessionsWithin(events, 'first_task_started', reportAt, 7)
  const taskCompleted = sessionsWithin(events, 'first_task_completed', reportAt, 7)
  const artifacts = sessionsWithin(events, 'project_artifact_added', reportAt, 30)
  const reassessments = sessionsWithin(events, 'reassessment_completed', reportAt, 45)
  const feedbackEvents = events.filter(event => event.eventName === 'feedback_submitted' && event.assessmentSessionId && reports.has(event.assessmentSessionId))
  const feedbackSessions = new Set(feedbackEvents.map(event => event.assessmentSessionId as string))
  const planFitSessions = new Set(feedbackEvents.filter(event => Number(event.properties.planFitRating) >= 4).map(event => event.assessmentSessionId as string))
  const usefulReportSessions = new Set(feedbackEvents.filter(event => Number(event.properties.reportUsefulnessRating) >= 4).map(event => event.assessmentSessionId as string))
  const findingEvents = events.filter(event => event.eventName === 'finding_feedback_submitted')
  const totalFindingsReviewed = findingEvents.reduce((sum, event) => sum + Number(event.properties.totalFindings), 0)
  const materiallyWrongFindings = findingEvents.reduce((sum, event) => sum + Number(event.properties.materiallyWrongFindings), 0)

  const rates = {
    profileCompletionRate: rate([...profileVisitors].filter(id => landedVisitors.has(id)).length, landedVisitors.size),
    assessmentCompletionRate: rate(completed.size, started.size),
    correctionRate: rate(corrected.size, reviewed.size),
    reportToPlanSaveRate: rate(planSaved.size, reports.size),
    sevenDayFirstTaskStartRate: rate(taskStarted.size, reports.size),
    sevenDayFirstTaskCompletionRate: rate(taskCompleted.size, reports.size),
    planFitRate: rate(planFitSessions.size, feedbackSessions.size),
    reportUsefulnessRate: rate(usefulReportSessions.size, feedbackSessions.size),
    thirtyDayArtifactRate: rate(artifacts.size, reports.size),
    fortyFiveDayReassessmentRate: rate(reassessments.size, reports.size),
    materiallyWrongFindingRate: rate(materiallyWrongFindings, totalFindingsReviewed),
  }

  return {
    ok: true,
    value: {
      audience: AI_PATH_CATALOG_TARGET_AUDIENCE,
      window,
      counts: {
        landedVisitors: landedVisitors.size,
        profileCompletedVisitors: profileVisitors.size,
        assessmentStartedSessions: started.size,
        assessmentCompletedSessions: completed.size,
        reviewedSessions: reviewed.size,
        correctedSessions: corrected.size,
        reportViewedSessions: reports.size,
        planSavedSessions: planSaved.size,
        sevenDayTaskStartedSessions: taskStarted.size,
        sevenDayTaskCompletedSessions: taskCompleted.size,
        feedbackSessions: feedbackSessions.size,
        artifactAddedSessions: artifacts.size,
        reassessedSessions: reassessments.size,
        totalFindingsReviewed,
        materiallyWrongFindings,
      },
      rates,
      targetStatus: {
        assessmentCompletion: status(rates.assessmentCompletionRate, AI_PATH_ALPHA_TARGETS.assessmentCompletionRate, 'minimum'),
        planFit: status(rates.planFitRate, AI_PATH_ALPHA_TARGETS.planFitRate, 'minimum'),
        findingAccuracy: status(rates.materiallyWrongFindingRate, AI_PATH_ALPHA_TARGETS.maximumMateriallyWrongFindingRate, 'maximum'),
        sevenDayAction: status(rates.sevenDayFirstTaskCompletionRate, AI_PATH_ALPHA_TARGETS.sevenDayFirstTaskCompletionRate, 'minimum'),
      },
    },
  }
}
