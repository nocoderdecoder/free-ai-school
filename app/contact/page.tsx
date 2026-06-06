import type { Metadata } from 'next'
import { Nav } from '../components/Nav'

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
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-xl mx-auto px-8 pt-28 pb-20">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Contact</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Get in touch.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed mb-12">
          Open to speaking engagements, media interviews, collaborations, and advisory opportunities in AI and GTM strategy.
        </p>

        <form className="space-y-6">
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Category</label>
            <select className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition appearance-none">
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
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Email</label>
            <input
              type="email"
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Message</label>
            <textarea
              rows={5}
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition resize-none"
              placeholder="What would you like to discuss?"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white text-black py-3 rounded-full font-medium text-sm hover:bg-white/90 transition"
          >
            Send message
          </button>
          <p className="text-white/20 text-xs text-center">
            Form submission will be enabled shortly.
          </p>
        </form>
      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
