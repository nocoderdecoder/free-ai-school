# AI Path account export and deletion

Status: source-complete foundation, deliberately disabled. No provider, hosted database, analytics sink, or paid service was activated.

## Consumer contract

- `POST /api/ai-path/account/export` returns a no-store JSON download containing the verified owner's assessment sessions, complete learning-plan history, and owner-linked Realtime admission records.
- `POST /api/ai-path/account/delete` requires an exact same-origin request, the exact phrase `DELETE MY AI PATH ACCOUNT`, a verified user, and a one-time reauthentication proof bound to the current session. The account-wide `last_sign_in_at` field is explicitly not accepted.
- Deletion first checks for an active paid voice lease. It then erases every governed analytics record for the account and finally removes the Auth user. Database foreign keys cascade the owner-linked product records. The database trigger remains the race-safe authority and blocks deletion while a paid lease is active.
- A successful deletion returns `Clear-Site-Data` for cookies, storage, and cache. The product UI must also navigate away immediately and must not recreate an anonymous analytics identity on that response.

The server never accepts an owner ID from the browser. Owner scope always comes from a server-verified Supabase user and `auth.uid()` inside the database functions.

## Why it is still disabled

Both account privacy latches are literal `false` values. Even complete environment variables and existing credentials cannot open them. The production analytics deletion connector is also an intentional throwing boundary: account deletion must not claim success while a future analytics vendor still holds linked data.

Before a reviewed code change can open the latches, collect all of the following against an isolated Supabase-compatible staging project:

1. Apply the complete migration chain including `20260718020000_ai_path_account_privacy.sql`.
2. Prove with two verified users that neither can export the other's sessions, reports, plans, check-ins, or Realtime records.
3. Prove direct Auth deletion cascades all owner-linked raw state, while an active paid voice lease blocks deletion and an elapsed lease is reconciled safely.
4. Configure the production Auth redirect allowlist, SMTP delivery, abuse controls, and HTTPS public origin.
5. Implement the governed analytics sink's idempotent delete-by-account-pseudonym operation. Attest its 24-hour deletion SLO and make it observable without logging personal data.
6. Decide the consumer retention notice and legal basis with privacy counsel. Align the notice, database retention, backups, analytics retention, and vendor deletion behavior.
7. Exercise export size and timeout behavior with the largest allowed 90-day account. If the single JSON response is too large, replace it with an asynchronous encrypted export job before launch.
8. Add the account settings UI with a current-session-bound one-time reauthentication ceremony, accessible confirmation, download, deletion status, and failure recovery.
9. Run hosted rollback/recovery and Auth-admin credential rotation drills. Store evidence at reviewed HTTPS references.

Only then set the attestation environment variables and make a reviewed code change that opens the two latches. Environment changes alone are intentionally insufficient.

The account export includes the current consumer diagnostic intake/result collection. Every future owner-linked table must update this export and its two-user proof in the same migration series.
