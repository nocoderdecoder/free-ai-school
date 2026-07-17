# OpenAI Realtime provider readiness

Status: architecture review only. Paid traffic, provider credentials, public
bootstrap, and every Realtime production latch remain disabled.

Last checked against official OpenAI documentation: 2026-07-17.

## Chosen connection contract

Use the GA unified WebRTC interface for a future browser voice alpha:

1. the authenticated browser creates a WebRTC offer and sends only the bounded
   SDP to the application;
2. the application proves persisted assessment ownership and atomically reserves
   an enabled, budgeted database admission intent;
3. the application sends SDP plus the server-owned session configuration to
   `POST /v1/realtime/calls` using the standard API key only on the server;
4. the application returns the SDP answer to the browser;
5. WebRTC carries audio and the data channel carries governed session events;
6. the application finalizes or cancels the original admission tuple without
   trusting browser-supplied cost, ownership, policy, or clock values.

OpenAI currently recommends WebRTC rather than WebSockets for browser/mobile
clients. The unified interface deliberately puts this application server in the
session-initialization path. That tradeoff fits this product because ownership,
consent, safety identity, interview configuration, and spend admission must be
authoritative before a paid call exists.

The existing dormant provider boundary already uses the current GA call URL,
the `gpt-realtime-2.1` default, server-owned configuration, and no beta header.
It must not be connected to the public route until every release gate below is
proven.

The preceding authenticated preparation boundary is now implemented through an
exact atomic admission reservation, with deterministic server-owned retry
identity and adversarial zero-provider-call tests. It deliberately stops before
the provider boundary. Request-scoped split-credential assembly, unknown-commit
replay evidence, lifecycle reconciliation, and both independent code latches are
still closed requirements—not implied readiness.

Official references:

- [Realtime and audio](https://developers.openai.com/api/docs/guides/realtime)
- [Realtime API with WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices#implement-safety-identifiers)

## Provider-bound safety contract

- Standard OpenAI API keys exist only in server secret storage and never enter
  browser responses, SDP, logs, analytics, or repository fixtures.
- The trusted server sets `OpenAI-Safety-Identifier` on the unified WebRTC call
  request. It uses the existing stable, salted, privacy-preserving identifier,
  never an email, account ID, assessment answer, or browser fingerprint.
- A safety identifier is supplied independently for every Realtime session; it
  is not assumed to carry over from another API or earlier session.
- Session instructions treat learner speech as evidence data, not instructions
  that can replace the interview policy. The live model asks questions only; it
  cannot score, issue credentials, select URLs, or write an authoritative report.
- Audio is not persisted by default. Transcript persistence, if later approved,
  is an explicit, editable, owner-scoped data product with the same export,
  deletion, and retention gates as typed input.
- No raw audio, SDP, transcript text, ephemeral secret, provider error body, or
  complete event payload enters operational logs or analytics.

## Release evidence required before any live call

1. Explicit paid-use approval in chat plus monthly, daily, per-user, per-session,
   and per-reservation ceilings.
2. Passing disposable PostgreSQL behavioral proof for authenticated intent
   issuance, database-owned continuity, concurrency, idempotent replay, timeout,
   deletion, retention, and seven-day spend reconciliation.
3. Authenticated durable text sessions already operating safely, including
   owner export, immediate deletion, bounded retention, monitoring, rollback,
   credential rotation, and incident revocation.
4. The provider-free route contract proves anonymous, unowned, non-consented,
   duplicate/capacity, over-budget, and malformed requests stop before a
   provider input exists. Complete the remaining assembled staging proof for
   expired, killed, database-timeout, and unknown-commit requests with
   instrumented zero provider invocations before reviewing either route latch.
5. Browser tests for permission denial, device loss, interruption, reconnect,
   tab closure, backgrounding, network loss, partial transcript, duplicated
   events, and immediate typed fallback.
6. Adversarial voice fixtures covering prompt injection, sensitive information,
   unclear audio, accents, non-native English, background speech, long silence,
   and attempts to obtain scoring or off-catalog recommendations.
7. A calibrated text-versus-voice study showing comparable completion,
   correction, materially-wrong-finding, and first-action outcomes. Voice novelty
   or latency alone is not a release reason.
8. Transcript-free operational telemetry for call setup, disconnect, first-audio
   latency, duration, admitted/denied reason, reservation/finalization state, and
   bounded integer cost accounting.

## Stop conditions

Keep voice disabled or immediately return to typed fallback if the database
admission decision is unavailable, ownership cannot be reverified, the kill
switch is disabled, provider state is ambiguous after timeout, deletion or
retention evidence is stale, safety configuration is missing, or any budget cap
cannot be proven. Provider availability must never weaken those controls.
