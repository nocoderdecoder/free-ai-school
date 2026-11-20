import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { professionalWork } from '../lib/publicProfile'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Professional accomplishments in AI, GTM strategy, and digital transformation at Google, Unilever, and beyond.',
  openGraph: {
    title: 'Work — Professional Impact',
    description: 'AI strategy, digital transformation, and GTM leadership across Google, Unilever, and Kellogg.',
    url: 'https://anshul.ai/work',
  },
}

const accomplishments = professionalWork

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
          Selected work in commercial strategy, business analysis, and applied AI across Google, consumer goods, and graduate client projects.
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
