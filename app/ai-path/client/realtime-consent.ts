import { AI_PATH_VOICE_CONSENT_VERSION } from '../lib/foundation.ts'

export { AI_PATH_VOICE_CONSENT_VERSION }

export type VoiceConsent = Readonly<{
  version: typeof AI_PATH_VOICE_CONSENT_VERSION
  audioStreamingAccepted: true
  transcriptReviewAccepted: true
  acceptedAt: string
}>

export function createVoiceConsent(input: {
  audioStreamingAccepted: boolean
  transcriptReviewAccepted: boolean
  now?: () => Date
}): VoiceConsent | null {
  if (!input.audioStreamingAccepted || !input.transcriptReviewAccepted) return null
  return Object.freeze({
    version: AI_PATH_VOICE_CONSENT_VERSION,
    audioStreamingAccepted: true,
    transcriptReviewAccepted: true,
    acceptedAt: (input.now ?? (() => new Date()))().toISOString(),
  })
}

export function isCurrentVoiceConsent(value: unknown): value is VoiceConsent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return record.version === AI_PATH_VOICE_CONSENT_VERSION
    && record.audioStreamingAccepted === true
    && record.transcriptReviewAccepted === true
    && typeof record.acceptedAt === 'string'
    && Number.isFinite(Date.parse(record.acceptedAt))
}
