import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import type { SessionStatus } from './foundation.ts'
import type { AssessmentPrincipal } from './session-persistence.ts'

export const AI_PATH_REALTIME_HMAC_ROTATION_CONTRACT_VERSION = '2026-07-17.hmac-rotation.v1' as const

const keyringMarker: unique symbol = Symbol('ai-path-realtime-hmac-keyring')
const versionPattern = /^v([1-9][0-9]{0,8})$/
const opaqueKeyPattern = /^[0-9a-f]{64}$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const reservableStatuses = new Set<SessionStatus>(['consented', 'connecting'])
const maximumRetainedKeys = 3

export type RealtimeAdmissionHmacVersion = `v${number}`

export type RealtimeAdmissionHmacRotationPolicy = Readonly<{
  contractVersion: typeof AI_PATH_REALTIME_HMAC_ROTATION_CONTRACT_VERSION
  activeVersion: RealtimeAdmissionHmacVersion
  minimumAcceptedVersion: RealtimeAdmissionHmacVersion
  acceptedPreviousVersions: readonly RealtimeAdmissionHmacVersion[]
  standbyVersion: RealtimeAdmissionHmacVersion | null
}>

export type RealtimeAdmissionHmacKeyMaterial = Readonly<{
  version: RealtimeAdmissionHmacVersion
  encoding: 'base64url' | 'hex' | 'legacy-utf8'
  secret: string
}>

export type RealtimeAdmissionOpaqueBinding = Readonly<{
  keyVersion: RealtimeAdmissionHmacVersion
  userKey: string
  sessionKey: string
}>

export type RealtimeAdmissionHmacContinuitySet = Readonly<{
  contractVersion: typeof AI_PATH_REALTIME_HMAC_ROTATION_CONTRACT_VERSION
  activeVersion: RealtimeAdmissionHmacVersion
  minimumAcceptedVersion: RealtimeAdmissionHmacVersion
  writeBinding: RealtimeAdmissionOpaqueBinding
  lookupBindings: readonly RealtimeAdmissionOpaqueBinding[]
  [keyringMarker]: true
}>

/**
 * Initial reviewed policy. Rotation is dormant: changing an active or accepted
 * version requires a source review and the rollout proof documented alongside
 * this module. Environment variables cannot change this policy.
 */
export const AI_PATH_REALTIME_HMAC_ROTATION_POLICY = Object.freeze({
  contractVersion: AI_PATH_REALTIME_HMAC_ROTATION_CONTRACT_VERSION,
  activeVersion: 'v1',
  minimumAcceptedVersion: 'v1',
  acceptedPreviousVersions: Object.freeze([]),
  standbyVersion: null,
}) satisfies RealtimeAdmissionHmacRotationPolicy

function failClosed(): never {
  throw new Error('Realtime admission HMAC continuity validation failed closed.')
}

function hasExactKeys(value: object, expected: readonly string[]) {
  const actual = Object.keys(value).sort()
  const sortedExpected = [...expected].sort()
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index])
}

function versionNumber(version: unknown) {
  if (typeof version !== 'string') failClosed()
  const match = versionPattern.exec(version)
  if (!match) failClosed()
  const value = Number(match[1])
  if (!Number.isSafeInteger(value)) failClosed()
  return value
}

function decodeSecret(material: RealtimeAdmissionHmacKeyMaterial) {
  if (
    !material
    || typeof material !== 'object'
    || !hasExactKeys(material, ['version', 'encoding', 'secret'])
  ) failClosed()
  if (typeof material.secret !== 'string' || material.secret.length > 172) failClosed()

  let bytes: Buffer
  if (material.encoding === 'legacy-utf8') {
    // v1 is the only compatibility bridge for the original string-keyed
    // derivation. New versions must use an explicit binary encoding.
    if (material.version !== 'v1' || material.secret !== material.secret.trim()) failClosed()
    bytes = Buffer.from(material.secret, 'utf8')
  } else if (material.encoding === 'hex') {
    if (!/^[0-9a-f]{64,128}$/.test(material.secret) || material.secret.length % 2 !== 0) failClosed()
    bytes = Buffer.from(material.secret, 'hex')
    if (bytes.toString('hex') !== material.secret) failClosed()
  } else if (material.encoding === 'base64url') {
    if (!/^[A-Za-z0-9_-]{43,86}$/.test(material.secret)) failClosed()
    bytes = Buffer.from(material.secret, 'base64url')
    if (bytes.toString('base64url') !== material.secret) failClosed()
  } else {
    failClosed()
  }

  // Encoding and byte-diversity checks reject short, placeholder, repeated,
  // or trivially low-diversity values. Production material must still come
  // from a cryptographically secure 256-bit secret-manager generator.
  const maximumBytes = material.encoding === 'legacy-utf8' ? 128 : 64
  if (bytes.length < 32 || bytes.length > maximumBytes || new Set(bytes).size < 16) failClosed()
  return bytes
}

