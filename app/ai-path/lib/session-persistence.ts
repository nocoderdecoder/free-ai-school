import type { AssessmentReport, SessionStartInput, SessionStatus } from './foundation'

export type AssessmentPrincipal = {
  userId: string
  source: 'test-header' | 'supabase'
}

export type AssessmentSessionRecord = SessionStartInput & {
  id: string
  ownerId: string
  status: SessionStatus
  createdAt: string
  updatedAt: string
  report: AssessmentReport | null
}

export type NewAssessmentSessionRecord = Omit<AssessmentSessionRecord, 'report'> & {
  report?: AssessmentReport | null
}

export type CreateSessionResult =
  | { ok: true; session: AssessmentSessionRecord }
  | { ok: false; reason: 'active_session_exists'; sessionId: string }

/**
 * Persistence contract for an eventual durable adapter.
 *
 * A production implementation must enforce createForOwner's one-active-session
 * invariant atomically and perform owner filtering inside the database query.
 * Returning a record and checking its owner later would create an avoidable
 * cross-user disclosure boundary.
 */
export interface AssessmentSessionRepository {
  createForOwner(session: NewAssessmentSessionRecord): Promise<CreateSessionResult>
  findOwnedById(sessionId: string, ownerId: string): Promise<AssessmentSessionRecord | null>
  saveReportOwned(
    sessionId: string,
    ownerId: string,
    report: AssessmentReport,
    updatedAt: string,
  ): Promise<AssessmentSessionRecord | null>
  exportOwnedById(sessionId: string, ownerId: string): Promise<AssessmentSessionRecord | null>
  deleteOwnedById(sessionId: string, ownerId: string): Promise<boolean>
}

const terminalStatuses = new Set<SessionStatus>(['complete', 'failed', 'expired'])

function cloneSession(session: AssessmentSessionRecord): AssessmentSessionRecord {
  return structuredClone(session)
}

/** Local/test adapter only. It is process-local and is never production-ready. */
export class InMemoryAssessmentSessionRepository implements AssessmentSessionRepository {
  readonly #sessions = new Map<string, AssessmentSessionRecord>()

  async createForOwner(input: NewAssessmentSessionRecord): Promise<CreateSessionResult> {
    for (const existing of this.#sessions.values()) {
      if (existing.ownerId === input.ownerId && !terminalStatuses.has(existing.status)) {
        return { ok: false, reason: 'active_session_exists', sessionId: existing.id }
      }
    }

    const session: AssessmentSessionRecord = {
      ...structuredClone(input),
      report: input.report ? structuredClone(input.report) : null,
    }
    this.#sessions.set(session.id, session)
    return { ok: true, session: cloneSession(session) }
  }

  async findOwnedById(sessionId: string, ownerId: string): Promise<AssessmentSessionRecord | null> {
    const session = this.#sessions.get(sessionId)
    if (!session || session.ownerId !== ownerId) return null
    return cloneSession(session)
  }

  async saveReportOwned(
    sessionId: string,
    ownerId: string,
    report: AssessmentReport,
    updatedAt: string,
  ): Promise<AssessmentSessionRecord | null> {
    const session = this.#sessions.get(sessionId)
    if (!session || session.ownerId !== ownerId) return null
    const updated = {
      ...session,
      status: 'complete' as const,
      report: structuredClone(report),
      updatedAt,
    }
    this.#sessions.set(sessionId, updated)
    return cloneSession(updated)
  }

  exportOwnedById(sessionId: string, ownerId: string) {
    return this.findOwnedById(sessionId, ownerId)
  }

  async deleteOwnedById(sessionId: string, ownerId: string): Promise<boolean> {
    const session = this.#sessions.get(sessionId)
    if (!session || session.ownerId !== ownerId) return false
    return this.#sessions.delete(sessionId)
  }
}

type AssessmentSessionServiceOptions = {
  idFactory?: () => string
  now?: () => Date
}

export class AssessmentSessionService {
  readonly #repository: AssessmentSessionRepository
  readonly #idFactory: () => string
  readonly #now: () => Date

  constructor(repository: AssessmentSessionRepository, options: AssessmentSessionServiceOptions = {}) {
    this.#repository = repository
    this.#idFactory = options.idFactory ?? (() => crypto.randomUUID())
    this.#now = options.now ?? (() => new Date())
  }

  async createOwnedSession(
    principal: AssessmentPrincipal,
    input: SessionStartInput,
  ): Promise<CreateSessionResult> {
    const now = this.#now().toISOString()
    return this.#repository.createForOwner({
      ...structuredClone(input),
      id: this.#idFactory(),
      ownerId: principal.userId,
      status: 'consented',
      createdAt: now,
      updatedAt: now,
    })
  }

  getOwnedSession(principal: AssessmentPrincipal, sessionId: string) {
    return this.#repository.findOwnedById(sessionId, principal.userId)
  }

  saveOwnedReport(principal: AssessmentPrincipal, sessionId: string, report: AssessmentReport) {
    return this.#repository.saveReportOwned(
      sessionId,
      principal.userId,
      report,
      this.#now().toISOString(),
    )
  }

  exportOwnedSession(principal: AssessmentPrincipal, sessionId: string) {
    return this.#repository.exportOwnedById(sessionId, principal.userId)
  }

  deleteOwnedSession(principal: AssessmentPrincipal, sessionId: string) {
    return this.#repository.deleteOwnedById(sessionId, principal.userId)
  }
}

export type SessionPersistenceEnvironment = {
  nodeEnv?: string
  store?: string
  enableTestAuth?: string
}

export type SessionPersistenceCapability = {
  mode: 'disabled' | 'memory-test'
  available: boolean
  productionReady: false
  persistence: 'none' | 'ephemeral-memory'
  reason: string
}

export function resolveSessionPersistenceCapability(
  environment: SessionPersistenceEnvironment,
): SessionPersistenceCapability {
  if (environment.nodeEnv === 'production') {
    return {
      mode: 'disabled',
      available: false,
      productionReady: false,
      persistence: 'none',
      reason: 'trusted user authentication, RLS, and a durable assessment-session table are not configured',
    }
  }
  if (environment.store !== 'memory') {
    return {
      mode: 'disabled',
      available: false,
      productionReady: false,
      persistence: 'none',
      reason: 'local session persistence is not explicitly enabled',
    }
  }
  if (environment.enableTestAuth !== 'true') {
    return {
      mode: 'disabled',
      available: false,
      productionReady: false,
      persistence: 'none',
      reason: 'local test authentication is not explicitly enabled',
    }
  }
  return {
    mode: 'memory-test',
    available: true,
    productionReady: false,
    persistence: 'ephemeral-memory',
    reason: 'local test-only ownership and process-local persistence are enabled',
  }
}

const testUserIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/

export function parseTestPrincipal(
  rawUserId: string | null,
  capability: SessionPersistenceCapability,
): AssessmentPrincipal | null {
  if (capability.mode !== 'memory-test' || !rawUserId) return null
  const userId = rawUserId.trim()
  return testUserIdPattern.test(userId) ? { userId, source: 'test-header' } : null
}
