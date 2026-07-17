import { randomUUID } from 'node:crypto'

import {
  AI_PATH_CATALOG_VERSION,
  AI_PATH_REPORT_VERSION,
  AI_PATH_SCORING_VERSION,
  AI_PATH_TAXONOMY_VERSION,
  type AssessmentReport,
} from './foundation.ts'
import type {
  AssessmentPrincipal,
  AssessmentSessionRecord,
} from './session-persistence.ts'
import type {
  SupabaseTrustedAnalysisTransition,
  SupabaseTrustedReportWriter,
} from './supabase-session-repository.ts'

export type TrustedAnalysisRecomputeContext = Readonly<{
  session: AssessmentSessionRecord
  generatedAt: Date
}>

export type TrustedAnalysisCoordinatorResult =
  | Readonly<{
    ok: true
    session: AssessmentSessionRecord
    reportDigest: string
    replayed: boolean
  }>
  | Readonly<{
    ok: false
    reason: 'invalid_request' | 'recompute_failed' | 'reconciliation_required'
    retryable: boolean
  }>

export type TrustedAnalysisCoordinatorInput = Readonly<{
  principal: AssessmentPrincipal
  sessionId: string
  recomputeReport: (
    context: TrustedAnalysisRecomputeContext,
  ) => AssessmentReport | Promise<AssessmentReport>
}>

type TransitionBoundary = Pick<
  SupabaseTrustedAnalysisTransition,
  'beginForVerifiedOwner'
>
type CompletionBoundary = Pick<
  SupabaseTrustedReportWriter,
  'completeServerRecomputedReport'
>

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validRecomputedReport(
  report: AssessmentReport,
  session: AssessmentSessionRecord,
  generatedAt: string,
) {
  return report.reportVersion === AI_PATH_REPORT_VERSION
    && report.taxonomyVersion === AI_PATH_TAXONOMY_VERSION
    && report.scoringVersion === AI_PATH_SCORING_VERSION
    && report.catalogVersion === AI_PATH_CATALOG_VERSION
    && report.generatedAt === generatedAt
    && report.goal === session.goal
    && Array.isArray(report.results)
    && Array.isArray(report.strengths)
    && Array.isArray(report.growthAreas)
    && Array.isArray(report.recommendations)
}

/**
 * Provider-free orchestration for one trusted deterministic analysis attempt.
 *
 * The database transition owns the durable attempt UUID and generation time.
 * A process retry may propose a new UUID, but an already-started row returns its
 * original binding. The coordinator always completes with that persisted UUID
 * and recomputes with that persisted timestamp, so an exact retry remains byte
 * stable even after an unknown database commit.
 */
export class TrustedAnalysisCoordinator {
  readonly #transition: TransitionBoundary
  readonly #writer: CompletionBoundary
  readonly #attemptIdFactory: () => string

  constructor(
    transition: TransitionBoundary,
    writer: CompletionBoundary,
    attemptIdFactory: () => string = randomUUID,
  ) {
    this.#transition = transition
    this.#writer = writer
    this.#attemptIdFactory = attemptIdFactory
  }

  async complete(
    input: TrustedAnalysisCoordinatorInput,
  ): Promise<TrustedAnalysisCoordinatorResult> {
    if (
      input.principal.source !== 'supabase'
      || !uuidPattern.test(input.principal.userId)
      || !uuidPattern.test(input.sessionId)
    ) {
      return Object.freeze({ ok: false, reason: 'invalid_request', retryable: false })
    }

    const proposedAttemptId = this.#attemptIdFactory()
    if (!uuidPattern.test(proposedAttemptId)) {
      return Object.freeze({ ok: false, reason: 'invalid_request', retryable: false })
    }

    let transition
    try {
      transition = await this.#transition.beginForVerifiedOwner(
        input.principal,
        input.sessionId,
        proposedAttemptId,
      )
    } catch {
      // The RPC may have committed despite a transport failure. Do not compute
      // or write until a later exact retry recovers the persisted binding.
      return Object.freeze({
        ok: false,
        reason: 'reconciliation_required',
        retryable: true,
      })
    }

    let report: AssessmentReport
    try {
      report = await input.recomputeReport({
        session: transition.session,
        generatedAt: new Date(transition.analysisStartedAt),
      })
    } catch {
      return Object.freeze({ ok: false, reason: 'recompute_failed', retryable: true })
    }
    if (!validRecomputedReport(report, transition.session, transition.analysisStartedAt)) {
      return Object.freeze({ ok: false, reason: 'recompute_failed', retryable: true })
    }

    try {
      const completion = await this.#writer.completeServerRecomputedReport({
        sessionId: input.sessionId,
        principal: input.principal,
        report,
        reportWriteId: transition.analysisAttemptId,
      })
      return Object.freeze({
        ok: true,
        session: completion.session,
        reportDigest: completion.reportDigest,
        replayed: transition.replayed || completion.replayed,
      })
    } catch {
      // Completion is idempotent by persisted attempt UUID and canonical report
      // digest. A later request must recover the binding and retry; this request
      // never guesses whether the database committed.
      return Object.freeze({
        ok: false,
        reason: 'reconciliation_required',
        retryable: true,
      })
    }
  }
}
