import type { Metadata } from 'next'
import { Nav } from '../components/Nav'

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Honest takes on AI in business — what I am building, what is working, what failed, and what is actually happening in AI from someone doing it daily.',
  openGraph: {
    title: 'Writing — Honest Takes on AI in Business',
    description: 'What I am building, what is working, what failed, and what is actually happening in AI — from someone doing it daily, not just writing about it.',
    url: 'https://anshul.ai/writing',
  },
}

const upcomingTopics = [
  {
    title: "Why your company's AI strategy is backwards",
    preview: "Most organisations are asking 'what can AI do?' The question that produces results is different.",
  },
  {
    title: "What I learned building 6 AI products without writing code",
    preview: "The tools changed. The thinking required did not. Here is what actually matters when you build.",
  },
  {
    title: "The AI adoption gap nobody talks about",
    preview: "It is not about access to tools. Almost everyone has access. The gap is something else entirely.",
  },
  {
    title: "How to evaluate an AI vendor without a technical team",
    preview: "The questions that expose whether a product is real, the red flags that do not show up in demos.",
  },
]

export default function Writing() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-16">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Writing</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Honest takes on<br />AI in business.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed mb-16">
          What I am building, what is working, what failed, and what I think is actually happening in AI — from someone doing it daily, not just writing about it.
        </p>

        {/* Coming soon state with previews */}
        <div className="mb-16">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-8">Coming soon</p>
          <div className="space-y-0">
            {upcomingTopics.map((topic, i) => (
              <div
                key={topic.title}
                className={`py-7 ${i < upcomingTopics.length - 1 ? 'border-b border-white/10' : ''}`}
              >
                <h2 className="text-lg font-semibold mb-2 text-white/80">{topic.title}</h2>
                <p className="text-white/40 text-sm leading-relaxed">{topic.preview}</p>
              </div>
            ))}
          </div>
        </div>

        {/* LinkedIn bridge */}
        <div className="border border-white/10 rounded-xl p-8">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-4">In the meantime</p>
          <p className="text-white/70 leading-relaxed mb-6">
            I publish daily on LinkedIn — shorter takes, tool discoveries, and things I am thinking about. Follow along there while longer pieces take shape here.
          </p>
          <a
            href="https://www.linkedin.com/in/anshul-gupta1/"
            target="_blank"
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-medium text-sm hover:bg-white/90 transition"
          >
            Follow on LinkedIn →
          </a>
        </div>

      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
