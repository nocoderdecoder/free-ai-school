import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'AI Analysis',
  description: 'Daily AI trending articles and major deals & events — analysed for business professionals.',
  openGraph: {
    title: 'AI Analysis — Daily Trends, Deals & Events',
    description: 'Daily AI trending articles and major deals & events — analysed for business professionals.',
    url: 'https://anshul.ai/analysis',
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

function TypeBadge({ type }: { type: 'trending' | 'event' | 'deal' }) {
  const styles: Record<string, { bg: string; color: string; border: string; label: string }> = {
    trending: { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: 'rgba(59,130,246,0.3)', label: 'Trending' },
    event:    { bg: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: 'rgba(124,58,237,0.3)', label: 'Event' },
    deal:     { bg: 'rgba(15,118,110,0.15)', color: '#2DD4BF', border: 'rgba(15,118,110,0.3)', label: 'Deal' },
  }
  const s = styles[type] ?? styles.trending
  return (
    <span
      className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  )
}

type AnalysisItem = {
  title: string
  slug: string
  excerpt?: string
  publishedAt: string
  source: 'trending' | 'deal-event'
  type?: 'event' | 'deal'
  eventName?: string
}

export default async function Analysis() {
  let items: AnalysisItem[] = []

  try {
    const [trending, dealEvents] = await Promise.all([
      client.fetch(
        `*[_type == "trending"] | order(publishedAt desc) { title, "slug": slug.current, excerpt, publishedAt }`
      ),
      client.fetch(
        `*[_type == "deal-event"] | order(publishedAt desc) { title, "slug": slug.current, excerpt, publishedAt, type, eventName }`
      ),
    ])

    const trendingItems: AnalysisItem[] = (trending ?? []).map((t: any) => ({
      ...t,
      source: 'trending' as const,
    }))

    const dealEventItems: AnalysisItem[] = (dealEvents ?? []).map((d: any) => ({
      ...d,
      source: 'deal-event' as const,
    }))

    items = [...trendingItems, ...dealEventItems].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch {
    items = []
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Analysis</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          AI trends, deals<br />& events.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          Daily AI analysis and coverage of major industry moves — written for business professionals, not researchers.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32">
        {items.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-10 text-center">
            <p className="text-white/30 text-sm">Analysis articles coming soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const href = item.source === 'trending'
                ? `/trending/${item.slug}`
                : `/deals-events/${item.slug}`
              const badgeType = item.source === 'trending'
                ? 'trending'
                : (item.type ?? 'deal')

              return (
                <a
                  key={`${item.source}-${item.slug}`}
                  href={href}
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
                        <TypeBadge type={badgeType} />
                        {item.eventName && (
                          <span className="text-white/30 text-xs">{item.eventName}</span>
                        )}
                      </div>
                      <h2 className="text-base font-semibold mb-2 group-hover:text-white transition text-white/90 leading-snug">
                        {item.title}
                      </h2>
                      {item.excerpt && (
                        <p className="text-white/40 text-sm leading-relaxed line-clamp-2">
                          {item.excerpt}
                        </p>
                      )}
                    </div>
                    {item.publishedAt && (
                      <p className="text-white/25 text-xs shrink-0 mt-0.5">
                        {formatDate(item.publishedAt)}
                      </p>
                    )}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
