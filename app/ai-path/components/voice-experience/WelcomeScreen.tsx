'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import {
  createBrowserMicrophonePreflightController,
  INITIAL_MICROPHONE_PREFLIGHT_SNAPSHOT,
  type MicrophonePreflightController,
  type MicrophonePreflightPhase,
} from '../../client/microphone-preflight'
import type { VoiceProviderAvailability } from '../../client/voice-provider-availability'
import { SignalRibbon, type SignalRibbonState } from './SignalRibbon'

export type WelcomeScreenProps = Readonly<{
  provider: VoiceProviderAvailability
  controller?: MicrophonePreflightController
  onStartVoice(selectedDeviceId: string): void
  onStartTyped(goal: string): void
}>

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="8.5" y="3" width="7" height="11" rx="3.5" />
      <path d="M5 10.5a7 7 0 0 0 14 0M12 17.5V21M8.5 21h7" />
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M7 14h7M17 14h.01" />
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
  if (phase === 'ready' && level > 0.025) return 'I can hear you. Your microphone is responding.'
  if (phase === 'ready') return 'Microphone enabled. Say a few words to test the level.'
  if (phase === 'unsupported') return 'This browser cannot access a microphone. You can begin by typing.'
  return 'Microphone is off.'
}

export function WelcomeScreen({
  provider,
  controller: injectedController,
  onStartVoice,
  onStartTyped,
}: WelcomeScreenProps) {
  const [typedGoal, setTypedGoal] = useState('')
  const [typedError, setTypedError] = useState('')
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
  const canStartVoice = isReady && provider.canStart

  const enableMicrophone = () => { void controller.start(snapshot.selectedDeviceId) }
  const selectDevice = (deviceId: string) => { void controller.selectDevice(deviceId) }
  const startVoice = () => {
    if (!canStartVoice) return
    controller.stop()
    onStartVoice(snapshot.selectedDeviceId)
  }
  const startTyped = () => {
    const goal = typedGoal.trim()
    if (goal.length < 20) {
      setTypedError('Add a little more detail so the discussion can start with a useful follow-up.')
      return
    }
    controller.stop()
    onStartTyped(goal)
  }

  return (
    <section className="vx-prepare" aria-labelledby="vx-prepare-title">
      <header className="vx-prepareIntro">
        <p className="vx-kicker">AI Path conversation</p>
        <h1 id="vx-prepare-title" tabIndex={-1}>Start your AI learning conversation</h1>
        <p>Use voice or type. In about five minutes, you’ll get a practical project and focused 30-day path.</p>
      </header>

      <div className="vx-modeWorkspace">
        <section className={`vx-modePanel vx-voicePanel is-${state}`} aria-labelledby="vx-voice-title">
          <div className="vx-modeHeading">
            <span className="vx-modeIcon"><MicIcon /></span>
            <div>
              <h2 id="vx-voice-title">Voice discussion</h2>
              <p>Best for thinking aloud</p>
            </div>
            <span className="vx-modeBadge">Local mic check</span>
          </div>

          <p className="vx-modeDescription">Check your microphone locally and watch the signal respond.</p>
          {!provider.canStart ? <p className="vx-liveStatus" role="status">{provider.message}</p> : null}

          <div className="vx-inlineMeter">
            <SignalRibbon state={state} level={snapshot.level} label={`Microphone level. ${status}`} />
            <p aria-live="polite">{status}</p>
          </div>

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

          {!isReady ? (
            <button type="button" className="vx-primaryAction" onClick={enableMicrophone} disabled={isRequesting}>
              {isRequesting ? 'Enabling microphone…' : 'Enable microphone'}
              <MicIcon />
            </button>
          ) : provider.canStart ? (
            <button type="button" className="vx-primaryAction" onClick={startVoice}>
              Start voice discussion
              <ArrowIcon />
            </button>
          ) : (
            <p className="vx-providerNotice" role="status">Microphone check complete. Begin by typing while live discussion is unavailable.</p>
          )}

          <p className="vx-localNote">This check happens on your device. No audio is uploaded.</p>
        </section>

        <div className="vx-mobileOr" aria-hidden="true"><span>or</span></div>

        <section className="vx-modePanel vx-typePanel" aria-labelledby="vx-type-title">
          <div className="vx-modeHeading">
            <span className="vx-modeIcon"><KeyboardIcon /></span>
            <div>
              <h2 id="vx-type-title">Type instead</h2>
              <p>Answer at your own pace</p>
            </div>
            <span className="vx-modeBadge is-available">Available now</span>
          </div>

          <label className="vx-typedPrompt" htmlFor="vx-starting-goal">
            <span>What would you like AI to help you improve?</span>
            <textarea
              id="vx-starting-goal"
              value={typedGoal}
              onChange={event => { setTypedGoal(event.target.value); setTypedError('') }}
              onKeyDown={event => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') startTyped()
              }}
              maxLength={1200}
              rows={5}
              placeholder="For example: I want to turn approved research into a reliable weekly brief."
            />
          </label>

          {typedError ? <p className="vx-typedError" role="alert">{typedError}</p> : null}

          <button type="button" className="vx-primaryAction" onClick={startTyped}>
            Start typed discussion
            <ArrowIcon />
          </button>
          <p className="vx-localNote">You’ll get the same guided questions and can review every answer.</p>
        </section>
      </div>

      <div className="vx-trustRow" aria-label="Privacy and experience notes">
        <span>Private by design</span>
        <span>No audio stored</span>
        <span>Edit before results</span>
      </div>
    </section>
  )
}
