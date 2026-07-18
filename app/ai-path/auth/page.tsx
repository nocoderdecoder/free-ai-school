import type { Metadata } from 'next'

import { normalizeAIPathReturnPath } from '../lib/consumer-auth'
import { getConsumerAuthCapability } from '../lib/consumer-auth.server'
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

  return (
    <main className="ap-auth-shell">
      <section className="ap-auth-card" aria-labelledby="auth-title">
        <a className="ap-auth-brand" href="/ai-path" aria-label="AI Path home">
          <span aria-hidden="true">↗</span>
          <strong>AI Path</strong>
        </a>
        <p className="ap-auth-eyebrow">Your private learning plan</p>
        <h1 id="auth-title">Sign in with your email</h1>
        <p className="ap-auth-intro">We’ll send a one-time link. No password to remember.</p>

        {sent ? (
          <div className="ap-auth-notice ap-auth-success" role="status" aria-live="polite">
            <strong>Check your inbox.</strong>
            <span>Open the link we sent to continue. You can close this page.</span>
          </div>
        ) : null}
        {message ? (
          <div className="ap-auth-notice ap-auth-error" role="alert">
            {message}
          </div>
        ) : null}

        <form method="post" action="/api/ai-path/auth/sign-in" className="ap-auth-form">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="ai-path-email">Email address</label>
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
          <button type="submit" disabled={!capability.available}>
            Email me a sign-in link
          </button>
        </form>

        <p className="ap-auth-footnote">
          {capability.available
            ? 'The link is single-use. Your session stays in a secure, HTTP-only cookie.'
            : 'Authentication is safely disabled until the production configuration is completed.'}
        </p>
      </section>
    </main>
  )
}
