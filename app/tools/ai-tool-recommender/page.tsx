'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)', color: 'var(--ed-text)' }
const inputClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm"
const selectClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs uppercase tracking-widest mb-2"

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
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />
      <ToolShell
        name="AI Tool Recommender"
        description="Tell me about your role and goals. I'll recommend the exact AI tools that will make the biggest difference for you."
        estimatedTime="Results in ~20 seconds"
        variant="light"
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
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Your role / job function *</label>
              <input
                required
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. Marketing Manager, Sales Rep, HR Director"
                value={form.role}
                onChange={set('role')}
              />
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Primary use case *</label>
              <textarea
                required
                rows={3}
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. writing content, analysing data, automating workflows"
                value={form.useCase}
                onChange={set('useCase')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Team size</label>
                <select className={selectClass} style={inputStyle} value={form.teamSize} onChange={set('teamSize')}>
                  <option>Individual</option>
                  <option>Small team (2-10)</option>
                  <option>Department (10-50)</option>
                  <option>Enterprise (50+)</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Budget</label>
                <select className={selectClass} style={inputStyle} value={form.budget} onChange={set('budget')}>
                  <option>Free only</option>
                  <option>Up to $20/month</option>
                  <option>Up to $50/month</option>
                  <option>No limit</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Technical level</label>
              <select className={selectClass} style={inputStyle} value={form.technical} onChange={set('technical')}>
                <option>Non-technical</option>
                <option>Some technical skills</option>
                <option>Developer / technical</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading || isComplete}
              className="px-6 py-3 rounded-full font-medium transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{backgroundColor: 'var(--ed-cta)', color: 'var(--ed-bg)'}}
            >
              {isLoading ? 'Finding tools…' : 'Get my recommendations →'}
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
