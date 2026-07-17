import {
  AI_PATH_CONSENT_VERSION,
  type AssessmentReport,
} from '../lib/foundation'

import { buildAnalysisPayload, type ReviewedAssessmentInput } from './analysis-payload'

export { buildAnalysisPayload }
export type { ReviewedAssessmentInput, ReviewedInput } from './analysis-payload'

export type TextSession = {
  id: string
  status: 'consented'
  createdAt: string
  mode: 'text'
  locale: string
  goal: string
  targetRole: string | null
  consentVersion: string
  saveTranscript: boolean
}

export class AIPathApiError extends Error {
  readonly status: number
  readonly details: string[]

  constructor(message: string, status: number, details: string[] = []) {
    super(message)
    this.name = 'AIPathApiError'
    this.status = status
    this.details = details
  }
}

const recoveryMessages: Record<string, string> = {
  authentication_required: 'Your sign-in could not be verified. Sign in again, then retry.',
  active_session_exists: 'You already have an unfinished assessment. Resume or delete it before starting another.',
  session_not_found: 'This assessment session is no longer available. Start a new assessment.',
  invalid_assessment_session_id: 'The assessment session is invalid. Return to your profile and start again.',
  owned_session_persistence_unavailable: 'Saved sessions are not enabled in this environment.',
  rate_limit_exceeded: 'Too many requests were made. Wait a moment, then retry.',
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok) {
    const details = Array.isArray(body?.details)
      ? body.details.filter((detail): detail is string => typeof detail === 'string')
      : []
    const code = typeof body?.error === 'string' ? body.error : ''
    throw new AIPathApiError(
      details[0] || recoveryMessages[code] || 'The request could not be completed.',
      response.status,
      details
    )
  }
  return body as T
}

export async function createTextSession(input: {
  goal: string
  targetRole: string
  saveTranscript?: boolean
}): Promise<TextSession> {
  const response = await fetch('/api/ai-path/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      consentVersion: AI_PATH_CONSENT_VERSION,
      locale: navigator.language || 'en-US',
      mode: 'text',
      goal: input.goal,
      targetRole: input.targetRole,
      saveTranscript: input.saveTranscript === true,
    }),
  })
  const result = await parseResponse<{ session: TextSession }>(response)
  return result.session
}

export async function analyzeReviewedAssessment(input: ReviewedAssessmentInput): Promise<AssessmentReport> {
  const response = await fetch('/api/ai-path/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(buildAnalysisPayload(input)),
  })
  const result = await parseResponse<{ report: AssessmentReport }>(response)
  return result.report
}
