import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

export default async function Article({ params }: { params: { slug: string } }) {
  let article: any = null
  try {
    article = await client.fetch(
      `*[_type == "article" && slug.current == $slug][0] {
        title, excerpt, readTime, publishedAt, body, module
      }`,
      { slug: params.slug }
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
        <a href="/learn" className="text-white/40 text-sm hover:text-white transition mb-8 inline-block">← Back to Learn</a>
        <h1 className="text-4xl font-bold mt-4 mb-4">{article.title}</h1>
        {article.readTime && (
          <p className="text-white/40 text-sm mb-12">{article.readTime} min read</p>
        )}
        <div className="prose prose-invert prose-lg max-w-none">
          {article.body && <PortableText value={article.body} />}
        </div>
      </article>
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        2026 Anshul Gupta
      </footer>
    </main>
  )
}
