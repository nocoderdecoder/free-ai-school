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
        style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>
        Event
      </span>
    )
  }
  return (
    <span className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
      style={{ background: 'rgba(15,118,110,0.15)', color: '#2DD4BF', border: '1px solid rgba(15,118,110,0.3)' }}>
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
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Deals & Events</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Major moves<br />in AI.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          Significant events and acquisitions — analysed for business professionals. Published when something worth reading happens.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-20">
        {articles.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-10 text-center">
            <p className="text-white/30 text-sm">Nothing yet. Check back when something significant happens.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article: any, i: number) => (
              <a
                key={article.slug.current}
                href={`/deals-events/${article.slug.current}`}
                className="group block border border-white/10 rounded-xl p-6 hover:border-white/25 transition"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {i === 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-400/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Latest
                        </span>
                      )}
                      <TypeBadge type={article.type} />
                      {article.eventName && (
                        <span className="text-white/30 text-xs">{article.eventName}</span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold mb-2 group-hover:text-white transition text-white/90 leading-snug">
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-white/40 text-sm leading-relaxed line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {article.publishedAt && (
                      <p className="text-white/25 text-xs">{formatDate(article.publishedAt)}</p>
                    )}
                    {article.readTime && (
                      <p className="text-white/20 text-xs mt-1">{article.readTime} min</p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-white/10">
        <div className="max-w-3xl mx-auto px-8 py-12 flex flex-col sm:flex-row justify-between gap-8">
          <div>
            <p className="font-semibold text-white mb-1">Anshul Gupta</p>
            <p className="text-white/30 text-sm">GTM Strategy at Google · Kellogg MBA</p>
            <p className="text-white/20 text-xs mt-4">© {new Date().getFullYear()} · anshul.ai</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <p className="text-white/25 text-xs uppercase tracking-widest mb-1">Pages</p>
              <a href="/about"     className="text-white/40 text-sm hover:text-white transition">About</a>
              <a href="/work"      className="text-white/40 text-sm hover:text-white transition">Work</a>
              <a href="/projects"  className="text-white/40 text-sm hover:text-white transition">Projects</a>
              <a href="/learn"     className="text-white/40 text-sm hover:text-white transition">AI School</a>
              <a href="/analysis"  className="text-white/40 text-sm hover:text-white transition">Analysis</a>
              <a href="/writing"   className="text-white/40 text-sm hover:text-white transition">Writing</a>
              <a href="/downloads" className="text-white/40 text-sm hover:text-white transition">Downloads</a>
              <a href="/contact"   className="text-white/40 text-sm hover:text-white transition">Contact</a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-white/25 text-xs uppercase tracking-widest mb-1">Connect</p>
              <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" rel="noopener noreferrer" className="text-white/40 text-sm hover:text-white transition">LinkedIn</a>
              <a href="https://github.com/nocoderdecoder" target="_blank" rel="noopener noreferrer" className="text-white/40 text-sm hover:text-white transition">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
