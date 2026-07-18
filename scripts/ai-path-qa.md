# AI Path simple-journey end-to-end QA

This harness protects the intentionally small, voice-first learner experience.
It exercises a combined preparation workspace, unified conversation, understanding
review, and the project-first result without a live model, paid API, durable
account store, real microphone permission, or external network resource. It
requires an already running local AI Path server and never starts, stops,
rebuilds, or deploys it.

## Run

```bash
AI_PATH_QA_BASE_URL=http://127.0.0.1:3022/ai-path \
  scripts/ai-path-e2e-qa.sh
```

The driver prefers a global `playwright-cli`. Otherwise it uses the bundled
Codex Playwright wrapper. In restricted environments, point directly at an
installed executable:

```bash
AI_PATH_QA_BASE_URL=http://127.0.0.1:3022/ai-path \
AI_PATH_PLAYWRIGHT_CLI=/absolute/path/to/playwright-cli \
  scripts/ai-path-e2e-qa.sh
```

The target is rejected unless its host is `127.0.0.1` or `localhost`.

## Product acceptance contract

The harness fails if the learner-facing flow grows beyond this contract:

1. **Prepare:** voice discussion and typed entry share one compact workspace.
   Microphone permission is requested only after **Enable microphone**. The
   level check is local-only, provider unavailability is explicit, and the goal
   can be entered immediately through **Start typed discussion**.
2. **Conversation:** goal discovery plus five to seven adaptive turns use one
   answer field and one Continue action. The old question sidebar, assessment
   methodology, and scoring explanations stay out of the learner's way.
3. **Understanding:** exactly three compact confirmation rows keep goal,
   starting point, and constraints editable. Detailed conversation evidence is
   available in a collapsed disclosure instead of a mandatory audit screen.
4. **Project:** one result page presents the prescribed 30-day project before
   skill diagnostics, then one first action and no more than three learning
   resources. The four-week plan, rationale, and privacy/data information are
   collapsed by default.

The learner-facing contract relies on stable semantic copy plus two structural
test hooks:

- exactly three `data-testid="confirmation-part"` elements;
- one to three `data-testid="learning-resource"` elements.

These hooks express product invariants, not layout or CSS implementation.

## Determinism and network safety

- The page itself is read from the supplied local server.
- Session, analysis, and analytics requests are intercepted in the browser. The
  local server receives no assessment or analytics mutation.
- The analysis fixture deliberately returns four eligible resources. The UI
  must show at most three, proving the concise recommendation limit rather than
  merely receiving a small fixture.
- Every analytics request receives the production-accurate closed-sink `503`.
  The learner flow must still complete.
- A catch-all route aborts every non-local request, and the run fails if the app
  attempts one.
- Any local Realtime bootstrap request is separately blocked and fails the run.
- A deterministic browser shim records the explicit local microphone attempt
  and returns `NotAllowedError`; no real device permission is requested or
  granted. It also fails if a peer connection is constructed.
- The harness never opens recommendation links.
- The session fixture declares `owned: false`, `persistence: none`, and
  `productionReady: false`.
- Learner-authored text, including a private canary, must never appear in the
  analytics envelopes.

## Covered behavior

| Area | Assertions |
| --- | --- |
| Prepare | Focused heading, voice and typing together, immediate typed goal entry, local-only microphone disclosure, no automatic permission request, deterministic denial recovery, honest provider-unavailable state |
| Conversation | Typed fallback, goal discovery plus five-to-seven adaptive turns, one answer surface, no outline or methodology panel, named controls |
| Understanding | Exactly three compact rows, editable goal/experience/role/constraint/time/coding fields, collapsed conversation-details disclosure |
| Project | Project appears before skill diagnostics, one first action, one-to-three resources, fourth fixture resource hidden |
| Progressive disclosure | Four-week plan, rationale, and privacy collapsed initially; plan and privacy expand correctly |
| First action | Keyboard activation changes the first task to a started state |
| Responsive | No horizontal overflow and full-page screenshots at 375×812, 768×1024, and 1440×900 |
| Accessibility | Named visible controls, labeled fields, visible focus ring, transition heading focus, native disclosure controls |
| Trust boundary | Confirmed goal and transcript-derived inputs reach analysis; the browser does not assign competency evidence |
| Network and spend | Zero external requests, zero Realtime requests, zero peer connections, no paid path, analytics sink remains closed |
| Analytics privacy | No learner-authored goal, answers, corrections, or private canary in analytics; each payload stays below 8 KiB |

## Artifacts and pass criteria

Each run creates `output/playwright/ai-path-e2e-<UTC timestamp>/` containing:

- prepare, conversation, understanding, and project screenshots;
- project screenshots at 375×812, 768×1024, and 1440×900;
- Playwright snapshot, console, and network logs;
- `results.txt` with the checkpoint result.

Playwright CLI can print code exceptions without a nonzero process exit in some
versions. The shell driver therefore treats either `### Error` or a missing
`"ok":true` result as failure.

## Remaining risks

- Deterministic API interception does not replace route-handler, authenticated
  storage, database policy, or migration tests.
- This verifies the local permission boundary and honest typed fallback, not
  live voice quality, latency, interruption handling, successful microphone
  capture, audio levels, echo, or device switching.
- High-signal accessibility invariants do not replace a full WCAG audit.
- Screenshot inspection and overflow checks do not provide maintained visual
  regression baselines.
- Chromium execution does not establish Firefox or WebKit parity. The separate
  evidence contract in `docs/ai-path/PRIVATE_ALPHA_ACCEPTANCE.md` remains the
  gate for multi-browser claims.
- External learning links are intentionally not opened.