function validatePolicy(policy: RealtimeAdmissionHmacRotationPolicy) {
  if (!policy || typeof policy !== 'object') failClosed()
  if (!hasExactKeys(policy, [
    'contractVersion',
    'activeVersion',
    'minimumAcceptedVersion',
    'acceptedPreviousVersions',
    'standbyVersion',
  ])) failClosed()
  if (policy.contractVersion !== AI_PATH_REALTIME_HMAC_ROTATION_CONTRACT_VERSION) failClosed()
  if (!Array.isArray(policy.acceptedPreviousVersions)) failClosed()

  const active = versionNumber(policy.activeVersion)
  const minimum = versionNumber(policy.minimumAcceptedVersion)
  const previous = policy.acceptedPreviousVersions.map(versionNumber)
  const standby = policy.standbyVersion === null ? null : versionNumber(policy.standbyVersion)
  const configured = [policy.activeVersion, ...policy.acceptedPreviousVersions]
  if (policy.standbyVersion !== null) configured.push(policy.standbyVersion)

  if (configured.length > maximumRetainedKeys || new Set(configured).size !== configured.length) failClosed()
  if (minimum > active) failClosed()
  if (previous.some(version => version < minimum || version >= active)) failClosed()
  if (previous.length > 0 && Math.min(...previous) !== minimum) failClosed()
  if (previous.length === 0 && minimum !== active) failClosed()
  if (standby !== null && standby <= active) failClosed()

  // A canonical descending lookup order makes configuration drift observable
  // and prevents two deployments from assigning different precedence.
  for (let index = 1; index < previous.length; index += 1) {
    if (previous[index - 1] <= previous[index]) failClosed()
  }
  return configured
}

function deriveOpaqueKey(secret: Buffer, domain: 'user' | 'session', rawId: string) {
  // Keep the established v1 derivation domains stable. The separately stored
  // key version selects the secret; it is not mixed into the HMAC input.
  return createHmac('sha256', secret).update(`${domain}\0${rawId}`).digest('hex')
}

function frozenBinding(
  version: RealtimeAdmissionHmacVersion,
  secret: Buffer,
  userId: string,
  sessionId: string,
): RealtimeAdmissionOpaqueBinding {
  return Object.freeze({
    keyVersion: version,
    userKey: deriveOpaqueKey(secret, 'user', userId),
    sessionKey: deriveOpaqueKey(secret, 'session', sessionId),
  })
}

/**
 * Derives a bounded set of versioned opaque bindings from an already verified
 * owner/session pair. Only the active binding may be written; every retained
 * version may be used for an atomic lookup during a reviewed overlap window.
 * Neither raw identity nor key material is returned.
 */
