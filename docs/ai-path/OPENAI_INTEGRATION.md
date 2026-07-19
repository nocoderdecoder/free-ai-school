# AI Path OpenAI integration

AI Path keeps the interview route and learner-facing question library
application-owned. OpenAI reads the completed answer context and selects the
best expert-approved variant for the one permitted next slot; it cannot write
new learner-facing copy, add, remove, repeat, reorder, or skip sections.

## Local secret setup

Use the ignored `.env.local` file at the repository root:

```dotenv
OPENAI_API_KEY=your-key-from-the-OpenAI-platform
AI_PATH_ADAPTIVE_MODEL=gpt-5-nano
AI_PATH_ADAPTIVE_MODEL_ENABLED=false
AI_PATH_ALLOW_PAID_API_CALLS=false
```

Never paste the key into chat, place it in a `NEXT_PUBLIC_` variable, include it
in browser code, or commit it to Git. Restart the Next.js development server
after changing `.env.local`.

Both flags default to `false` intentionally. The reviewed code latch is open,
but the feature flag, explicit paid-call approval, server-only API key,
verified-user requirement, exact model pin and rate limit must all pass before
the provider can receive a request.

`gpt-5-nano` is the reviewed low-cost choice for this narrow approved-variant
selection step. Requests use minimal reasoning effort, the standard service tier, a
300-token output ceiling, no tools, and no response storage. Upgrade the model
only if evaluation data shows that it cannot reliably satisfy the schema and
teacher-policy tests. The server pins `gpt-5-nano` as the only accepted model
for this feature, so an environment change cannot silently select a more
expensive model.

## Interview contract

- Six fixed sections on either the use-case or capability-growth path.
- At most two clarifiers in the complete interview.
- At most one clarifier for any section.
- A clarifier remains on the current section; an advance moves only to the next
  fixed section.
- Model output contains only the fixed action and an approved variant ID, uses
  strict Structured Outputs, and is revalidated by both server and client.
- A strong deterministic answer match is a relevance floor: the provider may
  improve ambiguous selection but cannot downgrade a clearly matched variant.
- Timeouts, refusals, invalid output, missing configuration, and provider errors
  fall back to the deterministic route without exposing provider details.
- Learner context is bounded, links are removed, and API responses are not
  stored by OpenAI (`store: false`).

## Activation checklist

1. Put the key in `.env.local` or the production host's server-side secret
   manager.
2. Run the adaptive behavior and HTTP tests.
3. Confirm the deployment's spend ceiling and alerting.
4. Set `AI_PATH_ADAPTIVE_MODEL_ENABLED=true`.
5. After explicit approval for paid provider traffic, set
   `AI_PATH_ALLOW_PAID_API_CALLS=true`.
6. Run one bounded live smoke test and inspect the returned decision without
   logging the key or raw private learner answers.

Realtime voice is activated separately. It reuses this interview policy, but
its WebRTC session, admission, spend, and lifecycle gates remain independent.
