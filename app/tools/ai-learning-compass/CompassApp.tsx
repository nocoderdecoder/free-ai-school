'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  initialQuestion,
  isCompassAnalysis,
  isInterviewTurn,
  questionCount,
  serializeAnalysis,
  type CompassAnalysis,
  type CompassAnswer,
  type CompassQuestion,
  type InterviewProfile,
} from '../../lib/aiCompass'
import { CompassResult } from './CompassResult'

type SpeechResult = { readonly isFinal: boolean; readonly 0: { transcript: string } }
type SpeechEvent = { resultIndex: number; results: { length: number; [index: number]: SpeechResult } }
type SpeechError = { error: string }
type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: SpeechError) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type RecognitionConstructor = new () => Recognition
type View = 'landing' | 'questions' | 'synthesis' | 'result'

const synthesisPhases = [
  'Separating goals from assumptions',
  'Calibrating your current capability',
  'Finding the highest-leverage gaps',
  'Building tasks, evidence, and sequence',
  'Stress-testing the 30-day plan',
]

const cardStyle: React.CSSProperties = { border: '1px solid var(--ed-border)', backgroundColor: 'var(--ed-card-warm)' }
const ctaStyle: React.CSSProperties = { backgroundColor: 'var(--ed-cta)', color: 'var(--ed-bg)' }

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const speechWindow = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

function ArrowIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

function MicIcon({ stop = false }: { stop?: boolean }) {
  return stop
    ? <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
    : <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" /></svg>
}

function CompassMark() {
  return <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-300 text-black"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg></span>
}

function delay(milliseconds: number) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds))
}

async function requestCompass(mode: 'next' | 'analysis', answers: CompassAnswer[]) {
  const response = await fetch('/api/tools/ai-learning-compass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, answers }),
  })
  const data = await response.json() as unknown
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? String(data.error) : 'Something went wrong.'
    throw new Error(message)
  }
  return data
}

