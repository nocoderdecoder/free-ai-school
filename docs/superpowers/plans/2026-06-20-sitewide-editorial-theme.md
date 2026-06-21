# Site-Wide Editorial Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the warm editorial theme (already shipped on the homepage) to all 25 remaining pages on anshul.ai, by adding a `variant="light"` opt-in to the shared components those pages use, then converting each page's markup/colors to the editorial palette.

**Architecture:** Dark stays the default everywhere (zero risk of regressing pages not yet converted). Four shared components (`PortableTextComponents.tsx`'s `editorialComponents` export, `ContactForm`, `ToolShell`, `ReadingProgress`) gain a `variant` prop, default `'dark'`. Each of the 25 pages is then rewritten in place to pass `variant="light"` to `Nav` and any of those components it uses, and to swap its own Tailwind/inline-style dark colors for the `--ed-*` tokens already defined in `app/design/tokens.css`.

**Tech Stack:** Next.js App Router, Tailwind CSS, `next-sanity`, `@portabletext/react`.

**Spec:** `docs/superpowers/specs/2026-06-20-sitewide-editorial-theme-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/components/PortableTextComponents.tsx` | Modify | Add `editorialComponents` export (parallel to existing `components`/`portableTextComponents`) |
| `app/components/ContactForm.tsx` | Modify | Add `variant?: 'dark' \| 'light'` prop |
| `app/components/ToolShell.tsx` | Modify | Add `variant?: 'dark' \| 'light'` prop, threaded into internal `RenderResult`/`renderInline` |
| `app/components/ReadingProgress.tsx` | Modify | Add `variant?: 'dark' \| 'light'` prop |
| `app/globals.css` | Modify | Add one shared `.ed-list-card:hover` rule used by every card-grid page |
| 7 list/index pages | Modify | `analysis`, `deals-events`, `learn`, `trending`, `projects`, `writing`, `downloads` |
| 4 article/detail pages | Modify | `learn/[slug]`, `deals-events/[slug]`, `trending/[slug]`, `writing/[slug]` |
| 7 interactive tool pages | Modify | `ai-learning-compass`, `ai-readiness`, `ai-tool-recommender`, `competitive-analysis`, `gtm-playbook`, `meeting-brief`, `roi-calculator` |
| 5 static/index/contact pages | Modify | `about`, `work`, `lab`, `tools` (index), `contact` |

**Out of scope** (per spec): `tools/speaking-speed/*` (standalone app, unrelated CSS vars, no Nav), `AnimatedHero`/`MetricsStrip`/`ToolsMarquee` (homepage-only), `ScrollSection` (color-agnostic, no changes).

---

### Task 1: Add `editorialComponents` export to PortableTextComponents

**Files:**
- Modify: `app/components/PortableTextComponents.tsx`

Current full file content:

```tsx
export const components = {
  block: {
    normal:     ({ children }: any) => <p className="mb-6 leading-relaxed text-white/80 text-lg">{children}</p>,
    h2:         ({ children }: any) => <h2 className="text-2xl font-bold mt-10 mb-4 text-white">{children}</h2>,
    h3:         ({ children }: any) => <h3 className="text-xl font-semibold mt-8 mb-3 text-white">{children}</h3>,
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-white/20 pl-6 my-8 text-white/50 italic">{children}</blockquote>,
  },
  marks: {
    strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
    em:     ({ children }: any) => <em className="italic text-white/70">{children}</em>,
    link:   ({ children, value }: any) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4 hover:text-white/70 transition">
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="mb-6 space-y-2 list-none pl-0">{children}</ul>,
  },
  listItem: {
    bullet: ({ children }: any) => (
      <li className="text-white/80 text-lg leading-relaxed flex gap-3">
        <span className="text-white/30 mt-1 shrink-0">—</span>
        <span>{children}</span>
      </li>
    ),
  },
}

// Alias for named import compatibility
export const portableTextComponents = components
```

- [ ] **Step 1: Append the `editorialComponents` export**

Add this to the end of the file (do not modify `components`/`portableTextComponents` above it):

```tsx

// Editorial (light) variant — for the 25 light-mode pages.
// Parallel object, same shape as `components` above; do not modify `components` itself.
export const editorialComponents = {
  block: {
    normal:     ({ children }: any) => <p className="mb-6 leading-relaxed text-[#888888] text-lg">{children}</p>,
    h2:         ({ children }: any) => <h2 className="font-serif text-2xl mt-10 mb-4 text-[#1a1a1a]" style={{ fontWeight: 400 }}>{children}</h2>,
    h3:         ({ children }: any) => <h3 className="font-serif text-xl mt-8 mb-3 text-[#1a1a1a]" style={{ fontWeight: 400 }}>{children}</h3>,
    blockquote: ({ children }: any) => (
      <blockquote
        className="border-l-2 pl-6 my-8 italic rounded-r-lg py-4 pr-4"
        style={{ borderColor: 'var(--ed-trending-dot)', background: 'var(--ed-card-warm)', color: 'var(--ed-text-secondary)' }}
      >
        {children}
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }: any) => <strong className="font-semibold text-[#222222]">{children}</strong>,
    em:     ({ children }: any) => <em className="italic text-[#888888]">{children}</em>,
    link:   ({ children, value }: any) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer" className="text-[#222222] underline underline-offset-4 hover:text-[#555555] transition">
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="mb-6 space-y-2 list-none pl-0">{children}</ul>,
  },
  listItem: {
    bullet: ({ children }: any) => (
      <li className="text-[#888888] text-lg leading-relaxed flex gap-3">
        <span className="text-[#bbbbbb] mt-1 shrink-0">—</span>
        <span>{children}</span>
      </li>
    ),
  },
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/PortableTextComponents.tsx
git commit -m "feat: add editorialComponents export for light-theme PortableText rendering"
```

---

### Task 2: Add light variant to ContactForm

**Files:**
- Modify: `app/components/ContactForm.tsx`

Current full file content:

```tsx
'use client'

import { useState } from 'react'

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'speaking',
    message: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setStatus('sent')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-8 text-center">
        <p className="text-white text-lg font-medium mb-2">Message sent!</p>
        <p className="text-white/60 text-sm">I&apos;ll get back to you within 48 hours.</p>
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Category</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition appearance-none"
        >
          <option value="speaking">Speaking inquiry</option>
          <option value="media">Media request</option>
          <option value="collaboration">Collaboration</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition"
          placeholder="Your name"
        />
      </div>
      <div>
        <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Message</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={5}
          className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition resize-none"
          placeholder="What would you like to discuss?"
        />
      </div>

      {status === 'error' && (
        <p className="text-red-400 text-sm text-center">
          Something went wrong. Please email me directly at{' '}
          <a href="mailto:anshulgupta1512@gmail.com" className="underline">
            anshulgupta1512@gmail.com
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-white text-black py-3 rounded-full font-medium text-sm hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
```

- [ ] **Step 1: Replace the full file with a variant-aware version**

```tsx
'use client'

import { useState } from 'react'

type ContactFormProps = {
  variant?: 'dark' | 'light'
}

export function ContactForm({ variant = 'dark' }: ContactFormProps) {
  const isLight = variant === 'light'

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'speaking',
    message: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setStatus('sent')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const fieldClass = isLight
    ? 'w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition'
    : 'w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition'
  const fieldStyle = isLight
    ? { background: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)', color: 'var(--ed-text)' }
    : undefined

  const labelClass = isLight
    ? 'block text-xs uppercase tracking-widest mb-2'
    : 'block text-white/40 text-xs uppercase tracking-widest mb-2'
  const labelStyle = isLight ? { color: 'var(--ed-text-faint)' } : undefined

  if (status === 'sent') {
    return (
      <div
        className={isLight ? 'rounded-2xl p-8 text-center' : 'bg-white/[0.05] border border-white/10 rounded-2xl p-8 text-center'}
        style={isLight ? { background: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)' } : undefined}
      >
        <p className={isLight ? 'text-lg font-medium mb-2' : 'text-white text-lg font-medium mb-2'} style={isLight ? { color: 'var(--ed-text-dark)' } : undefined}>
          Message sent!
        </p>
        <p className={isLight ? 'text-sm' : 'text-white/60 text-sm'} style={isLight ? { color: 'var(--ed-text-muted)' } : undefined}>
          I&apos;ll get back to you within 48 hours.
        </p>
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label className={labelClass} style={labelStyle}>Category</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className={`${fieldClass} appearance-none cursor-pointer`}
          style={fieldStyle}
        >
          <option value="speaking">Speaking inquiry</option>
          <option value="media">Media request</option>
          <option value="collaboration">Collaboration</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className={labelClass} style={labelStyle}>Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className={fieldClass}
          style={fieldStyle}
          placeholder="Your name"
        />
      </div>
      <div>
        <label className={labelClass} style={labelStyle}>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className={fieldClass}
          style={fieldStyle}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className={labelClass} style={labelStyle}>Message</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={5}
          className={`${fieldClass} resize-none`}
          style={fieldStyle}
          placeholder="What would you like to discuss?"
        />
      </div>

      {status === 'error' && (
        <p className={isLight ? 'text-sm text-center text-red-600' : 'text-red-400 text-sm text-center'}>
          Something went wrong. Please email me directly at{' '}
          <a href="mailto:anshulgupta1512@gmail.com" className="underline">
            anshulgupta1512@gmail.com
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className={
          isLight
            ? 'w-full py-3 rounded-full font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed'
            : 'w-full bg-white text-black py-3 rounded-full font-medium text-sm hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed'
        }
        style={isLight ? { background: 'var(--ed-cta)', color: 'var(--ed-bg)' } : undefined}
      >
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/ContactForm.tsx
git commit -m "feat: add light variant to ContactForm"
```

---

### Task 3: Add light variant to ToolShell

**Files:**
- Modify: `app/components/ToolShell.tsx`

Current full file content:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'

// Simple markdown-to-JSX renderer for tool output
function RenderResult({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-3" />)
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key++} className="text-lg font-bold text-white mt-6 mb-2">
          {line.slice(3)}
        </h3>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h4 key={key++} className="text-base font-semibold text-white/90 mt-4 mb-1">
          {line.slice(4)}
        </h4>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} className="flex gap-3 text-white/70 text-sm leading-relaxed">
          <span className="text-white/30 shrink-0 mt-0.5">—</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(
        <p key={key++} className="font-semibold text-white text-sm">
          {line.slice(2, -2)}
        </p>
      )
    } else {
      elements.push(
        <p key={key++} className="text-white/70 text-sm leading-relaxed">
          {renderInline(line)}
        </p>
      )
    }
  }
  return <div className="space-y-1">{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  )
}

type ToolShellProps = {
  name: string
  description: string
  estimatedTime?: string
  children: (props: {
    onSubmit: (fetchPromise: Promise<Response>) => void
    isLoading: boolean
    isComplete: boolean
  }) => React.ReactNode
}

