import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_PATH_RESEARCH_CONSENT_VERSION,
  AI_PATH_RESEARCH_READINESS_SCHEMA_VERSION,
  ResearchReadinessValidationError,
  validateAiPathResearchReadiness,
} from './ai-path-research-readiness.mjs'

const reviewerIds = ['reviewer-a', 'reviewer-b']

function validManifest() {
  return {
    schemaVersion: AI_PATH_RESEARCH_READINESS_SCHEMA_VERSION,
    commitSha: 'a'.repeat(40),
    studyId: 'workflow-builder-alpha',
    consent: {
      version: AI_PATH_RESEARCH_CONSENT_VERSION,
      scriptPath: 'docs/ai-path/research/CONSENT_AND_PRIVACY.md',
      approvalRecorded: true,
    },
    review: {
      reviewerIds,
      blindUntilAgreementSaved: true,
      calibration: {
        syntheticOnly: true,
        status: 'passed',
        packetPath: 'restricted://ai-path-research/calibration/synthetic-packet.json',
        agreementPath: 'restricted://ai-path-research/calibration/agreement.json',
        reviewerIds,
      },
    },
    sessions: Array.from({ length: 5 }, (_, index) => {
      const participantId = `participant-${String(index + 1).padStart(2, '0')}`
      return {
        participantId,
        recruitmentStatus: 'eligible_scheduled',
        consentVersion: AI_PATH_RESEARCH_CONSENT_VERSION,
        recording: 'off',
        packetPath: `restricted://ai-path-research/sessions/${participantId}.json`,
        reviewerAssignments: reviewerIds.map(reviewerId => ({
          reviewerId,
          packetPath: `restricted://ai-path-research/reviews/${participantId}/${reviewerId}.json`,
        })),
      }
    }),
  }
}

test('complete five-session manifest is deterministically ready without participant data', () => {
  const forward = validateAiPathResearchReadiness(validManifest())
  const reordered = validManifest()
  reordered.sessions.reverse()
  reordered.review.reviewerIds.reverse()
  reordered.review.calibration.reviewerIds.reverse()
  for (const session of reordered.sessions) session.reviewerAssignments.reverse()
  assert.deepEqual(validateAiPathResearchReadiness(reordered), forward)
  assert.deepEqual(forward, {
    schemaVersion: AI_PATH_RESEARCH_READINESS_SCHEMA_VERSION,
    commitSha: 'a'.repeat(40),
    studyId: 'workflow-builder-alpha',
    ready: true,
    participantCount: 5,
    reviewerCount: 2,
    consentVersion: AI_PATH_RESEARCH_CONSENT_VERSION,
    recording: 'off',
    storage: 'restricted_non_repository',
  })
})

test('unknown and PII-shaped fields are rejected by exact-key contracts', () => {
  for (const mutation of [
    manifest => { manifest.participantName = 'not allowed' },
    manifest => { manifest.commitSha = 'main' },
    manifest => { manifest.sessions[0].email = 'not@allowed.example' },
    manifest => { manifest.review.reviewerNames = ['not allowed'] },
    manifest => { manifest.sessions[0].reviewerAssignments[0].notes = 'not allowed' },
  ]) {
    const manifest = validManifest()
    mutation(manifest)
    assert.throws(() => validateAiPathResearchReadiness(manifest), ResearchReadinessValidationError)
  }
})

test('canonical recruiting codes, consent version, recording-off rule, and restricted paths are mandatory', () => {
  const invalid = [
    manifest => { manifest.sessions[0].participantId = 'participant-06' },
    manifest => { manifest.sessions.pop() },
    manifest => { manifest.sessions[0].recruitmentStatus = 'screened_out' },
    manifest => { manifest.sessions[0].consentVersion = 'old-consent' },
    manifest => { manifest.sessions[0].recording = 'on' },
    manifest => { manifest.sessions[0].packetPath = 'docs/private/participant-01.json' },
    manifest => { manifest.sessions[0].packetPath = 'restricted://ai-path-research/../participant-01.json' },
    manifest => { manifest.sessions[0].packetPath = 'restricted://ai-path-research/sessions/jane-doe.json' },
    manifest => { manifest.sessions[0].reviewerAssignments[0].packetPath = 'restricted://ai-path-research/reviews/participant-01/senior-researcher.json' },
    manifest => { manifest.sessions[1].packetPath = manifest.sessions[0].packetPath },
  ]
  for (const mutation of invalid) {
    const manifest = validManifest()
    mutation(manifest)
    assert.throws(() => validateAiPathResearchReadiness(manifest), ResearchReadinessValidationError)
  }
})

test('two distinct calibrated reviewers must remain blind and be paired for every session', () => {
  const invalid = [
    manifest => { manifest.review.reviewerIds = ['reviewer-a', 'reviewer-a'] },
    manifest => { manifest.review.blindUntilAgreementSaved = false },
    manifest => { manifest.review.calibration.syntheticOnly = false },
    manifest => { manifest.review.calibration.status = 'pending' },
    manifest => { manifest.review.calibration.reviewerIds = ['reviewer-a', 'reviewer-c'] },
    manifest => { manifest.sessions[0].reviewerAssignments[1].reviewerId = 'reviewer-c' },
    manifest => { manifest.sessions[0].reviewerAssignments.pop() },
  ]
  for (const mutation of invalid) {
    const manifest = validManifest()
    mutation(manifest)
    assert.throws(() => validateAiPathResearchReadiness(manifest), ResearchReadinessValidationError)
  }
})
