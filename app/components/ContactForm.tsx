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
