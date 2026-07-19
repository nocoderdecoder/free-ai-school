'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import {
  createBrowserMicrophonePreflightController,
  INITIAL_MICROPHONE_PREFLIGHT_SNAPSHOT,
} from './client/microphone-preflight'
import { localAdaptiveQuestionDecision, requestAdaptiveQuestion } from './client/question-adaptation'
import { createDiagnosticResult } from './client/api'
import {
  canonicalQuestionPresentation,
  type AdaptiveQuestionPresentation,
  type DiagnosticSectionId,
} from './lib/constrained-question-routing'
import {
  CAPABILITY_SECTION_IDS,
  INITIAL_CAPABILITY_INTAKE,
  INITIAL_USE_CASE_INTAKE,
  USE_CASE_SECTION_IDS,
  validateCapabilityIntake,
  validateUseCaseIntake,
  type CapabilityDomain,
  type CapabilityIntake,
  type CapabilityPrescription,
  type DataComfort,
  type DiagnosticReadiness,
  type DiagnosticPath,
  type ExperienceLevel,
  type ReadinessStatus,
  type UseCaseBlueprint,
  type UseCaseIntake,
} from './lib/diagnostic'

type DiagnosticResult = UseCaseBlueprint | CapabilityPrescription
type PresentationMap = Readonly<Partial<Record<DiagnosticSectionId, AdaptiveQuestionPresentation>>>
type ClarifierAnswerBaselines = Readonly<Partial<Record<DiagnosticSectionId, string>>>
const MINIMUM_ADAPTIVE_THINKING_MS = 1_200

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function sectionAnswerFingerprint(
  answers: Readonly<Record<string, unknown>>,
  sectionId: DiagnosticSectionId,
): string {
  return JSON.stringify(answers[sectionId] ?? null)
}

function applyClarifierReadiness<Id extends DiagnosticSectionId>(
  readiness: DiagnosticReadiness<Id>,
  answers: Readonly<Record<string, unknown>>,
  baselines: ClarifierAnswerBaselines,
): DiagnosticReadiness<Id> {
  const pending = new Set(
    (Object.keys(baselines) as DiagnosticSectionId[]).filter(sectionId => (
      baselines[sectionId] === sectionAnswerFingerprint(answers, sectionId)
    )),
  )
  if (!pending.size) return readiness

  const sections = readiness.sections.map(section => pending.has(section.id)
    ? { ...section, status: 'missing' as const, issues: ['Add the detail requested in this follow-up.'] }
    : section)
  return {
    status: sections.every(section => section.status === 'complete') ? 'complete' : 'missing',
    canSubmit: false,
    sections,
  }
}

const useCaseSections = [
  ['outcome', 'What are you trying to improve?', 'Who it is for and what should be better'],
  ['workflow', 'How does it work today?', 'The current steps and where they break down'],
  ['specification', 'What should the AI do?', 'The smallest useful version'],
  ['experience', 'What have you already tried?', 'The highest level you can support'],
  ['risk', 'What could go wrong?', 'Where a person must stay in control'],
  ['constraints', 'What must the plan fit?', 'Your time, skills and budget'],
] as const

const capabilitySections = [
  ['direction', 'What do you want to get better at?', 'Where AI could expand your work'],
  ['experience', 'What have you done so far?', 'Choose the statement that feels closest'],
  ['evidence', 'Tell us about your best example', 'What you made, improved or tested'],
  ['reasoning', 'How do you make decisions?', 'How you test, limit risk and review'],
  ['foundations', 'What are you comfortable using?', 'Coding, data and AI tools'],
  ['constraints', 'What must your learning plan fit?', 'Your time, pace and preferred format'],
] as const

const experienceOptions: readonly [ExperienceLevel, string, string][] = [
  ['none', 'Not started', 'No practical example yet'],
  ['exposure', 'Read or watched examples', 'Introductory material or tool use'],
  ['guided', 'Followed an example', 'Closely followed an exercise'],
  ['adapted', 'Changed an example for my task', 'Adapted it for real use'],
  ['independent', 'Built and tested it myself', 'Chose the approach independently'],
  ['demonstrated', 'Other people have used it', 'Applied in a real setting'],
]

const capabilityLabels: Record<CapabilityDomain, string> = {
  'ai-assisted-work': 'AI-assisted work',
  automation: 'Automation and integrations',
  applications: 'Building AI applications',
  'data-retrieval': 'Data and retrieval',
  'evaluation-safety': 'Evaluation, safety and reliability',
}

type CapabilityExperienceStage = 'new' | 'everyday' | 'workflows' | 'builder' | 'advanced'

const capabilityExperienceOptions: readonly [CapabilityExperienceStage, string, string][] = [
  ['new', 'I’m just getting started with AI', 'I have tried a few tools, watched tutorials, or experimented occasionally.'],
  ['everyday', 'I use AI for everyday tasks', 'For example: writing and editing, email drafting, research, summaries, brainstorming, or presentations.'],
  ['workflows', 'I have created repeatable AI workflows', 'I use prompts, custom assistants, automations, or connected tools to complete recurring work.'],
  ['builder', 'I have built and tested AI tools', 'I have made an app, automation, or data-based AI system and checked whether it works reliably.'],
  ['advanced', 'I build and operate AI systems', 'I have deployed systems, evaluated quality, monitored performance, and managed release or rollback decisions.'],
]

const codingComfortOptions: readonly [Exclude<CapabilityIntake['foundations']['codingComfort'], ''>, string][] = [
  ['none', 'I have not written code'],
  ['modify-examples', 'I can edit simple examples'],
  ['small-programs', 'I can build small scripts'],
  ['experienced', 'I build and debug software'],
]

const dataComfortOptions: readonly [DataComfort, string][] = [
  ['documents', 'Documents, PDFs, and web pages'],
  ['spreadsheets', 'Spreadsheets and simple tables'],
  ['queries', 'Databases, SQL, or dashboards'],
  ['pipelines', 'Data pipelines or ML models'],
]

const dataComfortLabelByValue = Object.fromEntries(dataComfortOptions) as Record<DataComfort, string>
const dataComfortValueByLabel = Object.fromEntries(dataComfortOptions.map(([value, label]) => [label, value])) as Record<string, DataComfort>

const capabilityStageLevels: Record<
  CapabilityExperienceStage,
  Readonly<Record<CapabilityDomain, ExperienceLevel>>
> = {
  new: {
    'ai-assisted-work': 'exposure',
    automation: 'none',
    applications: 'none',
    'data-retrieval': 'none',
    'evaluation-safety': 'none',
  },
  everyday: {
    'ai-assisted-work': 'guided',
    automation: 'none',
    applications: 'none',
    'data-retrieval': 'none',
    'evaluation-safety': 'none',
  },
  workflows: {
    'ai-assisted-work': 'adapted',
    automation: 'adapted',
    applications: 'guided',
    'data-retrieval': 'exposure',
    'evaluation-safety': 'guided',
  },
  builder: {
    'ai-assisted-work': 'independent',
    automation: 'adapted',
    applications: 'adapted',
    'data-retrieval': 'adapted',
    'evaluation-safety': 'guided',
  },
  advanced: {
    'ai-assisted-work': 'independent',
    automation: 'independent',
    applications: 'demonstrated',
    'data-retrieval': 'demonstrated',
    'evaluation-safety': 'demonstrated',
  },
}

function capabilityExperienceStage(
  levels: Readonly<Record<CapabilityDomain, ExperienceLevel>>,
): CapabilityExperienceStage | '' {
  if (Object.values(levels).every(level => level === 'none')) return ''

  if (
    ['demonstrated', 'operational'].includes(levels.applications) ||
    ['demonstrated', 'operational'].includes(levels['data-retrieval']) ||
    ['demonstrated', 'operational'].includes(levels['evaluation-safety'])
  ) return 'advanced'

  if (
    ['adapted', 'independent', 'demonstrated', 'operational'].includes(levels.applications) ||
    ['adapted', 'independent', 'demonstrated', 'operational'].includes(levels['data-retrieval']) ||
    ['independent', 'demonstrated', 'operational'].includes(levels['ai-assisted-work'])
  ) return 'builder'

  if (
    ['adapted', 'independent', 'demonstrated', 'operational'].includes(levels.automation) ||
    ['adapted', 'independent', 'demonstrated', 'operational'].includes(levels['ai-assisted-work'])
  ) return 'workflows'

  if (['guided', 'adapted', 'independent', 'demonstrated', 'operational'].includes(levels['ai-assisted-work'])) {
    return 'everyday'
  }

  return 'new'
}

