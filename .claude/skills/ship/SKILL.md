---
name: ship
description: Pre-deploy checklist, deploy, and post-deploy verification for this Vercel-hosted site. Use when work is QA'd and ready to go live, when pushing to main, or when the user says "ship", "deploy", or "release".
---

# Ship

Pushing to `main` deploys to production via Vercel. Shipping is therefore three
steps, and the third is not optional: **pre-flight → push → verify in prod**.

## 1. Pre-flight

- [ ] `/qa` completed with verification level L2 (exercised) — or an explicit,
      stated reason why L1 is acceptable for this change.
- [ ] `npm run build` green on the exact tree being pushed.
- [ ] Diff review: `git diff main` (or the PR diff) read top to bottom. Look
      specifically for: leftover debug logging, hardcoded test values, secrets,
      commented-out code.
- [ ] New env vars? They must be set in Vercel **before** the push, and
      documented in the README. A deploy that needs an unset env var is an
      outage you scheduled.
- [ ] Anything outward-facing in this deploy — emails, content publishing,
      schema changes affecting live documents, URL changes? Confirm the dry run
      happened and the owner approved. Public URLs being removed need a
      redirect.
- [ ] Commits are clean, one concern each, imperative what+why messages.

## 2. Push

- Small batches. One feature per deploy beats five — when production breaks,
  the suspect list should have one name on it.
- Push to the designated branch / open the PR per the session's instructions;
  merge to `main` only when that's the explicit intent.

## 3. Post-deploy verification (part of the deploy, not an extra)

- [ ] Wait for the Vercel deploy to go green; check build logs for warnings
      that didn't appear locally.
- [ ] Open the changed pages **on the production URL**. Exercise the changed
      flow once for real.
- [ ] For API/tool changes: one real request against prod, including one
      invalid request (confirm friendly error + rate limiting live).
- [ ] For cron/pipeline changes: trigger the workflow once via
      `workflow_dispatch` and read its output, or note the next scheduled run
      and check it then. Do not ship pipeline changes blind into a nightly cron.
- [ ] Skim Vercel runtime logs for new errors in the first minutes.

Report completion as: **what shipped, verification level reached (should be L3
now), and anything deferred**.

## Rollback

The fastest rollback is Vercel's "redeploy previous deployment" — use it first,
investigate second. `git revert` the offending commit afterward so `main`
matches reality. Sanity schema/content and sent emails do **not** roll back
with the code; that's why they get dry runs before shipping (see pre-flight).
