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
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Trending</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          What's happening<br />in AI. Today.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          Every morning, a new article on the most trending topic in AI — written for business professionals, not researchers.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-20">
        {articles.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-10 text-center">
            <p className="text-white/30 text-sm">First article drops tomorrow morning.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article: any, i: number) => (
              <a
                key={article.slug.current}
                href={`/trending/${article.slug.current}`}
                className="group block border border-white/10 rounded-xl p-6 hover:border-white/25 transition"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {i === 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-400/80 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Latest
                      </span>
                    )}
                    <h2 className="text-base font-semibold mb-2 group-hover:text-white transition text-white/90 leading-snug">
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-white/40 text-sm leading-relaxed line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  {article.publishedAt && (
                    <p className="text-white/25 text-xs shrink-0 mt-0.5">
                      {formatDate(article.publishedAt)}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
