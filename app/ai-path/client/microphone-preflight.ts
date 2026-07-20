export type MicrophoneInputDevice = Readonly<{
  deviceId: string
  label: string
  isDefault: boolean
}>

export type MicrophonePreflightPhase =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'permission-denied'
  | 'device-unavailable'
  | 'unsupported'
  | 'failed'
  | 'stopped'

export type MicrophonePreflightSnapshot = Readonly<{
  phase: MicrophonePreflightPhase
  devices: readonly MicrophoneInputDevice[]
  selectedDeviceId: string
  level: number
  error: string | null
}>

type EventListener = () => void

type MicrophoneTrack = Readonly<{
  stop(): void
}>

type MicrophoneStream = Readonly<{
  getTracks(): readonly MicrophoneTrack[]
}>

type MicrophoneDeviceInfo = Readonly<{
  kind: string
  deviceId: string
  label: string
}>

type MicrophoneMediaDevices = Readonly<{
  getUserMedia(constraints: {
    audio: true | { deviceId: { exact: string } }
    video: false
  }): Promise<MicrophoneStream>
  enumerateDevices(): Promise<readonly MicrophoneDeviceInfo[]>
  addEventListener?(type: 'devicechange', listener: EventListener): void
  removeEventListener?(type: 'devicechange', listener: EventListener): void
}>

type MicrophoneAnalyser = {
  fftSize: number
  smoothingTimeConstant: number
  readonly frequencyBinCount: number
  getByteTimeDomainData(values: Uint8Array): void
  disconnect?(): void
}

type MicrophoneSource = Readonly<{
  connect(analyser: MicrophoneAnalyser): void
  disconnect?(): void
}>

type MicrophoneAudioContext = Readonly<{
  readonly state?: string
  createAnalyser(): MicrophoneAnalyser
  createMediaStreamSource(stream: MicrophoneStream): MicrophoneSource
  resume?(): Promise<void>
  close(): Promise<void>
}>

export type MicrophonePreflightDependencies = Readonly<{
  getMediaDevices(): MicrophoneMediaDevices | null
  createAudioContext(): MicrophoneAudioContext
  requestAnimationFrame(callback: () => void): number
  cancelAnimationFrame(handle: number): void
}>

export type MicrophonePreflightController = Readonly<{
  getSnapshot(): MicrophonePreflightSnapshot
  subscribe(listener: () => void): () => void
  refreshDevices(): Promise<MicrophonePreflightSnapshot>
  start(deviceId?: string): Promise<MicrophonePreflightSnapshot>
  selectDevice(deviceId: string): Promise<MicrophonePreflightSnapshot>
  stop(): void
  destroy(): void
}>

export const INITIAL_MICROPHONE_PREFLIGHT_SNAPSHOT: MicrophonePreflightSnapshot = Object.freeze({
  phase: 'idle',
  devices: Object.freeze([]),
  selectedDeviceId: '',
  level: 0,
  error: null,
})

function microphoneError(error: unknown): Pick<MicrophonePreflightSnapshot, 'phase' | 'error'> {
  const name = error && typeof error === 'object' && 'name' in error
    ? String((error as { name: unknown }).name)
    : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return { phase: 'permission-denied', error: 'Microphone access was not allowed. You can continue by typing.' }
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return { phase: 'device-unavailable', error: 'That microphone is unavailable. Choose another device or continue by typing.' }
  }
  return { phase: 'failed', error: 'The microphone could not be tested. You can continue by typing.' }
}

