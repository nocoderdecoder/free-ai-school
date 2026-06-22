import { Nav } from '../../components/Nav'
import { ReadingProgress } from '../../components/ReadingProgress'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import type { Metadata } from 'next'
import { editorialComponents } from '../../components/PortableTextComponents'
import { JsonLd, articleSchema } from '../../components/JsonLd'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

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
    alternates: {
      canonical: `https://anshul.ai/learn/${slug}`,
    },
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

const MODULE_LABELS: Record<string, string> = {
  foundations:  'Foundations',
  tools:        'The Tools Layer',
  organization: 'AI in Your Organization',
  'hands-on':   'Hands-On',
}

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
      <main className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
        <p style={{color: 'var(--ed-text-muted)'}}>Article not found.</p>
      </main>
    )
  }

  const moduleLabel = MODULE_LABELS[article.module] ?? 'Learn'

  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <JsonLd
        data={articleSchema({
          title: article.title,
          description: article.excerpt,
          url: `https://anshul.ai/learn/${slug}`,
          publishedAt: article.publishedAt,
        })}
      />
      <ReadingProgress variant="light" />
      <Nav variant="light" />

      <article className="max-w-2xl mx-auto px-8 py-16">

        <nav className="flex items-center gap-2 text-xs mb-10" style={{color: 'var(--ed-text-faint)'}}>
          <a href="/learn" style={{color: 'inherit'}}>Learn</a>
          <span>›</span>
          <a href={`/learn#${article.module}`} style={{color: 'inherit'}}>{moduleLabel}</a>
          <span>›</span>
          <span className="truncate max-w-[200px]" style={{color: 'var(--ed-text-muted)'}}>{article.title}</span>
        </nav>

        <h1 className="text-4xl mb-4 leading-tight" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>{article.title}</h1>
        {article.readTime && (
          <p className="text-sm mb-12" style={{color: 'var(--ed-text-light)'}}>{article.readTime} min read</p>
        )}

        <div>
          {article.body && <PortableText value={article.body} components={editorialComponents} />}
        </div>

        {(article.prev || article.next) && (
          <div className="mt-20 pt-10 grid grid-cols-2 gap-4" style={{borderTop: '1px solid var(--ed-border)'}}>
            <div>
              {article.prev && (
                <a
                  href={`/learn/${article.prev.slug}`}
                  className="ed-list-card group block p-5 h-full"
                  style={{background: 'var(--ed-card-warm)', borderRadius: '14px'}}
                >
                  <p className="text-xs mb-2 flex items-center gap-1" style={{color: 'var(--ed-text-light)'}}>
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Previous
                  </p>
                  <p className="text-sm font-medium leading-snug" style={{color: 'var(--ed-text-secondary)'}}>
                    {article.prev.title}
                  </p>
                </a>
              )}
            </div>
            <div>
              {article.next && (
                <a
                  href={`/learn/${article.next.slug}`}
                  className="ed-list-card group block p-5 text-right h-full"
                  style={{background: 'var(--ed-card-warm)', borderRadius: '14px'}}
                >
                  <p className="text-xs mb-2 flex items-center gap-1 justify-end" style={{color: 'var(--ed-text-light)'}}>
                    Next
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </p>
                  <p className="text-sm font-medium leading-snug" style={{color: 'var(--ed-text-secondary)'}}>
                    {article.next.title}
                  </p>
                </a>
              )}
            </div>
          </div>
        )}
      </article>

      <footer className="px-8 py-8 text-center text-sm" style={{borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)'}}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
