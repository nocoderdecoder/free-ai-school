import type { Metadata } from 'next'
import { Nav } from '../../components/Nav'
import { ReadingProgress } from '../../components/ReadingProgress'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import { components } from '../../components/PortableTextComponents'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { slug } = await params
  const article = await client.fetch(
    `*[_type == "trending" && slug.current == $slug][0] { title, excerpt }`,
    { slug }
  ).catch(() => null)

  if (!article) return { title: 'Article Not Found' }

  return {
    title: article.title,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      url: `https://anshul.ai/trending/${slug}`,
      type: 'article',
    },
    twitter: {
      title: article.title,
      description: article.excerpt || undefined,
    },
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}


export default async function TrendingArticle({ params }: any) {
  const { slug } = await params

  let article: any = null
  try {
    article = await client.fetch(
      `*[_type == "trending" && slug.current == $slug][0] {
        title, excerpt, publishedAt, body,
        "prev": *[_type == "trending" && _createdAt < ^._createdAt] | order(_createdAt desc)[0] { title, "slug": slug.current },
        "next": *[_type == "trending" && _createdAt > ^._createdAt] | order(_createdAt asc)[0]  { title, "slug": slug.current }
      }`,
      { slug }
    )
  } catch {
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
      <ReadingProgress />
      <Nav />

      <article className="max-w-2xl mx-auto px-8 py-16">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-white/30 mb-10">
          <a href="/trending" className="hover:text-white/60 transition">Trending</a>
          <span>›</span>
          <span className="text-white/50 truncate max-w-[240px]">{article.title}</span>
        </nav>

        {/* Badge + date */}
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Trending
          </span>
          {article.publishedAt && (
            <span className="text-white/25 text-xs">{formatDate(article.publishedAt)}</span>
          )}
        </div>

        <h1 className="text-4xl font-bold mb-10 leading-tight">{article.title}</h1>

        {/* Body */}
        <div>
          {article.body && <PortableText value={article.body} components={components} />}
        </div>

        {/* Next / Prev */}
        {(article.prev || article.next) && (
          <div className="mt-20 pt-10 border-t border-white/10 grid grid-cols-2 gap-4">
            <div>
              {article.prev && (
                <a href={`/trending/${article.prev.slug}`} className="group block border border-white/10 rounded-xl p-5 hover:border-white/25 transition h-full">
                  <p className="text-white/30 text-xs mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Previous
                  </p>
                  <p className="text-sm font-medium text-white/70 group-hover:text-white transition leading-snug">{article.prev.title}</p>
                </a>
              )}
            </div>
            <div>
              {article.next && (
                <a href={`/trending/${article.next.slug}`} className="group block border border-white/10 rounded-xl p-5 hover:border-white/25 transition text-right h-full">
                  <p className="text-white/30 text-xs mb-2 flex items-center gap-1 justify-end">
                    Next
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </p>
                  <p className="text-sm font-medium text-white/70 group-hover:text-white transition leading-snug">{article.next.title}</p>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Back */}
        <div className="mt-10 pt-10 border-t border-white/10">
          <a href="/trending" className="text-white/30 text-sm hover:text-white/60 transition">← All trending articles</a>
        </div>
      </article>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
