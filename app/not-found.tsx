import { Nav } from './components/Nav'

const STRAY_LINKS = [
  { label: 'Home', href: '/', hint: 'Start over' },
  { label: 'Projects', href: '/projects', hint: 'Things I have built' },
  { label: 'AI School', href: '/learn', hint: 'Learn the fundamentals' },
  { label: 'Analysis', href: '/analysis', hint: 'Deep dives and breakdowns' },
]

export default function NotFound() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-xl mx-auto px-8 pt-32 pb-20 text-center">
        <p
          className="text-8xl mb-6 select-none"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--ed-card-hover)' }}
        >
          404
        </p>
        <h1
          className="text-3xl mb-4"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.01em', color: 'var(--ed-text-dark)' }}
        >
          This page wandered off.
        </h1>
        <p className="mb-12 text-lg leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Maybe it is being built by an AI agent right now.
          <br />In the meantime, here are some places that do exist:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {STRAY_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              data-cursor="Go"
              className="ed-list-card rounded-xl px-5 py-4 transition card-hover"
              style={{ background: 'var(--ed-card-warm)' }}
            >
              <span className="block text-sm font-semibold" style={{ color: 'var(--ed-text-dark)' }}>{link.label}</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--ed-text-faint)' }}>{link.hint}</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
