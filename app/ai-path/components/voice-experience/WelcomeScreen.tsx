'use client'

import { SignalRibbon } from './SignalRibbon'

export type WelcomeScreenProps = Readonly<{
  voiceAvailable?: boolean
  onTalk(): void
  onType(): void
  availabilityMessage?: string
}>

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h13M13 7l5 5-5 5" />
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

export function WelcomeScreen({
  voiceAvailable = true,
  onTalk,
  onType,
  availabilityMessage,
}: WelcomeScreenProps) {
  return (
    <section className="vx-welcome" aria-labelledby="vx-welcome-title">
      <div className="vx-welcomeCopy">
        <p className="vx-kicker">A guided work session</p>
        <h1 id="vx-welcome-title" tabIndex={-1}>Build a better way to work with AI.</h1>
        <p className="vx-intro">
          Talk through one real task. In about five minutes, you’ll get a practical project,
          a first step, and a focused learning path.
        </p>

        <div className="vx-welcomeActions">
          {voiceAvailable ? (
            <button type="button" className="vx-primaryAction" onClick={onTalk}>
              Talk it through
              <ArrowIcon />
            </button>
          ) : (
            <button type="button" className="vx-primaryAction" onClick={onType}>
              Start guided conversation
              <ArrowIcon />
            </button>
          )}
          {voiceAvailable ? (
            <button type="button" className="vx-quietAction" onClick={onType}>
              <KeyboardIcon />
              I’d rather type
            </button>
          ) : (
            <button type="button" className="vx-quietAction" onClick={onTalk}>
              Preview microphone setup
            </button>
          )}
        </div>

        <p className="vx-trustNote">
          {voiceAvailable
            ? 'Your microphone starts only after you allow it. Audio is not saved during the sound check.'
            : availabilityMessage ?? 'Live voice is unavailable right now. The complete guided conversation is still available by typing.'}
        </p>
      </div>

      <div className="vx-welcomeSignal" aria-hidden="true">
        <span>Goal</span>
        <SignalRibbon state={voiceAvailable ? 'ready' : 'idle'} level={voiceAvailable ? 0.32 : 0} />
        <span>Path</span>
      </div>
    </section>
  )
}
