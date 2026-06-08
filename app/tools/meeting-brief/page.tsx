'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputClass = "bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-white/30 focus:outline-none transition w-full text-sm"
const selectClass = "bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs text-white/50 uppercase tracking-widest mb-2"

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
    <main className="min-h-screen bg-black text-white">
      <Nav />
      <ToolShell
        name="Meeting Brief Generator"
        description="Enter your meeting details. Get a battle-ready brief with talking points, anticipated objections, and your ideal opening line."
        estimatedTime="Results in ~15 seconds"
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
                <label className={labelClass}>Meeting type</label>
                <select className={selectClass} value={form.meetingType} onChange={set('meetingType')}>
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
                <label className={labelClass}>Duration</label>
                <select className={selectClass} value={form.duration} onChange={set('duration')}>
                  <option>30 minutes</option>
                  <option>45 minutes</option>
                  <option>60 minutes</option>
                  <option>90 minutes</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Meeting objective *</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Win the renewal, Align on Q3 budget"
                value={form.objective}
                onChange={set('objective')}
              />
            </div>

            <div>
              <label className={labelClass}>Who's attending</label>
              <input
                className={inputClass}
                placeholder="e.g. VP Sales, 2 engineers, external client"
                value={form.attendees}
                onChange={set('attendees')}
              />
            </div>

            <div>
              <label className={labelClass}>Background / context</label>
              <textarea
                rows={3}
                className={inputClass}
                placeholder="e.g. 2-year customer, churn risk, last met in March"
                value={form.context}
                onChange={set('context')}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || isComplete}
              className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? 'Generating…' : 'Generate brief →'}
            </button>
          </form>
        )}
      </ToolShell>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
