import {
  buildAssessmentReport,
  parseEvidenceRecords,
  parseTargetLevels,
  parseTranscriptTurns,
  validateEvidenceAgainstTranscript,
  type ResourceFormat,
} from '../../../ai-path/lib/foundation'
import { checkRateLimit, rateLimitResponse } from '../../../lib/rateLimit'

export const runtime = 'nodejs'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const resourceFormats = new Set<ResourceFormat>(['reading', 'course', 'project', 'reference'])

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, { tool: 'ai-path-analysis', limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return rateLimitResponse(rate)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!isRecord(body)) return Response.json({ error: 'invalid_body' }, { status: 400 })

  const goal = typeof body.goal === 'string' ? body.goal.trim() : ''
  const evidence = parseEvidenceRecords(body.evidence)
  const transcriptTurns = parseTranscriptTurns(body.transcriptTurns)
  const targetLevels = parseTargetLevels(body.targetLevels)
  const timeBudgetHours = Number.isInteger(body.timeBudgetHours) ? Number(body.timeBudgetHours) : 0
  const formats = Array.isArray(body.formats)
    ? body.formats.filter((format): format is ResourceFormat => typeof format === 'string' && resourceFormats.has(format as ResourceFormat))
    : undefined

  const details: string[] = []
  if (goal.length < 20 || goal.length > 1200) details.push('goal must contain 20-1200 characters')
  if (!evidence.ok) details.push(...evidence.errors)
  if (!transcriptTurns.ok) details.push(...transcriptTurns.errors)
  if (!targetLevels.ok) details.push(...targetLevels.errors)
  if (timeBudgetHours < 1 || timeBudgetHours > 80) details.push('timeBudgetHours must be an integer from 1-80')
  if (Array.isArray(body.formats) && formats?.length !== body.formats.length) details.push('formats contains an unsupported value')
  if (evidence.ok && transcriptTurns.ok) {
    const audit = validateEvidenceAgainstTranscript(evidence.value, transcriptTurns.value)
    if (!audit.ok) details.push(...audit.errors)
  }
  if (details.length || !evidence.ok || !transcriptTurns.ok || !targetLevels.ok) {
    return Response.json({ error: 'invalid_assessment', details }, { status: 400 })
  }

  const report = buildAssessmentReport({
    goal,
    evidence: evidence.value,
    preferences: {
      targetLevels: targetLevels.value,
      timeBudgetHours,
      freeOnly: body.freeOnly !== false,
      formats,
      limit: Number.isInteger(body.limit) ? Number(body.limit) : undefined,
    },
  })

  return Response.json({
    mock: true,
    persistence: 'none',
    analysisMode: 'deterministic-local',
    report,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
