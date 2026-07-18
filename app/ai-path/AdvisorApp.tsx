'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import {
  createBrowserMicrophonePreflightController,
  INITIAL_MICROPHONE_PREFLIGHT_SNAPSHOT,
} from './client/microphone-preflight'
import {
  CAPABILITY_SECTION_IDS,
  INITIAL_CAPABILITY_INTAKE,
  INITIAL_USE_CASE_INTAKE,
  USE_CASE_SECTION_IDS,
  composeDiagnosticResult,
  validateCapabilityIntake,
  validateUseCaseIntake,
  type CapabilityDomain,
  type CapabilityIntake,
  type CapabilityPrescription,
  type DiagnosticPath,
  type ExperienceLevel,
  type ReadinessStatus,
  type UseCaseBlueprint,
  type UseCaseIntake,
} from './lib/diagnostic'

type DiagnosticResult = UseCaseBlueprint | CapabilityPrescription

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

type CapabilityExperienceStage = 'new' | 'everyday' | 'workflows' | 'builder'

const capabilityExperienceOptions: readonly [CapabilityExperienceStage, string, string][] = [
  ['new', 'I’m just getting started with AI', 'I have tried a few tools, watched tutorials, or experimented occasionally.'],
  ['everyday', 'I use AI for everyday tasks', 'For example: writing and editing, email drafting, research, summaries, brainstorming, or presentations.'],
  ['workflows', 'I have created repeatable AI workflows', 'I use prompts, custom assistants, automations, or connected tools to complete recurring work.'],
  ['builder', 'I have built and tested AI tools', 'I have made an app, automation, or data-based AI system and checked whether it works reliably.'],
]

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
}

