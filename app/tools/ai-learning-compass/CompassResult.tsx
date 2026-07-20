'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CapabilityBand, CompassAnalysis, CompassExecutionStep, CompassTool } from '../../lib/aiCompass'
import { compassResourceCatalog } from '../../lib/aiCompassCatalog'

const cardStyle: React.CSSProperties = { border: '1px solid var(--ed-border)', backgroundColor: 'var(--ed-card-warm)' }
const innerCardStyle: React.CSSProperties = { border: '1px solid var(--ed-border)', backgroundColor: 'var(--ed-bg)' }

const bandLabels: Record<CapabilityBand, string> = {
  '0-30': 'Guided explorer',
  '30-50': 'Independent practitioner',
  '50-75': 'System builder',
  '75-90': 'Reliable systems leader',
}

const bandOrder: CapabilityBand[] = ['0-30', '30-50', '50-75', '75-90']

function CapabilityLadder({ currentBand, targetBand }: { currentBand: CapabilityBand; targetBand: CapabilityBand }) {
  const currentIndex = bandOrder.indexOf(currentBand)
  const targetIndex = bandOrder.indexOf(targetBand)
  return <ol className="mt-6 grid gap-3 sm:grid-cols-4" aria-label={`Capability jump from ${bandLabels[currentBand]} to ${bandLabels[targetBand]}`}>
    {bandOrder.map((band, index) => {
      const isCurrent = index === currentIndex
      const isTarget = index === targetIndex
      const isInPath = index >= Math.min(currentIndex, targetIndex) && index <= Math.max(currentIndex, targetIndex)
      return <li key={band} className="min-w-0 rounded-xl p-4" style={{ border: `1px solid ${isCurrent || isTarget ? '#6ee7b7' : 'var(--ed-border)'}`, backgroundColor: isTarget ? '#d1fae5' : isInPath ? 'var(--ed-card-hover)' : 'var(--ed-bg)' }}>
        <span className="text-xs font-semibold" style={{ color: isCurrent || isTarget ? '#047857' : 'var(--ed-text-faint)' }}>{band}{isCurrent ? ' · You are here' : isTarget ? ' · This plan' : ''}</span>
        <p className="mt-2 text-sm font-semibold [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-dark)' }}>{bandLabels[band]}</p>
      </li>
    })}
  </ol>
}

function ExecutionStepCard({
  step,
  tool,
  number,
  initiallyOpen,
  onCopy,
}: {
  step: CompassExecutionStep
  tool?: CompassTool
  number: number
  initiallyOpen: boolean
  onCopy: (text: string) => void
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen)
  return <details id={`compass-${step.id}`} open={isOpen} onToggle={event => setIsOpen(event.currentTarget.open)} className="group rounded-2xl" style={innerCardStyle}>
    <summary className="flex min-h-14 cursor-pointer list-none items-start justify-between gap-4 rounded-2xl p-5 marker:hidden sm:p-6">
      <span className="min-w-0">
        <span className="text-xs font-semibold text-emerald-700">Step {number}</span>
        <h3 className="mt-1 text-base font-semibold [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-dark)' }}>{step.title}</h3>
        <span className="mt-1 block text-xs [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-muted)' }}>Done when: {step.successCheck}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs" style={{ backgroundColor: 'var(--ed-border)', color: 'var(--ed-text-secondary)' }}>{step.minutes} min <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span></span>
    </summary>
    <div className="border-t px-5 pb-6 pt-5 sm:px-6" style={{ borderColor: 'var(--ed-border)' }}>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)]">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Learn this</h4>
          <p className="mt-2 text-sm leading-relaxed [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-secondary)' }}>{step.learn}</p>
          <h4 className="mt-6 text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Do this</h4>
          <ol className="mt-3 space-y-3">
            {step.actions.map((action, index) => <li key={`${step.id}-action-${index}`} className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)] gap-3 text-sm leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">{index + 1}</span><span className="[overflow-wrap:anywhere]">{action}</span></li>)}
          </ol>
        </div>
        <div className="min-w-0 space-y-5">
          {tool && <section><h4 className="text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Use</h4><p className="mt-2 text-sm font-medium [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-secondary)' }}>{tool.name}</p><p className="mt-1 text-xs leading-relaxed [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-muted)' }}>{tool.role}</p></section>}
          {step.copyPrompt && <section className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Copy this prompt</h4><button type="button" onClick={() => onCopy(step.copyPrompt?.text ?? '')} className="min-h-11 rounded-full border px-4 py-2 text-xs font-semibold transition hover:bg-[var(--ed-card-hover)]" style={{ borderColor: 'var(--ed-border)', color: 'var(--ed-text-secondary)' }}>Copy prompt</button></div><p className="mt-2 text-xs" style={{ color: 'var(--ed-text-muted)' }}>{step.copyPrompt.label}</p><pre className="mt-3 max-w-full whitespace-pre-wrap rounded-xl p-4 text-xs leading-relaxed [overflow-wrap:anywhere]" style={{ backgroundColor: 'var(--ed-card-warm)', color: 'var(--ed-text)' }}><code>{step.copyPrompt.text}</code></pre></section>}
        </div>
      </div>
      <dl className="mt-6 grid min-w-0 gap-4 border-t pt-5 sm:grid-cols-3" style={{ borderColor: 'var(--ed-border)' }}>
        <div className="min-w-0"><dt className="text-xs font-semibold text-blue-700">What you should see</dt><dd className="mt-2 text-xs leading-relaxed [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-muted)' }}>{step.expectedOutput}</dd></div>
        <div className="min-w-0"><dt className="text-xs font-semibold text-emerald-700">Save this proof</dt><dd className="mt-2 text-xs leading-relaxed [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-muted)' }}>{step.evidence}</dd></div>
        <div className="min-w-0"><dt className="text-xs font-semibold text-amber-700">If stuck</dt><dd className="mt-2 text-xs leading-relaxed [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-muted)' }}><strong style={{ color: 'var(--ed-text-secondary)' }}>{step.ifStuck.symptom}:</strong> {step.ifStuck.fix} Fallback: {step.ifStuck.fallback}</dd></div>
      </dl>
    </div>
  </details>
}

