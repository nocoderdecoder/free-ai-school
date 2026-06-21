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
