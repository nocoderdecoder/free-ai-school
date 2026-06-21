'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)', color: 'var(--ed-text)' }
const inputClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm"
const selectClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs uppercase tracking-widest mb-2"

export default function AIReadiness() {
  const [form, setForm] = useState({
    companySize: '11–50 employees',
    industry: '',
    currentAI: 'Experimenting with personal tools (ChatGPT etc.)',
    primaryGoal: 'Save time on repetitive tasks',
    teamFunction: 'Marketing',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />
      <ToolShell
        name="AI Readiness Assessment"
        description="Score your organisation's AI readiness and get a prioritised adoption roadmap — built by Claude."
        estimatedTime="Results in ~20 seconds"
        variant="light"
      >
        {({ onSubmit, isLoading, isComplete }) => (
          <form
            onSubmit={e => {
              e.preventDefault()
              onSubmit(fetch('/api/tools/ai-readiness', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
              }))
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Company Size</label>
                <select className={selectClass} style={inputStyle} value={form.companySize} onChange={set('companySize')}>
                  <option>1–10 employees</option>
                  <option>11–50 employees</option>
                  <option>51–200 employees</option>
                  <option>201–1000 employees</option>
                  <option>1000+ employees</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Industry *</label>
                <input
                  required
                  className={inputClass}
                  style={inputStyle}
                  placeholder="e.g. Financial Services, Healthcare, Retail"
                  value={form.industry}
                  onChange={set('industry')}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Current AI Use</label>
              <select className={selectClass} style={inputStyle} value={form.currentAI} onChange={set('currentAI')}>
                <option>Not using AI yet</option>
                <option>Experimenting with personal tools (ChatGPT etc.)</option>
                <option>Deployed 1–2 AI tools in workflows</option>
                <option>Running multiple AI initiatives</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Primary Goal</label>
                <select className={selectClass} style={inputStyle} value={form.primaryGoal} onChange={set('primaryGoal')}>
                  <option>Save time on repetitive tasks</option>
                  <option>Increase team output</option>
                  <option>Improve quality of work</option>
                  <option>Gain competitive advantage</option>
                  <option>Reduce costs</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Your Team / Function</label>
                <select className={selectClass} style={inputStyle} value={form.teamFunction} onChange={set('teamFunction')}>
                  <option>Marketing</option>
                  <option>Sales</option>
                  <option>Operations</option>
                  <option>Product & Engineering</option>
                  <option>Finance</option>
                  <option>HR</option>
                  <option>Leadership / Strategy</option>
                  <option>Customer Success</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isComplete}
              className="px-6 py-3 rounded-full font-medium transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{backgroundColor: 'var(--ed-cta)', color: 'var(--ed-bg)'}}
            >
              {isLoading ? 'Assessing…' : 'Get my readiness score →'}
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
