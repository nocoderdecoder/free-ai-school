# AI Path consumer launch checklist

## Work that can continue without the owner

- [x] Patch the public framework dependency.
- [x] Put the current diagnostic result behind a strict server boundary.
- [x] Build fail-closed passwordless authentication source.
- [x] Build atomic content-free distributed rate limiting source and DB proof.
- [x] Add application CI, enforced baseline CSP, and security review.
- [x] Build canonical current diagnostic persistence and checked-in two-user RLS proof.
- [x] Wire explicit-consent authenticated save behind the hosted-proof latch.
- [ ] Add saved-plan resume/history after hosted persistence is proven.
- [x] Add full account export source and minimal account controls.
- [ ] Add session-bound reauthentication and activate account deletion only after hosted proof.
- [ ] Add operational retention scheduling and proof.
- [ ] Add provider consent, spend accounting, kill switches, and log redaction tests.
- [ ] Add privacy, terms, sensitive-data warning, and age/audience copy.
- [ ] Add staging smoke, browser, accessibility, recovery, and rollback evidence.

## Owner decisions/actions to batch later

- [ ] Choose the production domain and hosting account.
- [ ] Confirm every production subdomain is HTTPS before adding HSTS `includeSubDomains` or preload.
- [ ] Choose/create the Supabase project and region; review billing, backups, and data residency.
- [ ] Configure the exact Site URL and `/ai-path/auth/callback` redirect—no wildcard redirect.
- [ ] Configure branded authentication email delivery and DNS records.
- [ ] Provide the privacy-policy operator name/contact and intended age/audience.
- [ ] Approve the final retention period and support/deletion SLA.
- [ ] Set explicit OpenAI monthly/daily spend ceilings and alerts before enabling provider traffic.
- [ ] Approve Realtime voice activation separately after text-only launch evidence.

## Launch gates

1. Every CI and disposable database proof passes for the exact commit.
2. Production dependency audit has no unreviewed reachable high/critical issue.
3. Two test users cannot read, change, export, or delete each other’s data.
4. Rate limits work across concurrent instances and provider-side auth limits are configured.
5. Account export/deletion and scheduled retention are proven end to end.
6. No secret, prompt, answer, transcript, authorization header, or raw identity appears in logs.
7. Mobile/tablet/desktop and keyboard/accessibility flows pass.
8. Monitoring, cost alerts, incident owner, backup restore, and rollback are evidenced.
9. Privacy/terms/voice consent are published and reviewed.
10. Paid text AI and Realtime remain separate, independently reversible releases.
