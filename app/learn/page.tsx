export const revalidate = 0

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

  const modules = [
    { key: 'foundations', label: 'Module 1: Foundations' },
    { key: 'tools', label: 'Module 2: The Tools Layer' },
    { key: 'organization', label: 'Module 3: AI in Your Organization' },
    { key: 'hands-on', label: 'Module 4: Hands-On for Non-Engineers' },
  ]

  // Get articles that match a module
  const moduledArticles = articles.filter((a: any) => 
    modules.some((m) => m.key === a.module)
  )

  // Get articles with no module or unrecognized module - show them anyway
  const unmatchedArticles = articles.filter((a: any) => 
    !modules.some((m) => m.key === a.module)
  )

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex justify-between items-center px-8 py-6 border-b border-white/10">
        <a href="/" className="font-bold text-lg">Anshul Gupta</a>
        <div className="flex gap-6 text-sm text-white/60">
          <a href="/about" className="hover:text-white transition">About</a>
          <a href="/lab" className="hover:text-white transition">Lab</a>
          <a href="/learn" className="hover:text-white transition">Learn</a>
          <a href="/writing" className="hover:text-white transition">Writing</a>
        </div>
      </nav>
      <section className="max-w-3xl mx-auto px-8 py-24">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Learn</p>
        <h1 className="text-4xl font-bold mb-4">AI education for business leaders.</h1>
        <p className="text-white/60 text-lg mb-16">Practical AI knowledge for people who run teams and make decisions. No engineering degree required.</p>

        {articles.length === 0 && (
          <div className="border border-white/10 rounded-xl p-8 text-center">
            <p className="text-white/40 mb-2">First article coming soon.</p>
            <p className="text-white/30 text-sm">Check back shortly.</p>
          </div>
        )}

        {articles.length > 0 && (
          <div className="space-y-16">
            {/* Render articles grouped by module */}
            {modules.map((mod) => {
              const modArticles = articles.filter((a: any) => a.module === mod.key)
              if (modArticles.length === 0) return null
              return (
                <div key={mod.key}>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-6">{mod.label}</p>
                  <div className="space-y-4">
                    {modArticles.map((article: any) => (
                      <a
                        key={article.slug.current}
                        href={'/learn/' + article.slug.current}
                        className="block border border-white/10 rounded-xl p-6 hover:border-white/30 transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h2 className="text-lg font-semibold">{article.title}</h2>
                          {article.readTime && (
                            <span className="text-white/30 text-sm ml-4 shrink-0">{article.readTime} min</span>
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

            {/* Render any articles that don't match a module so nothing gets lost */}
            {unmatchedArticles.length > 0 && (
              <div>
                <p className="text-white/40 text-sm uppercase tracking-widest mb-6">More Articles</p>
                <div className="space-y-4">
                  {unmatchedArticles.map((article: any) => (
                    <a
                      key={article.slug.current}
                      href={'/learn/' + article.slug.current}
                      className="block border border-white/10 rounded-xl p-6 hover:border-white/30 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h2 className="text-lg font-semibold">{article.title}</h2>
                        {article.readTime && (
                          <span className="text-white/30 text-sm ml-4 shrink-0">{article.readTime} min</span>
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
        )}
      </section>
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        2026 Anshul Gupta
      </footer>
    </main>
  )
}