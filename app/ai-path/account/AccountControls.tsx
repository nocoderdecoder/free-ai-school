'use client'

const SAVED_PLAN_STORAGE_KEY = 'ai-path.saved-next-step.v1'

type AccountUser = Readonly<{
  email: string | null
  provider: string | null
  lastSignInAt: string | null
}>

export function AccountControls({
  authConfigured,
  exportEnabled,
  user,
}: {
  authConfigured: boolean
  exportEnabled: boolean
  user: AccountUser | null
}) {
  const provider = user?.provider === 'google' ? 'Google' : user?.provider ? user.provider : 'Email'
  const lastSignIn = user?.lastSignInAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(user.lastSignInAt))
    : 'Current session'

  return (
    <div className="ap-account-actions">
      <section className="ap-account-panel ap-account-profile" aria-labelledby="account-profile-title">
        <div className="ap-account-avatar" aria-hidden="true">
          {(user?.email?.[0] ?? 'A').toUpperCase()}
        </div>
        <div className="ap-account-profile-body">
          <p className="ap-account-section-label">Signed in as</p>
          <h2 id="account-profile-title">{user?.email ?? 'AI Path user'}</h2>
          <dl className="ap-account-meta" aria-label="Account details">
            <div>
              <dt>Provider</dt>
              <dd>{provider}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{lastSignIn}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="ap-account-row" aria-labelledby="account-export-title">
        <div className="ap-account-row-copy">
          <p className="ap-account-section-label">Data</p>
          <h2 id="account-export-title">Download your data</h2>
          <p id="account-export-help">
            Export a JSON copy of your saved answers, plans, progress, and account activity.
          </p>
          {!exportEnabled ? (
            <p className="ap-account-status" role="status">
              Export will be available after data storage is enabled for this account.
            </p>
          ) : null}
        </div>
        <form method="post" action="/api/ai-path/account/export">
          <button
            type="submit"
            disabled={!authConfigured || !exportEnabled}
            aria-describedby="account-export-help"
          >
            Download data
          </button>
        </form>
      </section>

      <section className="ap-account-row" aria-labelledby="account-signout-title">
        <div className="ap-account-row-copy">
          <p className="ap-account-section-label">Security</p>
          <h2 id="account-signout-title">Sign out</h2>
          <p id="account-signout-help">End this browser session on this device.</p>
        </div>
        <form
          method="post"
          action="/api/ai-path/auth/sign-out"
          onSubmit={() => localStorage.removeItem(SAVED_PLAN_STORAGE_KEY)}
        >
          <button type="submit" disabled={!authConfigured} aria-describedby="account-signout-help">
            Sign out
          </button>
        </form>
      </section>

      <section className="ap-account-row ap-account-danger" aria-labelledby="account-delete-title">
        <div className="ap-account-row-copy">
          <p className="ap-account-section-label">Privacy</p>
          <h2 id="account-delete-title">Delete account</h2>
          <p id="account-delete-help">
            Permanently remove your account and its saved AI Path data.
          </p>
          <p className="ap-account-status" role="status">
            Account deletion is not available yet.
          </p>
        </div>
        <button type="button" disabled aria-describedby="account-delete-help">
          Delete account
        </button>
      </section>
    </div>
  )
}
