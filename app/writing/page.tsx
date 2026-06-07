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
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4">Writing</p>
        <h1 className="heading-page mb-6">
          Honest takes on<br />AI in business.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          What I am building, what is working, what failed, and what I think is actually happening in AI — from someone doing it daily, not just writing about it.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32 space-y-16">

        {published.length > 0 && (
          <div>
            <p className="section-label mb-8">Published</p>
            <div className="space-y-3">
              {published.map((post) => (
                <a
                  key={post.slug ?? post.title}
                  href={`/writing/${post.slug}`}
                  className="group block border border-white/10 rounded-xl p-6 hover:border-white/25 transition card-hover"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h2 className="text-base font-semibold mb-2 text-white/90 group-hover:text-white transition leading-snug">
                        {post.title}
                      </h2>
                      <p className="text-white/40 text-sm leading-relaxed">{post.excerpt}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {post.publishedAt && (
                        <p className="text-white/25 text-xs">{formatDate(post.publishedAt)}</p>
                      )}
                      {post.readTime && (
                        <p className="text-white/20 text-xs mt-1">{post.readTime} min read</p>
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
            <p className="section-label mb-8">{published.length > 0 ? 'Coming soon' : 'Upcoming'}</p>
            <div className="space-y-0">
              {comingSoon.map((post, i) => (
                <div
                  key={post.title}
                  className={`py-7 ${i < comingSoon.length - 1 ? 'border-b border-white/10' : ''}`}
                >
                  <h2 className="text-lg font-semibold mb-2 text-white/60">{post.title}</h2>
                  <p className="text-white/35 text-sm leading-relaxed">{post.excerpt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border border-white/10 rounded-xl p-8">
          <p className="section-label mb-4">In the meantime</p>
          <p className="text-white/70 leading-relaxed mb-6">
            Shorter takes, tool discoveries, and things I am thinking about appear more frequently on LinkedIn. Follow along there while longer pieces take shape here.
          </p>
          <a
            href="https://www.linkedin.com/in/anshul-gupta1/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-medium text-sm hover:bg-white/90 transition btn-press"
          >
            Follow on LinkedIn →
          </a>
        </div>

      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
