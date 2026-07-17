import { handleAiPathRetentionPost } from '../../../ai-path/lib/retention-http.ts'

export const runtime = 'nodejs'
export const maxDuration = 60

// Activation requires the applied database migrations, a monitored scheduler,
// alerting, and behavioral purge/deletion tests. Environment strings alone
// cannot make this route mutate durable learner data.
export const AI_PATH_RETENTION_JOB_READY = false as const

export async function POST(request: Request) {
  return handleAiPathRetentionPost(request, {
    available: AI_PATH_RETENTION_JOB_READY,
    secret: AI_PATH_RETENTION_JOB_READY ? process.env.AI_PATH_RETENTION_JOB_SECRET ?? null : null,
    run: async () => {
      throw new Error('AI Path retention adapter is not activated.')
    },
  })
}
