# AI Path Diagnostic Studio end-to-end QA

The QA harness protects the one-screen, two-path product contract. It exercises
both complete diagnostics and their different result scenes without a live model,
paid API, real microphone permission, or external network resource.

## Run

```bash
AI_PATH_QA_BASE_URL=http://127.0.0.1:3022/ai-path \
  scripts/ai-path-e2e-qa.sh
```

The target is rejected unless its host is `127.0.0.1` or `localhost`.

## Acceptance contract

1. The initial screen presents exactly two intents: **I have an AI use case** and
   **I want to grow my AI skills**.
2. Selecting either intent opens six visible, editable sections on the same page.
   Switching paths preserves both drafts.
3. Every prose field supports typing and a field-level Voice action. The browser
   requests microphone permission only after that explicit action. The preview
   labels the check as local and does not create a provider or peer session.
4. Use-case submission produces a use-case blueprint with feasibility, prototype,
   system shape, evaluation, risk safeguards, needed skills, and a 30-day workpath.
5. Capability-growth submission produces an evidence-based profile, untested
   areas, next capability, evidence project, definition of done, and a 30-day
   workpath. It must not reuse the use-case output structure.
6. The learner can edit the diagnostic, save the first action locally in the UI,
   or restart from a blank two-path screen.

## Covered behavior

| Area | Assertions |
| --- | --- |
| Entry | Two exact choices, concise explanation, no automatic microphone request |
| Path A | Six sections, conditional experience evidence, risk guardrail, readiness gate |
| Path B | Six sections, five-domain evidence map, applied scenario, conservative claim support |
| Voice | Explicit field action, deterministic permission denial recovery, typing remains usable |
| Results | Different result kinds, project/prototype first, definition of done, four weeks, max three resources |
| Editing | Back-to-diagnostic retains answers; restart clears both drafts |
| Responsive | No horizontal overflow at 375×812, 768×1024, and 1440×900 |
| Accessibility | Semantic fieldsets, labels, named controls, visible focus, focused result heading |
| Network/spend | Zero external, Realtime, peer, session, analysis, or analytics mutation requests |

## Determinism and artifacts

- The page is served by the supplied local server.
- A browser shim records microphone attempts and returns `NotAllowedError`.
- Any peer connection or non-local request fails the run.
- The deterministic recommendation engine runs in the browser with no provider.
- Screenshots and logs are written under `output/playwright/ai-path/`.

## Remaining risks

- Deterministic composition does not validate the future model-assisted layer.
- Microphone denial validates consent and fallback, not live transcription quality,
  latency, interruption handling, echo, or device switching.
- Chromium checks do not establish Firefox or WebKit parity.
- Automated labels and screenshot checks do not replace a full WCAG audit or
  moderated usability testing with both learner intents.
