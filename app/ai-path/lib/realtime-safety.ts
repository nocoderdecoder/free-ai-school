import { createHmac } from 'node:crypto'

/**
 * Produces a stable, opaque abuse-correlation key for one verified user.
 * The deployment salt is a secret HMAC key; session IDs and raw user IDs are
 * never sent to the model provider.
 */
export function deriveRealtimeSafetyIdentifier(verifiedUserId: string, secretSalt: string): string {
  const userId = verifiedUserId.trim()
  const salt = secretSalt.trim()
  if (userId.length < 3 || userId.length > 200) throw new Error('verified user id is invalid')
  if (salt.length < 32) throw new Error('safety identifier salt must contain at least 32 characters')
  return createHmac('sha256', salt).update(userId).digest('hex')
}
