import {
  buildAssessmentReport,
  validateEvidenceAgainstTranscript,
  type ResourceFormat,
} from './foundation.ts'
import { parseReviewedAssessment } from './reviewed-assessment.ts'
import { readBoundedJson } from './request-body.ts'
import { crossOriginMutationResponse } from './request-security.ts'
import type { AssessmentRequestRuntime } from './request-runtime.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

const resourceFormats = new Set<ResourceFormat>(['reading', 'course', 'project', 'reference'])

export async function handleAnalysisPost(request: Request, runtime: AssessmentRequestRuntime) {
  const crossOrigin = crossOriginMutationResponse(request, runtime)
  if (crossOrigin) return crossOrigin

  const bodyResult = await readBoundedJson(request, 32_768)
  if (!bodyResult.ok) return json({ error: bodyResult.error }, bodyResult.status)
  const body = bodyResult.value
  if (!isRecord(body)) return json({ error: 'invalid_body' }, 400)

  if (runtime.capability.available && !runtime.principal) {
    return json({ error: 'authentication_required' }, 401)
  }
  if (runtime.capability.available && !runtime.service) {
    return json({ error: 'owned_session_persistence_unavailable' }, 503)
  }

  const assessmentSessionId = typeof body.assessmentSessionId === 'string'
    ? body.assessmentSessionId.trim()
    : ''
  if (runtime.capability.available && (!assessmentSessionId || assessmentSessionId.length > 100)) {
    return json({ error: 'invalid_assessment_session_id' }, 400)
  }

  const ownedSession = runtime.principal && runtime.service
    ? await runtime.service.getOwnedSession(runtime.principal, assessmentSessionId)
    : null
  if (runtime.principal && !ownedSession) return json({ error: 'session_not_found' }, 404)

  const goal = ownedSession?.goal ?? (typeof body.goal === 'string' ? body.goal.trim() : '')
  const reviewedAssessment = parseReviewedAssessment(body, ownedSession?.goalType)
  const formats = Array.isArray(body.formats)
    ? body.formats.filter((format): format is ResourceFormat => typeof format === 'string' && resourceFormats.has(format as ResourceFormat))
    : undefined

  const details: string[] = []
  if (goal.length < 20 || goal.length > 1200) details.push('goal must contain 20-1200 characters')
  if (!reviewedAssessment.ok) details.push(...reviewedAssessment.errors)
  if (Array.isArray(body.formats) && formats?.length !== body.formats.length) details.push('formats contains an unsupported value')
  if (reviewedAssessment.ok) {
    const audit = validateEvidenceAgainstTranscript(reviewedAssessment.value.evidence, reviewedAssessment.value.transcriptTurns)
    if (!audit.ok) details.push(...audit.errors)
  }
  if (details.length || !reviewedAssessment.ok) {
    return json({ error: 'invalid_assessment', details }, 400)
  }

  const report = buildAssessmentReport({
    goal,
    evidence: reviewedAssessment.value.evidence,
    preferences: {
      targetLevels: reviewedAssessment.value.targetLevels,
      timeBudgetHours: reviewedAssessment.value.timeBudgetHours,
      // Private alpha is deliberately free-only. A client cannot opt into
      // paid recommendations by forging the request body.
      freeOnly: true,
      formats,
      limit: Number.isInteger(body.limit) ? Number(body.limit) : undefined,
    },
  })

  if (runtime.principal && runtime.service && ownedSession) {
    try {
      const saved = await runtime.service.saveOwnedReport(runtime.principal, ownedSession.id, report)
      if (!saved) return json({ error: 'session_not_found' }, 404)
    } catch (error) {
      if (isRecord(error) && error.code === 'trusted_writer_unavailable') {
        return json({ error: 'durable_report_writer_unavailable' }, 503)
      }
      throw error
    }
  }

  return json({
    mock: runtime.mode !== 'supabase',
    owned: Boolean(ownedSession),
    persistence: ownedSession ? runtime.capability.persistence : 'none',
    productionReady: runtime.capability.productionReady,
    analysisMode: 'deterministic-local',
    report,
  })
}
