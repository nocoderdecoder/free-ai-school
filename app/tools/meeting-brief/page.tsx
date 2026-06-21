'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)', color: 'var(--ed-text)' }
const inputClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm"
const selectClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs uppercase tracking-widest mb-2"

export default function MeetingBrief() {
  const [form, setForm] = useState({
    meetingType: 'Client presentation',
    objective: '',
    attendees: '',
    context: '',
    duration: '60 minutes',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />
      <ToolShell
        name="Meeting Brief Generator"
        description="Enter your meeting details. Get a battle-ready brief with talking points, anticipated objections, and your ideal opening line."
        estimatedTime="Results in ~15 seconds"
        variant="light"
      >
        {({ onSubmit, isLoading, isComplete }) => (
          <form
            onSubmit={e => {
              e.preventDefault()
              onSubmit(fetch('/api/tools/meeting-brief', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
              }))
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Meeting type</label>
                <select className={selectClass} style={inputStyle} value={form.meetingType} onChange={set('meetingType')}>
                  <option>Client presentation</option>
                  <option>Internal strategy</option>
                  <option>Sales discovery</option>
                  <option>Performance review</option>
                  <option>Project kickoff</option>
                  <option>Board update</option>
                  <option>Job interview</option>
                  <option>Negotiation</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Duration</label>
                <select className={selectClass} style={inputStyle} value={form.duration} onChange={set('duration')}>
                  <option>30 minutes</option>
                  <option>45 minutes</option>
                  <option>60 minutes</option>
                  <option>90 minutes</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Meeting objective *</label>
              <input
                required
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. Win the renewal, Align on Q3 budget"
                value={form.objective}
                onChange={set('objective')}
              />
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Who's attending</label>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. VP Sales, 2 engineers, external client"
                value={form.attendees}
                onChange={set('attendees')}
              />
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Background / context</label>
              <textarea
                rows={3}
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. 2-year customer, churn risk, last met in March"
                value={form.context}
                onChange={set('context')}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || isComplete}
              className="px-6 py-3 rounded-full font-medium transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{backgroundColor: 'var(--ed-cta)', color: 'var(--ed-bg)'}}
            >
              {isLoading ? 'Generating…' : 'Generate brief →'}
            </button>
          </form>
        )}
      </ToolShell>

      <footer className="border-t px-8 py-8 text-center text-sm" style={{borderColor: 'var(--ed-border)', color: 'var(--ed-text-faint)'}}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
