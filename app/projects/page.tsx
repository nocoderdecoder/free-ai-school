import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { createClient } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Real products, platforms, and automations — built at the intersection of AI and business strategy, without a traditional engineering background.',
  openGraph: {
    title: 'Projects — Things I Have Built with AI',
    description: 'Real products, platforms, and automations — built at the intersection of AI and business strategy, without a traditional engineering background.',
    url: 'https://anshul.ai/projects',
  },
}

export const revalidate = 3600

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

type Project = {
  name: string
  tagline: string
  slug?: string
  url?: string
  status: string
  image?: string
  excerpt?: string
  impact?: string
  tools?: string[]
  featured?: boolean
}

const STATIC_PROJECTS: Project[] = [
  {
    name: "anshul.ai Platform",
    tagline: "Full-stack AI education platform with automated content pipelines",
    status: "Live",
    impact: "94 articles automated, 0 manual hours per publish",
  },
  {
    name: "PromptGrade",
    tagline: "AI prompt scoring and rewriting",
    url: "https://ratemyprompt.pro",
    status: "Live",
  },
  {
    name: "Speaking Speed Tester",
    tagline: "Real-time words-per-minute measurement",
    url: "/tools/speaking-speed",
    status: "Live",
  },
  {
    name: "AI News → LinkedIn Pipeline",
    tagline: "Automated content from signal to draft",
    status: "Running",
  },
  {
    name: "Competitive Intelligence Scraper",
    tagline: "Competitor tracking for strategy teams",
    status: "Internal",
  },
  {
    name: "HR Assistant Chatbot",
    tagline: "RAG-based answers from internal docs",
    status: "Demo",
  },
  {
    name: "CV Tailoring System",
    tagline: "Job-description-aware resume rewriting",
    status: "Built",
  },
]

const statusColor: Record<string, string> = {
  Live:     "#2E7D4F",
  Running:  "#3B5BA9",
  Internal: "#B45309",
  Demo:     "#7C3AED",
  Built:    "var(--ed-text-light)",
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function ProjectCard({ project }: { project: Project }) {
  const isExternalUrl = project.url?.startsWith('http')
  const hasDetailPage = !!project.slug
  const href = hasDetailPage ? `/projects/${project.slug}` : (project.url ?? '')

  const inner = (
    <>
      <div className="relative w-full aspect-video overflow-hidden" style={{ background: 'var(--ed-card-hover)' }}>
        {project.image ? (
          <img
            src={project.image}
            alt={project.name}
            className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(0,0,0,0.04) 24px),' +
                'repeating-linear-gradient(90deg,transparent,transparent 23px,rgba(0,0,0,0.04) 24px)',
            }}
          >
            <span className="text-3xl font-bold tracking-widest select-none" style={{ color: 'var(--ed-text-light)' }}>
              {initials(project.name)}
            </span>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 backdrop-blur-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.85)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor[project.status] ?? 'var(--ed-text-light)' }} />
          <span className="text-[10px]" style={{ color: 'var(--ed-text-muted)' }}>{project.status}</span>
        </div>
      </div>
      <div className="p-4">
        <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--ed-text)' }}>{project.name}</h2>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{project.tagline}</p>
        {project.impact && (
          <p className="text-xs mt-2 font-medium" style={{ color: '#2E7D4F' }}>{project.impact}</p>
        )}
      </div>
    </>
  )

  const shared = "block rounded-xl overflow-hidden transition group ed-list-card card-hover"
  const sharedStyle = { background: 'var(--ed-card-warm)', borderRadius: '14px' }

  if (href) {
    return (
      <a
        href={href}
        target={isExternalUrl && !hasDetailPage ? '_blank' : undefined}
        rel={isExternalUrl && !hasDetailPage ? 'noopener noreferrer' : undefined}
        data-cursor="View"
        className={shared}
        style={sharedStyle}
      >
        {inner}
      </a>
    )
  }

  return <div className={shared} style={sharedStyle}>{inner}</div>
}

export default async function Projects() {
  let projects: Project[] = []

  try {
    const sanityProjects = await client.fetch(
      `*[_type == "project"] | order(featured desc, _createdAt asc) {
        name,
        "slug": slug.current,
        tagline,
        status,
        featured,
        url,
        impact,
        tools,
        excerpt,
        "image": coverImage.asset->url,
      }`
    )
    projects = sanityProjects?.length > 0 ? sanityProjects : STATIC_PROJECTS
  } catch {
    projects = STATIC_PROJECTS
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Projects</p>
        <h1 className="mb-6 text-5xl leading-tight" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>Things I have built with AI.</h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Real products, platforms, and automations — built at the intersection of AI and business strategy, without a traditional engineering background.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
