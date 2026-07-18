'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { AIPathApiError, analyzeReviewedAssessment, createTextSession, deleteOwnedSession } from './client/api'
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

type Stage = 'start' | 'conversation' | 'confirm' | 'path'

const GOAL_TYPE: AiPathGoalType = 'workflows'
const DEFAULT_ROLE = 'Working professional'
const DEFAULT_HOURS = '3'
const DEFAULT_CODING_COMFORT = 'Some, but I prefer no-code first'

const stageLabels: Record<Stage, string> = {
  start: 'Start',
  conversation: 'Conversation',
  confirm: 'Confirm',
  path: 'Path',
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

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

function MicIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" /></svg>
}

function CheckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
}

function SparkIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Zm6 13 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" /></svg>
}

function PrimaryButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="ap-primary" onClick={onClick} disabled={disabled}>{children}<ArrowIcon /></button>
}

function AppHeader({ stage, onRestart }: { stage: Stage; onRestart: () => void }) {
  const step = (['start', 'conversation', 'confirm', 'path'] as Stage[]).indexOf(stage) + 1
  return (
    <header className="ap-header">
      <button type="button" className="ap-brand" onClick={onRestart} aria-label="AI Path home">
        <span><SparkIcon /></span>
        <strong>AI Path</strong>
      </button>
      <p aria-label={`${stageLabels[stage]}, step ${step} of 4`}><span>{stageLabels[stage]}</span> {step} of 4</p>
    </header>
  )
}

