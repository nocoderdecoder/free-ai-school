'use client'

import { useEffect, useMemo, useState } from 'react'

import { AIPathApiError, analyzeReviewedAssessment, createTextSession, deleteOwnedSession } from './client/api'
import {
  INITIAL_VOICE_EXPERIENCE_STATE,
  transitionVoiceExperience,
  type VoiceExperienceEvent,
  type VoiceExperiencePhase,
} from './client/voice-experience-state'
import { VOICE_PROVIDER_UNAVAILABLE } from './client/voice-provider-availability'
import { SignalRibbon } from './components/voice-experience/SignalRibbon'
import { WelcomeScreen } from './components/voice-experience/WelcomeScreen'
import {
  AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS,
  startAdaptiveInterview,
  submitAdaptiveInterviewAnswer,
  type AdaptiveInterviewState,
} from './lib/adaptive-interview'
import type { AssessmentReport, SkillId } from './lib/foundation'
import type { AiPathGoalType } from './lib/goal-type'
import { getPlanBlueprint } from './lib/plan'
import { composePersonalizedPlan } from './lib/plan-composer'

type VisibleStage = 'welcome' | 'conversation' | 'understanding' | 'path'
type SummaryEditor = 'goal' | 'experience' | 'constraints' | null

const GOAL_TYPE: AiPathGoalType = 'workflows'
const DEFAULT_ROLE = 'Working professional'
const DEFAULT_HOURS = '3'
const DEFAULT_CODING_COMFORT = 'Some, but I prefer no-code first'
const GOAL_DISCOVERY_PROMPT = 'What is one part of your work you wish AI could make faster, more reliable, or easier to review?'

const stageLabels: Record<VisibleStage, string> = {
  welcome: 'Welcome',
  conversation: 'Conversation',
  understanding: 'Review',
  path: 'Your path',
}

const skillNames: Record<SkillId, string> = {
  foundations: 'AI foundations',
  'prompt-context': 'Prompt and context design',
  'workflow-design': 'Workflow design',
  'data-retrieval': 'Data and retrieval',
  'coding-apis': 'Coding and API integration',
  'agents-tools': 'Agents and tool use',
  'evaluation-reliability': 'Evaluation and reliability',
  'deployment-operations': 'Deployment and operations',
  'safety-governance': 'Safety and governance',
}

const hoursLabels: Record<string, string> = {
  '1': 'About 1 hour',
  '3': '2–3 hours',
  '5': '4–6 hours',
  '7': '7+ hours',
}

function visibleStage(phase: VoiceExperiencePhase): VisibleStage {
  if (phase === 'welcome') return 'welcome'
  if (phase === 'sound-check' || phase === 'permission-denied' || phase === 'service-unavailable') return 'welcome'
  if (phase === 'understanding-review' || phase === 'generating') return 'understanding'
  if (phase === 'path') return 'path'
  return 'conversation'
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

function CheckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
}

function PathMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 17c4-8 7-3 10-9 1.5-3 3.4-3.2 6-1" />
      <circle cx="4" cy="17" r="2" />
      <circle cx="20" cy="6" r="2" />
    </svg>
  )
}

function PrimaryButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="ap-primary" onClick={onClick} disabled={disabled}>{children}<ArrowIcon /></button>
}

function AppHeader({ stage, onRestart }: { stage: VisibleStage; onRestart: () => void }) {
  const orderedStages: VisibleStage[] = ['conversation', 'understanding', 'path']
  const step = Math.max(0, orderedStages.indexOf(stage))
  return (
    <header className="ap-header">
      <button type="button" className="ap-brand" onClick={onRestart} aria-label="AI Path home">
        <span><PathMark /></span>
        <strong>AI Path</strong>
      </button>
      {stage === 'welcome' ? (
        <span className="ap-previewBadge">Private preview</span>
      ) : (
        <div className="ap-journeyProgress" aria-label={`${stageLabels[stage]}, step ${step + 1} of 3`}>
          <span>{stageLabels[stage]}</span>
          <i aria-hidden="true">{orderedStages.map((item, index) => <b className={index <= step ? 'is-active' : ''} key={item} />)}</i>
        </div>
      )}
    </header>
  )
}