function normalizeDevices(devices: readonly MicrophoneDeviceInfo[]): readonly MicrophoneInputDevice[] {
  let unnamed = 0
  return Object.freeze(devices
    .filter(device => device.kind === 'audioinput' && device.deviceId)
    .map(device => {
      unnamed += device.label ? 0 : 1
      return Object.freeze({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${unnamed}`,
        isDefault: device.deviceId === 'default',
      })
    }))
}

function nextSelectedDevice(devices: readonly MicrophoneInputDevice[], current: string) {
  if (current && devices.some(device => device.deviceId === current)) return current
  return devices.find(device => device.isDefault)?.deviceId ?? devices[0]?.deviceId ?? ''
}

function measuredLevel(analyser: MicrophoneAnalyser, values: Uint8Array) {
  analyser.getByteTimeDomainData(values)
  let sum = 0
  for (const value of values) {
    const sample = (value - 128) / 128
    sum += sample * sample
  }
  return Math.min(1, Math.sqrt(sum / Math.max(1, values.length)) * 4)
}

export function createMicrophonePreflightController(
  dependencies: MicrophonePreflightDependencies,
): MicrophonePreflightController {
  let snapshot = INITIAL_MICROPHONE_PREFLIGHT_SNAPSHOT
  let stream: MicrophoneStream | null = null
  let audioContext: MicrophoneAudioContext | null = null
  let source: MicrophoneSource | null = null
  let analyser: MicrophoneAnalyser | null = null
  let animationFrame: number | null = null
  let operation = 0
  let destroyed = false
  let observingDeviceChanges = false
  const listeners = new Set<() => void>()

  const emit = (next: MicrophonePreflightSnapshot) => {
    snapshot = Object.freeze(next)
    for (const listener of listeners) listener()
  }

  const releaseMedia = () => {
    if (animationFrame !== null) dependencies.cancelAnimationFrame(animationFrame)
    animationFrame = null
    source?.disconnect?.()
    analyser?.disconnect?.()
    source = null
    analyser = null
    for (const track of stream?.getTracks() ?? []) track.stop()
    stream = null
    const context = audioContext
    audioContext = null
    if (context) void context.close().catch(() => undefined)
  }

  const handleDeviceChange = () => { void updateDevices() }
  const observeDeviceChanges = () => {
    if (observingDeviceChanges || destroyed) return
    dependencies.getMediaDevices()?.addEventListener?.('devicechange', handleDeviceChange)
    observingDeviceChanges = true
  }
  const stopObservingDeviceChanges = () => {
    if (!observingDeviceChanges) return
    dependencies.getMediaDevices()?.removeEventListener?.('devicechange', handleDeviceChange)
    observingDeviceChanges = false
  }

  const updateDevices = async () => {
    observeDeviceChanges()
    const mediaDevices = dependencies.getMediaDevices()
    if (!mediaDevices) {
      if (!destroyed) emit({ ...snapshot, phase: 'unsupported', devices: Object.freeze([]), selectedDeviceId: '', level: 0, error: 'This browser does not support microphone access.' })
      return snapshot
    }
    try {
      const devices = normalizeDevices(await mediaDevices.enumerateDevices())
      if (!destroyed) emit({ ...snapshot, devices, selectedDeviceId: nextSelectedDevice(devices, snapshot.selectedDeviceId) })
    } catch {
      // Device labels and selection are an enhancement. An already granted
      // default microphone remains usable if enumeration is unavailable.
    }
    return snapshot
  }

  const measure = () => {
    if (!analyser || destroyed || snapshot.phase !== 'ready') return
    const values = new Uint8Array(analyser.frequencyBinCount)
    const level = measuredLevel(analyser, values)
    if (Math.abs(level - snapshot.level) >= 0.01) emit({ ...snapshot, level })
    animationFrame = dependencies.requestAnimationFrame(measure)
  }

  const controller: MicrophonePreflightController = Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    refreshDevices: updateDevices,
    async start(deviceId = snapshot.selectedDeviceId) {
      const currentOperation = ++operation
      releaseMedia()
      const mediaDevices = dependencies.getMediaDevices()
      if (!mediaDevices) {
        emit({ ...snapshot, phase: 'unsupported', level: 0, error: 'This browser does not support microphone access.' })
        return snapshot
      }
      emit({ ...snapshot, phase: 'requesting', selectedDeviceId: deviceId, level: 0, error: null })
      try {
        const nextStream = await mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          video: false,
        })
        if (destroyed || currentOperation !== operation) {
          for (const track of nextStream.getTracks()) track.stop()
          return snapshot
        }
        stream = nextStream
        audioContext = dependencies.createAudioContext()
        if (audioContext.state === 'suspended') await audioContext.resume?.()
        if (destroyed || currentOperation !== operation) {
          releaseMedia()
          return snapshot
        }
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.75
        source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)
        emit({ ...snapshot, phase: 'ready', selectedDeviceId: deviceId, level: 0, error: null })
        await updateDevices()
        measure()
      } catch (error) {
        if (currentOperation !== operation || destroyed) return snapshot
        releaseMedia()
        emit({ ...snapshot, ...microphoneError(error), level: 0 })
      }
      return snapshot
    },
    async selectDevice(deviceId) {
      if (!snapshot.devices.some(device => device.deviceId === deviceId)) return snapshot
      if (snapshot.phase !== 'ready') {
        emit({ ...snapshot, selectedDeviceId: deviceId })
        return snapshot
      }
      return controller.start(deviceId)
    },
    stop() {
      operation += 1
      stopObservingDeviceChanges()
      releaseMedia()
      if (!destroyed) emit({ ...snapshot, phase: 'stopped', level: 0, error: null })
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      operation += 1
      stopObservingDeviceChanges()
      releaseMedia()
      listeners.clear()
    },
  })

  return controller
}

export function createBrowserMicrophonePreflightController(): MicrophonePreflightController {
  return createMicrophonePreflightController({
    getMediaDevices: () => typeof navigator === 'undefined' ? null : navigator.mediaDevices as unknown as MicrophoneMediaDevices,
    createAudioContext: () => {
      const AudioContextConstructor = globalThis.AudioContext
        ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextConstructor) throw new Error('AudioContext is unavailable.')
      return new AudioContextConstructor() as unknown as MicrophoneAudioContext
    },
    requestAnimationFrame: callback => globalThis.requestAnimationFrame(callback),
    cancelAnimationFrame: handle => globalThis.cancelAnimationFrame(handle),
  })
}
