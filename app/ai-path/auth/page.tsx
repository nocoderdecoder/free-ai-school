import type { Metadata } from 'next'

import { normalizeAIPathReturnPath } from '../lib/consumer-auth'
import { getConsumerAuthCapability } from '../lib/consumer-auth.server'
import { RememberMe } from './RememberMe'
import './auth.css'

export const metadata: Metadata = {
  title: { absolute: 'Sign in — AI Path' },
  description: 'Sign in securely to continue your AI Path assessment.',
  robots: { index: false, follow: false },
}

type AuthPageSearchParams = Promise<{
  error?: string | string[]
  next?: string | string[]
  sent?: string | string[]
}>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function AIPathAuthPage({ searchParams }: { searchParams: AuthPageSearchParams }) {
  const parameters = await searchParams
  const capability = getConsumerAuthCapability()
  const next = normalizeAIPathReturnPath(first(parameters.next))
  const sent = first(parameters.sent) === '1'
  const error = first(parameters.error)
  const message = error === 'invalid_email'
    ? 'Enter a valid email address.'
    : error === 'invalid_callback'
      ? 'That sign-in link is invalid or has expired. Request a new one.'
      : error === 'google_sign_in_failed'
        ? 'Google sign-in is not available yet. Try email or ask the site owner to enable Google in Supabase.'
      : error === 'sign_in_failed'
        ? 'We could not send a sign-in link. Please try again shortly.'
        : error === 'too_many_attempts'
          ? 'Too many sign-in attempts. Please wait a few minutes and try again.'
          : error === 'sign_in_unavailable'
            ? 'Sign-in is temporarily unavailable. Please try again shortly.'
        : error === 'session_unavailable'
          ? 'We could not verify your session. Please sign in again.'
          : error
            ? 'Sign-in is not available yet.'
            : null
  const googleFormId = 'ai-path-google-sign-in'
  const emailFormId = 'ai-path-email-sign-in'

  return (
    <main className="ap-auth-shell">
      <section className="ap-auth-card" aria-labelledby="auth-title">
        <aside className="ap-auth-aside" aria-label="AI Path">
          <a className="ap-auth-brand" href="/ai-path" aria-label="AI Path home">
            <span aria-hidden="true">↗</span>
            <strong>AI Path</strong>
          </a>
          <div>
            <p className="ap-auth-kicker">Private workspace</p>
            <h2>Adaptive AI learning, kept under your account.</h2>
          </div>
        </aside>

        <div className="ap-auth-panel">
          <p className="ap-auth-eyebrow">Secure access</p>
          <h1 id="auth-title">Sign in</h1>
          <p className="ap-auth-intro">Pick up where you left off.</p>

          {sent ? (
            <div className="ap-auth-notice ap-auth-success" role="status" aria-live="polite">
              <strong>Check your inbox.</strong>
              <span>Use the link we sent to continue.</span>
            </div>
          ) : null}
          {message ? (
            <div className="ap-auth-notice ap-auth-error" role="alert">
              {message}
            </div>
          ) : null}

          <form id={googleFormId} method="post" action="/api/ai-path/auth/google" className="ap-auth-form ap-auth-google-form">
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="ap-auth-google" disabled={!capability.available}>
              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" />
                <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.7Z" />
                <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7A6 6 0 0 1 12 5.9Z" />
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="ap-auth-divider" aria-hidden="true"><span>or</span></div>

          <form id={emailFormId} method="post" action="/api/ai-path/auth/sign-in" className="ap-auth-form ap-auth-email-form">
            <input type="hidden" name="next" value={next} />
            <label htmlFor="ai-path-email">Email</label>
            <input
              id="ai-path-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              required
              disabled={!capability.available}
              placeholder="you@example.com"
            />
            <RememberMe googleFormId={googleFormId} emailFormId={emailFormId} />
            <button type="submit" disabled={!capability.available}>
              Continue
            </button>
          </form>

          {!capability.available ? (
            <p className="ap-auth-footnote">
              Authentication is disabled until configuration is complete.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
