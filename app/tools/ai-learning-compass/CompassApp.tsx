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
const innerCardStyle: React.CSSProperties = { border: '1px solid var(--ed-border)', backgroundColor: '#fff' }
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

function TaskCard({ task, number }: { task: { action: string; deliverable: string; successCheck: string; time: string }; number?: number }) {
  return <div className="rounded-xl p-5" style={innerCardStyle}>
    <div className="flex items-start justify-between gap-4">
      <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--ed-text-dark)' }}>{number ? `${number}. ` : ''}{task.action}</p>
      <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px]" style={{ backgroundColor: 'var(--ed-border)', color: 'var(--ed-text-muted)' }}>{task.time}</span>
    </div>
    <dl className="mt-4 grid gap-3 text-xs leading-relaxed sm:grid-cols-2">
      <div><dt className="font-semibold text-emerald-700">Deliverable</dt><dd className="mt-1" style={{ color: 'var(--ed-text-muted)' }}>{task.deliverable}</dd></div>
      <div><dt className="font-semibold text-blue-700">Done when</dt><dd className="mt-1" style={{ color: 'var(--ed-text-muted)' }}>{task.successCheck}</dd></div>
    </dl>
  </div>
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
    setView('questions')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const copyRoadmap = async () => {
    if (!analysis) return
    await navigator.clipboard.writeText(serializeAnalysis(analysis))
    flash('Roadmap copied')
  }

  const shareRoadmap = async () => {
    if (!analysis) return
    const share = { title: 'My AI Learning Compass', text: `${analysis.headline}\n${analysis.subhead}`, url: window.location.href }
    if (navigator.share) {
      try { await navigator.share(share) } catch { return }
    } else {
      await navigator.clipboard.writeText(`${share.text}\n${share.url}`)
      flash('Share text copied')
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
          <p className="mt-7 max-w-2xl text-lg leading-relaxed sm:text-xl" style={{ color: 'var(--ed-text-secondary)' }}>Every question changes based on your answer. You will leave with exact capabilities to learn, tasks to complete, proof to produce, and a focused 30-day plan.</p>
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
              ['3', 'Inspectable plan', 'Every task has a deliverable and a definition of done.'],
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
  return (
    <section className="px-6 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-emerald-300 p-7 text-black sm:p-12">
          <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full border-[60px] border-black/10" />
          <div className="relative max-w-4xl"><p className="text-[11px] font-bold uppercase tracking-[.17em] text-black/55">Your AI Learning Prescription · {analysis.confidence} confidence</p><h1 className="mt-4 text-4xl font-bold leading-[.98] tracking-[-.05em] sm:text-7xl">{analysis.headline}</h1><p className="mt-6 max-w-3xl text-base leading-relaxed text-black/65 sm:text-lg">{analysis.subhead}</p></div>
          <div className="relative mt-8 flex flex-wrap gap-2"><button onClick={copyRoadmap} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5">Copy roadmap</button><button onClick={shareRoadmap} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5">Share</button><button onClick={() => window.print()} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5">Save as PDF</button></div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl p-6 sm:p-8" style={cardStyle}><p className="section-label" style={{ color: 'var(--ed-text-faint)' }}>Where you are</p><p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>{analysis.currentPosition}</p></article>
          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8"><p className="section-label text-blue-700">Your 30-day destination</p><p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>{analysis.targetPosition}</p></article>
        </div>

        <article className="mt-5 rounded-2xl p-6 sm:p-9" style={cardStyle}>
          <p className="section-label" style={{ color: 'var(--ed-text-faint)' }}>The evidence behind this plan</p><h2 className="mt-3 text-3xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>What your answers signal</h2>
          <div className="mt-7 grid gap-3 md:grid-cols-3">{analysis.profileSignals.map(signal => <div key={`${signal.label}-${signal.finding}`} className="rounded-xl p-5" style={innerCardStyle}><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">{signal.label}</p><p className="mt-3 text-sm font-medium leading-relaxed" style={{ color: 'var(--ed-text-dark)' }}>{signal.finding}</p><p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--ed-text-faint)' }}>Evidence: {signal.evidence}</p></div>)}</div>
        </article>

        <article className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-9">
          <p className="section-label text-amber-700">Start here</p><h2 className="mt-3 text-3xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Your first 72 hours</h2>
          <div className="mt-7 grid gap-3">{analysis.first72Hours.map((task, index) => <TaskCard key={`${task.action}-${index}`} task={task} number={index + 1} />)}</div>
        </article>

        <article className="mt-5 rounded-2xl p-6 sm:p-9" style={cardStyle}>
          <p className="section-label" style={{ color: 'var(--ed-text-faint)' }}>Learn these next—in this order</p><h2 className="mt-3 text-3xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Your highest-leverage capabilities</h2>
          <div className="mt-8 space-y-5">{analysis.priorities.map((priority, index) => <section key={priority.title} className="rounded-2xl p-5 sm:p-7" style={innerCardStyle}>
            <div className="grid gap-4 sm:grid-cols-[48px_1fr]"><span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-300 text-lg font-bold text-black">{index + 1}</span><div><h3 className="text-xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{priority.title}</h3><p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{priority.whyThisFits}</p></div></div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Learn</p><ul className="mt-3 space-y-2">{priority.learn.map(item => <li key={item} className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}><span className="text-emerald-600">→</span>{item}</li>)}</ul><p className="mt-5 border-t pt-4 text-xs leading-relaxed text-amber-700" style={{ borderColor: 'var(--ed-border)' }}><strong style={{ color: 'var(--ed-text-secondary)' }}>Avoid:</strong> {priority.skipTrap}</p></div><div className="space-y-3">{priority.tasks.map((task, taskIndex) => <TaskCard key={`${task.action}-${taskIndex}`} task={task} />)}</div></div>
          </section>)}</div>
        </article>

        <article className="mt-5 rounded-2xl p-6 sm:p-9" style={cardStyle}><p className="section-label" style={{ color: 'var(--ed-text-faint)' }}>A realistic sequence</p><h2 className="mt-3 text-3xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Your 30-day plan</h2><div className="mt-7 grid gap-3 sm:grid-cols-2">{analysis.weeks.map(week => <div key={week.week} className="rounded-xl p-5" style={innerCardStyle}><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">{week.week}</span><h3 className="mt-2 text-lg font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{week.objective}</h3><dl className="mt-4 space-y-3 text-xs leading-relaxed"><div><dt className="font-semibold" style={{ color: 'var(--ed-text-secondary)' }}>Learn</dt><dd className="mt-1" style={{ color: 'var(--ed-text-muted)' }}>{week.learn}</dd></div><div><dt className="font-semibold" style={{ color: 'var(--ed-text-secondary)' }}>Build</dt><dd className="mt-1" style={{ color: 'var(--ed-text-muted)' }}>{week.build}</dd></div><div><dt className="font-semibold text-blue-700">Evidence</dt><dd className="mt-1" style={{ color: 'var(--ed-text-muted)' }}>{week.evidence}</dd></div></dl></div>)}</div></article>

        <article className="mt-5 rounded-2xl border border-blue-300/20 bg-blue-300 p-7 text-black sm:p-10"><p className="text-[10px] font-bold uppercase tracking-widest text-black/50">Build this, don’t just study</p><h2 className="mt-3 text-3xl font-bold sm:text-5xl">{analysis.capstone.title}</h2><p className="mt-5 max-w-4xl leading-relaxed text-black/65">{analysis.capstone.brief}</p><div className="mt-7 grid gap-6 border-t border-black/15 pt-6 md:grid-cols-2"><div><h3 className="text-sm font-bold">Non-negotiable requirements</h3><ul className="mt-3 space-y-2">{analysis.capstone.requirements.map(item => <li key={item} className="flex gap-2 text-sm leading-relaxed text-black/60"><span>→</span>{item}</li>)}</ul></div><div><h3 className="text-sm font-bold">Proof you can do it</h3><ul className="mt-3 space-y-2">{analysis.capstone.proof.map(item => <li key={item} className="flex gap-2 text-sm leading-relaxed text-black/60"><span>✓</span>{item}</li>)}</ul></div></div></article>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <article className="rounded-2xl p-6 sm:p-9" style={cardStyle}><p className="section-label" style={{ color: 'var(--ed-text-faint)' }}>What to study</p><h2 className="mt-3 text-3xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Targeted learning searches</h2><p className="mt-3 text-sm" style={{ color: 'var(--ed-text-muted)' }}>Specific search briefs beat a pile of generic course links—and remain useful as tools change.</p><div className="mt-6 divide-y divide-[var(--ed-border)]">{analysis.resources.map(resource => <div key={resource.topic} className="py-5"><h3 className="font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{resource.topic}</h3><p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{resource.why}</p><p className="mt-3 rounded-lg px-3 py-2 text-xs text-emerald-700" style={{ backgroundColor: 'var(--ed-card-hover)' }}>Search: “{resource.searchFor}”</p><p className="mt-2 text-[11px]" style={{ color: 'var(--ed-text-faint)' }}>Best format: {resource.format}</p></div>)}</div></article>
          <aside className="space-y-5"><div className="rounded-2xl p-6" style={cardStyle}><p className="text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Your useful advantages</p><ul className="mt-4 space-y-3">{analysis.strengths.map(item => <li key={item} className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}><span className="text-emerald-600">✓</span>{item}</li>)}</ul></div><div className="rounded-2xl p-6" style={cardStyle}><p className="text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Not now</p><ul className="mt-4 space-y-3">{analysis.notNow.map(item => <li key={item} className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}><span className="text-amber-600">→</span>{item}</li>)}</ul></div>{analysis.assumptions.length > 0 && <div className="rounded-2xl p-6" style={cardStyle}><p className="text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Assumptions to verify</p><ul className="mt-4 space-y-3">{analysis.assumptions.map(item => <li key={item} className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{item}</li>)}</ul></div>}<button onClick={restart} className="w-full rounded-full border px-4 py-3 text-sm transition hover:bg-[var(--ed-card-warm)]" style={{ borderColor: 'var(--ed-border)', color: 'var(--ed-text-secondary)' }}>Start over</button></aside>
        </div>
      </div>
      {notice && <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-xl" style={ctaStyle}>{notice}</div>}
    </section>
  )
}
