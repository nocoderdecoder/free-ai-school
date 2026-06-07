import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Nav } from '../../components/Nav'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import { portableTextComponents } from '../../components/PortableTextComponents'

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

export async function generateStaticParams() {
  try {
    const posts = await client.fetch(
      `*[_type == "post" && status == "published" && defined(slug.current)] { "slug": slug.current }`
    )
    return (posts ?? []).map((p: { slug: string }) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const post = await client.fetch(
      `*[_type == "post" && slug.current == $slug][0] { title, excerpt }`,
      { slug }
    )
    if (!post) return { title: 'Post Not Found' }
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: {
        title: `${post.title} — Anshul Gupta`,
        description: post.excerpt,
        url: `https://anshul.ai/writing/${slug}`,
      },
    }
  } catch {
    return { title: 'Post' }
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function WritingPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let post: any = null
  try {
    post = await client.fetch(
      `*[_type == "post" && slug.current == $slug && status == "published"][0] {
        title, excerpt, publishedAt, readTime, body
      }`,
      { slug }
    )
  } catch {}

  if (!post) notFound()

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <article className="max-w-3xl mx-auto px-8 pt-28 pb-32">
        <a href="/writing" className="section-label mb-8 inline-block hover:text-white transition">
          ← Writing
        </a>

        <header className="mt-4 mb-12">
          <h1 className="heading-page mb-6">{post.title}</h1>
          <div className="flex items-center gap-4">
            {post.publishedAt && (
              <span className="text-white/30 text-sm">{formatDate(post.publishedAt)}</span>
            )}
            {post.readTime && (
              <span className="text-white/20 text-sm">{post.readTime} min read</span>
            )}
          </div>
          {post.excerpt && (
            <p className="text-white/60 text-xl leading-relaxed mt-6 border-l-2 border-white/10 pl-6">
              {post.excerpt}
            </p>
          )}
        </header>

        {post.body && (
          <div className="prose prose-invert prose-lg max-w-none">
            <PortableText value={post.body} components={portableTextComponents} />
          </div>
        )}
      </article>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