export function AdvisorApp() {
  const [stage, setStage] = useState<Stage>('start')
  const [goal, setGoal] = useState('')
  const [interview, setInterview] = useState<AdaptiveInterviewState | null>(null)
  const [answer, setAnswer] = useState('')
  const [role, setRole] = useState('')
  const [experience, setExperience] = useState('')
  const [constraint, setConstraint] = useState('')
  const [weeklyHours, setWeeklyHours] = useState(DEFAULT_HOURS)
  const [codingComfort, setCodingComfort] = useState(DEFAULT_CODING_COMFORT)
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, string>>({})
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionOwned, setSessionOwned] = useState(false)
  const [analysisState, setAnalysisState] = useState<'idle' | 'running' | 'error' | 'ready'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [firstTaskState, setFirstTaskState] = useState<'not-started' | 'started' | 'complete'>('not-started')
  const headingRef = useRef<HTMLHeadingElement>(null)

  const currentQuestion = interview?.currentQuestion ?? null
  const questionNumber = Math.min((interview?.turns.length ?? 0) + 1, AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS)
  const questionProgress = Math.round(((interview?.turns.length ?? 0) / AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS) * 100)

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

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [stage])

  const startConversation = () => {
    const trimmedGoal = goal.trim()
    if (trimmedGoal.length < 20) return
    const started = startAdaptiveInterview({
      goalType: GOAL_TYPE,
      goal: trimmedGoal,
      weeklyMinutes: Number(DEFAULT_HOURS) * 60,
    })
    if (!started.ok) {
      setErrorMessage('Please make your goal a little more specific, then try again.')
      return
    }
    setGoal(trimmedGoal)
    setInterview(started.state)
    setAnswer('')
    setErrorMessage('')
    setStage('conversation')
  }

  const submitAnswer = () => {
    const trimmed = answer.trim()
    if (!interview?.currentQuestion || !trimmed) return
    const submitted = submitAdaptiveInterviewAnswer(interview, trimmed)
    if (!submitted.ok) {
      setErrorMessage('That answer could not be added. Please shorten it and try again.')
      return
    }
    setInterview(submitted.state)
    setAnswer('')
    setErrorMessage('')
  }

  const openConfirmation = () => {
    if (!interview?.turns.length) return
    const [firstTurn, ...otherTurns] = interview.turns
    setExperience(firstTurn.answer)
    setReviewAnswers(Object.fromEntries(otherTurns.map(turn => [turn.id, turn.answer])))
    const statedConstraint = [...interview.turns]
      .reverse()
      .find(turn => turn.dimensionsProbed.includes('constraint_time'))?.answer
    if (statedConstraint) setConstraint(statedConstraint)
    setErrorMessage('')
    setStage('confirm')
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
      setErrorMessage('Confirm your goal and what you have tried before building your path.')
      return
    }

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
      setStage('path')
    } catch (error) {
      setAnalysisState('error')
      setErrorMessage(error instanceof AIPathApiError ? error.message : 'Your path could not be built. Your answers are still here—please try again.')
    }
  }

  const restart = async () => {
    if (sessionOwned && sessionId) {
      try {
        await deleteOwnedSession(sessionId)
      } catch {
        // Restarting the local experience should remain available if remote deletion is unavailable.
      }
    }
    setStage('start')
    setGoal('')
    setInterview(null)
    setAnswer('')
    setRole('')
    setExperience('')
    setConstraint('')
    setWeeklyHours(DEFAULT_HOURS)
    setCodingComfort(DEFAULT_CODING_COMFORT)
    setReviewAnswers({})
    setSessionId(null)
    setSessionOwned(false)
    setAnalysisState('idle')
    setErrorMessage('')
    setReport(null)
    setFirstTaskState('not-started')
  }

  return (
    <div className="ap-shell">
      <AppHeader stage={stage} onRestart={() => { void restart() }} />

      <main className="ap-main">
        {stage === 'start' && (
          <section className="ap-start" aria-labelledby="ap-start-title">
            <div className="ap-startIcon"><SparkIcon /></div>
            <p className="ap-eyebrow">A short, practical conversation</p>
            <h1 id="ap-start-title" ref={headingRef} tabIndex={-1}>What would you like AI to help you do better?</h1>
            <p className="ap-lead">Tell us about one real task. We’ll ask a few useful questions, then suggest a skill, a project and a focused 30-day path.</p>

            <div className="ap-startCard">
              <label htmlFor="ap-goal">Your goal</label>
              <textarea
                id="ap-goal"
                value={goal}
                onChange={event => { setGoal(event.target.value); setErrorMessage('') }}
                maxLength={1200}
                rows={4}
                placeholder="For example: I want to turn approved research into a reliable weekly brief."
              />
              <small>Use a real, non-sensitive example. A sentence or two is enough.</small>

              <PrimaryButton onClick={startConversation} disabled={goal.trim().length < 20}>Start typed conversation</PrimaryButton>
              <p className="ap-consentNote">By continuing, you agree that the answers you confirm can be sent to this app to build your path.</p>
              <button type="button" className="ap-voiceUnavailable" disabled><MicIcon /> Voice conversation coming soon</button>
              {errorMessage && <p className="ap-error" role="alert">{errorMessage}</p>}
            </div>

            <details className="ap-quietDetails">
              <summary>Privacy and data</summary>
              <p>Your typed answers are sent to the app server only when needed to create the assessment. This version does not record audio or contact a live voice model. Avoid confidential information.</p>
            </details>
          </section>
        )}

        {stage === 'conversation' && (
          <section className="ap-conversation" aria-labelledby="ap-question-title">
            <div className="ap-conversationMeta">
              <span>Question {questionNumber} of up to {AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS}</span>
              <div className="ap-progress" aria-hidden="true"><span style={{ width: `${questionProgress}%` }} /></div>
            </div>

            <div className="ap-agentOrb" aria-hidden="true"><span /><i /><b /></div>

            {currentQuestion ? (
              <>
                <h1 id="ap-question-title" ref={headingRef} tabIndex={-1}>{currentQuestion.prompt}</h1>
                <p className="ap-conversationHint">A concrete example is more useful than a polished answer. “I haven’t tried this yet” is also valid.</p>
                <div className="ap-answerCard">
                  <label htmlFor="ap-answer">Your answer</label>
                  <textarea
                    id="ap-answer"
                    value={answer}
                    onChange={event => { setAnswer(event.target.value); setErrorMessage('') }}
                    maxLength={2000}
                    rows={5}
                    placeholder="Type naturally…"
                    onKeyDown={event => {
                      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitAnswer()
                    }}
                  />
                  <div className="ap-answerActions">
                    {(interview?.turns.length ?? 0) > 0 && <button type="button" className="ap-textButton" onClick={openConfirmation}>Finish and review</button>}
                    <PrimaryButton onClick={submitAnswer} disabled={!answer.trim()}>Continue</PrimaryButton>
                  </div>
                  {errorMessage && <p className="ap-error" role="alert">{errorMessage}</p>}
                </div>
              </>
            ) : (
              <div className="ap-conversationComplete">
                <p className="ap-eyebrow">That’s enough to make a useful recommendation</p>
                <h1 id="ap-question-title" ref={headingRef} tabIndex={-1}>Ready to check what I heard?</h1>
                <p>You can correct anything before it shapes your path.</p>
                <PrimaryButton onClick={openConfirmation}>Review what I heard</PrimaryButton>
              </div>
            )}

            {(interview?.turns.length ?? 0) > 0 && (
              <details className="ap-transcript">
                <summary>Conversation so far</summary>
                <ol>
                  {interview?.turns.map(turn => <li key={turn.id}><span>{turn.question}</span><p>{turn.answer}</p></li>)}
                </ol>
              </details>
            )}
          </section>
        )}

        {stage === 'confirm' && (
          <section className="ap-confirm" aria-labelledby="ap-confirm-title">
            <button type="button" className="ap-back" onClick={() => setStage('conversation')}>← Back to conversation</button>
            <p className="ap-eyebrow">One quick check</p>
            <h1 id="ap-confirm-title" ref={headingRef} tabIndex={-1}>Here’s what I heard</h1>
            <p className="ap-lead">Correct the essentials. The rest stays tucked away unless you want to inspect it.</p>

            <div className="ap-confirmList">
              <article data-testid="confirmation-part">
                <div><span>1</span><strong>Your goal</strong></div>
                <textarea aria-label="Your goal" value={goal} onChange={event => setGoal(event.target.value)} maxLength={1200} rows={3} />
              </article>

              <article data-testid="confirmation-part">
                <div><span>2</span><strong>What you have tried</strong></div>
                <textarea aria-label="What you have tried" value={experience} onChange={event => setExperience(event.target.value)} maxLength={2000} rows={4} />
              </article>

              <article data-testid="confirmation-part">
                <div><span>3</span><strong>Your constraints</strong></div>
                <div className="ap-compactFields">
                  <label htmlFor="ap-role"><span>Role or area of work</span><input id="ap-role" value={role} onChange={event => setRole(event.target.value)} maxLength={160} placeholder="Optional" /></label>
                  <label htmlFor="ap-weekly-hours"><span>Time available each week</span><select id="ap-weekly-hours" value={weeklyHours} onChange={event => setWeeklyHours(event.target.value)}><option value="1">About 1 hour</option><option value="3">2–3 hours</option><option value="5">4–6 hours</option><option value="7">7+ hours</option></select></label>
                  <label htmlFor="ap-coding-comfort"><span>Coding comfort</span><select id="ap-coding-comfort" value={codingComfort} onChange={event => setCodingComfort(event.target.value)}><option>No coding yet</option><option>Some, but I prefer no-code first</option><option>Comfortable building with APIs</option><option>Professional software engineer</option></select></label>
                  <label className="ap-fieldWide" htmlFor="ap-constraint"><span>Main constraint</span><textarea id="ap-constraint" value={constraint} onChange={event => setConstraint(event.target.value)} maxLength={600} rows={3} placeholder="Time, access, confidence or another practical limit" /></label>
                </div>
              </article>
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

            <div className="ap-confirmAction">
              <PrimaryButton onClick={() => { void buildPath() }} disabled={analysisState === 'running' || goal.trim().length < 20 || experience.trim().length === 0}>
                {analysisState === 'running' ? 'Building your path…' : 'Build my path'}
              </PrimaryButton>
              <p>We only use the answers you confirm here.</p>
              {errorMessage && <p className="ap-error" role="alert">{errorMessage}</p>}
            </div>
          </section>
        )}

        {stage === 'path' && report && (
          <section className="ap-path" aria-labelledby="ap-path-title">
            <div className="ap-pathIntro">
              <div className="ap-pathCheck"><CheckIcon /></div>
              <p className="ap-eyebrow">Your recommendation is ready</p>
              <h1 id="ap-path-title" ref={headingRef} tabIndex={-1}>Your AI learning path</h1>
              <p>One skill to strengthen, one project to prove it and a realistic first step.</p>
            </div>

            <div className="ap-pathHero">
              <div>
                <span>Your next skill</span>
                <h2>{prioritySkills[0] ?? 'Workflow design and evaluation'}</h2>
                <p>{plan.focusNow}</p>
              </div>
              <div>
                <span>Your 30-day project</span>
                <h2>{plan.proof}</h2>
                <p>{Number(weeklyHours) === 1 ? 'About one focused hour each week.' : `${weeklyHours} focused hours each week.`}</p>
              </div>
            </div>

            <section className="ap-startHere" aria-labelledby="ap-start-here-title">
              <div>
                <span>Start here</span>
                <h2 id="ap-start-here-title">{plan.firstTask}</h2>
                <p>About 45 minutes · finish with something you can inspect.</p>
              </div>
              <button
                type="button"
                className="ap-primary"
                onClick={() => setFirstTaskState(state => state === 'not-started' ? 'started' : 'complete')}
                disabled={firstTaskState === 'complete'}
              >
                {firstTaskState === 'not-started' ? 'Start my first task' : firstTaskState === 'started' ? 'Mark task complete' : 'First task complete'}
                <ArrowIcon />
              </button>
            </section>

            {resources.length > 0 && (
              <section className="ap-resources" aria-labelledby="ap-resources-title">
                <div className="ap-sectionHeading"><p className="ap-eyebrow">Recommended learning</p><h2 id="ap-resources-title">A small stack, chosen for this path</h2></div>
                <div className="ap-resourceList">
                  {resources.map(resource => (
                    <article key={resource.id} data-testid="learning-resource">
                      <div><span>{resource.format}</span><small>{resource.estimatedHours} hours · {resource.free ? 'Free' : resource.costDisclosure}</small></div>
                      <h3>{resource.title}</h3>
                      <p>{resource.reason}</p>
                      {resource.canonicalUrl ? <a href={resource.canonicalUrl} target="_blank" rel="noreferrer">Open resource <span aria-hidden="true">↗</span></a> : <span className="ap-included">Included in your project plan</span>}
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
                  <p><CheckIcon /> Advanced agent frameworks can wait until this first workflow is reliable.</p>
                </div>
              </details>

              <details>
                <summary>Privacy and data</summary>
                <div className="ap-privacyBody">
                  <p>This report was built from the typed answers you confirmed. No microphone audio or live voice model was used.</p>
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
