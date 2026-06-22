import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { ScrollSection } from '../components/ScrollSection'

export const metadata: Metadata = {
  title: 'AI Tools for Business Professionals',
  description: 'Practical AI tools built on Claude — GTM playbooks, readiness assessments, ROI calculators. Free to use.',
  openGraph: {
    title: 'AI Tools — anshul.ai',
    description: 'Practical AI tools built on Claude — GTM playbooks, readiness assessments, ROI calculators.',
    url: 'https://anshul.ai/tools',
  },
}

const TOOLS = [
  {
    slug: 'ai-learning-compass',
    name: 'AI Learning Compass',
    tagline: 'Answer five questions by voice or text. Get a personal 30-day AI learning roadmap.',
    status: 'Live' as const,
    icon: '🧭',
  },
  {
    slug: 'speaking-speed',
    name: 'Speaking Speed Tester',
    tagline: 'Measure your words per minute in real time. Know if you speak too fast or too slow.',
    status: 'Live' as const,
    icon: '🎙️',
  },
  {
    slug: 'gtm-playbook',
    name: 'GTM Playbook Generator',
    tagline: 'Describe your product and target market. Get a tailored go-to-market strategy in 60 seconds.',
    status: 'Live' as const,
    icon: '🚀',
  },
  {
    slug: 'ai-readiness',
    name: 'AI Readiness Assessment',
    tagline: 'Score your organisation\'s AI readiness and get a prioritised adoption roadmap.',
    status: 'Live' as const,
    icon: '📊',
  },
  {
    slug: 'roi-calculator',
    name: 'AI ROI Calculator',
    tagline: 'Input your team size and tasks. See estimated time and cost savings from AI adoption.',
    status: 'Live' as const,
    icon: '💰',
  },
  {
    slug: 'ai-tool-recommender',
    name: 'AI Tool Recommender',
    tagline: 'Tell me your use case, budget, and skill level. Get a curated tool shortlist.',
    status: 'Live' as const,
    icon: '🔍',
  },
  {
    slug: 'meeting-brief',
    name: 'Meeting Brief Generator',
    tagline: 'Walk into any meeting with a sharp, AI-generated prep brief in seconds.',
    status: 'Live' as const,
    icon: '📝',
  },
  {
    slug: 'competitive-analysis',
    name: 'Competitive Analysis Generator',
    tagline: 'Enter your product and a competitor. Get a sharp competitive brief with battle card talking points.',
    status: 'Live' as const,
    icon: '⚔️',
  },
]

function ToolCard({ tool }: { tool: typeof TOOLS[0] }) {
  const isLive = tool.status === 'Live'
  return (
    <div
      className={`rounded-xl p-6 transition ${isLive ? 'ed-list-card card-hover' : 'opacity-50'}`}
      style={{ background: 'var(--ed-card-warm)', borderRadius: 14 }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl">{tool.icon}</span>
        <span
          className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full"
          style={
            isLive
              ? { backgroundColor: '#E6F4EA', color: '#2E7D4F' }
              : { backgroundColor: 'var(--ed-card-warm)', color: 'var(--ed-text-light)' }
          }
        >
          {tool.status === 'Live' ? 'Live' : 'Coming Soon'}
        </span>
      </div>
      <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--ed-text-dark)' }}>{tool.name}</h2>
      <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--ed-text-muted)' }}>{tool.tagline}</p>
      {isLive && (
        <a
          href={`/tools/${tool.slug}`}
          data-cursor="Try it"
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full transition btn-press"
          style={{ background: 'var(--ed-card-warm)', color: 'var(--ed-text-secondary)', border: '1px solid var(--ed-border)' }}
        >
          Try it free →
        </a>
      )}
    </div>
  )
}

export default function Tools() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-16">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Tools</p>
        <h1 className="heading-page mb-6" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>AI tools for business professionals.</h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Practical tools built on Claude. Free to use. No account required.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <ScrollSection key={tool.slug}>
              <ToolCard tool={tool} />
            </ScrollSection>
          ))}
        </div>
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
