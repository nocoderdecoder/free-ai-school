# Multi-browser private-alpha acceptance evidence

Status: repository-native evidence contract for a local, deterministic, text-only private-alpha run. It does not start a browser, deploy the app, call an external service, or claim WCAG conformance.

## Acceptance matrix

One JSON evidence packet is bound to a full 40-character commit SHA and must prove:

- target `local-private-alpha`;
- exactly Chromium, Firefox, and WebKit;
- passed results at 375×812, 768×1024, and 1440×900 in every engine;
- passed keyboard navigation, visible focus, named controls, labeled forms, transition-heading focus, polite status announcements, horizontal-overflow, 200% zoom, 200% text resize, reduced-motion, color-contrast, and semantic-landmark checks in every engine;
- zero external requests and zero paid calls;
- safe repository-relative artifacts below `output/playwright/`, each bound by
  lowercase SHA-256 to the exact bytes reviewed.

The accepted check methods are `automated` and `manual`. This records how evidence was obtained; it does not turn a self-assertion into proof. Preserve screenshots and logs for review, and record failures rather than changing a result to pass.

## Evidence shape

```json
{
  "schemaVersion": "2026-07-17.v1",
  "target": "local-private-alpha",
  "commitSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "externalRequestCount": 0,
  "paidCallCount": 0,
  "browsers": [
    {
      "engine": "chromium",
      "majorVersion": 130,
      "result": "passed",
      "runArtifactPath": "output/playwright/private-alpha/chromium/results.json",
      "runArtifactSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "viewports": [
        {
          "size": "375x812",
          "result": "passed",
          "screenshotPath": "output/playwright/private-alpha/chromium/375x812.png",
          "screenshotSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        }
      ],
      "accessibilityChecks": [
        {
          "id": "keyboard-navigation",
          "method": "automated",
          "result": "passed",
          "artifactPath": "output/playwright/private-alpha/chromium/accessibility.txt",
          "artifactSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
        }
      ]
    }
  ]
}
```

The example is abbreviated. Validation requires all three engines, all three viewport entries per engine, and all 12 accessibility checks per engine. Array order does not affect the deterministic result.

## Run and interpretation

```bash
node scripts/ai-path-private-alpha-acceptance.mjs path/to/acceptance-evidence.json
npm run test:ai-path-research-ops
```

Successful schema validation returns `accepted: true`, nine viewport results,
and 36 accessibility-check results. The consolidated launch decision separately
requires the manifest SHA to equal `--release-commit` and reads every referenced
artifact as a bounded regular non-symlink file to verify its SHA-256. Only that
combined result is artifact-bound. It is not a production launch decision and
does not replace assistive-technology testing with representative users, design
review, route tests, database proof, or security review.
