'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { AIPathApiError, analyzeReviewedAssessment, createTextSession, deleteOwnedSession, exportOwnedSession } from './client/api'
import { proposeCheckInAdaptation, taskSwapAlternative, type CheckInProposal } from './client/plan-actions'
import {
  AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS,
  startAdaptiveInterview,
  submitAdaptiveInterviewAnswer,
  summarizeAdaptiveInterview,
  type AdaptiveInterviewQuestion,
  type AdaptiveInterviewState,
} from './lib/adaptive-interview'
import type { AssessmentReport, SkillId, SkillLevel } from './lib/foundation'
import type { AiPathGoalType } from './lib/goal-type'
import { getPlanBlueprint } from './lib/plan'
import { composePersonalizedPlan } from './lib/plan-composer'

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

const interviewCheckpointLabels: Record<string, string> = {
  'concrete_example': 'Concrete example',
  'ownership_independence': 'Your ownership',
  artifact: 'Inspectable artifact',
  'measurable_outcome': 'Observable outcome',
  'failure_limitation': 'Failure or limitation',
  'evaluation_reliability': 'Quality checks',
  'safety_privacy': 'Safety boundary',
  'constraint_time': 'Real constraint',
}

function interviewPhase(question: Pick<AdaptiveInterviewQuestion, 'dimensions'> | null) {
  const firstDimension = question?.dimensions[0]
  return firstDimension ? interviewCheckpointLabels[firstDimension] : 'Review your evidence'
}

function buildUnderstandingFromInterview(
  state: AdaptiveInterviewState,
  outcome: string,
  weeklyHours: string,
  blocker: string,
): UnderstandingItem[] {
  const summary = summarizeAdaptiveInterview(state)
  const evidenceTurns = state.turns.filter(turn => !turn.dimensionsProbed.includes('constraint_time'))
  const constraintTurns = state.turns.filter(turn => turn.dimensionsProbed.includes('constraint_time'))
  const missing = summary?.missingDimensions.map(dimension => interviewCheckpointLabels[dimension]).join(', ')
  const evidenceItems: UnderstandingItem[] = evidenceTurns.map((turn, index) => ({
    id: `evidence-${index + 1}`,
    label: `${interviewPhase({ dimensions: turn.dimensionsProbed })} evidence`,
    value: turn.answer,
    evidence: `Your exact typed answer to: “${turn.question}”`,
    confidence: summary?.contradictoryDimensions.some(dimension => turn.dimensionsProbed.includes(dimension)) ? 'Tentative' : 'Clear',
  }))

  return [
    {
      id: 'goal',
      label: 'Your 30-day outcome',
      value: outcome.trim(),
      evidence: `From the outcome you entered: “${outcome.trim()}”`,
      confidence: 'Clear',
    },
    ...evidenceItems,
    ...constraintTurns.map(turn => ({
      id: 'constraint-follow-up',
      label: 'Constraint follow-up',
      value: turn.answer,
      evidence: `Your exact typed answer to: “${turn.question}”`,
      confidence: 'Clear' as const,
    })),
    {
      id: 'constraint',
      label: 'Profile constraint the plan must respect',
      value: blocker.trim(),
      evidence: constraintTurns.length
        ? `From your stated blocker; the exact constraint follow-up is preserved separately. Your structured time budget remains ${hourLabel(weeklyHours)} per week.${missing ? ` Evidence gaps remain: ${missing}.` : ''}`
        : `From the blocker you entered. Your structured time budget remains ${hourLabel(weeklyHours)} per week.${missing ? ` Evidence gaps remain: ${missing}.` : ''}`,
      confidence: 'Clear',
    },
  ]
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

function learnerStage(level: SkillLevel | null): string {
  if (level === null) return 'Not assessed'
  if (level <= 1) return 'Explorer'
  if (level === 2) return 'Integrator'
  if (level === 3) return 'System Builder'
  return 'Production Builder'
}

function hourLabel(value: string): string {
  return `${value} ${value === '1' ? 'hour' : 'hours'}`
}

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

function FlowHeader({ stage, onNavigate, canViewHistory }: { stage: Stage; onNavigate: (next: Stage) => void; canViewHistory: boolean }) {
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
        {canViewHistory && <button type="button" className="ap-quietButton ap-historyButton" onClick={() => onNavigate('history')}>History</button>}
      </div>
    </div>
  )
}

