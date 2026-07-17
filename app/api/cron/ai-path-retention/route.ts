import { handleAiPathRetentionPost } from '../../../ai-path/lib/retention-http.ts'
import { getAiPathRetentionHttpRuntime } from '../../../ai-path/lib/retention-runtime.server.ts'

export const runtime = 'nodejs'
export const maxDuration = 60

// Activation requires the applied database migrations, a monitored scheduler,
// alerting, and behavioral purge/deletion tests. Environment strings alone
// cannot make this route mutate durable learner data.
export const AI_PATH_RETENTION_JOB_READY = false as const

export async function POST(request: Request) {
  return handleAiPathRetentionPost(
    request,
    getAiPathRetentionHttpRuntime(AI_PATH_RETENTION_JOB_READY),
  )
}
