import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { ScrollSection } from '../components/ScrollSection'

export const metadata: Metadata = {
  title: 'About',
  description: 'Anshul Gupta — AI strategy leader building at the intersection of business and AI. GTM at Google, Kellogg MBA, building AI tools and education for business professionals.',
  openGraph: {
    title: 'About — Anshul Gupta',
    description: 'AI strategy leader building at the intersection of business and AI. GTM at Google, Kellogg MBA.',
    url: 'https://anshul.ai/about',
  },
}

const timeline = [
  {
    period: "2013–2018",
    org: "Hindustan Unilever / GSK",
    role: "Brand Manager & GTM Lead",
    detail: "Built commercial operations across rural and urban India. Led national go-to-market integration for Hindustan Unilever's acquisition of GSK Consumer Healthcare — merging sales teams, order management systems, analytics tools, and incentive structures across thousands of distributors during the pandemic.",
    tags: ["GTM", "Change Management", "Digital Transformation"],
  },
  {
    period: "2019–2020",
    org: "Kellogg School of Management",
    role: "MBA — Northwestern University",
    detail: "Strategy, leadership, and management from one of the world's leading business schools. Consulting engagement with Uber on go-to-market strategy for their shuttle service launch.",
    tags: ["Strategy", "MBA", "Consulting"],
  },
  {
    period: "2021–Present",
    org: "Google",
    role: "GTM Strategy & Business Intelligence",
    detail: "Go-to-market strategy and business intelligence for one of the world's most advanced AI organisations. Built AI-powered dashboards adopted by 300+ professionals for competitive intelligence and market analysis. Working at the frontier of how AI reshapes commercial strategy.",
    tags: ["AI", "GTM", "Business Intelligence"],
  },
  {
    period: "2024–Present",
    org: "anshul.ai",
    role: "Builder & Educator",
    detail: "Building an AI education platform and toolset from scratch — no engineering team, no funding, no prior coding experience. 94 articles automated, 6 tools shipped, thousands of learners. The platform is both a proof of concept and a live demonstration of what's possible when business professionals build with AI.",
    tags: ["Building", "Education", "AI Tools"],
  },
]

export default function About() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 pt-28 pb-16">
        <div className="flex flex-col sm:flex-row gap-10 items-start">
          {/* Headshot placeholder */}
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-white/10 flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-card)' }}
            aria-label="Headshot"
          >
            <span className="text-white/20 text-2xl font-bold">AG</span>
          </div>

          <div className="flex-1">
            <p className="section-label mb-3">About</p>
            <h1 className="heading-page mb-4">
              Anshul Gupta
            </h1>
            <p className="text-white/50 text-lg leading-relaxed">
              GTM Strategy at Google · Kellogg MBA · Builder
            </p>
          </div>
        </div>
      </section>

      {/* Endeavor framing */}
      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-16">
          <div className="space-y-5">
            <p className="text-white/80 text-lg leading-relaxed">
              I am working on democratizing AI for business and GTM professionals. The gap I keep seeing: most people in commercial roles know AI exists but do not know how to use it in their actual work — how to evaluate it, how to build with it, or how to lead a team through adopting it.
            </p>
            <p className="text-white/70 text-lg leading-relaxed">
              My answer is to build tools and education in public, share the process openly, and prove that meaningful AI products can be built by business-minded people without an engineering background.
            </p>
            <p className="text-white/70 text-lg leading-relaxed">
              This site is both the work and the evidence — a live platform built and operated by one person using AI tools, reaching learners and practitioners who want to actually use AI, not just read about it.
            </p>
          </div>
        </section>
      </ScrollSection>

      {/* Career arc */}
      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-16">
          <p className="section-label mb-10">Career</p>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <div
                key={item.org}
                className={`py-8 ${i < timeline.length - 1 ? 'border-b border-white/10' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 sm:justify-between mb-3">
                  <div>
                    <span className="text-white font-semibold">{item.org}</span>
                    <span className="text-white/40 text-sm ml-3">{item.role}</span>
                  </div>
                  <span className="text-white/25 text-xs sm:ml-4 shrink-0">{item.period}</span>
                </div>
                <p className="text-white/55 text-sm leading-relaxed mb-4">{item.detail}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-widest text-white/25 border border-white/10 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollSection>

      {/* Evidence links */}
      <ScrollSection>
        <section className="max-w-3xl mx-auto px-8 pb-32">
          <p className="section-label mb-8">Explore</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { href: '/work',      label: 'Professional work',      desc: 'AI dashboards, GTM transformation, strategic impact at scale' },
              { href: '/projects',  label: 'What I have built',      desc: 'Products, tools, and automations shipped without an engineering team' },
              { href: '/learn',     label: 'The AI School',          desc: '94 articles, 5 modules — practical AI for business professionals' },
              { href: '/writing',   label: 'Writing',                desc: 'Honest takes on building with AI and what is actually happening in the field' },
              { href: '/analysis',  label: 'Daily AI analysis',      desc: 'What is happening in AI, every day, analysed for business context' },
              { href: '/downloads', label: 'Downloadable resources', desc: 'Cheatsheets, frameworks, and guides for AI practitioners' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="border border-white/10 rounded-xl p-6 hover:border-white/25 transition card-hover group"
              >
                <h2 className="font-semibold text-sm mb-1.5 group-hover:text-white transition">{link.label} →</h2>
                <p className="text-white/40 text-xs leading-relaxed">{link.desc}</p>
              </a>
            ))}
          </div>
        </section>
      </ScrollSection>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
