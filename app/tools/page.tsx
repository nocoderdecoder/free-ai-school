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
    <div className={`border rounded-xl p-6 transition ${isLive ? 'border-white/10 hover:border-white/25 card-hover' : 'border-white/5 opacity-50'}`}
      style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl">{tool.icon}</span>
        <span className={`text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
          isLive
            ? 'text-emerald-400/80 border-emerald-400/30 bg-emerald-400/10'
            : 'text-white/30 border-white/10'
        }`}>
          {tool.status === 'Live' ? 'Live' : 'Coming Soon'}
        </span>
      </div>
      <h2 className="font-semibold text-base mb-2 text-white">{tool.name}</h2>
      <p className="text-white/50 text-sm leading-relaxed mb-5">{tool.tagline}</p>
      {isLive && (
        <a
          href={`/tools/${tool.slug}`}
          data-cursor="Try"
          className="inline-flex items-center gap-2 text-sm border border-white/20 px-4 py-2 rounded-full hover:border-white/40 hover:text-white text-white/70 transition btn-press"
        >
          Try it free →
        </a>
      )}
    </div>
  )
}

export default function Tools() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-16">
        <p className="section-label mb-4">Tools</p>
        <h1 className="heading-page mb-6">AI tools for business professionals.</h1>
        <p className="text-white/60 text-xl leading-relaxed">
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

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
