'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)', color: 'var(--ed-text)' }
const inputClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm"
const selectClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs uppercase tracking-widest mb-2"

export default function ROICalculator() {
  const [form, setForm] = useState({
    role: '',
    hoursPerWeek: '10',
    teamSize: '1',
    taskType: 'Content & Writing',
    hourlyCost: '50',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const weeklyHours = parseFloat(form.hoursPerWeek) || 0
  const team = parseInt(form.teamSize) || 1
  const rate = parseFloat(form.hourlyCost) || 0
  const annualCost = Math.round(weeklyHours * team * rate * 52)

  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />
      <ToolShell
        name="AI ROI Calculator"
        description="Tell me how you spend your time. I'll calculate exactly how much AI could save you — in hours and dollars."
        estimatedTime="Results in ~20 seconds"
        variant="light"
      >
        {({ onSubmit, isLoading, isComplete }) => (
          <form
            onSubmit={e => {
              e.preventDefault()
              onSubmit(fetch('/api/tools/roi-calculator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
              }))
            }}
            className="space-y-5"
          >
            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Your Role *</label>
              <input
                required
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. Marketing Manager, Sales Director, Ops Lead"
                value={form.role}
                onChange={set('role')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Hours / Week on Manual Tasks *</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={60}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="10"
                  value={form.hoursPerWeek}
                  onChange={set('hoursPerWeek')}
                />
              </div>
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Team Size *</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={1000}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="1"
                  value={form.teamSize}
                  onChange={set('teamSize')}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Primary Task Type</label>
              <select className={selectClass} style={inputStyle} value={form.taskType} onChange={set('taskType')}>
                <option>Content &amp; Writing</option>
                <option>Research &amp; Analysis</option>
                <option>Data &amp; Reporting</option>
                <option>Email &amp; Communications</option>
                <option>Meeting Preparation</option>
                <option>Customer Support</option>
                <option>Administrative Tasks</option>
              </select>
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Hourly Cost, incl. Overhead ($) *</label>
              <input
                required
                type="number"
                min={1}
                className={inputClass}
                style={inputStyle}
                placeholder="50"
                value={form.hourlyCost}
                onChange={set('hourlyCost')}
              />
              <p className="text-xs mt-1.5" style={{color: 'var(--ed-text-faint)'}}>Salary ÷ 2,080 hours × 1.3 for benefits &amp; overhead</p>
            </div>

            {annualCost > 0 && (
              <div className="rounded-lg p-4" style={{border: '1px solid var(--ed-border)', backgroundColor: 'var(--ed-card-warm)'}}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{color: 'var(--ed-text-faint)'}}>Current annual cost of these tasks</p>
                <p className="font-semibold text-lg" style={{color: 'var(--ed-text-dark)'}}>${annualCost.toLocaleString()}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isComplete}
              className="px-6 py-3 rounded-full font-medium transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{backgroundColor: 'var(--ed-cta)', color: 'var(--ed-bg)'}}
            >
              {isLoading ? 'Calculating…' : 'Calculate my AI ROI →'}
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