function capabilityExperienceStage(
  levels: Readonly<Record<CapabilityDomain, ExperienceLevel>>,
): CapabilityExperienceStage | '' {
  if (Object.values(levels).every(level => level === 'none')) return ''

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

function Header({ scene, onRestart }: { scene: 'diagnostic' | 'result'; onRestart(): void }) {
  return (
    <header className="ap-ds-header">
      <button type="button" className="ap-ds-brand" onClick={onRestart} aria-label="AI Path home">
        <span><PathMark /></span>
        <strong>AI Path</strong>
      </button>
      <div className="ap-ds-headerMeta">
        <span>{scene === 'diagnostic' ? 'Your questions' : 'Your plan'}</span>
        <span className="ap-ds-preview">Preview</span>
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

function VoiceButton({ label, active, onClick }: { label: string; active: boolean; onClick(): void }) {
  return (
    <button
      type="button"
      className={`ap-ds-fieldMic${active ? ' is-active' : ''}`}
      aria-label={`Test microphone for ${label}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <MicIcon />
      <span>{active ? 'Microphone selected' : 'Test microphone'}</span>
    </button>
  )
}

function TextAreaField({
  id,
  label,
  help,
  value,
  placeholder,
  voiceTarget,
  onVoice,
  onChange,
  rows = 4,
}: {
  id: string
  label: string
  help?: string
  value: string
  placeholder?: string
  voiceTarget: string | null
  onVoice(id: string): void
  onChange(value: string): void
  rows?: number
}) {
  return (
    <div className="ap-ds-field">
      <div className="ap-ds-fieldLabel">
        <label htmlFor={id}>{label}</label>
        <VoiceButton label={label} active={voiceTarget === id} onClick={() => onVoice(id)} />
      </div>
      {help ? <p>{help}</p> : null}
      <textarea id={id} value={value} onChange={event => onChange(event.target.value)} rows={rows} maxLength={2000} placeholder={placeholder} />
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
    <fieldset id={`ap-section-${id}`} data-section-id={id} className={`ap-ds-section is-${status}${active ? ' is-active' : ''}`} onFocusCapture={onActivate} onClick={onActivate}>
      <legend className="sr-only">{number}. {title}</legend>
      <div className="ap-ds-sectionHeading">
        <span aria-hidden="true">{String(number).padStart(2, '0')}</span>
        <div><h2>{title}</h2><p>{reason}</p></div>
        <small><i aria-hidden="true" />{statusLabel === 'Captured' ? 'Done' : statusLabel === 'Needs evidence' ? 'Needs an example' : 'Not finished'}</small>
      </div>
      <div className="ap-ds-sectionBody">{children}</div>
      {issues.length ? <ul className="ap-ds-issues" aria-label={`${title} requirements`}>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : null}
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
  activeSection,
  voiceTarget,
  onActivate,
  onVoice,
  onChange,
}: {
  value: UseCaseIntake
  readiness: ReturnType<typeof validateUseCaseIntake>
  activeSection: string
  voiceTarget: string | null
  onActivate(id: string): void
  onVoice(id: string): void
  onChange(value: UseCaseIntake): void
}) {
  const status = new Map(readiness.sections.map(section => [section.id, section]))
  const common = (id: (typeof USE_CASE_SECTION_IDS)[number], index: number) => ({
    id,
    number: index + 1,
    title: useCaseSections[index][1],
    reason: useCaseSections[index][2],
    status: status.get(id)?.status ?? 'missing' as ReadinessStatus,
    issues: status.get(id)?.issues ?? [],
    active: activeSection === id,
    onActivate: () => onActivate(id),
  })
  return (
    <div className="ap-ds-sections" data-path="use-case">
      <Section {...common('outcome', 0)}>
        <TextAreaField id="ap-outcome" label="What do you want AI to help someone accomplish?" help="Describe who it is for, the task, and what should be better when it works." value={value.outcome.desiredOutcome} voiceTarget={voiceTarget} onVoice={onVoice} onChange={desiredOutcome => onChange({ ...value, outcome: { desiredOutcome } })} placeholder="Type your answer…" />
      </Section>

      <Section {...common('workflow', 1)}>
        <TextAreaField id="ap-workflow" label="What happens today, and where does it become unreliable?" help="Walk through the current steps. Name the slowest, least reliable, or hardest-to-review part." value={value.workflow.currentProcess} voiceTarget={voiceTarget} onVoice={onVoice} onChange={currentProcess => onChange({ ...value, workflow: { currentProcess } })} placeholder="Type your answer…" />
      </Section>

      <Section {...common('specification', 2)}>
        <div className="ap-ds-specGrid">
          <TextAreaField id="ap-inputs" label="What will it receive?" help="For example: documents, messages, spreadsheet rows, images or form responses." value={value.specification.inputs} voiceTarget={voiceTarget} onVoice={onVoice} onChange={inputs => onChange({ ...value, specification: { ...value.specification, inputs } })} rows={3} placeholder="Type your answer…" />
          <TextAreaField id="ap-output" label="What should it produce?" help="For example: a cited draft, recommendation, summary or structured record." value={value.specification.output} voiceTarget={voiceTarget} onVoice={onVoice} onChange={output => onChange({ ...value, specification: { ...value.specification, output } })} rows={3} placeholder="Type your answer…" />
          <TextAreaField id="ap-success" label="How will you know it works?" value={value.specification.success} voiceTarget={voiceTarget} onVoice={onVoice} onChange={success => onChange({ ...value, specification: { ...value.specification, success } })} rows={3} placeholder="One or two observable acceptance criteria" />
        </div>
      </Section>

      <Section {...common('experience', 3)}>
        <ChoiceGroup label="How far have you taken this idea? Choose the highest option you can back up." value={value.experience.level} options={experienceOptions} onChange={level => onChange({ ...value, experience: { ...value.experience, level } })} />
        {value.experience.level !== 'none' ? (
          <div className="ap-ds-conditional">
            <TextAreaField id="ap-use-case-evidence" label="What did you make or test?" help="Say what you did yourself, what happened, and how you checked it." value={value.experience.evidence} voiceTarget={voiceTarget} onVoice={onVoice} onChange={evidence => onChange({ ...value, experience: { ...value.experience, evidence } })} rows={3} placeholder="Type your answer…" />
            <label className="ap-ds-simpleField" htmlFor="ap-use-case-artifact"><span>Artifact link <small>Optional</small></span><input id="ap-use-case-artifact" type="url" value={value.experience.artifactUrl} onChange={event => onChange({ ...value, experience: { ...value.experience, artifactUrl: event.target.value } })} placeholder="https://…" /></label>
          </div>
        ) : null}
      </Section>

      <Section {...common('risk', 4)}>
        <div className="ap-ds-controlGrid">
          <ChoiceGroup compact label="How sensitive is the information?" value={value.risk.dataSensitivity} options={[["public", "Public"], ["internal", "Internal"], ["confidential", "Confidential"], ["regulated", "Regulated"], ["unsure", "Unsure"]]} onChange={dataSensitivity => onChange({ ...value, risk: { ...value.risk, dataSensitivity } })} />
          <ChoiceGroup compact label="What happens if the answer is wrong?" value={value.risk.consequence} options={[["low", "Low impact"], ["moderate", "Moderate"], ["serious", "Serious"], ["critical", "Critical"]]} onChange={consequence => onChange({ ...value, risk: { ...value.risk, consequence } })} />
          <ChoiceGroup compact label="Should a person approve it before use?" value={value.risk.humanApproval} options={[["yes", "Yes"], ["no", "No"], ["unsure", "Unsure"]]} onChange={humanApproval => onChange({ ...value, risk: { ...value.risk, humanApproval } })} />
        </div>
        <label className="ap-ds-simpleField" htmlFor="ap-systems"><span>Systems or data sources <small>Optional</small></span><input id="ap-systems" value={value.risk.existingSystems} onChange={event => onChange({ ...value, risk: { ...value.risk, existingSystems: event.target.value } })} placeholder="Drive, CRM, warehouse, approved documents…" /></label>
        {['confidential', 'regulated'].includes(value.risk.dataSensitivity) || ['serious', 'critical'].includes(value.risk.consequence) ? <p className="ap-ds-warning"><strong>Guardrail required.</strong> The result will keep human approval, access control and failure testing in the core design.</p> : null}
      </Section>

      <Section {...common('constraints', 5)}>
        <div className="ap-ds-controlGrid">
          <label className="ap-ds-simpleField" htmlFor="ap-role"><span>Your role in this work</span><input id="ap-role" value={value.constraints.role} onChange={event => onChange({ ...value, constraints: { ...value.constraints, role: event.target.value } })} /></label>
          <label className="ap-ds-simpleField" htmlFor="ap-hours"><span>Hours available each week</span><input id="ap-hours" type="number" min="1" max="40" value={value.constraints.weeklyHours ?? ''} onChange={event => onChange({ ...value, constraints: { ...value.constraints, weeklyHours: event.target.value ? Number(event.target.value) : null } })} /></label>
        </div>
        <ChoiceGroup compact label="Coding comfort" value={value.constraints.codingComfort} options={[["none", "No coding"], ["modify-examples", "Modify examples"], ["small-programs", "Build small programs"], ["experienced", "Experienced"]]} onChange={codingComfort => onChange({ ...value, constraints: { ...value.constraints, codingComfort } })} />
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
  activeSection,
  voiceTarget,
  onActivate,
  onVoice,
  onChange,
}: {
  value: CapabilityIntake
  readiness: ReturnType<typeof validateCapabilityIntake>
  activeSection: string
  voiceTarget: string | null
  onActivate(id: string): void
  onVoice(id: string): void
  onChange(value: CapabilityIntake): void
}) {
  const status = new Map(readiness.sections.map(section => [section.id, section]))
  const common = (id: (typeof CAPABILITY_SECTION_IDS)[number], index: number) => ({
    id,
    number: index + 1,
    title: capabilitySections[index][1],
    reason: capabilitySections[index][2],
    status: status.get(id)?.status ?? 'missing' as ReadinessStatus,
    issues: status.get(id)?.issues ?? [],
    active: activeSection === id,
    onActivate: () => onActivate(id),
  })
  const claimedDomains = (Object.keys(value.experience.levels) as CapabilityDomain[]).filter(domain => !['none', 'exposure', 'guided'].includes(value.experience.levels[domain]))
  const primaryInterest = value.direction.interests.join(' ').toLowerCase()
  const reliabilityInterest = /reliab|evaluat|accurate/.test(primaryInterest)
  const scenario = /automat|workflow/.test(primaryInterest)
    ? 'A model handles most requests correctly but occasionally produces confident, incorrect results. What would you test or change before allowing the workflow to send anything automatically?'
    : /app|build/.test(primaryInterest)
      ? 'You have 50 example questions and trusted answers. How would you use them to decide whether an AI assistant is ready for users?'
      : reliabilityInterest
        ? 'An AI tool looks impressive in a demo, but nobody has measured how often it is useful, wrong, or uncertain. How would you evaluate and improve it?'
      : 'How would you decide which parts of a recurring task should be handled by AI and which should remain with a person?'

  return (
    <div className="ap-ds-sections" data-path="capability-growth">
      <Section {...common('direction', 0)}>
        <label className="ap-ds-simpleField" htmlFor="ap-context"><span>Your role or working context</span><input id="ap-context" value={value.direction.roleContext} onChange={event => onChange({ ...value, direction: { ...value.direction, roleContext: event.target.value } })} placeholder="Operations analyst, founder, student…" /></label>
        <div className="ap-ds-directionChoices">
          <ChoiceGroup
            stacked
            label="Which outcome matters most to you right now?"
            value={value.direction.interests[0] ?? ''}
            options={interestOptions}
            onChange={interest => onChange({ ...value, direction: { ...value.direction, interests: [interest] } })}
          />
        </div>
      </Section>

      <Section {...common('experience', 1)}>
        <ChoiceGroup
          stacked
          label="Which statement sounds most like you today?"
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
        <TextAreaField id="ap-capability-evidence" label="What is the strongest thing you have made or improved with AI?" help="What did you do yourself? What was difficult? How did you check the result? “I haven’t built anything yet” is a valid answer." value={value.evidence.description} voiceTarget={voiceTarget} onVoice={onVoice} onChange={description => onChange({ ...value, evidence: { ...value.evidence, description } })} rows={5} placeholder="Type your answer…" />
        {claimedDomains.length ? <MultiChoice label="Which parts of this example did you personally work on?" values={value.evidence.supportedDomains.map(domain => capabilityLabels[domain])} options={claimedDomains.map(domain => capabilityLabels[domain])} onChange={selectedLabels => onChange({ ...value, evidence: { ...value.evidence, supportedDomains: claimedDomains.filter(domain => selectedLabels.includes(capabilityLabels[domain])) } })} /> : null}
        <label className="ap-ds-simpleField" htmlFor="ap-capability-artifact"><span>Artifact link <small>Optional</small></span><input id="ap-capability-artifact" type="url" value={value.evidence.artifactUrl} onChange={event => onChange({ ...value, evidence: { ...value.evidence, artifactUrl: event.target.value } })} placeholder="https://…" /></label>
      </Section>

      <Section {...common('reasoning', 3)}>
        <div className="ap-ds-scenario"><span>Imagine this situation</span><p>{scenario}</p></div>
        <TextAreaField id="ap-reasoning" label="What would you do, and why?" value={value.reasoning.response} voiceTarget={voiceTarget} onVoice={onVoice} onChange={response => onChange({ ...value, reasoning: { scenarioId: /automat|workflow/.test(primaryInterest) ? 'automation-reliability' : /app|build/.test(primaryInterest) || reliabilityInterest ? 'application-evaluation' : 'human-ai-boundary', response } })} rows={5} />
      </Section>

      <Section {...common('foundations', 4)}>
        <ChoiceGroup compact label="Coding" value={value.foundations.codingComfort} options={[["none", "I have not coded"], ["modify-examples", "Modify examples"], ["small-programs", "Build small programs"], ["experienced", "Build software regularly"]]} onChange={codingComfort => onChange({ ...value, foundations: { ...value.foundations, codingComfort } })} />
        <ChoiceGroup compact label="Data" value={value.foundations.dataComfort} options={[["documents", "Mainly documents"], ["spreadsheets", "Spreadsheets"], ["queries", "Query or transform data"], ["pipelines", "Build pipelines or models"]]} onChange={dataComfort => onChange({ ...value, foundations: { ...value.foundations, dataComfort } })} />
        <MultiChoice label="AI tools you’ve used" values={value.foundations.tools} options={toolOptions} onChange={tools => onChange({ ...value, foundations: { ...value.foundations, tools } })} />
      </Section>

      <Section {...common('constraints', 5)}>
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

function ResultScene({ result, onEdit, onRestart }: { result: DiagnosticResult; onEdit(): void; onRestart(): void }) {
  const isUseCase = result.kind === 'use-case-blueprint'
  const [actionSaved, setActionSaved] = useState(false)
  return (
    <main className="ap-ds-result" data-result-kind={result.kind}>
      <div className="ap-ds-resultTopline"><button type="button" onClick={onEdit}>← Edit my answers</button><span>{isUseCase ? 'Your project plan' : 'Your learning plan'}</span></div>
      <section className="ap-ds-resultHero">
        <p>{isUseCase ? 'A small version you can test' : 'What to learn and build next'}</p>
        <h1 tabIndex={-1}>{result.title}</h1>
        {isUseCase ? (
          <div className="ap-ds-verdict"><span>{result.feasibility.rating === 'strong-fit' ? 'A strong fit' : result.feasibility.rating === 'possible-with-constraints' ? 'A good fit with safeguards' : 'Needs a different approach'}</span><p>{result.feasibility.rationale}</p></div>
        ) : (
          <div className="ap-ds-verdict"><span>How sure we are: {result.confidence}</span><p>{result.strongest}</p></div>
        )}
      </section>

      <section className="ap-ds-firstAction">
        <span>Start here</span>
        <h2>{result.firstAction}</h2>
        <button type="button" className={actionSaved ? 'is-saved' : ''} onClick={() => setActionSaved(value => !value)}>
          {actionSaved ? 'Next step saved' : 'Save this as my next step'} {actionSaved ? <CheckIcon /> : <ArrowIcon />}
        </button>
      </section>

      {isUseCase ? (
        <>
          <div className="ap-ds-resultGrid">
            <section><p className="ap-ds-kicker">Build this first</p><h2>{result.prototype.title}</h2><p>{result.prototype.scope}</p><details><summary>Keep out of the first version</summary><ul>{result.prototype.excluded.map(item => <li key={item}>{item}</li>)}</ul></details></section>
            <section className="is-dark"><p className="ap-ds-kicker">How it should work</p><h2>{result.architecture.pattern}</h2><ol>{result.architecture.stages.map(stage => <li key={stage}>{stage}</li>)}</ol></section>
          </div>
          <section className="ap-ds-evaluation"><div><p className="ap-ds-kicker">How you’ll know it works</p><h2>{result.evaluation.acceptanceTarget}</h2></div><ul>{result.evaluation.checks.map(check => <li key={check}><CheckIcon />{check}</li>)}</ul></section>
          <section className="ap-ds-risk"><div><p className="ap-ds-kicker">What needs human review</p><h2>{result.risk.level}</h2></div><div>{result.risk.safeguards.map(item => <p key={item}><CheckIcon />{item}</p>)}</div></section>
          <section className="ap-ds-skills"><p className="ap-ds-kicker">What to learn for this project</p><div>{result.skills.map((skill, index) => <article key={skill}><span>0{index + 1}</span><h3>{skill}</h3></article>)}</div></section>
        </>
      ) : (
        <>
          <div className="ap-ds-resultGrid">
            <section className="is-dark"><p className="ap-ds-kicker">Build this next</p><h2>{result.project.title}</h2><p>{result.project.outcome}</p><ul>{result.project.deliverables.map(item => <li key={item}>{item}</li>)}</ul></section>
            <section><p className="ap-ds-kicker">Focus on this skill</p><h2>{result.nextCapability}</h2><p>This project is selected to create something you can show—not merely add another course completion.</p><details><summary>How you’ll know the project is done</summary><ul>{result.definitionOfDone.map(item => <li key={item}>{item}</li>)}</ul></details></section>
          </div>
          <section className="ap-ds-profile"><div><p className="ap-ds-kicker">What your experience currently shows</p><h2>Your starting point</h2></div><div>{result.evidenceProfile.map(item => <article key={item.domain}><span>{item.label}</span><strong>{item.assessment}</strong></article>)}</div></section>
          {result.untested.length ? <section className="ap-ds-untested"><strong>Not assessed yet</strong><p>You didn’t give us a practical example in these areas: {result.untested.join(' · ')}</p></section> : null}
        </>
      )}

      <section className="ap-ds-month">
        <p className="ap-ds-kicker">Your next four weeks</p>
        <h2>{isUseCase ? 'From first test to a useful result' : 'From first practice to something you can show'}</h2>
        <div>{result.weeks.map(week => <article key={week.week}><span>{week.week}</span><small>Week {week.week}</small><h3>{week.focus}</h3><p>{week.outcome}</p></article>)}</div>
      </section>

      <section className="ap-ds-resources">
        <p className="ap-ds-kicker">Learn only what the project needs</p>
        <div>{result.resources.map((resource, index) => <article key={resource.id}><span>0{index + 1}</span><h3>{resource.title}</h3><p>{resource.purpose}</p></article>)}</div>
      </section>

      <div className="ap-ds-resultFooter"><button type="button" onClick={onRestart}>Start over</button><p>No account, course, paid tool or outside service was activated.</p></div>
    </main>
  )
}

export function AdvisorApp() {
  const [scene, setScene] = useState<'diagnostic' | 'result'>('diagnostic')
  const [path, setPath] = useState<DiagnosticPath | null>(null)
  const [useCase, setUseCase] = useState<UseCaseIntake>(() => structuredClone(INITIAL_USE_CASE_INTAKE))
  const [capability, setCapability] = useState<CapabilityIntake>(() => structuredClone(INITIAL_CAPABILITY_INTAKE))
  const [activeSection, setActiveSection] = useState('outcome')
  const [voiceTarget, setVoiceTarget] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)

  const microphone = useMemo(() => createBrowserMicrophonePreflightController(), [])
  const mic = useSyncExternalStore(microphone.subscribe, microphone.getSnapshot, () => INITIAL_MICROPHONE_PREFLIGHT_SNAPSHOT)

  useEffect(() => {
    void microphone.refreshDevices()
    return () => microphone.destroy()
  }, [microphone])

  useEffect(() => {
    if (scene !== 'result') return
    window.scrollTo({ top: 0, behavior: 'auto' })
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('.ap-ds-result h1')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [scene])

  const useCaseReadiness = useMemo(() => validateUseCaseIntake(useCase), [useCase])
  const capabilityReadiness = useMemo(() => validateCapabilityIntake(capability), [capability])
  const readiness = path === 'use-case' ? useCaseReadiness : capabilityReadiness
  const sections = path === 'use-case' ? useCaseSections : capabilitySections
  const statuses = new Map(readiness.sections.map(section => [section.id, section.status]))
  const sectionIds = path === 'use-case' ? USE_CASE_SECTION_IDS : CAPABILITY_SECTION_IDS
  const currentIndex = Math.max(0, sectionIds.findIndex(id => id === activeSection))
  const currentSection = readiness.sections.find(section => section.id === activeSection)
  const isLastQuestion = currentIndex === sectionIds.length - 1

  const choosePath = (nextPath: DiagnosticPath) => {
    setPath(nextPath)
    setActiveSection(nextPath === 'use-case' ? USE_CASE_SECTION_IDS[0] : CAPABILITY_SECTION_IDS[0])
    setShowErrors(false)
    setVoiceTarget(null)
  }

  const selectSection = (id: string) => {
    setActiveSection(id)
    document.getElementById(`ap-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const startVoiceFor = (id: string) => {
    setVoiceTarget(id)
    if (mic.phase !== 'ready' && mic.phase !== 'requesting') void microphone.start(mic.selectedDeviceId)
  }

  const continueQuestion = () => {
    if (currentSection?.status !== 'complete') {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    const nextId = sectionIds[currentIndex + 1]
    if (nextId) selectSection(nextId)
  }

  const previousQuestion = () => {
    setShowErrors(false)
    const previousId = sectionIds[currentIndex - 1]
    if (previousId) selectSection(previousId)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!path || !readiness.canSubmit) {
      setShowErrors(true)
      const first = readiness.sections.find(section => section.status !== 'complete')
      if (first) selectSection(first.id)
      return
    }
    const nextResult = path === 'use-case' ? composeDiagnosticResult(useCase) : composeDiagnosticResult(capability)
    if (!nextResult) return
    microphone.stop()
    setVoiceTarget(null)
    setResult(nextResult)
    setScene('result')
  }

  const restart = () => {
    microphone.stop()
    setScene('diagnostic')
    setPath(null)
    setUseCase(structuredClone(INITIAL_USE_CASE_INTAKE))
    setCapability(structuredClone(INITIAL_CAPABILITY_INTAKE))
    setActiveSection('outcome')
    setVoiceTarget(null)
    setShowErrors(false)
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return (
    <div className="ap-ds-shell">
      <Header scene={scene} onRestart={restart} />
      {scene === 'result' && result ? <ResultScene result={result} onEdit={() => setScene('diagnostic')} onRestart={restart} /> : (
        <main className={`ap-ds-main${path ? ' has-path' : ''}`}>
          <section className="ap-ds-intro" aria-labelledby="ap-ds-title">
            <div><p className="ap-ds-kicker">A practical AI plan</p><h1 id="ap-ds-title">What would you like help with?</h1></div>
            <p>Choose one. We’ll ask six short questions and give you a practical project and next step.</p>
          </section>

          <section className="ap-ds-pathSelector" aria-labelledby="ap-path-question">
            <div className="ap-ds-selectorLabel"><h2 id="ap-path-question">Choose a path</h2></div>
            <div className="ap-ds-pathOptions">
              <button type="button" className={path === 'use-case' ? 'is-selected' : ''} aria-pressed={path === 'use-case'} onClick={() => choosePath('use-case')}>
                <span className="ap-ds-pathIcon" aria-hidden="true">✦</span><strong>I have a task or idea</strong><span className="ap-ds-pathDetail">Help me turn it into a small, testable AI project.</span><i>{path === 'use-case' ? <CheckIcon /> : <ArrowIcon />}</i>
              </button>
              <button type="button" className={path === 'capability-growth' ? 'is-selected' : ''} aria-pressed={path === 'capability-growth'} onClick={() => choosePath('capability-growth')}>
                <span className="ap-ds-pathIcon" aria-hidden="true">↗</span><strong>I want to improve my AI skills</strong><span className="ap-ds-pathDetail">Help me choose what to learn and build next.</span><i>{path === 'capability-growth' ? <CheckIcon /> : <ArrowIcon />}</i>
              </button>
            </div>
          </section>

          {path ? (
            <form className="ap-ds-workbench" data-show-errors={showErrors} onSubmit={submit} noValidate>
              <QuestionProgress sections={sections} statuses={statuses} activeId={activeSection} onSelect={selectSection} />
              <div className="ap-ds-formColumn">
                <div className="ap-ds-voiceConsole">
                  <div><span><MicIcon /></span><p><strong>Speak or type</strong><small>{mic.phase === 'ready' ? 'Microphone is working locally.' : mic.error ?? 'Typing is ready. You can also test your microphone.'}</small></p></div>
                  <div className="ap-ds-level" aria-label={`Local microphone level ${Math.round(mic.level * 100)} percent`}><i style={{ transform: `scaleX(${Math.max(.04, mic.level)})` }} /></div>
                  <button type="button" onClick={() => startVoiceFor(activeSection)}><MicIcon />{mic.phase === 'requesting' ? 'Allowing…' : 'Test microphone'}</button>
                  <p>{mic.phase === 'ready' ? 'Voice-to-text is not connected yet, so type your answer below.' : 'No audio leaves this device during the test.'}</p>
                </div>

                {path === 'use-case' ? (
                  <UseCaseForm value={useCase} readiness={useCaseReadiness} activeSection={activeSection} voiceTarget={voiceTarget} onActivate={setActiveSection} onVoice={startVoiceFor} onChange={value => { setUseCase(value); setShowErrors(false) }} />
                ) : (
                  <CapabilityForm value={capability} readiness={capabilityReadiness} activeSection={activeSection} voiceTarget={voiceTarget} onActivate={setActiveSection} onVoice={startVoiceFor} onChange={value => { setCapability(value); setShowErrors(false) }} />
                )}

                <div className="ap-ds-questionNav">
                  <button type="button" className="ap-ds-backButton" onClick={previousQuestion} disabled={currentIndex === 0}>Back</button>
                  {isLastQuestion ? (
                    <button type="submit" className="ap-ds-continueButton">{path === 'use-case' ? 'Create my project plan' : 'Create my learning plan'} <ArrowIcon /></button>
                  ) : (
                    <button type="button" className="ap-ds-continueButton" onClick={continueQuestion}>Continue <ArrowIcon /></button>
                  )}
                </div>
                {showErrors && currentSection?.status !== 'complete' ? <p className="ap-ds-errorSummary" role="alert">Please finish this question to continue.</p> : null}
              </div>
            </form>
          ) : (
            <div className="ap-ds-emptyState"><p>About 5 minutes <span aria-hidden="true">·</span> Speak or type <span aria-hidden="true">·</span> No scores</p></div>
          )}
        </main>
      )}
    </div>
  )
}
