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
  {
    key: 'claude',
    label: 'Mastering Claude',
    tagline: 'Everything you need to know about Claude',
    description: 'What Claude is, how the interface works, how to prompt it well, real work use cases, and how to go further with the API and Claude Code.',
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
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Free AI School</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          No prerequisites.<br />Start anywhere.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          A complete AI curriculum for business professionals. No engineering background required — just the practical knowledge you need to use AI at work, lead AI projects, and stay ahead.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const count = articles.filter((a: any) => a.module === mod.key).length
            return (
              <a
                key={mod.key}
                href={`#${mod.key}`}
                className="group block rounded-xl p-6 transition ed-list-card"
                style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
              >
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--ed-text-faint)' }}>{mod.label}</p>
                <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--ed-text)' }}>{mod.tagline}</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{mod.description}</p>
                {count > 0 && (
                  <p className="text-xs mt-4" style={{ color: 'var(--ed-text-light)' }}>{count} {count === 1 ? 'article' : 'articles'}</p>
                )}
              </a>
            )
          })}
        </div>
      </section>

      {articles.length > 0 && (
        <section className="max-w-3xl mx-auto px-8 py-16" style={{ borderTop: '1px solid var(--ed-border)' }}>
          <div className="space-y-16">
            {modules.map((mod) => {
              const modArticles = articles.filter((a: any) => a.module === mod.key)
              if (modArticles.length === 0) return null
              return (
                <div key={mod.key} id={mod.key}>
                  <p className="text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--ed-text-faint)' }}>{mod.label}</p>
                  <div className="space-y-3">
                    {modArticles.map((article: any) => (
                      <a
                        key={article.slug.current}
                        href={'/learn/' + article.slug.current}
                        className="block rounded-xl p-6 transition ed-list-card"
                        style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-base font-semibold" style={{ color: 'var(--ed-text)' }}>{article.title}</h3>
                          {article.readTime && (
                            <span className="text-xs ml-4 shrink-0" style={{ color: 'var(--ed-text-light)' }}>{article.readTime} min</span>
                          )}
                        </div>
                        {article.excerpt && (
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{article.excerpt}</p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}

            {unmatchedArticles.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--ed-text-faint)' }}>More Articles</p>
                <div className="space-y-3">
                  {unmatchedArticles.map((article: any) => (
                    <a
                      key={article.slug.current}
                      href={'/learn/' + article.slug.current}
                      className="block rounded-xl p-6 transition ed-list-card"
                      style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-base font-semibold" style={{ color: 'var(--ed-text)' }}>{article.title}</h3>
                        {article.readTime && (
                          <span className="text-xs ml-4 shrink-0" style={{ color: 'var(--ed-text-light)' }}>{article.readTime} min</span>
                        )}
                      </div>
                      {article.excerpt && (
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{article.excerpt}</p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
