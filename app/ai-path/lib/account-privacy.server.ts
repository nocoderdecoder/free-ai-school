import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import {
  createConsumerAuthRequestContext,
  applyConsumerAuthResponse,
  type ConsumerAuthRequestContext,
} from './consumer-auth.server'
import {
  resolveAccountPrivacyCapability,
  type AccountPrivacyCapability,
} from './account-privacy'
import type {
  AccountDeletionReadiness,
  AccountPrivacyRequestRuntime,
  AccountPrivacyService,
} from './account-privacy-http'
import { isSafeSupabaseProjectUrl, isSafeSupabasePublicKey } from './supabase-persistence'

type RpcResult = Promise<{ data: unknown; error: { message: string; code?: string } | null }>
type AccountPrivacyRpcClient = {
  rpc(name: 'export_owned_ai_path_account' | 'ai_path_account_deletion_readiness'): RpcResult
}

type AdminAuthClient = {
  auth: { admin: { deleteUser(ownerId: string): Promise<{ error: { message: string } | null }> } }
}

export type AccountPrivacyRuntimeSelection = Readonly<{
  capability: AccountPrivacyCapability
  runtime: AccountPrivacyRequestRuntime
  applyResponse(response: Response): NextResponse
}>

function disabledSelection(capability: AccountPrivacyCapability): AccountPrivacyRuntimeSelection {
  return {
    capability,
    runtime: {
      available: false,
      reason: capability.reason,
      principal: null,
      sessionBoundDeletionReauthentication: false,
      service: null,
    },
    applyResponse: response => new NextResponse(response.body, response),
  }
}

function strictReadiness(value: unknown): AccountDeletionReadiness {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Malformed account-deletion readiness response.')
  }
  const record = value as Record<string, unknown>
  if (Object.keys(record).some(key => key !== 'ready' && key !== 'retryAt')
    || typeof record.ready !== 'boolean'
    || (record.retryAt !== null && typeof record.retryAt !== 'string')) {
    throw new Error('Malformed account-deletion readiness response.')
  }
  if (typeof record.retryAt === 'string' && !Number.isFinite(Date.parse(record.retryAt))) {
    throw new Error('Malformed account-deletion readiness timestamp.')
  }
  return { ready: record.ready, retryAt: record.retryAt as string | null }
}

class SupabaseAccountPrivacyService implements AccountPrivacyService {
  readonly #rpc: AccountPrivacyRpcClient
  readonly #admin: AdminAuthClient

  constructor(rpc: AccountPrivacyRpcClient, admin: AdminAuthClient) {
    this.#rpc = rpc
    this.#admin = admin
  }

  async exportOwnedAccount(): Promise<unknown> {
    const { data, error } = await this.#rpc.rpc('export_owned_ai_path_account')
    if (error || !data) throw new Error('Account export failed.')
    return data
  }

  async accountDeletionReadiness(): Promise<AccountDeletionReadiness> {
    const { data, error } = await this.#rpc.rpc('ai_path_account_deletion_readiness')
    if (error) throw new Error('Account deletion readiness failed.')
    return strictReadiness(data)
  }

  async deleteAnalyticsForOwner(ownerId: string): Promise<void> {
    void ownerId
    // No production analytics sink is active. Opening the account-deletion
    // latch requires replacing this deliberate fail-closed boundary with the
    // reviewed, idempotent sink deletion connector.
    throw new Error('Production analytics deletion is not assembled.')
  }

  async deleteAuthUser(ownerId: string): Promise<void> {
    const { error } = await this.#admin.auth.admin.deleteUser(ownerId)
    if (error) throw new Error('Auth user deletion failed.')
  }
}

function activationCapability() {
  return resolveAccountPrivacyCapability({
    enabled: process.env.AI_PATH_ACCOUNT_PRIVACY_ENABLED,
    schemaVersion: process.env.AI_PATH_ACCOUNT_PRIVACY_SCHEMA_VERSION,
    credentialScope: process.env.AI_PATH_ACCOUNT_PRIVACY_CREDENTIAL_SCOPE,
    ownershipProofReference: process.env.AI_PATH_ACCOUNT_OWNERSHIP_PROOF_REFERENCE,
    cascadeDeletionProofReference: process.env.AI_PATH_ACCOUNT_CASCADE_PROOF_REFERENCE,
    analyticsDeletionReady: process.env.AI_PATH_ANALYTICS_DELETION_READY,
    sessionBoundReauthenticationReady: process.env.AI_PATH_ACCOUNT_SESSION_REAUTH_READY,
    rollbackReady: process.env.AI_PATH_ACCOUNT_PRIVACY_ROLLBACK_READY,
  })
}

function isSafeServerCredential(value: string) {
  return value.startsWith('sb_secret_') || (!isSafeSupabasePublicKey(value) && value.length >= 32)
}

function responseApplier(context: ConsumerAuthRequestContext) {
  return (response: Response) => applyConsumerAuthResponse(
    context,
    new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
  )
}

/**
 * The compile-time capability check intentionally precedes every credential
 * read and client construction. This function cannot accidentally activate
 * from deployment configuration alone.
 */
export async function selectAccountPrivacyRuntime(
  request: Request,
): Promise<AccountPrivacyRuntimeSelection> {
  const capability = activationCapability()
  if (!capability.exportAvailable || !capability.deletionAvailable) {
    return disabledSelection(capability)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !serviceRoleKey
    || !isSafeSupabaseProjectUrl(supabaseUrl)
    || !isSafeServerCredential(serviceRoleKey)) {
    return disabledSelection({
      exportAvailable: false,
      deletionAvailable: false,
      reason: 'the server-only account privacy credential is invalid',
    })
  }

  const context = createConsumerAuthRequestContext(request)
  const { data, error } = await context.client.auth.getUser()
  if (error || !data.user) {
    return {
      capability,
      runtime: {
        available: true,
        reason: 'authentication is required',
        principal: null,
        sessionBoundDeletionReauthentication: false,
        service: null,
      },
      applyResponse: responseApplier(context),
    }
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  }) as unknown as AdminAuthClient
  const service = new SupabaseAccountPrivacyService(
    context.client as unknown as AccountPrivacyRpcClient,
    admin,
  )
  return {
    capability,
    runtime: {
      available: true,
      reason: 'account privacy runtime is ready',
      principal: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
      // A user's account-wide last_sign_in_at is not sufficient: another
      // device could refresh it. A one-time proof bound to this exact session
      // must replace this deliberate fail-closed value before activation.
      sessionBoundDeletionReauthentication: false,
      service,
    },
    applyResponse: responseApplier(context),
  }
}
