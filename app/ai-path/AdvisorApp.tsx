'use client'

import { useEffect, useRef, useState } from 'react'

type Stage = 'landing' | 'profile' | 'setup' | 'interview' | 'understanding' | 'results' | 'plan' | 'history'
type MicState = 'idle' | 'requesting' | 'ready' | 'denied'
type InterviewStatus = 'agent' | 'ready' | 'listening' | 'processing' | 'paused'
type UnderstandingItem = {
  id: string
  label: string
  value: string
  evidence: string
  confidence: 'Clear' | 'Tentative'
}

const goalOptions = [
  { id: 'workflows', title: 'Automate parts of my work', detail: 'Build reliable workflows that save time every week.' },
  { id: 'builder', title: 'Build AI apps or agents', detail: 'Move from demos to useful, testable products.' },
  { id: 'career', title: 'Grow or change my career', detail: 'Create proof that maps to a real role.' },
  { id: 'leader', title: 'Lead an AI initiative', detail: 'Choose use cases, align teams, and measure value.' },
  { id: 'foundations', title: 'Understand the fundamentals', detail: 'Learn the concepts without drowning in jargon.' },
  { id: 'unsure', title: 'I am not sure yet', detail: 'Use the conversation to find a useful direction.' },
] as const

const interviewQuestions = [
  {
    phase: 'Your destination',
    eyebrow: 'Start with the outcome',
    question: 'Imagine this goes well. What can you do 30 days from now that you cannot do today?',
    helper: 'A concrete work outcome is more useful than a topic. “Automate my weekly research brief” is stronger than “learn agents.”',
    example: 'For example: “In 30 days, I want to turn five or six sources into a reliable weekly market brief.”',
  },
  {
    phase: 'What you do today',
    eyebrow: 'Show us a real example',
    question: 'Walk me through the last time you used AI for research or synthesis. Where did the workflow break down?',
    helper: 'Mention the tools, what you did yourself, what you delegated, and where you stopped trusting the output.',
    example: 'For example: describe the tools, the steps you owned, and the point where you stopped trusting the result.',
  },
  {
    phase: 'What gets in the way',
    eyebrow: 'Make the plan realistic',
    question: 'You have three hours a week. What usually prevents a learning plan from surviving contact with your calendar?',
    helper: 'There is no ideal answer. This determines the size and pace of your plan.',
    example: 'For example: “Long courses lose me when the practical payoff arrives too late.”',
  },
] as const

const skillObservations = [
  { label: 'AI foundations', stage: 'Not assessed', note: 'The evidence pipeline will assess this only after reviewed transcript evidence exists.' },
  { label: 'Workflow design', stage: 'Not assessed', note: 'No stage is assigned from profile fields or canned examples.' },
  { label: 'Evaluation & reliability', stage: 'Not assessed', note: 'Missing evidence remains unassessed rather than becoming a low score.' },
  { label: 'Building & integration', stage: 'Not assessed', note: 'A future report will link every finding to an exact learner-owned quote.' },
] as const

const resources = [
  {
    kind: 'Core lesson',
    title: 'Designing reliable AI workflows',
    meta: '45 minutes · Beginner · Free',
    why: 'This gives you a repeatable pattern for separating source collection, extraction, synthesis, and verification—the exact handoffs missing today.',
  },
  {
    kind: 'Build project',
    title: 'Ship a cited weekly research brief',
    meta: '3 × 45-minute sessions · No code required',
    why: 'Use six real sources, preserve every citation, and test the brief against a five-point quality checklist.',
  },
  {
    kind: 'Recurring practice',
    title: 'Run a ten-minute output review',
    meta: 'Once a week · Reusable',
    why: 'Track one missed claim, one weak citation, and one prompt change. This turns judgment into an evaluation habit.',
  },
] as const

const weeks = [
  {
    week: 'Week 1',
    theme: 'Map the workflow',
    outcome: 'A one-page workflow map with clear inputs, handoffs, and a definition of a trustworthy brief.',
    tasks: [
      'Complete the 45-minute workflow design lesson',
      'Map your current research process from source to final brief',
      'Write a five-point quality checklist',
    ],
  },
  {
    week: 'Week 2',
    theme: 'Build the first version',
    outcome: 'A working brief generated from six real sources with citations preserved.',
    tasks: [
      'Create a structured source-extraction prompt',
      'Generate one brief using the same source format',
      'Review it against your quality checklist',
    ],
  },
  {
    week: 'Week 3',
    theme: 'Make it reliable',
    outcome: 'Two briefs that follow the same process and surface failures consistently.',
    tasks: [
      'Run the workflow on a second topic',
      'Log citation and coverage failures',
      'Add one verification step for unsupported claims',
    ],
  },
  {
    week: 'Week 4',
    theme: 'Prove and share',
    outcome: 'A documented workflow a colleague could run without asking you how it works.',
    tasks: [
      'Package the prompt, checklist, and example output',
      'Ask one colleague to run the workflow',
      'Capture what changed and choose the next learning edge',
    ],
  },
] as const

