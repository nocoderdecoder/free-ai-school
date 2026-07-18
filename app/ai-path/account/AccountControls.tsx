'use client'

const SAVED_PLAN_STORAGE_KEY = 'ai-path.saved-next-step.v1'

export function AccountControls({
  authConfigured,
  exportEnabled,
}: {
  authConfigured: boolean
  exportEnabled: boolean
}) {
  return (
    <div className="ap-account-actions">
      <section className="ap-account-row" aria-labelledby="account-export-title">
        <div>
          <h2 id="account-export-title">Download your data</h2>
          <p id="account-export-help">
            Get a JSON copy of your questions, plans, progress, and account-linked voice usage.
          </p>
          {!exportEnabled ? (
            <p className="ap-account-status" role="status">
              Download is wired but stays off until the hosted owner-isolation test is approved.
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
        <div>
          <h2 id="account-signout-title">Sign out</h2>
          <p id="account-signout-help">End this browser session and remove the locally saved next step.</p>
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
        <div>
          <h2 id="account-delete-title">Delete account</h2>
          <p id="account-delete-help">
            Permanently remove your account and its saved AI Path data.
          </p>
          <p className="ap-account-status" role="status">
            Not available yet. We must first add a session-bound re-verification step so an unattended
            signed-in browser cannot delete your account.
          </p>
        </div>
        <button type="button" disabled aria-describedby="account-delete-help">
          Delete account
        </button>
      </section>
    </div>
  )
}
