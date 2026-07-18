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
  ['outcome', 'Desired outcome', 'The person, task and result'],
  ['workflow', 'Current workflow', 'Where the process breaks down'],
  ['specification', 'System shape', 'Inputs, output and success'],
  ['experience', 'What you tried', 'Evidence, not confidence'],
  ['risk', 'Operating boundaries', 'Data, errors and review'],
  ['constraints', 'Build constraints', 'Role, time and approach'],
] as const

const capabilitySections = [
  ['direction', 'Direction', 'Where you want to expand'],
  ['experience', 'Experience map', 'What you have actually done'],
  ['evidence', 'Strongest evidence', 'Ownership, difficulty and checks'],
  ['reasoning', 'Applied judgment', 'How you handle uncertainty'],
  ['foundations', 'Working foundations', 'Coding, data and tools'],
  ['constraints', 'Learning constraints', 'Time, pace and format'],
] as const

const experienceOptions: readonly [ExperienceLevel, string, string][] = [
  ['none', 'Not explored', 'No practical evidence yet'],
  ['exposure', 'Used or studied', 'Tools or introductory material'],
  ['guided', 'Followed an exercise', 'Closely followed an example'],
  ['adapted', 'Modified for my problem', 'Changed an example for real use'],
  ['independent', 'Built and tested', 'Selected the approach independently'],
  ['demonstrated', 'Used by other people', 'Applied in a real setting'],
]

const capabilityLabels: Record<CapabilityDomain, string> = {
  'ai-assisted-work': 'AI-assisted work',
  automation: 'Automation and integrations',
  applications: 'Building AI applications',
  'data-retrieval': 'Data and retrieval',
  'evaluation-safety': 'Evaluation, safety and reliability',
}

const interestOptions = [
  'Use AI effectively in my current work',
  'Automate workflows',
  'Build AI applications',
  'Work with data and knowledge',
  'Evaluate and improve AI outputs',
  'Understand models more deeply',
  'Lead AI projects or teams',
  'Explore before choosing',
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
        <span>{scene === 'diagnostic' ? 'Diagnostic studio' : 'Your recommendation'}</span>
        <i aria-hidden="true" />
        <span>Private preview</span>
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
}: {
  label: string
  value: T | ''
  options: readonly (readonly [T, string, string?])[]
  onChange(value: T): void
  compact?: boolean
}) {
  return (
    <fieldset className={`ap-ds-choiceGroup${compact ? ' is-compact' : ''}`}>
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
      aria-label={`Answer ${label} by voice`}
      aria-pressed={active}
      onClick={onClick}
    >
      <MicIcon />
      <span>{active ? 'Voice selected' : 'Voice'}</span>
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
    <fieldset id={`ap-section-${id}`} className={`ap-ds-section is-${status}${active ? ' is-active' : ''}`} onFocusCapture={onActivate} onClick={onActivate}>
      <legend className="sr-only">{number}. {title}</legend>
      <div className="ap-ds-sectionHeading">
        <span aria-hidden="true">{String(number).padStart(2, '0')}</span>
        <div><h2>{title}</h2><p>{reason}</p></div>
        <small><i aria-hidden="true" />{statusLabel}</small>
      </div>
      <div className="ap-ds-sectionBody">{children}</div>
      {issues.length ? <ul className="ap-ds-issues" aria-label={`${title} requirements`}>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : null}
    </fieldset>
  )
}