export function createRealtimeAdmissionHmacContinuitySet(input: {
  principal: AssessmentPrincipal
  ownedSession: { id: string; ownerId: string; status: SessionStatus }
  policy: RealtimeAdmissionHmacRotationPolicy
  keys: readonly RealtimeAdmissionHmacKeyMaterial[]
}): RealtimeAdmissionHmacContinuitySet {
  if (input.principal.source !== 'supabase') failClosed()
  if (input.principal.userId !== input.ownedSession.ownerId) failClosed()
  if (!uuidPattern.test(input.principal.userId) || !uuidPattern.test(input.ownedSession.id)) failClosed()
  if (!reservableStatuses.has(input.ownedSession.status)) failClosed()

  const configuredVersions = validatePolicy(input.policy)
  if (!Array.isArray(input.keys) || input.keys.length !== configuredVersions.length) failClosed()

  const materialByVersion = new Map<RealtimeAdmissionHmacVersion, Buffer>()
  const secretFingerprints = new Set<string>()
  for (const material of input.keys) {
    if (!material || typeof material !== 'object') failClosed()
    versionNumber(material.version)
    if (!configuredVersions.includes(material.version) || materialByVersion.has(material.version)) failClosed()
    const secret = decodeSecret(material)
    const fingerprint = createHash('sha256').update(secret).digest('hex')
    if (secretFingerprints.has(fingerprint)) failClosed()
    secretFingerprints.add(fingerprint)
    materialByVersion.set(material.version, secret)
  }
  if (configuredVersions.some(version => !materialByVersion.has(version))) failClosed()

  const lookupVersions = [
    input.policy.activeVersion,
    ...(input.policy.standbyVersion === null ? [] : [input.policy.standbyVersion]),
    ...input.policy.acceptedPreviousVersions,
  ]
  const lookupBindings = lookupVersions.map(version => frozenBinding(
    version,
    materialByVersion.get(version) ?? failClosed(),
    input.principal.userId,
    input.ownedSession.id,
  ))
  const opaquePairs = lookupBindings.map(binding => `${binding.userKey}:${binding.sessionKey}`)
  if (new Set(opaquePairs).size !== opaquePairs.length) failClosed()

  const writeBinding = lookupBindings.find(binding => binding.keyVersion === input.policy.activeVersion)
  if (!writeBinding) failClosed()
  return Object.freeze({
    contractVersion: AI_PATH_REALTIME_HMAC_ROTATION_CONTRACT_VERSION,
    activeVersion: input.policy.activeVersion,
    minimumAcceptedVersion: input.policy.minimumAcceptedVersion,
    writeBinding,
    lookupBindings: Object.freeze(lookupBindings),
    [keyringMarker]: true as const,
  })
}

function validContinuitySet(value: RealtimeAdmissionHmacContinuitySet) {
  return value?.[keyringMarker] === true
    && value.contractVersion === AI_PATH_REALTIME_HMAC_ROTATION_CONTRACT_VERSION
    && Array.isArray(value.lookupBindings)
    && value.lookupBindings.length >= 1
    && value.lookupBindings.length <= maximumRetainedKeys
    && value.writeBinding.keyVersion === value.activeVersion
    && value.lookupBindings.includes(value.writeBinding)
}

/** Returns only the active write binding; passing a retained version is a downgrade. */
export function requireRealtimeAdmissionWriteBinding(
  continuity: RealtimeAdmissionHmacContinuitySet,
  requestedVersion: string,
) {
  if (!validContinuitySet(continuity) || requestedVersion !== continuity.activeVersion) failClosed()
  return continuity.writeBinding
}

/**
 * Selects the one retained binding matching a stored, versioned opaque pair.
 * Unknown/retired versions, cross-version pairs, and malformed keys are
 * deliberately indistinguishable to callers.
 */
export function requireRealtimeAdmissionStoredBinding(
  continuity: RealtimeAdmissionHmacContinuitySet,
  stored: { keyVersion: string; userKey: string; sessionKey: string },
) {
  if (
    !validContinuitySet(continuity)
    || !stored
    || typeof stored !== 'object'
    || !hasExactKeys(stored, ['keyVersion', 'userKey', 'sessionKey'])
    || !versionPattern.test(stored.keyVersion)
    || !opaqueKeyPattern.test(stored.userKey)
    || !opaqueKeyPattern.test(stored.sessionKey)
  ) failClosed()

  const candidates = continuity.lookupBindings.filter(candidate => candidate.keyVersion === stored.keyVersion)
  if (candidates.length !== 1) failClosed()
  const candidate = candidates[0]
  if (
    !timingSafeEqual(Buffer.from(candidate.userKey, 'hex'), Buffer.from(stored.userKey, 'hex'))
    || !timingSafeEqual(Buffer.from(candidate.sessionKey, 'hex'), Buffer.from(stored.sessionKey, 'hex'))
  ) failClosed()
  return candidate
}
