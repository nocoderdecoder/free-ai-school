import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

const components = {
  block: {
    normal: ({ children }: any) => (
      <p className="mb-6 leading-relaxed text-white/80 text-lg">{children}</p>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-3xl font-bold mt-12 mb-6 text-white">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-2xl font-bold mt-10 mb-4 text-white">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xl font-semibold mt-8 mb-4 text-white">{children}</h3>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-2 border-white/20 pl-6 my-8 text-white/50 italic">
        {children}
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }: any) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-white/70">{children}</em>
    ),
    code: ({ children }: any) => (
      <code className="bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono text-white/80">
        {children}
      </code>
    ),
    link: ({ children, value }: any) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-white underline underline-offset-4 hover:text-white/70 transition"
      >
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }: any) => (
      <ul className="mb-6 space-y-2 list-none pl-0">{children}</ul>
    ),
    number: ({ children }: any) => (
      <ol className="mb-6 space-y-2 list-decimal pl-6 text-white/80">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }: any) => (
      <li className="text-white/80 text-lg leading-relaxed flex gap-3">
        <span className="text-white/30 mt-1 shrink-0">—</span>
        <span>{children}</span>
      </li>
    ),
    number: ({ children }: any) => (
      <li className="text-white/80 text-lg leading-relaxed">{children}</li>
    ),
  },
}

export default async function Article({ params }: any) {
  const { slug } = await params
  let article: any = null
  try {
    article = await client.fetch(
      `*[_type == "article" && slug.current == $slug][0] { title, excerpt, readTime, publishedAt, body, module }`,
      { slug }
    )
  } catch (e) {
    article = null
  }

  if (!article) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/40">Article not found.</p>
      </main>
    )
  }

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
      <article className="max-w-2xl mx-auto px-8 py-24">
        <a href="/learn" className="text-white/40 text-sm hover:text-white transition mb-8 inline-block">
          ← Back to Learn
        </a>
        <h1 className="text-4xl font-bold mt-4 mb-4">{article.title}</h1>
        {article.readTime && (
          <p className="text-white/40 text-sm mb-12">{article.readTime} min read</p>
        )}
        <div>
          {article.body && <PortableText value={article.body} components={components} />}
        </div>
      </article>
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        2026 Anshul Gupta
      </footer>
    </main>
  )
}