export function CompassResult({
  analysis,
  onCopyPlan,
  onShare,
  onRestart,
  onNotice,
}: {
  analysis: CompassAnalysis
  onCopyPlan: () => void
  onShare: () => void
  onRestart: () => void
  onNotice: (message: string) => void
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const pack = analysis.executionPack
  const stepById = useMemo(() => new Map(pack.steps.map(step => [step.id, step])), [pack.steps])
  const toolById = useMemo(() => new Map(pack.tools.map(tool => [tool.id, tool])), [pack.tools])
  const resourceById = useMemo(() => new Map(compassResourceCatalog.map(resource => [resource.id, resource])), [])
  const firstSteps = pack.first72HourStepIds.map(id => stepById.get(id)).filter((step): step is CompassExecutionStep => Boolean(step))

  useEffect(() => { headingRef.current?.focus() }, [])

  const copyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      onNotice('Prompt copied')
    } catch {
      onNotice('Copy was blocked. Select the prompt manually.')
    }
  }

  const openStep = (stepId: string) => {
    const details = document.getElementById(`compass-${stepId}`) as HTMLDetailsElement | null
    if (!details) return
    details.open = true
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    details.querySelector('summary')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    window.setTimeout(() => (details.querySelector('summary') as HTMLElement | null)?.focus(), reduceMotion ? 0 : 450)
  }

  const printPlan = () => {
    const closed = Array.from(rootRef.current?.querySelectorAll('details:not([open])') ?? []) as HTMLDetailsElement[]
    closed.forEach(details => { details.open = true })
    const restore = () => {
      closed.forEach(details => { details.open = false })
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    window.print()
  }

  return <section className="compass-result px-4 py-8 sm:px-8 sm:py-14" ref={rootRef}>
    <div className="mx-auto max-w-6xl">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-emerald-300 p-6 text-black sm:p-11">
        <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full border-[60px] border-black/10" />
        <div className="relative max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-black/60">{analysis.route.pathway} · {analysis.route.currentBand} → {analysis.route.targetBand} · {analysis.confidence} confidence</p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-4xl font-bold leading-tight sm:text-6xl">{analysis.headline}</h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-black/70 sm:text-lg">{analysis.subhead}</p>
        </div>
        <div className="relative mt-7 flex flex-wrap gap-2"><button type="button" onClick={onCopyPlan} className="min-h-11 rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5">Copy complete plan</button><button type="button" onClick={onShare} className="min-h-11 rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5">Share complete plan</button><button type="button" onClick={printPlan} className="min-h-11 rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5">Save as PDF</button></div>
      </div>

      <article className="mt-5 rounded-2xl p-5 sm:p-8" style={cardStyle}>
        <p className="section-label">Your 60-second plan</p>
        <div className="mt-6 grid min-w-0 gap-6 md:grid-cols-2">
          <div className="min-w-0"><p className="text-xs font-semibold text-emerald-700">Build this</p><h2 className="mt-2 text-2xl font-semibold [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-dark)' }}>{pack.outcome.buildThis}</h2><p className="mt-2 text-sm [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-muted)' }}>For {pack.outcome.forWhom}</p></div>
          <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0"><dt className="text-xs font-semibold" style={{ color: 'var(--ed-text-faint)' }}>Use</dt><dd className="mt-2 text-sm font-medium [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-dark)' }}>{pack.tools.map(tool => tool.name).join(' · ')}</dd></div>
            <div className="min-w-0"><dt className="text-xs font-semibold" style={{ color: 'var(--ed-text-faint)' }}>Time</dt><dd className="mt-2 text-sm font-medium" style={{ color: 'var(--ed-text-dark)' }}>{Math.round(pack.outcome.totalMinutes / 60 * 10) / 10} hours across 30 days</dd></div>
            <div className="min-w-0"><dt className="text-xs font-semibold text-amber-700">Start now</dt><dd className="mt-2 text-sm [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-secondary)' }}>{stepById.get(pack.outcome.startNowStepId)?.title}</dd></div>
            <div className="min-w-0"><dt className="text-xs font-semibold text-blue-700">Finished when</dt><dd className="mt-2 text-sm [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-secondary)' }}>{pack.outcome.finishedWhen}</dd></div>
          </dl>
        </div>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-800">Keep out of scope for these 30 days</p><ul className="mt-2 space-y-1">{pack.outcome.exclusions.map(item => <li key={item} className="text-xs leading-relaxed text-amber-900">→ {item}</li>)}</ul></div>
        <button type="button" onClick={() => openStep(pack.outcome.startNowStepId)} className="btn-press mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--ed-cta)] px-5 py-3 text-sm font-semibold text-[var(--ed-bg)] sm:w-auto">Start step {pack.steps.findIndex(step => step.id === pack.outcome.startNowStepId) + 1}</button>
      </article>

      <article className="mt-5 rounded-2xl p-5 sm:p-8" style={cardStyle}>
        <p className="section-label">Your next capability jump</p>
        <CapabilityLadder currentBand={analysis.route.currentBand} targetBand={analysis.route.targetBand} />
        <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}><strong style={{ color: 'var(--ed-text-dark)' }}>A valid stopping point:</strong> {analysis.route.naturalStoppingPoint}</p>
      </article>

      <div className="mt-5 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <article className="min-w-0 rounded-2xl p-5 sm:p-8" style={cardStyle}>
          <p className="section-label">Learn this before building</p><h2 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{pack.mentalModel.title}</h2><p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>{pack.mentalModel.explanation}</p>
          <dl className="mt-5 space-y-3">{pack.mentalModel.terms.map(item => <div key={item.term} className="grid min-w-0 gap-1 sm:grid-cols-[120px_minmax(0,1fr)]"><dt className="text-sm font-semibold [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-dark)' }}>{item.term}</dt><dd className="text-sm leading-relaxed [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-muted)' }}>{item.meaning}</dd></div>)}</dl>
          <div className="mt-6 rounded-xl bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-700">Check your understanding</p><p className="mt-2 text-sm" style={{ color: 'var(--ed-text-secondary)' }}>{pack.mentalModel.comprehensionCheck.question}</p><details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-blue-700">Show answer</summary><p className="mt-2 text-sm" style={{ color: 'var(--ed-text-secondary)' }}>{pack.mentalModel.comprehensionCheck.answer}</p></details></div>
        </article>
        <article className="min-w-0 rounded-2xl p-5 sm:p-8" style={cardStyle}>
          <p className="section-label">Your exact tool stack</p><h2 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Set up only these tools</h2>
          <div className="mt-5 divide-y divide-[var(--ed-border)]">{pack.tools.map(tool => <section key={tool.id} className="min-w-0 py-5 first:pt-0 last:pb-0"><h3 className="text-base font-semibold [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-dark)' }}>{tool.name}</h3><p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>{tool.whyThisTool}</p><ol className="mt-3 space-y-2">{tool.setupSteps.map((setup, index) => <li key={`${tool.id}-setup-${index}`} className="text-xs leading-relaxed [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-muted)' }}>{index + 1}. {setup}</li>)}</ol><dl className="mt-4 grid gap-3 sm:grid-cols-2"><div><dt className="text-xs font-semibold text-emerald-700">Data rule</dt><dd className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{tool.dataRule}</dd></div><div><dt className="text-xs font-semibold text-amber-700">Cost guard</dt><dd className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{tool.costGuard}</dd></div></dl><p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}><strong style={{ color: 'var(--ed-text-secondary)' }}>Fallback:</strong> {tool.fallback}</p></section>)}</div>
        </article>
      </div>

      <article className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-8">
        <p className="section-label text-amber-700">First 72 hours</p><h2 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Create momentum, not homework</h2><ol className="mt-5 grid gap-3 md:grid-cols-3">{firstSteps.map((step, index) => <li key={step.id} className="min-w-0"><button type="button" onClick={() => openStep(step.id)} className="block min-h-11 w-full rounded-xl border border-amber-200 bg-[var(--ed-bg)] p-4 text-left text-sm font-semibold [overflow-wrap:anywhere]" style={{ color: 'var(--ed-text-dark)' }}>{index + 1}. {step.title}<span className="mt-2 block text-xs font-normal" style={{ color: 'var(--ed-text-muted)' }}>{step.minutes} minutes · {step.evidence}</span></button></li>)}</ol>
      </article>

      <article className="mt-5 rounded-2xl p-5 sm:p-9" style={cardStyle}>
        <p className="section-label">The exact build recipe</p><h2 className="mt-3 text-3xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Follow these steps in order</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>Step 1 is open. Later steps stay compact until you need them; each includes actions, expected output, proof, and recovery.</p>
        <div className="mt-7 space-y-4">{pack.steps.map((step, index) => <ExecutionStepCard key={step.id} step={step} tool={step.toolId ? toolById.get(step.toolId) : undefined} number={index + 1} initiallyOpen={step.id === pack.outcome.startNowStepId} onCopy={copyPrompt} />)}</div>
      </article>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl p-5 sm:p-8" style={cardStyle}><p className="section-label">Your four-week sequence</p><h2 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>The recipe, scheduled once</h2><div className="mt-5 divide-y divide-[var(--ed-border)]">{pack.weeks.map(week => <section key={week.week} className="py-4 first:pt-0"><p className="text-xs font-semibold text-emerald-700">{week.week}</p><h3 className="mt-2 text-base font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{week.objective}</h3><p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>Steps: {week.stepIds.map(id => stepById.get(id)?.title).join(' · ')}</p><p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}><strong style={{ color: 'var(--ed-text-secondary)' }}>Evidence:</strong> {week.evidence}</p></section>)}</div></article>
        <article className="rounded-2xl p-5 sm:p-8" style={cardStyle}><p className="section-label">Prove it works</p><h2 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Your test recipe</h2><h3 className="mt-5 text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Cases</h3><ul className="mt-3 space-y-2">{pack.testPlan.cases.map(item => <li key={item} className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}><span>→</span>{item}</li>)}</ul><h3 className="mt-5 text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Run the test</h3><ol className="mt-3 space-y-2">{pack.testPlan.procedure.map((item, index) => <li key={item} className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>{index + 1}. {item}</li>)}</ol><h3 className="mt-5 text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Score each result</h3><dl className="mt-3 space-y-3">{pack.testPlan.scorecard.map(item => <div key={item.criterion}><dt className="text-xs font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{item.criterion}</dt><dd className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>Pass rule: {item.passRule}</dd></div>)}</dl><p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Pass when: {pack.testPlan.passCondition}</p></article>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <details className="rounded-2xl p-5 sm:p-7" style={cardStyle}><summary className="min-h-11 cursor-pointer text-lg font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Troubleshooting and failure signals</summary><div className="mt-5 space-y-5"><ul className="space-y-2">{pack.testPlan.failureSignals.map(item => <li key={item} className="text-xs leading-relaxed text-amber-700">Stop or repair: {item}</li>)}</ul>{pack.troubleshooting.map(item => <section key={item.symptom}><h3 className="text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{item.symptom}</h3><p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>Likely cause: {item.likelyCause}</p><p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>Correction: {item.correction}</p></section>)}</div></details>
        <details className="rounded-2xl p-5 sm:p-7" style={cardStyle}><summary className="min-h-11 cursor-pointer text-lg font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Just-in-time learning resources</summary><div className="mt-5 space-y-5">{pack.resources.length ? pack.resources.map(resource => { const catalog = resourceById.get(resource.catalogId); return <section key={`${resource.useAtStepId}-${resource.title}`}><p className="text-xs font-semibold text-blue-700">Use at {stepById.get(resource.useAtStepId)?.title}</p><h3 className="mt-2 text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{resource.title}</h3><p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{resource.whyNow} · {resource.format} · {resource.durationMinutes} minutes</p>{catalog && <a href={catalog.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-full border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Open {catalog.source} guide</a>}<p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{catalog ? `Read: ${catalog.section} · Link reviewed ${catalog.reviewedAt}` : `Find: “${resource.searchFor}”`}</p><p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>Then: {resource.actionAfter}</p></section> }) : <p className="text-sm" style={{ color: 'var(--ed-text-muted)' }}>No extra study is required. Follow the execution steps directly.</p>}</div></details>
      </div>

      <article className="mt-5 rounded-2xl border border-blue-300/20 bg-blue-300 p-6 text-black sm:p-10"><p className="text-xs font-bold uppercase tracking-widest text-black/55">Your simple ending</p><div className="mt-6 grid gap-6 md:grid-cols-2"><div><p className="text-xs font-semibold text-black/55">I can</p><p className="mt-2 text-lg font-semibold">{pack.completion.capability}</p></div><div><p className="text-xs font-semibold text-black/55">I made</p><p className="mt-2 text-lg font-semibold">{pack.completion.artifact}</p></div><div><p className="text-xs font-semibold text-black/55">I proved it with</p><p className="mt-2 text-lg font-semibold">{pack.completion.proof}</p></div><div><p className="text-xs font-semibold text-black/55">My recommended next choice</p><p className="mt-2 text-lg font-semibold">{pack.completion.recommendedNext}</p></div></div><p className="mt-7 border-t border-black/15 pt-5 text-sm text-black/65">Other valid choices: {pack.completion.nextChoices.filter(choice => choice !== pack.completion.recommendedNext).join(' · ')}</p></article>

      <details className="mt-5 rounded-2xl p-5 sm:p-8" style={cardStyle}><summary className="min-h-11 cursor-pointer text-lg font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Why this route fits you</summary><div className="mt-6"><p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>{analysis.route.whyThisRoute}</p><div className="mt-6 grid gap-3 md:grid-cols-3">{analysis.profileSignals.map(signal => <div key={`${signal.label}-${signal.finding}`} className="rounded-xl p-4" style={innerCardStyle}><p className="text-xs font-semibold text-emerald-700">{signal.label}</p><p className="mt-2 text-sm font-medium" style={{ color: 'var(--ed-text-dark)' }}>{signal.finding}</p><p className="mt-2 text-xs" style={{ color: 'var(--ed-text-muted)' }}>Evidence: {signal.evidence}</p></div>)}</div><div className="mt-6 grid gap-5 md:grid-cols-2"><section><h3 className="text-sm font-semibold text-emerald-700">Strengths to use</h3><ul className="mt-3 space-y-2">{analysis.strengths.map(item => <li key={item} className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>→ {item}</li>)}</ul></section><section><h3 className="text-sm font-semibold text-amber-700">Gaps this plan closes</h3><ul className="mt-3 space-y-2">{analysis.gaps.map(item => <li key={item} className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>→ {item}</li>)}</ul></section></div><div className="mt-6 grid gap-5 lg:grid-cols-2"><section><h3 className="text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Capabilities this plan develops</h3><div className="mt-3 space-y-4">{analysis.priorities.map(priority => <div key={priority.title}><p className="text-sm font-medium" style={{ color: 'var(--ed-text-dark)' }}>{priority.title}</p><p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{priority.whyThisFits} Learn: {priority.learn.join(' · ')}</p></div>)}</div></section><section><h3 className="text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Not now</h3><ul className="mt-3 space-y-2">{analysis.notNow.map(item => <li key={item} className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>→ {item}</li>)}</ul>{analysis.assumptions.length > 0 && <><h3 className="mt-5 text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>Assumptions to verify</h3><ul className="mt-3 space-y-2">{analysis.assumptions.map(item => <li key={item} className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{item}</li>)}</ul></>}</section></div></div></details>

      <div className="mt-6 flex justify-center"><button type="button" onClick={onRestart} className="rounded-full border px-5 py-3 text-sm transition hover:bg-[var(--ed-card-warm)]" style={{ borderColor: 'var(--ed-border)', color: 'var(--ed-text-secondary)' }}>Start over</button></div>
    </div>
  </section>
}
