import type { Metadata } from 'next'
import { Nav } from '../components/Nav'

export const metadata: Metadata = {
  title: 'Free AI School',
  description: 'A complete AI curriculum for business professionals. No prerequisites, no engineering degree — practical AI knowledge for the people who run teams and make decisions.',
  openGraph: {
    title: 'Free AI School — Practical AI for Business Professionals',
    description: 'A complete AI curriculum for business professionals. No prerequisites, no engineering degree required.',
    url: 'https://anshul.ai/learn',
  },
}

export const revalidate = 0

const modules = [
  {
    key: 'foundations',
    label: 'Foundations',
    tagline: 'What AI is and how it actually works',
    description: 'Tokens, context windows, prompts, hallucinations, and the concepts every professional needs before using AI seriously.',
  },
  {
    key: 'tools',
    label: 'The Tools Layer',
    tagline: 'The tools professionals are actually using',
    description: 'ChatGPT, Claude, Gemini, Copilot, meeting AI, writing AI, and how to choose the right tool for each job.',
  },
  {
    key: 'organization',
    label: 'AI in Your Organization',
    tagline: 'Strategy, adoption, and leadership',
    description: 'How to evaluate AI vendors, build an AI policy, manage AI projects, and lead teams through the transition.',
  },
  {
    key: 'hands-on',
    label: 'Hands-On',
    tagline: 'Building AI habits that actually stick',
    description: 'Practical walkthroughs for writing, research, meetings, analysis, and building a personal AI workflow.',
  },
]

export default async function Learn() {
  let articles: any[] = []
  try {
    const { createClient } = await import('next-sanity')
    const client = createClient({
      projectId: '8w4exnl4',
      dataset: 'production',
      apiVersion: '2024-01-01',
      useCdn: false,
    })
    articles = await client.fetch(
      `*[_type == "article"] | order(_createdAt asc) { title, slug, module, excerpt, readTime }`
    )
  } catch (e) {
    articles = []
  }

  const moduledArticles = articles.filter((a: any) =>
    modules.some((m) => m.key === a.module)
  )
  const unmatchedArticles = articles.filter((a: any) =>
    !modules.some((m) => m.key === a.module)
  )

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Free AI School</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          No prerequisites.<br />Start anywhere.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          A complete AI curriculum for business professionals. No engineering background required — just the practical knowledge you need to use AI at work, lead AI projects, and stay ahead.
        </p>
      </section>

      {/* Module cards */}
      <section className="max-w-3xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const count = articles.filter((a: any) => a.module === mod.key).length
            return (
              <a
                key={mod.key}
                href={`#${mod.key}`}
                className="group block border border-white/10 rounded-xl p-6 hover:border-white/30 transition"
              >
                <p className="text-white/40 text-xs uppercase tracking-widest mb-3">{mod.label}</p>
                <h2 className="text-lg font-semibold mb-2 group-hover:text-white transition">{mod.tagline}</h2>
                <p className="text-white/50 text-sm leading-relaxed">{mod.description}</p>
                {count > 0 && (
                  <p className="text-white/30 text-xs mt-4">{count} {count === 1 ? 'article' : 'articles'}</p>
                )}
              </a>
            )
          })}
        </div>
      </section>

      {/* Article list */}
      {articles.length > 0 && (
        <section className="border-t border-white/10 max-w-3xl mx-auto px-8 py-16">
          <div className="space-y-16">
            {modules.map((mod) => {
              const modArticles = articles.filter((a: any) => a.module === mod.key)
              if (modArticles.length === 0) return null
              return (
                <div key={mod.key} id={mod.key}>
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-6">{mod.label}</p>
                  <div className="space-y-3">
                    {modArticles.map((article: any) => (
                      <a
                        key={article.slug.current}
                        href={'/learn/' + article.slug.current}
                        className="block border border-white/10 rounded-xl p-6 hover:border-white/30 transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-base font-semibold">{article.title}</h3>
                          {article.readTime && (
                            <span className="text-white/30 text-xs ml-4 shrink-0">{article.readTime} min</span>
                          )}
                        </div>
                        {article.excerpt && (
                          <p className="text-white/50 text-sm leading-relaxed">{article.excerpt}</p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}

            {unmatchedArticles.length > 0 && (
              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-6">More Articles</p>
                <div className="space-y-3">
                  {unmatchedArticles.map((article: any) => (
                    <a
                      key={article.slug.current}
                      href={'/learn/' + article.slug.current}
                      className="block border border-white/10 rounded-xl p-6 hover:border-white/30 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-base font-semibold">{article.title}</h3>
                        {article.readTime && (
                          <span className="text-white/30 text-xs ml-4 shrink-0">{article.readTime} min</span>
                        )}
                      </div>
                      {article.excerpt && (
                        <p className="text-white/50 text-sm leading-relaxed">{article.excerpt}</p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
