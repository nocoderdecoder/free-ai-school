import { Nav } from '../../components/Nav'
import { ReadingProgress } from '../../components/ReadingProgress'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import type { Metadata } from 'next'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Dynamic metadata (OG tags per article) ───────────────────────────────────

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { slug } = await params
  const article = await client.fetch(
    `*[_type == "article" && slug.current == $slug][0] { title, excerpt }`,
    { slug }
  ).catch(() => null)

  if (!article) return { title: 'Article Not Found' }

  return {
    title: article.title,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      url: `https://anshul.ai/learn/${slug}`,
      type: 'article',
    },
    twitter: {
      title: article.title,
      description: article.excerpt || undefined,
    },
  }
}

// ─── Portable Text components ─────────────────────────────────────────────────

const components = {
  block: {
    normal:     ({ children }: any) => <p className="mb-6 leading-relaxed text-white/80 text-lg">{children}</p>,
    h1:         ({ children }: any) => <h1 className="text-3xl font-bold mt-12 mb-4 text-white">{children}</h1>,
    h2:         ({ children }: any) => <h2 className="text-2xl font-bold mt-10 mb-4 text-white">{children}</h2>,
    h3:         ({ children }: any) => <h3 className="text-xl font-semibold mt-8 mb-3 text-white">{children}</h3>,
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-white/20 pl-6 my-8 text-white/50 italic">{children}</blockquote>,
  },
  marks: {
    strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
    em:     ({ children }: any) => <em className="italic text-white/70">{children}</em>,
    code:   ({ children }: any) => <code className="bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono text-white/80">{children}</code>,
    link:   ({ children, value }: any) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4 hover:text-white/70 transition">
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="mb-6 space-y-2 list-none pl-0">{children}</ul>,
    number: ({ children }: any) => <ol className="mb-6 space-y-2 list-decimal pl-6 text-white/80">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }: any) => (
      <li className="text-white/80 text-lg leading-relaxed flex gap-3">
        <span className="text-white/30 mt-1 shrink-0">—</span>
        <span>{children}</span>
      </li>
    ),
    number: ({ children }: any) => <li className="text-white/80 text-lg leading-relaxed">{children}</li>,
  },
  types: {
    image: ({ value }: any) => {
      if (!value?.asset?._ref) return null
      const ref = value.asset._ref
      const [, id, dimensions, format] = ref.split('-')
      const url = `https://cdn.sanity.io/images/8w4exnl4/production/${id}-${dimensions}.${format}`
      return (
        <figure className="my-10">
          <img src={url} alt={value.alt || ''} className="w-full rounded-xl" />
          {value.caption && <figcaption className="text-center text-white/40 text-sm mt-3">{value.caption}</figcaption>}
        </figure>
      )
    },
  },
}

// ─── Module labels ────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  foundations:  'Foundations',
  tools:        'The Tools Layer',
  organization: 'AI in Your Organization',
  'hands-on':   'Hands-On',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Article({ params }: any) {
  const { slug } = await params

  let article: any = null
  try {
    article = await client.fetch(
      `*[_type == "article" && slug.current == $slug][0] {
        title, excerpt, readTime, publishedAt, body, module,
        "prev": *[_type == "article" && module == ^.module && _createdAt < ^._createdAt] | order(_createdAt desc)[0] {
          title, "slug": slug.current
        },
        "next": *[_type == "article" && module == ^.module && _createdAt > ^._createdAt] | order(_createdAt asc)[0] {
          title, "slug": slug.current
        }
      }`,
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

  const moduleLabel = MODULE_LABELS[article.module] ?? 'Learn'

  return (
    <main className="min-h-screen bg-black text-white">
      <ReadingProgress />
      <Nav />

      <article className="max-w-2xl mx-auto px-8 py-16">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-white/30 mb-10">
          <a href="/learn" className="hover:text-white/60 transition">Learn</a>
          <span>›</span>
          <a href={`/learn#${article.module}`} className="hover:text-white/60 transition">{moduleLabel}</a>
          <span>›</span>
          <span className="text-white/50 truncate max-w-[200px]">{article.title}</span>
        </nav>

        {/* Title block */}
        <h1 className="text-4xl font-bold mb-4 leading-tight">{article.title}</h1>
        {article.readTime && (
          <p className="text-white/30 text-sm mb-12">{article.readTime} min read</p>
        )}

        {/* Body */}
        <div>
          {article.body && <PortableText value={article.body} components={components} />}
        </div>

        {/* Next / Previous */}
        {(article.prev || article.next) && (
          <div className="mt-20 pt-10 border-t border-white/10 grid grid-cols-2 gap-4">
            <div>
              {article.prev && (
                <a
                  href={`/learn/${article.prev.slug}`}
                  className="group block border border-white/10 rounded-xl p-5 hover:border-white/25 transition h-full"
                >
                  <p className="text-white/30 text-xs mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Previous
                  </p>
                  <p className="text-sm font-medium text-white/70 group-hover:text-white transition leading-snug">
                    {article.prev.title}
                  </p>
                </a>
              )}
            </div>
            <div>
              {article.next && (
                <a
                  href={`/learn/${article.next.slug}`}
                  className="group block border border-white/10 rounded-xl p-5 hover:border-white/25 transition text-right h-full"
                >
                  <p className="text-white/30 text-xs mb-2 flex items-center gap-1 justify-end">
                    Next
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </p>
                  <p className="text-sm font-medium text-white/70 group-hover:text-white transition leading-snug">
                    {article.next.title}
                  </p>
                </a>
              )}
            </div>
          </div>
        )}
      </article>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
