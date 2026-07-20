#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { inspectDurableTextGate } from './ai-path-durable-text-gate.mjs'
import { validateAiPathPrivateAlphaAcceptance } from './ai-path-private-alpha-acceptance.mjs'
import { inspectAiPathReadiness } from './ai-path-readiness.mjs'
import { validateAiPathResearchReadiness } from './ai-path-research-readiness.mjs'

export const AI_PATH_LAUNCH_DECISION_VERSION = '2026-07-17.v1'
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const maxManifestBytes = 256 * 1024
const maxArtifactBytes = 8 * 1024 * 1024

function readManifest(path, validator) {
  if (!path) return { ok: false, reason: 'reviewed evidence was not supplied' }
  if (!existsSync(path)) return { ok: false, reason: 'reviewed evidence file is missing' }
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxManifestBytes) {
    return { ok: false, reason: 'evidence must be a bounded regular non-symlink file' }
  }
  try {
    const input = JSON.parse(readFileSync(path, 'utf8'))
    return { ok: true, input, result: validator(input) }
  } catch {
    return { ok: false, reason: 'reviewed evidence contract is invalid' }
  }
}

function verifyArtifact(root, path, expectedSha256) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return false
  const realRoot = realpathSync(root)
  const realArtifact = realpathSync(absolute)
  const fromRoot = relative(realRoot, realArtifact)
  if (!fromRoot || fromRoot.startsWith('..') || isAbsolute(fromRoot)) return false
  const stat = lstatSync(absolute)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxArtifactBytes) return false
  return createHash('sha256').update(readFileSync(absolute)).digest('hex') === expectedSha256
}

function bindAcceptanceEvidence(evidence, root, releaseCommit) {
  if (!evidence.ok || !releaseCommit || evidence.result?.commitSha !== releaseCommit || !evidence.input) {
    return { ...evidence, ok: false, artifactsVerified: false }
  }
  const artifacts = []
  for (const browser of evidence.input.browsers) {
    artifacts.push([browser.runArtifactPath, browser.runArtifactSha256])
    for (const viewport of browser.viewports) artifacts.push([viewport.screenshotPath, viewport.screenshotSha256])
    for (const check of browser.accessibilityChecks) artifacts.push([check.artifactPath, check.artifactSha256])
  }
  const unique = new Map()
  for (const [path, sha] of artifacts) {
    if (unique.has(path) && unique.get(path) !== sha) return { ...evidence, ok: false, artifactsVerified: false }
    unique.set(path, sha)
  }
  const artifactsVerified = [...unique].every(([path, sha]) => verifyArtifact(root, path, sha))
  return { ...evidence, ok: artifactsVerified, artifactsVerified }
}

function commitBound(result, releaseCommit) {
  return Boolean(result?.ok && releaseCommit && result.result?.commitSha === releaseCommit)
}

function gate(id, ready, state, owner, nextAction) {
  return Object.freeze({ id, ready, state, owner, nextAction })
}

