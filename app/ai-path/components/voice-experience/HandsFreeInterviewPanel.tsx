'use client'

import type {
  HandsFreeInterviewState,
  HandsFreeTranscriptTurn,
} from '../../client/hands-free-interview'
import { SignalRibbon, type SignalRibbonState } from './SignalRibbon'

export type HandsFreeInterviewPanelProps = Readonly<{
  state: HandsFreeInterviewState
  transcript: readonly HandsFreeTranscriptTurn[]
  providerAvailable: boolean
  onStart(): void
  onEnd(): void
  onUseTyped(): void
  onConfirmTranscript(): void
  onTranscriptChange(itemId: string, text: string): void
}>

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
}

function MicIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8.5" y="3" width="7" height="11" rx="3.5" /><path d="M5 10.5a7 7 0 0 0 14 0M12 17.5V21M8.5 21h7" /></svg>
}

function signalState(state: HandsFreeInterviewState): SignalRibbonState {
  if (state.phase === 'user-speaking' || state.phase === 'listening') return 'listening'
  if (state.phase === 'analyzing' || state.phase === 'generating-plan') return 'thinking'
  if (state.phase === 'advisor-speaking') return 'speaking'
  if (state.phase === 'failed') return 'error'
  return 'ready'
}

function statusCopy(state: HandsFreeInterviewState) {
  switch (state.phase) {
    case 'ready': return 'Ready when you are'
    case 'advisor-speaking': return 'AI Path is speaking'
    case 'listening': return 'Listening—answer naturally'
    case 'user-speaking': return 'I’m listening'
    case 'analyzing': return 'Understanding your answer'
    case 'reviewing': return 'Review what I heard'
    case 'generating-plan': return 'Creating your plan'
    case 'complete': return 'Your plan is ready'
    case 'failed': return 'The voice session paused safely'
    case 'closed': return 'Conversation ended'
  }
}

export function HandsFreeInterviewPanel({
  state,
  transcript,
  providerAvailable,
  onStart,
  onEnd,
  onUseTyped,
  onConfirmTranscript,
  onTranscriptChange,
}: HandsFreeInterviewPanelProps) {
  const active = !['ready', 'reviewing', 'complete', 'failed', 'closed'].includes(state.phase)
  const progress = Math.max(0, Math.min(100, (state.acceptedAnswerCount / state.coreQuestionCount) * 100))

  return (
    <section className="vx-conversation" aria-labelledby="vx-conversation-title" aria-busy={state.phase === 'analyzing' || state.phase === 'generating-plan'}>
      <div className="vx-conversationTopline">
        <div>
          <p>Hands-free AI Path</p>
          <span>{state.phase === 'reviewing' ? 'Conversation complete' : `Question ${state.coreQuestionNumber} of ${state.coreQuestionCount}`}</span>
        </div>
        {active ? <button type="button" onClick={onEnd} aria-label="End voice conversation"><CloseIcon /> End</button> : null}
      </div>

      <div className="vx-progressTrack" aria-label={`${Math.round(progress)} percent complete`}>
        <i style={{ width: `${progress}%` }} />
      </div>

      {state.phase === 'reviewing' ? (
        <div className="vx-transcriptReview">
          <div>
            <p className="vx-kicker">Before I build your path</p>
            <h2 id="vx-conversation-title">Here’s what I heard</h2>
            <p>Edit anything that was transcribed incorrectly, then continue.</p>
          </div>
          <div className="vx-transcriptTurns">
            {transcript.map((turn, index) => (
              <label key={turn.itemId}>
                <span>{index + 1}. {turn.question}</span>
                <textarea value={turn.answer} rows={3} maxLength={2_000} onChange={event => onTranscriptChange(turn.itemId, event.target.value)} />
              </label>
            ))}
          </div>
          <div className="vx-reviewActions">
            <button type="button" className="vx-secondaryAction" onClick={onUseTyped}>Edit in the form</button>
            <button type="button" className="vx-primaryAction" onClick={onConfirmTranscript}>Create my plan</button>
          </div>
        </div>
      ) : (
        <div className="vx-conversationStage">
          <div className={`vx-voiceOrb is-${signalState(state)}`} aria-hidden="true">
            <span><MicIcon /></span>
            <i /><i /><i />
          </div>
          <div className="vx-conversationStatus" aria-live="polite">
            <strong>{statusCopy(state)}</strong>
            <span>{state.phase === 'listening' ? 'Pause when you’re finished. I’ll take it from there.' : 'You can interrupt at any time.'}</span>
          </div>
          <SignalRibbon state={signalState(state)} compact label={statusCopy(state)} />
          <div className="vx-currentQuestion">
            <p className="vx-kicker">Your advisor asks</p>
            <h2 id="vx-conversation-title">{state.question.prompt}</h2>
          </div>

          {state.phase === 'ready' ? (
            <div className="vx-conversationActions">
              <button type="button" className="vx-primaryAction" onClick={onStart} disabled={!providerAvailable}>
                <MicIcon /> {providerAvailable ? 'Start voice conversation' : 'Voice activation pending'}
              </button>
              {!providerAvailable ? <p role="status">The complete voice experience is prepared, but paid Realtime access remains off until separately approved.</p> : null}
              <button type="button" className="vx-textLink" onClick={onUseTyped}>Continue by typing</button>
            </div>
          ) : null}

          {state.phase === 'failed' ? (
            <div className="vx-conversationActions">
              <p role="alert">Your accepted answers are still here. Continue by typing without starting over.</p>
              <button type="button" className="vx-primaryAction" onClick={onUseTyped}>Continue by typing</button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
