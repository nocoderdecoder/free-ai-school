import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Anshul Gupta — AI Builder & Educator',
  description: 'GTM Strategy at Google. Kellogg MBA. I build AI products without an engineering degree and teach practical AI to business professionals.',
  openGraph: {
    title: 'Anshul Gupta — AI Builder & Educator',
    description: 'GTM Strategy at Google. Kellogg MBA. I build AI products and teach practical AI to business professionals.',
    url: 'https://anshul.ai',
    type: 'website',
  },
  twitter: {
    title: 'Anshul Gupta — AI Builder & Educator',
    description: 'GTM Strategy at Google. Kellogg MBA. I build AI products and teach practical AI to business professionals.',
  },
}

import { ScrollReveal } from './components/ScrollReveal'
import { ToolsMarquee } from './components/ToolsMarquee'
import { Nav } from './components/Nav'

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c.998.005 2.046.137 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">

      <Nav />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 py-24">
        <p className="hero-label text-white/40 text-sm mb-4 uppercase tracking-widest">
          anshul.ai
        </p>
        <h1 className="hero-heading text-5xl font-bold leading-tight mb-6">
          <span className="shimmer-text">I build with AI.</span>
          <br />I teach what I learn.
        </h1>
        <p className="hero-sub text-white/60 text-xl leading-relaxed mb-10">
          GTM Strategy at Google. Kellogg MBA. I ship real AI products without an engineering background and share everything along the way.
        </p>
        <div className="hero-ctas flex gap-4 flex-wrap">
          <a href="/lab" className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition">
            See what I built
          </a>
          <a href="/learn" className="border border-white/20 px-6 py-3 rounded-full font-medium hover:border-white/40 transition">
            Learn AI with me
          </a>
          <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" className="border border-white/20 px-6 py-3 rounded-full font-medium hover:border-white/40 transition">
            Follow on LinkedIn
          </a>
        </div>
      </section>

      {/* Credential strip */}
      <ScrollReveal>
        <section className="border-t border-white/10">
          {/* Background + experience */}
          <div className="max-w-3xl mx-auto px-8 py-5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white/30 text-xs uppercase tracking-widest mr-1">Background</span>
              <span className="text-white/70 text-sm font-medium">Google</span>
              <span className="text-white/20 text-sm">·</span>
              <span className="text-white/70 text-sm font-medium">Kellogg / Northwestern</span>
              <span className="text-white/20 text-sm">·</span>
              <span className="text-white/70 text-sm font-medium">Uber</span>
            </div>

            {/* GitHub + LinkedIn icons */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/nocoderdecoder"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/40 hover:text-white transition text-xs"
                aria-label="GitHub"
              >
                <GitHubIcon />
                <span>GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/anshul-gupta1/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/40 hover:text-white transition text-xs"
                aria-label="LinkedIn"
              >
                <LinkedInIcon />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Tools marquee */}
          <div className="border-t border-white/10">
            <div className="max-w-3xl mx-auto px-8 pt-3 pb-1">
              <span className="text-white/25 text-xs uppercase tracking-widest">Tools</span>
            </div>
            <ToolsMarquee />
          </div>
        </section>
      </ScrollReveal>

      {/* Three sections */}
      <section className="max-w-3xl mx-auto px-8 py-16 grid grid-cols-1 gap-0">

        <ScrollReveal delay={0}>
          <div className="border-b border-white/10 py-12">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Lab</p>
            <h2 className="text-2xl font-bold mb-3">AI products I have built</h2>
            <p className="text-white/60 leading-relaxed mb-6 max-w-xl">
              From prompt scoring tools to competitive intelligence scrapers. Real products built without writing a single line of code from scratch.
            </p>
            <a href="/lab" className="inline-flex items-center gap-2 text-sm text-white hover:text-white/70 transition border border-white/20 px-4 py-2 rounded-full hover:border-white/40">
              View all projects →
            </a>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="border-b border-white/10 py-12">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Free AI School</p>
            <h2 className="text-2xl font-bold mb-3">AI education for business professionals</h2>
            <p className="text-white/60 leading-relaxed mb-6 max-w-xl">
              No prerequisites. No engineering degree. A complete curriculum for the people who run teams, make decisions, and want to actually use AI at work.
            </p>
            <a href="/learn" className="inline-flex items-center gap-2 text-sm text-white hover:text-white/70 transition border border-white/20 px-4 py-2 rounded-full hover:border-white/40">
              Start learning →
            </a>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="py-12">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Writing</p>
            <h2 className="text-2xl font-bold mb-3">Honest takes on AI in business</h2>
            <p className="text-white/60 leading-relaxed mb-6 max-w-xl">
              What I am building, what is working, what failed, and what I think is actually happening in AI right now.
            </p>
            <a href="/writing" className="inline-flex items-center gap-2 text-sm text-white hover:text-white/70 transition border border-white/20 px-4 py-2 rounded-full hover:border-white/40">
              Read the writing →
            </a>
          </div>
        </ScrollReveal>

      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>

    </main>
  )
}
