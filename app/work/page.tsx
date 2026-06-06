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
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Work</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Professional<br />impact.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          AI strategy, digital transformation, and GTM leadership — applying technology to business problems at national and global scale.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-32">
        <div className="space-y-6">
          {accomplishments.map((item, i) => (
            <div
              key={i}
              className="border border-white/10 rounded-xl p-8 hover:border-white/20 transition"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-white/40 text-xs uppercase tracking-widest">{item.org}</span>
              </div>
              <h2 className="text-xl font-bold mb-3">{item.title}</h2>
              <p className="text-white/60 leading-relaxed mb-4">{item.description}</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-widest text-white/30 border border-white/10 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
