# AI Path OpenAI integration

AI Path keeps the interview route application-owned. OpenAI may clarify a thin
answer or phrase the next planned question, but it cannot add, remove, reorder,
or skip diagnostic sections.

## Local secret setup

Use the ignored `.env.local` file at the repository root:

```dotenv
OPENAI_API_KEY=your-key-from-the-OpenAI-platform
AI_PATH_ADAPTIVE_MODEL=gpt-5.6-luna
AI_PATH_ADAPTIVE_MODEL_ENABLED=false
```

Never paste the key into chat, place it in a `NEXT_PUBLIC_` variable, include it
in browser code, or commit it to Git. Restart the Next.js development server
after changing `.env.local`.

`AI_PATH_ADAPTIVE_MODEL_ENABLED=false` is intentional. A code-level latch also
keeps provider traffic fail-closed. Both controls remain closed until paid API
usage has explicit approval and the adaptive behavior suite passes.

## Interview contract

- Six fixed sections on either the use-case or capability-growth path.
- At most two clarifiers in the complete interview.
- At most one clarifier for any section.
- A clarifier remains on the current section; an advance moves only to the next
  fixed section.
- Model output uses strict Structured Outputs and is revalidated by the server.
- Timeouts, refusals, invalid output, missing configuration, and provider errors
  fall back to the deterministic route without exposing provider details.
- Learner context is bounded, links are removed, and API responses are not
  stored by OpenAI (`store: false`).

## Activation checklist

1. Put the key in `.env.local` or the production host's server-side secret
   manager.
2. Run the adaptive behavior and HTTP tests.
3. Confirm explicit approval for paid OpenAI API usage.
4. Review and open the code-level adaptive-model latch.
5. Set `AI_PATH_ADAPTIVE_MODEL_ENABLED=true`.
6. Run one bounded live smoke test and inspect the returned decision without
   logging the key or raw private learner answers.

Realtime voice is activated separately. It reuses this interview policy, but
its WebRTC session, admission, spend, and lifecycle gates remain independent.
