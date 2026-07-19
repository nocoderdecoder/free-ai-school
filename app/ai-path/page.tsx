import type { Metadata } from 'next'
import { AdvisorApp } from './AdvisorApp'
import { getConsumerAuthCapability, hasVerifiedConsumerSession } from './lib/consumer-auth.server'
import { getConsumerDiagnosticPersistenceCapability } from './lib/diagnostic-persistence-runtime.server'
import { getRealtimeCapability } from './lib/realtime.server'
import './ai-path.css'
import './components/voice-experience/voice-experience.css'

export const metadata: Metadata = {
  title: {
    absolute: 'AI Path — Your practical AI plan',
  },
  description: 'Answer six short questions and get a practical AI project, learning plan, and first step.',
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = 'force-dynamic'

export default async function AIPathPage() {
  const authConfigured = getConsumerAuthCapability().available
  const authenticatedExperienceEnabled = authConfigured && await hasVerifiedConsumerSession()
  const storagePersistenceAvailable = authenticatedExperienceEnabled
    && getConsumerDiagnosticPersistenceCapability().available
  const realtimeCapability = getRealtimeCapability()
  return (
    <div className="aiPath">
      <AdvisorApp
        authenticatedExperienceEnabled={authenticatedExperienceEnabled}
        storagePersistenceAvailable={storagePersistenceAvailable}
        realtimeVoiceAvailable={realtimeCapability.liveEnabled}
      />
    </div>
  )
}
