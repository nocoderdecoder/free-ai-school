import {
  computeTargetUserMetrics,
  validateAiPathEvent,
  type AiPathEvent,
  type MetricsComputationResult,
} from '../catalog/measurement.ts'

export const AI_PATH_ANALYTICS_MAX_BODY_BYTES = 8_192 as const
export const AI_PATH_EVENT_MAX_AGE_MS = 7 * 86_400_000
export const AI_PATH_EVENT_MAX_FUTURE_SKEW_MS = 5 * 60_000
export const AI_PATH_DELETION_LATENCY_TARGET_MS = 24 * 60 * 60_000

// There is no production sink implementation in this milestone. Deployment
// environment variables cannot open this compile-time review gate.
export const AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH = false as const

export type AnalyticsCapability = {
  available: boolean
  mode: 'disabled' | 'memory-test'
  productionReady: false
  reason: string
}

export type AnalyticsCapabilityEnvironment = {
  nodeEnv?: string
  store?: string
  enableTestSink?: string
}

export function resolveAnalyticsCapability(
  environment: AnalyticsCapabilityEnvironment,
): AnalyticsCapability {
  const disabled = (reason: string): AnalyticsCapability => ({
    available: false,
    mode: 'disabled',
    productionReady: false,
    reason,
  })
  if (environment.nodeEnv === 'production') {
    return disabled(AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH
      ? 'production analytics sink is not configured'
      : 'the reviewed production analytics sink latch remains closed')
  }
  if (environment.nodeEnv !== 'test' && environment.nodeEnv !== 'development') {
    return disabled('the analytics test sink requires an explicit non-production runtime')
  }
  if (environment.store !== 'memory-test' || environment.enableTestSink !== 'true') {
    return disabled('the process-local analytics test sink is not explicitly enabled')
  }
  return {
    available: true,
    mode: 'memory-test',
    productionReady: false,
    reason: 'explicit non-production process-local analytics sink enabled',
  }
}

const allowedEventKeys = new Set([
  'measurementVersion',
  'eventName',
  'occurredAt',
  'anonymousId',
  'assessmentSessionId',
  'properties',
])
const opaqueAnonymousIdPattern = /^anon_[A-Za-z0-9_-]{6,96}$/

export type AnalyticsRejectReason =
  | 'invalid_event'
  | 'event_time_out_of_bounds'
  | 'sink_error'

export type AnalyticsOperationalSnapshot = {
  received: number
  accepted: number
  duplicates: number
  rejected: Record<AnalyticsRejectReason, number>
  deletions: {
    requested: number
    completed: number
    failed: number
    targetBreaches: number
    maximumLatencyMs: number
    averageLatencyMs: number | null
  }
}

export type AnalyticsAppendResult = 'stored' | 'duplicate'

export interface PrivacySafeAnalyticsSink {
  append(event: AiPathEvent, replayKey: string): Promise<AnalyticsAppendResult>
  readAll(): Promise<AiPathEvent[]>
  deleteByAnonymousId(anonymousId: string): Promise<number>
}