const interestOptions = [
  ['everyday-work', 'Use AI better in my everyday work', 'Writing, research, analysis, presentations, email, and similar tasks.'],
  ['automate-repeated-work', 'Save time by automating repeated work', 'Connect tools, move information, create drafts, and reduce manual steps.'],
  ['build-ai-tool', 'Build something with AI', 'Create an assistant, application, workflow, or internal tool.'],
  ['improve-reliability', 'Make AI results more accurate and reliable', 'Test outputs, reduce mistakes, add human review, and improve quality.'],
  ['discover-fit', 'Help me discover what would suit me', 'I’m not sure yet—show me possibilities based on my work and experience.'],
] as const

const toolOptions = ['ChatGPT', 'Claude', 'Gemini', 'Microsoft Copilot', 'n8n', 'Zapier', 'Model APIs'] as const

function PathMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 17c4-8 7-3 10-9 1.5-3 3.4-3.2 6-1" />
      <circle cx="4" cy="17" r="2" />
      <circle cx="20" cy="6" r="2" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="8.5" y="3" width="7" height="11" rx="3.5" />
      <path d="M5 10.5a7 7 0 0 0 14 0M12 17.5V21M8.5 21h7" />
    </svg>
  )
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

function CheckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
}

function Header({
  scene,
  onRestart,
  authenticatedExperienceEnabled,
  busy,
}: {
  scene: 'diagnostic' | 'result'
  onRestart(): void
  authenticatedExperienceEnabled: boolean
  busy: boolean
}) {
  return (
    <header className="ap-ds-header">
      <button type="button" className="ap-ds-brand" onClick={onRestart} aria-label="AI Path home" disabled={busy}>
        <span><PathMark /></span>
        <strong>AI Path</strong>
      </button>
      <div className="ap-ds-headerMeta">
        <span>{scene === 'diagnostic' ? 'Your questions' : 'Your plan'}</span>
        {authenticatedExperienceEnabled ? (
          <a className="ap-ds-accountLink" href="/ai-path/account">Account</a>
        ) : <span className="ap-ds-preview">Preview</span>}
      </div>
    </header>
  )
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  compact = false,
  stacked = false,
}: {
  label: string
  value: T | ''
  options: readonly (readonly [T, string, string?])[]
  onChange(value: T): void
  compact?: boolean
  stacked?: boolean
}) {
  return (
    <fieldset className={`ap-ds-choiceGroup${compact ? ' is-compact' : ''}${stacked ? ' is-stacked' : ''}`}>
      <legend>{label}</legend>
      <div>
        {options.map(([option, title, detail]) => (
          <label className={value === option ? 'is-selected' : ''} key={option}>
            <input type="radio" value={option} checked={value === option} onChange={() => onChange(option)} />
            <span><strong>{title}</strong>{detail ? <small>{detail}</small> : null}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function DetailedMultiChoice<T extends string>({
  label,
  hint,
  values,
  options,
  exclusiveValue,
  limit,
  onChange,
}: {
  label: string
  hint?: string
  values: readonly T[]
  options: readonly (readonly [T, string, string?])[]
  exclusiveValue?: T
  limit?: number
  onChange(values: T[]): void
}) {
  const toggle = (option: T) => {
    if (values.includes(option)) {
      onChange(values.filter(value => value !== option))
      return
    }
    if (option === exclusiveValue) {
      onChange([option])
      return
    }
    if (limit && values.filter(value => value !== exclusiveValue).length >= limit) return
    onChange([...values.filter(value => value !== exclusiveValue), option])
  }

  return (
    <fieldset className="ap-ds-choiceGroup is-stacked is-multiple">
      <legend>{label}{hint ? <small>{hint}</small> : null}</legend>
      <div>
        {options.map(([option, title, detail]) => (
          <label className={values.includes(option) ? 'is-selected' : ''} key={option}>
            <input type="checkbox" value={option} checked={values.includes(option)} onChange={() => toggle(option)} />
            <span>
              <strong>{title}</strong>
              {values.includes(option) ? <em className="ap-ds-choicePriority">{values.indexOf(option) === 0 ? 'Primary goal' : 'Secondary goal'}</em> : null}
              {detail ? <small>{detail}</small> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function MultiChoice({
  label,
  values,
  options,
  limit,
  onChange,
}: {
  label: string
  values: readonly string[]
  options: readonly string[]
  limit?: number
  onChange(values: string[]): void
}) {
  const toggle = (option: string) => {
    if (values.includes(option)) onChange(values.filter(value => value !== option))
    else if (!limit || values.length < limit) onChange([...values, option])
  }
  return (
    <fieldset className="ap-ds-multiChoice">
      <legend>{label}{limit ? <small>Choose up to {limit}</small> : null}</legend>
      <div>
        {options.map(option => (
          <label className={values.includes(option) ? 'is-selected' : ''} key={option}>
            <input type="checkbox" checked={values.includes(option)} onChange={() => toggle(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function TextAreaField({
  id,
  label,
  help,
  value,
  placeholder,
  onChange,
  rows = 4,
  inputAccessory,
}: {
  id: string
  label: string
  help?: string
  value: string
  placeholder?: string
  onChange(value: string): void
  rows?: number
  inputAccessory?: React.ReactNode
}) {
  return (
    <div className="ap-ds-field">
      <div className="ap-ds-fieldLabel">
        <label htmlFor={id}>{label}</label>
      </div>
      {help ? <p>{help}</p> : null}
      <div className="ap-ds-textAreaWrap">
        <textarea id={id} value={value} onChange={event => onChange(event.target.value)} rows={rows} maxLength={2000} placeholder={placeholder} />
        {inputAccessory}
      </div>
    </div>
  )
}

function Section({
  id,
  number,
  title,
  reason,
  status,
  issues,
  active,
  onActivate,
  children,
}: {
  id: string
  number: number
  title: string
  reason: string
  status: ReadinessStatus
  issues: readonly string[]
  active: boolean
  onActivate(): void
  children: React.ReactNode
}) {
  const statusLabel = status === 'complete' ? 'Captured' : status === 'needs_evidence' ? 'Needs evidence' : 'Incomplete'
  return (
    <fieldset
      id={`ap-section-${id}`}
      data-section-id={id}
      className={`ap-ds-section is-${status}${active ? ' is-active' : ''}`}
      aria-invalid={status !== 'complete'}
      aria-describedby={issues.length ? `ap-section-${id}-issues` : undefined}
      onFocusCapture={onActivate}
      onClick={onActivate}
    >
      <legend className="sr-only">{number}. {title}</legend>
      <div className="ap-ds-sectionHeading">
        <span aria-hidden="true">{String(number).padStart(2, '0')}</span>
        <div><h2 id={`ap-section-title-${id}`} tabIndex={-1}>{title}</h2><p>{reason}</p></div>
        <small><i aria-hidden="true" />{statusLabel === 'Captured' ? 'Done' : statusLabel === 'Needs evidence' ? 'Needs an example' : 'Not finished'}</small>
      </div>
      <div className="ap-ds-sectionBody">{children}</div>
      {issues.length ? <ul id={`ap-section-${id}-issues`} className="ap-ds-issues" aria-label={`${title} requirements`}>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : null}
    </fieldset>
  )
}

function QuestionProgress({
  sections,
  statuses,
  activeId,
  onSelect,
}: {
  sections: readonly (readonly [string, string, string])[]
  statuses: ReadonlyMap<string, ReadinessStatus>
  activeId: string
  onSelect(id: string): void
}) {
  const completed = sections.filter(([id]) => statuses.get(id) === 'complete').length
  return (
    <nav className="ap-ds-progress" aria-label="Your questions">
      <div className="ap-ds-progressCopy">
        <span>Question {Math.max(1, sections.findIndex(([id]) => id === activeId) + 1)} of 6</span>
        <strong>{sections.find(([id]) => id === activeId)?.[1]}</strong>
        <small>{completed} complete</small>
      </div>
      <ol aria-label="Question progress">
        {sections.map(([id, title, detail], index) => {
          const status = statuses.get(id) ?? 'missing'
          return (
            <li className={`${activeId === id ? 'is-active' : ''} is-${status}`} key={id}>
              <button type="button" onClick={() => onSelect(id)}>
                <i aria-hidden="true">{status === 'complete' ? <CheckIcon /> : index + 1}</i>
                <span className="sr-only">{title}: {status === 'complete' ? 'done' : status === 'needs_evidence' ? 'needs an example' : detail}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="ap-ds-progressLine" aria-hidden="true"><i style={{ width: `${((sections.findIndex(([id]) => id === activeId) + 1) / 6) * 100}%` }} /></div>
    </nav>
  )
}

function UseCaseForm({
  value,
  readiness,
  presentations,
  activeSection,
  inputAccessory,
  onActivate,
  onChange,
}: {
  value: UseCaseIntake
  readiness: ReturnType<typeof validateUseCaseIntake>
  presentations: PresentationMap
  activeSection: string
  inputAccessory?: React.ReactNode
  onActivate(id: string): void
  onChange(value: UseCaseIntake): void
}) {
  const status = new Map(readiness.sections.map(section => [section.id, section]))
  const adaptive = (id: (typeof USE_CASE_SECTION_IDS)[number]) => presentations[id] ?? canonicalQuestionPresentation('use-case', id)
  const common = (id: (typeof USE_CASE_SECTION_IDS)[number], index: number) => ({
    id,
    number: index + 1,
    title: adaptive(id).title,
    reason: adaptive(id).reason,
    status: status.get(id)?.status ?? 'missing' as ReadinessStatus,
    issues: status.get(id)?.issues ?? [],
    active: activeSection === id,
    onActivate: () => onActivate(id),
  })
  return (
    <div className="ap-ds-sections" data-path="use-case">
      <Section {...common('outcome', 0)}>
        <TextAreaField id="ap-outcome" label={adaptive('outcome').prompt} help="Describe who it is for, the task, and what should be better when it works." value={value.outcome.desiredOutcome} onChange={desiredOutcome => onChange({ ...value, outcome: { desiredOutcome } })} placeholder="Type your answer…" inputAccessory={inputAccessory} />
      </Section>

      <Section {...common('workflow', 1)}>
        <TextAreaField id="ap-workflow" label={adaptive('workflow').prompt} help="Walk through the current steps. Name the slowest, least reliable, or hardest-to-review part." value={value.workflow.currentProcess} onChange={currentProcess => onChange({ ...value, workflow: { currentProcess } })} placeholder="Type your answer…" inputAccessory={inputAccessory} />
      </Section>

      <Section {...common('specification', 2)}>
        <p className="ap-ds-sectionPrompt">{adaptive('specification').prompt}</p>
        <div className="ap-ds-specGrid">
          <TextAreaField id="ap-inputs" label="What will it receive?" help="For example: documents, messages, spreadsheet rows, images or form responses." value={value.specification.inputs} onChange={inputs => onChange({ ...value, specification: { ...value.specification, inputs } })} rows={3} placeholder="Type your answer…" inputAccessory={inputAccessory} />
          <TextAreaField id="ap-output" label="What should it produce?" help="For example: a cited draft, recommendation, summary or structured record." value={value.specification.output} onChange={output => onChange({ ...value, specification: { ...value.specification, output } })} rows={3} placeholder="Type your answer…" inputAccessory={inputAccessory} />
          <TextAreaField id="ap-success" label="How will you know it works?" value={value.specification.success} onChange={success => onChange({ ...value, specification: { ...value.specification, success } })} rows={3} placeholder="One or two observable acceptance criteria" inputAccessory={inputAccessory} />
        </div>
      </Section>

      <Section {...common('experience', 3)}>
        <ChoiceGroup label={adaptive('experience').prompt} value={value.experience.level} options={experienceOptions} onChange={level => onChange({ ...value, experience: { ...value.experience, level } })} />
        {value.experience.level && value.experience.level !== 'none' ? (
          <div className="ap-ds-conditional">
            <TextAreaField id="ap-use-case-evidence" label="What did you make or test?" help="Say what you did yourself, what happened, and how you checked it." value={value.experience.evidence} onChange={evidence => onChange({ ...value, experience: { ...value.experience, evidence } })} rows={3} placeholder="Type your answer…" inputAccessory={inputAccessory} />
            <label className="ap-ds-simpleField" htmlFor="ap-use-case-artifact"><span>Artifact link <small>Optional</small></span><input id="ap-use-case-artifact" type="url" maxLength={500} value={value.experience.artifactUrl} onChange={event => onChange({ ...value, experience: { ...value.experience, artifactUrl: event.target.value } })} placeholder="https://…" /></label>
          </div>
        ) : null}
      </Section>

      <Section {...common('risk', 4)}>
        <p className="ap-ds-sectionPrompt">{adaptive('risk').prompt}</p>
        <div className="ap-ds-controlGrid">
          <ChoiceGroup compact label="How sensitive is the information?" value={value.risk.dataSensitivity} options={[["public", "Public"], ["internal", "Internal"], ["confidential", "Confidential"], ["regulated", "Regulated"], ["unsure", "Unsure"]]} onChange={dataSensitivity => onChange({ ...value, risk: { ...value.risk, dataSensitivity } })} />
          <ChoiceGroup compact label="What happens if the answer is wrong?" value={value.risk.consequence} options={[["low", "Low impact"], ["moderate", "Moderate"], ["serious", "Serious"], ["critical", "Critical"]]} onChange={consequence => onChange({ ...value, risk: { ...value.risk, consequence } })} />
          <ChoiceGroup compact label="Should a person approve it before use?" value={value.risk.humanApproval} options={[["yes", "Yes"], ["no", "No"], ["unsure", "Unsure"]]} onChange={humanApproval => onChange({ ...value, risk: { ...value.risk, humanApproval } })} />
        </div>
        <label className="ap-ds-simpleField" htmlFor="ap-systems"><span>Systems or data sources <small>Optional</small></span><input id="ap-systems" maxLength={500} value={value.risk.existingSystems} onChange={event => onChange({ ...value, risk: { ...value.risk, existingSystems: event.target.value } })} placeholder="Drive, CRM, warehouse, approved documents…" /></label>
        {['confidential', 'regulated'].includes(value.risk.dataSensitivity) || ['serious', 'critical'].includes(value.risk.consequence) ? <p className="ap-ds-warning"><strong>Guardrail required.</strong> The result will keep human approval, access control and failure testing in the core design.</p> : null}
      </Section>

      <Section {...common('constraints', 5)}>
        <p className="ap-ds-sectionPrompt">{adaptive('constraints').prompt}</p>
        <div className="ap-ds-controlGrid">
          <label className="ap-ds-simpleField" htmlFor="ap-role"><span>Your role in this work</span><input id="ap-role" maxLength={200} value={value.constraints.role} onChange={event => onChange({ ...value, constraints: { ...value.constraints, role: event.target.value } })} /></label>
          <label className="ap-ds-simpleField" htmlFor="ap-hours"><span>Hours available each week</span><input id="ap-hours" type="number" min="1" max="40" value={value.constraints.weeklyHours ?? ''} onChange={event => onChange({ ...value, constraints: { ...value.constraints, weeklyHours: event.target.value ? Number(event.target.value) : null } })} /></label>
        </div>
        <ChoiceGroup compact label="Coding comfort" value={value.constraints.codingComfort} options={codingComfortOptions} onChange={codingComfort => onChange({ ...value, constraints: { ...value.constraints, codingComfort } })} />
        <ChoiceGroup compact label="Preferred approach" value={value.constraints.approach} options={[["no-code-first", "No-code first"], ["code-first", "Code first"], ["either", "Open to either"]]} onChange={approach => onChange({ ...value, constraints: { ...value.constraints, approach } })} />
        <div className="ap-ds-controlGrid">
          <ChoiceGroup compact label="Working mode" value={value.constraints.teamMode} options={[["solo", "Working alone"], ["team", "With a team"]]} onChange={teamMode => onChange({ ...value, constraints: { ...value.constraints, teamMode } })} />
          <ChoiceGroup compact label="Tool budget" value={value.constraints.budget} options={[["free-only", "Free only"], ["low-cost-ok", "Low cost is fine"], ["organisation-decides", "Organisation decides"]]} onChange={budget => onChange({ ...value, constraints: { ...value.constraints, budget } })} />
        </div>
      </Section>
    </div>
  )
}

function CapabilityForm({
  value,
  readiness,
  presentations,
  activeSection,
  inputAccessory,
  onActivate,
  onChange,
}: {
  value: CapabilityIntake
  readiness: ReturnType<typeof validateCapabilityIntake>
  presentations: PresentationMap
  activeSection: string
  inputAccessory?: React.ReactNode
  onActivate(id: string): void
  onChange(value: CapabilityIntake): void
}) {
  const status = new Map(readiness.sections.map(section => [section.id, section]))
  const adaptive = (id: (typeof CAPABILITY_SECTION_IDS)[number]) => presentations[id] ?? canonicalQuestionPresentation('capability-growth', id)
  const common = (id: (typeof CAPABILITY_SECTION_IDS)[number], index: number) => ({
    id,
    number: index + 1,
    title: adaptive(id).title,
    reason: adaptive(id).reason,
    status: status.get(id)?.status ?? 'missing' as ReadinessStatus,
    issues: status.get(id)?.issues ?? [],
    active: activeSection === id,
    onActivate: () => onActivate(id),
  })
  const claimedDomains = (Object.keys(value.experience.levels) as CapabilityDomain[]).filter(domain => !['none', 'exposure', 'guided'].includes(value.experience.levels[domain]))
  const reasoningPresentation = adaptive('reasoning')
  const scenario = reasoningPresentation.context ?? canonicalQuestionPresentation('capability-growth', 'reasoning').context

  return (
    <div className="ap-ds-sections" data-path="capability-growth">
      <Section {...common('direction', 0)}>
        <label className="ap-ds-simpleField" htmlFor="ap-context"><span>Your role and the work this plan should relate to</span><input id="ap-context" maxLength={200} value={value.direction.roleContext} onChange={event => onChange({ ...value, direction: { ...value.direction, roleContext: event.target.value } })} placeholder="Sales manager working on forecasting and targets…" /></label>
        <div className="ap-ds-directionChoices">
          <DetailedMultiChoice
            label={adaptive('direction').prompt}
            hint="Choose a main goal and, optionally, one secondary goal"
            values={value.direction.interests}
            options={interestOptions}
            exclusiveValue="discover-fit"
            limit={2}
            onChange={interests => onChange({ ...value, direction: { ...value.direction, interests } })}
          />
        </div>
      </Section>

      <Section {...common('experience', 1)}>
        <ChoiceGroup
          stacked
          label={adaptive('experience').prompt}
          value={capabilityExperienceStage(value.experience.levels)}
          options={capabilityExperienceOptions}
          onChange={stage => {
            const levels: Record<CapabilityDomain, ExperienceLevel> = { ...capabilityStageLevels[stage] }
            const supportedDomains = value.evidence.supportedDomains.filter(domain => !['none', 'exposure', 'guided'].includes(levels[domain]))
            onChange({
              ...value,
              experience: { levels },
              evidence: { ...value.evidence, supportedDomains },
            })
          }}
        />
        <p className="ap-ds-calibration">Choose the closest match. You can tell us about your strongest example next.</p>
      </Section>

      <Section {...common('evidence', 2)}>
        <TextAreaField id="ap-capability-evidence" label={adaptive('evidence').prompt} help={adaptive('evidence').context ?? 'What did you do yourself? What was difficult? How did you check the result? “I haven’t built anything yet” is a valid answer.'} value={value.evidence.description} onChange={description => onChange({ ...value, evidence: { ...value.evidence, description } })} rows={5} placeholder="Type your answer…" inputAccessory={inputAccessory} />
        {claimedDomains.length ? <MultiChoice label="Which parts of this example did you personally work on?" values={value.evidence.supportedDomains.map(domain => capabilityLabels[domain])} options={claimedDomains.map(domain => capabilityLabels[domain])} onChange={selectedLabels => onChange({ ...value, evidence: { ...value.evidence, supportedDomains: claimedDomains.filter(domain => selectedLabels.includes(capabilityLabels[domain])) } })} /> : null}
        <label className="ap-ds-simpleField" htmlFor="ap-capability-artifact"><span>Artifact link <small>Optional</small></span><input id="ap-capability-artifact" type="url" maxLength={500} value={value.evidence.artifactUrl} onChange={event => onChange({ ...value, evidence: { ...value.evidence, artifactUrl: event.target.value } })} placeholder="https://…" /></label>
      </Section>

      <Section {...common('reasoning', 3)}>
        <div className="ap-ds-scenario"><span>{reasoningPresentation.variantId.includes('clarifier') ? 'What to include' : 'Imagine this situation'}</span><p>{scenario}</p></div>
        <TextAreaField id="ap-reasoning" label={reasoningPresentation.prompt} value={value.reasoning.response} onChange={response => onChange({ ...value, reasoning: { scenarioId: reasoningPresentation.variantId, response } })} rows={5} inputAccessory={inputAccessory} />
      </Section>

      <Section {...common('foundations', 4)}>
        <p className="ap-ds-sectionPrompt">{adaptive('foundations').prompt}</p>
        <ChoiceGroup compact label="Coding" value={value.foundations.codingComfort} options={codingComfortOptions} onChange={codingComfort => onChange({ ...value, foundations: { ...value.foundations, codingComfort } })} />
        <MultiChoice
          label="Data"
          values={value.foundations.dataComfort.map(option => dataComfortLabelByValue[option])}
          options={dataComfortOptions.map(([, label]) => label)}
          onChange={selectedLabels => onChange({
            ...value,
            foundations: {
              ...value.foundations,
              dataComfort: selectedLabels.map(label => dataComfortValueByLabel[label]).filter(Boolean),
            },
          })}
        />
        <MultiChoice label="AI tools you’ve used" values={value.foundations.tools} options={toolOptions} onChange={tools => onChange({ ...value, foundations: { ...value.foundations, tools } })} />
      </Section>

      <Section {...common('constraints', 5)}>
        <p className="ap-ds-sectionPrompt">{adaptive('constraints').prompt}</p>
        <div className="ap-ds-controlGrid">
          <label className="ap-ds-simpleField" htmlFor="ap-learning-hours"><span>Hours available each week</span><input id="ap-learning-hours" type="number" min="1" max="40" value={value.constraints.weeklyHours ?? ''} onChange={event => onChange({ ...value, constraints: { ...value.constraints, weeklyHours: event.target.value ? Number(event.target.value) : null } })} /></label>
          <ChoiceGroup compact label="Learning preference" value={value.constraints.learningPreference} options={[["guided", "Guided lessons"], ["projects", "Hands-on projects"], ["balanced", "Balanced"]]} onChange={learningPreference => onChange({ ...value, constraints: { ...value.constraints, learningPreference } })} />
        </div>
        <ChoiceGroup compact label="Desired pace" value={value.constraints.pace} options={[["exploratory", "Exploratory"], ["30-day", "30-day sprint"], ["longer", "Longer program"]]} onChange={pace => onChange({ ...value, constraints: { ...value.constraints, pace } })} />
        <div className="ap-ds-controlGrid">
          <ChoiceGroup compact label="Resources" value={value.constraints.resourceBudget} options={[["free-only", "Free only"], ["paid-ok", "Paid is acceptable"]]} onChange={resourceBudget => onChange({ ...value, constraints: { ...value.constraints, resourceBudget } })} />
          <ChoiceGroup compact label="Public project allowed" value={value.constraints.publicProject} options={[["yes", "Yes"], ["no", "No"], ["unsure", "Unsure"]]} onChange={publicProject => onChange({ ...value, constraints: { ...value.constraints, publicProject } })} />
        </div>
      </Section>
    </div>
  )
}

const SAVED_PLAN_STORAGE_KEY = 'ai-path.saved-next-step.v1'

function resultSignature(result: DiagnosticResult): string {
  const value = `${result.version}|${result.policyVersion}|${result.kind}|${result.title}|${result.firstStep.task}`
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `plan-${(hash >>> 0).toString(36)}`
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function safeResourceUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function ResultScene({
  result,
  onEdit,
  onRestart,
  authenticatedExperienceEnabled,
  savedToAccount,
}: {
  result: DiagnosticResult
  onEdit(): void
  onRestart(): void
  authenticatedExperienceEnabled: boolean
  savedToAccount: boolean
}) {
  const isUseCase = result.kind === 'use-case-blueprint'
  const signature = useMemo(() => resultSignature(result), [result])
  const [actionSaved, setActionSaved] = useState(false)
  const evidence = isUseCase ? [] : result.evidenceProfile.filter(item => item.assessedLevel !== 'none').slice(0, 3)
  const visibleReasons = result.personalizationReasons.slice(0, 4)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVED_PLAN_STORAGE_KEY) ?? 'null') as { signature?: string; savedAt?: string } | null
        const savedAt = saved?.savedAt ? Date.parse(saved.savedAt) : Number.NaN
        const current = saved?.signature === signature
          && Number.isFinite(savedAt)
          && Date.now() - savedAt <= 30 * 24 * 60 * 60_000
        if (!current) localStorage.removeItem(SAVED_PLAN_STORAGE_KEY)
        else localStorage.setItem(SAVED_PLAN_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, signature, savedAt: saved!.savedAt }))
        setActionSaved(current)
      } catch {
        setActionSaved(false)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [signature])

  function toggleSavedAction() {
    try {
      if (actionSaved) {
        const saved = JSON.parse(localStorage.getItem(SAVED_PLAN_STORAGE_KEY) ?? 'null') as { signature?: string } | null
        if (saved?.signature === signature) localStorage.removeItem(SAVED_PLAN_STORAGE_KEY)
        setActionSaved(false)
        return
      }
      localStorage.setItem(SAVED_PLAN_STORAGE_KEY, JSON.stringify({
        schemaVersion: 2,
        signature,
        savedAt: new Date().toISOString(),
      }))
      setActionSaved(true)
    } catch {
      setActionSaved(false)
    }
  }

  return (
    <main className="ap-ds-result" data-result-kind={result.kind}>
      <div className="ap-ds-resultTopline">
        <div><button type="button" onClick={onEdit}>← Edit my answers</button><button type="button" onClick={() => window.print()}>Print or save PDF</button></div>
        <span>{isUseCase ? 'Your project plan' : 'Your learning plan'}</span>
      </div>
      <section className="ap-ds-prescription" aria-labelledby="ap-plan-summary-title">
        <div className="ap-ds-prescriptionMain">
          <p className="ap-ds-kicker">{isUseCase ? 'A small version you can test' : 'What to learn and build next'}</p>
          <h1 tabIndex={-1}>{isUseCase ? 'Your AI project plan' : 'Your AI learning path'}</h1>
          <div className="ap-ds-prescriptionMeta">
            <span>{result.persona} path</span>
            {isUseCase ? (
              <span>{result.feasibility.rating === 'strong-fit' ? 'Strong fit' : result.feasibility.rating === 'possible-with-constraints' ? 'Good fit with safeguards' : 'Needs a different approach'}</span>
            ) : (
              <span>{result.confidence} confidence</span>
            )}
          </div>
          <h2 id="ap-plan-summary-title">{result.summary.recommendation}</h2>
          <p>{result.summary.reason}</p>
        </div>
        <aside className="ap-ds-nextStep" aria-labelledby="ap-next-step-title">
          <div className="ap-ds-firstStepHeading">
            <span>Start this week</span>
            <small>{formatMinutes(result.firstStep.timeboxMinutes)}</small>
          </div>
          <h2 id="ap-next-step-title">{result.firstStep.task}</h2>
          <div className="ap-ds-firstStepDetails">
            <div><strong>Use</strong><ul>{result.firstStep.inputs.map(input => <li key={input}>{input}</li>)}</ul></div>
            <div><strong>Done when</strong><p>{result.firstStep.doneWhen}</p></div>
          </div>
          <button type="button" className={actionSaved ? 'is-saved' : ''} onClick={toggleSavedAction} aria-pressed={actionSaved}>
            {actionSaved ? 'Next step saved' : 'Save next step'} {actionSaved ? <CheckIcon /> : <ArrowIcon />}
          </button>
          <small aria-live="polite">{actionSaved ? 'Saved in this browser. Select again to remove it.' : 'Keep this next step in this browser.'}</small>
        </aside>
        <dl className="ap-ds-planGuardrails">
          <div><dt>Owner</dt><dd>{result.summary.owner}</dd></div>
          <div><dt>Decision gate</dt><dd>{result.summary.decisionGate}</dd></div>
          <div><dt>Checkpoint</dt><dd>{result.summary.checkpoint}</dd></div>
          <div><dt>Human review</dt><dd>{result.summary.riskBoundary}</dd></div>
        </dl>
      </section>

      <section className="ap-ds-month">
        <p className="ap-ds-kicker">Your next four weeks</p>
        <h2>{isUseCase ? 'From first test to a useful result' : 'From first practice to something you can show'}</h2>
        <div>{result.weeks.map(week => <article key={week.week}><span>{week.week}</span><small>Week {week.week} · {formatMinutes(week.estimatedMinutes)}</small><h3>{week.focus}</h3><p>{week.outcome}</p><details><summary>Weekly actions</summary><ul>{week.activities.map(activity => <li key={activity}>{activity}</li>)}</ul></details></article>)}</div>
      </section>

      <section className="ap-ds-resources">
        <p className="ap-ds-kicker">Learn only what the project needs</p>
        <h2>Reviewed resources, fitted into your weekly plan</h2>
        <div>{result.resources.map((resource, index) => {
          const url = safeResourceUrl(resource.canonicalUrl)
          return <article key={resource.id}>
            <div className="ap-ds-resourceTopline"><span>Week {resource.week}</span><small className={`is-${resource.cost.kind}`}>{resource.cost.kind === 'free' ? 'Free' : resource.cost.kind === 'freemium' ? 'Free + optional paid' : 'Paid'}</small></div>
            <h3><span className="sr-only">Resource {index + 1}: </span>{resource.title}</h3>
            <p className="ap-ds-resourcePlanTime">{formatMinutes(resource.planMinutes)} included in your plan</p>
            <p>{resource.purpose}</p>
            <details><summary>Details and access</summary><p className="ap-ds-resourceMeta">{resource.provider} · {resource.format} · {formatMinutes(resource.estimatedMinutes)} full resource</p><p>{resource.cost.disclosure}</p>{!url ? <p className="ap-ds-resourceOutcome"><strong>What you will produce:</strong> {resource.outcome}</p> : null}</details>
            {url ? <a href={url} target="_blank" rel="noreferrer">Open resource <span aria-hidden="true">↗</span></a> : <span className="ap-ds-includedResource">Activity included in your plan</span>}
          </article>
        })}</div>
      </section>

      {isUseCase ? (
        <>
          <div className="ap-ds-resultGrid">
            <section><p className="ap-ds-kicker">Build this first</p><h2>{result.prototype.title}</h2><p>{result.prototype.scope}</p><details><summary>Scope boundaries</summary><strong>Keep out of the first version</strong><ul>{result.prototype.excluded.map(item => <li key={item}>{item}</li>)}</ul></details></section>
            <section><p className="ap-ds-kicker">How it should work</p><h2>{result.architecture.pattern}</h2><details open><summary>Workflow stages</summary><ol>{result.architecture.stages.map(stage => <li key={stage}>{stage}</li>)}</ol></details></section>
          </div>
          <div className="ap-ds-resultGrid">
            <section><p className="ap-ds-kicker">How you’ll know it works</p><h2>{result.evaluation.acceptanceTarget}</h2><details><summary>Checks to run</summary><ul>{result.evaluation.checks.map(check => <li key={check}><CheckIcon />{check}</li>)}</ul></details></section>
            <section><p className="ap-ds-kicker">What needs human review</p><h2>{result.risk.level}</h2><details><summary>Safeguards</summary><ul>{result.risk.safeguards.map(item => <li key={item}><CheckIcon />{item}</li>)}</ul></details></section>
          </div>
          <section className="ap-ds-skills"><p className="ap-ds-kicker">What to learn for this project</p><div>{result.skills.map((skill, index) => <article key={skill}><span>0{index + 1}</span><h3>{skill}</h3></article>)}</div></section>
        </>
      ) : (
        <>
          {result.discoveryExamples.length ? (
            <section className="ap-ds-discoveryExamples" aria-labelledby="ap-discovery-examples-title">
              <div><p className="ap-ds-kicker">Safe ways to start</p><h2 id="ap-discovery-examples-title">Three examples you can try</h2></div>
              <div>
                {result.discoveryExamples.map(example => (
                  <article key={example.id}>
                    <div><h3>{example.title}</h3><span>{formatMinutes(example.timeboxMinutes)}</span></div>
                    <dl>
                      <div><dt>Input</dt><dd>{example.input}</dd></div>
                      <div><dt>Output</dt><dd>{example.output}</dd></div>
                      <div><dt>Complete when</dt><dd>{example.completionCheck}</dd></div>
                      <div><dt>Privacy boundary</dt><dd>{example.privacyBoundary}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          <div className="ap-ds-resultGrid">
            <section><p className="ap-ds-kicker">Project to build</p><h2>{result.project.title}</h2><p>{result.project.outcome}</p><details open><summary>Deliverables</summary><ul>{result.project.deliverables.map(item => <li key={item}>{item}</li>)}</ul></details></section>
            <section><p className="ap-ds-kicker">Focus on this skill</p><h2>{result.nextCapability}</h2>{result.secondaryCapabilities.length ? <p>Then add: {result.secondaryCapabilities.join(' · ')}</p> : null}<p>This project creates evidence you can inspect—not merely another course completion.</p><details><summary>How you’ll know the project is done</summary><ul>{result.definitionOfDone.map(item => <li key={item}>{item}</li>)}</ul></details></section>
          </div>
          <section className="ap-ds-evidenceSummary">
            <div><p className="ap-ds-kicker">Your starting point</p><h2>{result.strongest}</h2><span className="ap-ds-confidence">{result.confidence} confidence</span></div>
            <div>
              {evidence.length ? <div className="ap-ds-evidenceChips">{evidence.map(item => <span key={item.domain}><strong>{item.label}</strong>{item.assessment}</span>)}</div> : <p>No practical evidence was claimed yet. The plan starts by creating a small example.</p>}
              <div className="ap-ds-evidenceGap"><strong>What the plan will help you prove</strong><p>{result.evidenceGap.summary}</p></div>
            </div>
          </section>
        </>
      )}

      <details className="ap-ds-starterArtifact">
        <summary>
          <span><span className="ap-ds-kicker">Included starter template</span><strong>{result.starterArtifact.title}</strong></span>
          <em>{result.starterArtifact.format}</em>
        </summary>
        <p>{result.starterArtifact.instructions}</p>
        <div className="ap-ds-templateFields">
          {result.starterArtifact.fields.map(field => (
            <article key={field.label}>
              <h3>{field.label}</h3>
              <p>{field.guidance}</p>
              {field.example ? <small><strong>Example:</strong> {field.example}</small> : null}
            </article>
          ))}
        </div>
      </details>

      <section className="ap-ds-supportingDetails" aria-labelledby="ap-supporting-details-title">
        <div>
          <p className="ap-ds-kicker">Why this recommendation</p>
          <h2 id="ap-supporting-details-title">The reasoning is here if you want it</h2>
        </div>
        <details>
          <summary>Built from what you told us</summary>
          <p>{result.planProfile.role} · {result.planProfile.weeklyHours} {result.planProfile.weeklyHours === 1 ? 'hour' : 'hours'} a week</p>
          <div className="ap-ds-planReasons">
            {visibleReasons.map(reason => <p key={reason.id}><CheckIcon /><span>{reason.detail}</span></p>)}
          </div>
          <div className="ap-ds-planProfile" aria-label="Plan settings">
            <span>{result.planProfile.buildMode}</span>
            <span>{result.planProfile.learningMode}</span>
            <span>{result.planProfile.budgetMode}</span>
          </div>
        </details>
        {result.assumptions.length ? (
          <details>
            <summary>What we assumed</summary>
            <ul>{result.assumptions.map(assumption => <li key={assumption.id}>{assumption.detail}</li>)}</ul>
          </details>
        ) : null}
        {result.evidenceProjectLinks.length ? (
          <details>
            <summary>How your answers shaped the plan</summary>
            <div className="ap-ds-evidenceLinksList">
              {result.evidenceProjectLinks.map(link => <article key={link.id}><strong>{link.signal}</strong><p>{link.interpretation}</p><small>{link.projectEffect}</small></article>)}
            </div>
          </details>
        ) : null}
      </section>

      <div className="ap-ds-resultFooter"><button type="button" onClick={onRestart}>Start over</button><p>{savedToAccount
        ? 'Your answers and plan were saved to your account for up to 90 days.'
        : authenticatedExperienceEnabled
        ? 'This plan was not saved. No course, paid learning tool, or paid AI service was activated.'
        : 'No account, course, paid tool or outside service was activated.'}</p></div>
    </main>
  )
}

export function AdvisorApp({
  authenticatedExperienceEnabled = false,
  storagePersistenceAvailable = false,
}: {
  authenticatedExperienceEnabled?: boolean
  storagePersistenceAvailable?: boolean
}) {
  const [scene, setScene] = useState<'diagnostic' | 'result'>('diagnostic')
  const [path, setPath] = useState<DiagnosticPath | null>(null)
  const [useCase, setUseCase] = useState<UseCaseIntake>(() => structuredClone(INITIAL_USE_CASE_INTAKE))
  const [capability, setCapability] = useState<CapabilityIntake>(() => structuredClone(INITIAL_CAPABILITY_INTAKE))
  const [activeSection, setActiveSection] = useState('outcome')
  const [showErrors, setShowErrors] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [storageConsent, setStorageConsent] = useState(false)
  const [savedToAccount, setSavedToAccount] = useState(false)
  const [adaptivePresentations, setAdaptivePresentations] = useState<Record<DiagnosticPath, PresentationMap>>({
    'use-case': {},
    'capability-growth': {},
  })
  const [isAdapting, setIsAdapting] = useState(false)
  const [usedClarifierSectionIds, setUsedClarifierSectionIds] = useState<DiagnosticSectionId[]>([])
  const [clarifierAnswerBaselines, setClarifierAnswerBaselines] = useState<ClarifierAnswerBaselines>({})
  const adaptationRevision = useRef(0)
  const adaptationAbort = useRef<AbortController | null>(null)
  const submissionRevision = useRef(0)
  const submissionAbort = useRef<AbortController | null>(null)
  const storageSubmission = useRef<{ fingerprint: string; idempotencyKey: string } | null>(null)

  const microphone = useMemo(() => createBrowserMicrophonePreflightController(), [])
  const mic = useSyncExternalStore(microphone.subscribe, microphone.getSnapshot, () => INITIAL_MICROPHONE_PREFLIGHT_SNAPSHOT)

  useEffect(() => {
    void microphone.refreshDevices()
    return () => {
      adaptationAbort.current?.abort()
      submissionAbort.current?.abort()
      microphone.destroy()
    }
  }, [microphone])

  useEffect(() => {
    if (scene !== 'result') return
    window.scrollTo({ top: 0, behavior: 'auto' })
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('.ap-ds-result h1')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [scene])

  const useCaseReadiness = useMemo(() => validateUseCaseIntake(useCase), [useCase])
  const capabilityReadiness = useMemo(() => validateCapabilityIntake(capability), [capability])
  const effectiveUseCaseReadiness = useMemo(() => applyClarifierReadiness(
    useCaseReadiness,
    useCase as unknown as Readonly<Record<string, unknown>>,
    clarifierAnswerBaselines,
  ), [clarifierAnswerBaselines, useCase, useCaseReadiness])
  const effectiveCapabilityReadiness = useMemo(() => applyClarifierReadiness(
    capabilityReadiness,
    capability as unknown as Readonly<Record<string, unknown>>,
    clarifierAnswerBaselines,
  ), [capability, capabilityReadiness, clarifierAnswerBaselines])
  const readiness = path === 'use-case' ? effectiveUseCaseReadiness : effectiveCapabilityReadiness
  const baseSections = path === 'use-case' ? useCaseSections : capabilitySections
  const presentations = path ? adaptivePresentations[path] : {}
  const sections = baseSections.map(([id, title, detail]) => {
    const adapted = presentations[id as DiagnosticSectionId]
    return [id, adapted?.title ?? title, adapted?.reason ?? detail] as const
  })
  const statuses = new Map(readiness.sections.map(section => [section.id, section.status]))
  const sectionIds = path === 'use-case' ? USE_CASE_SECTION_IDS : CAPABILITY_SECTION_IDS
  const currentIndex = Math.max(0, sectionIds.findIndex(id => id === activeSection))
  const currentSection = readiness.sections.find(section => section.id === activeSection)
  const isLastQuestion = currentIndex === sectionIds.length - 1

  const choosePath = (nextPath: DiagnosticPath) => {
    submissionAbort.current?.abort()
    submissionRevision.current += 1
    setIsSubmitting(false)
    adaptationAbort.current?.abort()
    adaptationRevision.current += 1
    setIsAdapting(false)
    setPath(nextPath)
    setActiveSection(nextPath === 'use-case' ? USE_CASE_SECTION_IDS[0] : CAPABILITY_SECTION_IDS[0])
    setShowErrors(false)
    setUsedClarifierSectionIds([])
    setClarifierAnswerBaselines({})
  }

  const selectSection = (id: string, focusFirstControl = false) => {
    setActiveSection(id)
    requestAnimationFrame(() => {
      const section = document.getElementById(`ap-section-${id}`)
      section?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const focusTarget = focusFirstControl
        ? section?.querySelector<HTMLElement>('textarea, input:not([type="hidden"]), select, button')
        : document.getElementById(`ap-section-title-${id}`)
      focusTarget?.focus({ preventScroll: true })
    })
  }

  const cancelSubmission = () => {
    submissionAbort.current?.abort()
    submissionAbort.current = null
    submissionRevision.current += 1
    setIsSubmitting(false)
  }

  const invalidateFollowingPresentations = (changedPath: DiagnosticPath, sectionId: string) => {
    adaptationAbort.current?.abort()
    adaptationRevision.current += 1
    setIsAdapting(false)
    const ids = changedPath === 'use-case' ? USE_CASE_SECTION_IDS : CAPABILITY_SECTION_IDS
    const changedIndex = ids.findIndex(id => id === sectionId)
    if (changedIndex < 0) return
    setUsedClarifierSectionIds(current => current.filter(id => ids.indexOf(id as never) <= changedIndex))
    setClarifierAnswerBaselines(current => {
      const next: Partial<Record<DiagnosticSectionId, string>> = { ...current }
      let changed = false
      for (const id of ids.slice(changedIndex)) {
        if (next[id]) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : current
    })
    setAdaptivePresentations(current => {
      const nextPathPresentations = { ...current[changedPath] }
      let changed = false
      for (const id of ids.slice(changedIndex + 1)) {
        if (nextPathPresentations[id]) {
          delete nextPathPresentations[id]
          changed = true
        }
      }
      return changed ? { ...current, [changedPath]: nextPathPresentations } : current
    })
  }

  const startMicrophoneTest = () => {
    if (mic.phase !== 'ready' && mic.phase !== 'requesting') void microphone.start(mic.selectedDeviceId)
  }
  const textInputAccessory = (
    <button
      type="button"
      className="ap-ds-fieldMic"
      onClick={startMicrophoneTest}
      aria-label="Test microphone locally"
      title={mic.phase === 'ready' ? 'Microphone detected' : 'Test microphone locally'}
    >
      <MicIcon />
      <span>{mic.phase === 'requesting' ? 'Allowing...' : mic.phase === 'ready' ? 'Mic ready' : 'Mic'}</span>
    </button>
  )

  const continueQuestion = async () => {
    if (isAdapting) return
    if (currentSection?.status !== 'complete') {
      setShowErrors(true)
      selectSection(activeSection, true)
      return
    }
    setShowErrors(false)
    const nextId = sectionIds[currentIndex + 1]
    if (!nextId || !path) return

    const answers = (path === 'use-case' ? useCase : capability) as unknown as Readonly<Record<string, unknown>>
    const fallback = localAdaptiveQuestionDecision({
      path,
      completedSectionId: activeSection as DiagnosticSectionId,
      expectedSectionId: nextId,
      answers,
      usedClarifierSectionIds,
    })
    const requestRevision = adaptationRevision.current + 1
    adaptationRevision.current = requestRevision
    adaptationAbort.current?.abort()
    const controller = new AbortController()
    adaptationAbort.current = controller
    setIsAdapting(true)
    let adaptation = fallback
    try {
      const [nextAdaptation] = await Promise.all([
        requestAdaptiveQuestion({
          path,
          completedSectionId: activeSection as DiagnosticSectionId,
          expectedSectionId: nextId,
          answers,
          usedClarifierSectionIds,
          signal: controller.signal,
        }),
        wait(MINIMUM_ADAPTIVE_THINKING_MS),
      ])
      adaptation = nextAdaptation
    } catch {
      await wait(MINIMUM_ADAPTIVE_THINKING_MS)
      // The fixed local route and approved deterministic copy remain available.
    }
    if (adaptationRevision.current !== requestRevision || controller.signal.aborted) return
    const destinationId = adaptation.action === 'clarify_current'
      ? activeSection as DiagnosticSectionId
      : nextId
    setAdaptivePresentations(current => ({
      ...current,
      [path]: { ...current[path], [destinationId]: adaptation.presentation },
    }))
    if (adaptation.action === 'clarify_current') {
      setUsedClarifierSectionIds(current => current.includes(destinationId) ? current : [...current, destinationId])
      setClarifierAnswerBaselines(current => ({
        ...current,
        [destinationId]: sectionAnswerFingerprint(answers, destinationId),
      }))
    }
    setIsAdapting(false)
    adaptationAbort.current = null
    selectSection(destinationId)
  }

  const previousQuestion = () => {
    adaptationAbort.current?.abort()
    adaptationRevision.current += 1
    setIsAdapting(false)
    setShowErrors(false)
    const previousId = sectionIds[currentIndex - 1]
    if (previousId) selectSection(previousId)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSubmitting || !path || !readiness.canSubmit) {
      setShowErrors(true)
      const first = readiness.sections.find(section => section.status !== 'complete')
      if (first) selectSection(first.id, true)
      return
    }
    setSubmitError('')
    setIsSubmitting(true)
    submissionAbort.current?.abort()
    const controller = new AbortController()
    const requestRevision = submissionRevision.current + 1
    submissionRevision.current = requestRevision
    submissionAbort.current = controller
    try {
      const intake = path === 'use-case' ? useCase : capability
      const save = authenticatedExperienceEnabled && storagePersistenceAvailable && storageConsent
      const fingerprint = JSON.stringify(intake)
      let idempotencyKey: string | null = null
      if (save) {
        if (!storageSubmission.current || storageSubmission.current.fingerprint !== fingerprint) {
          storageSubmission.current = { fingerprint, idempotencyKey: crypto.randomUUID() }
        }
        idempotencyKey = storageSubmission.current.idempotencyKey
      }
      const nextResult = path === 'use-case'
        ? await createDiagnosticResult(useCase, { save, idempotencyKey, signal: controller.signal })
        : await createDiagnosticResult(capability, { save, idempotencyKey, signal: controller.signal })
      if (controller.signal.aborted || submissionRevision.current !== requestRevision) return
      adaptationAbort.current?.abort()
      adaptationRevision.current += 1
      microphone.stop()
      setResult(nextResult)
      setSavedToAccount(save)
      setScene('result')
    } catch (error) {
      if (controller.signal.aborted || submissionRevision.current !== requestRevision) return
      setSubmitError(error instanceof Error ? error.message : 'Your plan could not be created. Please try again.')
    } finally {
      if (submissionRevision.current === requestRevision) {
        setIsSubmitting(false)
        submissionAbort.current = null
      }
    }
  }

  const restart = () => {
    submissionAbort.current?.abort()
    submissionAbort.current = null
    submissionRevision.current += 1
    adaptationAbort.current?.abort()
    adaptationRevision.current += 1
    microphone.stop()
    setScene('diagnostic')
    setPath(null)
    setUseCase(structuredClone(INITIAL_USE_CASE_INTAKE))
    setCapability(structuredClone(INITIAL_CAPABILITY_INTAKE))
    setActiveSection('outcome')
    setShowErrors(false)
    setResult(null)
    setSubmitError('')
    setIsSubmitting(false)
    setStorageConsent(false)
    setSavedToAccount(false)
    storageSubmission.current = null
    setAdaptivePresentations({ 'use-case': {}, 'capability-growth': {} })
    setUsedClarifierSectionIds([])
    setClarifierAnswerBaselines({})
    setIsAdapting(false)
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' })
      document.querySelector<HTMLElement>('.ap-ds-intro h1')?.focus({ preventScroll: true })
    })
  }

  return (
    <div className="ap-ds-shell">
      <Header
        scene={scene}
        onRestart={restart}
        authenticatedExperienceEnabled={authenticatedExperienceEnabled}
        busy={isSubmitting}
      />
      {scene === 'result' && result ? <ResultScene result={result} onEdit={() => setScene('diagnostic')} onRestart={restart} authenticatedExperienceEnabled={authenticatedExperienceEnabled} savedToAccount={savedToAccount} /> : (
        <main className={`ap-ds-main${path ? ' has-path' : ''}`}>
          <section className="ap-ds-intro" aria-labelledby="ap-ds-title">
            <div><p className="ap-ds-kicker">A practical AI plan</p><h1 id="ap-ds-title" tabIndex={-1}>What would you like help with?</h1></div>
            <p>Choose one. We’ll ask six short questions and give you a practical project and next step.</p>
          </section>

          <section className="ap-ds-pathSelector" aria-labelledby="ap-path-question">
            <div className="ap-ds-selectorLabel"><h2 id="ap-path-question">Choose a path</h2></div>
            <div className="ap-ds-pathOptions">
              <button type="button" disabled={isSubmitting} className={path === 'use-case' ? 'is-selected' : ''} aria-pressed={path === 'use-case'} onClick={() => choosePath('use-case')}>
                <span className="ap-ds-pathIcon" aria-hidden="true">✦</span><strong>I have a task or idea</strong><span className="ap-ds-pathDetail">Help me turn it into a small, testable AI project.</span><i>{path === 'use-case' ? <CheckIcon /> : <ArrowIcon />}</i>
              </button>
              <button type="button" disabled={isSubmitting} className={path === 'capability-growth' ? 'is-selected' : ''} aria-pressed={path === 'capability-growth'} onClick={() => choosePath('capability-growth')}>
                <span className="ap-ds-pathIcon" aria-hidden="true">↗</span><strong>I want to improve my AI skills</strong><span className="ap-ds-pathDetail">Help me choose what to learn and build next.</span><i>{path === 'capability-growth' ? <CheckIcon /> : <ArrowIcon />}</i>
              </button>
            </div>
          </section>

          {path ? (
            <form className="ap-ds-workbench" data-show-errors={showErrors} onSubmit={submit} noValidate aria-busy={isSubmitting}>
              <QuestionProgress sections={sections} statuses={statuses} activeId={activeSection} onSelect={selectSection} />
              <div className="ap-ds-formColumn">
                {path === 'use-case' ? (
                  <UseCaseForm value={useCase} readiness={effectiveUseCaseReadiness} presentations={presentations} activeSection={activeSection} inputAccessory={textInputAccessory} onActivate={setActiveSection} onChange={value => { if (isSubmitting) cancelSubmission(); setUseCase(value); invalidateFollowingPresentations('use-case', activeSection); setShowErrors(false) }} />
                ) : (
                  <CapabilityForm value={capability} readiness={effectiveCapabilityReadiness} presentations={presentations} activeSection={activeSection} inputAccessory={textInputAccessory} onActivate={setActiveSection} onChange={value => { if (isSubmitting) cancelSubmission(); setCapability(value); invalidateFollowingPresentations('capability-growth', activeSection); setShowErrors(false) }} />
                )}

                {isLastQuestion && authenticatedExperienceEnabled ? (
                  <label className={`ap-ds-storageConsent${storagePersistenceAvailable ? '' : ' is-unavailable'}`}>
                    <input
                      type="checkbox"
                      checked={storageConsent}
                      disabled={!storagePersistenceAvailable || isSubmitting}
                      onChange={event => setStorageConsent(event.target.checked)}
                    />
                    <span>
                      <strong>Save my answers and plan</strong>
                      <small>{storagePersistenceAvailable
                        ? 'Store them securely in my account for up to 90 days. I can delete my account data later.'
                        : 'Secure account storage is not enabled in this preview. Your plan will still be shown without being saved.'}</small>
                    </span>
                  </label>
                ) : null}

                <div className="ap-ds-questionNav">
                  <button type="button" className="ap-ds-backButton" onClick={previousQuestion} disabled={currentIndex === 0 || isSubmitting}>Back</button>
                  {isLastQuestion ? (
                    <button type="submit" className="ap-ds-continueButton" disabled={isSubmitting}>{isSubmitting ? 'Creating your plan…' : path === 'use-case' ? 'Create my project plan' : 'Create my learning plan'} {!isSubmitting ? <ArrowIcon /> : null}</button>
                  ) : (
                    <button type="button" className="ap-ds-continueButton" onClick={() => void continueQuestion()} disabled={isAdapting}>{isAdapting ? 'Thinking about your answer…' : 'Continue'} {!isAdapting ? <ArrowIcon /> : null}</button>
                  )}
                </div>
                <p className="sr-only" aria-live="polite">{isAdapting ? 'Checking whether one short follow-up is needed before the next planned question.' : ''}</p>
                {showErrors && currentSection?.status !== 'complete' ? <p className="ap-ds-errorSummary" role="alert">Please finish this question to continue.</p> : null}
                {submitError ? <p className="ap-ds-errorSummary" role="alert">{submitError}</p> : null}
                <div className="ap-ds-sessionTools" aria-label="Input and privacy notes">
                  <details className="ap-ds-privacyDetails">
                    <summary>Privacy and data use</summary>
                    <p><strong>Keep sensitive information out.</strong> Don’t enter passwords, API keys, financial or health information, or confidential customer or company data.</p>
                    <p>Optional microphone test only. It does not transcribe or submit audio.</p>
                    <p>Your typed answers are sent to AI Path to create this plan. They are not saved to your account unless you choose Save.</p>
                    <p>If provider-backed question tailoring is enabled, an AI provider may process them. Saved answers are kept for up to 90 days. <a href="/ai-path/privacy">Privacy</a> · <a href="/ai-path/terms">Terms</a></p>
                  </details>
                </div>
              </div>
            </form>
          ) : (
            <div className="ap-ds-emptyState"><p>About 10–15 minutes <span aria-hidden="true">·</span> Type your answers <span aria-hidden="true">·</span> No scores</p></div>
          )}
        </main>
      )}
    </div>
  )
}
