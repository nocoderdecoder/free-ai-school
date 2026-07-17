import { randomUUID } from 'node:crypto'

import { parseSessionStartInput } from './foundation.ts'
import { readBoundedJson } from './request-body.ts'
import { crossOriginMutationResponse } from './request-security.ts'
import type { AssessmentRequestRuntime } from './request-runtime.ts'
import type { AssessmentSessionRecord } from './session-persistence.ts'

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function presentSession(session: AssessmentSessionRecord) {
  return {
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    mode: session.mode,
    locale: session.locale,
    goal: session.goal,
    goalType: session.goalType,
    targetRole: session.targetRole ?? null,
    consentVersion: session.consentVersion,
    saveTranscript: session.saveTranscript,
    hasReport: Boolean(session.report),
  }
}

function validSessionId(sessionId: string, runtime: AssessmentRequestRuntime) {
  if (runtime.mode === 'supabase') return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(sessionId)
}

function requireOwnedRuntime(runtime: AssessmentRequestRuntime): Response | null {
  if (!runtime.capability.available || !runtime.service) {
    return json({
      error: 'owned_session_persistence_unavailable',
      productionReady: false,
    }, 503)
  }
  if (!runtime.principal) return json({ error: 'authentication_required' }, 401)
  return null
}

export async function handleSessionPost(request: Request, runtime: AssessmentRequestRuntime) {
  const crossOrigin = crossOriginMutationResponse(request, runtime)
  if (crossOrigin) return crossOrigin
  const bodyResult = await readBoundedJson(request, 8_192)
  if (!bodyResult.ok) return json({ error: bodyResult.error }, bodyResult.status)
  const body = bodyResult.value

  const parsed = parseSessionStartInput(body)
  if (!parsed.ok) return json({ error: 'invalid_session', details: parsed.errors }, 400)

  if (runtime.capability.available && runtime.service) {
    if (!runtime.principal) return json({ error: 'authentication_required' }, 401)
    const created = await runtime.service.createOwnedSession(runtime.principal, parsed.value)
    if (!created.ok) {
      return json({ error: created.reason, activeSessionId: created.sessionId }, 409)
    }
    return json({
      session: presentSession(created.session),
      owned: true,
      mock: runtime.mode !== 'supabase',
      persistence: runtime.capability.persistence,
      productionReady: runtime.capability.productionReady,
      message: runtime.mode === 'supabase'
        ? 'This session is authenticated and durably persisted.'
        : 'This authenticated session is stored only in the current local/test process.',
    }, 201)
  }

  if (process.env.NODE_ENV === 'production' && process.env.AI_PATH_ENABLE_ANONYMOUS_DEMO !== 'true') {
    return json({ error: 'authenticated_alpha_unavailable' }, 503)
  }
  const now = new Date().toISOString()
  return json({
    session: {
      id: randomUUID(),
      status: 'consented',
      createdAt: now,
      mode: parsed.value.mode,
      locale: parsed.value.locale,
      goal: parsed.value.goal,
      goalType: parsed.value.goalType,
      targetRole: parsed.value.targetRole ?? null,
      consentVersion: parsed.value.consentVersion,
      saveTranscript: parsed.value.saveTranscript,
    },
    owned: false,
    mock: true,
    persistence: 'none',
    productionReady: false,
    message: 'This foundation route validates and returns an unowned mock session. Do not treat it as production persistence.',
  }, 201)
}

export async function handleLegacySessionGet(request: Request, runtime: AssessmentRequestRuntime) {
  const unavailable = requireOwnedRuntime(runtime)
  if (unavailable) return unavailable
  const sessionId = new URL(request.url).searchParams.get('sessionId')?.trim() ?? ''
  if (!validSessionId(sessionId, runtime)) return json({ error: 'invalid_session_id' }, 400)

  const session = await runtime.service!.getOwnedSession(runtime.principal!, sessionId)
  if (!session) return json({ error: 'session_not_found' }, 404)
  return json({
    session: presentSession(session),
    owned: true,
    persistence: runtime.capability.persistence,
    productionReady: runtime.capability.productionReady,
  })
}

export async function handleSessionExport(sessionId: string, runtime: AssessmentRequestRuntime) {
  const unavailable = requireOwnedRuntime(runtime)
  if (unavailable) return unavailable
  if (!validSessionId(sessionId, runtime)) return json({ error: 'invalid_session_id' }, 400)

  const session = await runtime.service!.exportOwnedSession(runtime.principal!, sessionId)
  if (!session) return json({ error: 'session_not_found' }, 404)
  return json({
    exportedAt: new Date().toISOString(),
    persistence: runtime.capability.persistence,
    session: {
      ...presentSession(session),
      report: session.report,
    },
  })
}

export async function handleSessionDelete(
  request: Request,
  sessionId: string,
  runtime: AssessmentRequestRuntime,
) {
  const crossOrigin = crossOriginMutationResponse(request, runtime)
  if (crossOrigin) return crossOrigin
  const unavailable = requireOwnedRuntime(runtime)
  if (unavailable) return unavailable
  if (!validSessionId(sessionId, runtime)) return json({ error: 'invalid_session_id' }, 400)

  const deleted = await runtime.service!.deleteOwnedSession(runtime.principal!, sessionId)
  if (!deleted) return json({ error: 'session_not_found' }, 404)
  return json({ deleted: true, sessionId })
}
