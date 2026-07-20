import { handleAnalyticsEventRequest } from '@/app/ai-path/lib/analytics-http'
import { getAnalyticsIntakeRuntime } from '@/app/ai-path/lib/analytics.server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleAnalyticsEventRequest(request, getAnalyticsIntakeRuntime())
}
