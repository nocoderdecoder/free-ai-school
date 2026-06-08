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
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4">Contact</p>
        <h1 className="heading-page mb-6">
          Get in touch.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed mb-12">
          Open to speaking engagements, media interviews, collaborations, and advisory opportunities in AI and GTM strategy.
        </p>

        <ContactForm />
      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
