import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Nav } from '../../components/Nav'
import { createClient } from 'next-sanity'
import { PortableText } from '@portabletext/react'
import { editorialComponents } from '../../components/PortableTextComponents'
import { JsonLd, articleSchema } from '../../components/JsonLd'

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

export async function generateStaticParams() {
  try {
    const projects = await client.fetch(
      `*[_type == "project" && defined(slug.current)] { "slug": slug.current }`
    )
    return (projects ?? []).map((p: { slug: string }) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const project = await client.fetch(
      `*[_type == "project" && slug.current == $slug][0] { name, tagline, excerpt }`,
      { slug }
    )
    if (!project) return { title: 'Project Not Found' }
    return {
      title: project.name,
      description: project.excerpt ?? project.tagline,
      alternates: {
        canonical: `https://anshul.ai/projects/${slug}`,
      },
      openGraph: {
        title: `${project.name} — Anshul Gupta`,
        description: project.excerpt ?? project.tagline,
        url: `https://anshul.ai/projects/${slug}`,
      },
    }
  } catch {
    return { title: 'Project' }
  }
}

const statusColor: Record<string, string> = {
  Live:     "#2E7D4F",
  Running:  "#3B5BA9",
  Internal: "#B45309",
  Demo:     "#7C3AED",
  Built:    "var(--ed-text-light)",
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let project: any = null
  try {
    project = await client.fetch(
      `*[_type == "project" && slug.current == $slug][0] {
        name,
        tagline,
        status,
        year,
        url,
        tools,
        impact,
        excerpt,
        body,
        "coverImage": coverImage.asset->url,
      }`,
      { slug }
    )
  } catch {}

  if (!project) notFound()

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <JsonLd
        data={articleSchema({
          title: project.name,
          description: project.excerpt ?? project.tagline,
          url: `https://anshul.ai/projects/${slug}`,
        })}
      />
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-12">
        <a href="/projects" className="section-label mb-8 inline-block transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>
          ← Projects
        </a>

        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'var(--ed-card-warm)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor[project.status] ?? 'var(--ed-text-light)' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ed-text-muted)' }}>{project.status}</span>
          </div>
          {project.year && (
            <span className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{project.year}</span>
          )}
        </div>

        <h1 className="heading-page mb-4" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>{project.name}</h1>
        <p className="text-xl leading-relaxed mb-8" style={{ color: 'var(--ed-text-muted)' }}>{project.tagline}</p>

        <div className="flex flex-wrap gap-6 py-6" style={{ borderTop: '1px solid var(--ed-border)', borderBottom: '1px solid var(--ed-border)' }}>
          {project.impact && (
            <div>
              <p className="section-label mb-1" style={{ color: 'var(--ed-text-faint)' }}>Impact</p>
              <p className="text-sm font-medium" style={{ color: '#2E7D4F' }}>{project.impact}</p>
            </div>
          )}
          {project.url && (
            <div>
              <p className="section-label mb-1" style={{ color: 'var(--ed-text-faint)' }}>Live at</p>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="Visit"
                className="text-sm transition underline underline-offset-2 link-slide"
                style={{ color: 'var(--ed-text-secondary)' }}
              >
                {project.url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {project.tools?.length > 0 && (
            <div>
              <p className="section-label mb-2" style={{ color: 'var(--ed-text-faint)' }}>Built with</p>
              <div className="flex flex-wrap gap-1.5">
                {project.tools.map((tool: string) => (
                  <span
                    key={tool}
                    className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ color: 'var(--ed-text-light)', border: '1px solid var(--ed-border)' }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {project.coverImage && (
        <section className="max-w-3xl mx-auto px-8 mb-12">
          <img
            src={project.coverImage}
            alt={project.name}
            className="w-full rounded-xl"
            style={{ border: '1px solid var(--ed-border)' }}
          />
        </section>
      )}

      <section className="max-w-3xl mx-auto px-8 pb-32">
        {project.body ? (
          <div className="prose prose-lg max-w-none">
            <PortableText value={project.body} components={editorialComponents} />
          </div>
        ) : (
          <div className="rounded-xl p-10 text-center" style={{ border: '1px solid var(--ed-border)' }}>
            <p className="text-sm" style={{ color: 'var(--ed-text-light)' }}>Case study coming soon.</p>
          </div>
        )}
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
