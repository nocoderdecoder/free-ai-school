import { Nav } from './components/Nav'

export default function NotFound() {
  return (
    <main className="min-h-screen text-white" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <Nav />

      <section className="max-w-xl mx-auto px-8 pt-32 pb-20 text-center">
        <p className="text-8xl font-bold mb-6" style={{ color: 'var(--text-ghost)' }}>
          404
        </p>
        <h1 className="text-2xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
          This page wandered off.
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-tertiary)' }}>
          Maybe it is being built by an AI agent right now.
          <br />In the meantime, here are some places that do exist:
        </p>
        <div className="flex flex-col items-center gap-3">
          <a href="/" className="text-sm hover:text-white transition" style={{ color: 'var(--text-secondary)' }}>
            Home
          </a>
          <a href="/projects" className="text-sm hover:text-white transition" style={{ color: 'var(--text-secondary)' }}>
            Projects
          </a>
          <a href="/learn" className="text-sm hover:text-white transition" style={{ color: 'var(--text-secondary)' }}>
            AI School
          </a>
          <a href="/analysis" className="text-sm hover:text-white transition" style={{ color: 'var(--text-secondary)' }}>
            Analysis
          </a>
        </div>
      </section>

      <footer className="border-t px-8 py-8 text-center text-sm" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
