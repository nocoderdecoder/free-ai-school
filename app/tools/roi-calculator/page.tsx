'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputClass = "bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-white/30 focus:outline-none transition w-full text-sm"
const selectClass = "bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs text-white/50 uppercase tracking-widest mb-2"

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

  // Live preview calculation
  const weeklyHours = parseFloat(form.hoursPerWeek) || 0
  const team = parseInt(form.teamSize) || 1
  const rate = parseFloat(form.hourlyCost) || 0
  const annualCost = Math.round(weeklyHours * team * rate * 52)

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />
      <ToolShell
        name="AI ROI Calculator"
        description="Tell me how you spend your time. I'll calculate exactly how much AI could save you — in hours and dollars."
        estimatedTime="Results in ~20 seconds"
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
              <label className={labelClass}>Your Role *</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Marketing Manager, Sales Director, Ops Lead"
                value={form.role}
                onChange={set('role')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Hours / Week on Manual Tasks *</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={60}
                  className={inputClass}
                  placeholder="10"
                  value={form.hoursPerWeek}
                  onChange={set('hoursPerWeek')}
                />
              </div>
              <div>
                <label className={labelClass}>Team Size *</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={1000}
                  className={inputClass}
                  placeholder="1"
                  value={form.teamSize}
                  onChange={set('teamSize')}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Primary Task Type</label>
              <select className={selectClass} value={form.taskType} onChange={set('taskType')}>
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
              <label className={labelClass}>Hourly Cost, incl. Overhead ($) *</label>
              <input
                required
                type="number"
                min={1}
                className={inputClass}
                placeholder="50"
                value={form.hourlyCost}
                onChange={set('hourlyCost')}
              />
              <p className="text-white/25 text-xs mt-1.5">Salary ÷ 2,080 hours × 1.3 for benefits &amp; overhead</p>
            </div>

            {/* Live preview */}
            {annualCost > 0 && (
              <div className="border border-white/5 rounded-lg p-4 bg-white/[0.02]">
                <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Current annual cost of these tasks</p>
                <p className="text-white font-semibold text-lg">${annualCost.toLocaleString()}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isComplete}
              className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? 'Calculating…' : 'Calculate my AI ROI →'}
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
