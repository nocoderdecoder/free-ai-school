import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Deals & Events — Anshul Gupta',
  description: 'Significant AI events and acquisitions — analysed for business professionals. Published when something worth reading happens.',
  openGraph: {
    title: 'Deals & Events — Anshul Gupta',
    description: 'Significant AI events and acquisitions — analysed for business professionals.',
    url: 'https://anshul.ai/deals-events',
  },
}

export const revalidate = 0

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TypeBadge({ type }: { type: 'event' | 'deal' }) {
  if (type === 'event') {
    return (
      <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
        style={{ background: '#F3E8FF', color: '#7C3AED' }}>
        Event
      </span>
    )
  }
  return (
    <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
      style={{ background: '#FEF3E2', color: '#B45309' }}>
      Deal
    </span>
  )
}

export default async function DealsEvents() {
  let articles: any[] = []
  try {
    articles = await client.fetch(
      `*[_type == "deal-event"] | order(publishedAt desc) { title, slug, excerpt, publishedAt, type, eventName, readTime }`
    )
  } catch {
    articles = []
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Deals & Events</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          Major moves<br />in AI.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Significant events and acquisitions — analysed for business professionals. Published when something worth reading happens.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-20">
        {articles.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}>
            <p className="text-sm" style={{ color: 'var(--ed-text-light)' }}>Nothing yet. Check back when something significant happens.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article: any, i: number) => (
              <a
                key={article.slug.current}
                href={`/deals-events/${article.slug.current}`}
                className="group block rounded-xl p-6 transition ed-list-card"
                style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {i === 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest" style={{ color: 'var(--ed-trending-dot)' }}>
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--ed-trending-dot)' }} />
                          Latest
                        </span>
                      )}
                      <TypeBadge type={article.type} />
                      {article.eventName && (
                        <span className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{article.eventName}</span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold mb-2 leading-snug" style={{ color: 'var(--ed-text)' }}>
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--ed-text-muted)' }}>
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {article.publishedAt && (
                      <p className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{formatDate(article.publishedAt)}</p>
                    )}
                    {article.readTime && (
                      <p className="text-xs mt-1" style={{ color: 'var(--ed-text-light)' }}>{article.readTime} min</p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <footer style={{ borderTop: '1px solid var(--ed-border)' }}>
        <div className="max-w-3xl mx-auto px-8 py-12 flex flex-col sm:flex-row justify-between gap-8">
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--ed-text-dark)' }}>Anshul Gupta</p>
            <p className="text-sm" style={{ color: 'var(--ed-text-faint)' }}>GTM Strategy at Google · Kellogg MBA</p>
            <p className="text-xs mt-4" style={{ color: 'var(--ed-text-light)' }}>© {new Date().getFullYear()} · anshul.ai</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ed-text-light)' }}>Pages</p>
              <a href="/about" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>About</a>
              <a href="/work" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Work</a>
              <a href="/projects" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Projects</a>
              <a href="/learn" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>AI School</a>
              <a href="/analysis" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Analysis</a>
              <a href="/writing" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Writing</a>
              <a href="/downloads" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Downloads</a>
              <a href="/contact" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>Contact</a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ed-text-light)' }}>Connect</p>
              <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" rel="noopener noreferrer" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>LinkedIn</a>
              <a href="https://github.com/nocoderdecoder" target="_blank" rel="noopener noreferrer" className="text-sm transition" style={{ color: 'var(--ed-text-faint)' }}>GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
