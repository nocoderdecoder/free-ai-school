import type { Metadata } from 'next'

import { AI_PATH_ACCOUNT_EXPORT_RUNTIME_LATCH } from '../lib/account-privacy'
import { getConsumerAuthCapability, getVerifiedConsumerUser } from '../lib/consumer-auth.server'
import { AccountControls } from './AccountControls'
import './account.css'

export const metadata: Metadata = {
  title: { absolute: 'Your account — AI Path' },
  description: 'Manage your AI Path account and data.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AIPathAccountPage() {
  const authConfigured = getConsumerAuthCapability().available
  const user = authConfigured ? await getVerifiedConsumerUser() : null
  const isSignedIn = Boolean(user)

  return (
    <main className="ap-account-shell">
      <section className="ap-account-card" aria-labelledby="account-title">
        <header className="ap-account-header">
          <a className="ap-account-back" href="/ai-path">Back to AI Path</a>
          <div>
            <p className="ap-account-eyebrow">Settings</p>
            <h1 id="account-title">Account</h1>
            <p className="ap-account-intro">
              Manage your sign-in, saved AI Path data, and privacy controls.
            </p>
          </div>
        </header>
        {!authConfigured ? (
          <div className="ap-account-preview" role="status">
            Account actions are disabled in this local preview. They appear after secure sign-in is configured.
          </div>
        ) : !isSignedIn ? (
          <div className="ap-account-preview" role="status">
            Sign in to view or manage your AI Path account data. <a href="/ai-path/auth?next=/ai-path/account">Sign in</a>
          </div>
        ) : null}
        {isSignedIn ? (
          <AccountControls
            authConfigured
            exportEnabled={AI_PATH_ACCOUNT_EXPORT_RUNTIME_LATCH}
            user={user}
          />
        ) : null}
      </section>
    </main>
  )
}
