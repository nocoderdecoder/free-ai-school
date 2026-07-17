import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_RESEARCH_REVIEW_SCHEMA_VERSION,
  ResearchAgreementValidationError,
  calculateAiPathResearchAgreement,
} from './ai-path-research-agreement.mjs'

const reviewers = ['reviewer-a', 'reviewer-b']

test('checked-in JSON Schema stays synchronized with calculator enums and privacy shape', async () => {
  const schema = JSON.parse(await readFile(
    new URL('../docs/ai-path/research/review-packet.schema.json', import.meta.url),
    'utf8',
  ))
  assert.equal(schema.properties.schemaVersion.const, AI_PATH_RESEARCH_REVIEW_SCHEMA_VERSION)
  assert.equal(schema.additionalProperties, false)
  assert.equal(schema.$defs.rating.additionalProperties, false)
  assert.deepEqual(schema.$defs.rating.required, [
    'participantId', 'findingId', 'skillId', 'reviewerId', 'evidenceVerdict',
    'proposedLevel', 'confidence', 'reasonCodes',
  ])
  assert.equal(JSON.stringify(schema).includes('name'), false)
  assert.equal(JSON.stringify(schema).includes('email'), false)
  assert.equal(JSON.stringify(schema).includes('notes'), false)
})

function rating({ participantId = 'participant-01', findingId, skillId, reviewerId, evidenceVerdict, proposedLevel, confidence = 'medium', reasonCodes = [] }) {
  return { participantId, findingId, skillId, reviewerId, evidenceVerdict, proposedLevel, confidence, reasonCodes }
}

function packet(ratings, overrides = {}) {
  return { schemaVersion: AI_PATH_RESEARCH_REVIEW_SCHEMA_VERSION, reviewers, ratings, ...overrides }
}

test('perfect varied ratings produce perfect categorical and ordinal agreement', () => {
  const ratings = [
    ['finding-01', 'foundations', 'supported', 1, 'low'],
    ['finding-02', 'workflow-design', 'partially_supported', 2, 'medium'],
    ['finding-03', 'evaluation-reliability', 'materially_wrong', 3, 'high'],
    ['finding-04', 'safety-governance', 'not_assessable', null, 'low'],
  ].flatMap(([findingId, skillId, evidenceVerdict, proposedLevel, confidence]) => reviewers.map(reviewerId => rating({
    findingId, skillId, reviewerId, evidenceVerdict, proposedLevel, confidence,
  })))
  const result = calculateAiPathResearchAgreement(packet(ratings))
  assert.equal(result.unitCount, 4)
  assert.equal(result.evidenceVerdict.percentAgreement, 1)
  assert.equal(result.evidenceVerdict.cohenKappa, 1)
  assert.equal(result.proposedLevel.exactPercentAgreement, 1)
  assert.equal(result.proposedLevel.quadraticWeightedKappa, 1)
  assert.equal(result.proposedLevel.excludedNullUnitCount, 1)
  assert.equal(result.confidence.cohenKappa, 1)
  assert.deepEqual(result.disagreements, [])
})

test('partial agreement is deterministic and exposes field-level disagreement units', () => {
  const units = [
    ['finding-01', 'foundations', ['supported', 1, 'low'], ['supported', 1, 'low']],
    ['finding-02', 'workflow-design', ['supported', 2, 'medium'], ['partially_supported', 3, 'medium']],
    ['finding-03', 'evaluation-reliability', ['materially_wrong', 3, 'high'], ['materially_wrong', 2, 'low']],
    ['finding-04', 'safety-governance', ['partially_supported', null, 'medium'], ['supported', 4, 'high']],
  ]
  const ratings = units.flatMap(([findingId, skillId, left, right]) => [
    rating({ findingId, skillId, reviewerId: reviewers[0], evidenceVerdict: left[0], proposedLevel: left[1], confidence: left[2] }),
    rating({ findingId, skillId, reviewerId: reviewers[1], evidenceVerdict: right[0], proposedLevel: right[1], confidence: right[2] }),
  ])
  const result = calculateAiPathResearchAgreement(packet(ratings))
  assert.equal(result.evidenceVerdict.percentAgreement, 0.5)
  assert.equal(result.evidenceVerdict.cohenKappa, 0.2)
  assert.equal(result.proposedLevel.comparableUnitCount, 3)
  assert.equal(result.proposedLevel.exactPercentAgreement, 0.3333)
  assert.equal(result.proposedLevel.withinOnePercentAgreement, 1)
  assert.equal(result.disagreementUnitCount, 3)
  assert.deepEqual(result.disagreements.map(item => item.unitId), [
    'participant-01|finding-02|workflow-design',
    'participant-01|finding-03|evaluation-reliability',
    'participant-01|finding-04|safety-governance',
  ])
})

