'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputClass = "bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-white/30 focus:outline-none transition w-full text-sm"
const selectClass = "bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs text-white/50 uppercase tracking-widest mb-2"

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
    <main className="min-h-screen bg-black text-white">
      <Nav />
      <ToolShell
        name="AI Readiness Assessment"
        description="Score your organisation's AI readiness and get a prioritised adoption roadmap — built by Claude."
        estimatedTime="Results in ~20 seconds"
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
                <label className={labelClass}>Company Size</label>
                <select className={selectClass} value={form.companySize} onChange={set('companySize')}>
                  <option>1–10 employees</option>
                  <option>11–50 employees</option>
                  <option>51–200 employees</option>
                  <option>201–1000 employees</option>
                  <option>1000+ employees</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Industry *</label>
                <input
                  required
                  className={inputClass}
                  placeholder="e.g. Financial Services, Healthcare, Retail"
                  value={form.industry}
                  onChange={set('industry')}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Current AI Use</label>
              <select className={selectClass} value={form.currentAI} onChange={set('currentAI')}>
                <option>Not using AI yet</option>
                <option>Experimenting with personal tools (ChatGPT etc.)</option>
                <option>Deployed 1–2 AI tools in workflows</option>
                <option>Running multiple AI initiatives</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Primary Goal</label>
                <select className={selectClass} value={form.primaryGoal} onChange={set('primaryGoal')}>
                  <option>Save time on repetitive tasks</option>
                  <option>Increase team output</option>
                  <option>Improve quality of work</option>
                  <option>Gain competitive advantage</option>
                  <option>Reduce costs</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Your Team / Function</label>
                <select className={selectClass} value={form.teamFunction} onChange={set('teamFunction')}>
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
              className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? 'Assessing…' : 'Get my readiness score →'}
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
