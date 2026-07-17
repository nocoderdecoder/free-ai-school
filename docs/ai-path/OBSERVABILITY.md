# AI Path observability and privacy-safe analytics

Status: local foundation only. No production or external analytics sink is
implemented or enabled. `AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH` is a literal
`false`, so deployment variables cannot activate production collection.

## Data contract

The intake reuses the governed event schemas in
`app/ai-path/catalog/measurement.ts`. Events may contain only:

- the pinned measurement version;
- an allowlisted event name;
- an ISO event timestamp;
- a random opaque anonymous ID;
- an optional opaque assessment-session ID;
- allowlisted enum, boolean, and bounded numeric properties.

Answers, transcripts, audio, prompts, quotes, goals, roles, employer names,
emails, phone numbers, names, URLs, artifacts, and arbitrary strings are not
analytics fields. The intake rejects unknown top-level keys as well as unknown or
sensitive property names. Validation responses never echo rejected keys, values,
or schema issue paths.

## Intake contract

`POST /api/ai-path/events` applies these controls in order:

1. require an exact same-origin `Origin` header;
2. stream and cap the JSON body at 8 KiB before parsing;
3. fail with `analytics_unavailable` unless the explicit local test sink is enabled;
4. validate the closed event envelope and governed event schema;
5. accept timestamps no more than seven days old or five minutes in the future;
6. deduplicate exact event replays;
7. return only stable content-free results with `Cache-Control: no-store` and `nosniff`.

Stable results:

| Status | Body | Meaning |
| --- | --- | --- |
| 202 | `{"accepted":true,"duplicate":false}` | Stored by the active sink |
| 202 | `{"accepted":false,"duplicate":true}` | Exact retry; no second event stored |
| 400 | `{"error":"invalid_event"}` | Envelope or governed schema rejected |
| 400 | `{"error":"invalid_json"}` | Body was not JSON |
| 403 | `origin_required` / `cross_origin_request_rejected` | Browser-origin check failed |
| 413 | `{"error":"request_too_large"}` | Body exceeded 8 KiB |
| 422 | `{"error":"event_time_out_of_bounds"}` | Stale or future event |
| 503 | `analytics_unavailable` / `sink_error` | No reviewed sink or sink failure |

The UI now uses a narrow `AiPathBrowserAnalytics` client for the core text
funnel, numeric plan/report feedback, first-task actions, plan pinning, and the
preview-deletion lifecycle signal. The client creates random in-memory opaque
IDs, exposes only event-specific methods, accepts no learner-authored strings,
and treats 503/network failure as non-blocking. Because the production sink
latch remains closed, deployed UI calls fail safely with 503 and store nothing.

## Local test mode

Both flags are required outside production:

```bash
AI_PATH_ANALYTICS_STORE=memory-test
AI_PATH_ENABLE_TEST_ANALYTICS=true
```

The sink is process-local, ephemeral, and marked `productionReady: false`. It
makes no network call and stores defensive copies of already validated events.
Restarting the process clears it. Production always remains disabled, even if
these flags are present.

## Metrics foundation

`PrivacySafeAnalyticsService.computeMetrics()` feeds accepted events into the
existing deterministic cohort calculator. It produces content-free counts and
rates for assessment completion, review corrections, report-to-plan conversion,
seven-day first action, plan fit, report usefulness, artifacts, reassessment, and
materially wrong findings. A zero denominator remains `null`, not a misleading
zero rate.

Metrics consumers must use explicit UTC windows and must not query or export raw
event bodies. Minimum reporting cohort sizes and production access control remain
activation requirements.

## Operational contracts

The process-local service exposes aggregate counters only:

- received, accepted, and exact duplicate events;
- rejection counts by the fixed reasons `invalid_event`,
  `event_time_out_of_bounds`, and `sink_error`;
- deletion requests, completions, failures, latency average/maximum, and breaches
  of the 24-hour target.

Counters never contain opaque IDs, event properties, request bodies, exception
messages, IP addresses, user agents, or rejected field names. Sink exceptions are
collapsed to `sink_error`.

`deleteAnonymousEvents()` is the deletion-coordinator contract. It deletes events
for one validated opaque anonymous ID and records only aggregate completion
latency. It is not exposed as a public route here; the future account/session
deletion workflow must call it after verified authorization. The `data_deleted`
product event is an aggregate lifecycle signal and is not a substitute for actual
erasure.

Suggested operational alerts after a reviewed production sink exists:

- nonzero `sink_error` over a five-minute window;
- sustained validation rejects above an agreed percentage of received events;
- unusual exact-replay ratio indicating retry storms;
- any deletion failure;
- any deletion latency over 24 hours;
- material divergence between accepted intake and metrics-window counts.

## Integration steps

1. Keep browser instrumentation event-specific. Do not add a generic
   `track(name, properties)` escape hatch or persistent/fingerprinted IDs.
2. Extend UI coverage only by adding a governed schema and a typed method with
   enum/numeric inputs; never forward component state or free-form text.
3. Connect verified deletion workflows to `deleteAnonymousEvents()` and test the
   24-hour service-level objective end to end.
4. Select a production sink only after privacy/legal review, data-region and
   retention decisions, vendor/spend approval, access control, encryption,
   deletion support, replay-safe writes, distributed rate limiting, and rollback
   exist.
5. Implement the sink behind the existing interface without logging request
   bodies. Add disposable-environment integration and concurrency tests.
6. Add minimum cohort thresholds and authorized internal reporting before exposing
   metrics outside engineering.
7. Change the literal production latch in a reviewed code change only after all
   prior gates pass.

## Verification

Run the standalone suite without editing the package scripts:

```bash
node --test app/ai-path/analytics.test.mjs app/ai-path/analytics-http.test.mjs app/ai-path/client/analytics.test.mjs
```

These tests cover activation gates, same-origin enforcement, bounded bodies,
closed schemas, replay handling, event-time limits, stable errors, deletion
latency, content-free counters, sink failures, governed metric computation, typed
browser events, numeric-only feedback, opaque identifiers, and non-blocking 503s.
