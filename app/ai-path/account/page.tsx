import type { Metadata } from 'next'

import { AI_PATH_ACCOUNT_EXPORT_RUNTIME_LATCH } from '../lib/account-privacy'
import { getConsumerAuthCapability } from '../lib/consumer-auth.server'
import { AccountControls } from './AccountControls'
import './account.css'

export const metadata: Metadata = {
  title: { absolute: 'Your account — AI Path' },
  description: 'Manage your AI Path account and data.',
  robots: { index: false, follow: false },
}

export default function AIPathAccountPage() {
  const authConfigured = getConsumerAuthCapability().available

  return (
    <main className="ap-account-shell">
      <section className="ap-account-card" aria-labelledby="account-title">
        <a className="ap-account-back" href="/ai-path">← Back to AI Path</a>
        <p className="ap-account-eyebrow">Account</p>
        <h1 id="account-title">Your account and data</h1>
        <p className="ap-account-intro">
          Keep the controls simple: download your information, sign out, or review deletion availability.
        </p>
        {!authConfigured ? (
          <div className="ap-account-preview" role="status">
            Account actions are disabled in this local preview. They appear after secure sign-in is configured.
          </div>
        ) : null}
        <AccountControls
          authConfigured={authConfigured}
          exportEnabled={AI_PATH_ACCOUNT_EXPORT_RUNTIME_LATCH}
        />
      </section>
    </main>
  )
}
