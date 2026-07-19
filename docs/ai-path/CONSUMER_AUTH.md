# AI Path consumer authentication

AI Path now has a dormant, fail-closed Supabase Auth foundation. No Supabase project, email provider, paid plan, or production data path is activated by this code.

## What is implemented

- Passwordless email magic-link and Google OAuth sign-in through server-only route handlers.
- A one-time PKCE callback exchange with an AI-Path-only return-path allowlist.
- POST-only sign-out with an exact same-origin check.
- Route-scoped SSR cookie refresh and verified `getUser()` identity checks in `proxy.ts`.
- Secure production cookie overrides: `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`.
- Private, no-store auth responses so session cookies cannot be cached by a CDN.
- A simple keyboard-accessible sign-in page at `/ai-path/auth`.
- Layered application limits: five sign-in attempts per IP per 15 minutes, three sends per normalized email per hour, and ten callback exchanges per IP per 15 minutes. Stored counters receive only salted hashes.

The existing database persistence, rate-limit, Realtime, and paid-provider latches remain unchanged and closed.

## Configuration required later

Configure these values only in the deployment secret/environment manager:

```text
AI_PATH_CONSUMER_AUTH_ENABLED=true
AI_PATH_PUBLIC_ORIGIN=https://your-reviewed-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://<20-character-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
```

Do not place `SUPABASE_SERVICE_ROLE_KEY` in browser code or use it as the publishable key. It is not needed by this authentication flow.

Before enabling the flag:

1. Create or select the reviewed Supabase project and confirm its region, retention, backups, and billing limits.
2. In Supabase Auth URL Configuration, set the Site URL to `AI_PATH_PUBLIC_ORIGIN`.
3. Add exactly `${AI_PATH_PUBLIC_ORIGIN}/ai-path/auth/callback` to the allowed redirect URLs. Do not use wildcard production redirects.
4. For local testing from both browser names, add `http://localhost:3000/ai-path/auth/callback` and `http://127.0.0.1:3000/ai-path/auth/callback`. The app accepts these equivalent loopback names only in development and only on the configured port.
5. In Google Cloud, create a Web OAuth client. Add the Supabase callback shown under **Supabase → Authentication → Providers → Google** as an authorized redirect URI. This is normally `https://<project-ref>.supabase.co/auth/v1/callback`; copy the exact value shown by Supabase.
6. In **Supabase → Authentication → Providers → Google**, enable Google and enter the Google client ID and client secret. Keep the client secret only in Supabase/your secret manager—never in this repository or a `NEXT_PUBLIC_*` variable.
7. Configure branded transactional email and its domain authentication, then test delivery and expiry.
8. Set provider-side OTP expiry and email-send throttles, plus application/distributed rate limits.
9. Enable provider-side CAPTCHA/bot protection and alert on abnormal user creation or failed-send volume.
10. Run email, Google OAuth, ownership/RLS, CSRF, account-deletion, and abuse tests in staging.
11. Open the consumer-auth environment flag only after the launch review passes.

## Deliberate boundaries

- Authentication does not open durable assessment persistence. The existing reviewed database latch controls that separately.
- Proxy performs route pre-filtering and refresh; database operations must still verify the authenticated owner at the data-access layer and enforce RLS.
- Sign-in failures use generic messages and do not reveal whether an email address already has an account.