export function ToolShell({ name, description, estimatedTime, children }: ToolShellProps) {
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (fetchPromise: Promise<Response>) => {
    setResult('')
    setError('')
    setIsLoading(true)
    setIsComplete(false)

    try {
      const response = await fetchPromise
      if (!response.ok) {
        const err = await response.text()
        setError(err || 'Something went wrong. Please try again.')
        setIsLoading(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) {
        setError('No response stream available.')
        setIsLoading(false)
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setResult(prev => prev + chunk)
        if (resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    } catch (e) {
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
      setIsComplete(true)
    }
  }

  const handleReset = () => {
    setResult('')
    setError('')
    setIsLoading(false)
    setIsComplete(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-8 pt-28 pb-32">
      <a href="/tools" className="section-label mb-8 inline-block hover:text-white transition">
        ← Tools
      </a>

      <div className="mt-4 mb-10">
        <h1 className="heading-page mb-3">{name}</h1>
        <p className="text-white/60 text-xl leading-relaxed">{description}</p>
        {estimatedTime && (
          <p className="text-white/25 text-sm mt-2">{estimatedTime}</p>
        )}
      </div>

      {!isComplete && (
        <div className="border border-white/10 rounded-xl p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          {children({ onSubmit: handleSubmit, isLoading, isComplete })}
        </div>
      )}

      {isLoading && !result && (
        <div className="border border-white/10 rounded-xl p-8 text-center mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center justify-center gap-3 text-white/40">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.4s]" />
            <span className="text-sm ml-2">Claude is thinking…</span>
          </div>
        </div>
      )}

      {error && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-6 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div ref={resultRef} className="border border-white/10 rounded-xl p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-white/40 uppercase tracking-widest">Generating…</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-white/40 uppercase tracking-widest">Complete</span>
                </>
              )}
            </div>
            {isComplete && (
              <button
                onClick={() => navigator.clipboard?.writeText(result)}
                className="text-xs text-white/30 hover:text-white transition"
              >
                Copy
              </button>
            )}
          </div>
          <RenderResult text={result} />
        </div>
      )}

      {isComplete && (
        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="border border-white/20 px-6 py-3 rounded-full text-sm font-medium hover:border-white/40 transition btn-press"
          >
            ← Try another
          </button>
          <a
            href="/tools"
            className="text-white/30 px-4 py-3 text-sm hover:text-white transition"
          >
            See all tools
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 1: Replace the full file with a variant-aware version**

`variant` is threaded as an explicit parameter through `RenderResult`/`renderInline` rather than via CSS variables, since the dark path uses Tailwind opacity-suffixed utility classes (`text-white/70`) that have no CSS-variable equivalent without rewriting every class to inline styles anyway — passing `variant` straight through every branch that already needs touching is simpler.

```tsx
'use client'

import { useState, useRef } from 'react'

type Variant = 'dark' | 'light'

// Simple markdown-to-JSX renderer for tool output
function RenderResult({ text, variant = 'dark' }: { text: string; variant?: Variant }) {
  const isLight = variant === 'light'
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  const h3Class = isLight ? 'font-serif text-lg mt-6 mb-2' : 'text-lg font-bold text-white mt-6 mb-2'
  const h3Style = isLight ? { color: 'var(--ed-text-dark)', fontWeight: 400 } : undefined

  const h4Class = isLight ? 'text-base font-semibold mt-4 mb-1' : 'text-base font-semibold text-white/90 mt-4 mb-1'
  const h4Style = isLight ? { color: 'var(--ed-text-dark)' } : undefined

  const listRowClass = isLight ? 'flex gap-3 text-sm leading-relaxed' : 'flex gap-3 text-white/70 text-sm leading-relaxed'
  const listRowStyle = isLight ? { color: 'var(--ed-text-muted)' } : undefined

  const listMarkerClass = isLight ? 'shrink-0 mt-0.5' : 'text-white/30 shrink-0 mt-0.5'
  const listMarkerStyle = isLight ? { color: 'var(--ed-text-light)' } : undefined

  const boldLineClass = isLight ? 'text-sm' : 'font-semibold text-white text-sm'
  const boldLineStyle = isLight ? { color: 'var(--ed-text)', fontWeight: 600 } : undefined

  const paragraphClass = isLight ? 'text-sm leading-relaxed' : 'text-white/70 text-sm leading-relaxed'
  const paragraphStyle = isLight ? { color: 'var(--ed-text-muted)' } : undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-3" />)
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={key++} className={h3Class} style={h3Style}>{line.slice(3)}</h3>)
    } else if (line.startsWith('### ')) {
      elements.push(<h4 key={key++} className={h4Class} style={h4Style}>{line.slice(4)}</h4>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} className={listRowClass} style={listRowStyle}>
          <span className={listMarkerClass} style={listMarkerStyle}>—</span>
          <span>{renderInline(line.slice(2), variant)}</span>
        </div>
      )
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(<p key={key++} className={boldLineClass} style={boldLineStyle}>{line.slice(2, -2)}</p>)
    } else {
      elements.push(<p key={key++} className={paragraphClass} style={paragraphStyle}>{renderInline(line, variant)}</p>)
    }
  }
  return <div className="space-y-1">{elements}</div>
}

function renderInline(text: string, variant: Variant = 'dark'): React.ReactNode {
  const isLight = variant === 'light'
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? (
              <strong key={i} className={isLight ? 'font-semibold' : 'font-semibold text-white'} style={isLight ? { color: 'var(--ed-text)' } : undefined}>
                {part.slice(2, -2)}
              </strong>
            )
          : part
      )}
    </>
  )
}

type ToolShellProps = {
  name: string
  description: string
  estimatedTime?: string
  variant?: Variant
  children: (props: {
    onSubmit: (fetchPromise: Promise<Response>) => void
    isLoading: boolean
    isComplete: boolean
  }) => React.ReactNode
}

export function ToolShell({ name, description, estimatedTime, variant = 'dark', children }: ToolShellProps) {
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)

  const isLight = variant === 'light'

  const cardClass = isLight ? 'rounded-xl p-6 mb-6' : 'border border-white/10 rounded-xl p-6 mb-6'
  const cardStyle = isLight ? { background: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)' } : { backgroundColor: 'var(--bg-card)' }

  const loadingCardClass = isLight ? 'rounded-xl p-8 text-center mb-6' : 'border border-white/10 rounded-xl p-8 text-center mb-6'
  const loadingTextClass = isLight ? 'flex items-center justify-center gap-3' : 'flex items-center justify-center gap-3 text-white/40'
  const loadingTextStyle = isLight ? { color: 'var(--ed-text-muted)' } : undefined

  const errorClass = isLight
    ? 'border rounded-xl p-6 mb-6 text-sm border-red-300 bg-red-50 text-red-700'
    : 'border border-red-500/20 bg-red-500/5 rounded-xl p-6 mb-6 text-red-400 text-sm'

  const resultHeaderClass = isLight ? 'flex items-center justify-between mb-5 pb-4' : 'flex items-center justify-between mb-5 pb-4 border-b border-white/10'
  const resultHeaderStyle = isLight ? { borderBottom: '1px solid var(--ed-border)' } : undefined

  const statusLabelClass = isLight ? 'text-xs uppercase tracking-widest' : 'text-xs text-white/40 uppercase tracking-widest'
  const statusLabelStyle = isLight ? { color: 'var(--ed-text-muted)' } : undefined

  const copyButtonClass = isLight ? 'text-xs transition' : 'text-xs text-white/30 hover:text-white transition'
  const copyButtonStyle = isLight ? { color: 'var(--ed-text-faint)' } : undefined

  const backLinkClass = isLight ? 'section-label mb-8 inline-block transition' : 'section-label mb-8 inline-block hover:text-white transition'
  const backLinkStyle = isLight ? { color: 'var(--ed-text-muted)' } : undefined

  const descriptionClass = isLight ? 'text-xl leading-relaxed' : 'text-white/60 text-xl leading-relaxed'
  const descriptionStyle = isLight ? { color: 'var(--ed-text-secondary)' } : undefined

  const estimatedTimeClass = isLight ? 'text-sm mt-2' : 'text-white/25 text-sm mt-2'
  const estimatedTimeStyle = isLight ? { color: 'var(--ed-text-light)' } : undefined

  const tryAnotherClass = isLight ? 'px-6 py-3 rounded-full text-sm font-medium transition btn-press' : 'border border-white/20 px-6 py-3 rounded-full text-sm font-medium hover:border-white/40 transition btn-press'
  const tryAnotherStyle = isLight ? { border: '1px solid var(--ed-border)', color: 'var(--ed-text)' } : undefined

  const seeAllClass = isLight ? 'px-4 py-3 text-sm transition' : 'text-white/30 px-4 py-3 text-sm hover:text-white transition'
  const seeAllStyle = isLight ? { color: 'var(--ed-text-faint)' } : undefined

  const handleSubmit = async (fetchPromise: Promise<Response>) => {
    setResult('')
    setError('')
    setIsLoading(true)
    setIsComplete(false)

    try {
      const response = await fetchPromise
      if (!response.ok) {
        const err = await response.text()
        setError(err || 'Something went wrong. Please try again.')
        setIsLoading(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) {
        setError('No response stream available.')
        setIsLoading(false)
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setResult(prev => prev + chunk)
        if (resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    } catch (e) {
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
      setIsComplete(true)
    }
  }

  const handleReset = () => {
    setResult('')
    setError('')
    setIsLoading(false)
    setIsComplete(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-8 pt-28 pb-32">
      <a href="/tools" className={backLinkClass} style={backLinkStyle}>← Tools</a>

      <div className="mt-4 mb-10">
        <h1 className="heading-page mb-3">{name}</h1>
        <p className={descriptionClass} style={descriptionStyle}>{description}</p>
        {estimatedTime && (
          <p className={estimatedTimeClass} style={estimatedTimeStyle}>{estimatedTime}</p>
        )}
      </div>

      {!isComplete && (
        <div className={cardClass} style={cardStyle}>
          {children({ onSubmit: handleSubmit, isLoading, isComplete })}
        </div>
      )}

      {isLoading && !result && (
        <div className={loadingCardClass} style={cardStyle}>
          <div className={loadingTextClass} style={loadingTextStyle}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.4s]" />
            <span className="text-sm ml-2">Claude is thinking…</span>
          </div>
        </div>
      )}

      {error && (
        <div className={errorClass}>{error}</div>
      )}

      {result && (
        <div ref={resultRef} className={cardClass} style={cardStyle}>
          <div className={resultHeaderClass} style={resultHeaderStyle}>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className={statusLabelClass} style={statusLabelStyle}>Generating…</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className={statusLabelClass} style={statusLabelStyle}>Complete</span>
                </>
              )}
            </div>
            {isComplete && (
              <button onClick={() => navigator.clipboard?.writeText(result)} className={copyButtonClass} style={copyButtonStyle}>
                Copy
              </button>
            )}
          </div>
          <RenderResult text={result} variant={variant} />
        </div>
      )}

      {isComplete && (
        <div className="flex gap-4">
          <button onClick={handleReset} className={tryAnotherClass} style={tryAnotherStyle}>
            ← Try another
          </button>
          <a href="/tools" className={seeAllClass} style={seeAllStyle}>
            See all tools
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/ToolShell.tsx
git commit -m "feat: add light variant to ToolShell"
```

---

### Task 4: Add light variant to ReadingProgress

**Files:**
- Modify: `app/components/ReadingProgress.tsx`

Current full file content:

```tsx
'use client'

import { useEffect, useState } from 'react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px] bg-white/10">
      <div
        className="h-full bg-white transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
```

- [ ] **Step 1: Replace the full file with a variant-aware version**

```tsx
'use client'

import { useEffect, useState } from 'react'

type ReadingProgressProps = {
  variant?: 'dark' | 'light'
}

export function ReadingProgress({ variant = 'dark' }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0)
  const isLight = variant === 'light'

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div
      className={isLight ? 'fixed top-0 left-0 right-0 z-[200] h-[2px]' : 'fixed top-0 left-0 right-0 z-[200] h-[2px] bg-white/10'}
      style={isLight ? { backgroundColor: 'var(--ed-border)' } : undefined}
    >
      <div
        className={isLight ? 'h-full transition-none' : 'h-full bg-white transition-none'}
        style={isLight ? { width: `${progress}%`, backgroundColor: 'var(--ed-cta)' } : { width: `${progress}%` }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/ReadingProgress.tsx
git commit -m "feat: add light variant to ReadingProgress"
```

---

### Task 5: Add shared `.ed-list-card` hover rule

**Files:**
- Modify: `app/globals.css`

Every list/index, article prev-next, and static-page card in the tasks below uses `className="ed-list-card"` for its hover state instead of repeating the rule per page.

- [ ] **Step 1: Append to the end of `app/globals.css`**

```css

/* ── Shared editorial list-card hover (used across list/article/static pages) ── */
.ed-list-card {
  transition: background 0.2s, transform 0.2s;
}

.ed-list-card:hover {
  background: var(--ed-card-hover) !important;
  transform: translateY(-1px);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add shared ed-list-card hover rule for editorial pages"
```

---

### Task 6: Convert analysis page to editorial theme

**Files:**
- Modify: `app/analysis/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'AI Analysis',
  description: 'Daily AI trending articles and major deals & events — analysed for business professionals.',
  openGraph: {
    title: 'AI Analysis — Daily Trends, Deals & Events',
    description: 'Daily AI trending articles and major deals & events — analysed for business professionals.',
    url: 'https://anshul.ai/analysis',
  },
}

export const revalidate = 0

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TypeBadge({ type }: { type: 'trending' | 'event' | 'deal' }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    trending: { bg: '#E8F0FE', color: '#3B5BA9', label: 'Trending' },
    event:    { bg: '#F3E8FF', color: '#7C3AED', label: 'Event' },
    deal:     { bg: '#FEF3E2', color: '#B45309', label: 'Deal' },
  }
  const s = styles[type] ?? styles.trending
  return (
    <span
      className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

type AnalysisItem = {
  title: string
  slug: string
  excerpt?: string
  publishedAt: string
  source: 'trending' | 'deal-event'
  type?: 'event' | 'deal'
  eventName?: string
}

export default async function Analysis() {
  let items: AnalysisItem[] = []

  try {
    const [trending, dealEvents] = await Promise.all([
      client.fetch(
        `*[_type == "trending"] | order(publishedAt desc) { title, "slug": slug.current, excerpt, publishedAt }`
      ),
      client.fetch(
        `*[_type == "deal-event"] | order(publishedAt desc) { title, "slug": slug.current, excerpt, publishedAt, type, eventName }`
      ),
    ])

    const trendingItems: AnalysisItem[] = (trending ?? []).map((t: any) => ({
      ...t,
      source: 'trending' as const,
    }))

    const dealEventItems: AnalysisItem[] = (dealEvents ?? []).map((d: any) => ({
      ...d,
      source: 'deal-event' as const,
    }))

    items = [...trendingItems, ...dealEventItems].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch {
    items = []
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Analysis</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          AI trends, deals<br />& events.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Daily AI analysis and coverage of major industry moves — written for business professionals, not researchers.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32">
        {items.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}>
            <p className="text-sm" style={{ color: 'var(--ed-text-light)' }}>Analysis articles coming soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const href = item.source === 'trending'
                ? `/trending/${item.slug}`
                : `/deals-events/${item.slug}`
              const badgeType = item.source === 'trending'
                ? 'trending'
                : (item.type ?? 'deal')

              return (
                <a
                  key={`${item.source}-${item.slug}`}
                  href={href}
                  data-cursor="Read"
                  className="group block rounded-xl p-6 transition ed-list-card"
                  style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        {i === 0 && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest" style={{ color: 'var(--ed-trending-dot)' }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--ed-trending-dot)' }} />
                            Latest
                          </span>
                        )}
                        <TypeBadge type={badgeType} />
                        {item.eventName && (
                          <span className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{item.eventName}</span>
                        )}
                      </div>
                      <h2 className="text-base font-semibold mb-2 leading-snug" style={{ color: 'var(--ed-text)' }}>
                        {item.title}
                      </h2>
                      {item.excerpt && (
                        <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--ed-text-muted)' }}>
                          {item.excerpt}
                        </p>
                      )}
                    </div>
                    {item.publishedAt && (
                      <p className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--ed-text-light)' }}>
                        {formatDate(item.publishedAt)}
                      </p>
                    )}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/analysis/page.tsx
git commit -m "feat: convert analysis page to editorial theme"
```

---

### Task 7: Convert deals-events page to editorial theme

**Files:**
- Modify: `app/deals-events/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Deals & Events — Anshul Gupta',
  description: 'Significant AI events and acquisitions — analysed for business professionals. Published when something worth reading happens.',
  openGraph: {
    title: 'Deals & Events — Anshul Gupta',
    description: 'Significant AI events and acquisitions — analysed for business professionals.',
    url: 'https://anshul.ai/deals-events',
  },
}

export const revalidate = 0

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TypeBadge({ type }: { type: 'event' | 'deal' }) {
  if (type === 'event') {
    return (
      <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
        style={{ background: '#F3E8FF', color: '#7C3AED' }}>
        Event
      </span>
    )
  }
  return (
    <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
      style={{ background: '#FEF3E2', color: '#B45309' }}>
      Deal
    </span>
  )
}

export default async function DealsEvents() {
  let articles: any[] = []
  try {
    articles = await client.fetch(
      `*[_type == "deal-event"] | order(publishedAt desc) { title, slug, excerpt, publishedAt, type, eventName, readTime }`
    )
  } catch {
    articles = []
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Deals & Events</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          Major moves<br />in AI.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Significant events and acquisitions — analysed for business professionals. Published when something worth reading happens.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-20">
        {articles.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}>
            <p className="text-sm" style={{ color: 'var(--ed-text-light)' }}>Nothing yet. Check back when something significant happens.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article: any, i: number) => (
              <a
                key={article.slug.current}
                href={`/deals-events/${article.slug.current}`}
                className="group block rounded-xl p-6 transition ed-list-card"
                style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {i === 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest" style={{ color: 'var(--ed-trending-dot)' }}>
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--ed-trending-dot)' }} />
                          Latest
                        </span>
                      )}
                      <TypeBadge type={article.type} />
                      {article.eventName && (
                        <span className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{article.eventName}</span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold mb-2 leading-snug" style={{ color: 'var(--ed-text)' }}>
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--ed-text-muted)' }}>
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {article.publishedAt && (
                      <p className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{formatDate(article.publishedAt)}</p>
                    )}
                    {article.readTime && (
                      <p className="text-xs mt-1" style={{ color: 'var(--ed-text-light)' }}>{article.readTime} min</p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <footer style={{ borderTop: '1px solid var(--ed-border)' }}>
        <div className="max-w-3xl mx-auto px-8 py-12 flex flex-col sm:flex-row justify-between gap-8">
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--ed-text-dark)' }}>Anshul Gupta</p>
            <p className="text-sm" style={{ color: 'var(--ed-text-faint)' }}>GTM Strategy at Google · Kellogg MBA</p>
            <p className="text-xs mt-4" style={{ color: 'var(--ed-text-light)' }}>© {new Date().getFullYear()} · anshul.ai</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ed-text-light)' }}>Pages</p>
              <a href="/about" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>About</a>
              <a href="/work" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Work</a>
              <a href="/projects" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Projects</a>
              <a href="/learn" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>AI School</a>
              <a href="/analysis" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Analysis</a>
              <a href="/writing" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Writing</a>
              <a href="/downloads" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Downloads</a>
              <a href="/contact" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Contact</a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ed-text-light)' }}>Connect</p>
              <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" rel="noopener noreferrer" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>LinkedIn</a>
              <a href="https://github.com/nocoderdecoder" target="_blank" rel="noopener noreferrer" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/deals-events/page.tsx
git commit -m "feat: convert deals-events page to editorial theme"
```

---

### Task 8: Convert learn page to editorial theme

**Files:**
- Modify: `app/learn/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'

export const metadata: Metadata = {
  title: 'Free AI School',
  description: 'A complete AI curriculum for business professionals. No prerequisites, no engineering degree — practical AI knowledge for the people who run teams and make decisions.',
  openGraph: {
    title: 'Free AI School — Practical AI for Business Professionals',
    description: 'A complete AI curriculum for business professionals. No prerequisites, no engineering degree required.',
    url: 'https://anshul.ai/learn',
  },
}

export const revalidate = 0

const modules = [
  {
    key: 'foundations',
    label: 'Foundations',
    tagline: 'What AI is and how it actually works',
    description: 'Tokens, context windows, prompts, hallucinations, and the concepts every professional needs before using AI seriously.',
  },
  {
    key: 'tools',
    label: 'The Tools Layer',
    tagline: 'The tools professionals are actually using',
    description: 'ChatGPT, Claude, Gemini, Copilot, meeting AI, writing AI, and how to choose the right tool for each job.',
  },
  {
    key: 'organization',
    label: 'AI in Your Organization',
    tagline: 'Strategy, adoption, and leadership',
    description: 'How to evaluate AI vendors, build an AI policy, manage AI projects, and lead teams through the transition.',
  },
  {
    key: 'hands-on',
    label: 'Hands-On',
    tagline: 'Building AI habits that actually stick',
    description: 'Practical walkthroughs for writing, research, meetings, analysis, and building a personal AI workflow.',
  },
  {
    key: 'claude',
    label: 'Mastering Claude',
    tagline: 'Everything you need to know about Claude',
    description: 'What Claude is, how the interface works, how to prompt it well, real work use cases, and how to go further with the API and Claude Code.',
  },
]

export default async function Learn() {
  let articles: any[] = []
  try {
    const { createClient } = await import('next-sanity')
    const client = createClient({
      projectId: '8w4exnl4',
      dataset: 'production',
      apiVersion: '2024-01-01',
      useCdn: false,
    })
    articles = await client.fetch(
      `*[_type == "article"] | order(_createdAt asc) { title, slug, module, excerpt, readTime }`
    )
  } catch (e) {
    articles = []
  }

  const moduledArticles = articles.filter((a: any) =>
    modules.some((m) => m.key === a.module)
  )
  const unmatchedArticles = articles.filter((a: any) =>
    !modules.some((m) => m.key === a.module)
  )

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Free AI School</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          No prerequisites.<br />Start anywhere.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          A complete AI curriculum for business professionals. No engineering background required — just the practical knowledge you need to use AI at work, lead AI projects, and stay ahead.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const count = articles.filter((a: any) => a.module === mod.key).length
            return (
              <a
                key={mod.key}
                href={`#${mod.key}`}
                className="group block rounded-xl p-6 transition ed-list-card"
                style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
              >
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--ed-text-faint)' }}>{mod.label}</p>
                <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--ed-text)' }}>{mod.tagline}</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{mod.description}</p>
                {count > 0 && (
                  <p className="text-xs mt-4" style={{ color: 'var(--ed-text-light)' }}>{count} {count === 1 ? 'article' : 'articles'}</p>
                )}
              </a>
            )
          })}
        </div>
      </section>

      {articles.length > 0 && (
        <section className="max-w-3xl mx-auto px-8 py-16" style={{ borderTop: '1px solid var(--ed-border)' }}>
          <div className="space-y-16">
            {modules.map((mod) => {
              const modArticles = articles.filter((a: any) => a.module === mod.key)
              if (modArticles.length === 0) return null
              return (
                <div key={mod.key} id={mod.key}>
                  <p className="text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--ed-text-faint)' }}>{mod.label}</p>
                  <div className="space-y-3">
                    {modArticles.map((article: any) => (
                      <a
                        key={article.slug.current}
                        href={'/learn/' + article.slug.current}
                        className="block rounded-xl p-6 transition ed-list-card"
                        style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-base font-semibold" style={{ color: 'var(--ed-text)' }}>{article.title}</h3>
                          {article.readTime && (
                            <span className="text-xs ml-4 shrink-0" style={{ color: 'var(--ed-text-light)' }}>{article.readTime} min</span>
                          )}
                        </div>
                        {article.excerpt && (
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{article.excerpt}</p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}

            {unmatchedArticles.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--ed-text-faint)' }}>More Articles</p>
                <div className="space-y-3">
                  {unmatchedArticles.map((article: any) => (
                    <a
                      key={article.slug.current}
                      href={'/learn/' + article.slug.current}
                      className="block rounded-xl p-6 transition ed-list-card"
                      style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-base font-semibold" style={{ color: 'var(--ed-text)' }}>{article.title}</h3>
                        {article.readTime && (
                          <span className="text-xs ml-4 shrink-0" style={{ color: 'var(--ed-text-light)' }}>{article.readTime} min</span>
                        )}
                      </div>
                      {article.excerpt && (
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{article.excerpt}</p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/learn/page.tsx
git commit -m "feat: convert learn page to editorial theme"
```

---

### Task 9: Convert trending page to editorial theme

**Files:**
- Modify: `app/trending/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Trending',
  description: 'Daily AI articles written from the most trending topics in artificial intelligence — published automatically every morning.',
  openGraph: {
    title: 'Trending AI — Daily Articles on What\'s Happening in AI',
    description: 'Daily AI articles written from the most trending topics — published every morning.',
    url: 'https://anshul.ai/trending',
  },
}

export const revalidate = 0

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function Trending() {
  let articles: any[] = []
  try {
    articles = await client.fetch(
      `*[_type == "trending"] | order(publishedAt desc) { title, slug, excerpt, publishedAt }`
    )
  } catch {
    articles = []
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Trending</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          What&apos;s happening<br />in AI. Today.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Every morning, a new article on the most trending topic in AI — written for business professionals, not researchers.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-20">
        {articles.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}>
            <p className="text-sm" style={{ color: 'var(--ed-text-light)' }}>First article drops tomorrow morning.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article: any, i: number) => (
              <a
                key={article.slug.current}
                href={`/trending/${article.slug.current}`}
                className="group block rounded-xl p-6 transition ed-list-card"
                style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {i === 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--ed-trending-dot)' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--ed-trending-dot)' }} />
                        Latest
                      </span>
                    )}
                    <h2 className="text-base font-semibold mb-2 leading-snug" style={{ color: 'var(--ed-text)' }}>
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--ed-text-muted)' }}>
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  {article.publishedAt && (
                    <p className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--ed-text-light)' }}>
                      {formatDate(article.publishedAt)}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/trending/page.tsx
git commit -m "feat: convert trending page to editorial theme"
```

---

### Task 10: Convert projects page to editorial theme

**Files:**
- Modify: `app/projects/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Real products, platforms, and automations — built at the intersection of AI and business strategy, without a traditional engineering background.',
  openGraph: {
    title: 'Projects — Things I Have Built with AI',
    description: 'Real products, platforms, and automations — built at the intersection of AI and business strategy, without a traditional engineering background.',
    url: 'https://anshul.ai/projects',
  },
}

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

type Project = {
  name: string
  tagline: string
  slug?: string
  url?: string
  status: string
  image?: string
  excerpt?: string
  impact?: string
  tools?: string[]
  featured?: boolean
}

const STATIC_PROJECTS: Project[] = [
  {
    name: "anshul.ai Platform",
    tagline: "Full-stack AI education platform with automated content pipelines",
    status: "Live",
    impact: "94 articles automated, 0 manual hours per publish",
  },
  {
    name: "PromptGrade",
    tagline: "AI prompt scoring and rewriting",
    url: "https://ratemyprompt.pro",
    status: "Live",
  },
  {
    name: "Speaking Speed Tester",
    tagline: "Real-time words-per-minute measurement",
    url: "/tools/speaking-speed",
    status: "Live",
  },
  {
    name: "AI News → LinkedIn Pipeline",
    tagline: "Automated content from signal to draft",
    status: "Running",
  },
  {
    name: "Competitive Intelligence Scraper",
    tagline: "Competitor tracking for strategy teams",
    status: "Internal",
  },
  {
    name: "HR Assistant Chatbot",
    tagline: "RAG-based answers from internal docs",
    status: "Demo",
  },
  {
    name: "CV Tailoring System",
    tagline: "Job-description-aware resume rewriting",
    status: "Built",
  },
]

const statusColor: Record<string, string> = {
  Live:     "#2E7D4F",
  Running:  "#3B5BA9",
  Internal: "#B45309",
  Demo:     "#7C3AED",
  Built:    "var(--ed-text-light)",
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function ProjectCard({ project }: { project: Project }) {
  const isExternalUrl = project.url?.startsWith('http')
  const hasDetailPage = !!project.slug
  const href = hasDetailPage ? `/projects/${project.slug}` : (project.url ?? '')

  const inner = (
    <>
      <div className="relative w-full aspect-video overflow-hidden" style={{ background: 'var(--ed-card-hover)' }}>
        {project.image ? (
          <img
            src={project.image}
            alt={project.name}
            className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(0,0,0,0.04) 24px),' +
                'repeating-linear-gradient(90deg,transparent,transparent 23px,rgba(0,0,0,0.04) 24px)',
            }}
          >
            <span className="text-3xl font-bold tracking-widest select-none" style={{ color: 'var(--ed-text-light)' }}>
              {initials(project.name)}
            </span>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 backdrop-blur-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.85)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor[project.status] ?? 'var(--ed-text-light)' }} />
          <span className="text-[10px]" style={{ color: 'var(--ed-text-muted)' }}>{project.status}</span>
        </div>
      </div>
      <div className="p-4">
        <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--ed-text)' }}>{project.name}</h2>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{project.tagline}</p>
        {project.impact && (
          <p className="text-xs mt-2 font-medium" style={{ color: '#2E7D4F' }}>{project.impact}</p>
        )}
      </div>
    </>
  )

  const shared = "block rounded-xl overflow-hidden transition group ed-list-card"
  const sharedStyle = { background: 'var(--ed-card-warm)', borderRadius: '14px' }

  if (href) {
    return (
      <a
        href={href}
        target={isExternalUrl && !hasDetailPage ? '_blank' : undefined}
        rel={isExternalUrl && !hasDetailPage ? 'noopener noreferrer' : undefined}
        data-cursor="View"
        className={shared}
        style={sharedStyle}
      >
        {inner}
      </a>
    )
  }

  return <div className={shared} style={sharedStyle}>{inner}</div>
}

export default async function Projects() {
  let projects: Project[] = []

  try {
    const sanityProjects = await client.fetch(
      `*[_type == "project"] | order(featured desc, _createdAt asc) {
        name,
        "slug": slug.current,
        tagline,
        status,
        featured,
        url,
        impact,
        tools,
        excerpt,
        "image": coverImage.asset->url,
      }`
    )
    projects = sanityProjects?.length > 0 ? sanityProjects : STATIC_PROJECTS
  } catch {
    projects = STATIC_PROJECTS
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Projects</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>Things I have built with AI.</h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Real products, platforms, and automations — built at the intersection of AI and business strategy, without a traditional engineering background.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/projects/page.tsx
git commit -m "feat: convert projects page to editorial theme"
```

---

### Task 11: Convert writing page to editorial theme

**Files:**
- Modify: `app/writing/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Honest takes on AI in business — what I am building, what is working, what failed, and what is actually happening in AI from someone doing it daily.',
  openGraph: {
    title: 'Writing — Honest Takes on AI in Business',
    description: 'What I am building, what is working, what failed, and what is actually happening in AI — from someone doing it daily, not just writing about it.',
    url: 'https://anshul.ai/writing',
  },
}

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

const UPCOMING_TOPICS = [
  {
    title: "Why your company's AI strategy is backwards",
    preview: "Most organisations are asking 'what can AI do?' The question that produces results is different.",
  },
  {
    title: "What I learned building 6 AI products without writing code",
    preview: "The tools changed. The thinking required did not. Here is what actually matters when you build.",
  },
  {
    title: "The AI adoption gap nobody talks about",
    preview: "It is not about access to tools. Almost everyone has access. The gap is something else entirely.",
  },
  {
    title: "How to evaluate an AI vendor without a technical team",
    preview: "The questions that expose whether a product is real, the red flags that do not show up in demos.",
  },
  {
    title: "How I built a 94-article AI school without writing content manually",
    preview: "The automation pipeline, the tools, the decisions — and what it means for content creation at scale.",
  },
  {
    title: "The real ROI of AI in business — a framework",
    preview: "Executives want numbers. Here is how I think about measuring AI impact when the outcomes are messy.",
  },
]

type Post = {
  title: string
  slug?: string
  excerpt: string
  publishedAt?: string
  readTime?: number
  status: 'published' | 'coming-soon' | 'draft'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function Writing() {
  let published: Post[] = []
  let comingSoon: Post[] = []

  try {
    const posts = await client.fetch(
      `*[_type == "post" && status != "draft"] | order(publishedAt desc) {
        title,
        "slug": slug.current,
        excerpt,
        publishedAt,
        readTime,
        status,
      }`
    )

    if (posts?.length > 0) {
      published = posts.filter((p: Post) => p.status === 'published')
      comingSoon = posts.filter((p: Post) => p.status === 'coming-soon')
    }
  } catch {}

  if (comingSoon.length === 0 && published.length === 0) {
    comingSoon = UPCOMING_TOPICS.map(t => ({
      title: t.title,
      excerpt: t.preview,
      status: 'coming-soon' as const,
    }))
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Writing</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          Honest takes on<br />AI in business.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          What I am building, what is working, what failed, and what I think is actually happening in AI — from someone doing it daily, not just writing about it.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32 space-y-16">

        {published.length > 0 && (
          <div>
            <p className="section-label mb-8" style={{ color: 'var(--ed-text-faint)' }}>Published</p>
            <div className="space-y-3">
              {published.map((post) => (
                <a
                  key={post.slug ?? post.title}
                  href={`/writing/${post.slug}`}
                  className="group block rounded-xl p-6 transition ed-list-card"
                  style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h2 className="text-base font-semibold mb-2 leading-snug" style={{ color: 'var(--ed-text)' }}>
                        {post.title}
                      </h2>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{post.excerpt}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {post.publishedAt && (
                        <p className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{formatDate(post.publishedAt)}</p>
                      )}
                      {post.readTime && (
                        <p className="text-xs mt-1" style={{ color: 'var(--ed-text-light)' }}>{post.readTime} min read</p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {comingSoon.length > 0 && (
          <div>
            <p className="section-label mb-8" style={{ color: 'var(--ed-text-faint)' }}>{published.length > 0 ? 'Coming soon' : 'Upcoming'}</p>
            <div className="space-y-0">
              {comingSoon.map((post, i) => (
                <div
                  key={post.title}
                  className="py-7"
                  style={i < comingSoon.length - 1 ? { borderBottom: '1px solid var(--ed-border)' } : undefined}
                >
                  <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--ed-text-muted)' }}>{post.title}</h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-faint)' }}>{post.excerpt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl p-8" style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}>
          <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>In the meantime</p>
          <p className="leading-relaxed mb-6" style={{ color: 'var(--ed-text-secondary)' }}>
            Shorter takes, tool discoveries, and things I am thinking about appear more frequently on LinkedIn. Follow along there while longer pieces take shape here.
          </p>
          <a
            href="https://www.linkedin.com/in/anshul-gupta1/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition btn-press"
            style={{ background: 'var(--ed-cta)', color: '#FDFCFA' }}
          >
            Follow on LinkedIn →
          </a>
        </div>

      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/writing/page.tsx
git commit -m "feat: convert writing page to editorial theme"
```

---

### Task 12: Convert downloads page to editorial theme

**Files:**
- Modify: `app/downloads/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { resources } from './documents'

export const metadata: Metadata = {
  title: 'Free AI Resources — Anshul Gupta',
  description: 'Free one-pagers, cheat sheets, and guides on AI tools and workflows for business professionals.',
  openGraph: {
    title: 'Free AI Resources — Anshul Gupta',
    description: 'Free one-pagers, cheat sheets, and guides on AI tools and workflows for business professionals.',
    url: 'https://anshul.ai/downloads',
  },
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg className="w-8 h-8" style={{ color: 'var(--ed-text-light)' }} fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function getCategories(resources: typeof import('./documents').resources) {
  const seen = new Set<string>()
  const cats: string[] = []
  for (const r of resources) {
    if (!seen.has(r.category)) {
      seen.add(r.category)
      cats.push(r.category)
    }
  }
  return cats
}

export default function Downloads() {
  const categories = getCategories(resources)
  const isEmpty = resources.length === 0

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label text-sm mb-4 uppercase tracking-widest" style={{ color: 'var(--ed-text-faint)' }}>Free Resources</p>
        <h1 className="text-5xl leading-tight mb-6" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          One-pagers.<br />Take them.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Cheat sheets, quick references, and guides on AI tools and workflows.
          Free to download, no email required.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-24">

        {isEmpty ? (
          <div className="rounded-2xl p-16 text-center" style={{ background: 'var(--ed-card-warm)' }}>
            <div className="flex justify-center mb-4">
              <FileIcon />
            </div>
            <p className="text-sm" style={{ color: 'var(--ed-text-muted)' }}>Resources coming soon.</p>
            <p className="text-xs mt-2" style={{ color: 'var(--ed-text-light)' }}>Check back shortly.</p>
          </div>
        ) : (
          <div className="space-y-14">
            {categories.map((cat) => {
              const catResources = resources.filter((r) => r.category === cat)
              return (
                <div key={cat}>
                  <p className="text-xs uppercase tracking-widest mb-5" style={{ color: 'var(--ed-text-faint)' }}>{cat}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {catResources.map((resource) => (
                      <div
                        key={resource.filename}
                        className="group rounded-xl p-6 transition flex flex-col gap-4 ed-list-card"
                        style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
                      >
                        <div className="flex-1">
                          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--ed-text)' }}>
                            {resource.title}
                          </h2>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
                            {resource.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--ed-border)' }}>
                          {resource.fileSize ? (
                            <span className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{resource.fileSize} · PDF</span>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--ed-text-light)' }}>PDF</span>
                          )}
                          <a
                            href={`/api/pdf/${resource.filename}`}
                            download={resource.filename}
                            className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full transition"
                            style={{ background: 'var(--ed-cta)', color: '#FDFCFA' }}
                          >
                            <DownloadIcon />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <footer style={{ borderTop: '1px solid var(--ed-border)' }}>
        <div className="max-w-3xl mx-auto px-8 py-12 flex flex-col sm:flex-row justify-between gap-8">
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--ed-text-dark)' }}>Anshul Gupta</p>
            <p className="text-sm" style={{ color: 'var(--ed-text-faint)' }}>GTM Strategy at Google · Kellogg MBA</p>
            <p className="text-xs mt-4" style={{ color: 'var(--ed-text-light)' }}>© {new Date().getFullYear()} · anshul.ai</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ed-text-light)' }}>Pages</p>
              <a href="/about" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>About</a>
              <a href="/work" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Work</a>
              <a href="/projects" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Projects</a>
              <a href="/learn" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>AI School</a>
              <a href="/analysis" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Analysis</a>
              <a href="/writing" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Writing</a>
              <a href="/downloads" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Downloads</a>
              <a href="/contact" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Contact</a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ed-text-light)' }}>Connect</p>
              <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" rel="noopener noreferrer" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>LinkedIn</a>
              <a href="https://github.com/nocoderdecoder" target="_blank" rel="noopener noreferrer" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/downloads/page.tsx
git commit -m "feat: convert downloads page to editorial theme"
```

---

### Task 13: Convert learn/[slug] article page to editorial theme

**Files:**
- Modify: `app/learn/[slug]/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import { Nav } from '../../components/Nav'
import { ReadingProgress } from '../../components/ReadingProgress'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import type { Metadata } from 'next'
import { editorialComponents } from '../../components/PortableTextComponents'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { slug } = await params
  const article = await client.fetch(
    `*[_type == "article" && slug.current == $slug][0] { title, excerpt }`,
    { slug }
  ).catch(() => null)

  if (!article) return { title: 'Article Not Found' }

  return {
    title: article.title,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      url: `https://anshul.ai/learn/${slug}`,
      type: 'article',
    },
    twitter: {
      title: article.title,
      description: article.excerpt || undefined,
    },
  }
}

const MODULE_LABELS: Record<string, string> = {
  foundations:  'Foundations',
  tools:        'The Tools Layer',
  organization: 'AI in Your Organization',
  'hands-on':   'Hands-On',
}

export default async function Article({ params }: any) {
  const { slug } = await params

  let article: any = null
  try {
    article = await client.fetch(
      `*[_type == "article" && slug.current == $slug][0] {
        title, excerpt, readTime, publishedAt, body, module,
        "prev": *[_type == "article" && module == ^.module && _createdAt < ^._createdAt] | order(_createdAt desc)[0] {
          title, "slug": slug.current
        },
        "next": *[_type == "article" && module == ^.module && _createdAt > ^._createdAt] | order(_createdAt asc)[0] {
          title, "slug": slug.current
        }
      }`,
      { slug }
    )
  } catch (e) {
    article = null
  }

  if (!article) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
        <p style={{color: 'var(--ed-text-muted)'}}>Article not found.</p>
      </main>
    )
  }

  const moduleLabel = MODULE_LABELS[article.module] ?? 'Learn'

  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <ReadingProgress variant="light" />
      <Nav variant="light" />

      <article className="max-w-2xl mx-auto px-8 py-16">

        <nav className="flex items-center gap-2 text-xs mb-10" style={{color: 'var(--ed-text-faint)'}}>
          <a href="/learn" style={{color: 'inherit'}}>Learn</a>
          <span>›</span>
          <a href={`/learn#${article.module}`} style={{color: 'inherit'}}>{moduleLabel}</a>
          <span>›</span>
          <span className="truncate max-w-[200px]" style={{color: 'var(--ed-text-muted)'}}>{article.title}</span>
        </nav>

        <h1 className="text-4xl mb-4 leading-tight" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>{article.title}</h1>
        {article.readTime && (
          <p className="text-sm mb-12" style={{color: 'var(--ed-text-light)'}}>{article.readTime} min read</p>
        )}

        <div>
          {article.body && <PortableText value={article.body} components={editorialComponents} />}
        </div>

        {(article.prev || article.next) && (
          <div className="mt-20 pt-10 grid grid-cols-2 gap-4" style={{borderTop: '1px solid var(--ed-border)'}}>
            <div>
              {article.prev && (
                <a
                  href={`/learn/${article.prev.slug}`}
                  className="ed-list-card group block p-5 h-full"
                  style={{background: 'var(--ed-card-warm)', borderRadius: '14px'}}
                >
                  <p className="text-xs mb-2 flex items-center gap-1" style={{color: 'var(--ed-text-light)'}}>
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Previous
                  </p>
                  <p className="text-sm font-medium leading-snug" style={{color: 'var(--ed-text-secondary)'}}>
                    {article.prev.title}
                  </p>
                </a>
              )}
            </div>
            <div>
              {article.next && (
                <a
                  href={`/learn/${article.next.slug}`}
                  className="ed-list-card group block p-5 text-right h-full"
                  style={{background: 'var(--ed-card-warm)', borderRadius: '14px'}}
                >
                  <p className="text-xs mb-2 flex items-center gap-1 justify-end" style={{color: 'var(--ed-text-light)'}}>
                    Next
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </p>
                  <p className="text-sm font-medium leading-snug" style={{color: 'var(--ed-text-secondary)'}}>
                    {article.next.title}
                  </p>
                </a>
              )}
            </div>
          </div>
        )}
      </article>

      <footer className="px-8 py-8 text-center text-sm" style={{borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)'}}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add "app/learn/[slug]/page.tsx"
git commit -m "feat: convert learn article page to editorial theme"
```

---

### Task 14: Convert deals-events/[slug] article page to editorial theme

**Files:**
- Modify: `app/deals-events/[slug]/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../../components/Nav'
import { ReadingProgress } from '../../components/ReadingProgress'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import { editorialComponents } from '../../components/PortableTextComponents'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { slug } = await params
  const article = await client.fetch(
    `*[_type == "deal-event" && slug.current == $slug][0] { title, excerpt }`,
    { slug }
  ).catch(() => null)

  if (!article) return { title: 'Article Not Found' }

  return {
    title: article.title,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      url: `https://anshul.ai/deals-events/${slug}`,
      type: 'article',
    },
    twitter: {
      title: article.title,
      description: article.excerpt || undefined,
    },
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function TypeBadge({ type }: { type: 'event' | 'deal' }) {
  if (type === 'event') {
    return (
      <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
        style={{ background: '#F3E8FF', color: '#7C3AED' }}>
        Event
      </span>
    )
  }
  return (
    <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
      style={{ background: '#FEF3E2', color: '#B45309' }}>
      Deal
    </span>
  )
}

export default async function DealEventArticle({ params }: any) {
  const { slug } = await params

  let article: any = null
  try {
    article = await client.fetch(
      `*[_type == "deal-event" && slug.current == $slug][0] {
        title, excerpt, publishedAt, body, type, eventName, readTime,
        "prev": *[_type == "deal-event" && publishedAt < ^.publishedAt] | order(publishedAt desc)[0] { title, "slug": slug.current },
        "next": *[_type == "deal-event" && publishedAt > ^.publishedAt] | order(publishedAt asc)[0]  { title, "slug": slug.current }
      }`,
      { slug }
    )
  } catch {
    article = null
  }

  if (!article) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
        <p style={{color: 'var(--ed-text-muted)'}}>Article not found.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <ReadingProgress variant="light" />
      <Nav variant="light" />

      <article className="max-w-2xl mx-auto px-8 py-16">

        <nav className="flex items-center gap-2 text-xs mb-10" style={{color: 'var(--ed-text-faint)'}}>
          <a href="/deals-events" style={{color: 'inherit'}}>Deals & Events</a>
          <span>›</span>
          <span className="truncate max-w-[240px]" style={{color: 'var(--ed-text-muted)'}}>{article.title}</span>
        </nav>

        <div className="flex items-center gap-3 mb-6">
          <TypeBadge type={article.type} />
          {article.type === 'event' && article.eventName && (
            <span className="text-xs" style={{color: 'var(--ed-text-light)'}}>{article.eventName}</span>
          )}
          {article.publishedAt && (
            <span className="text-xs" style={{color: 'var(--ed-text-faint)'}}>{formatDate(article.publishedAt)}</span>
          )}
        </div>

        <h1 className="text-4xl mb-10 leading-tight" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>{article.title}</h1>

        <div>
          {article.body && <PortableText value={article.body} components={editorialComponents} />}
        </div>

        {(article.prev || article.next) && (
          <div className="mt-20 pt-10 grid grid-cols-2 gap-4" style={{borderTop: '1px solid var(--ed-border)'}}>
            <div>
              {article.prev && (
                <a href={`/deals-events/${article.prev.slug}`} className="ed-list-card group block p-5 h-full" style={{background: 'var(--ed-card-warm)', borderRadius: '14px'}}>
                  <p className="text-xs mb-2 flex items-center gap-1" style={{color: 'var(--ed-text-light)'}}>
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Previous
                  </p>
                  <p className="text-sm font-medium leading-snug" style={{color: 'var(--ed-text-secondary)'}}>{article.prev.title}</p>
                </a>
              )}
            </div>
            <div>
              {article.next && (
                <a href={`/deals-events/${article.next.slug}`} className="ed-list-card group block p-5 text-right h-full" style={{background: 'var(--ed-card-warm)', borderRadius: '14px'}}>
                  <p className="text-xs mb-2 flex items-center gap-1 justify-end" style={{color: 'var(--ed-text-light)'}}>
                    Next
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </p>
                  <p className="text-sm font-medium leading-snug" style={{color: 'var(--ed-text-secondary)'}}>{article.next.title}</p>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 pt-10" style={{borderTop: '1px solid var(--ed-border)'}}>
          <a href="/deals-events" className="text-sm" style={{color: 'var(--ed-text-faint)'}}>← All deals & events</a>
        </div>
      </article>

      <footer className="px-8 py-8 text-center text-sm" style={{borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)'}}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add "app/deals-events/[slug]/page.tsx"
git commit -m "feat: convert deals-events article page to editorial theme"
```

---

### Task 15: Convert trending/[slug] article page to editorial theme

**Files:**
- Modify: `app/trending/[slug]/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../../components/Nav'
import { ReadingProgress } from '../../components/ReadingProgress'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import { editorialComponents } from '../../components/PortableTextComponents'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { slug } = await params
  const article = await client.fetch(
    `*[_type == "trending" && slug.current == $slug][0] { title, excerpt }`,
    { slug }
  ).catch(() => null)

  if (!article) return { title: 'Article Not Found' }

  return {
    title: article.title,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      url: `https://anshul.ai/trending/${slug}`,
      type: 'article',
    },
    twitter: {
      title: article.title,
      description: article.excerpt || undefined,
    },
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function TrendingArticle({ params }: any) {
  const { slug } = await params

  let article: any = null
  try {
    article = await client.fetch(
      `*[_type == "trending" && slug.current == $slug][0] {
        title, excerpt, publishedAt, body,
        "prev": *[_type == "trending" && _createdAt < ^._createdAt] | order(_createdAt desc)[0] { title, "slug": slug.current },
        "next": *[_type == "trending" && _createdAt > ^._createdAt] | order(_createdAt asc)[0]  { title, "slug": slug.current }
      }`,
      { slug }
    )
  } catch {
    article = null
  }

  if (!article) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
        <p style={{color: 'var(--ed-text-muted)'}}>Article not found.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <ReadingProgress variant="light" />
      <Nav variant="light" />

      <article className="max-w-2xl mx-auto px-8 py-16">

        <nav className="flex items-center gap-2 text-xs mb-10" style={{color: 'var(--ed-text-faint)'}}>
          <a href="/trending" style={{color: 'inherit'}}>Trending</a>
          <span>›</span>
          <span className="truncate max-w-[240px]" style={{color: 'var(--ed-text-muted)'}}>{article.title}</span>
        </nav>

        <div className="flex items-center gap-3 mb-6">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
            style={{ background: '#E6F4EA', color: '#2E7D4F' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{background: 'var(--ed-trending-dot)'}} />
            Trending
          </span>
          {article.publishedAt && (
            <span className="text-xs" style={{color: 'var(--ed-text-faint)'}}>{formatDate(article.publishedAt)}</span>
          )}
        </div>

        <h1 className="text-4xl mb-10 leading-tight" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>{article.title}</h1>

        <div>
          {article.body && <PortableText value={article.body} components={editorialComponents} />}
        </div>

        {(article.prev || article.next) && (
          <div className="mt-20 pt-10 grid grid-cols-2 gap-4" style={{borderTop: '1px solid var(--ed-border)'}}>
            <div>
              {article.prev && (
                <a href={`/trending/${article.prev.slug}`} className="ed-list-card group block p-5 h-full" style={{background: 'var(--ed-card-warm)', borderRadius: '14px'}}>
                  <p className="text-xs mb-2 flex items-center gap-1" style={{color: 'var(--ed-text-light)'}}>
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Previous
                  </p>
                  <p className="text-sm font-medium leading-snug" style={{color: 'var(--ed-text-secondary)'}}>{article.prev.title}</p>
                </a>
              )}
            </div>
            <div>
              {article.next && (
                <a href={`/trending/${article.next.slug}`} className="ed-list-card group block p-5 text-right h-full" style={{background: 'var(--ed-card-warm)', borderRadius: '14px'}}>
                  <p className="text-xs mb-2 flex items-center gap-1 justify-end" style={{color: 'var(--ed-text-light)'}}>
                    Next
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </p>
                  <p className="text-sm font-medium leading-snug" style={{color: 'var(--ed-text-secondary)'}}>{article.next.title}</p>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 pt-10" style={{borderTop: '1px solid var(--ed-border)'}}>
          <a href="/trending" className="text-sm" style={{color: 'var(--ed-text-faint)'}}>← All trending articles</a>
        </div>
      </article>

      <footer className="px-8 py-8 text-center text-sm" style={{borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)'}}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add "app/trending/[slug]/page.tsx"
git commit -m "feat: convert trending article page to editorial theme"
```

---

### Task 16: Convert writing/[slug] post page to editorial theme

**Files:**
- Modify: `app/writing/[slug]/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Nav } from '../../components/Nav'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import { editorialComponents } from '../../components/PortableTextComponents'

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

export async function generateStaticParams() {
  try {
    const posts = await client.fetch(
      `*[_type == "post" && status == "published" && defined(slug.current)] { "slug": slug.current }`
    )
    return (posts ?? []).map((p: { slug: string }) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const post = await client.fetch(
      `*[_type == "post" && slug.current == $slug][0] { title, excerpt }`,
      { slug }
    )
    if (!post) return { title: 'Post Not Found' }
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: {
        title: `${post.title} — Anshul Gupta`,
        description: post.excerpt,
        url: `https://anshul.ai/writing/${slug}`,
      },
    }
  } catch {
    return { title: 'Post' }
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function WritingPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let post: any = null
  try {
    post = await client.fetch(
      `*[_type == "post" && slug.current == $slug && status == "published"][0] {
        title, excerpt, publishedAt, readTime, body
      }`,
      { slug }
    )
  } catch {}

  if (!post) notFound()

  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />

      <article className="max-w-3xl mx-auto px-8 pt-28 pb-32">
        <a href="/writing" className="section-label mb-8 inline-block" style={{color: 'var(--ed-text-faint)'}}>
          ← Writing
        </a>

        <header className="mt-4 mb-12">
          <h1 className="heading-page mb-6" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>{post.title}</h1>
          <div className="flex items-center gap-4">
            {post.publishedAt && (
              <span className="text-sm" style={{color: 'var(--ed-text-light)'}}>{formatDate(post.publishedAt)}</span>
            )}
            {post.readTime && (
              <span className="text-sm" style={{color: 'var(--ed-text-light)'}}>{post.readTime} min read</span>
            )}
          </div>
          {post.excerpt && (
            <p className="text-xl leading-relaxed mt-6 pl-6" style={{color: 'var(--ed-text-muted)', borderLeft: '2px solid var(--ed-border)'}}>
              {post.excerpt}
            </p>
          )}
        </header>

        {post.body && (
          <div className="prose prose-lg max-w-none">
            <PortableText value={post.body} components={editorialComponents} />
          </div>
        )}
      </article>

      <footer className="px-8 py-8 text-center text-sm" style={{borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)'}}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add "app/writing/[slug]/page.tsx"
git commit -m "feat: convert writing post page to editorial theme"
```

---

### Task 17: Convert ai-learning-compass page to editorial theme

**Files:**
- Modify: `app/tools/ai-learning-compass/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../../components/Nav'
import { CompassApp } from './CompassApp'

export const metadata: Metadata = {
  title: 'AI Learning Compass',
  description: 'A five-question adaptive voice assessment that creates a specific 30-day AI learning prescription from your goals, evidence, domain, and constraints.',
  openGraph: {
    title: 'AI Learning Compass — Get your specific 30-day AI path',
    description: 'Answer five adaptive questions by voice or text. Get exact capabilities, tasks, deliverables, and proof to build next.',
    url: 'https://anshul.ai/tools/ai-learning-compass',
  },
}

export default function AILearningCompassPage() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />
      <CompassApp />
      <footer className="border-t px-8 py-8 text-center text-sm" style={{borderColor: 'var(--ed-border)', color: 'var(--ed-text-faint)'}}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

Note: this page delegates all UI to `./CompassApp`, a separate client component not covered by this task. If `CompassApp.tsx` renders its own dark-themed markup (`bg-black`, `text-white`), it will look dark against this new light page background — read that file and add a follow-up conversion task for it if so, before marking this task complete.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/tools/ai-learning-compass/page.tsx
git commit -m "feat: convert ai-learning-compass tool page to editorial theme"
```

---

### Task 18: Convert ai-readiness page to editorial theme

**Files:**
- Modify: `app/tools/ai-readiness/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/tools/ai-readiness/page.tsx
git commit -m "feat: convert ai-readiness tool page to editorial theme"
```

---

### Task 19: Convert ai-tool-recommender page to editorial theme

**Files:**
- Modify: `app/tools/ai-tool-recommender/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/tools/ai-tool-recommender/page.tsx
git commit -m "feat: convert ai-tool-recommender tool page to editorial theme"
```

---

### Task 20: Convert competitive-analysis page to editorial theme

**Files:**
- Modify: `app/tools/competitive-analysis/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/tools/competitive-analysis/page.tsx
git commit -m "feat: convert competitive-analysis tool page to editorial theme"
```

---

### Task 21: Convert gtm-playbook page to editorial theme

**Files:**
- Modify: `app/tools/gtm-playbook/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/tools/gtm-playbook/page.tsx
git commit -m "feat: convert gtm-playbook tool page to editorial theme"
```

---

### Task 22: Convert meeting-brief page to editorial theme

**Files:**
- Modify: `app/tools/meeting-brief/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
'use client'

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { ToolShell } from '../../components/ToolShell'

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)', color: 'var(--ed-text)' }
const inputClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm"
const selectClass = "rounded-lg px-4 py-3 focus:outline-none transition w-full text-sm appearance-none cursor-pointer"
const labelClass = "block text-xs uppercase tracking-widest mb-2"

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
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />
      <ToolShell
        name="Meeting Brief Generator"
        description="Enter your meeting details. Get a battle-ready brief with talking points, anticipated objections, and your ideal opening line."
        estimatedTime="Results in ~15 seconds"
        variant="light"
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
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Meeting type</label>
                <select className={selectClass} style={inputStyle} value={form.meetingType} onChange={set('meetingType')}>
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
                <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Duration</label>
                <select className={selectClass} style={inputStyle} value={form.duration} onChange={set('duration')}>
                  <option>30 minutes</option>
                  <option>45 minutes</option>
                  <option>60 minutes</option>
                  <option>90 minutes</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Meeting objective *</label>
              <input
                required
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. Win the renewal, Align on Q3 budget"
                value={form.objective}
                onChange={set('objective')}
              />
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Who's attending</label>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. VP Sales, 2 engineers, external client"
                value={form.attendees}
                onChange={set('attendees')}
              />
            </div>

            <div>
              <label className={labelClass} style={{color: 'var(--ed-text-faint)'}}>Background / context</label>
              <textarea
                rows={3}
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. 2-year customer, churn risk, last met in March"
                value={form.context}
                onChange={set('context')}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || isComplete}
              className="px-6 py-3 rounded-full font-medium transition btn-press disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{backgroundColor: 'var(--ed-cta)', color: 'var(--ed-bg)'}}
            >
              {isLoading ? 'Generating…' : 'Generate brief →'}
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/tools/meeting-brief/page.tsx
git commit -m "feat: convert meeting-brief tool page to editorial theme"
```

---

### Task 23: Convert roi-calculator page to editorial theme

**Files:**
- Modify: `app/tools/roi-calculator/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/tools/roi-calculator/page.tsx
git commit -m "feat: convert roi-calculator tool page to editorial theme"
```

---

### Task 24: Convert about page to editorial theme

**Files:**
- Modify: `app/about/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { ScrollSection } from '../components/ScrollSection'

export const metadata: Metadata = {
  title: 'About',
  description: 'Anshul Gupta — AI strategy leader building at the intersection of business and AI. GTM at Google, Kellogg MBA, building AI tools and education for business professionals.',
  openGraph: {
    title: 'About — Anshul Gupta',
    description: 'AI strategy leader building at the intersection of business and AI. GTM at Google, Kellogg MBA.',
    url: 'https://anshul.ai/about',
  },
}

const timeline = [
  {
    period: "2013–2018",
    org: "Hindustan Unilever / GSK",
    role: "Brand Manager & GTM Lead",
    detail: "Built commercial operations across rural and urban India. Led national go-to-market integration for Hindustan Unilever's acquisition of GSK Consumer Healthcare — merging sales teams, order management systems, analytics tools, and incentive structures across thousands of distributors during the pandemic.",
    tags: ["GTM", "Change Management", "Digital Transformation"],
  },
  {
    period: "2019–2020",
    org: "Kellogg School of Management",
    role: "MBA — Northwestern University",
    detail: "Strategy, leadership, and management from one of the world's leading business schools. Consulting engagement with Uber on go-to-market strategy for their shuttle service launch.",
    tags: ["Strategy", "MBA", "Consulting"],
  },
  {
    period: "2021–Present",
    org: "Google",
    role: "GTM Strategy & Business Intelligence",
    detail: "Go-to-market strategy and business intelligence for one of the world's most advanced AI organisations. Built AI-powered dashboards adopted by 300+ professionals for competitive intelligence and market analysis. Working at the frontier of how AI reshapes commercial strategy.",
    tags: ["AI", "GTM", "Business Intelligence"],
  },
  {
    period: "2024–Present",
    org: "anshul.ai",
    role: "Builder & Educator",
    detail: "Building an AI education platform and toolset from scratch — no engineering team, no funding, no prior coding experience. 94 articles automated, 6 tools shipped, thousands of learners. The platform is both a proof of concept and a live demonstration of what's possible when business professionals build with AI.",
    tags: ["Building", "Education", "AI Tools"],
  },
]

export default function About() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-16">
        <div className="flex flex-col sm:flex-row gap-10 items-start">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)' }}
            aria-label="Headshot"
          >
            <span style={{ color: 'var(--ed-text-light)' }} className="text-2xl font-bold">AG</span>
          </div>

          <div className="flex-1">
            <p className="section-label mb-3" style={{ color: 'var(--ed-text-faint)' }}>About</p>
            <h1 className="heading-page mb-4" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>
              Anshul Gupta
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
              GTM Strategy at Google · Kellogg MBA · Builder
            </p>
          </div>
        </div>
      </section>

      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-16">
          <div className="space-y-5">
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ed-text)' }}>
              I am working on democratizing AI for business and GTM professionals. The gap I keep seeing: most people in commercial roles know AI exists but do not know how to use it in their actual work — how to evaluate it, how to build with it, or how to lead a team through adopting it.
            </p>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>
              My answer is to build tools and education in public, share the process openly, and prove that meaningful AI products can be built by business-minded people without an engineering background.
            </p>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>
              This site is both the work and the evidence — a live platform built and operated by one person using AI tools, reaching learners and practitioners who want to actually use AI, not just read about it.
            </p>
          </div>
        </section>
      </ScrollSection>

      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-16">
          <p className="section-label mb-10" style={{ color: 'var(--ed-text-faint)' }}>Career</p>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <div
                key={item.org}
                className="py-8"
                style={i < timeline.length - 1 ? { borderBottom: '1px solid var(--ed-border)' } : undefined}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 sm:justify-between mb-3">
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{item.org}</span>
                    <span className="text-sm ml-3" style={{ color: 'var(--ed-text-muted)' }}>{item.role}</span>
                  </div>
                  <span className="text-xs sm:ml-4 shrink-0" style={{ color: 'var(--ed-text-light)' }}>{item.period}</span>
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--ed-text-muted)' }}>{item.detail}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'var(--ed-card-warm)', color: 'var(--ed-text-faint)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollSection>

      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-32">
          <p className="section-label mb-8" style={{ color: 'var(--ed-text-faint)' }}>Explore</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { href: '/work',      label: 'Professional work',      desc: 'AI dashboards, GTM transformation, strategic impact at scale' },
              { href: '/projects',  label: 'What I have built',      desc: 'Products, tools, and automations shipped without an engineering team' },
              { href: '/learn',     label: 'The AI School',          desc: '94 articles, 5 modules — practical AI for business professionals' },
              { href: '/writing',   label: 'Writing',                desc: 'Honest takes on building with AI and what is actually happening in the field' },
              { href: '/analysis',  label: 'Daily AI analysis',      desc: 'What is happening in AI, every day, analysed for business context' },
              { href: '/downloads', label: 'Downloadable resources', desc: 'Cheatsheets, frameworks, and guides for AI practitioners' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="ed-list-card rounded-xl p-6 transition group"
                style={{ background: 'var(--ed-card-warm)', borderRadius: 14 }}
              >
                <h2 className="font-semibold text-sm mb-1.5" style={{ color: 'var(--ed-text-dark)' }}>{link.label} →</h2>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{link.desc}</p>
              </a>
            ))}
          </div>
        </section>
      </ScrollSection>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/about/page.tsx
git commit -m "feat: convert about page to editorial theme"
```

---

### Task 25: Convert work page to editorial theme

**Files:**
- Modify: `app/work/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Professional accomplishments in AI, GTM strategy, and digital transformation at Google, Unilever, and beyond.',
  openGraph: {
    title: 'Work — Professional Impact',
    description: 'AI strategy, digital transformation, and GTM leadership across Google, Unilever, and Kellogg.',
    url: 'https://anshul.ai/work',
  },
}

const accomplishments = [
  {
    org: "Google",
    title: "AI-Powered Competitive Intelligence Dashboard",
    description: "Led development of an AI dashboard enabling global teams to analyse consumer ratings and reviews at scale, driving data-informed business decisions across markets.",
    tags: ["AI", "GTM Strategy", "Business Intelligence"],
  },
  {
    org: "Google",
    title: "AI Analytics Dashboard — 300+ Users",
    description: "Built an AI-powered analytics dashboard adopted by 300+ professionals year-to-date, transforming how teams access and act on business intelligence.",
    tags: ["AI", "Product Development", "Adoption"],
  },
  {
    org: "Hindustan Unilever",
    title: "National GTM Transformation — GSK Acquisition",
    description: "Led national-scale change management for Hindustan Unilever's acquisition of GSK Consumer Healthcare. Unified sales teams, distributors, order processing tools, and analytics systems. Designed new GTM models during the pandemic and built incentive structures for the integrated sales force.",
    tags: ["Change Management", "GTM", "Digital Transformation"],
  },
  {
    org: "Kellogg / Uber",
    title: "Shuttle Service Launch Strategy",
    description: "Developed go-to-market strategy for Uber's shuttle service launch during a 3-month consulting engagement through Kellogg School of Management.",
    tags: ["GTM Strategy", "Consulting", "Product Launch"],
  },
]

export default function Work() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Work</p>
        <h1 className="heading-page mb-6" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>
          Professional<br />impact.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          AI strategy, digital transformation, and GTM leadership — applying technology to business problems at national and global scale.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32">
        <div className="space-y-6">
          {accomplishments.map((item, i) => (
            <div
              key={i}
              className="ed-list-card rounded-xl p-8 transition"
              style={{ background: 'var(--ed-card-warm)', borderRadius: 14 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--ed-text-muted)' }}>{item.org}</span>
              </div>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--ed-text-dark)' }}>{item.title}</h2>
              <p className="leading-relaxed mb-4" style={{ color: 'var(--ed-text-secondary)' }}>{item.description}</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--ed-card-warm)', color: 'var(--ed-text-faint)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/work/page.tsx
git commit -m "feat: convert work page to editorial theme"
```

---

### Task 26: Convert lab page to editorial theme

**Files:**
- Modify: `app/lab/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'

export const metadata: Metadata = {
  title: 'Lab',
  description: 'Real AI products and automations built without a traditional engineering background — from prompt scoring tools to competitive intelligence scrapers.',
  openGraph: {
    title: 'Lab — AI Products I Have Built',
    description: 'Real AI products and automations built without a traditional engineering background.',
    url: 'https://anshul.ai/lab',
  },
}

const projects = [
  {
    name: "PromptGrade",
    tagline: "AI prompt scoring and rewriting",
    image: "/projects/promptgrade.png",
    url: "https://ratemyprompt.pro",
    status: "Live",
  },
  {
    name: "Speaking Speed Tester",
    tagline: "Real-time words-per-minute measurement",
    image: "",
    url: "/tools/speaking-speed",
    status: "Live",
  },
  {
    name: "AI News → LinkedIn Pipeline",
    tagline: "Automated content from signal to draft",
    image: "",
    url: "",
    status: "Running",
  },
  {
    name: "Competitive Intelligence Scraper",
    tagline: "Competitor tracking for strategy teams",
    image: "",
    url: "",
    status: "Internal",
  },
  {
    name: "HR Assistant Chatbot",
    tagline: "RAG-based answers from internal docs",
    image: "",
    url: "",
    status: "Demo",
  },
  {
    name: "CV Tailoring System",
    tagline: "Job-description-aware resume rewriting",
    image: "",
    url: "",
    status: "Built",
  },
]

const statusColor: Record<string, string> = {
  Live:     "bg-emerald-500",
  Running:  "bg-blue-500",
  Internal: "bg-amber-500",
  Demo:     "bg-purple-500",
  Built:    "bg-[var(--ed-text-light)]",
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function ProjectCard({ project }: { project: typeof projects[number] }) {
  const isExternal = project.url.startsWith('http')

  const inner = (
    <>
      <div className="relative w-full aspect-video overflow-hidden" style={{ background: 'var(--ed-card-warm)' }}>
        {project.image ? (
          <img
            src={project.image}
            alt={project.name}
            className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(0,0,0,0.04) 24px),' +
                'repeating-linear-gradient(90deg,transparent,transparent 23px,rgba(0,0,0,0.04) 24px)',
            }}
          >
            <span className="text-3xl font-bold tracking-widest select-none" style={{ color: 'var(--ed-text-light)' }}>
              {initials(project.name)}
            </span>
          </div>
        )}

        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor[project.status] ?? 'bg-white/20'}`} />
          <span className="text-[10px] text-white/50">{project.status}</span>
        </div>
      </div>

      <div className="p-4">
        <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--ed-text-dark)' }}>{project.name}</h2>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{project.tagline}</p>
      </div>
    </>
  )

  const sharedStyle = { background: 'var(--ed-card-warm)', borderRadius: 14 }
  const sharedClass = "ed-list-card block overflow-hidden transition group"

  if (project.url) {
    return (
      <a
        href={project.url}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className={sharedClass}
        style={sharedStyle}
      >
        {inner}
      </a>
    )
  }

  return <div className={sharedClass} style={sharedStyle}>{inner}</div>
}

export default function Lab() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="text-sm mb-4 uppercase tracking-widest" style={{ color: 'var(--ed-text-faint)' }}>Lab</p>
        <h1 className="text-5xl leading-tight mb-6" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>Things I have<br />built with AI.</h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Real products and automations. Some are live, some run internally, all built without a traditional engineering background.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/lab/page.tsx
git commit -m "feat: convert lab page to editorial theme"
```

---

### Task 27: Convert tools index page to editorial theme

**Files:**
- Modify: `app/tools/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { ScrollSection } from '../components/ScrollSection'

export const metadata: Metadata = {
  title: 'AI Tools for Business Professionals',
  description: 'Practical AI tools built on Claude — GTM playbooks, readiness assessments, ROI calculators. Free to use.',
  openGraph: {
    title: 'AI Tools — anshul.ai',
    description: 'Practical AI tools built on Claude — GTM playbooks, readiness assessments, ROI calculators.',
    url: 'https://anshul.ai/tools',
  },
}

const TOOLS = [
  {
    slug: 'ai-learning-compass',
    name: 'AI Learning Compass',
    tagline: 'Answer five questions by voice or text. Get a personal 30-day AI learning roadmap.',
    status: 'Live' as const,
    icon: '🧭',
  },
  {
    slug: 'speaking-speed',
    name: 'Speaking Speed Tester',
    tagline: 'Measure your words per minute in real time. Know if you speak too fast or too slow.',
    status: 'Live' as const,
    icon: '🎙️',
  },
  {
    slug: 'gtm-playbook',
    name: 'GTM Playbook Generator',
    tagline: 'Describe your product and target market. Get a tailored go-to-market strategy in 60 seconds.',
    status: 'Live' as const,
    icon: '🚀',
  },
  {
    slug: 'ai-readiness',
    name: 'AI Readiness Assessment',
    tagline: 'Score your organisation\'s AI readiness and get a prioritised adoption roadmap.',
    status: 'Live' as const,
    icon: '📊',
  },
  {
    slug: 'roi-calculator',
    name: 'AI ROI Calculator',
    tagline: 'Input your team size and tasks. See estimated time and cost savings from AI adoption.',
    status: 'Live' as const,
    icon: '💰',
  },
  {
    slug: 'ai-tool-recommender',
    name: 'AI Tool Recommender',
    tagline: 'Tell me your use case, budget, and skill level. Get a curated tool shortlist.',
    status: 'Live' as const,
    icon: '🔍',
  },
  {
    slug: 'meeting-brief',
    name: 'Meeting Brief Generator',
    tagline: 'Walk into any meeting with a sharp, AI-generated prep brief in seconds.',
    status: 'Live' as const,
    icon: '📝',
  },
  {
    slug: 'competitive-analysis',
    name: 'Competitive Analysis Generator',
    tagline: 'Enter your product and a competitor. Get a sharp competitive brief with battle card talking points.',
    status: 'Live' as const,
    icon: '⚔️',
  },
]

function ToolCard({ tool }: { tool: typeof TOOLS[0] }) {
  const isLive = tool.status === 'Live'
  return (
    <div
      className={`rounded-xl p-6 transition ${isLive ? 'ed-list-card' : 'opacity-50'}`}
      style={{ background: 'var(--ed-card-warm)', borderRadius: 14 }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl">{tool.icon}</span>
        <span
          className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
          style={
            isLive
              ? { backgroundColor: '#E6F4EA', color: '#2E7D4F' }
              : { backgroundColor: 'var(--ed-card-warm)', color: 'var(--ed-text-light)' }
          }
        >
          {tool.status === 'Live' ? 'Live' : 'Coming Soon'}
        </span>
      </div>
      <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--ed-text-dark)' }}>{tool.name}</h2>
      <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--ed-text-muted)' }}>{tool.tagline}</p>
      {isLive && (
        <a
          href={`/tools/${tool.slug}`}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full transition btn-press"
          style={{ background: 'var(--ed-card-warm)', color: 'var(--ed-text-secondary)', border: '1px solid var(--ed-border)' }}
        >
          Try it free →
        </a>
      )}
    </div>
  )
}

export default function Tools() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-16">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Tools</p>
        <h1 className="heading-page mb-6" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>AI tools for business professionals.</h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Practical tools built on Claude. Free to use. No account required.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <ScrollSection key={tool.slug}>
              <ToolCard tool={tool} />
            </ScrollSection>
          ))}
        </div>
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/tools/page.tsx
git commit -m "feat: convert tools index page to editorial theme"
```

---

### Task 28: Convert contact page to editorial theme

**Files:**
- Modify: `app/contact/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { ContactForm } from '../components/ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch for speaking, media, collaboration, or other inquiries.',
  openGraph: {
    title: 'Contact — Anshul Gupta',
    description: 'Get in touch for speaking, media, collaboration, or other inquiries.',
    url: 'https://anshul.ai/contact',
  },
}

export default function Contact() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />

      <section className="max-w-xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Contact</p>
        <h1 className="heading-page mb-6" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>
          Get in touch.
        </h1>
        <p className="text-xl leading-relaxed mb-12" style={{ color: 'var(--ed-text-muted)' }}>
          Open to speaking engagements, media interviews, collaborations, and advisory opportunities in AI and GTM strategy.
        </p>

        <ContactForm variant="light" />
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/contact/page.tsx
git commit -m "feat: convert contact page to editorial theme"
```

---

### Task 29: Full-site visual verification

**Files:** None (read-only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Check every converted page renders the editorial theme**

Visit each: `/`, `/about`, `/work`, `/lab`, `/projects`, `/learn`, `/trending`, `/writing`, `/analysis`, `/deals-events`, `/downloads`, `/tools`, `/contact`, plus one detail page per article type (`/learn/<any-slug>`, `/trending/<any-slug>`, `/deals-events/<any-slug>`, `/writing/<any-slug>`), plus all 7 `/tools/<slug>` pages.

Check on each: off-white background, serif headings, no leftover dark-theme classes (no black backgrounds, no `text-white`), Nav renders in light variant, cards have the warm/colored backgrounds and hover lift.

- [ ] **Step 3: Check `tools/speaking-speed` and `tools/ai-learning-compass`'s `CompassApp`**

These were flagged as out-of-scope or uncertain in Tasks 17 and the file map. Confirm `speaking-speed` is intentionally left as its own standalone design (per spec) and check whether `CompassApp` needs a follow-up conversion task — if it renders dark markup, write and execute that as an additional task before considering this plan complete.

- [ ] **Step 4: Fix any visual regressions found, commit fixes**

If any page still shows dark theme artifacts or broken layout, fix and commit with a descriptive message referencing the specific page.