export function AdvisorApp() {
  const [stage, setStage] = useState<Stage>('landing')
  const [goal, setGoal] = useState<AiPathGoalType>('workflows')
  const [role, setRole] = useState('Product marketing lead at a B2B software company')
  const [outcome, setOutcome] = useState('Turn a small set of sources into a useful weekly market brief without losing citations or spending half a day on it.')
  const [hours, setHours] = useState('3')
  const [codingComfort, setCodingComfort] = useState('Some, but I prefer no-code first')
  const [blocker, setBlocker] = useState('I start courses but lose momentum before I build anything useful.')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [micState, setMicState] = useState<MicState>('idle')
  const [captions, setCaptions] = useState(true)
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>('agent')
  const [adaptiveInterview, setAdaptiveInterview] = useState<AdaptiveInterviewState | null>(null)
  const [answer, setAnswer] = useState('')
  const [understanding, setUnderstanding] = useState<UnderstandingItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({})
  const [planSaved, setPlanSaved] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [sessionState, setSessionState] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionOwned, setSessionOwned] = useState(false)
  const [sessionPersistence, setSessionPersistence] = useState<'none' | 'ephemeral-memory' | 'supabase-postgres'>('none')
  const [sessionError, setSessionError] = useState('')
  const [analysisState, setAnalysisState] = useState<'idle' | 'running' | 'ready' | 'error'>('idle')
  const [analysisError, setAnalysisError] = useState('')
  const [assessmentReport, setAssessmentReport] = useState<AssessmentReport | null>(null)
  const [planHours, setPlanHours] = useState(hours)
  const [pendingPlanHours, setPendingPlanHours] = useState(hours)
  const [taskOverrides, setTaskOverrides] = useState<Record<string, string>>({})
  const [checkIn, setCheckIn] = useState('')
  const [checkInProposal, setCheckInProposal] = useState<CheckInProposal | null>(null)
  const [adaptationStatus, setAdaptationStatus] = useState('')
  const [dataActionState, setDataActionState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [dataActionMessage, setDataActionMessage] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const selectedGoal = goalOptions.find(option => option.id === goal) ?? goalOptions[0]
  const reviewedGoal = understanding.find(item => item.id === 'goal')?.value.trim() || outcome.trim()
  const reviewedConstraint = understanding
    .filter(item => item.id === 'constraint' || item.id === 'constraint-follow-up')
    .map(item => item.value.trim())
    .filter(Boolean)
    .join(' ') || blocker.trim()
  const personalizedPlan = useMemo(() => assessmentReport ? composePersonalizedPlan({
    goalType: goal,
    weeklyHours: Number(planHours) || 1,
    codingComfort,
    role,
    blocker: reviewedConstraint,
    results: assessmentReport.results,
    growthAreas: assessmentReport.growthAreas,
    recommendations: assessmentReport.recommendations,
  }) : null, [assessmentReport, codingComfort, goal, planHours, reviewedConstraint, role])
  const plan = personalizedPlan ?? getPlanBlueprint(goal)
  const weeks = plan.weeks
  const scheduledWeeks = useMemo(() => weeks.map(week => ({
    ...week,
    tasks: planHours === '1' ? week.tasks.slice(0, 1) : week.tasks,
  })), [planHours, weeks])
  const profileReady = role.trim().length >= 4 && outcome.trim().length >= 20 && blocker.trim().length >= 10 && privacyAccepted
  const totalTasks = scheduledWeeks.reduce((total, week) => total + week.tasks.length, 0)
  const completedCount = Object.values(completedTasks).filter(Boolean).length
  const progress = Math.round((completedCount / totalTasks) * 100)
  const currentQuestion = adaptiveInterview?.currentQuestion ?? null
  const questionOrdinal = currentQuestion?.ordinal ?? Math.max(1, adaptiveInterview?.turns.length ?? 1)
  const skillObservations = useMemo(() => (assessmentReport?.results ?? []).map(result => ({
    label: skillNames[result.skillId],
    stage: learnerStage(result.level),
    note: result.rationale,
  })), [assessmentReport])
  const recommendations = assessmentReport?.recommendations ?? []
  const assessedCount = assessmentReport?.results.filter(result => result.status === 'assessed').length ?? 0

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
      if (adaptiveInterview?.status === 'complete') {
        setUnderstanding(buildUnderstandingFromInterview(adaptiveInterview, outcome, hours, blocker))
        setStage('understanding')
        setInterviewStatus('agent')
        return
      }
      setInterviewStatus('agent')
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [adaptiveInterview, blocker, hours, interviewStatus, outcome])

  const stopMicrophone = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setMicState('idle')
  }

  const navigate = (next: Stage) => {
    if ((next === 'results' || next === 'plan' || next === 'history') && !assessmentReport) return
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

  const continueWithText = async () => {
    stopMicrophone()
    setSessionState('starting')
    setSessionError('')
    try {
      const result = await createTextSession({ goal: outcome.trim(), goalType: goal, targetRole: role.trim() })
      const interview = startAdaptiveInterview({
        goalType: goal,
        goal: outcome.trim(),
        role: role.trim(),
        weeklyMinutes: Math.max(15, Math.min(1_200, (Number(hours) || 1) * 60)),
        blocker: blocker.trim(),
      })
      if (!interview.ok) throw new Error('The adaptive interview could not be initialized.')
      setSessionId(result.session.id)
      setSessionOwned(result.owned)
      setSessionPersistence(result.persistence)
      setSessionState('ready')
      setMicState('idle')
      setAdaptiveInterview(interview.state)
      setUnderstanding([])
      setStage('interview')
    } catch (error) {
      setSessionState('error')
      setSessionError(error instanceof AIPathApiError ? error.message : 'The assessment session could not be started. Please try again.')
    }
  }

  const submitInterviewAnswer = () => {
    const trimmed = answer.trim()
    if (!trimmed || !adaptiveInterview?.currentQuestion) return
    const submitted = submitAdaptiveInterviewAnswer(adaptiveInterview, trimmed)
    if (!submitted.ok) return
    setAdaptiveInterview(submitted.state)
    setAnswer('')
    setInterviewStatus('processing')
  }

  const restartAdaptiveQuestions = () => {
    const restarted = startAdaptiveInterview({
      goalType: goal,
      goal: outcome.trim(),
      role: role.trim(),
      weeklyMinutes: Math.max(15, Math.min(1_200, (Number(hours) || 1) * 60)),
      blocker: blocker.trim(),
    })
    if (!restarted.ok) return
    setAdaptiveInterview(restarted.state)
    setUnderstanding([])
    setAnswer('')
    setInterviewStatus('agent')
    setStage('interview')
  }

  const endInterviewAndReview = () => {
    stopMicrophone()
    if (!adaptiveInterview || adaptiveInterview.turns.length === 0) return
    setUnderstanding(buildUnderstandingFromInterview(adaptiveInterview, outcome, hours, blocker))
    setInterviewStatus('agent')
    setStage('understanding')
  }

  const updateUnderstanding = (id: string, value: string) => {
    setUnderstanding(items => items.map(item => item.id === id ? { ...item, value } : item))
  }

  const buildAssessment = async () => {
    if (!sessionId) {
      setAnalysisState('error')
      setAnalysisError('This assessment session is missing. Return to your profile and start again.')
      return
    }
    if (understanding.filter(item => item.value.trim()).length < 2) {
      setAnalysisState('error')
      setAnalysisError('Add at least two reviewed responses before building your report.')
      return
    }
    if (sessionOwned && reviewedGoal !== outcome.trim()) {
      setAnalysisState('error')
      setAnalysisError('A saved assessment cannot change its goal after the session starts. Return to your profile to start a new assessment with this corrected goal.')
      return
    }
    setAnalysisState('running')
    setAnalysisError('')
    try {
      const report = await analyzeReviewedAssessment({
        assessmentSessionId: sessionId,
        goal: reviewedGoal,
        goalType: goal,
        weeklyHours: Number(hours) || 1,
        reviewedInputs: understanding.map(item => ({ id: item.id, value: item.value })),
      })
      setAssessmentReport(report)
      setPlanHours(hours)
      setPendingPlanHours(hours)
      setAnalysisState('ready')
      setStage('results')
    } catch (error) {
      setAnalysisState('error')
      setAnalysisError(error instanceof AIPathApiError ? error.message : 'The report could not be generated. Your reviewed responses are still available.')
    }
  }

  const toggleTask = (key: string) => {
    setCompletedTasks(tasks => ({ ...tasks, [key]: !tasks[key] }))
  }

  const restartForReassessment = () => {
    setAssessmentReport(null)
    setAnalysisState('idle')
    setSessionId(null)
    setSessionOwned(false)
    setSessionPersistence('none')
    setAdaptiveInterview(null)
    setUnderstanding([])
    setAnswer('')
    setCompletedTasks({})
    setTaskOverrides({})
    setCheckIn('')
    setCheckInProposal(null)
    setAdaptationStatus('')
    setPlanSaved(false)
    setDataActionState('idle')
    setDataActionMessage('')
    setInterviewStatus('agent')
    setStage('profile')
  }

  const clearPreview = () => {
    stopMicrophone()
    setUnderstanding([])
    setCompletedTasks({})
    setPlanSaved(false)
    setSessionId(null)
    setSessionOwned(false)
    setSessionPersistence('none')
    setSessionState('idle')
    setSessionError('')
    setAssessmentReport(null)
    setAnalysisState('idle')
    setAnalysisError('')
    setPrivacyAccepted(false)
    setPrivacyOpen(false)
    setTaskOverrides({})
    setCheckIn('')
    setCheckInProposal(null)
    setAdaptationStatus('')
    setDataActionState('idle')
    setDataActionMessage('')
    setAnswer('')
    setAdaptiveInterview(null)
    setInterviewStatus('agent')
    setStage('landing')
  }

  const deletePreview = async () => {
    if (sessionOwned && sessionId) {
      setDataActionState('working')
      setDataActionMessage('Deleting the owned server session…')
      try {
        await deleteOwnedSession(sessionId)
      } catch (error) {
        setDataActionState('error')
        setDataActionMessage(error instanceof AIPathApiError ? error.message : 'The server session could not be deleted. Browser data was not cleared.')
        return
      }
    }
    clearPreview()
  }

  const downloadJson = (value: unknown, filename: string) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportPlan = async () => {
    setDataActionState('working')
    setDataActionMessage('Preparing your export…')
    try {
      const serverExport = sessionOwned && sessionId ? await exportOwnedSession(sessionId) : null
      downloadJson({
        exportedAt: new Date().toISOString(),
        source: serverExport ? sessionPersistence : 'browser-preview',
        session: serverExport?.session ?? { id: sessionId, goal: outcome, targetRole: role },
        report: serverExport?.session.report ?? assessmentReport,
        plan: { goalType: goal, weeklyHours: Number(planHours), schedule: scheduledWeeks, completedTasks, taskOverrides, checkInProposal, adaptationStatus },
      }, 'ai-path-plan.json')
      setDataActionState('done')
      setDataActionMessage('Export prepared. It includes the report and current browser plan state.')
    } catch (error) {
      setDataActionState('error')
      setDataActionMessage(error instanceof AIPathApiError ? error.message : 'The export could not be prepared.')
    }
  }

  const confirmTimeBudget = () => {
    setPlanHours(pendingPlanHours)
    setCompletedTasks({})
    setTaskOverrides({})
    setCheckIn('')
    setCheckInProposal(null)
    setAdaptationStatus(`Time budget changed to ${pendingPlanHours} ${pendingPlanHours === '1' ? 'hour' : 'hours'} per week. Browser-only task completion was reset for the recalculated schedule.`)
  }

  const submitCheckIn = () => {
    if (checkIn.trim().length < 10) return
    setCheckInProposal(proposeCheckInAdaptation(checkIn))
    setAdaptationStatus('Review the proposed adaptation. Nothing changes until you accept it.')
  }

  const decideAdaptation = (accepted: boolean) => {
    if (!checkInProposal) return
    if (accepted && checkInProposal.action !== 'protect-pace') {
      const nextTask = scheduledWeeks.flatMap((week, weekIndex) => week.tasks.map((task, taskIndex) => ({ task, weekIndex, taskIndex })))
        .find(({ weekIndex, taskIndex }) => !completedTasks[`${weekIndex}-${taskIndex}`])
      if (nextTask) {
        const key = `${nextTask.weekIndex}-${nextTask.taskIndex}`
        const replacement = checkInProposal.action === 'reduce-scope'
          ? taskSwapAlternative(goal, nextTask.weekIndex, nextTask.task)
          : checkInProposal.action === 'unblock'
            ? `Run a 30-minute diagnostic: reproduce one failure in “${nextTask.task}”, record the expected result, and change one variable.`
            : `${nextTask.task} Then test one harder example without adding a new tool.`
        setTaskOverrides(overrides => ({ ...overrides, [key]: replacement }))
      }
    }
    setAdaptationStatus(accepted ? `Accepted: ${checkInProposal.title}. The next incomplete task now reflects this decision.` : 'Proposal rejected. The current plan remains unchanged.')
    setCheckInProposal(null)
    setCheckIn('')
  }

  return (
    <div className="ap-shell">
      <FlowHeader stage={stage} onNavigate={navigate} canViewHistory={Boolean(assessmentReport)} />

      {stage === 'landing' && (
        <section className="ap-landing">
          <div className="ap-ambient ap-ambientOne" />
          <div className="ap-ambient ap-ambientTwo" />
          <div className="ap-landingGrid">
            <div className="ap-heroCopy">
              <div className="ap-privatePill"><span /> Private alpha · Your feedback shapes the product</div>
              <h1 ref={headingRef} tabIndex={-1}>Find your next <em>useful</em>{' '}AI move.</h1>
              <p className="ap-heroLead">Answer five to seven evidence-seeking questions. Leave with a transparent preview of how a realistic 30-day plan could use your goal, experience, and available time.</p>
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
                <div className="ap-previewTop"><span>Example direction</span><span>5–7 adaptive questions</span></div>
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
              <div className="ap-timeNote"><span>About 5 minutes</span><small>Then you will answer five to seven adaptive questions.</small></div>
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
                  <input value={role} onChange={event => setRole(event.target.value)} maxLength={160} placeholder="For example, operations manager in healthcare" />
                </label>
                <label className="ap-field ap-fieldWide">
                  <span>What would you like to be able to do?</span>
                  <textarea value={outcome} onChange={event => setOutcome(event.target.value)} maxLength={1200} rows={4} placeholder="Describe a real outcome, workflow, or proof you want to create." />
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
                  <textarea value={blocker} onChange={event => setBlocker(event.target.value)} maxLength={600} rows={3} />
                </label>
              </div>

              <label className="ap-consent">
                <input type="checkbox" checked={privacyAccepted} onChange={event => setPrivacyAccepted(event.target.checked)} />
                <span><strong>I agree to send my typed responses to this app&apos;s server to create the report.</strong><small>No audio or live AI model is used in this build. Avoid sensitive work information. This private alpha does not persist sessions unless an account store is explicitly enabled; when enabled, session/report data expires after at most 90 days and can be exported or deleted.</small></span>
              </label>

              <div className="ap-formFooter">
                <p><span>{selectedGoal.title}</span> · {hourLabel(hours)} a week · {codingComfort}</p>
                <div className="ap-heroActions">
                  <button type="button" className="ap-quietButton" onClick={() => setStage('setup')} disabled={!profileReady}>Preview future voice setup</button>
                  <PrimaryButton onClick={continueWithText} disabled={!profileReady || sessionState === 'starting'}>{sessionState === 'starting' ? 'Starting session…' : 'Start guided questions'}</PrimaryButton>
                </div>
              </div>
              {sessionError && <div className="ap-error" role="alert"><div><strong>We could not start the session.</strong><p>{sessionError}</p></div><button type="button" onClick={continueWithText}>Try again</button></div>}
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
                <button type="button" className="ap-primary ap-fullButton" onClick={micState === 'ready' ? continueWithText : requestMicrophone} disabled={micState === 'requesting' || sessionState === 'starting'}>
                  {sessionState === 'starting' ? 'Starting session…' : micState === 'ready' ? 'Continue with text' : micState === 'requesting' ? 'Checking…' : 'Test microphone permission'}
                  {micState === 'ready' ? <ArrowIcon /> : <MicIcon />}
                </button>
                <button type="button" className="ap-textChoice" onClick={continueWithText} disabled={sessionState === 'starting'}>Continue with the complete text experience</button>
              </div>
              <div className="ap-expectCard">
                <p className="ap-kicker">What to expect</p>
                <ol>
                  <li><span>01</span><div><strong>We start with your goal</strong><small>No trivia or surprise test questions.</small></div></li>
                  <li><span>02</span><div><strong>We ask for one real example</strong><small>Beginners can use a scenario instead of a project.</small></div></li>
                  <li><span>03</span><div><strong>You review what we heard</strong><small>Correct anything before the plan is generated.</small></div></li>
                </ol>
                <div className="ap-privacyNote"><strong>Voice is not live in this build.</strong><span>The permission test does not connect to a model or store audio. Typed answers are sent to the app server only when you build the report.</span></div>
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
              <p className="ap-eyebrow">Question {questionOrdinal} of up to {AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS}</p>
              <strong>{interviewPhase(currentQuestion)}</strong>
            </div>
            <div className="ap-phaseTrack" role="progressbar" aria-valuemin={1} aria-valuemax={AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS} aria-valuenow={questionOrdinal} aria-label={`Adaptive interview question ${questionOrdinal} of up to ${AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS}`}>
              {Array.from({ length: AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS }, (_, index) => <i key={index} className={index < questionOrdinal ? 'is-active' : ''} />)}
            </div>
            <span className="ap-duration">Typed prototype · no live model</span>
          </div>

          <div className="ap-interviewGrid">
            <aside className="ap-journeyPanel">
              <p className="ap-kicker">Conversation outline</p>
              <ol>
                {Array.from({ length: AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS }, (_, index) => {
                  const answeredTurn = adaptiveInterview?.turns[index]
                  const isCurrent = index === (adaptiveInterview?.turns.length ?? 0) && Boolean(currentQuestion)
                  const label = answeredTurn
                    ? interviewPhase({ dimensions: answeredTurn.dimensionsProbed })
                    : isCurrent ? interviewPhase(currentQuestion) : 'Evidence-driven follow-up'
                  return (
                  <li key={`${label}-${index}`} className={answeredTurn ? 'is-complete' : isCurrent ? 'is-current' : ''}>
                    <span>{answeredTurn ? <CheckIcon /> : index + 1}</span>
                    <div><strong>{label}</strong><small>{answeredTurn ? 'Answer captured' : isCurrent ? 'Selected from the evidence gaps' : 'Only asked if evidence is still missing'}</small></div>
                  </li>
                  )
                })}
              </ol>
              <div className="ap-signalCard">
                <span>What I am testing</span>
                <p>{currentQuestion?.purpose ?? 'Whether the captured evidence is ready for your review.'}</p>
              </div>
            </aside>

            <div className="ap-conversationPanel">
              <div className="ap-advisorQuestion">
                <div className={`ap-agentPulse is-${interviewStatus}`} aria-hidden="true"><span /><i /><b /></div>
                <div>
                  <p>{currentQuestion ? 'Ask for evidence, not confidence' : 'Preparing your review'}</p>
                  <h1 ref={headingRef} tabIndex={-1} aria-live="polite" aria-atomic="true">{currentQuestion?.prompt ?? 'Your evidence-seeking conversation is complete.'}</h1>
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
                    <textarea id="ap-answer" value={answer} onChange={event => setAnswer(event.target.value)} maxLength={2000} rows={6} placeholder="Type your answer here…" />
                    <p className="ap-helperText">{currentQuestion?.purpose ?? 'Your answers are being prepared for the editable review.'}</p>
                    <p className="ap-helperText">It is valid to say that evidence does not exist yet; the report will leave that area unassessed.</p>
                    <div className="ap-answerControls">
                      <span className="ap-talkButton" aria-disabled="true"><MicIcon /> Voice coming after privacy testing</span>
                      <button type="button" className="ap-secondary" onClick={submitInterviewAnswer} disabled={interviewStatus === 'processing' || !currentQuestion || answer.trim().length === 0}>{interviewStatus === 'processing' ? 'Preparing the next question…' : 'Send typed answer'}</button>
                    </div>
                  </>
                )}
              </div>

              <div className="ap-sessionControls">
                <button type="button" aria-pressed={captions} onClick={() => setCaptions(value => !value)}><CaptionsIcon /> {captions ? 'Transcript preview on' : 'Transcript preview off'}</button>
                <button type="button" onClick={() => setInterviewStatus('paused')}><PauseIcon /> Pause</button>
                <button type="button" className="ap-endButton" onClick={endInterviewAndReview} disabled={!adaptiveInterview?.turns.length}>End & review</button>
              </div>
            </div>
          </div>
          <p className="ap-interviewPrivacy">This build is text-only and does not call a live model. You can review and edit the captured evidence summary before the assessment uses it.</p>
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
                    <textarea aria-label={`Edit ${item.label}`} value={item.value} onChange={event => updateUnderstanding(item.id, event.target.value)} maxLength={2000} rows={5} />
                  ) : <p className="ap-reviewedValue">{item.value}</p>}
                  <details>
                    <summary>Why I think this</summary>
                    <p>{item.evidence}</p>
                  </details>
                  <button type="button" className="ap-editButton" onClick={() => setEditingId(editingId === item.id ? null : item.id)}>{editingId === item.id ? 'Save correction' : 'Edit this'}</button>
                </article>
              ))}
            </div>

            <div className="ap-reviewFooter">
              <div><strong>Anything important still missing?</strong><p>Revise any answer before the server builds a conservative report from this reviewed understanding.</p></div>
              <button type="button" className="ap-secondary" onClick={restartAdaptiveQuestions}>Restart adaptive questions</button>
              <PrimaryButton onClick={buildAssessment} disabled={analysisState === 'running'}>{analysisState === 'running' ? 'Building the evidence-informed report…' : 'Use this to build my report'}</PrimaryButton>
            </div>
            {analysisError && <div className="ap-error" role="alert"><div><strong>We could not build the report.</strong><p>{analysisError}</p></div><button type="button" onClick={buildAssessment}>Try again</button></div>}
          </div>
        </section>
      )}

      {stage === 'results' && (
        <section className="ap-results">
          <div className="ap-resultsHero">
            <BackButton onClick={() => setStage('understanding')}>Edit what we understood</BackButton>
            <div className="ap-privatePill"><span /> Deterministic assessment · report {assessmentReport?.reportVersion ?? 'unavailable'}</div>
            <div className="ap-resultsHeroGrid">
              <div>
                <p className="ap-eyebrow">Your priority now</p>
                <h1 ref={headingRef} tabIndex={-1}>Working direction: <em>{selectedGoal.title.toLowerCase()}.</em></h1>
                <p>This report uses only the responses you reviewed. Application-owned rules score transcript-linked evidence and select from the curated catalog; no live model or hidden voice analysis is involved.</p>
                <div className="ap-evidenceInline"><span><CheckIcon /></span><p><strong>{assessedCount} skills assessed</strong> from {understanding.length} reviewed inputs; the rest remain explicitly unassessed.</p></div>
              </div>
              <aside className="ap-nextMove">
                <span>30-day proof</span>
                <h2>{plan.proof}</h2>
                <dl>
                  <div><dt>Time</dt><dd>{hourLabel(hours)} / week</dd></div>
                  <div><dt>Approach</dt><dd>{personalizedPlan?.profile.codingMode === 'code-ready' ? 'Bounded code build' : personalizedPlan?.profile.codingMode === 'no-code' ? 'No-code first' : 'Visual first, light code'}</dd></div>
                  <div><dt>Pace</dt><dd>{personalizedPlan?.profile.pace ?? 'Preview'}</dd></div>
                  <div><dt>Status</dt><dd>Self-report signals</dd></div>
                </dl>
                <PrimaryButton onClick={() => setStage('plan')}>Open my 30-day plan</PrimaryButton>
              </aside>
            </div>
          </div>

          <div className="ap-resultsBody">
            <section className="ap-resultSection ap-nowNotYet">
              <div className="ap-sectionHeading"><p className="ap-kicker">Direction</p><h2>What to learn now—and what can wait.</h2></div>
              <div className="ap-directionGrid">
                <article><span className="ap-doDot" /><p className="ap-kicker">Focus now</p><h3>{plan.focusNow}</h3></article>
                <article><span className="ap-waitDot" /><p className="ap-kicker">Not yet</p><h3>{plan.notYet}</h3></article>
              </div>
            </section>

            <section className="ap-resultSection">
              <div className="ap-sectionHeading"><p className="ap-kicker">Skill observations</p><h2>No evidence, no score.</h2><p>Every assessed stage is linked to reviewed learner input. Missing evidence stays “not assessed.”</p></div>
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
              <div className="ap-sectionHeading"><p className="ap-kicker">Curated recommendation stack</p><h2>Only what fits the evidence and time budget.</h2><p>These resources were selected deterministically from the versioned catalog after prerequisite and time checks.</p></div>
              <div className="ap-resourceGrid">
                {recommendations.map((resource, index) => (
                  <article key={resource.title}>
                    <div className="ap-resourceIndex">0{index + 1}</div>
                    <p className="ap-kicker">{resource.format}</p>
                    <h3>{resource.title}</h3>
                    <span>{resource.provider} · {resource.estimatedHours} hours · {resource.free ? 'Free' : 'Paid'}</span>
                    <p>{resource.reason}</p>
                    <small className="ap-costDisclosure">{resource.costDisclosure}</small>
                    <div>{resource.canonicalUrl ? <a href={resource.canonicalUrl} target="_blank" rel="noreferrer">Open resource</a> : <span>Project brief included in the plan</span>}</div>
                  </article>
                ))}
              </div>
              {recommendations.length === 0 && (
                <div className="ap-emptyState" role="status">
                  <strong>No governed resource fits this report yet.</strong>
                  <p>{assessmentReport?.recommendationStatus === 'catalog_unavailable' ? 'The catalog is unavailable or stale, so the advisor failed closed instead of showing an unchecked link.' : 'The current evidence, prerequisites, format, and time filters produced no eligible match. Your project plan is still available.'}</p>
                </div>
              )}
            </section>

            <div className="ap-resultsCta">
              <div><p className="ap-kicker">Ready when you are</p><h2>Your first task takes about 45 minutes.</h2><p>{plan.firstTask}.</p></div>
              <PrimaryButton onClick={() => setStage('plan')}>Open my 30-day plan</PrimaryButton>
            </div>
          </div>
        </section>
      )}

      {stage === 'plan' && (
        <section className="ap-plan">
          <div className="ap-planHeader">
            <BackButton onClick={() => setStage('results')}>Back to direction</BackButton>
            <div className="ap-privatePill"><span /> Illustrative 30-day plan · browser preview</div>
            <div className="ap-planTitle">
              <div><p className="ap-eyebrow">Your 30-day plan</p><h1 ref={headingRef} tabIndex={-1}>{plan.title}</h1><p>Four weeks · {hourLabel(planHours)} per week · {totalTasks} concrete actions</p></div>
              <div className="ap-progressRing" style={{ '--ap-progress': `${progress * 3.6}deg` } as React.CSSProperties}><span><strong>{progress}%</strong><small>complete</small></span></div>
            </div>
            <div className="ap-planActions">
              <button type="button" className="ap-secondary" onClick={() => setPlanSaved(value => !value)}>{planSaved ? 'Pinned in this browser tab' : 'Pin in this browser tab'}</button>
              <button type="button" className="ap-quietButton" onClick={exportPlan} disabled={dataActionState === 'working'}>Export report & plan</button>
              <button type="button" className="ap-quietButton" onClick={() => setStage('history')}>View preview history</button>
            </div>
            <div className="ap-planSettings">
              <label><span>Weekly time budget</span><select value={pendingPlanHours} onChange={event => setPendingPlanHours(event.target.value)}><option value="1">1 hour</option><option value="3">2–3 hours</option><option value="5">4–6 hours</option><option value="7">7+ hours</option></select></label>
              <button type="button" className="ap-secondary" onClick={confirmTimeBudget} disabled={pendingPlanHours === planHours}>Confirm schedule change</button>
              <small>Changing the schedule resets browser-only task completion. It does not change your assessment.</small>
            </div>
            {(dataActionMessage || adaptationStatus) && <p className={`ap-liveStatus is-${dataActionState}`} role="status" aria-live="polite">{dataActionMessage || adaptationStatus}</p>}
          </div>

          <div className="ap-planBody">
            {personalizedPlan && (
              <aside className="ap-planRationale" aria-labelledby="ap-plan-rationale-title">
                <div><p className="ap-kicker">Why this plan changed</p><h2 id="ap-plan-rationale-title">Your evidence and constraints set the sequence.</h2></div>
                <ul>
                  {personalizedPlan.reasons.slice(0, 5).map(reason => <li key={reason.id}>{reason.detail}</li>)}
                </ul>
              </aside>
            )}
            <div className="ap-nextAction">
              <div><span>Next action</span><h2>{plan.firstTask}.</h2><p>About 45 minutes · Produces the first inspectable artifact in this plan.</p></div>
              <button type="button" className="ap-primary" onClick={() => toggleTask('0-0')}>{completedTasks['0-0'] ? 'Marked complete' : 'Start first task'}<ArrowIcon /></button>
            </div>

            <div className="ap-weekList">
              {scheduledWeeks.map((week, weekIndex) => {
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
                        const displayedTask = taskOverrides[key] ?? task
                        return <li key={task}><label><input type="checkbox" checked={Boolean(completedTasks[key])} onChange={() => toggleTask(key)} /><span><CheckIcon /></span><strong>{displayedTask}</strong><small>{taskIndex === 0 ? '45 min' : '30–45 min'}</small></label></li>
                      })}
                    </ul>
                    <div className="ap-weekFooter"><button type="button" onClick={() => setTaskOverrides(overrides => { const next = { ...overrides }; week.tasks.forEach((task, taskIndex) => { const key = `${weekIndex}-${taskIndex}`; next[key] = taskSwapAlternative(goal, weekIndex, task) }); return next })}>Use smaller alternatives this week</button><button type="button" onClick={() => setTaskOverrides(overrides => { const next = { ...overrides }; week.tasks.forEach((_, taskIndex) => delete next[`${weekIndex}-${taskIndex}`]); return next })}>Restore original tasks</button></div>
                  </article>
                )
              })}
            </div>

            <div className="ap-checkinCard">
              <div className="ap-checkinIcon"><MicIcon /></div>
              <div><p className="ap-kicker">Weekly check-in</p><h2>Tell us what survived contact with your calendar.</h2><p>A short text check-in can propose a smaller, harder, or unchanged next week. Your plan never changes without your approval.</p><label className="ap-checkinField"><span>What worked, and what got in the way?</span><textarea value={checkIn} onChange={event => setCheckIn(event.target.value)} maxLength={1000} rows={4} placeholder="For example: I finished the first task, but the second was too large for one evening." /></label>{checkInProposal && <div className="ap-adaptationProposal"><strong>{checkInProposal.title}</strong><p>{checkInProposal.explanation}</p><div><button type="button" className="ap-primary" onClick={() => decideAdaptation(true)}>Accept proposal</button><button type="button" className="ap-secondary" onClick={() => decideAdaptation(false)}>Keep current plan</button></div></div>}</div>
              <button type="button" className="ap-secondary" onClick={submitCheckIn} disabled={checkIn.trim().length < 10 || Boolean(checkInProposal)}>Propose an adaptation</button>
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
                <h2>{plan.title}</h2>
                <p>{outcome}</p>
                <dl><div><dt>Progress</dt><dd>{progress}%</dd></div><div><dt>Time budget</dt><dd>{planHours} hrs / week</dd></div><div><dt>New evidence</dt><dd>{completedCount} tasks</dd></div></dl>
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
          <p>Text-only private alpha. Reviewed responses are sent to the app server; never share sensitive work information.</p>
          <div><button type="button" aria-expanded={privacyOpen} onClick={() => setPrivacyOpen(value => !value)}>Privacy summary</button><button type="button" onClick={deletePreview}>Delete browser preview</button></div>
          {privacyOpen && <aside className="ap-privacySummary"><strong>Private-alpha data use</strong><p>Typed profile and reviewed answers are sent to this app&apos;s server to create a deterministic report. This build does not call a live AI model or upload microphone audio. Without an enabled account store, the server does not save the session. If durable storage is later enabled, owner-scoped session/report data expires within 90 days and supports export and deletion. Server security logs and aggregate, transcript-free metrics may follow separate operational retention.</p></aside>}
        </footer>
      )}
    </div>
  )
}
