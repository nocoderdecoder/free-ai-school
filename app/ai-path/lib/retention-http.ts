import { randomUUID } from 'node:crypto'

import type { AiPathRetentionCycleResult } from './retention.ts'

export type AiPathRetentionHttpRuntime = {
  available: boolean
  secret: string | null
  run: (runId: string) => Promise<AiPathRetentionCycleResult>
}

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function constantTimeTextEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length)
  let difference = left.length ^ right.length
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }
  return difference === 0
}

export async function handleAiPathRetentionPost(
  request: Request,
  runtime: AiPathRetentionHttpRuntime,
) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!runtime.available || !runtime.secret || runtime.secret.length < 24) {
    return json({ error: 'retention_job_unavailable' }, 503)
  }
  const authorization = request.headers.get('authorization') ?? ''
  if (!constantTimeTextEqual(authorization, `Bearer ${runtime.secret}`)) {
    return json({ error: 'authentication_required' }, 401)
  }
  if (request.body !== null) {
    return json({ error: 'request_body_not_allowed' }, 400)
  }
  try {
    const result = await runtime.run(`retention_${randomUUID().replaceAll('-', '')}`)
    return json({ ok: true, ...result }, 200)
  } catch {
    return json({ error: 'retention_job_failed' }, 503)
  }
}