export function CompassApp() {
  const [view, setView] = useState<View>('landing')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [question, setQuestion] = useState<CompassQuestion>(initialQuestion)
  const [answers, setAnswers] = useState<CompassAnswer[]>([])
  const [answer, setAnswer] = useState('')
  const [acknowledgement, setAcknowledgement] = useState('')
  const [interpretation, setInterpretation] = useState('')
  const [interviewProfile, setInterviewProfile] = useState<InterviewProfile | null>(null)
  const [analysis, setAnalysis] = useState<CompassAnalysis | null>(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [synthesisElapsed, setSynthesisElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const recognitionRef = useRef<Recognition | null>(null)
  const wantsRecordingRef = useRef(false)
  const transcriptRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const synthesisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speechAvailable = useMemo(() => Boolean(recognitionConstructor()), [])
  const words = answer.trim().split(/\s+/).filter(Boolean).length

  useEffect(() => () => {
    wantsRecordingRef.current = false
    recognitionRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    if (synthesisTimerRef.current) clearInterval(synthesisTimerRef.current)
  }, [])

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const stopRecording = () => {
    wantsRecordingRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const createRecognition = () => {
    const Constructor = recognitionConstructor()
    if (!Constructor || !wantsRecordingRef.current) return
    const recognizer = new Constructor()
    recognitionRef.current = recognizer
    recognizer.continuous = true
    recognizer.interimResults = true
    recognizer.lang = navigator.language || 'en-US'
    recognizer.onresult = event => {
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript
        if (event.results[index].isFinal) transcriptRef.current = `${transcriptRef.current} ${text}`.trim()
        else interim += text
      }
      setAnswer(`${transcriptRef.current}${interim ? ` ${interim}` : ''}`.trim())
    }
    recognizer.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopRecording()
        flash('Microphone access was not available. You can type instead.')
      }
    }
    recognizer.onend = () => {
      if (wantsRecordingRef.current) window.setTimeout(createRecognition, 120)
    }
    try { recognizer.start() } catch { stopRecording() }
  }

  const startRecording = () => {
    if (!speechAvailable) return flash('Voice transcription is unavailable here. You can type your answer.')
    transcriptRef.current = answer.trim()
    wantsRecordingRef.current = true
    setRecording(true)
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(value => value + 1), 1000)
    createRecognition()
  }

  const runFinalAnalysis = async (completedAnswers: CompassAnswer[]) => {
    setView('synthesis')
    setSynthesisElapsed(0)
    synthesisTimerRef.current = setInterval(() => setSynthesisElapsed(value => value + 1), 1000)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      const [data] = await Promise.all([requestCompass('analysis', completedAnswers), delay(15000)])
      if (!isCompassAnalysis(data)) throw new Error('The roadmap response was incomplete. Please try again.')
      setAnalysis(data)
      setView('result')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setAnswers(completedAnswers.slice(0, -1))
      setAnswer(completedAnswers.at(-1)?.text ?? '')
      setView('questions')
      setQuestionIndex(questionCount - 1)
      flash(error instanceof Error ? error.message : 'I could not build the roadmap. Please try again.')
    } finally {
      if (synthesisTimerRef.current) clearInterval(synthesisTimerRef.current)
      synthesisTimerRef.current = null
      setLoading(false)
    }
  }

  const submitAnswer = async () => {
    const trimmed = answer.trim()
    if (trimmed.length < 20 || loading) return
    if (recording) stopRecording()
    const completed: CompassAnswer = {
      questionId: question.id,
      question: question.prompt,
      focus: question.focus,
      text: trimmed,
    }
    const nextAnswers = [...answers, completed]
    setAnswers(nextAnswers)
    setLoading(true)

    if (nextAnswers.length === questionCount) {
      await runFinalAnalysis(nextAnswers)
      return
    }

    try {
      const data = await requestCompass('next', nextAnswers)
      if (!isInterviewTurn(data)) throw new Error('The next question was incomplete. Please try again.')
      setAcknowledgement(data.acknowledgement)
      setInterpretation(data.interpretation)
      setInterviewProfile(data.profile)
      setQuestion(data.nextQuestion)
      setQuestionIndex(nextAnswers.length)
      setAnswer('')
      transcriptRef.current = ''
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setAnswers(answers)
      flash(error instanceof Error ? error.message : 'I could not generate the next question. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const restart = () => {
    stopRecording()
    setQuestionIndex(0)
    setQuestion(initialQuestion)
    setAnswers([])
    setAnswer('')
    setAcknowledgement('')
    setInterpretation('')
    setInterviewProfile(null)
    setAnalysis(null)
    setSynthesisElapsed(0)
    setNotice('')
    setView('questions')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const copyRoadmap = async () => {
    if (!analysis) return
    try {
      await navigator.clipboard.writeText(serializeAnalysis(analysis))
      flash('Complete execution pack copied')
    } catch {
      flash('Copy was blocked. Use Save as PDF instead.')
    }
  }

  const shareRoadmap = async () => {
    if (!analysis) return
    const completePlan = serializeAnalysis(analysis)
    const share = { title: 'My AI Learning Compass', text: completePlan }
    if (navigator.share) {
      try {
        await navigator.share(share)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        flash('Sharing was blocked. Try Copy complete plan instead.')
      }
    } else {
      try {
        await navigator.clipboard.writeText(completePlan)
        flash('Complete plan copied for sharing')
      } catch {
        flash('Sharing was blocked. Try Save as PDF instead.')
      }
    }
  }

  if (view === 'landing') return (
    <section className="relative isolate overflow-hidden px-6 py-16 sm:px-8 sm:py-24">
      <div className="pointer-events-none absolute -left-40 top-0 -z-10 h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-40 top-20 -z-10 h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.06fr_.94fr]">
        <div>
          <div className="mb-8 flex items-center gap-3 text-sm font-medium" style={{ color: 'var(--ed-text-secondary)' }}><CompassMark /> AI Learning Compass</div>
          <p className="section-label mb-5" style={{ color: 'var(--ed-text-faint)' }}>An adaptive five-question voice assessment</p>
          <h1 className="max-w-4xl text-5xl font-bold leading-[.97] tracking-[-.055em] sm:text-7xl lg:text-[86px]" style={{ color: 'var(--ed-text-dark)' }}>Find the AI path that fits <span className="text-emerald-600">your work.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed sm:text-xl" style={{ color: 'var(--ed-text-secondary)' }}>Every question changes based on your answer. You will leave with the exact tools, setup, steps, prompts, tests, fallbacks, and proof for your next 30-day capability jump.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button onClick={() => setView('questions')} className="btn-press inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold transition hover:opacity-90" style={ctaStyle}>Start your assessment <ArrowIcon /></button>
            <span className="text-xs" style={{ color: 'var(--ed-text-faint)' }}>About 7 minutes · Voice or text · No sign-up</span>
          </div>
        </div>
        <div className="rotate-1 rounded-3xl p-7 shadow-2xl sm:p-9" style={{ border: '1px solid var(--ed-border)', backgroundColor: '#fff' }}>
          <p className="section-label" style={{ color: 'var(--ed-text-faint)' }}>Not a personality quiz</p>
          <h2 className="mt-5 text-3xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>A prescription built from evidence</h2>
          <div className="mt-7 space-y-3">
            {[
              ['1', 'Adaptive interview', 'The next question targets what is still unclear.'],
              ['2', 'Deep synthesis', 'Your goal, proof, constraints, and domain are analyzed together.'],
              ['3', 'Guided execution pack', 'Every step shows what to open, do, copy, expect, test, and save.'],
            ].map(([number, title, copy]) => <div key={number} className="grid grid-cols-[36px_1fr] gap-4 rounded-xl p-4" style={cardStyle}><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-300 text-xs font-bold text-black">{number}</span><div><p className="text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{title}</p><p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{copy}</p></div></div>)}
          </div>
        </div>
      </div>
    </section>
  )

  if (view === 'synthesis') {
    const activePhase = Math.min(Math.floor(synthesisElapsed / 3), synthesisPhases.length - 1)
    return <section className="relative isolate min-h-[72vh] overflow-hidden px-6 py-20 sm:px-8 sm:py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/10 blur-[100px]" />
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-300/40 bg-emerald-50">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
        <p className="section-label mt-8" style={{ color: 'var(--ed-text-faint)' }}>Building your learning prescription</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl" style={{ color: 'var(--ed-text-dark)' }}>Your answers deserve more than an instant template.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>I’m comparing your destination, demonstrated experience, domain workflow, technical baseline, and constraints before deciding what belongs in your plan.</p>
        <div className="mx-auto mt-10 max-w-xl rounded-2xl p-6 text-left" style={cardStyle}>
          <div className="flex items-center justify-between text-xs"><span className="font-medium" style={{ color: 'var(--ed-text-secondary)' }}>Analysis in progress</span><span className="tabular-nums" style={{ color: 'var(--ed-text-faint)' }}>{synthesisElapsed < 18 ? `${18 - synthesisElapsed}s` : 'Finishing…'}</span></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--ed-border)' }}><div className="h-full rounded-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(96, ((synthesisElapsed + 1) / 18) * 100)}%` }} /></div>
          <ol className="mt-6 space-y-3">
            {synthesisPhases.map((phase, index) => <li key={phase} className="flex items-center gap-3 text-sm transition" style={{ color: index < activePhase ? '#059669' : index === activePhase ? 'var(--ed-text-dark)' : 'var(--ed-text-light)' }}><span className="grid h-6 w-6 place-items-center rounded-full border text-[10px]" style={{ borderColor: index <= activePhase ? '#6ee7b7' : 'var(--ed-border)' }}>{index < activePhase ? '✓' : index + 1}</span>{phase}</li>)}
          </ol>
        </div>
      </div>
    </section>
  }

  if (view === 'questions') return (
    <section className="px-6 py-12 sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[250px_1fr] lg:gap-20">
        <aside>
          <div className="flex justify-between text-xs font-medium" style={{ color: 'var(--ed-text-secondary)' }}><span>Adaptive interview</span><span>{questionIndex + 1} of {questionCount}</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--ed-border)' }}><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${((questionIndex + 1) / questionCount) * 100}%` }} /></div>
          {interviewProfile && <div className="mt-7 rounded-2xl p-5" style={cardStyle}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">What I understand</p>
            <p className="mt-3 text-sm font-medium leading-relaxed" style={{ color: 'var(--ed-text-dark)' }}>{interviewProfile.oneLineGoal}</p>
            <dl className="mt-4 space-y-3">{interviewProfile.knownSignals.slice(0, 4).map(signal => <div key={`${signal.label}-${signal.value}`}><dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ed-text-faint)' }}>{signal.label}</dt><dd className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>{signal.value}</dd></div>)}</dl>
          </div>}
          <p className="mt-6 border-t pt-5 text-[11px] leading-relaxed" style={{ borderColor: 'var(--ed-border)', color: 'var(--ed-text-faint)' }}>Your text is sent securely to the assessment model to generate the next question and roadmap. This site does not save your answers.</p>
        </aside>
        <div>
          <p className="section-label mb-5" style={{ color: 'var(--ed-text-faint)' }}><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />{question.eyebrow}</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl" style={{ color: 'var(--ed-text-dark)' }}>{question.prompt}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{question.helper}</p>
          {acknowledgement && <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text)' }}><span className="font-semibold text-emerald-700">What I heard: </span>{acknowledgement}</p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}><span className="font-semibold" style={{ color: 'var(--ed-text-secondary)' }}>Why I’m asking this next: </span>{interpretation}</p>
          </div>}
          <div className="mt-8 overflow-hidden rounded-2xl shadow-sm" style={cardStyle}>
            <textarea aria-label="Your answer" disabled={loading} value={answer} onChange={event => setAnswer(event.target.value)} placeholder={question.placeholder} className="min-h-56 w-full resize-y bg-transparent p-6 text-base leading-relaxed outline-none placeholder:text-[var(--ed-text-light)] disabled:opacity-50" style={{ color: 'var(--ed-text)' }} />
            <div className="flex flex-col gap-4 border-t p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--ed-border)', backgroundColor: 'var(--ed-card-hover)' }}>
              <div className="flex items-center gap-3">
                <button type="button" disabled={!speechAvailable || loading} onClick={recording ? stopRecording : startRecording} aria-label={recording ? 'Stop voice answer' : 'Start voice answer'} className={`grid h-12 w-12 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-30 ${recording ? 'animate-pulse bg-red-400 text-black' : 'bg-emerald-300 text-black hover:bg-emerald-200'}`}><MicIcon stop={recording} /></button>
                <div><p className="text-sm font-medium" style={{ color: 'var(--ed-text-dark)' }}>{recording ? 'Listening…' : speechAvailable ? 'Answer by voice' : 'Voice unavailable'}</p><p className="mt-0.5 text-[11px]" style={{ color: 'var(--ed-text-faint)' }}>{recording ? `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')} · tap stop when finished` : speechAvailable ? 'Speak as long as you like, then stop' : 'Type your answer in this browser'}</p></div>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end"><span className="text-[11px]" style={{ color: 'var(--ed-text-faint)' }}>{words} words</span><button type="button" disabled={answer.trim().length < 20 || loading} onClick={submitAnswer} className="btn-press inline-flex min-w-32 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30" style={ctaStyle}>{loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />Thinking</> : questionIndex === questionCount - 1 ? <>Build my plan <ArrowIcon /></> : <>Continue <ArrowIcon /></>}</button></div>
            </div>
          </div>
          <p className="mt-3 text-[11px]" style={{ color: 'var(--ed-text-light)' }}>Long answers are welcome. You can edit the transcript before continuing.</p>
        </div>
      </div>
      {notice && <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-xl" style={ctaStyle}>{notice}</div>}
    </section>
  )

  if (!analysis) return null
  return <>
    <CompassResult
      analysis={analysis}
      onCopyPlan={copyRoadmap}
      onShare={shareRoadmap}
      onRestart={restart}
      onNotice={flash}
    />
    {notice && <div role="status" className="fixed bottom-6 left-1/2 z-[60] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm font-medium shadow-xl" style={ctaStyle}>{notice}</div>}
  </>
}
