#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const AI_PATH_PRIVATE_ALPHA_ACCEPTANCE_SCHEMA_VERSION = '2026-07-17.v1'

const requiredBrowsers = Object.freeze(['chromium', 'firefox', 'webkit'])
const requiredViewports = Object.freeze(['375x812', '768x1024', '1440x900'])
const requiredChecks = Object.freeze([
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
])
const artifactPathPattern = /^output\/playwright\/[a-zA-Z0-9._/-]+\.(?:json|png|txt)$/
const sha256Pattern = /^[a-f0-9]{64}$/

export class PrivateAlphaAcceptanceValidationError extends Error {
  constructor(issues) {
    super('The private-alpha acceptance evidence is invalid.')
    this.name = 'PrivateAlphaAcceptanceValidationError'
    this.issues = Object.freeze(issues.map(issue => Object.freeze({ ...issue })))
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value, keys, path, add) {
  if (!isRecord(value)) {
    add(path, 'invalid_type')
    return false
  }
  const allowed = new Set(keys)
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) add(`${path}.${key}`, 'unknown_field')
  }
  return true
}

function exactSet(values, expected) {
  return Array.isArray(values)
    && values.length === expected.length
    && [...values].sort().every((value, index) => value === [...expected].sort()[index])
}

function validateArtifactPath(value, path, add) {
  if (typeof value !== 'string' || !artifactPathPattern.test(value) || value.includes('..') || value.includes('//')) {
    add(path, 'safe_repository_relative_artifact_required')
  }
}

function validateArtifactDigest(value, path, add) {
  if (typeof value !== 'string' || !sha256Pattern.test(value)) add(path, 'sha256_required')
}

