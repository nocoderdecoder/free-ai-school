import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_PATH_PRIVATE_ALPHA_ACCEPTANCE_SCHEMA_VERSION,
  PrivateAlphaAcceptanceValidationError,
  validateAiPathPrivateAlphaAcceptance,
} from './ai-path-private-alpha-acceptance.mjs'

const engines = ['chromium', 'firefox', 'webkit']
const viewports = ['375x812', '768x1024', '1440x900']
const checks = [
  'keyboard-navigation',
  'visible-focus',
  'named-controls',
  'labeled-forms',
  'heading-focus',
  'status-announcements',
  'horizontal-overflow',
  'zoom-200',
  'text-resize-200',
  'reduced-motion',
  'color-contrast',
  'semantic-landmarks',
]

function validEvidence() {
  return {
    schemaVersion: AI_PATH_PRIVATE_ALPHA_ACCEPTANCE_SCHEMA_VERSION,
    target: 'local-private-alpha',
    commitSha: 'a'.repeat(40),
    externalRequestCount: 0,
    paidCallCount: 0,
    browsers: engines.map((engine, browserIndex) => ({
      engine,
      majorVersion: 130 + browserIndex,
      result: 'passed',
      runArtifactPath: `output/playwright/private-alpha/${engine}/results.json`,
      runArtifactSha256: 'a'.repeat(64),
      viewports: viewports.map(size => ({
        size,
        result: 'passed',
        screenshotPath: `output/playwright/private-alpha/${engine}/${size}.png`,
        screenshotSha256: 'b'.repeat(64),
      })),
      accessibilityChecks: checks.map((id, index) => ({
        id,
        method: index < 7 ? 'automated' : 'manual',
        result: 'passed',
        artifactPath: `output/playwright/private-alpha/${engine}/accessibility.txt`,
        artifactSha256: 'c'.repeat(64),
      })),
    })),
  }
}

test('complete cross-browser and accessibility matrix is accepted deterministically', () => {
  const forward = validateAiPathPrivateAlphaAcceptance(validEvidence())
  const reordered = validEvidence()
  reordered.browsers.reverse()
  for (const browser of reordered.browsers) {
    browser.viewports.reverse()
    browser.accessibilityChecks.reverse()
  }
  assert.deepEqual(validateAiPathPrivateAlphaAcceptance(reordered), forward)
  assert.equal(forward.accepted, true)
  assert.equal(forward.viewportCount, 9)
  assert.equal(forward.accessibilityCheckCount, 36)
})

test('all three browser engines and responsive viewports are mandatory', () => {
  const invalid = [
    evidence => { evidence.browsers.pop() },
    evidence => { evidence.browsers[2].engine = 'chromium' },
    evidence => { evidence.browsers[0].viewports.pop() },
    evidence => { evidence.browsers[0].viewports[0].size = '390x844' },
    evidence => { evidence.browsers[0].viewports[0].result = 'failed' },
  ]
  for (const mutation of invalid) {
    const evidence = validEvidence()
    mutation(evidence)
    assert.throws(() => validateAiPathPrivateAlphaAcceptance(evidence), PrivateAlphaAcceptanceValidationError)
  }
})

test('every accessibility check must pass for every engine', () => {
  const invalid = [
    evidence => { evidence.browsers[0].accessibilityChecks.pop() },
    evidence => { evidence.browsers[1].accessibilityChecks[0].id = 'color-contrast' },
    evidence => { evidence.browsers[2].accessibilityChecks[1].result = 'failed' },
    evidence => { evidence.browsers[0].accessibilityChecks[2].method = 'claimed' },
  ]
  for (const mutation of invalid) {
    const evidence = validEvidence()
    mutation(evidence)
    assert.throws(() => validateAiPathPrivateAlphaAcceptance(evidence), PrivateAlphaAcceptanceValidationError)
  }
})

test('only a full commit, local target, zero external requests, zero paid calls, and safe artifact paths are accepted', () => {
  const invalid = [
    evidence => { evidence.commitSha = 'abc123' },
    evidence => { evidence.target = 'production' },
    evidence => { evidence.externalRequestCount = 1 },
    evidence => { evidence.paidCallCount = 1 },
    evidence => { evidence.browsers[0].runArtifactPath = '/tmp/results.json' },
    evidence => { evidence.browsers[0].runArtifactSha256 = 'unhashed' },
    evidence => { evidence.browsers[0].viewports[0].screenshotPath = 'output/playwright/../secret.png' },
    evidence => { evidence.userAgent = 'unexpected free text' },
  ]
  for (const mutation of invalid) {
    const evidence = validEvidence()
    mutation(evidence)
    assert.throws(() => validateAiPathPrivateAlphaAcceptance(evidence), PrivateAlphaAcceptanceValidationError)
  }
})
