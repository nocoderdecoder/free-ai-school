# AI Path rate limiting

AI Path uses a fixed, application-owned policy registry. Callers select a known
policy ID; they cannot supply arbitrary limits or windows. Local development and
tests use a bounded process-local atomic implementation. Production deliberately
returns a stable unavailable response and never falls back to process memory.

The dormant production boundary is provider-neutral. A future store must consume
the anonymous and verified-principal buckets atomically, use opaque salted keys,
and pass exact schema, credential-scope, atomicity, trusted-proxy, review, and
rollback attestations. `AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH` remains one literal
`false as const` declaration until that implementation is reviewed.

Forwarding headers are not trusted by default. A reviewed production assembly
must declare one to four trusted proxy hops; malformed, oversized, or incomplete
chains fail closed. The selected client address is hashed before it reaches a
distributed store. No raw address or principal identifier belongs in logs or
analytics.

Rate-limit errors are content-free, private, non-sniffable responses. Production
store unavailability returns `503 rate_limit_unavailable`; actual exhaustion
returns `429 rate_limit_exceeded`. Neither condition permits a paid provider call
or mutation fallback.