test('single-category perfect agreement reports percent agreement but non-estimable kappa', () => {
  const ratings = ['finding-01', 'finding-02'].flatMap(findingId => reviewers.map(reviewerId => rating({
    findingId,
    skillId: 'foundations',
    reviewerId,
    evidenceVerdict: 'supported',
    proposedLevel: null,
    confidence: 'low',
  })))
  const result = calculateAiPathResearchAgreement(packet(ratings))
  assert.equal(result.evidenceVerdict.percentAgreement, 1)
  assert.equal(result.evidenceVerdict.cohenKappa, null)
  assert.equal(result.evidenceVerdict.interpretation, 'not_estimable')
  assert.equal(result.proposedLevel.comparableUnitCount, 0)
  assert.equal(result.proposedLevel.quadraticWeightedKappa, null)
})

test('input and rating order cannot change the deterministic result', () => {
  const ratings = reviewers.flatMap(reviewerId => [
    rating({ findingId: 'finding-02', skillId: 'workflow-design', reviewerId, evidenceVerdict: 'supported', proposedLevel: 2 }),
    rating({ findingId: 'finding-01', skillId: 'foundations', reviewerId, evidenceVerdict: 'partially_supported', proposedLevel: 1 }),
  ])
  const forward = calculateAiPathResearchAgreement(packet(ratings))
  const reversed = calculateAiPathResearchAgreement(packet([...ratings].reverse(), { reviewers: [...reviewers].reverse() }))
  assert.deepEqual(forward, reversed)
})

test('schema rejects free-form fields, PII-like identifiers, invalid values, and incomplete pairs', () => {
  const valid = [
    rating({ findingId: 'finding-01', skillId: 'foundations', reviewerId: reviewers[0], evidenceVerdict: 'supported', proposedLevel: 1 }),
    rating({ findingId: 'finding-01', skillId: 'foundations', reviewerId: reviewers[1], evidenceVerdict: 'supported', proposedLevel: 1 }),
  ]
  const invalidPackets = [
    packet(valid, { participantName: 'not-allowed' }),
    packet(valid.map((item, index) => index ? item : { ...item, notes: 'free text is not accepted' })),
    packet(valid.map((item, index) => index ? item : { ...item, participantId: 'INVALID IDENTIFIER' })),
    packet(valid.map((item, index) => index ? item : { ...item, proposedLevel: 0 })),
    packet(valid.slice(0, 1)),
    packet([valid[0], { ...valid[1], reviewerId: reviewers[0] }]),
  ]
  for (const input of invalidPackets) {
    assert.throws(() => calculateAiPathResearchAgreement(input), ResearchAgreementValidationError)
  }
})

test('reason codes are bounded, coded, unique, and do not affect agreement fields', () => {
  const ratings = reviewers.map(reviewerId => rating({
    findingId: 'finding-01',
    skillId: 'foundations',
    reviewerId,
    evidenceVerdict: 'materially_wrong',
    proposedLevel: 1,
    confidence: 'low',
    reasonCodes: ['missing_quote', 'level_too_high'],
  }))
  assert.equal(calculateAiPathResearchAgreement(packet(ratings)).unitCount, 1)
  assert.throws(() => calculateAiPathResearchAgreement(packet([
    { ...ratings[0], reasonCodes: ['missing_quote', 'missing_quote'] }, ratings[1],
  ])), ResearchAgreementValidationError)
  assert.throws(() => calculateAiPathResearchAgreement(packet([
    { ...ratings[0], reasonCodes: ['custom prose'] }, ratings[1],
  ])), ResearchAgreementValidationError)
})
