import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import { inspectAiPathLaunchDecision, launchDecisionExitCode } from './ai-path-launch-decision.mjs'

function readiness({ safety = true, privateAlpha = true, production = true } = {}) {
  return {
    safety: { ok: safety },
    inventory: {
      privateAlpha: { complete: privateAlpha },
      productionFoundation: { complete: production },
    },
  }
}

const durableReady = { readyForReviewedActivation: true, state: 'READY_FOR_REVIEWED_ACTIVATION' }
const durableClosed = { readyForReviewedActivation: false, state: 'CLOSED_EVIDENCE_MISSING' }
const checks = [
  'keyboard-navigation', 'visible-focus', 'named-controls', 'labeled-forms',
  'heading-focus', 'status-announcements', 'horizontal-overflow', 'zoom-200',
  'text-resize-200', 'reduced-motion', 'color-contrast', 'semantic-landmarks',
]

function write(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content)
}

test('reports source-ready private alpha while external evidence and activation stay closed', () => {
  const report = inspectAiPathLaunchDecision({
    readinessReport: readiness(),
    durableTextReport: durableClosed,
    releaseCommit: 'a'.repeat(40),
    researchResult: { ok: false, reason: 'missing' },
    acceptanceResult: { ok: false, artifactsVerified: false, reason: 'missing' },
  })
  assert.equal(report.state, 'PRIVATE_ALPHA_SOURCE_READY_EVIDENCE_REQUIRED')
  assert.equal(report.privateAlphaSourceReady, true)
  assert.equal(report.privateAlphaEvidenceReady, false)
  assert.equal(report.productionLaunchReady, false)
  assert.equal(report.activationOpen, false)
  assert.equal(report.gates.length, 10)
  assert.equal(launchDecisionExitCode(report), 0)
  assert.equal(launchDecisionExitCode(report, { requirePrivateAlphaEvidence: true }), 2)
})

test('valid research and QA evidence cannot authorize production services or paid calls', () => {
  const report = inspectAiPathLaunchDecision({
    readinessReport: readiness(),
    durableTextReport: durableReady,
    releaseCommit: 'a'.repeat(40),
    researchResult: { ok: true, result: { commitSha: 'a'.repeat(40) } },
    acceptanceResult: { ok: true, artifactsVerified: true, result: { commitSha: 'a'.repeat(40) } },
  })
  assert.equal(report.state, 'PRIVATE_ALPHA_ACCEPTANCE_READY_RESEARCH_SCHEDULED_PRODUCTION_LOCKED')
  assert.equal(report.privateAlphaEvidenceReady, true)
  assert.equal(report.productionLaunchReady, false)
  assert.equal(report.policy.authorizesPaidCalls, false)
  assert.equal(launchDecisionExitCode(report, { requireProduction: true }), 3)
})

test('broken source safety dominates all evidence', () => {
  const report = inspectAiPathLaunchDecision({
    readinessReport: readiness({ safety: false }),
    durableTextReport: durableReady,
    releaseCommit: 'a'.repeat(40),
    researchResult: { ok: true, result: { commitSha: 'a'.repeat(40) } },
    acceptanceResult: { ok: true, artifactsVerified: true, result: { commitSha: 'a'.repeat(40) } },
  })
  assert.equal(report.state, 'SOURCE_REMEDIATION_REQUIRED')
  assert.equal(report.privateAlphaSourceReady, false)
  assert.equal(launchDecisionExitCode(report), 1)
})

test('acceptance requires exact release commit and verified artifact bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'ai-path-launch-bindings-'))
  const commitSha = 'a'.repeat(40)
  const bytes = Buffer.from('content-free acceptance evidence\n')
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const browsers = ['chromium', 'firefox', 'webkit'].map((engine, browserIndex) => {
    const runArtifactPath = `output/playwright/${engine}/results.json`
    const accessibilityPath = `output/playwright/${engine}/accessibility.txt`
    write(root, runArtifactPath, bytes)
    write(root, accessibilityPath, bytes)
    return {
      engine, majorVersion: 130 + browserIndex, result: 'passed',
      runArtifactPath, runArtifactSha256: sha256,
      viewports: ['375x812', '768x1024', '1440x900'].map(size => {
        const screenshotPath = `output/playwright/${engine}/${size}.png`
        write(root, screenshotPath, bytes)
        return { size, result: 'passed', screenshotPath, screenshotSha256: sha256 }
      }),
      accessibilityChecks: checks.map(id => ({
        id, method: 'manual', result: 'passed', artifactPath: accessibilityPath, artifactSha256: sha256,
      })),
    }
  })
  const acceptancePath = join(root, 'acceptance.json')
  writeFileSync(acceptancePath, JSON.stringify({
    schemaVersion: '2026-07-17.v1', target: 'local-private-alpha', commitSha,
    externalRequestCount: 0, paidCallCount: 0, browsers,
  }))
  const base = {
    root, releaseCommit: commitSha, readinessReport: readiness(), durableTextReport: durableClosed,
    researchResult: { ok: true, result: { commitSha } }, acceptanceEvidence: acceptancePath,
  }
  assert.equal(inspectAiPathLaunchDecision(base).privateAlphaEvidenceReady, true)
  assert.equal(inspectAiPathLaunchDecision({ ...base, releaseCommit: 'b'.repeat(40) }).privateAlphaEvidenceReady, false)
  write(root, browsers[0].runArtifactPath, 'tampered\n')
  assert.equal(inspectAiPathLaunchDecision(base).privateAlphaEvidenceReady, false)
})
