import { NextResponse } from 'next/server'

import {
  AI_PATH_AUTH_HOME,
  isExactMutationOrigin,
} from '@/app/ai-path/lib/consumer-auth'
import {
  applyConsumerAuthResponse,
  consumerAuthPublicOrigin,
  createConsumerAuthRequestContext,
  getConsumerAuthCapability,
} from '@/app/ai-path/lib/consumer-auth.server'

export async function POST(request: Request) {
  const capability = getConsumerAuthCapability()
  if (!capability.available) {
    return NextResponse.json({ error: 'authentication_unavailable' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  if (!isExactMutationOrigin(request, consumerAuthPublicOrigin(request, capability))) {
    return NextResponse.json({ error: 'cross_origin_request_rejected' }, {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const context = createConsumerAuthRequestContext(request)
  await context.client.auth.signOut({ scope: 'local' })
  const response = NextResponse.redirect(
    new URL(AI_PATH_AUTH_HOME, consumerAuthPublicOrigin(request, capability)),
    303,
  )
  return applyConsumerAuthResponse(context, response)
}
