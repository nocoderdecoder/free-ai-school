#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const AI_PATH_RESEARCH_READINESS_SCHEMA_VERSION = '2026-07-17.v1'
export const AI_PATH_RESEARCH_CONSENT_VERSION = '2026-07-17.v1'

const participantIds = Object.freeze(Array.from({ length: 5 }, (_, index) => `participant-${String(index + 1).padStart(2, '0')}`))
const idPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+){0,7}$/
const restrictedPathPattern = /^restricted:\/\/ai-path-research\/[a-z0-9/_-]+\.(?:json|txt)$/

export class ResearchReadinessValidationError extends Error {
  constructor(issues) {
    super('The research-session readiness manifest is invalid.')
    this.name = 'ResearchReadinessValidationError'
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

function validateOpaqueId(value, path, add) {
  if (typeof value !== 'string' || !idPattern.test(value)) add(path, 'invalid_opaque_id')
}

function validateRestrictedPath(value, path, add) {
  if (typeof value !== 'string' || !restrictedPathPattern.test(value) || value.includes('..')) {
    add(path, 'restricted_non_repository_path_required')
  }
}

function validateCanonicalRestrictedPath(value, expected, path, add) {
  validateRestrictedPath(value, path, add)
  if (value !== expected) add(path, 'canonical_opaque_path_required')
}

function sameMembers(actual, expected) {
  return actual.length === expected.length
    && [...actual].sort().every((value, index) => value === [...expected].sort()[index])
}

export function validateAiPathResearchReadiness(input) {
  const issues = []
  const add = (path, code) => issues.push({ path, code })
  if (!exactKeys(input, ['schemaVersion', 'commitSha', 'studyId', 'consent', 'review', 'sessions'], '$', add)) {
    throw new ResearchReadinessValidationError(issues)
  }
  if (input.schemaVersion !== AI_PATH_RESEARCH_READINESS_SCHEMA_VERSION) add('$.schemaVersion', 'unsupported_version')
  if (typeof input.commitSha !== 'string' || !/^[a-f0-9]{40}$/.test(input.commitSha)) add('$.commitSha', 'full_commit_sha_required')
  if (input.studyId !== 'workflow-builder-alpha') add('$.studyId', 'unsupported_study')

  if (exactKeys(input.consent, ['version', 'scriptPath', 'approvalRecorded'], '$.consent', add)) {
    if (input.consent.version !== AI_PATH_RESEARCH_CONSENT_VERSION) add('$.consent.version', 'unsupported_consent_version')
    if (input.consent.scriptPath !== 'docs/ai-path/research/CONSENT_AND_PRIVACY.md') add('$.consent.scriptPath', 'canonical_script_required')
    if (input.consent.approvalRecorded !== true) add('$.consent.approvalRecorded', 'approval_required')
  }

  let reviewerIds = []
  if (exactKeys(input.review, ['reviewerIds', 'blindUntilAgreementSaved', 'calibration'], '$.review', add)) {
    if (!Array.isArray(input.review.reviewerIds) || input.review.reviewerIds.length !== 2) {
      add('$.review.reviewerIds', 'exactly_two_required')
    } else {
      reviewerIds = input.review.reviewerIds
      reviewerIds.forEach((id, index) => validateOpaqueId(id, `$.review.reviewerIds[${index}]`, add))
      if (new Set(reviewerIds).size !== 2) add('$.review.reviewerIds', 'must_be_distinct')
    }
    if (input.review.blindUntilAgreementSaved !== true) add('$.review.blindUntilAgreementSaved', 'blind_review_required')
    if (exactKeys(input.review.calibration, ['syntheticOnly', 'status', 'packetPath', 'agreementPath', 'reviewerIds'], '$.review.calibration', add)) {
      if (input.review.calibration.syntheticOnly !== true) add('$.review.calibration.syntheticOnly', 'synthetic_calibration_required')
      if (input.review.calibration.status !== 'passed') add('$.review.calibration.status', 'passed_calibration_required')
      validateCanonicalRestrictedPath(
        input.review.calibration.packetPath,
        'restricted://ai-path-research/calibration/synthetic-packet.json',
        '$.review.calibration.packetPath',
        add,
      )
      validateCanonicalRestrictedPath(
        input.review.calibration.agreementPath,
        'restricted://ai-path-research/calibration/agreement.json',
        '$.review.calibration.agreementPath',
        add,
      )
      if (!Array.isArray(input.review.calibration.reviewerIds)) {
        add('$.review.calibration.reviewerIds', 'invalid_type')
      } else if (!sameMembers(input.review.calibration.reviewerIds, reviewerIds)) {
        add('$.review.calibration.reviewerIds', 'must_match_reviewers')
      }
    }
  }

  if (!Array.isArray(input.sessions) || input.sessions.length !== 5) {
    add('$.sessions', 'exactly_five_required')
  } else {
    const seenParticipants = []
    const seenPaths = new Set()
    input.sessions.forEach((session, index) => {
      const path = `$.sessions[${index}]`
      if (!exactKeys(session, ['participantId', 'recruitmentStatus', 'consentVersion', 'recording', 'packetPath', 'reviewerAssignments'], path, add)) return
      validateOpaqueId(session.participantId, `${path}.participantId`, add)
      seenParticipants.push(session.participantId)
      if (session.recruitmentStatus !== 'eligible_scheduled') add(`${path}.recruitmentStatus`, 'eligible_scheduled_required')
      if (session.consentVersion !== AI_PATH_RESEARCH_CONSENT_VERSION) add(`${path}.consentVersion`, 'must_match_consent')
      if (session.recording !== 'off') add(`${path}.recording`, 'recording_must_be_off')
      validateCanonicalRestrictedPath(
        session.packetPath,
        `restricted://ai-path-research/sessions/${session.participantId}.json`,
        `${path}.packetPath`,
        add,
      )
      if (seenPaths.has(session.packetPath)) add(`${path}.packetPath`, 'path_must_be_unique')
      seenPaths.add(session.packetPath)
      if (!Array.isArray(session.reviewerAssignments) || session.reviewerAssignments.length !== 2) {
        add(`${path}.reviewerAssignments`, 'exactly_two_required')
        return
      }
      const assignedIds = []
      session.reviewerAssignments.forEach((assignment, assignmentIndex) => {
        const assignmentPath = `${path}.reviewerAssignments[${assignmentIndex}]`
        if (!exactKeys(assignment, ['reviewerId', 'packetPath'], assignmentPath, add)) return
        validateOpaqueId(assignment.reviewerId, `${assignmentPath}.reviewerId`, add)
        assignedIds.push(assignment.reviewerId)
        validateCanonicalRestrictedPath(
          assignment.packetPath,
          `restricted://ai-path-research/reviews/${session.participantId}/${assignment.reviewerId}.json`,
          `${assignmentPath}.packetPath`,
          add,
        )
        if (seenPaths.has(assignment.packetPath)) add(`${assignmentPath}.packetPath`, 'path_must_be_unique')
        seenPaths.add(assignment.packetPath)
      })
      if (!sameMembers(assignedIds, reviewerIds)) add(`${path}.reviewerAssignments`, 'must_pair_both_reviewers')
    })
    if (!sameMembers(seenParticipants, participantIds)) add('$.sessions', 'canonical_participant_codes_required')
  }

  if (issues.length) throw new ResearchReadinessValidationError(issues)
  return Object.freeze({
    schemaVersion: AI_PATH_RESEARCH_READINESS_SCHEMA_VERSION,
    commitSha: input.commitSha,
    studyId: input.studyId,
    ready: true,
    participantCount: 5,
    reviewerCount: 2,
    consentVersion: AI_PATH_RESEARCH_CONSENT_VERSION,
    recording: 'off',
    storage: 'restricted_non_repository',
  })
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath || process.argv.length !== 3) {
    process.stderr.write('Usage: node scripts/ai-path-research-readiness.mjs <readiness-manifest.json>\n')
    process.exitCode = 2
    return
  }
  try {
    const input = JSON.parse(await readFile(inputPath, 'utf8'))
    process.stdout.write(`${JSON.stringify(validateAiPathResearchReadiness(input), null, 2)}\n`)
  } catch (error) {
    const body = error instanceof ResearchReadinessValidationError
      ? { error: 'invalid_research_readiness_manifest', issues: error.issues }
      : { error: 'research_readiness_validation_failed' }
    process.stderr.write(`${JSON.stringify(body)}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
