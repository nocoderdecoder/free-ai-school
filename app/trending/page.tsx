import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Trending',
  description: 'Daily AI articles written from the most trending topics in artificial intelligence — published automatically every morning.',
  openGraph: {
    title: 'Trending AI — Daily Articles on What\'s Happening in AI',
    description: 'Daily AI articles written from the most trending topics — published every morning.',
    url: 'https://anshul.ai/trending',
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

export default async function Trending() {
  let articles: any[] = []
  try {
    articles = await client.fetch(
      `*[_type == "trending"] | order(publishedAt desc) { title, slug, excerpt, publishedAt }`
    )
  } catch {
    articles = []
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Trending</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          What&apos;s happening<br />in AI. Today.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Every morning, a new article on the most trending topic in AI — written for business professionals, not researchers.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-20">
        {articles.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}>
            <p className="text-sm" style={{ color: 'var(--ed-text-light)' }}>First article drops tomorrow morning.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article: any, i: number) => (
              <a
                key={article.slug.current}
                href={`/trending/${article.slug.current}`}
                className="group block rounded-xl p-6 transition ed-list-card"
                style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {i === 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--ed-trending-dot)' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--ed-trending-dot)' }} />
                        Latest
                      </span>
                    )}
                    <h2 className="text-base font-semibold mb-2 leading-snug" style={{ color: 'var(--ed-text)' }}>
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--ed-text-muted)' }}>
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  {article.publishedAt && (
                    <p className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--ed-text-light)' }}>
                      {formatDate(article.publishedAt)}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
