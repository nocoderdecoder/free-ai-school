'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputClass = "bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-white/30 focus:outline-none transition w-full text-sm"
const selectClass = "bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs text-white/50 uppercase tracking-widest mb-2"

export default function AIToolRecommender() {
  const [form, setForm] = useState({
    role: '',
    useCase: '',
    teamSize: 'Individual',
    budget: 'Free only',
    technical: 'Non-technical',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />
      <ToolShell
        name="AI Tool Recommender"
        description="Tell me about your role and goals. I'll recommend the exact AI tools that will make the biggest difference for you."
        estimatedTime="Results in ~20 seconds"
      >
        {({ onSubmit, isLoading, isComplete }) => (
          <form
            onSubmit={e => {
              e.preventDefault()
              onSubmit(fetch('/api/tools/ai-tool-recommender', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
              }))
            }}
            className="space-y-5"
          >
            <div>
              <label className={labelClass}>Your role / job function *</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Marketing Manager, Sales Rep, HR Director"
                value={form.role}
                onChange={set('role')}
              />
            </div>

            <div>
              <label className={labelClass}>Primary use case *</label>
              <textarea
                required
                rows={3}
                className={inputClass}
                placeholder="e.g. writing content, analysing data, automating workflows"
                value={form.useCase}
                onChange={set('useCase')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Team size</label>
                <select className={selectClass} value={form.teamSize} onChange={set('teamSize')}>
                  <option>Individual</option>
                  <option>Small team (2-10)</option>
                  <option>Department (10-50)</option>
                  <option>Enterprise (50+)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Budget</label>
                <select className={selectClass} value={form.budget} onChange={set('budget')}>
                  <option>Free only</option>
                  <option>Up to $20/month</option>
                  <option>Up to $50/month</option>
                  <option>No limit</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Technical level</label>
              <select className={selectClass} value={form.technical} onChange={set('technical')}>
                <option>Non-technical</option>
                <option>Some technical skills</option>
                <option>Developer / technical</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading || isComplete}
              className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? 'Finding tools…' : 'Get my recommendations →'}
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
