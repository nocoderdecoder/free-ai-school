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
