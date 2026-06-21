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
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    trending: { bg: '#E8F0FE', color: '#3B5BA9', label: 'Trending' },
    event:    { bg: '#F3E8FF', color: '#7C3AED', label: 'Event' },
    deal:     { bg: '#FEF3E2', color: '#B45309', label: 'Deal' },
  }
  const s = styles[type] ?? styles.trending
  return (
    <span
      className="inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
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
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Analysis</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          AI trends, deals<br />& events.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Daily AI analysis and coverage of major industry moves — written for business professionals, not researchers.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32">
        {items.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}>
            <p className="text-sm" style={{ color: 'var(--ed-text-light)' }}>Analysis articles coming soon.</p>
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
                  data-cursor="Read"
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
                        <TypeBadge type={badgeType} />
                        {item.eventName && (
                          <span className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{item.eventName}</span>
                        )}
                      </div>
                      <h2 className="text-base font-semibold mb-2 leading-snug" style={{ color: 'var(--ed-text)' }}>
                        {item.title}
                      </h2>
                      {item.excerpt && (
                        <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--ed-text-muted)' }}>
                          {item.excerpt}
                        </p>
                      )}
                    </div>
                    {item.publishedAt && (
                      <p className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--ed-text-light)' }}>
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

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