const flowSteps: Array<{ id: Stage; short: string }> = [
  { id: 'profile', short: 'Goal' },
  { id: 'setup', short: 'Setup' },
  { id: 'interview', short: 'Conversation' },
  { id: 'understanding', short: 'Review' },
  { id: 'results', short: 'Direction' },
  { id: 'plan', short: 'Plan' },
]

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

function MicIcon({ off = false }: { off?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />{off && <path d="M4 4l16 16" />}</svg>
}

function CaptionsIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 10H8.5a2 2 0 0 0 0 4H10m5-4h-1.5a2 2 0 0 0 0 4H15" /></svg>
}

function PauseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" /></svg>
}

function CheckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
}

function CompassIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>
}

function BackButton({ onClick, children = 'Back' }: { onClick: () => void; children?: React.ReactNode }) {
  return <button type="button" className="ap-linkButton" onClick={onClick}><span aria-hidden="true">←</span>{children}</button>
}

function PrimaryButton({ onClick, children, disabled = false }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" className="ap-primary" onClick={onClick} disabled={disabled}>{children}<ArrowIcon /></button>
}

function FlowHeader({ stage, onNavigate }: { stage: Stage; onNavigate: (next: Stage) => void }) {
  const activeIndex = flowSteps.findIndex(step => step.id === stage)
  if (activeIndex < 0) return null
  return (
    <div className="ap-flowHeader" aria-label="Assessment progress">
      <div className="ap-flowHeaderInner">
        <button type="button" className="ap-wordmark" onClick={() => onNavigate('landing')} aria-label="AI Path Advisor home">
          <span className="ap-mark"><CompassIcon /></span>
          <span>AI Path Advisor</span>
          <span className="ap-alphaBadge">Private alpha</span>
        </button>
        <ol className="ap-stepper">
          {flowSteps.map((step, index) => (
            <li key={step.id} className={index < activeIndex ? 'is-complete' : index === activeIndex ? 'is-current' : ''}>
              <button type="button" disabled={index > activeIndex} onClick={() => onNavigate(step.id)} aria-current={index === activeIndex ? 'step' : undefined}>
                <span>{index < activeIndex ? <CheckIcon /> : index + 1}</span>
                <small>{step.short}</small>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="ap-quietButton ap-historyButton" onClick={() => onNavigate('history')}>History</button>
      </div>
    </div>
  )
}

export function AdvisorApp() {
  const [stage, setStage] = useState<Stage>('landing')
  const [goal, setGoal] = useState('workflows')
  const [role, setRole] = useState('Product marketing lead at a B2B software company')
  const [outcome, setOutcome] = useState('Turn a small set of sources into a useful weekly market brief without losing citations or spending half a day on it.')
  const [hours, setHours] = useState('3')
  const [codingComfort, setCodingComfort] = useState('Some, but I prefer no-code first')
  const [blocker, setBlocker] = useState('I start courses but lose momentum before I build anything useful.')
  const [micState, setMicState] = useState<MicState>('idle')
  const [captions, setCaptions] = useState(true)
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>('agent')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [conversation, setConversation] = useState<Array<{ role: 'advisor' | 'you'; text: string }>>([])
  const [understanding, setUnderstanding] = useState<UnderstandingItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({})
  const [planSaved, setPlanSaved] = useState(false)
  const [setupError, setSetupError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const selectedGoal = goalOptions.find(option => option.id === goal) ?? goalOptions[0]
  const profileReady = role.trim().length >= 4 && outcome.trim().length >= 20 && blocker.trim().length >= 10
  const totalTasks = weeks.reduce((total, week) => total + week.tasks.length, 0)
  const completedCount = Object.values(completedTasks).filter(Boolean).length
  const progress = Math.round((completedCount / totalTasks) * 100)
  const currentQuestion = interviewQuestions[questionIndex]

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [stage])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  useEffect(() => {
    if (stage === 'setup' || stage === 'interview') return
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
  }, [stage])

  useEffect(() => {
    if (interviewStatus !== 'processing') return
    const timeout = window.setTimeout(() => {
      if (questionIndex === interviewQuestions.length - 1) {
        const learnerAnswers = conversation.filter(item => item.role === 'you').map(item => item.text)
        setUnderstanding([
          {
            id: 'goal',
            label: 'Your 30-day outcome',
            value: learnerAnswers[0] || outcome.trim(),
            evidence: learnerAnswers[0] ? `From your first response: “${learnerAnswers[0]}”` : `From the outcome you entered: “${outcome.trim()}”`,
            confidence: 'Clear',
          },
          {
            id: 'starting-point',
            label: 'Example or starting point you shared',
            value: learnerAnswers[1] || 'No concrete example was captured. Keep this unassessed or return to add one.',
            evidence: learnerAnswers[1] ? `From your second response: “${learnerAnswers[1]}”` : 'No learner-owned transcript evidence is available.',
            confidence: learnerAnswers[1] ? 'Clear' : 'Tentative',
          },
          {
            id: 'constraint',
            label: 'Constraint the plan must respect',
            value: learnerAnswers[2] ? `${hours} hours per week. ${learnerAnswers[2]}` : `${hours} hours per week. ${blocker.trim()}`,
            evidence: learnerAnswers[2] ? `From your third response: “${learnerAnswers[2]}”` : `From the time budget and blocker you entered: “${blocker.trim()}”`,
            confidence: 'Clear',
          },
        ])
        setStage('understanding')
        setInterviewStatus('agent')
        return
      }
      setQuestionIndex(index => index + 1)
      setAnswer('')
      setInterviewStatus('agent')
    }, 850)
    return () => window.clearTimeout(timeout)
  }, [blocker, conversation, hours, interviewStatus, outcome, questionIndex])

  const stopMicrophone = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setMicState('idle')
  }

  const navigate = (next: Stage) => {
    if (next !== 'setup') stopMicrophone()
    if (next === 'interview' && stage !== 'interview') setInterviewStatus('agent')
    setStage(next)
  }

  const requestMicrophone = async () => {
    setMicState('requesting')
    setSetupError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState('denied')
      setSetupError('This browser does not expose microphone access. You can continue with the complete text experience.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setMicState('ready')
    } catch {
      setMicState('denied')
      setSetupError('Microphone access was not granted. Nothing was lost—enable it in your browser settings, or continue by typing.')
    }
  }

  const continueWithText = () => {
    stopMicrophone()
    setMicState('idle')
    setStage('interview')
  }

  const submitInterviewAnswer = () => {
    const trimmed = answer.trim()
    if (!trimmed) return
    setConversation(items => [
      ...items,
      { role: 'advisor', text: currentQuestion.question },
      { role: 'you', text: trimmed },
    ])
    setInterviewStatus('processing')
  }

  const updateUnderstanding = (id: string, value: string) => {
    setUnderstanding(items => items.map(item => item.id === id ? { ...item, value } : item))
  }

  const toggleTask = (key: string) => {
    setCompletedTasks(tasks => ({ ...tasks, [key]: !tasks[key] }))
  }

  const restartForReassessment = () => {
    setQuestionIndex(0)
    setConversation([])
    setAnswer('')
    setInterviewStatus('agent')
    setStage('interview')
  }

  const deletePreview = () => {
    stopMicrophone()
    setConversation([])
    setUnderstanding([])
    setCompletedTasks({})
    setPlanSaved(false)
    setAnswer('')
    setQuestionIndex(0)
    setInterviewStatus('agent')
    setStage('landing')
  }

  return (
    <div className="ap-shell">
      <FlowHeader stage={stage} onNavigate={navigate} />

      {stage === 'landing' && (
        <section className="ap-landing">
          <div className="ap-ambient ap-ambientOne" />
          <div className="ap-ambient ap-ambientTwo" />
          <div className="ap-landingGrid">
            <div className="ap-heroCopy">
              <div className="ap-privatePill"><span /> Private alpha · Your feedback shapes the product</div>
              <h1 ref={headingRef} tabIndex={-1}>Find your next <em>useful</em> AI move.</h1>
              <p className="ap-heroLead">Answer three guided questions. Leave with a transparent preview of how a realistic 30-day plan could use your goal, experience, and available time.</p>
              <div className="ap-heroActions">
                <PrimaryButton onClick={() => setStage('profile')}>Build my plan</PrimaryButton>
                <button type="button" className="ap-secondary" onClick={() => setStage('profile')}>See the guided flow</button>
              </div>
              <ul className="ap-trustList" aria-label="Assessment commitments">
                <li><CheckIcon /> No test or grades</li>
                <li><CheckIcon /> Review what we understood</li>
                <li><CheckIcon /> Text-only in this build</li>
              </ul>
            </div>
            <div className="ap-previewWrap" aria-label="Example learning plan preview">
              <div className="ap-previewCard">
                <div className="ap-previewTop"><span>Example direction</span><span>3 guided questions</span></div>
                <div className="ap-previewMark"><CompassIcon /></div>
                <p className="ap-kicker">Your fastest route</p>
                <h2>AI workflow builder</h2>
                <p>Design one reliable research workflow before adding agent frameworks or custom code.</p>
                <div className="ap-previewFocus">
                  <span>Start here</span>
                  <strong>Ship a cited weekly brief</strong>
                  <small>3 hours per week · No code required</small>
                </div>
                <div className="ap-miniWeeks" aria-hidden="true">
                  {['Understand', 'Practice', 'Build', 'Prove'].map((item, index) => <span key={item}><i>{index + 1}</i>{item}</span>)}
                </div>
              </div>
              <p className="ap-previewCaption">A direction you can inspect, correct, and follow—not a generic course list.</p>
            </div>
          </div>
        </section>
      )}

      {stage === 'profile' && (
        <section className="ap-section ap-profileSection">
          <div className="ap-sectionGrid">
            <aside className="ap-contextRail">
              <BackButton onClick={() => setStage('landing')} />
              <p className="ap-eyebrow">Step 1 · Your destination</p>
              <h1 ref={headingRef} tabIndex={-1}>Start with what should change.</h1>
              <p>The guided questions use your outcome and constraints so the preview starts from your life instead of an imaginary average learner.</p>
              <div className="ap-timeNote"><span>About 90 seconds</span><small>Then you will answer three guided questions.</small></div>
            </aside>
            <div className="ap-formCard">
              <fieldset>
                <legend>What would make learning AI worth it for you?</legend>
                <div className="ap-goalGrid">
                  {goalOptions.map(option => (
                    <label key={option.id} className={goal === option.id ? 'is-selected' : ''}>
                      <input type="radio" name="goal" value={option.id} checked={goal === option.id} onChange={() => setGoal(option.id)} />
                      <span className="ap-radioDot" aria-hidden="true" />
                      <strong>{option.title}</strong>
                      <small>{option.detail}</small>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="ap-fieldGrid">
                <label className="ap-field ap-fieldWide">
                  <span>Your role or area of work</span>
                  <input value={role} onChange={event => setRole(event.target.value)} placeholder="For example, operations manager in healthcare" />
                </label>
                <label className="ap-field ap-fieldWide">
                  <span>What would you like to be able to do?</span>
                  <textarea value={outcome} onChange={event => setOutcome(event.target.value)} rows={4} placeholder="Describe a real outcome, workflow, or proof you want to create." />
                  <small>Specific beats impressive. You can refine this in the conversation.</small>
                </label>
                <label className="ap-field">
                  <span>Time available each week</span>
                  <select value={hours} onChange={event => setHours(event.target.value)}>
                    <option value="1">About 1 hour</option>
                    <option value="3">2–3 hours</option>
                    <option value="5">4–6 hours</option>
                    <option value="7">7+ hours</option>
                  </select>
                </label>
                <label className="ap-field">
                  <span>Coding comfort</span>
                  <select value={codingComfort} onChange={event => setCodingComfort(event.target.value)}>
                    <option>No coding yet</option>
                    <option>Some, but I prefer no-code first</option>
                    <option>Comfortable building with APIs</option>
                    <option>Professional software engineer</option>
                  </select>
                </label>
                <label className="ap-field ap-fieldWide">
                  <span>What most often gets in the way?</span>
                  <textarea value={blocker} onChange={event => setBlocker(event.target.value)} rows={3} />
                </label>
              </div>

              <div className="ap-formFooter">
                <p><span>{selectedGoal.title}</span> · {hours} hours a week · {codingComfort}</p>
                <div className="ap-heroActions">
                  <button type="button" className="ap-quietButton" onClick={() => setStage('setup')} disabled={!profileReady}>Preview future voice setup</button>
                  <PrimaryButton onClick={continueWithText} disabled={!profileReady}>Start guided questions</PrimaryButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {stage === 'setup' && (
        <section className="ap-section ap-setupSection">
          <div className="ap-narrow">
            <BackButton onClick={() => setStage('profile')} />
            <p className="ap-eyebrow">Optional preview · Future voice setup</p>
            <h1 ref={headingRef} tabIndex={-1}>Preview the microphone permission step.</h1>
            <p className="ap-sectionLead">Voice is not connected in this build. This optional screen only verifies browser permission; the complete alpha continues by typing.</p>
            <div className="ap-setupGrid">
              <div className="ap-micCard">
                <div className={`ap-micOrb is-${micState}`} aria-hidden="true"><MicIcon off={micState === 'denied'} /></div>
                <div className="ap-micStatus" role="status" aria-live="polite">
                  <strong>{micState === 'ready' ? 'Microphone permission granted' : micState === 'requesting' ? 'Requesting microphone access…' : micState === 'denied' ? 'Microphone unavailable' : 'Microphone is off'}</strong>
                  <span>{micState === 'ready' ? 'This prototype does not connect or transcribe audio. Continue with the complete text flow.' : 'Nothing is recorded during this permission check.'}</span>
                </div>
                <button type="button" className="ap-primary ap-fullButton" onClick={micState === 'ready' ? continueWithText : requestMicrophone} disabled={micState === 'requesting'}>
                  {micState === 'ready' ? 'Continue with text' : micState === 'requesting' ? 'Checking…' : 'Test microphone permission'}
                  {micState === 'ready' ? <ArrowIcon /> : <MicIcon />}
                </button>
                <button type="button" className="ap-textChoice" onClick={continueWithText}>Continue with the complete text experience</button>
              </div>
              <div className="ap-expectCard">
                <p className="ap-kicker">What to expect</p>
                <ol>
                  <li><span>01</span><div><strong>We start with your goal</strong><small>No trivia or surprise test questions.</small></div></li>
                  <li><span>02</span><div><strong>We ask for one real example</strong><small>Beginners can use a scenario instead of a project.</small></div></li>
                  <li><span>03</span><div><strong>You review what we heard</strong><small>Correct anything before the plan is generated.</small></div></li>
                </ol>
                <div className="ap-privacyNote"><strong>Voice is not live in this build.</strong><span>The permission test does not connect to a model or store audio. Typed answers stay only in this browser preview.</span></div>
              </div>
            </div>
            {setupError && <div className="ap-error" role="alert"><div><strong>We could not start the microphone.</strong><p>{setupError}</p></div><button type="button" onClick={requestMicrophone}>Try again</button></div>}
          </div>
        </section>
      )}

      {stage === 'interview' && (
        <section className="ap-interview">
          <div className="ap-interviewTop">
            <div>
              <p className="ap-eyebrow">Phase {questionIndex + 1} of {interviewQuestions.length}</p>
              <strong>{currentQuestion.phase}</strong>
            </div>
            <div className="ap-phaseTrack" aria-label={`Interview phase ${questionIndex + 1} of ${interviewQuestions.length}`}>
              {interviewQuestions.map((question, index) => <i key={question.phase} className={index <= questionIndex ? 'is-active' : ''} />)}
            </div>
            <span className="ap-duration">Typed prototype · no live model</span>
          </div>

          <div className="ap-interviewGrid">
            <aside className="ap-journeyPanel">
              <p className="ap-kicker">Conversation outline</p>
              <ol>
                {interviewQuestions.map((question, index) => (
                  <li key={question.phase} className={index < questionIndex ? 'is-complete' : index === questionIndex ? 'is-current' : ''}>
                    <span>{index < questionIndex ? <CheckIcon /> : index + 1}</span>
                    <div><strong>{question.phase}</strong><small>{index < questionIndex ? 'Answer captured' : index === questionIndex ? 'In progress' : 'Coming next'}</small></div>
                  </li>
                ))}
              </ol>
              <div className="ap-signalCard">
                <span>What I am testing</span>
                <p>{questionIndex === 0 ? 'Whether the outcome is concrete enough to plan backward from.' : questionIndex === 1 ? 'Where judgment, process, and tool fluency already exist.' : 'What plan size will survive your real calendar.'}</p>
              </div>
            </aside>

            <div className="ap-conversationPanel">
              <div className="ap-advisorQuestion">
                <div className={`ap-agentPulse is-${interviewStatus}`} aria-hidden="true"><span /><i /><b /></div>
                <div>
                  <p>{currentQuestion.eyebrow}</p>
                  <h1 ref={headingRef} tabIndex={-1}>{currentQuestion.question}</h1>
                  {captions && <span className="ap-captionLabel"><CaptionsIcon /> Transcript preview on</span>}
                </div>
              </div>

              <div className="ap-answerArea">
                {interviewStatus === 'paused' ? (
                  <div className="ap-pausedState">
                    <PauseIcon />
                    <h2>Conversation paused</h2>
                    <p>Your answers are safe. Resume when you are ready, or continue by typing.</p>
                    <button type="button" className="ap-primary" onClick={() => setInterviewStatus('agent')}>Resume conversation <ArrowIcon /></button>
                  </div>
                ) : (
                  <>
                    <label htmlFor="ap-answer">Your response</label>
                    <textarea id="ap-answer" value={answer} onChange={event => setAnswer(event.target.value)} rows={6} placeholder="Type your answer here…" />
                    <p className="ap-helperText">{currentQuestion.helper}</p>
                    <p className="ap-helperText">{currentQuestion.example}</p>
                    <div className="ap-answerControls">
                      <span className="ap-talkButton" aria-disabled="true"><MicIcon /> Voice coming after privacy testing</span>
                      <button type="button" className="ap-secondary" onClick={submitInterviewAnswer} disabled={interviewStatus === 'processing' || answer.trim().length === 0}>{interviewStatus === 'processing' ? 'Preparing the next question…' : 'Send typed answer'}</button>
                    </div>
                  </>
                )}
              </div>

              <div className="ap-sessionControls">
                <button type="button" aria-pressed={captions} onClick={() => setCaptions(value => !value)}><CaptionsIcon /> {captions ? 'Transcript preview on' : 'Transcript preview off'}</button>
                <button type="button" onClick={() => setInterviewStatus('paused')}><PauseIcon /> Pause</button>
                <button type="button" className="ap-endButton" onClick={() => { stopMicrophone(); setStage('understanding') }}>End & review</button>
              </div>
            </div>
          </div>
          <p className="ap-interviewPrivacy">This build is text-only and does not call a live model. You can edit every captured answer before future assessment logic uses it.</p>
        </section>
      )}

      {stage === 'understanding' && (
        <section className="ap-section ap-understandingSection">
          <div className="ap-wide">
            <BackButton onClick={() => setStage('interview')}>Back to conversation</BackButton>
            <div className="ap-titleRow">
              <div>
                <p className="ap-eyebrow">Step 4 · Accuracy checkpoint</p>
                <h1 ref={headingRef} tabIndex={-1}>Here is what I understood.</h1>
                <p>Correct the interpretation before it becomes a plan. Tentative findings stay tentative until you confirm them.</p>
              </div>
              <div className="ap-evidenceCount"><strong>{understanding.length}</strong><span>reviewable inputs</span></div>
            </div>

            <div className="ap-understandingGrid">
              {understanding.map(item => (
                <article key={item.id} className="ap-understandingCard">
                  <div className="ap-cardTop"><span>{item.label}</span><i className={item.confidence === 'Clear' ? 'is-clear' : ''}>{item.confidence}</i></div>
                  {editingId === item.id ? (
                    <textarea aria-label={`Edit ${item.label}`} value={item.value} onChange={event => updateUnderstanding(item.id, event.target.value)} rows={5} />
                  ) : <h2>{item.value}</h2>}
                  <details>
                    <summary>Why I think this</summary>
                    <p>{item.evidence}</p>
                  </details>
                  <button type="button" className="ap-editButton" onClick={() => setEditingId(editingId === item.id ? null : item.id)}>{editingId === item.id ? 'Save correction' : 'Edit this'}</button>
                </article>
              ))}
            </div>

            <div className="ap-reviewFooter">
              <div><strong>Anything important still missing?</strong><p>We can ask one more question, or build the plan from this reviewed understanding.</p></div>
              <button type="button" className="ap-secondary" onClick={() => setStage('interview')}>Ask me one more question</button>
              <PrimaryButton onClick={() => setStage('results')}>Use this to build my plan</PrimaryButton>
            </div>
          </div>
        </section>
      )}

      {stage === 'results' && (
        <section className="ap-results">
          <div className="ap-resultsHero">
            <BackButton onClick={() => setStage('understanding')}>Edit what we understood</BackButton>
            <div className="ap-privatePill"><span /> Illustrative plan draft · not an assessment result</div>
            <div className="ap-resultsHeroGrid">
              <div>
                <p className="ap-eyebrow">Your priority now</p>
                <h1 ref={headingRef} tabIndex={-1}>Working direction: <em>{selectedGoal.title.toLowerCase()}.</em></h1>
                <p>The alpha uses your stated outcome and constraints to preview the plan experience. Skill scoring and resource selection are not yet connected to this screen.</p>
                <div className="ap-evidenceInline"><span><CheckIcon /></span><p>Based only on <strong>{understanding.length} inputs you can review</strong>; no hidden voice or model analysis.</p></div>
              </div>
              <aside className="ap-nextMove">
                <span>30-day proof</span>
                <h2>A cited weekly brief a colleague can run without you.</h2>
                <dl>
                  <div><dt>Time</dt><dd>{hours} hours / week</dd></div>
                  <div><dt>Approach</dt><dd>No-code first</dd></div>
                  <div><dt>Status</dt><dd>Illustrative</dd></div>
                </dl>
                <PrimaryButton onClick={() => setStage('plan')}>Open my 30-day plan</PrimaryButton>
              </aside>
            </div>
          </div>

          <div className="ap-resultsBody">
            <section className="ap-resultSection ap-nowNotYet">
              <div className="ap-sectionHeading"><p className="ap-kicker">Direction</p><h2>What to learn now—and what can wait.</h2></div>
              <div className="ap-directionGrid">
                <article><span className="ap-doDot" /><p className="ap-kicker">Focus now</p><h3>Workflow decomposition, structured outputs, citation preservation, and a lightweight quality rubric.</h3></article>
                <article><span className="ap-waitDot" /><p className="ap-kicker">Not yet</p><h3>Multi-agent orchestration, model fine-tuning, vector database internals, and production API architecture.</h3></article>
              </div>
            </section>

            <section className="ap-resultSection">
              <div className="ap-sectionHeading"><p className="ap-kicker">Skill observations</p><h2>No evidence, no score.</h2><p>The deterministic assessment engine is built, but this prototype screen does not yet submit reviewed evidence to it.</p></div>
              <div className="ap-skillsTable">
                {skillObservations.map((skill, index) => (
                  <div key={skill.label}>
                    <span className="ap-skillNumber">0{index + 1}</span>
                    <strong>{skill.label}</strong>
                    <i>{skill.stage}</i>
                    <p>{skill.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="ap-resultSection">
              <div className="ap-sectionHeading"><p className="ap-kicker">Example recommendation stack</p><h2>One lesson. One build. One habit.</h2><p>Illustrative content only; production recommendations come from the reviewed catalog and deterministic ranker.</p></div>
              <div className="ap-resourceGrid">
                {resources.map((resource, index) => (
                  <article key={resource.title}>
                    <div className="ap-resourceIndex">0{index + 1}</div>
                    <p className="ap-kicker">{resource.kind}</p>
                    <h3>{resource.title}</h3>
                    <span>{resource.meta}</span>
                    <p>{resource.why}</p>
                    <div><button type="button" disabled title="Catalog integration is the next milestone">Details coming next</button><button type="button" disabled title="Catalog integration is the next milestone">Swap coming next</button></div>
                  </article>
                ))}
              </div>
            </section>

            <div className="ap-resultsCta">
              <div><p className="ap-kicker">Ready when you are</p><h2>Your first task takes 45 minutes.</h2><p>Start with a workflow map—not another open-ended course.</p></div>
              <PrimaryButton onClick={() => setStage('plan')}>Open my 30-day plan</PrimaryButton>
            </div>
          </div>
        </section>
      )}

      {stage === 'plan' && (
        <section className="ap-plan">
          <div className="ap-planHeader">
            <BackButton onClick={() => setStage('results')}>Back to direction</BackButton>
            <div className="ap-privatePill"><span /> Illustrative 30-day plan · local preview</div>
            <div className="ap-planTitle">
              <div><p className="ap-eyebrow">Your 30-day plan</p><h1 ref={headingRef} tabIndex={-1}>From manual research to a reliable brief.</h1><p>Four weeks · {hours} hours per week · Twelve concrete actions</p></div>
              <div className="ap-progressRing" style={{ '--ap-progress': `${progress * 3.6}deg` } as React.CSSProperties}><span><strong>{progress}%</strong><small>complete</small></span></div>
            </div>
            <div className="ap-planActions">
              <button type="button" className="ap-secondary" onClick={() => setPlanSaved(value => !value)}>{planSaved ? 'Saved for this preview' : 'Save in this preview'}</button>
              <button type="button" className="ap-quietButton" disabled title="Plan editing is the next milestone">Adjust time budget · coming next</button>
              <button type="button" className="ap-quietButton" onClick={() => setStage('history')}>View preview history</button>
            </div>
          </div>

          <div className="ap-planBody">
            <div className="ap-nextAction">
              <div><span>Next action</span><h2>Complete the workflow design lesson.</h2><p>45 minutes · Produces the vocabulary for your one-page workflow map.</p></div>
              <button type="button" className="ap-primary" onClick={() => toggleTask('0-0')}>{completedTasks['0-0'] ? 'Marked complete' : 'Start first task'}<ArrowIcon /></button>
            </div>

            <div className="ap-weekList">
              {weeks.map((week, weekIndex) => {
                const weekComplete = week.tasks.every((_, taskIndex) => completedTasks[`${weekIndex}-${taskIndex}`])
                return (
                  <article key={week.week} className={weekComplete ? 'is-complete' : ''}>
                    <div className="ap-weekHeading">
                      <div><span>{week.week}</span><h2>{week.theme}</h2></div>
                      <p><strong>Done looks like:</strong> {week.outcome}</p>
                    </div>
                    <ul>
                      {week.tasks.map((task, taskIndex) => {
                        const key = `${weekIndex}-${taskIndex}`
                        return <li key={task}><label><input type="checkbox" checked={Boolean(completedTasks[key])} onChange={() => toggleTask(key)} /><span><CheckIcon /></span><strong>{task}</strong><small>{taskIndex === 0 ? '45 min' : '30–45 min'}</small></label></li>
                      })}
                    </ul>
                    <div className="ap-weekFooter"><button type="button" disabled>Plan adaptation coming next</button><button type="button" disabled>Task swaps coming next</button></div>
                  </article>
                )
              })}
            </div>

            <div className="ap-checkinCard">
              <div className="ap-checkinIcon"><MicIcon /></div>
              <div><p className="ap-kicker">Weekly check-in</p><h2>Tell us what survived contact with your calendar.</h2><p>A 60-second voice or text check-in can make next week easier, harder, or different. Your plan never changes without your approval.</p></div>
              <button type="button" className="ap-secondary" disabled>Check-ins coming next</button>
            </div>
          </div>
        </section>
      )}

      {stage === 'history' && (
        <section className="ap-section ap-historySection">
          <div className="ap-wide">
            <BackButton onClick={() => setStage(planSaved ? 'plan' : 'results')} />
            <div className="ap-titleRow">
              <div><p className="ap-eyebrow">Your history</p><h1 ref={headingRef} tabIndex={-1}>Plans are snapshots, not permanent labels.</h1><p>Reassess after you ship something, finish a plan, or change your goal.</p></div>
              <button type="button" className="ap-primary" onClick={restartForReassessment}>Start a short reassessment <ArrowIcon /></button>
            </div>
            <div className="ap-historyList">
              <article className="is-current">
                <div><span>Current session preview · Not persisted</span><time>Today</time></div>
                <h2>AI workflow builder</h2>
                <p>Build a cited weekly market brief that a colleague can run without you.</p>
                <dl><div><dt>Progress</dt><dd>{progress}%</dd></div><div><dt>Time budget</dt><dd>{hours} hrs / week</dd></div><div><dt>New evidence</dt><dd>{completedCount} tasks</dd></div></dl>
                <div><button type="button" onClick={() => setStage('plan')}>Open plan</button><button type="button" onClick={restartForReassessment}>Reassess</button></div>
              </article>
              <article aria-label="Illustrative earlier snapshot">
                <div><span>Illustrative earlier snapshot · Not your data</span><time>Example</time></div>
                <h2>Applied AI explorer</h2>
                <p>Move from ad hoc prompting to one role-specific workflow with a quality check.</p>
                <dl><div><dt>Progress</dt><dd>75%</dd></div><div><dt>Time budget</dt><dd>2 hrs / week</dd></div><div><dt>New evidence</dt><dd>1 project</dd></div></dl>
                <div><button type="button" disabled>Illustrative only</button></div>
              </article>
            </div>
          </div>
        </section>
      )}

      {stage !== 'interview' && (
        <footer className="ap-footer">
          <span>AI Path Advisor · Private alpha</span>
          <p>Text-only local prototype. Recommendations are illustrative; never share sensitive work information.</p>
          <div><button type="button" disabled>Privacy summary coming</button><button type="button" onClick={deletePreview}>Delete local preview</button></div>
        </footer>
      )}
    </div>
  )
}