function EvidenceIndex({
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
    <aside className="ap-ds-index" aria-label="Diagnostic sections">
      <div className="ap-ds-indexIntro">
        <span>Recommendation ingredients</span>
        <strong>{completed} of 6 signals captured</strong>
        <p>Not a score. These are the inputs needed to make the recommendation specific.</p>
      </div>
      <ol>
        {sections.map(([id, title, detail], index) => {
          const status = statuses.get(id) ?? 'missing'
          return (
            <li className={`${activeId === id ? 'is-active' : ''} is-${status}`} key={id}>
              <button type="button" onClick={() => onSelect(id)}>
                <i aria-hidden="true">{index + 1}</i>
                <span><strong>{title}</strong><small>{status === 'complete' ? 'Captured' : status === 'needs_evidence' ? 'Add evidence' : detail}</small></span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="ap-ds-indexFoot"><span>Knowledge</span><span>Execution</span><span>Judgment</span></div>
    </aside>
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
        <TextAreaField id="ap-outcome" label="What do you want AI to help someone accomplish?" help="Describe the user, task and desired result. Focus on the outcome rather than naming a tool." value={value.outcome.desiredOutcome} voiceTarget={voiceTarget} onVoice={onVoice} onChange={desiredOutcome => onChange({ ...value, outcome: { desiredOutcome } })} placeholder="Help our sales team answer RFP questions using approved material while keeping citations…" />
      </Section>

      <Section {...common('workflow', 1)}>
        <TextAreaField id="ap-workflow" label="How is this handled today, and where does it become unreliable?" help="Describe the steps, people involved and the most important failure point." value={value.workflow.currentProcess} voiceTarget={voiceTarget} onVoice={onVoice} onChange={currentProcess => onChange({ ...value, workflow: { currentProcess } })} />
      </Section>

      <Section {...common('specification', 2)}>
        <div className="ap-ds-specGrid">
          <TextAreaField id="ap-inputs" label="What information goes in?" value={value.specification.inputs} voiceTarget={voiceTarget} onVoice={onVoice} onChange={inputs => onChange({ ...value, specification: { ...value.specification, inputs } })} rows={3} placeholder="Documents, messages, data, images…" />
          <TextAreaField id="ap-output" label="What should come out?" value={value.specification.output} voiceTarget={voiceTarget} onVoice={onVoice} onChange={output => onChange({ ...value, specification: { ...value.specification, output } })} rows={3} placeholder="A cited draft, decision, prediction…" />
          <TextAreaField id="ap-success" label="How will you know it works?" value={value.specification.success} voiceTarget={voiceTarget} onVoice={onVoice} onChange={success => onChange({ ...value, specification: { ...value.specification, success } })} rows={3} placeholder="One or two observable acceptance criteria" />
        </div>
      </Section>

      <Section {...common('experience', 3)}>
        <ChoiceGroup label="How far have you taken this idea?" value={value.experience.level} options={experienceOptions} onChange={level => onChange({ ...value, experience: { ...value.experience, level } })} />
        {value.experience.level !== 'none' ? (
          <div className="ap-ds-conditional">
            <TextAreaField id="ap-use-case-evidence" label="What did you personally make or test, and what happened?" help="Higher experience claims need a concrete artifact and test—not confidence." value={value.experience.evidence} voiceTarget={voiceTarget} onVoice={onVoice} onChange={evidence => onChange({ ...value, experience: { ...value.experience, evidence } })} rows={3} />
            <label className="ap-ds-simpleField" htmlFor="ap-use-case-artifact"><span>Artifact link <small>Optional</small></span><input id="ap-use-case-artifact" type="url" value={value.experience.artifactUrl} onChange={event => onChange({ ...value, experience: { ...value.experience, artifactUrl: event.target.value } })} placeholder="https://…" /></label>
          </div>
        ) : null}
      </Section>

      <Section {...common('risk', 4)}>
        <div className="ap-ds-controlGrid">
          <ChoiceGroup compact label="Data sensitivity" value={value.risk.dataSensitivity} options={[["public", "Public"], ["internal", "Internal"], ["confidential", "Confidential"], ["regulated", "Regulated"], ["unsure", "Unsure"]]} onChange={dataSensitivity => onChange({ ...value, risk: { ...value.risk, dataSensitivity } })} />
          <ChoiceGroup compact label="If the result is wrong" value={value.risk.consequence} options={[["low", "Low impact"], ["moderate", "Moderate"], ["serious", "Serious"], ["critical", "Critical"]]} onChange={consequence => onChange({ ...value, risk: { ...value.risk, consequence } })} />
          <ChoiceGroup compact label="Human approval before action" value={value.risk.humanApproval} options={[["yes", "Required"], ["no", "Not required"], ["unsure", "Unsure"]]} onChange={humanApproval => onChange({ ...value, risk: { ...value.risk, humanApproval } })} />
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
  const scenario = /automat|workflow/.test(primaryInterest)
    ? 'A model handles most requests correctly but occasionally produces confident, incorrect results. What would you test or change before allowing the workflow to send anything automatically?'
    : /app|build/.test(primaryInterest)
      ? 'You have 50 example questions and trusted answers. How would you use them to decide whether an AI assistant is ready for users?'
      : 'How would you decide which parts of a recurring task should be handled by AI and which should remain with a person?'

  return (
    <div className="ap-ds-sections" data-path="capability-growth">
      <Section {...common('direction', 0)}>
        <label className="ap-ds-simpleField" htmlFor="ap-context"><span>Your role or working context</span><input id="ap-context" value={value.direction.roleContext} onChange={event => onChange({ ...value, direction: { ...value.direction, roleContext: event.target.value } })} placeholder="Operations analyst, founder, student…" /></label>
        <MultiChoice label="Where would you most like AI to expand what you can do?" values={value.direction.interests} options={interestOptions} limit={2} onChange={interests => onChange({ ...value, direction: { ...value.direction, interests } })} />
      </Section>

      <Section {...common('experience', 1)}>
        <p className="ap-ds-sectionPrompt">Choose the highest statement you can support with something you actually did.</p>
        <div className="ap-ds-evidenceMatrix">
          {(Object.keys(capabilityLabels) as CapabilityDomain[]).map(domain => (
            <label key={domain} htmlFor={`ap-level-${domain}`}>
              <span>{capabilityLabels[domain]}</span>
              <select id={`ap-level-${domain}`} value={value.experience.levels[domain]} onChange={event => onChange({ ...value, experience: { levels: { ...value.experience.levels, [domain]: event.target.value as ExperienceLevel } } })}>
                {experienceOptions.map(([option, title]) => <option key={option} value={option}>{title}</option>)}
              </select>
            </label>
          ))}
        </div>
        <p className="ap-ds-calibration">Course completion shows exposure. Independent application requires something you built and tested.</p>
      </Section>

      <Section {...common('evidence', 2)}>
        <TextAreaField id="ap-capability-evidence" label="Tell us about the strongest one or two things you have actually done with AI." help="Explain what you personally did, what was difficult and how you checked the result. “I have not built anything yet” is valid." value={value.evidence.description} voiceTarget={voiceTarget} onVoice={onVoice} onChange={description => onChange({ ...value, evidence: { ...value.evidence, description } })} rows={5} />
        {claimedDomains.length ? <MultiChoice label="Which claims does this evidence support?" values={value.evidence.supportedDomains} options={claimedDomains} onChange={supportedDomains => onChange({ ...value, evidence: { ...value.evidence, supportedDomains: supportedDomains as CapabilityDomain[] } })} /> : null}
        <label className="ap-ds-simpleField" htmlFor="ap-capability-artifact"><span>Artifact link <small>Optional</small></span><input id="ap-capability-artifact" type="url" value={value.evidence.artifactUrl} onChange={event => onChange({ ...value, evidence: { ...value.evidence, artifactUrl: event.target.value } })} placeholder="https://…" /></label>
      </Section>

      <Section {...common('reasoning', 3)}>
        <div className="ap-ds-scenario"><span>Applied scenario</span><p>{scenario}</p></div>
        <TextAreaField id="ap-reasoning" label="What would you do, and why?" value={value.reasoning.response} voiceTarget={voiceTarget} onVoice={onVoice} onChange={response => onChange({ ...value, reasoning: { scenarioId: /automat|workflow/.test(primaryInterest) ? 'automation-reliability' : /app|build/.test(primaryInterest) ? 'application-evaluation' : 'human-ai-boundary', response } })} rows={5} />
      </Section>

      <Section {...common('foundations', 4)}>
        <ChoiceGroup compact label="Coding" value={value.foundations.codingComfort} options={[["none", "I have not coded"], ["modify-examples", "Modify examples"], ["small-programs", "Build small programs"], ["experienced", "Build software regularly"]]} onChange={codingComfort => onChange({ ...value, foundations: { ...value.foundations, codingComfort } })} />
        <ChoiceGroup compact label="Data" value={value.foundations.dataComfort} options={[["documents", "Mainly documents"], ["spreadsheets", "Spreadsheets"], ["queries", "Query or transform data"], ["pipelines", "Build pipelines or models"]]} onChange={dataComfort => onChange({ ...value, foundations: { ...value.foundations, dataComfort } })} />
        <MultiChoice label="AI tools used — familiarity is context, not skill evidence" values={value.foundations.tools} options={toolOptions} onChange={tools => onChange({ ...value, foundations: { ...value.foundations, tools } })} />
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
      <div className="ap-ds-resultTopline"><button type="button" onClick={onEdit}>← Edit diagnostic</button><span>{isUseCase ? 'Use-case blueprint' : 'Capability prescription'}</span></div>
      <section className="ap-ds-resultHero">
        <p>{isUseCase ? 'Your use case, made buildable' : 'Your next evidence-building move'}</p>
        <h1 tabIndex={-1}>{result.title}</h1>
        {isUseCase ? (
          <div className="ap-ds-verdict"><span>{result.feasibility.rating.replaceAll('-', ' ')}</span><p>{result.feasibility.rationale}</p></div>
        ) : (
          <div className="ap-ds-verdict"><span>{result.confidence} confidence</span><p>{result.strongest}</p></div>
        )}
      </section>

      <section className="ap-ds-firstAction">
        <span>Your first working session</span>
        <h2>{result.firstAction}</h2>
        <button type="button" className={actionSaved ? 'is-saved' : ''} onClick={() => setActionSaved(value => !value)}>
          {actionSaved ? 'Next action saved' : 'Mark as my next action'} {actionSaved ? <CheckIcon /> : <ArrowIcon />}
        </button>
      </section>

      {isUseCase ? (
        <>
          <div className="ap-ds-resultGrid">
            <section><p className="ap-ds-kicker">Smallest useful prototype</p><h2>{result.prototype.title}</h2><p>{result.prototype.scope}</p><details><summary>Keep out of the first version</summary><ul>{result.prototype.excluded.map(item => <li key={item}>{item}</li>)}</ul></details></section>
            <section className="is-dark"><p className="ap-ds-kicker">Recommended system</p><h2>{result.architecture.pattern}</h2><ol>{result.architecture.stages.map(stage => <li key={stage}>{stage}</li>)}</ol></section>
          </div>
          <section className="ap-ds-evaluation"><div><p className="ap-ds-kicker">Definition of done</p><h2>{result.evaluation.acceptanceTarget}</h2></div><ul>{result.evaluation.checks.map(check => <li key={check}><CheckIcon />{check}</li>)}</ul></section>
          <section className="ap-ds-risk"><div><p className="ap-ds-kicker">Risk level</p><h2>{result.risk.level}</h2></div><div>{result.risk.safeguards.map(item => <p key={item}><CheckIcon />{item}</p>)}</div></section>
          <section className="ap-ds-skills"><p className="ap-ds-kicker">What to learn for this build</p><div>{result.skills.map((skill, index) => <article key={skill}><span>0{index + 1}</span><h3>{skill}</h3></article>)}</div></section>
        </>
      ) : (
        <>
          <div className="ap-ds-resultGrid">
            <section className="is-dark"><p className="ap-ds-kicker">Recommended project</p><h2>{result.project.title}</h2><p>{result.project.outcome}</p><ul>{result.project.deliverables.map(item => <li key={item}>{item}</li>)}</ul></section>
            <section><p className="ap-ds-kicker">Recommended next capability</p><h2>{result.nextCapability}</h2><p>This project is selected to create evidence—not merely add another course completion.</p><details><summary>Definition of done</summary><ul>{result.definitionOfDone.map(item => <li key={item}>{item}</li>)}</ul></details></section>
          </div>
          <section className="ap-ds-profile"><div><p className="ap-ds-kicker">Evidence-based profile</p><h2>What your answers currently support</h2></div><div>{result.evidenceProfile.map(item => <article key={item.domain}><span>{item.label}</span><strong>{item.assessment}</strong></article>)}</div></section>
          {result.untested.length ? <section className="ap-ds-untested"><strong>Untested, not “beginner”</strong><p>{result.untested.join(' · ')}</p></section> : null}
        </>
      )}

      <section className="ap-ds-month">
        <p className="ap-ds-kicker">Your 30-day workpath</p>
        <h2>One evidence trail from first move to proof</h2>
        <div>{result.weeks.map(week => <article key={week.week}><span>{week.week}</span><small>Week {week.week}</small><h3>{week.focus}</h3><p>{week.outcome}</p></article>)}</div>
      </section>

      <section className="ap-ds-resources">
        <p className="ap-ds-kicker">Only the learning support this path needs</p>
        <div>{result.resources.map((resource, index) => <article key={resource.id}><span>0{index + 1}</span><h3>{resource.title}</h3><p>{resource.purpose}</p></article>)}</div>
      </section>

      <div className="ap-ds-resultFooter"><button type="button" onClick={onRestart}>Start a new diagnostic</button><p>No service, course or paid tool was activated to create this recommendation.</p></div>
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
        <main className="ap-ds-main">
          <section className="ap-ds-intro" aria-labelledby="ap-ds-title">
            <div><p className="ap-ds-kicker">Structured AI learning diagnostic</p><h1 id="ap-ds-title">Bring a use case—or discover your next capability.</h1></div>
            <p>This is not a generic AI chat. Six calibrated signals become one specific project, learning sequence and first move.</p>
          </section>

          <section className="ap-ds-pathSelector" aria-labelledby="ap-path-question">
            <div className="ap-ds-selectorLabel"><span>Choose your diagnostic</span><h2 id="ap-path-question">What would you like help with?</h2></div>
            <div className="ap-ds-pathOptions">
              <button type="button" className={path === 'use-case' ? 'is-selected' : ''} aria-pressed={path === 'use-case'} onClick={() => choosePath('use-case')}>
                <span>01</span><strong>I have an AI use case</strong><span className="ap-ds-pathDetail">Decide how to approach it, what to use and what to learn to build it.</span><i><ArrowIcon /></i>
              </button>
              <button type="button" className={path === 'capability-growth' ? 'is-selected' : ''} aria-pressed={path === 'capability-growth'} onClick={() => choosePath('capability-growth')}>
                <span>02</span><strong>I want to grow my AI skills</strong><span className="ap-ds-pathDetail">Assess what I have actually done, then prescribe what to learn and make next.</span><i><ArrowIcon /></i>
              </button>
            </div>
          </section>

          {path ? (
            <form className="ap-ds-workbench" onSubmit={submit} noValidate>
              <EvidenceIndex sections={sections} statuses={statuses} activeId={activeSection} onSelect={selectSection} />
              <div className="ap-ds-formColumn">
                <div className="ap-ds-voiceConsole">
                  <div><span><MicIcon /></span><p><strong>Voice margin</strong><small>{mic.phase === 'ready' ? 'Microphone ready locally' : mic.error ?? 'Select any field’s Voice control to answer aloud.'}</small></p></div>
                  <div className="ap-ds-level" aria-label={`Local microphone level ${Math.round(mic.level * 100)} percent`}><i style={{ transform: `scaleX(${Math.max(.04, mic.level)})` }} /></div>
                  <p>{mic.phase === 'ready' ? 'Live transcription is not connected in this preview. Typing remains available in the same field.' : 'Microphone access begins only after an explicit Voice action. No audio is uploaded during the local check.'}</p>
                </div>

                {path === 'use-case' ? (
                  <UseCaseForm value={useCase} readiness={useCaseReadiness} activeSection={activeSection} voiceTarget={voiceTarget} onActivate={setActiveSection} onVoice={startVoiceFor} onChange={value => { setUseCase(value); setShowErrors(false) }} />
                ) : (
                  <CapabilityForm value={capability} readiness={capabilityReadiness} activeSection={activeSection} voiceTarget={voiceTarget} onActivate={setActiveSection} onVoice={startVoiceFor} onChange={value => { setCapability(value); setShowErrors(false) }} />
                )}

                <section className={`ap-ds-submitRail${readiness.canSubmit ? ' is-ready' : ''}`} aria-labelledby="ap-submit-title">
                  <div><span>{readiness.canSubmit ? 'All six signals captured' : `${readiness.sections.filter(section => section.status === 'complete').length} of 6 signals captured`}</span><h2 id="ap-submit-title">{path === 'use-case' ? 'Build my use-case blueprint' : 'Create my capability prescription'}</h2><p>{readiness.canSubmit ? 'Your answers are ready to become a specific recommendation.' : 'Complete the highlighted requirements. Missing evidence stays unassessed—it is never treated as a low score.'}</p></div>
                  <button type="submit">Create my recommendation <ArrowIcon /></button>
                </section>
                {showErrors && !readiness.canSubmit ? <p className="ap-ds-errorSummary" role="alert">Review the highlighted sections before creating your recommendation.</p> : null}
              </div>
            </form>
          ) : (
            <div className="ap-ds-emptyState" aria-hidden="true"><span /><p>Choose a diagnostic above. Your six-question workbench will open here—on this same page.</p><span /></div>
          )}
        </main>
      )}
    </div>
  )
}
