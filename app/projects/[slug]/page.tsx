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
  Live:     "bg-emerald-500",
  Running:  "bg-blue-500",
  Internal: "bg-amber-500",
  Demo:     "bg-purple-500",
  Built:    "bg-white/40",
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
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-12">
        <a href="/projects" className="section-label mb-8 inline-block hover:text-white transition">
          ← Projects
        </a>

        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor[project.status] ?? 'bg-white/20'}`} />
            <span className="text-[10px] text-white/50 uppercase tracking-widest">{project.status}</span>
          </div>
          {project.year && (
            <span className="text-white/30 text-xs">{project.year}</span>
          )}
        </div>

        <h1 className="heading-page mb-4">{project.name}</h1>
        <p className="text-white/60 text-xl leading-relaxed mb-8">{project.tagline}</p>

        <div className="flex flex-wrap gap-6 py-6 border-y border-white/10">
          {project.impact && (
            <div>
              <p className="section-label mb-1">Impact</p>
              <p className="text-emerald-400 text-sm font-medium">{project.impact}</p>
            </div>
          )}
          {project.url && (
            <div>
              <p className="section-label mb-1">Live at</p>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/70 hover:text-white transition underline underline-offset-2"
              >
                {project.url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {project.tools?.length > 0 && (
            <div>
              <p className="section-label mb-2">Built with</p>
              <div className="flex flex-wrap gap-1.5">
                {project.tools.map((tool: string) => (
                  <span
                    key={tool}
                    className="text-[10px] uppercase tracking-widest text-white/30 border border-white/10 px-2.5 py-1 rounded-full"
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
            className="w-full rounded-xl border border-white/10"
          />
        </section>
      )}

      <section className="max-w-3xl mx-auto px-8 pb-32">
        {project.body ? (
          <div className="prose prose-invert prose-lg max-w-none">
            <PortableText value={project.body} components={portableTextComponents} />
          </div>
        ) : (
          <div className="border border-white/10 rounded-xl p-10 text-center">
            <p className="text-white/30 text-sm">Case study coming soon.</p>
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