export function validateAiPathPrivateAlphaAcceptance(input) {
  const issues = []
  const add = (path, code) => issues.push({ path, code })
  if (!exactKeys(input, ['schemaVersion', 'target', 'commitSha', 'externalRequestCount', 'paidCallCount', 'browsers'], '$', add)) {
    throw new PrivateAlphaAcceptanceValidationError(issues)
  }
  if (input.schemaVersion !== AI_PATH_PRIVATE_ALPHA_ACCEPTANCE_SCHEMA_VERSION) add('$.schemaVersion', 'unsupported_version')
  if (input.target !== 'local-private-alpha') add('$.target', 'local_private_alpha_required')
  if (typeof input.commitSha !== 'string' || !/^[a-f0-9]{40}$/.test(input.commitSha)) add('$.commitSha', 'full_commit_sha_required')
  if (input.externalRequestCount !== 0) add('$.externalRequestCount', 'must_be_zero')
  if (input.paidCallCount !== 0) add('$.paidCallCount', 'must_be_zero')

  if (!Array.isArray(input.browsers) || input.browsers.length !== requiredBrowsers.length) {
    add('$.browsers', 'three_browser_engines_required')
  } else {
    const engines = input.browsers.map(browser => browser?.engine)
    if (!exactSet(engines, requiredBrowsers)) add('$.browsers', 'chromium_firefox_webkit_required')
    const artifactPaths = new Set()
    input.browsers.forEach((browser, index) => {
      const path = `$.browsers[${index}]`
      if (!exactKeys(browser, ['engine', 'majorVersion', 'result', 'viewports', 'accessibilityChecks', 'runArtifactPath', 'runArtifactSha256'], path, add)) return
      if (!requiredBrowsers.includes(browser.engine)) add(`${path}.engine`, 'unsupported_engine')
      if (!Number.isInteger(browser.majorVersion) || browser.majorVersion < 1) add(`${path}.majorVersion`, 'positive_integer_required')
      if (browser.result !== 'passed') add(`${path}.result`, 'passed_result_required')
      validateArtifactPath(browser.runArtifactPath, `${path}.runArtifactPath`, add)
      validateArtifactDigest(browser.runArtifactSha256, `${path}.runArtifactSha256`, add)
      if (artifactPaths.has(browser.runArtifactPath)) add(`${path}.runArtifactPath`, 'path_must_be_unique')
      artifactPaths.add(browser.runArtifactPath)

      if (!Array.isArray(browser.viewports) || browser.viewports.length !== requiredViewports.length) {
        add(`${path}.viewports`, 'three_required_viewports')
      } else {
        const sizes = browser.viewports.map(viewport => viewport?.size)
        if (!exactSet(sizes, requiredViewports)) add(`${path}.viewports`, 'required_viewport_matrix_incomplete')
        browser.viewports.forEach((viewport, viewportIndex) => {
          const viewportPath = `${path}.viewports[${viewportIndex}]`
          if (!exactKeys(viewport, ['size', 'result', 'screenshotPath', 'screenshotSha256'], viewportPath, add)) return
          if (!requiredViewports.includes(viewport.size)) add(`${viewportPath}.size`, 'unsupported_viewport')
          if (viewport.result !== 'passed') add(`${viewportPath}.result`, 'passed_result_required')
          validateArtifactPath(viewport.screenshotPath, `${viewportPath}.screenshotPath`, add)
          validateArtifactDigest(viewport.screenshotSha256, `${viewportPath}.screenshotSha256`, add)
          if (artifactPaths.has(viewport.screenshotPath)) add(`${viewportPath}.screenshotPath`, 'path_must_be_unique')
          artifactPaths.add(viewport.screenshotPath)
        })
      }

      if (!Array.isArray(browser.accessibilityChecks) || browser.accessibilityChecks.length !== requiredChecks.length) {
        add(`${path}.accessibilityChecks`, 'required_accessibility_checks_missing')
      } else {
        const ids = browser.accessibilityChecks.map(check => check?.id)
        if (!exactSet(ids, requiredChecks)) add(`${path}.accessibilityChecks`, 'required_accessibility_check_matrix_incomplete')
        browser.accessibilityChecks.forEach((check, checkIndex) => {
          const checkPath = `${path}.accessibilityChecks[${checkIndex}]`
          if (!exactKeys(check, ['id', 'method', 'result', 'artifactPath', 'artifactSha256'], checkPath, add)) return
          if (!requiredChecks.includes(check.id)) add(`${checkPath}.id`, 'unsupported_check')
          if (!['automated', 'manual'].includes(check.method)) add(`${checkPath}.method`, 'unsupported_method')
          if (check.result !== 'passed') add(`${checkPath}.result`, 'passed_result_required')
          validateArtifactPath(check.artifactPath, `${checkPath}.artifactPath`, add)
          validateArtifactDigest(check.artifactSha256, `${checkPath}.artifactSha256`, add)
        })
      }
    })
  }

  if (issues.length) throw new PrivateAlphaAcceptanceValidationError(issues)
  return Object.freeze({
    schemaVersion: AI_PATH_PRIVATE_ALPHA_ACCEPTANCE_SCHEMA_VERSION,
    accepted: true,
    target: 'local-private-alpha',
    commitSha: input.commitSha,
    browserEngines: Object.freeze([...requiredBrowsers]),
    viewportCount: requiredBrowsers.length * requiredViewports.length,
    accessibilityCheckCount: requiredBrowsers.length * requiredChecks.length,
    externalRequestCount: 0,
    paidCallCount: 0,
  })
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath || process.argv.length !== 3) {
    process.stderr.write('Usage: node scripts/ai-path-private-alpha-acceptance.mjs <acceptance-evidence.json>\n')
    process.exitCode = 2
    return
  }
  try {
    const input = JSON.parse(await readFile(inputPath, 'utf8'))
    process.stdout.write(`${JSON.stringify(validateAiPathPrivateAlphaAcceptance(input), null, 2)}\n`)
  } catch (error) {
    const body = error instanceof PrivateAlphaAcceptanceValidationError
      ? { error: 'invalid_private_alpha_acceptance_evidence', issues: error.issues }
      : { error: 'private_alpha_acceptance_validation_failed' }
    process.stderr.write(`${JSON.stringify(body)}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