export function inspectAiPathLaunchDecision(options = {}) {
  const root = resolve(options.root ?? scriptRoot)
  const source = options.readinessReport ?? inspectAiPathReadiness({ root })
  const durable = options.durableTextReport ?? inspectDurableTextGate({
    root,
    evidenceDirectory: options.evidenceDirectory,
    releaseCommit: options.releaseCommit,
  })
  const research = options.researchResult ?? readManifest(options.researchManifest, validateAiPathResearchReadiness)
  const rawAcceptance = options.acceptanceResult ?? readManifest(options.acceptanceEvidence, validateAiPathPrivateAlphaAcceptance)
  const acceptance = options.acceptanceResult ?? bindAcceptanceEvidence(rawAcceptance, root, options.releaseCommit)
  const researchReady = commitBound(research, options.releaseCommit)
  const acceptanceReady = commitBound(acceptance, options.releaseCommit) && acceptance.artifactsVerified === true
  const gates = [
    gate('source_safety', source.safety.ok, source.safety.ok ? 'verified' : 'blocked', 'Engineering', 'Repair every broken literal latch or provider-isolation check.'),
    gate('private_alpha_inventory', source.inventory.privateAlpha.complete, source.inventory.privateAlpha.complete ? 'verified' : 'blocked', 'Engineering', 'Restore every required private-alpha source, test, and runbook.'),
    gate('production_foundation_inventory', source.inventory.productionFoundation.complete, source.inventory.productionFoundation.complete ? 'verified' : 'blocked', 'Engineering', 'Complete the production-foundation source inventory.'),
    gate('durable_text_release_evidence', durable.readyForReviewedActivation, durable.state, 'Platform, privacy, release, security', 'Run commit-bound database, authentication, retention, and export/delete proofs; approve the external evidence index.'),
    gate('research_session_readiness', researchReady, researchReady ? 'commit_bound_readiness_verified' : 'evidence_required', 'Research lead', 'Supply a release-commit-bound, reviewed five-participant readiness manifest without participant data in the repository.'),
    gate('browser_accessibility_acceptance', acceptanceReady, acceptanceReady ? 'commit_and_artifact_bound_verified' : 'evidence_required', 'QA and accessibility', 'Run the commit-bound three-browser, three-viewport accessibility matrix and bind every bounded non-symlink artifact by SHA-256.'),
    gate('realtime_provider_activation', false, 'locked_paid_service', 'Security, platform, spend approver', 'Keep provider networking locked until isolated staging proof and explicit paid-use approval.'),
    gate('analytics_sink_activation', false, 'locked_governance', 'Privacy and analytics owner', 'Approve the sink, region, retention, deletion SLO, cohort floor, access, rollback, and any spend before a separate latch change.'),
    gate('production_service_approval', false, 'external_approval_required', 'User and platform operator', 'Provision reviewed non-production infrastructure first; approve any paid production services explicitly.'),
    gate('reviewed_launch_and_rollback', false, 'external_release_required', 'Release owner', 'Review evidence for the exact commit, perform rollback rehearsal, then approve a separate production activation change.'),
  ]
  const privateAlphaSourceReady = gates.slice(0, 3).every(item => item.ready)
  const privateAlphaEvidenceReady = privateAlphaSourceReady && researchReady && acceptanceReady
  const productionLaunchReady = gates.every(item => item.ready)
  return Object.freeze({
    decisionVersion: AI_PATH_LAUNCH_DECISION_VERSION,
    state: !privateAlphaSourceReady
      ? 'SOURCE_REMEDIATION_REQUIRED'
      : privateAlphaEvidenceReady
        ? 'PRIVATE_ALPHA_ACCEPTANCE_READY_RESEARCH_SCHEDULED_PRODUCTION_LOCKED'
        : 'PRIVATE_ALPHA_SOURCE_READY_EVIDENCE_REQUIRED',
    privateAlphaSourceReady,
    privateAlphaEvidenceReady,
    productionLaunchReady,
    activationOpen: false,
    gates: Object.freeze(gates),
    policy: Object.freeze({
      readsEnvironment: false,
      readsCredentials: false,
      makesNetworkCalls: false,
      launchesSubprocesses: false,
      mutatesWorkspace: false,
      opensLatches: false,
      authorizesPaidCalls: false,
    }),
  })
}

export function launchDecisionExitCode(report, options = {}) {
  if (!report.privateAlphaSourceReady) return 1
  if (options.requirePrivateAlphaEvidence && !report.privateAlphaEvidenceReady) return 2
  if (options.requireProduction && !report.productionLaunchReady) return 3
  return 0
}

export function formatAiPathLaunchDecision(report) {
  const lines = [
    'AI Path consolidated launch decision',
    `State: ${report.state}`,
    `Private-alpha source ready: ${report.privateAlphaSourceReady ? 'YES' : 'NO'}`,
    `Private-alpha evidence ready: ${report.privateAlphaEvidenceReady ? 'YES' : 'NO'}`,
    'Production launch ready: NO',
    'Activation open: NO',
  ]
  for (const item of report.gates) {
    lines.push(`  - [${item.ready ? 'READY' : 'BLOCKED'}] ${item.id}: ${item.state}`)
    if (!item.ready) lines.push(`    Owner: ${item.owner}; next: ${item.nextAction}`)
  }
  lines.push('This decision reads no environment variables or credentials, calls no network, opens no latch, and authorizes no paid call.')
  return lines.join('\n')
}

function parseCli(argv) {
  const options = { json: false, requirePrivateAlphaEvidence: false, requireProduction: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--json') options.json = true
    else if (arg === '--require-private-alpha-evidence') options.requirePrivateAlphaEvidence = true
    else if (arg === '--require-production') options.requireProduction = true
    else if (arg === '--evidence-dir') options.evidenceDirectory = argv[++index]
    else if (arg === '--release-commit') options.releaseCommit = argv[++index]
    else if (arg === '--research-manifest') options.researchManifest = argv[++index]
    else if (arg === '--acceptance-evidence') options.acceptanceEvidence = argv[++index]
    else throw new Error(`unknown or incomplete argument: ${arg}`)
  }
  return options
}

function main() {
  try {
    const options = parseCli(process.argv.slice(2))
    const report = inspectAiPathLaunchDecision(options)
    process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : `${formatAiPathLaunchDecision(report)}\n`)
    process.exitCode = launchDecisionExitCode(report, options)
  } catch (error) {
    process.stderr.write(`AI Path launch decision: ${error instanceof Error ? error.message : 'invalid invocation'}\n`)
    process.exitCode = 64
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
