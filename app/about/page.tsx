import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { ScrollSection } from '../components/ScrollSection'
import { publicProfile, careerTimeline } from '../lib/publicProfile'

export const metadata: Metadata = {
  title: 'About',
  description: publicProfile.description,
  openGraph: {
    title: 'About — Anshul Gupta',
    description: publicProfile.description,
    url: 'https://anshul.ai/about',
  },
}

const timeline = careerTimeline

export default function About() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-16">
        <div className="flex flex-col sm:flex-row gap-10 items-start">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)' }}
            aria-label="Anshul Gupta initials"
          >
            <span style={{ color: 'var(--ed-text-light)' }} className="text-2xl font-bold">AG</span>
          </div>

          <div className="flex-1">
            <p className="section-label mb-3" style={{ color: 'var(--ed-text-faint)' }}>About</p>
            <h1 className="heading-page mb-4" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>
              Anshul Gupta
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
              {publicProfile.headline}
            </p>
          </div>
        </div>
      </section>

      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-16">
          <div className="space-y-5">
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ed-text)' }}>
              I work at the intersection of go-to-market strategy, business analysis, and applied AI. At Google, my work focuses on commercial strategy and business intelligence for the Pixel business. My earlier experience spans consumer goods, retail, and distribution.
            </p>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>
              My focus is on helping teams identify useful AI applications, test the quality of AI-generated analysis, and connect tools to business decisions. I combine commercial experience with practical work on analytical requirements, evaluation, and adoption.
            </p>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ed-text-secondary)' }}>
              Outside work, I build independent AI learning resources and practical tools through anshul.ai and shortaicourses.com. These are personal projects for business professionals interested in using and evaluating AI. Views and independent projects on this site are my own.
            </p>
          </div>
        </section>
      </ScrollSection>

      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-16">
          <p className="section-label mb-10" style={{ color: 'var(--ed-text-faint)' }}>Career and education</p>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <div
                key={`${item.org}-${item.period}`}
                className="py-8"
                style={i < timeline.length - 1 ? { borderBottom: '1px solid var(--ed-border)' } : undefined}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 sm:justify-between mb-3">
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{item.org}</span>
                    <span className="text-sm ml-3" style={{ color: 'var(--ed-text-muted)' }}>{item.role}</span>
                  </div>
                  <span className="text-sm sm:ml-4 shrink-0" style={{ color: 'var(--ed-text-light)' }}>{item.period}</span>
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
              { href: '/work',      label: 'Professional work',      desc: 'Commercial strategy, business analysis, and applied AI' },
              { href: '/projects',  label: 'What I have built',      desc: 'Independent tools and practical AI projects' },
              { href: '/learn',     label: 'The AI School',          desc: 'Practical AI learning resources for business professionals' },
              { href: '/writing',   label: 'Writing',                desc: 'Honest takes on building with AI and what is actually happening in the field' },
              { href: '/analysis',  label: 'AI analysis',      desc: 'AI industry developments and business context' },
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
