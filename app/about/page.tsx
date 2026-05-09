import { Nav } from '../components/Nav'

const roles = [
  {
    org: "Google",
    title: "GTM Strategy & Business Intelligence",
    period: "Current",
    detail: "Go-to-market strategy and data-driven decision making for one of the world's most advanced AI organisations.",
  },
  {
    org: "Kellogg School of Management",
    title: "MBA — Northwestern University",
    period: "Alumni",
    detail: "Business strategy, leadership, and management education from one of the top business schools in the world.",
  },
  {
    org: "Uber",
    title: "Strategy & Operations",
    period: "Previously",
    detail: "Worked on market strategy and operations at global scale during one of the most consequential growth periods in tech.",
  },
  {
    org: "Unilever",
    title: "Brand Management",
    period: "Previously",
    detail: "Consumer brand strategy and commercial operations across global markets.",
  },
]

export default function About() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-16">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">About</p>
        <h1 className="text-5xl font-bold leading-tight mb-10">
          Builder. Educator.<br />Business leader.
        </h1>

        {/* Bio */}
        <div className="space-y-5 mb-16">
          <p className="text-white/70 text-lg leading-relaxed">
            I am Anshul Gupta — a GTM Strategy and Business Intelligence leader at Google, Kellogg MBA, and someone who builds real AI products without an engineering degree.
          </p>
          <p className="text-white/70 text-lg leading-relaxed">
            I started building with AI because I was convinced that the most important skill gap in business was not technical — it was practical. Most professionals know AI exists. Very few know how to use it in their actual work, how to evaluate it, or how to lead a team through adopting it.
          </p>
          <p className="text-white/70 text-lg leading-relaxed">
            This site is my answer to that gap. The Lab is where I build. The School is where I teach. The Writing is where I think in public.
          </p>
        </div>

        {/* Roles */}
        <div className="mb-16">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-8">Experience & Education</p>
          <div className="space-y-0">
            {roles.map((role, i) => (
              <div
                key={role.org}
                className={`py-7 ${i < roles.length - 1 ? 'border-b border-white/10' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-lg font-bold">{role.org}</h2>
                    <p className="text-white/60 text-sm">{role.title}</p>
                  </div>
                  <span className="text-white/30 text-xs ml-4 shrink-0 mt-1">{role.period}</span>
                </div>
                <p className="text-white/50 text-sm leading-relaxed mt-3">{role.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What I do here */}
        <div className="border border-white/10 rounded-xl p-8">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-6">What I do here</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Build</h3>
              <p className="text-white/50 text-sm leading-relaxed">Ship real AI products — tools, automations, and systems — and share the process openly.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Teach</h3>
              <p className="text-white/50 text-sm leading-relaxed">A free AI curriculum for business professionals. No engineering background required.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Write</h3>
              <p className="text-white/50 text-sm leading-relaxed">Honest takes on what is actually happening in AI, from someone building and using it daily.</p>
            </div>
          </div>
        </div>

      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