function SummaryRow({
  number,
  title,
  summary,
  editing,
  onEdit,
  children,
}: {
  number: number
  title: string
  summary: string
  editing: boolean
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <article className="ap-summaryRow" data-testid="confirmation-part">
      <div className="ap-summaryNumber" aria-hidden="true">{number}</div>
      <div className="ap-summaryBody">
        <h2>{title}</h2>
        {editing ? children : <p>{summary}</p>}
      </div>
      <button type="button" className="ap-editSummary" onClick={onEdit}>{editing ? 'Done' : 'Edit'}<span className="sr-only"> {title}</span></button>
    </article>
  )
}

export function AdvisorApp() {
  const [voiceJourney, setVoiceJourney] = useState(INITIAL_VOICE_EXPERIENCE_STATE)
  const [goal, setGoal] = useState('')
  const [interview, setInterview] = useState<AdaptiveInterviewState | null>(null)
  const [answer, setAnswer] = useState('')
  const [role, setRole] = useState('')
  const [experience, setExperience] = useState('')
  const [constraint, setConstraint] = useState('')
  const [weeklyHours, setWeeklyHours] = useState(DEFAULT_HOURS)
  const [codingComfort, setCodingComfort] = useState(DEFAULT_CODING_COMFORT)
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, string>>({})
  const [editingSummary, setEditingSummary] = useState<SummaryEditor>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionOwned, setSessionOwned] = useState(false)
  const [analysisState, setAnalysisState] = useState<'idle' | 'running' | 'error' | 'ready'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [firstMoveOpen, setFirstMoveOpen] = useState(false)

  const stage = visibleStage(voiceJourney.phase)
  const currentQuestion = interview?.currentQuestion ?? null
  const currentPrompt = interview ? currentQuestion?.prompt : GOAL_DISCOVERY_PROMPT
  const completedTurns = (goal ? 1 : 0) + (interview?.turns.length ?? 0)
  const estimatedMinutes = Math.max(1, 5 - Math.floor((interview?.turns.length ?? 0) / 2))
  const conversationProgress = Math.min(100, Math.round((completedTurns / (AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS + 1)) * 100))
  const lastTurn = interview?.turns.at(-1) ?? null

  const plan = useMemo(() => {
    if (!report) return getPlanBlueprint(GOAL_TYPE)
    return composePersonalizedPlan({
      goalType: GOAL_TYPE,
      weeklyHours: Number(weeklyHours) || 1,
      codingComfort,
      role: role.trim() || DEFAULT_ROLE,
      blocker: constraint.trim(),
      results: report.results,
      growthAreas: report.growthAreas,
      recommendations: report.recommendations,
    }) ?? getPlanBlueprint(GOAL_TYPE)
  }, [codingComfort, constraint, report, role, weeklyHours])

  const resources = (report?.recommendations ?? []).slice(0, 3)
  const prioritySkills = report?.growthAreas.slice(0, 2).map(skillId => skillNames[skillId]) ?? []
  const planReasons = 'reasons' in plan ? plan.reasons.slice(0, 4) : []
  const constraintSummary = [
    `${hoursLabels[weeklyHours] ?? weeklyHours} each week`,
    codingComfort,
    constraint.trim(),
  ].filter(Boolean).join(' · ')

  const sendVoiceEvent = (event: VoiceExperienceEvent) => {
    setVoiceJourney(current => transitionVoiceExperience(current, event).state)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.ap-main h1')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [stage, currentQuestion?.id])

  const startInterviewFromGoal = (rawGoal: string) => {
    const trimmed = rawGoal.trim()
    if (trimmed.length < 20) {
      setErrorMessage('Share a little more about the task so I can ask a useful follow-up.')
      return false
    }
    const started = startAdaptiveInterview({
      goalType: GOAL_TYPE,
      goal: trimmed,
      weeklyMinutes: Number(DEFAULT_HOURS) * 60,
    })
    if (!started.ok) {
      setErrorMessage('I could not start from that answer. Please make the task a little more specific.')
      return false
    }
    setGoal(trimmed)
    setInterview(started.state)
    setAnswer('')
    setErrorMessage('')
    return true
  }

  const beginTypedConversation = (initialGoal?: string) => {
    if (voiceJourney.phase === 'welcome') sendVoiceEvent({ type: 'BEGIN_TYPED' })
    else sendVoiceEvent({ type: 'USE_TYPED_FALLBACK' })
    setAnswer('')
    setErrorMessage('')
    if (initialGoal) startInterviewFromGoal(initialGoal)
  }

  const submitConversationAnswer = () => {
    const trimmed = answer.trim()
    if (!trimmed) return

    if (!interview) {
      startInterviewFromGoal(trimmed)
      return
    }

    if (!currentQuestion) return
    const submitted = submitAdaptiveInterviewAnswer(interview, trimmed)
    if (!submitted.ok) {
      setErrorMessage('That answer could not be added. Please shorten it and try again.')
      return
    }
    setInterview(submitted.state)
    setAnswer('')
    setErrorMessage('')
  }

  const openUnderstanding = () => {
    if (!interview?.turns.length) return
    const [firstTurn, ...otherTurns] = interview.turns
    setExperience(firstTurn.answer)
    setReviewAnswers(Object.fromEntries(otherTurns.map(turn => [turn.id, turn.answer])))
    const statedConstraint = [...interview.turns]
      .reverse()
      .find(turn => turn.dimensionsProbed.includes('constraint_time'))?.answer
    if (statedConstraint) setConstraint(statedConstraint)
    setEditingSummary(null)
    setErrorMessage('')
    sendVoiceEvent({ type: 'TYPED_INTERVIEW_COMPLETE' })
  }

  const continueConversation = () => {
    sendVoiceEvent({ type: 'CONTINUE_CONVERSATION' })
    setErrorMessage('')
  }

  const buildPath = async () => {
    const reviewedInputs = [
      { id: 'goal', value: goal.trim(), source: 'typed-response' as const },
      { id: 'experience', value: experience.trim(), source: 'typed-response' as const },
      ...(role.trim() ? [{ id: 'role', value: role.trim(), source: 'typed-response' as const }] : []),
      ...(constraint.trim() ? [{ id: 'constraint', value: constraint.trim(), source: 'typed-response' as const }] : []),
      ...Object.entries(reviewAnswers)
        .filter(([, value]) => value.trim())
        .map(([id, value]) => ({ id, value: value.trim(), source: 'typed-response' as const })),
    ]
    if (goal.trim().length < 20 || experience.trim().length === 0) {
      setErrorMessage('Confirm what you want to improve and where things stand today before creating your path.')
      return
    }

    sendVoiceEvent({ type: 'CONFIRM_UNDERSTANDING' })
    setAnalysisState('running')
    setErrorMessage('')
    try {
      const sessionResult = await createTextSession({
        goal: goal.trim(),
        goalType: GOAL_TYPE,
        targetRole: role.trim() || DEFAULT_ROLE,
      })
      const assessment = await analyzeReviewedAssessment({
        assessmentSessionId: sessionResult.session.id,
        goal: goal.trim(),
        goalType: GOAL_TYPE,
        weeklyHours: Number(weeklyHours) || 1,
        codingComfort,
        reviewedInputs,
      })
      setSessionId(sessionResult.session.id)
      setSessionOwned(sessionResult.owned)
      setReport(assessment)
      setAnalysisState('ready')
      sendVoiceEvent({ type: 'PATH_READY' })
    } catch (error) {
      setAnalysisState('error')
      setErrorMessage(error instanceof AIPathApiError ? error.message : 'Your path could not be built. Your answers are still here—please try again.')
      sendVoiceEvent({ type: 'PATH_FAILED' })
    }
  }

  const restart = async () => {
    if (sessionOwned && sessionId) {
      try {
        await deleteOwnedSession(sessionId)
      } catch {
        // The local experience can restart even when remote deletion is unavailable.
      }
    }
    setVoiceJourney(INITIAL_VOICE_EXPERIENCE_STATE)
    setGoal('')
    setInterview(null)
    setAnswer('')
    setRole('')
    setExperience('')
    setConstraint('')
    setWeeklyHours(DEFAULT_HOURS)
    setCodingComfort(DEFAULT_CODING_COMFORT)
    setReviewAnswers({})
    setEditingSummary(null)
    setSessionId(null)
    setSessionOwned(false)
    setAnalysisState('idle')
    setErrorMessage('')
    setReport(null)
    setFirstMoveOpen(false)
  }

  return (
    <div className="ap-shell">
      <AppHeader stage={stage} onRestart={() => { void restart() }} />

      <main className="ap-main">
        {stage === 'welcome' && (
          <WelcomeScreen
            provider={VOICE_PROVIDER_UNAVAILABLE}
            onStartVoice={() => {
              setVoiceJourney(current => {
                const begun = transitionVoiceExperience(current, { type: 'BEGIN_VOICE' })
                return transitionVoiceExperience(begun.state, { type: 'MICROPHONE_READY' }).state
              })
            }}
            onStartTyped={beginTypedConversation}
          />
        )}

        {stage === 'conversation' && (
          <section className="ap-conversation" aria-labelledby="ap-question-title">
            <div className="ap-conversationTopline">
              <span>About {estimatedMinutes} {estimatedMinutes === 1 ? 'minute' : 'minutes'} left</span>
              <div className="ap-progress" aria-label={`${conversationProgress}% of conversation complete`}><span style={{ width: `${conversationProgress}%` }} /></div>
              {(interview?.turns.length ?? 0) >= 5 && currentQuestion ? <button type="button" onClick={openUnderstanding}>End and review</button> : null}
            </div>

            <p className="ap-voiceState"><span /> Guided typing</p>
            <h1 id="ap-question-title" tabIndex={-1}>{currentPrompt ?? 'I have enough to suggest a useful path.'}</h1>
            <SignalRibbon state={currentPrompt ? 'ready' : 'thinking'} level={0.24} label="Conversation signal" />

            {currentPrompt ? (
              <>
                <p className="ap-conversationHint">Use a real example if you can. “I haven’t tried this yet” is useful too.</p>
                {lastTurn ? (
                  <div className="ap-recentCaption" aria-label="Most recent exchange">
                    <span>You said</span>
                    <p>{lastTurn.answer}</p>
                  </div>
                ) : null}
                <div className="ap-composer">
                  <label htmlFor="ap-answer">Your answer</label>
                  <textarea
                    id="ap-answer"
                    value={answer}
                    onChange={event => { setAnswer(event.target.value); setErrorMessage('') }}
                    maxLength={2000}
                    rows={4}
                    placeholder="Type naturally…"
                    onKeyDown={event => {
                      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitConversationAnswer()
                    }}
                  />
                  <div>
                    <span>⌘ Enter to continue</span>
                    <PrimaryButton onClick={submitConversationAnswer} disabled={!answer.trim()}>Continue</PrimaryButton>
                  </div>
                  {errorMessage && <p className="ap-error" role="alert">{errorMessage}</p>}
                </div>
              </>
            ) : (
              <div className="ap-conversationComplete">
                <p>I have enough to create a focused recommendation. Check my understanding before it shapes your path.</p>
                <PrimaryButton onClick={openUnderstanding}>Review what I heard</PrimaryButton>
              </div>
            )}

            {(interview?.turns.length ?? 0) > 0 && (
              <details className="ap-transcript">
                <summary>Show conversation so far</summary>
                <ol>
                  <li><span>{GOAL_DISCOVERY_PROMPT}</span><p>{goal}</p></li>
                  {interview?.turns.map(turn => <li key={turn.id}><span>{turn.question}</span><p>{turn.answer}</p></li>)}
                </ol>
              </details>
            )}
          </section>
        )}

        {stage === 'understanding' && (
          <section className="ap-understanding" aria-labelledby="ap-understanding-title">
            <button type="button" className="ap-back" onClick={continueConversation}>← Continue the conversation</button>
            <p className="ap-eyebrow">One quick check</p>
            <h1 id="ap-understanding-title" tabIndex={-1}>Did I understand you correctly?</h1>
            <p className="ap-lead">Edit anything that does not sound like you.</p>

            <div className="ap-summaryList">
              <SummaryRow
                number={1}
                title="What you want to improve"
                summary={goal}
                editing={editingSummary === 'goal'}
                onEdit={() => setEditingSummary(current => current === 'goal' ? null : 'goal')}
              >
                <label htmlFor="ap-review-goal">Your goal</label>
                <textarea id="ap-review-goal" value={goal} onChange={event => setGoal(event.target.value)} maxLength={1200} rows={3} />
              </SummaryRow>

              <SummaryRow
                number={2}
                title="Where things stand today"
                summary={experience}
                editing={editingSummary === 'experience'}
                onEdit={() => setEditingSummary(current => current === 'experience' ? null : 'experience')}
              >
                <label htmlFor="ap-review-experience">Your current approach</label>
                <textarea id="ap-review-experience" value={experience} onChange={event => setExperience(event.target.value)} maxLength={2000} rows={4} />
              </SummaryRow>

              <SummaryRow
                number={3}
                title="What the plan needs to respect"
                summary={constraintSummary}
                editing={editingSummary === 'constraints'}
                onEdit={() => setEditingSummary(current => current === 'constraints' ? null : 'constraints')}
              >
                <div className="ap-inlineFields">
                  <label htmlFor="ap-role"><span>Role or area of work</span><input id="ap-role" value={role} onChange={event => setRole(event.target.value)} maxLength={160} placeholder="Optional" /></label>
                  <label htmlFor="ap-weekly-hours"><span>Time available each week</span><select id="ap-weekly-hours" value={weeklyHours} onChange={event => setWeeklyHours(event.target.value)}><option value="1">About 1 hour</option><option value="3">2–3 hours</option><option value="5">4–6 hours</option><option value="7">7+ hours</option></select></label>
                  <label htmlFor="ap-coding-comfort"><span>Coding comfort</span><select id="ap-coding-comfort" value={codingComfort} onChange={event => setCodingComfort(event.target.value)}><option>No coding yet</option><option>Some, but I prefer no-code first</option><option>Comfortable building with APIs</option><option>Professional software engineer</option></select></label>
                  <label className="ap-wideField" htmlFor="ap-constraint"><span>Main constraint</span><textarea id="ap-constraint" value={constraint} onChange={event => setConstraint(event.target.value)} maxLength={600} rows={3} placeholder="Time, access, confidence, or another practical limit" /></label>
                </div>
              </SummaryRow>
            </div>

            {interview && interview.turns.length > 1 && (
              <details className="ap-reviewDetails">
                <summary>Review conversation details</summary>
                <div>
                  {interview.turns.slice(1).map(turn => (
                    <label key={turn.id}>
                      <span>{turn.question}</span>
                      <textarea value={reviewAnswers[turn.id] ?? turn.answer} onChange={event => setReviewAnswers(values => ({ ...values, [turn.id]: event.target.value }))} maxLength={2000} rows={3} />
                    </label>
                  ))}
                </div>
              </details>
            )}

            <div className="ap-understandingAction">
              {analysisState === 'running' ? (
                <div className="ap-generating" role="status">
                  <SignalRibbon state="thinking" compact />
                  <div><strong>Turning your answers into a focused path…</strong><span>Shaping a useful project and selecting only the learning support you need.</span></div>
                </div>
              ) : (
                <PrimaryButton onClick={() => { void buildPath() }} disabled={goal.trim().length < 20 || experience.trim().length === 0}>Create my path</PrimaryButton>
              )}
              <p>Only the answers you confirm here shape the recommendation.</p>
              {errorMessage && <p className="ap-error" role="alert">{errorMessage}</p>}
            </div>
          </section>
        )}

        {stage === 'path' && report && (
          <section className="ap-path" aria-labelledby="ap-path-title">
            <div className="ap-pathIntro">
              <p className="ap-eyebrow">Your recommendation is ready</p>
              <h1 id="ap-path-title" tabIndex={-1}>Your 30-day build</h1>
              <p>Over the next month, build one useful workflow around your real work—not a generic exercise.</p>
            </div>

            <section className="ap-buildProject" aria-labelledby="ap-build-project-title">
              <span>Your 30-day project</span>
              <h2 id="ap-build-project-title">{plan.proof}</h2>
              <p>{Number(weeklyHours) === 1 ? 'Designed for one focused hour each week.' : `Designed for ${hoursLabels[weeklyHours]?.toLowerCase() ?? `${weeklyHours} hours`} each week.`}</p>
            </section>

            <div className="ap-focusStrip">
              <span>Your next skill</span>
              <strong>{prioritySkills[0] ?? 'Workflow design and evaluation'}</strong>
              <p>{plan.focusNow}</p>
            </div>

            <section className="ap-firstMove" aria-labelledby="ap-first-move-title">
              <div>
                <span>Your first 30 minutes</span>
                <h2 id="ap-first-move-title">{plan.firstTask}</h2>
                <p>Finish with something you can inspect—not more preparation.</p>
              </div>
              <button type="button" className="ap-firstMoveButton" onClick={() => setFirstMoveOpen(open => !open)} aria-expanded={firstMoveOpen}>
                {firstMoveOpen ? 'Hide starting steps' : 'Show me how to start'} <ArrowIcon />
              </button>
              {firstMoveOpen ? (
                <div className="ap-firstMoveSteps">
                  <ol>{plan.weeks[0]?.tasks.map(task => <li key={task}>{task}</li>)}</ol>
                  <p>Stop when the first inspectable version exists. You can improve it next week.</p>
                </div>
              ) : null}
            </section>

            <section className="ap-monthPath" aria-labelledby="ap-month-path-title">
              <p className="ap-eyebrow">Your month at a glance</p>
              <h2 id="ap-month-path-title">One signal path from idea to proof</h2>
              <div className="ap-timeline">
                {plan.weeks.map((week, index) => (
                  <article key={week.week}>
                    <span>{index + 1}</span>
                    <small>{week.week}</small>
                    <h3>{week.theme}</h3>
                    <p>{week.outcome}</p>
                  </article>
                ))}
              </div>
            </section>

            {resources.length > 0 && (
              <section className="ap-resources" aria-labelledby="ap-resources-title">
                <div className="ap-sectionHeading"><p className="ap-eyebrow">Learning support for this build</p><h2 id="ap-resources-title">Only what helps you move the project forward</h2></div>
                <div className="ap-resourceList">
                  {resources.map(resource => (
                    <article key={resource.id} data-testid="learning-resource">
                      <div><span>{resource.format}</span><small>{resource.estimatedHours} hours · {resource.free ? 'Free' : resource.costDisclosure}</small></div>
                      <h3>{resource.title}</h3>
                      <p>{resource.reason}</p>
                      {resource.canonicalUrl ? <a href={resource.canonicalUrl} target="_blank" rel="noreferrer">Open resource <span aria-hidden="true">↗</span></a> : <span className="ap-included">Included in your build plan</span>}
                    </article>
                  ))}
                </div>
              </section>
            )}

            <div className="ap-pathDetails">
              <details>
                <summary>See the full four-week plan</summary>
                <div className="ap-weekGrid">
                  {plan.weeks.map(week => (
                    <article key={week.week}>
                      <span>{week.week}</span>
                      <h3>{week.theme}</h3>
                      <p>{week.outcome}</p>
                      <ul>{week.tasks.map(task => <li key={task}>{task}</li>)}</ul>
                    </article>
                  ))}
                </div>
              </details>

              <details>
                <summary>Why this fits you</summary>
                <div className="ap-whyList">
                  {planReasons.map(reason => <p key={reason.id}><CheckIcon /> {reason.detail}</p>)}
                  <p><CheckIcon /> Advanced agent frameworks can wait until this workflow is reliable.</p>
                </div>
              </details>

              <details>
                <summary>Privacy and data</summary>
                <div className="ap-privacyBody">
                  <p>This report was built from the typed answers you confirmed. The sound check stayed on your device, and no live voice model was contacted.</p>
                  <button type="button" className="ap-textButton" onClick={() => { void restart() }}>Delete this session and start over</button>
                </div>
              </details>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
