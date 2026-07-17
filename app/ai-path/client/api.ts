import {
  AI_PATH_CONSENT_VERSION,
  AI_PATH_VOICE_CONSENT_VERSION,
  type AssessmentReport,
} from '../lib/foundation.ts'
import type { AiPathGoalType } from '../lib/goal-type.ts'

import { buildAnalysisPayload, type ReviewedAssessmentInput } from './analysis-payload.ts'
import { isCurrentVoiceConsent, type VoiceConsent } from './realtime-consent.ts'

export { buildAnalysisPayload }
export type { ReviewedAssessmentInput, ReviewedInput } from './analysis-payload.ts'

export type AssessmentSession<Mode extends 'text' | 'voice' = 'text' | 'voice'> = {
  id: string
  status: 'consented'
  createdAt: string
  mode: Mode
  locale: string
  goal: string
  goalType: AiPathGoalType
  targetRole: string | null
  consentVersion: string
  saveTranscript: boolean
}

export type TextSession = AssessmentSession<'text'>
export type VoiceSession = AssessmentSession<'voice'>

export type TextSessionResult = {
  session: TextSession
  owned: boolean
  persistence: 'none' | 'ephemeral-memory' | 'supabase-postgres'
  productionReady: boolean
}

export type VoiceSessionResult = Omit<TextSessionResult, 'session'> & { session: VoiceSession }

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
  authenticated_alpha_unavailable: 'Saved private-alpha sessions are not available in this environment.',
  durable_report_writer_unavailable: 'This saved session cannot store a report yet. Your reviewed responses are still available.',
  request_too_large: 'That response is too large to process. Shorten it, then retry.',
  origin_required: 'This request could not be verified. Reload the page, then retry.',
  cross_origin_request_rejected: 'This request came from an untrusted page. Reload this app directly, then retry.',
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
  goalType: AiPathGoalType
  targetRole: string
  saveTranscript?: boolean
}): Promise<TextSessionResult> {
  const response = await fetch('/api/ai-path/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      consentVersion: AI_PATH_CONSENT_VERSION,
      locale: navigator.language || 'en-US',
      mode: 'text',
      goal: input.goal,
      goalType: input.goalType,
      targetRole: input.targetRole,
      saveTranscript: input.saveTranscript === true,
    }),
  })
  return parseResponse<TextSessionResult>(response)
}

/**
 * Creates the owned voice-session envelope required before WebRTC bootstrap.
 * This records consent only; it never requests microphone access or contacts a provider.
 */
export async function createVoiceSession(input: {
  goal: string
  goalType: AiPathGoalType
  targetRole: string
  consent: VoiceConsent
  saveTranscript?: boolean
}): Promise<VoiceSessionResult> {
  if (!isCurrentVoiceConsent(input.consent) || input.consent.version !== AI_PATH_VOICE_CONSENT_VERSION) {
    throw new AIPathApiError('Review and accept the current voice consent before starting voice.', 400)
  }
  const response = await fetch('/api/ai-path/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      consentVersion: input.consent.version,
      locale: navigator.language || 'en-US',
      mode: 'voice',
      goal: input.goal,
      goalType: input.goalType,
      targetRole: input.targetRole,
      saveTranscript: input.saveTranscript === true,
    }),
  })
  return parseResponse<VoiceSessionResult>(response)
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

export type ExportedAssessmentSession = {
  exportedAt: string
  persistence: 'ephemeral-memory' | 'supabase-postgres'
  session: AssessmentSession & { updatedAt: string; hasReport: boolean; report: AssessmentReport | null }
}

export async function exportOwnedSession(sessionId: string): Promise<ExportedAssessmentSession> {
  const response = await fetch(`/api/ai-path/session/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    cache: 'no-store',
  })
  return parseResponse<ExportedAssessmentSession>(response)
}

export async function deleteOwnedSession(sessionId: string): Promise<void> {
  const response = await fetch(`/api/ai-path/session/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    cache: 'no-store',
  })
  await parseResponse<{ deleted: true; sessionId: string }>(response)
}
