# AI Path progressive-journey end-to-end QA

The QA harness protects the calm, two-path experience. It exercises both
six-section domain paths as progressive questions and verifies their different,
project-first result scenes without a live model, paid API, real microphone
permission, or external network resource.

The earlier ledger-style contract—with six expanded sections, a sticky evidence
sidebar, chamfered controls, repeated signal status, and field-level Voice
buttons—was rejected after visual review and must not be used as the acceptance
target.

## Run

```bash
AI_PATH_QA_BASE_URL=http://127.0.0.1:3022/ai-path \
  scripts/ai-path-e2e-qa.sh
```

The target is rejected unless its host is `127.0.0.1` or `localhost`.

## Acceptance contract

1. The first screen presents exactly two choices: **I have a task or idea** and
   **I want to improve my AI skills**.
2. Each path has exactly six versioned domain sections, but only one question
   group is active at a time.
3. Progress uses plain language such as **2 of 6 complete** and is not presented
   as a score.
4. Continue, Back, and editing a completed answer preserve all applicable state.
   Switching paths preserves both drafts until Start over.
5. Conditional questions appear only after the relevant answer: higher
   experience claims request a practical example; sensitive use cases explain
   human control; capability claims request their supporting example.
6. The current preview exposes one global **Test microphone** action. It states
   that live voice is not connected, requests permission only after the explicit
   action, performs a local-only check, and leaves typing available.
7. Use-case submission produces a project plan with a smallest useful prototype,
   system shape, evaluation, safeguards, needed skills, and four weeks of work.
8. Capability-growth submission produces a learning plan with a conservative
   experience interpretation, unassessed areas, next capability, proof-producing
   project, definition of done, and four weeks of work.
9. Both results lead with the project, first working session, and definition of
   done. Each shows no more than three supporting resources.
10. Edit answers returns to the applicable progressive path with state intact;
    Start over clears both drafts.

## Covered behavior

| Area | Assertions |
| --- | --- |
| Entry | Two exact choices, no diagnostic jargon, no automatic microphone request |
| Progressive flow | Six domain sections per path, one active group, plain progress, Back/Continue focus movement |
| Path A | Conditional practical example, sensitive-use-case human boundary, readiness gate |
| Path B | One plain-language experience ladder, applied scenario, conservative claim support, explicit unassessed areas |
| Voice | One global local test, deterministic permission denial, honest unavailable copy, typing remains usable |
| Results | Different result kinds, project and first action first, definition of done, four weeks, maximum three resources |
| Editing | Back and result editing retain answers; Start over clears both drafts |
| Responsive | No horizontal overflow at 375×812, 768×1024, and 1440×900 |
| Accessibility | Semantic choices and fields, named controls, visible focus, focused question/result headings, reduced-motion safety |
| Network/spend | Zero external, Realtime, peer, session, analysis, analytics, or paid-service requests |

## Visual assertions

At every required viewport:

- only one question group has the primary visual emphasis;
- no sticky evidence sidebar competes with the question;
- no empty marketing column consumes the page;
- Back, progress, and Continue remain easy to find;
- long realistic answers wrap without horizontal overflow;
- conditional help appears beside the answer that caused it;
- the result places the project and first action before supporting analysis;
- no control is hidden behind a sticky action area.

## Determinism and artifacts

- The page is served by the supplied local server.
- A browser shim records microphone attempts and returns `NotAllowedError`.
- Any peer connection, API mutation, or non-local request fails the run.
- The deterministic recommendation engine runs in the browser with no provider.
- Screenshots and logs are written under `output/playwright/ai-path/`.

## Remaining risks

- Deterministic composition does not validate a future model-assisted layer.
- Microphone denial validates the explicit permission boundary and fallback, not
  live transcription quality, latency, interruption handling, echo, or device
  switching.
- Chromium checks do not establish Firefox or WebKit parity.
- Automated labels and screenshots do not replace a full WCAG audit or
  moderated usability testing with learners from both paths.