function cloneEvent(event: AiPathEvent): AiPathEvent {
  return structuredClone(event)
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`
}

/** The replay key contains only already-governed enum/numeric/opaque values. */
export function analyticsReplayKey(event: AiPathEvent): string {
  return canonicalize(event)
}

export class InMemoryPrivacySafeAnalyticsSink implements PrivacySafeAnalyticsSink {
  readonly #events: AiPathEvent[] = []
  readonly #replayKeys = new Set<string>()

  async append(event: AiPathEvent, replayKey: string): Promise<AnalyticsAppendResult> {
    if (this.#replayKeys.has(replayKey)) return 'duplicate'
    this.#replayKeys.add(replayKey)
    this.#events.push(cloneEvent(event))
    return 'stored'
  }

  async readAll(): Promise<AiPathEvent[]> {
    return this.#events.map(cloneEvent)
  }

  async deleteByAnonymousId(anonymousId: string): Promise<number> {
    let deleted = 0
    for (let index = this.#events.length - 1; index >= 0; index -= 1) {
      if (this.#events[index].anonymousId !== anonymousId) continue
      this.#replayKeys.delete(analyticsReplayKey(this.#events[index]))
      this.#events.splice(index, 1)
      deleted += 1
    }
    return deleted
  }
}

export type AnalyticsIngestResult =
  | { ok: true; accepted: true; duplicate: false }
  | { ok: true; accepted: false; duplicate: true }
  | { ok: false; reason: AnalyticsRejectReason }

export type AnalyticsDeletionResult =
  | { ok: true; deleted: number; latencyMs: number }
  | { ok: false; reason: 'invalid_anonymous_id' | 'invalid_requested_at' | 'sink_error' }

type AnalyticsServiceOptions = {
  now?: () => Date
}

export class PrivacySafeAnalyticsService {
  readonly #sink: PrivacySafeAnalyticsSink
  readonly #now: () => Date
  readonly #operations: AnalyticsOperationalSnapshot = {
    received: 0,
    accepted: 0,
    duplicates: 0,
    rejected: { invalid_event: 0, event_time_out_of_bounds: 0, sink_error: 0 },
    deletions: {
      requested: 0,
      completed: 0,
      failed: 0,
      targetBreaches: 0,
      maximumLatencyMs: 0,
      averageLatencyMs: null,
    },
  }
  #totalDeletionLatencyMs = 0

  constructor(sink: PrivacySafeAnalyticsSink, options: AnalyticsServiceOptions = {}) {
    this.#sink = sink
    this.#now = options.now ?? (() => new Date())
  }

  async ingest(value: unknown): Promise<AnalyticsIngestResult> {
    this.#operations.received += 1
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return this.#reject('invalid_event')
    }
    const record = value as Record<string, unknown>
    if (Object.keys(record).some((key) => !allowedEventKeys.has(key))) {
      return this.#reject('invalid_event')
    }
    const validation = validateAiPathEvent(value)
    if (!validation.ok) return this.#reject('invalid_event')

    const event = structuredClone(value) as AiPathEvent
    const eventTime = Date.parse(event.occurredAt)
    const now = this.#now().getTime()
    if (
      eventTime < now - AI_PATH_EVENT_MAX_AGE_MS
      || eventTime > now + AI_PATH_EVENT_MAX_FUTURE_SKEW_MS
    ) {
      return this.#reject('event_time_out_of_bounds')
    }

    try {
      const result = await this.#sink.append(event, analyticsReplayKey(event))
      if (result === 'duplicate') {
        this.#operations.duplicates += 1
        return { ok: true, accepted: false, duplicate: true }
      }
      this.#operations.accepted += 1
      return { ok: true, accepted: true, duplicate: false }
    } catch {
      return this.#reject('sink_error')
    }
  }

  async computeMetrics(window: { start: string; end: string }): Promise<MetricsComputationResult> {
    return computeTargetUserMetrics(await this.#sink.readAll(), window)
  }

  async deleteAnonymousEvents(
    anonymousId: string,
    requestedAt: string,
  ): Promise<AnalyticsDeletionResult> {
    this.#operations.deletions.requested += 1
    if (!opaqueAnonymousIdPattern.test(anonymousId)) {
      this.#operations.deletions.failed += 1
      return { ok: false, reason: 'invalid_anonymous_id' }
    }
    const requestedMs = Date.parse(requestedAt)
    const completedMs = this.#now().getTime()
    if (!Number.isFinite(requestedMs) || requestedMs > completedMs) {
      this.#operations.deletions.failed += 1
      return { ok: false, reason: 'invalid_requested_at' }
    }
    try {
      const deleted = await this.#sink.deleteByAnonymousId(anonymousId)
      const latencyMs = completedMs - requestedMs
      this.#operations.deletions.completed += 1
      this.#totalDeletionLatencyMs += latencyMs
      this.#operations.deletions.maximumLatencyMs = Math.max(
        this.#operations.deletions.maximumLatencyMs,
        latencyMs,
      )
      if (latencyMs > AI_PATH_DELETION_LATENCY_TARGET_MS) {
        this.#operations.deletions.targetBreaches += 1
      }
      this.#operations.deletions.averageLatencyMs = Math.round(
        this.#totalDeletionLatencyMs / this.#operations.deletions.completed,
      )
      return { ok: true, deleted, latencyMs }
    } catch {
      this.#operations.deletions.failed += 1
      return { ok: false, reason: 'sink_error' }
    }
  }

  operationalSnapshot(): AnalyticsOperationalSnapshot {
    return structuredClone(this.#operations)
  }

  #reject(reason: AnalyticsRejectReason): AnalyticsIngestResult {
    this.#operations.rejected[reason] += 1
    return { ok: false, reason }
  }
}
