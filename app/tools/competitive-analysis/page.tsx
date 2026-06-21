'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)', color: 'var(--ed-text)' }
const inputClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm"
const selectClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs uppercase tracking-widest mb-2"

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
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />
      <ToolShell
        name="Competitive Analysis Generator"
        description="Enter your product and a competitor. Get a sharp competitive brief with battle card talking points and positioning recommendations."
        estimatedTime="Results in ~25 seconds"
        variant="light"
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
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Your product / company *</label>
                <input
                  required
                  className={inputClass}
                  style={inputStyle}
                  placeholder="e.g. Salesforce CRM, our B2B SaaS HR tool"
                  value={form.yourProduct}
                  onChange={set('yourProduct')}
                />
              </div>
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Competitor to analyse *</label>
                <input
                  required
                  className={inputClass}
                  style={inputStyle}
                  placeholder="e.g. HubSpot, Workday"
                  value={form.competitor}
                  onChange={set('competitor')}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Industry / market</label>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. B2B SaaS, Healthcare, Fintech"
                value={form.industry}
                onChange={set('industry')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Analysis angle</label>
                <select className={selectClass} style={inputStyle} value={form.angle} onChange={set('angle')}>
                  <option>Product features</option>
                  <option>Pricing &amp; packaging</option>
                  <option>GTM &amp; positioning</option>
                  <option>Customer segments</option>
                  <option>Strengths &amp; weaknesses</option>
                  <option>Full comparison</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Purpose</label>
                <select className={selectClass} style={inputStyle} value={form.purpose} onChange={set('purpose')}>
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
              className="px-6 py-3 rounded-full font-medium transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{backgroundColor: 'var(--ed-cta)', color: 'var(--ed-bg)'}}
            >
              {isLoading ? 'Analysing…' : 'Analyse competitor →'}
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
