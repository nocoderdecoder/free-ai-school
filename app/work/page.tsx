import type { Metadata } from 'next'
import { Nav } from '../components/Nav'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Professional accomplishments in AI, GTM strategy, and digital transformation at Google, Unilever, and beyond.',
  openGraph: {
    title: 'Work — Professional Impact',
    description: 'AI strategy, digital transformation, and GTM leadership across Google, Unilever, and Kellogg.',
    url: 'https://anshul.ai/work',
  },
}

const accomplishments = [
  {
    org: "Google",
    title: "AI-Powered Competitive Intelligence Dashboard",
    description: "Led development of an AI dashboard enabling global teams to analyse consumer ratings and reviews at scale, driving data-informed business decisions across markets.",
    tags: ["AI", "GTM Strategy", "Business Intelligence"],
  },
  {
    org: "Google",
    title: "AI Analytics Dashboard — 300+ Users",
    description: "Built an AI-powered analytics dashboard adopted by 300+ professionals year-to-date, transforming how teams access and act on business intelligence.",
    tags: ["AI", "Product Development", "Adoption"],
  },
  {
    org: "Hindustan Unilever",
    title: "National GTM Transformation — GSK Acquisition",
    description: "Led national-scale change management for Hindustan Unilever's acquisition of GSK Consumer Healthcare. Unified sales teams, distributors, order processing tools, and analytics systems. Designed new GTM models during the pandemic and built incentive structures for the integrated sales force.",
    tags: ["Change Management", "GTM", "Digital Transformation"],
  },
  {
    org: "Kellogg / Uber",
    title: "Shuttle Service Launch Strategy",
    description: "Developed go-to-market strategy for Uber's shuttle service launch during a 3-month consulting engagement through Kellogg School of Management.",
    tags: ["GTM Strategy", "Consulting", "Product Launch"],
  },
]

export default function Work() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label mb-4" style={{ color: 'var(--ed-text-faint)' }}>Work</p>
        <h1 className="heading-page mb-6" style={{fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)'}}>
          Professional<br />impact.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          AI strategy, digital transformation, and GTM leadership — applying technology to business problems at national and global scale.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32">
        <div className="space-y-6">
          {accomplishments.map((item, i) => (
            <div
              key={i}
              className="ed-list-card rounded-xl p-8 transition"
              style={{ background: 'var(--ed-card-warm)', borderRadius: 14 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--ed-text-muted)' }}>{item.org}</span>
              </div>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--ed-text-dark)' }}>{item.title}</h2>
              <p className="leading-relaxed mb-4" style={{ color: 'var(--ed-text-secondary)' }}>{item.description}</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--ed-card-warm)', color: 'var(--ed-text-faint)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-8 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--ed-border)', color: 'var(--ed-text-faint)' }}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
