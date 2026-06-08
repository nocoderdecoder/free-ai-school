'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputClass = "bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-white/30 focus:outline-none transition w-full text-sm"
const selectClass = "bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs text-white/50 uppercase tracking-widest mb-2"

export default function CompetitiveAnalysis() {
  const [form, setForm] = useState({
    yourProduct: '',
    competitor: '',
    industry: '',
    angle: 'Full comparison',
    purpose: 'Sales enablement',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />
      <ToolShell
        name="Competitive Analysis Generator"
        description="Enter your product and a competitor. Get a sharp competitive brief with battle card talking points and positioning recommendations."
        estimatedTime="Results in ~25 seconds"
      >
        {({ onSubmit, isLoading, isComplete }) => (
          <form
            onSubmit={e => {
              e.preventDefault()
              onSubmit(fetch('/api/tools/competitive-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
              }))
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Your product / company *</label>
                <input
                  required
                  className={inputClass}
                  placeholder="e.g. Salesforce CRM, our B2B SaaS HR tool"
                  value={form.yourProduct}
                  onChange={set('yourProduct')}
                />
              </div>
              <div>
                <label className={labelClass}>Competitor to analyse *</label>
                <input
                  required
                  className={inputClass}
                  placeholder="e.g. HubSpot, Workday"
                  value={form.competitor}
                  onChange={set('competitor')}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Industry / market</label>
              <input
                className={inputClass}
                placeholder="e.g. B2B SaaS, Healthcare, Fintech"
                value={form.industry}
                onChange={set('industry')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Analysis angle</label>
                <select className={selectClass} value={form.angle} onChange={set('angle')}>
                  <option>Product features</option>
                  <option>Pricing &amp; packaging</option>
                  <option>GTM &amp; positioning</option>
                  <option>Customer segments</option>
                  <option>Strengths &amp; weaknesses</option>
                  <option>Full comparison</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Purpose</label>
                <select className={selectClass} value={form.purpose} onChange={set('purpose')}>
                  <option>Sales enablement</option>
                  <option>Internal strategy</option>
                  <option>Investor update</option>
                  <option>Marketing positioning</option>
                  <option>Product roadmap</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isComplete}
              className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? 'Analysing…' : 'Analyse competitor →'}
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
