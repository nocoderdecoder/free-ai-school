'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)', color: 'var(--ed-text)' }
const inputClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm"
const selectClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs uppercase tracking-widest mb-2"

export default function GTMPlaybook() {
  const [form, setForm] = useState({
    product: '',
    industry: '',
    stage: 'Growth (10–100)',
    icp: '',
    motion: 'Sales-Led Growth (SLG)',
    challenge: 'Finding the right ICP',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />
      <ToolShell
        name="GTM Playbook Generator"
        description="Describe your product and target market. Get a tailored go-to-market strategy built by Claude."
        estimatedTime="Results in ~20 seconds"
        variant="light"
      >
        {({ onSubmit, isLoading, isComplete }) => (
          <form
            onSubmit={e => {
              e.preventDefault()
              onSubmit(fetch('/api/tools/gtm-playbook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
              }))
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Product / Company *</label>
                <input
                  required
                  className={inputClass}
                  style={inputStyle}
                  placeholder="e.g. AI contract review for legal teams"
                  value={form.product}
                  onChange={set('product')}
                />
              </div>
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Industry / Market *</label>
                <input
                  required
                  className={inputClass}
                  style={inputStyle}
                  placeholder="e.g. B2B SaaS, Healthcare, Fintech"
                  value={form.industry}
                  onChange={set('industry')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Company Stage</label>
                <select className={selectClass} style={inputStyle} value={form.stage} onChange={set('stage')}>
                  <option>Early-stage (0–10 employees)</option>
                  <option>Growth (10–100)</option>
                  <option>Scale-up (100–500)</option>
                  <option>Enterprise (500+)</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Primary GTM Motion</label>
                <select className={selectClass} style={inputStyle} value={form.motion} onChange={set('motion')}>
                  <option>Product-Led Growth (PLG)</option>
                  <option>Sales-Led Growth (SLG)</option>
                  <option>Channel / Partner</option>
                  <option>Community-Led</option>
                  <option>Outbound</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Ideal Customer Profile *</label>
              <textarea
                required
                rows={3}
                className={`${inputClass} resize-none`}
                style={inputStyle}
                placeholder="e.g. Head of Legal at mid-market financial services firms, 200–1000 employees, struggling with contract review bottlenecks"
                value={form.icp}
                onChange={set('icp')}
              />
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Biggest GTM Challenge</label>
              <select className={selectClass} style={inputStyle} value={form.challenge} onChange={set('challenge')}>
                <option>Finding the right ICP</option>
                <option>Differentiation from competitors</option>
                <option>Converting trials to paid</option>
                <option>Enterprise sales cycle length</option>
                <option>Building awareness</option>
                <option>Channel strategy</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading || isComplete}
              className="px-6 py-3 rounded-full font-medium transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{backgroundColor: 'var(--ed-cta)', color: 'var(--ed-bg)'}}
            >
              {isLoading ? 'Generating…' : 'Generate playbook →'}
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
