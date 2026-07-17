# AI Path deterministic end-to-end QA

This harness exercises the browser experience without using a live model, paid
API, durable account store, or external network resource. It requires an already
running local AI Path server and never starts, stops, rebuilds, or deploys it.

## Run

```bash
AI_PATH_QA_BASE_URL=http://127.0.0.1:3022/ai-path \
  scripts/ai-path-e2e-qa.sh
```

The driver prefers a global `playwright-cli`. Otherwise it uses the bundled Codex
Playwright wrapper. In restricted environments, point directly at an installed
executable:

```bash
AI_PATH_QA_BASE_URL=http://127.0.0.1:3022/ai-path \
AI_PATH_PLAYWRIGHT_CLI=/absolute/path/to/playwright-cli \
  scripts/ai-path-e2e-qa.sh
```

The target is rejected unless its host is `127.0.0.1` or `localhost`.

## Determinism and network safety

- The page itself is read from the supplied local server.
- Session, analysis, and analytics requests are intercepted in the browser. The
  local server receives no assessment or analytics mutation.
- The first report attempt receives a deterministic temporary failure, the
  second receives an empty governed catalog result, and the third receives the
  pinned populated report. This covers recovery without a live service.
- Every analytics request receives the production-accurate closed-sink `503`.
  The run asserts that this never interrupts the learner flow or produces a
  misleading stored-feedback message.
- A catch-all route aborts any non-local request. The run fails if the app even
  attempts an external request.
- The harness never opens recommendation links.
- The session fixture declares `owned: false`, `persistence: none`, and
  `productionReady: false`.
- The analysis fixture pins report, taxonomy, scoring, and catalog versions.
- The run also asserts that the browser submitted reviewed inputs, did not assign
  competency evidence, and did not request transcript persistence.

## Covered workflow

| Area | Assertions |
| --- | --- |
| Entry | Landing content, programmatic heading focus, visible keyboard focus, keyboard activation |
| Profile | Long role/outcome/blocker content, time and coding selections, explicit consent |
| Assessment | One text session, all three guided responses, phase transitions |
| Review | Adaptive review inputs, multiple corrections, corrected values reach every analysis retry |
| Adversarial content | Near-2,000-character reviewed response, layout resilience, retry preservation, no analytics leakage |
| Report | Temporary failure and retry, empty recommendation state, version badge, assessed count, explicit unassessed state, long recommendation card |
| Feedback | Keyboard-only numeric ratings, disabled-to-enabled submission, polite closed-sink status |
| Plan | Task completion, progress, time-budget recalculation and completion reset |
| Alternatives | Smaller week tasks and restoration of originals |
| Check-in | Rejected adaptation leaves task unchanged; accepted diagnostic changes next incomplete task |
| Export | Download event, filename, parseable JSON, report version, time budget, accepted adaptation |
| Lifecycle | History, short reassessment reset, browser-preview deletion |
| Responsive | Results and plan at 375×812, 768×1024, and 1440×900 |
| Accessibility | Named visible interactive controls, labeled form controls, focus ring, keyboard radio/button operation, transition heading focus, polite status announcement |
| Layout | Document/body horizontal-overflow check with long realistic content at every required viewport |
| Analytics privacy | Exact governed event/property allowlists, opaque IDs, 8 KiB budget, numeric feedback, no learner-authored text |

## Artifacts and pass criteria

Each run creates `output/playwright/ai-path-e2e-<UTC timestamp>/` containing:

- full-page results and plan screenshots for all three viewports;
- a landing screenshot;
- the downloaded `ai-path-plan.json`;
- Playwright snapshot/console/network logs;
- `results.txt` with the checkpoint result.

Playwright CLI currently prints code exceptions without a nonzero process exit in
some versions. The shell driver therefore treats either `### Error` or a missing
`"ok":true` result as failure. This prevents false-green runs.

## Remaining risks

- The harness uses deterministic API interception. It does not replace separate
  route-handler, database RLS/RPC, or authenticated durable-persistence tests.
- It checks high-signal accessibility invariants, not a full WCAG audit. Add a
  pinned accessibility engine only after dependency review.
- It checks global horizontal overflow and captures screenshots, but visual
  regression baselines still require explicit design approval and maintenance.
- Download contents are validated in Chromium; Firefox/WebKit parity is not in
  this no-dependency slice.
- Real Realtime audio, microphone permission, external learning links, and any
  paid model path are intentionally excluded.
