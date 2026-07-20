import { readBoundedJson } from './request-body.ts'
import { sameOriginMutationResponse } from './request-security.ts'
import {
  parseAccountDeleteConfirmation,
} from './account-privacy.ts'

const ACCOUNT_DELETE_BODY_LIMIT = 512

export type AccountPrivacyPrincipal = Readonly<{
  id: string
  email: string | null
}>

export type AccountDeletionReadiness = Readonly<{
  ready: boolean
  retryAt: string | null
}>

export interface AccountPrivacyService {
  exportOwnedAccount(): Promise<unknown>
  accountDeletionReadiness(): Promise<AccountDeletionReadiness>
  deleteAnalyticsForOwner(ownerId: string): Promise<void>
  deleteAuthUser(ownerId: string): Promise<void>
}

export type AccountPrivacyRequestRuntime = Readonly<{
  available: boolean
  reason: string
  principal: AccountPrivacyPrincipal | null
  sessionBoundDeletionReauthentication: boolean
  service: AccountPrivacyService | null
}>

function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

function requireRuntime(runtime: AccountPrivacyRequestRuntime): Response | null {
  if (!runtime.available) {
    return json({ error: 'account_privacy_unavailable' }, 503)
  }
  if (!runtime.principal) return json({ error: 'authentication_required' }, 401)
  if (!runtime.service) return json({ error: 'account_privacy_unavailable' }, 503)
  return null
}

export async function handleAccountExportPost(
  request: Request,
  runtime: AccountPrivacyRequestRuntime,
): Promise<Response> {
  const originError = sameOriginMutationResponse(request)
  if (originError) return originError
  const unavailable = requireRuntime(runtime)
  if (unavailable) return unavailable

  try {
    const payload = await runtime.service!.exportOwnedAccount()
    return json({
      schemaVersion: '2026-07-18.v1',
      exportedAt: new Date().toISOString(),
      account: {
        id: runtime.principal!.id,
        email: runtime.principal!.email,
      },
      data: payload,
    }, 200, {
      'Content-Disposition': 'attachment; filename="ai-path-account-export.json"',
    })
  } catch {
    return json({ error: 'account_export_failed' }, 503)
  }
}

export async function handleAccountDeletePost(
  request: Request,
  runtime: AccountPrivacyRequestRuntime,
): Promise<Response> {
  const originError = sameOriginMutationResponse(request)
  if (originError) return originError
  const unavailable = requireRuntime(runtime)
  if (unavailable) return unavailable

  const body = await readBoundedJson(request, ACCOUNT_DELETE_BODY_LIMIT)
  if (!body.ok) return json({ error: body.error }, body.status)
  const confirmation = parseAccountDeleteConfirmation(body.value)
  if (!confirmation.ok) return json({ error: confirmation.error }, 400)
  if (!runtime.sessionBoundDeletionReauthentication) {
    return json({
      error: 'recent_authentication_required',
      reauthenticateAt: '/ai-path/auth?next=/ai-path/account',
    }, 401)
  }

  try {
    const readiness = await runtime.service!.accountDeletionReadiness()
    if (!readiness.ready) {
      return json({
        error: 'account_has_active_voice_session',
        retryAt: readiness.retryAt,
      }, 409)
    }

    // Fail closed: governed analytics deletion completes before the auth user
    // and cascading product rows are removed. A retry is safe if auth deletion
    // fails after this idempotent erasure.
    await runtime.service!.deleteAnalyticsForOwner(runtime.principal!.id)
    await runtime.service!.deleteAuthUser(runtime.principal!.id)
    return new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
        'Clear-Site-Data': '"cache", "cookies", "storage"',
      },
    })
  } catch {
    return json({ error: 'account_deletion_failed' }, 503)
  }
}
