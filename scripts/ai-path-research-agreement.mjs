#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const AI_PATH_RESEARCH_REVIEW_SCHEMA_VERSION = '2026-07-17.v1'

const skillIds = [
  'foundations',
  'prompt-context',
  'workflow-design',
  'data-retrieval',
  'coding-apis',
  'agents-tools',
  'evaluation-reliability',
  'deployment-operations',
  'safety-governance',
]
const evidenceVerdicts = ['supported', 'partially_supported', 'materially_wrong', 'not_assessable']
const confidenceValues = ['low', 'medium', 'high']
const reasonCodes = [
  'missing_quote',
  'ownership_unclear',
  'artifact_unverified',
  'outcome_unmeasured',
  'contradiction_unresolved',
  'level_too_high',
  'level_too_low',
  'not_assessed_expected',
]
const idPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+){0,7}$/
const MAX_UNITS = 500

export class ResearchAgreementValidationError extends Error {
  constructor(issues) {
    super('The research review packet is invalid.')
    this.name = 'ResearchAgreementValidationError'
    this.issues = Object.freeze(issues.map(issue => Object.freeze({ ...issue })))
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(record, keys) {
  const allowed = new Set(keys)
  return Object.keys(record).filter(key => !allowed.has(key))
}

function round(value) {
  return value === null ? null : Number(value.toFixed(4))
}

function interpretation(value) {
  if (value === null) return 'not_estimable'
  if (value < 0) return 'below_chance'
  if (value < 0.4) return 'low'
  if (value < 0.6) return 'moderate'
  if (value < 0.8) return 'substantial'
  return 'very_high'
}

function validatePacket(input) {
  const issues = []
  const add = (path, code) => issues.push({ path, code })
  if (!isRecord(input)) throw new ResearchAgreementValidationError([{ path: '$', code: 'invalid_type' }])
  for (const key of exactKeys(input, ['schemaVersion', 'reviewers', 'ratings'])) add(key, 'unknown_field')
  if (input.schemaVersion !== AI_PATH_RESEARCH_REVIEW_SCHEMA_VERSION) add('schemaVersion', 'unsupported_version')
  if (!Array.isArray(input.reviewers) || input.reviewers.length !== 2) add('reviewers', 'exactly_two_required')
  const reviewers = Array.isArray(input.reviewers) ? input.reviewers : []
  reviewers.forEach((reviewer, index) => {
    if (typeof reviewer !== 'string' || !idPattern.test(reviewer)) add(`reviewers[${index}]`, 'invalid_opaque_id')
  })
  if (new Set(reviewers).size !== reviewers.length) add('reviewers', 'must_be_distinct')
  if (!Array.isArray(input.ratings) || input.ratings.length < 2 || input.ratings.length > MAX_UNITS * 2) {
    add('ratings', 'out_of_bounds')
  }
  const ratings = Array.isArray(input.ratings) ? input.ratings : []
  ratings.forEach((rating, index) => {
    const path = `ratings[${index}]`
    if (!isRecord(rating)) {
      add(path, 'invalid_type')
      return
    }
    for (const key of exactKeys(rating, [
      'participantId', 'findingId', 'skillId', 'reviewerId', 'evidenceVerdict',
      'proposedLevel', 'confidence', 'reasonCodes',
    ])) add(`${path}.${key}`, 'unknown_field')
    if (typeof rating.participantId !== 'string' || !idPattern.test(rating.participantId)) add(`${path}.participantId`, 'invalid_opaque_id')
    if (typeof rating.findingId !== 'string' || !idPattern.test(rating.findingId)) add(`${path}.findingId`, 'invalid_opaque_id')
    if (!skillIds.includes(rating.skillId)) add(`${path}.skillId`, 'invalid_value')
    if (!reviewers.includes(rating.reviewerId)) add(`${path}.reviewerId`, 'unknown_reviewer')
    if (!evidenceVerdicts.includes(rating.evidenceVerdict)) add(`${path}.evidenceVerdict`, 'invalid_value')
    if (!(rating.proposedLevel === null || Number.isInteger(rating.proposedLevel) && rating.proposedLevel >= 1 && rating.proposedLevel <= 4)) {
      add(`${path}.proposedLevel`, 'invalid_value')
    }
    if (!confidenceValues.includes(rating.confidence)) add(`${path}.confidence`, 'invalid_value')
    if (!Array.isArray(rating.reasonCodes) || rating.reasonCodes.length > reasonCodes.length
      || rating.reasonCodes.some(code => !reasonCodes.includes(code))
      || new Set(rating.reasonCodes).size !== rating.reasonCodes.length) {
      add(`${path}.reasonCodes`, 'invalid_value')
    }
  })
  if (issues.length) throw new ResearchAgreementValidationError(issues)

  const units = new Map()
  for (const rating of ratings) {
    const key = `${rating.participantId}|${rating.findingId}|${rating.skillId}`
    const entries = units.get(key) ?? []
    entries.push(rating)
    units.set(key, entries)
  }
  if (units.size < 1 || units.size > MAX_UNITS) add('ratings', 'unit_count_out_of_bounds')
  for (const [key, entries] of units) {
    if (entries.length !== 2 || new Set(entries.map(entry => entry.reviewerId)).size !== 2) {
      add(`units.${key}`, 'exactly_one_rating_per_reviewer_required')
    }
  }
  if (issues.length) throw new ResearchAgreementValidationError(issues)
  return { reviewers: [...reviewers].sort(), units }
}

function categoricalAgreement(pairs, categories) {
  const agreementCount = pairs.filter(([left, right]) => left === right).length
  const observed = agreementCount / pairs.length
  const leftCounts = Object.fromEntries(categories.map(category => [category, 0]))
  const rightCounts = Object.fromEntries(categories.map(category => [category, 0]))
  const confusionMatrix = Object.fromEntries(categories.map(category => [
    category,
    Object.fromEntries(categories.map(other => [other, 0])),
  ]))
  for (const [left, right] of pairs) {
    leftCounts[left] += 1
    rightCounts[right] += 1
    confusionMatrix[left][right] += 1
  }
  const expected = categories.reduce((sum, category) => (
    sum + (leftCounts[category] / pairs.length) * (rightCounts[category] / pairs.length)
  ), 0)
  const kappa = expected === 1 ? null : (observed - expected) / (1 - expected)
  return Object.freeze({
    comparableUnitCount: pairs.length,
    agreementCount,
    percentAgreement: round(observed),
    cohenKappa: round(kappa),
    interpretation: interpretation(kappa),
    confusionMatrix,
  })
}

function quadraticWeightedKappa(pairs) {
  if (!pairs.length) return null
  const categories = [1, 2, 3, 4]
  const maxDistanceSquared = 9
  const leftCounts = Object.fromEntries(categories.map(category => [category, 0]))
  const rightCounts = Object.fromEntries(categories.map(category => [category, 0]))
  let observedDisagreement = 0
  for (const [left, right] of pairs) {
    leftCounts[left] += 1
    rightCounts[right] += 1
    observedDisagreement += ((left - right) ** 2) / maxDistanceSquared
  }
  observedDisagreement /= pairs.length
  let expectedDisagreement = 0
  for (const left of categories) {
    for (const right of categories) {
      expectedDisagreement += (leftCounts[left] / pairs.length)
        * (rightCounts[right] / pairs.length)
        * (((left - right) ** 2) / maxDistanceSquared)
    }
  }
  return expectedDisagreement === 0 ? null : 1 - observedDisagreement / expectedDisagreement
}

function ordinalAgreement(allPairs) {
  const pairs = allPairs.filter(([left, right]) => left !== null && right !== null)
  const exactAgreementCount = pairs.filter(([left, right]) => left === right).length
  const withinOneCount = pairs.filter(([left, right]) => Math.abs(left - right) <= 1).length
  const kappa = quadraticWeightedKappa(pairs)
  return Object.freeze({
    comparableUnitCount: pairs.length,
    excludedNullUnitCount: allPairs.length - pairs.length,
    exactAgreementCount,
    exactPercentAgreement: pairs.length ? round(exactAgreementCount / pairs.length) : null,
    withinOneCount,
    withinOnePercentAgreement: pairs.length ? round(withinOneCount / pairs.length) : null,
    quadraticWeightedKappa: round(kappa),
    interpretation: interpretation(kappa),
  })
}

export function calculateAiPathResearchAgreement(input) {
  const { reviewers, units } = validatePacket(input)
  const orderedUnits = [...units.entries()].sort(([left], [right]) => left.localeCompare(right))
  const paired = orderedUnits.map(([unitId, ratings]) => {
    const byReviewer = new Map(ratings.map(rating => [rating.reviewerId, rating]))
    return { unitId, left: byReviewer.get(reviewers[0]), right: byReviewer.get(reviewers[1]) }
  })
  const evidencePairs = paired.map(({ left, right }) => [left.evidenceVerdict, right.evidenceVerdict])
  const confidencePairs = paired.map(({ left, right }) => [left.confidence, right.confidence])
  const levelPairs = paired.map(({ left, right }) => [left.proposedLevel, right.proposedLevel])
  const disagreements = paired.flatMap(({ unitId, left, right }) => {
    const fields = []
    if (left.evidenceVerdict !== right.evidenceVerdict) fields.push('evidenceVerdict')
    if (left.proposedLevel !== right.proposedLevel) fields.push('proposedLevel')
    if (left.confidence !== right.confidence) fields.push('confidence')
    return fields.length ? [{ unitId, fields }] : []
  })
  return Object.freeze({
    schemaVersion: AI_PATH_RESEARCH_REVIEW_SCHEMA_VERSION,
    reviewerIds: Object.freeze(reviewers),
    unitCount: paired.length,
    evidenceVerdict: categoricalAgreement(evidencePairs, evidenceVerdicts),
    proposedLevel: ordinalAgreement(levelPairs),
    confidence: categoricalAgreement(confidencePairs, confidenceValues),
    disagreementUnitCount: disagreements.length,
    disagreements: Object.freeze(disagreements.map(item => Object.freeze({
      unitId: item.unitId,
      fields: Object.freeze(item.fields),
    }))),
  })
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath || process.argv.length !== 3) {
    process.stderr.write('Usage: node scripts/ai-path-research-agreement.mjs <review-packet.json>\n')
    process.exitCode = 2
    return
  }
  try {
    const input = JSON.parse(await readFile(inputPath, 'utf8'))
    process.stdout.write(`${JSON.stringify(calculateAiPathResearchAgreement(input), null, 2)}\n`)
  } catch (error) {
    const body = error instanceof ResearchAgreementValidationError
      ? { error: 'invalid_review_packet', issues: error.issues }
      : { error: 'agreement_calculation_failed' }
    process.stderr.write(`${JSON.stringify(body)}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
