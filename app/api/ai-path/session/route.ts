import { randomUUID } from 'node:crypto'

import { parseSessionStartInput } from '../../../ai-path/lib/foundation'
import { checkRateLimit, rateLimitResponse } from '../../../lib/rateLimit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, { tool: 'ai-path-session', limit: 30, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return rateLimitResponse(rate)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = parseSessionStartInput(body)
  if (!parsed.ok) {
    return Response.json({ error: 'invalid_session', details: parsed.errors }, { status: 400 })
  }

  const now = new Date().toISOString()
  return Response.json({
    session: {
      id: randomUUID(),
      status: 'consented',
      createdAt: now,
      mode: parsed.value.mode,
      locale: parsed.value.locale,
      goal: parsed.value.goal,
      targetRole: parsed.value.targetRole ?? null,
      consentVersion: parsed.value.consentVersion,
      saveTranscript: parsed.value.saveTranscript,
    },
    mock: true,
    persistence: 'none',
    message: 'This foundation route validates and returns a mock session. Add authenticated persistence before production.',
  }, {
    status: 201,
    headers: { 'Cache-Control': 'no-store' },
  })
}
