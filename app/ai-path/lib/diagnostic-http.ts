import { composeDiagnosticResult } from './diagnostic.ts'
import {
  parseDiagnosticIntake,
} from './diagnostic-input.ts'
import type {
  ConsumerDiagnosticPersistenceInput,
  ConsumerDiagnosticPersistenceReceipt,
} from './diagnostic-persistence-supabase.ts'
import {
  AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION,
  AI_PATH_DIAGNOSTIC_SUBMISSION_MAXIMUM_BYTES,
  parseDiagnosticSubmissionEnvelope,
} from './diagnostic-storage-consent.ts'
import { readBoundedJson } from './request-body.ts'
import { sameOriginMutationResponse } from './request-security.ts'

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export type DiagnosticPostOptions = Readonly<{
  verifiedOwnerId?: string | null
  persist?: (
    input: ConsumerDiagnosticPersistenceInput,
  ) => Promise<ConsumerDiagnosticPersistenceReceipt | null>
}>

export async function handleDiagnosticPost(request: Request, options: DiagnosticPostOptions = {}) {
  const preflight = diagnosticPreflightResponse(request)
  if (preflight) return preflight

  const body = await readBoundedJson(request, AI_PATH_DIAGNOSTIC_SUBMISSION_MAXIMUM_BYTES)
  if (!body.ok) return json({ error: body.error }, body.status)

  const envelope = parseDiagnosticSubmissionEnvelope(body.value)
  const envelopeCandidate = body.value !== null
    && typeof body.value === 'object'
    && !Array.isArray(body.value)
    && 'intake' in body.value
  if (!envelope.ok && envelopeCandidate) {
    return json({ error: envelope.error, details: envelope.details }, 400)
  }
  const intake = envelope.ok ? envelope.value.intake : body.value
  const parsed = parseDiagnosticIntake(intake)
  if (!parsed.ok) return json({ error: parsed.error, details: parsed.details }, 400)

  const result = parsed.value.path === 'use-case'
    ? composeDiagnosticResult(parsed.value)
    : composeDiagnosticResult(parsed.value)
  if (!result) return json({ error: 'diagnostic_incomplete' }, 422)

  let persistence: ConsumerDiagnosticPersistenceReceipt | null = null
  if (envelope.ok && envelope.value.storageConsent.acknowledged) {
    if (!options.verifiedOwnerId) return json({ error: 'authentication_required' }, 401)
    if (!options.persist || !envelope.value.idempotencyKey) {
      return json({ error: 'diagnostic_persistence_unavailable' }, 503)
    }
    try {
      persistence = await options.persist({
        ownerId: options.verifiedOwnerId,
        idempotencyKey: envelope.value.idempotencyKey,
        intake: parsed.value,
        result,
        privacyNoticeVersion: AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION,
        storageConsent: true,
      })
    } catch {
      return json({ error: 'diagnostic_persistence_unavailable' }, 503)
    }
    if (!persistence) return json({ error: 'diagnostic_persistence_unavailable' }, 503)
  }
  return json({
    result,
    generatedBy: 'deterministic-server-policy',
    persisted: Boolean(persistence),
    storage: persistence ? {
      sessionId: persistence.sessionId,
      retentionExpiresAt: persistence.retentionExpiresAt,
      replayed: persistence.replayed,
    } : null,
  })
}

export function diagnosticPreflightResponse(request: Request): Response | null {
  const crossOrigin = sameOriginMutationResponse(request)
  if (crossOrigin) return crossOrigin
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  return contentType === 'application/json'
    ? null
    : json({ error: 'unsupported_media_type' }, 415)
}
