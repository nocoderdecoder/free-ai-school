import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import {
  PromptGradeIcon,
  SpeakingSpeedIcon,
  AiNewsPipelineIcon,
  CompetitiveIntelIcon,
  HrChatbotIcon,
  CvTailoringIcon,
} from '../components/LabThumbnails'

export const metadata: Metadata = {
  title: 'Lab',
  description: 'Real AI products and automations built without a traditional engineering background — from prompt scoring tools to competitive intelligence scrapers.',
  openGraph: {
    title: 'Lab — AI Products I Have Built',
    description: 'Real AI products and automations built without a traditional engineering background.',
    url: 'https://anshul.ai/lab',
  },
}

const projects = [
  {
    name: "PromptGrade",
    tagline: "AI prompt scoring and rewriting",
    image: "/projects/promptgrade.png",
    url: "https://ratemyprompt.pro",
    status: "Live",
    Icon: PromptGradeIcon,
  },
  {
    name: "Speaking Speed Tester",
    tagline: "Real-time words-per-minute measurement",
    image: "",
    url: "/tools/speaking-speed",
    status: "Live",
    Icon: SpeakingSpeedIcon,
  },
  {
    name: "Daily AI News Pipeline",
    tagline: "RSS headlines, written by Claude, auto-published to Sanity",
    image: "",
    url: "",
    status: "Running",
    Icon: AiNewsPipelineIcon,
  },
  {
    name: "Competitive Intelligence Scraper",
    tagline: "Competitor tracking for strategy teams",
    image: "",
    url: "",
    status: "Internal",
    Icon: CompetitiveIntelIcon,
  },
  {
    name: "HR Assistant Chatbot",
    tagline: "RAG-based answers from internal docs",
    image: "",
    url: "",
    status: "Demo",
    Icon: HrChatbotIcon,
  },
  {
    name: "CV Tailoring System",
    tagline: "Job-description-aware resume rewriting",
    image: "",
    url: "",
    status: "Built",
    Icon: CvTailoringIcon,
  },
]

const statusColor: Record<string, string> = {
  Live:     "bg-emerald-500",
  Running:  "bg-blue-500",
  Internal: "bg-amber-500",
  Demo:     "bg-purple-500",
  Built:    "bg-[var(--ed-text-light)]",
}

function ProjectCard({ project }: { project: typeof projects[number] }) {
  const isExternal = project.url.startsWith('http')

  const inner = (
    <>
      <div className="relative w-full aspect-video overflow-hidden" style={{ background: 'var(--ed-card-warm)' }}>
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
            <project.Icon />
          </div>
        )}

        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 backdrop-blur-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.85)' }}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor[project.status] ?? 'bg-[var(--ed-text-light)]'}`} />
          <span className="text-[10px]" style={{ color: 'var(--ed-text-muted)' }}>{project.status}</span>
        </div>
      </div>

      <div className="p-4">
        <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--ed-text-dark)' }}>{project.name}</h2>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>{project.tagline}</p>
      </div>
    </>
  )

  const sharedStyle = { background: 'var(--ed-card-warm)', borderRadius: 14 }
  const sharedClass = "ed-list-card card-hover block overflow-hidden transition group"

  if (project.url) {
    return (
      <a
        href={project.url}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        data-cursor={isExternal ? 'Visit' : 'View'}
        className={sharedClass}
        style={sharedStyle}
      >
        {inner}
      </a>
    )
  }

  return <div className={sharedClass} style={sharedStyle}>{inner}</div>
}

export default function Lab() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="text-sm mb-4 uppercase tracking-widest" style={{ color: 'var(--ed-text-faint)' }}>Lab</p>
        <h1 className="text-5xl leading-tight mb-6" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>Things I have<br />built with AI.</h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Real products and automations. Some are live, some run internally, all built without a traditional engineering background.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-8 pb-20">
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
