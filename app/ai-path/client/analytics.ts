import {
  AI_PATH_MEASUREMENT_VERSION,
  type AiPathEvent,
} from '../catalog/measurement.ts'

const AUDIENCE = 'workflow-builder-alpha' as const
const ANALYTICS_ENDPOINT = '/api/ai-path/events'

export type AnalyticsDelivery = 'accepted' | 'unavailable' | 'rejected'
export type WeeklyHoursBand = '1' | '2-3' | '4-6' | '7-plus'

type BrowserAnalyticsDependencies = {
  fetch?: typeof globalThis.fetch
  randomUUID?: () => string
  now?: () => Date
}

function opaqueId(prefix: 'anon' | 'assessment', randomUUID: () => string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '')}`
}

/**
 * A deliberately narrow browser client. It exposes only governed events and
 * never accepts arbitrary properties or learner-authored text.
 */
export class AiPathBrowserAnalytics {
  readonly #fetch: typeof globalThis.fetch
  readonly #now: () => Date
  readonly #anonymousId: string
  #assessmentSessionId: string | null = null

  constructor(dependencies: BrowserAnalyticsDependencies = {}) {
    const randomUUID = dependencies.randomUUID ?? (() => globalThis.crypto.randomUUID())
    this.#fetch = dependencies.fetch ?? globalThis.fetch.bind(globalThis)
    this.#now = dependencies.now ?? (() => new Date())
    this.#anonymousId = opaqueId('anon', randomUUID)
    this.#assessmentSessionId = null
    this.#randomUUID = randomUUID
  }

  readonly #randomUUID: () => string

  landingViewed(source: 'direct' | 'referral' | 'partner' | 'organic' | 'unknown' = 'unknown') {
    return this.#send('landing_viewed', null, { audience: AUDIENCE, source })
  }

  profileCompleted(pathIntent: 'workflows' | 'builder' | 'career' | 'leader' | 'foundations' | 'unsure', weeklyHoursBand: WeeklyHoursBand) {
    return this.#send('profile_completed', null, { audience: AUDIENCE, pathIntent, weeklyHoursBand })
  }

  assessmentStarted() {
    this.#assessmentSessionId = opaqueId('assessment', this.#randomUUID)
    return this.#send('assessment_started', this.#assessmentSessionId, { audience: AUDIENCE, mode: 'text' })
  }

  assessmentCompleted(durationSeconds: number) {
    return this.#send('assessment_completed', this.#assessmentSessionId, {
      audience: AUDIENCE,
      mode: 'text',
      durationSeconds: Math.max(1, Math.min(3_600, Math.round(durationSeconds))),
    })
  }

  understandingReviewed(correctionCount: number, removedObservationCount = 0) {
    return this.#send('understanding_reviewed', this.#assessmentSessionId, {
      audience: AUDIENCE,
      correctionCount: Math.max(0, Math.min(100, Math.round(correctionCount))),
      removedObservationCount: Math.max(0, Math.min(100, Math.round(removedObservationCount))),
    })
  }

  reportViewed() {
    return this.#send('report_viewed', this.#assessmentSessionId, {
      audience: AUDIENCE,
      resultStatus: 'illustrative',
    })
  }

  planSaved(planVersion: 'private-alpha-v1') {
    return this.#send('plan_saved', this.#assessmentSessionId, { audience: AUDIENCE, planVersion })
  }

  firstTaskStarted(taskKind: 'lesson' | 'project' | 'practice' = 'project') {
    return this.#send('first_task_started', this.#assessmentSessionId, { audience: AUDIENCE, taskKind })
  }

  firstTaskCompleted(elapsedMinutes: number, taskKind: 'lesson' | 'project' | 'practice' = 'project') {
    return this.#send('first_task_completed', this.#assessmentSessionId, {
      audience: AUDIENCE,
      taskKind,
      elapsedMinutes: Math.max(1, Math.min(43_200, Math.round(elapsedMinutes))),
    })
  }

  feedbackSubmitted(planFitRating: number, reportUsefulnessRating: number) {
    return this.#send('feedback_submitted', this.#assessmentSessionId, {
      audience: AUDIENCE,
      planFitRating: Math.max(1, Math.min(5, Math.round(planFitRating))),
      reportUsefulnessRating: Math.max(1, Math.min(5, Math.round(reportUsefulnessRating))),
    })
  }

  findingFeedbackSubmitted(totalFindings: number, materiallyWrongFindings: number) {
    const boundedTotal = Math.max(1, Math.min(100, Math.round(totalFindings)))
    return this.#send('finding_feedback_submitted', this.#assessmentSessionId, {
      audience: AUDIENCE,
      totalFindings: boundedTotal,
      materiallyWrongFindings: Math.max(0, Math.min(boundedTotal, Math.round(materiallyWrongFindings))),
    })
  }

  dataDeleted() {
    const delivery = this.#send('data_deleted', null, { audience: AUDIENCE, scope: 'all-preview-data' })
    this.#assessmentSessionId = null
    return delivery
  }

  async #send(
    eventName: AiPathEvent['eventName'],
    assessmentSessionId: string | null,
    properties: AiPathEvent['properties'],
  ): Promise<AnalyticsDelivery> {
    const event: AiPathEvent = {
      measurementVersion: AI_PATH_MEASUREMENT_VERSION,
      eventName,
      occurredAt: this.#now().toISOString(),
      anonymousId: this.#anonymousId,
      assessmentSessionId,
      properties,
    }
    try {
      const response = await this.#fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        cache: 'no-store',
        credentials: 'same-origin',
        keepalive: true,
      })
      if (response.status === 202) return 'accepted'
      if (response.status === 503) return 'unavailable'
      return 'rejected'
    } catch {
      return 'unavailable'
    }
  }
}

export function weeklyHoursBand(hours: string): WeeklyHoursBand {
  if (hours === '1') return '1'
  if (hours === '3') return '2-3'
  if (hours === '5') return '4-6'
  return '7-plus'
}
