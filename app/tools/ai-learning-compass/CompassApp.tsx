'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildProfile,
  getQuestion,
  makeAcknowledgement,
  questionCount,
  serializeProfile,
  type Answer,
  type CompassProfile,
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

export function CompassApp() {
  const [view, setView] = useState<'landing' | 'questions' | 'result'>('landing')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [answer, setAnswer] = useState('')
  const [acknowledgement, setAcknowledgement] = useState('')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [profile, setProfile] = useState<CompassProfile | null>(null)
  const [notice, setNotice] = useState('')
  const recognitionRef = useRef<Recognition | null>(null)
  const wantsRecordingRef = useRef(false)
  const transcriptRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speechAvailable = useMemo(() => Boolean(recognitionConstructor()), [])
  const question = getQuestion(questionIndex, answers)
  const words = answer.trim().split(/\s+/).filter(Boolean).length

  useEffect(() => () => {
    wantsRecordingRef.current = false
    recognitionRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
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

  const stopRecording = () => {
    wantsRecordingRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const submitAnswer = () => {
    if (answer.trim().length < 12) return
    if (recording) stopRecording()
    const completed = { questionId: question.id, text: answer.trim() }
    const nextAnswers = [...answers, completed]
    setAnswers(nextAnswers)
    setAcknowledgement(makeAcknowledgement(completed, nextAnswers))
    setAnswer('')
    transcriptRef.current = ''

    if (questionIndex + 1 === questionCount) {
      setProfile(buildProfile(nextAnswers))
      setView('result')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setQuestionIndex(index => index + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const restart = () => {
    stopRecording()
    setQuestionIndex(0)
    setAnswers([])
    setAnswer('')
    setAcknowledgement('')
    setProfile(null)
    setView('questions')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const copyRoadmap = async () => {
    if (!profile) return
    await navigator.clipboard.writeText(serializeProfile(profile))
    flash('Roadmap copied')
  }

  const shareRoadmap = async () => {
    if (!profile) return
    const share = { title: 'My AI Learning Compass', text: serializeProfile(profile), url: window.location.href }
    if (navigator.share) {
      try { await navigator.share(share) } catch { return }
    } else {
      await navigator.clipboard.writeText(share.text)
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(share.url)}`, '_blank', 'noopener,noreferrer')
    }
  }

  if (view === 'landing') return (
    <section className="relative isolate overflow-hidden px-6 py-16 sm:px-8 sm:py-24">
      <div className="pointer-events-none absolute -left-40 top-0 -z-10 h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-40 top-20 -z-10 h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.06fr_.94fr]">
        <div>
          <div className="mb-8 flex items-center gap-3 text-sm font-medium text-white/60"><CompassMark /> AI Learning Compass</div>
          <p className="section-label mb-5">A five-question voice assessment</p>
          <h1 className="max-w-4xl text-5xl font-bold leading-[.97] tracking-[-.055em] sm:text-7xl lg:text-[86px]">Find your next move in <span className="text-emerald-300">AI.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/55 sm:text-xl">Talk through where you are, what you have tried, and what you want to build. Leave with a focused 30-day learning map—not another endless list of tools.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button onClick={() => setView('questions')} className="btn-press inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-200">Start your compass <ArrowIcon /></button>
            <span className="text-xs text-white/35">About 5 minutes · Voice or text · No sign-up</span>
          </div>
        </div>
        <div className="rotate-1 rounded-3xl border border-white/10 bg-white/[.055] p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          <div className="flex items-center justify-between border-b border-white/10 pb-5"><span className="section-label">Example result</span><span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-300 text-2xl font-bold text-black">3</span></div>
          <h2 className="mt-7 text-4xl font-semibold">Workflow builder</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/50">Your fastest path is not “learn all of AI.” It is learning to turn one valuable workflow into a reliable system.</p>
          <div className="mt-7 space-y-3">
            {['Map the work', 'Structure the output', 'Ship one loop'].map((step, index) => <div key={step} className="flex items-center gap-4 rounded-xl border border-white/5 bg-black/30 p-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-bold">{index + 1}</span><span className="text-sm font-medium">{step}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  )

  if (view === 'questions') return (
    <section className="px-6 py-12 sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[210px_1fr] lg:gap-20">
        <aside>
          <div className="flex justify-between text-xs font-medium text-white/55"><span>Your conversation</span><span>{questionIndex + 1} of {questionCount}</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${((questionIndex + 1) / questionCount) * 100}%` }} /></div>
          <ol className="mt-8 hidden space-y-4 text-xs lg:block">
            {['Destination', 'Experience', 'Technical comfort', 'Real-life constraints', 'Your project'].map((label, index) => <li key={label} className={`flex items-center gap-3 ${index === questionIndex ? 'text-white' : index < questionIndex ? 'text-emerald-300' : 'text-white/30'}`}><span className={`grid h-6 w-6 place-items-center rounded-full border ${index === questionIndex ? 'border-emerald-300 bg-emerald-300 text-black' : 'border-white/15'}`}>{index < questionIndex ? '✓' : index + 1}</span>{label}</li>)}
          </ol>
          <p className="mt-9 hidden border-t border-white/10 pt-5 text-xs leading-relaxed text-white/30 lg:block">Text and recommendations are processed locally. Voice transcription is provided by your browser and may use its speech service. This site does not store your answers.</p>
        </aside>
        <div>
          <p className="section-label mb-5"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-300" />{question.eyebrow}</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">{question.prompt}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/45">{question.helper}</p>
          {acknowledgement && <div className="mt-7 rounded-r-xl border-l-2 border-emerald-300 bg-emerald-300/[.07] px-5 py-4 text-sm leading-relaxed text-white/65">{acknowledgement}</div>}
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] shadow-2xl">
            <textarea aria-label="Your answer" value={answer} onChange={event => setAnswer(event.target.value)} placeholder={question.placeholder} className="min-h-52 w-full resize-y bg-transparent p-6 text-base leading-relaxed text-white outline-none placeholder:text-white/20" />
            <div className="flex flex-col gap-4 border-t border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button type="button" disabled={!speechAvailable} onClick={recording ? stopRecording : startRecording} aria-label={recording ? 'Stop voice answer' : 'Start voice answer'} className={`grid h-12 w-12 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-30 ${recording ? 'animate-pulse bg-red-400 text-black' : 'bg-emerald-300 text-black hover:bg-emerald-200'}`}><MicIcon stop={recording} /></button>
                <div><p className="text-sm font-medium">{recording ? 'Listening…' : speechAvailable ? 'Answer by voice' : 'Voice unavailable'}</p><p className="mt-0.5 text-[11px] text-white/30">{recording ? `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')} · tap stop when finished` : speechAvailable ? 'Speak as long as you like, then stop' : 'Type your answer in this browser'}</p></div>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end"><span className="text-[11px] text-white/30">{words} words</span><button type="button" disabled={answer.trim().length < 12} onClick={submitAnswer} className="btn-press inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-30">Continue <ArrowIcon /></button></div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-white/25">You can edit the transcript before continuing.</p>
        </div>
      </div>
      {notice && <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-xl">{notice}</div>}
    </section>
  )

  if (!profile) return null
  return (
    <section className="px-6 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-emerald-300 p-7 text-black sm:p-12">
          <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full border-[60px] border-black/10" />
          <div className="relative flex items-start justify-between gap-8"><div><p className="text-[11px] font-bold uppercase tracking-[.17em] text-black/55">Your AI Learning Compass</p><h1 className="mt-4 text-5xl font-bold tracking-[-.05em] sm:text-7xl">Stage {profile.stageNumber}: {profile.stage}</h1><p className="mt-6 max-w-3xl text-base leading-relaxed text-black/65 sm:text-lg">{profile.summary}</p></div><span className="hidden h-24 w-24 shrink-0 place-items-center rounded-full border border-black/20 text-4xl font-bold sm:grid">{profile.stageNumber}</span></div>
          <div className="relative mt-8 flex flex-wrap gap-2"><button onClick={copyRoadmap} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5">Copy roadmap</button><button onClick={shareRoadmap} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5">Share</button><button onClick={() => window.print()} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5">Save as PDF</button></div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            <article className="rounded-2xl border border-white/10 bg-white/[.04] p-6 sm:p-9"><p className="section-label">Learn these next</p><h2 className="mt-3 text-3xl font-semibold">Your three highest-leverage moves</h2><div className="mt-6 divide-y divide-white/10">{profile.priorities.map((priority, index) => <div key={priority.title} className="grid gap-4 py-6 sm:grid-cols-[44px_1fr]"><span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-300 font-bold text-black">{index + 1}</span><div><h3 className="font-semibold">{priority.title}</h3><p className="mt-2 text-sm leading-relaxed text-white/45">{priority.why}</p><p className="mt-3 text-sm font-medium text-emerald-300">Do this: {priority.action}</p></div></div>)}</div></article>
            <article className="rounded-2xl border border-white/10 bg-white/[.04] p-6 sm:p-9"><p className="section-label">A realistic pace</p><h2 className="mt-3 text-3xl font-semibold">Your 30-day learning plan</h2><div className="mt-7 grid gap-3 sm:grid-cols-2">{profile.weeks.map(week => <div key={week.week} className="rounded-xl border border-white/5 bg-black/30 p-5"><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">{week.week}</span><h3 className="mt-2 font-semibold">{week.focus}</h3><p className="mt-2 text-xs leading-relaxed text-white/40">{week.outcome}</p></div>)}</div></article>
            <article className="rounded-2xl border border-blue-300/20 bg-blue-300 p-7 text-black sm:p-9"><p className="text-[10px] font-bold uppercase tracking-widest text-black/50">Build this, don’t just study</p><h2 className="mt-3 text-3xl font-bold">{profile.project.title}</h2><p className="mt-4 leading-relaxed text-black/65">{profile.project.brief}</p><p className="mt-6 border-t border-black/15 pt-5 text-sm"><strong>Evidence you learned it:</strong> {profile.project.proof}</p></article>
          </div>
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start"><div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><p className="text-xs font-semibold">Your path</p><p className="mt-3 text-sm font-medium text-emerald-300">{profile.trackName}</p><p className="mt-2 text-xs leading-relaxed text-white/40">{profile.weeklyHours}<br />{profile.learningStyle}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><p className="text-xs font-semibold">Not yet</p><ul className="mt-4 space-y-3">{profile.notYet.map(item => <li key={item} className="flex gap-2 text-xs leading-relaxed text-white/40"><span className="text-emerald-300">→</span>{item}</li>)}</ul></div><button onClick={restart} className="w-full rounded-full border border-white/15 px-4 py-3 text-sm text-white/60 transition hover:border-white/30 hover:text-white">Start over</button></aside>
        </div>
      </div>
      {notice && <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-xl">{notice}</div>}
    </section>
  )
}
