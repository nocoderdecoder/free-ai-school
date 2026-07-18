'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'

import {
  createBrowserMicrophonePreflightController,
  INITIAL_MICROPHONE_PREFLIGHT_SNAPSHOT,
  type MicrophonePreflightController,
  type MicrophonePreflightPhase,
} from '../../client/microphone-preflight'
import type { VoiceProviderAvailability } from '../../client/voice-provider-availability'
import { SignalRibbon, type SignalRibbonState } from './SignalRibbon'

export type SoundCheckScreenProps = Readonly<{
  provider: VoiceProviderAvailability
  controller?: MicrophonePreflightController
  onStartVoice(selectedDeviceId: string): void
  onTypedFallback(): void
  onBack?(): void
}>

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="8.5" y="3" width="7" height="11" rx="3.5" />
      <path d="M5 10.5a7 7 0 0 0 14 0M12 17.5V21M8.5 21h7" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h13M13 7l5 5-5 5" />
    </svg>
  )
}

function signalState(phase: MicrophonePreflightPhase, level: number): SignalRibbonState {
  if (phase === 'requesting') return 'requesting'
  if (phase === 'ready') return level > 0.025 ? 'listening' : 'ready'
  if (phase === 'permission-denied' || phase === 'device-unavailable' || phase === 'unsupported' || phase === 'failed') return 'error'
  return 'idle'
}

function microphoneStatus(phase: MicrophonePreflightPhase, level: number, error: string | null) {
  if (error) return error
  if (phase === 'requesting') return 'Waiting for microphone permission…'
  if (phase === 'ready' && level > 0.025) return 'Sounds clear. Your microphone is responding.'
  if (phase === 'ready') return 'Say a few words at your normal speaking volume.'
  if (phase === 'unsupported') return 'This browser cannot access a microphone. You can continue by typing.'
  return 'Your microphone is off.'
}

export function SoundCheckScreen({
  provider,
  controller: injectedController,
  onStartVoice,
  onTypedFallback,
  onBack,
}: SoundCheckScreenProps) {
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
    return () => controller.stop()
  }, [controller])

  const state = signalState(snapshot.phase, snapshot.level)
  const status = microphoneStatus(snapshot.phase, snapshot.level, snapshot.error)
  const isRequesting = snapshot.phase === 'requesting'
  const isReady = snapshot.phase === 'ready'
  const canStart = isReady && provider.canStart

  const enableMicrophone = () => { void controller.start(snapshot.selectedDeviceId) }
  const selectDevice = (deviceId: string) => { void controller.selectDevice(deviceId) }
  const startVoice = () => {
    if (!canStart) return
    const deviceId = snapshot.selectedDeviceId
    controller.stop()
    onStartVoice(deviceId)
  }
  const useTyping = () => {
    controller.stop()
    onTypedFallback()
  }
  const goBack = () => {
    controller.stop()
    onBack?.()
  }

  return (
    <section className="vx-soundCheck" aria-labelledby="vx-sound-check-title">
      {onBack ? (
        <button type="button" className="vx-backAction" onClick={goBack}>
          <span aria-hidden="true">←</span> Back
        </button>
      ) : null}

      <header className="vx-soundCheckHeader">
        <p className="vx-kicker">A quick sound check</p>
        <h1 id="vx-sound-check-title" tabIndex={-1}>Let’s make sure I can hear you.</h1>
        <p>Speak normally and watch the signal respond. Audio stays on this device during this check.</p>
      </header>

      <div className={`vx-soundConsole is-${state}`}>
        <div className="vx-soundConsoleTopline">
          <span className="vx-localBadge">Local check</span>
          <span>No audio is uploaded</span>
        </div>

        <div className="vx-microphoneMark" aria-hidden="true">
          <span><MicIcon /></span>
        </div>

        <SignalRibbon
          state={state}
          level={snapshot.level}
          label={`Microphone level. ${status}`}
        />

        <p className="vx-microphoneStatus" aria-live="polite">{status}</p>

        {snapshot.devices.length > 0 ? (
          <label className="vx-devicePicker" htmlFor="vx-microphone-device">
            <span>Microphone</span>
            <select
              id="vx-microphone-device"
              value={snapshot.selectedDeviceId}
              onChange={event => selectDevice(event.target.value)}
            >
              {snapshot.devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="vx-soundCheckActions">
          {!isReady ? (
            <button type="button" className="vx-primaryAction" onClick={enableMicrophone} disabled={isRequesting}>
              {isRequesting ? 'Turning on microphone…' : 'Turn on microphone'}
              <MicIcon />
            </button>
          ) : (
            <button type="button" className="vx-primaryAction" onClick={startVoice} disabled={!canStart}>
              Start conversation
              <ArrowIcon />
            </button>
          )}
          <button type="button" className="vx-quietAction" onClick={useTyping}>Continue by typing</button>
        </div>

        {!provider.canStart ? (
          <p className="vx-providerNotice" role="status">{provider.message}</p>
        ) : null}
      </div>
    </section>
  )
}
