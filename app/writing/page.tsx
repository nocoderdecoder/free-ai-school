import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Honest takes on AI in business — what I am building, what is working, what failed, and what is actually happening in AI from someone doing it daily.',
  openGraph: {
    title: 'Writing — Honest Takes on AI in Business',
    description: 'What I am building, what is working, what failed, and what is actually happening in AI — from someone doing it daily, not just writing about it.',
    url: 'https://anshul.ai/writing',
  },
}

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

const UPCOMING_TOPICS = [
  {
    title: "Why your company's AI strategy is backwards",
    preview: "Most organisations are asking 'what can AI do?' The question that produces results is different.",
  },
  {
    title: "What I learned building 6 AI products without writing code",
    preview: "The tools changed. The thinking required did not. Here is what actually matters when you build.",
  },
  {
    title: "The AI adoption gap nobody talks about",
    preview: "It is not about access to tools. Almost everyone has access. The gap is something else entirely.",
  },
  {
    title: "How to evaluate an AI vendor without a technical team",
    preview: "The questions that expose whether a product is real, the red flags that do not show up in demos.",
  },
  {
    title: "How I built a 94-article AI school without writing content manually",
    preview: "The automation pipeline, the tools, the decisions — and what it means for content creation at scale.",
  },
  {
    title: "The real ROI of AI in business — a framework",
    preview: "Executives want numbers. Here is how I think about measuring AI impact when the outcomes are messy.",
  },
]

type Post = {
  title: string
  slug?: string
  excerpt: string
  publishedAt?: string
  readTime?: number
  status: 'published' | 'coming-soon' | 'draft'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function Writing() {
  let published: Post[] = []
  let comingSoon: Post[] = []

  try {
    const posts = await client.fetch(
      `*[_type == "post" && status != "draft"] | order(publishedAt desc) {
        title,
        "slug": slug.current,
        excerpt,
        publishedAt,
        readTime,
        status,
      }`
    )

    if (posts?.length > 0) {
      published = posts.filter((p: Post) => p.status === 'published')
      comingSoon = posts.filter((p: Post) => p.status === 'coming-soon')
    }
  } catch {}

  if (comingSoon.length === 0 && published.length === 0) {
    comingSoon = UPCOMING_TOPICS.map(t => ({
      title: t.title,
      excerpt: t.preview,
      status: 'coming-soon' as const,
    }))
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Writing</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          Honest takes on<br />AI in business.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          What I am building, what is working, what failed, and what I think is actually happening in AI — from someone doing it daily, not just writing about it.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32 space-y-16">

        {published.length > 0 && (
          <div>
            <p className="section-label mb-8" style={{ color: 'var(--ed-text-faint)' }}>Published</p>
            <div className="space-y-3">
              {published.map((post) => (
                <a
                  key={post.slug ?? post.title}
                  href={`/writing/${post.slug}`}
                  className="group block rounded-xl p-6 transition ed-list-card"
                  style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h2 className="text-base font-semibold mb-2 leading-snug" style={{ color: 'var(--ed-text)' }}>
                        {post.title}
                      </h2>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{post.excerpt}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {post.publishedAt && (
                        <p className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{formatDate(post.publishedAt)}</p>
                      )}
                      {post.readTime && (
                        <p className="text-xs mt-1" style={{ color: 'var(--ed-text-light)' }}>{post.readTime} min read</p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {comingSoon.length > 0 && (
          <div>
            <p className="section-label mb-8" style={{ color: 'var(--ed-text-faint)' }}>{published.length > 0 ? 'Coming soon' : 'Upcoming'}</p>
            <div className="space-y-0">
              {comingSoon.map((post, i) => (
                <div
                  key={post.title}
                  className="py-7"
                  style={i < comingSoon.length - 1 ? { borderBottom: '1px solid var(--ed-border)' } : undefined}
                >
                  <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--ed-text-muted)' }}>{post.title}</h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-faint)' }}>{post.excerpt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl p-8" style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}>
          <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>In the meantime</p>
          <p className="leading-relaxed mb-6" style={{ color: 'var(--ed-text-secondary)' }}>
            Shorter takes, tool discoveries, and things I am thinking about appear more frequently on LinkedIn. Follow along there while longer pieces take shape here.
          </p>
          <a
            href="https://www.linkedin.com/in/anshul-gupta1/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition btn-press"
            style={{ background: 'var(--ed-cta)', color: '#FDFCFA' }}
          >
            Follow on LinkedIn →
          </a>
        </div>

      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
