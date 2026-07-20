'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'

import {
  createBrowserMicrophonePreflightController,
  INITIAL_MICROPHONE_PREFLIGHT_SNAPSHOT,
  type MicrophonePreflightController,
} from '../client/microphone-preflight'
import type { VoiceProviderAvailability } from '../client/voice-provider-availability'

export type MicrophonePreflightProps = Readonly<{
  provider: VoiceProviderAvailability
  controller?: MicrophonePreflightController
  onStartVoice(selectedDeviceId: string): void
  onTypedFallback(): void
  onCancel?(): void
}>

export function MicrophonePreflight({
  provider,
  controller: injectedController,
  onStartVoice,
  onTypedFallback,
  onCancel,
}: MicrophonePreflightProps) {
  const controller = useMemo(
    () => injectedController ?? createBrowserMicrophonePreflightController(),
    [injectedController],
  )
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    () => INITIAL_MICROPHONE_PREFLIGHT_SNAPSHOT,
  )
  useEffect(() => {
    void controller.refreshDevices()
    // `stop` is intentionally reusable: React development Strict Mode runs an
    // extra setup/cleanup cycle, and the same controller must remain valid.
    // It still releases every track, AudioContext, frame, and device listener.
    return () => controller.stop()
  }, [controller])

  const enableMicrophone = () => { void controller.start(snapshot.selectedDeviceId) }
  const chooseDevice = (deviceId: string) => {
    void controller.selectDevice(deviceId)
  }
  const startVoice = () => {
    const deviceId = snapshot.selectedDeviceId
    controller.stop()
    onStartVoice(deviceId)
  }
  const typedFallback = () => {
    controller.stop()
    onTypedFallback()
  }
  const cancel = () => {
    controller.stop()
    onCancel?.()
  }

  return (
    <section className="ap-micPreflight" aria-labelledby="ap-mic-preflight-title">
      <header>
        <h1 id="ap-mic-preflight-title">Check your microphone</h1>
        <p>Speak normally and make sure the level moves. Audio stays on this device during this check.</p>
      </header>

      <div className="ap-micPreflightMeter">
        <label htmlFor="ap-mic-level">Audio level</label>
        <progress id="ap-mic-level" max={1} value={snapshot.level} />
        <span aria-live="polite">
          {snapshot.phase === 'requesting' ? 'Waiting for microphone permission…'
            : snapshot.phase === 'ready' ? 'Microphone is working.'
              : snapshot.error ?? 'Microphone is off.'}
        </span>
      </div>

      {snapshot.devices.length > 0 && (
        <label className="ap-micPreflightDevice">
          <span>Microphone</span>
          <select value={snapshot.selectedDeviceId} onChange={event => chooseDevice(event.target.value)}>
            {snapshot.devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
            ))}
          </select>
        </label>
      )}

      <p className={`ap-micPreflightProvider is-${provider.status}`} role="status">
        {provider.message}
      </p>

      <div className="ap-micPreflightActions">
        {snapshot.phase !== 'ready' ? (
          <button type="button" onClick={enableMicrophone} disabled={snapshot.phase === 'requesting'}>
            {snapshot.phase === 'requesting' ? 'Enabling microphone…' : 'Enable microphone'}
          </button>
        ) : (
          <button type="button" onClick={startVoice} disabled={!provider.canStart}>Start conversation</button>
        )}
        <button type="button" onClick={typedFallback}>Continue by typing</button>
        {onCancel && <button type="button" onClick={cancel}>Cancel</button>}
      </div>
    </section>
  )
}
