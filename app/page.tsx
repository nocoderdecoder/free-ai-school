import { CursorSpotlight } from './components/CursorSpotlight'
import { ScrollReveal } from './components/ScrollReveal'

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* Interactive effects — cursor glow + noise grain */}
      <CursorSpotlight />

      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-white/10">
        <a href="/" className="font-bold text-lg">Anshul Gupta</a>
        <div className="flex gap-6 text-sm text-white/60">
          <a href="/about" className="hover:text-white transition">About</a>
          <a href="/lab" className="hover:text-white transition">Lab</a>
          <a href="/learn" className="hover:text-white transition">Learn</a>
          <a href="/writing" className="hover:text-white transition">Writing</a>
        </div>
      </nav>

      {/* Hero — animates in on page load */}
      <section className="max-w-3xl mx-auto px-8 py-24">
        <p className="hero-label text-white/40 text-sm mb-4 uppercase tracking-widest">
          anshul.ai
        </p>
        <h1 className="hero-heading text-5xl font-bold leading-tight mb-6">
          <span className="shimmer-text">I build with AI.</span>
          <br />I teach what I learn.
        </h1>
        <p className="hero-sub text-white/60 text-xl leading-relaxed mb-10">
          GTM Strategy at Google. Kellogg MBA. I ship real AI products without an engineering background and share everything along the way.
        </p>
        <div className="hero-ctas flex gap-4 flex-wrap">
          <a href="/lab" className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition">
            See what I built
          </a>
          <a href="/learn" className="border border-white/20 px-6 py-3 rounded-full font-medium hover:border-white/40 transition">
            Learn AI with me
          </a>
          <a href="https://www.linkedin.com/in/anshulgupta1512" target="_blank" className="border border-white/20 px-6 py-3 rounded-full font-medium hover:border-white/40 transition">
            Follow on LinkedIn
          </a>
        </div>
      </section>

      {/* Credential strip — fades in as it enters view */}
      <ScrollReveal>
        <section className="border-y border-white/10 py-5">
          <div className="max-w-3xl mx-auto px-8 flex items-center gap-3 flex-wrap">
            <span className="text-white/30 text-xs uppercase tracking-widest mr-1">Background</span>
            <span className="text-white/70 text-sm font-medium">Google</span>
            <span className="text-white/20 text-sm">·</span>
            <span className="text-white/70 text-sm font-medium">Kellogg / Northwestern</span>
            <span className="text-white/20 text-sm">·</span>
            <span className="text-white/70 text-sm font-medium">Uber</span>
          </div>
        </section>
      </ScrollReveal>

      {/* Three sections — staggered fade-up as you scroll */}
      <section className="max-w-3xl mx-auto px-8 py-16 grid grid-cols-1 gap-0">

        <ScrollReveal delay={0}>
          <div className="border-b border-white/10 py-12">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Lab</p>
            <h2 className="text-2xl font-bold mb-3">AI products I have built</h2>
            <p className="text-white/60 leading-relaxed mb-6 max-w-xl">
              From prompt scoring tools to competitive intelligence scrapers. Real products built without writing a single line of code from scratch.
            </p>
            <a href="/lab" className="inline-flex items-center gap-2 text-sm text-white hover:text-white/70 transition border border-white/20 px-4 py-2 rounded-full hover:border-white/40">
              View all projects →
            </a>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="border-b border-white/10 py-12">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Free AI School</p>
            <h2 className="text-2xl font-bold mb-3">AI education for business professionals</h2>
            <p className="text-white/60 leading-relaxed mb-6 max-w-xl">
              No prerequisites. No engineering degree. A complete curriculum for the people who run teams, make decisions, and want to actually use AI at work.
            </p>
            <a href="/learn" className="inline-flex items-center gap-2 text-sm text-white hover:text-white/70 transition border border-white/20 px-4 py-2 rounded-full hover:border-white/40">
              Start learning →
            </a>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="py-12">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Writing</p>
            <h2 className="text-2xl font-bold mb-3">Honest takes on AI in business</h2>
            <p className="text-white/60 leading-relaxed mb-6 max-w-xl">
              What I am building, what is working, what failed, and what I think is actually happening in AI right now.
            </p>
            <a href="/writing" className="inline-flex items-center gap-2 text-sm text-white hover:text-white/70 transition border border-white/20 px-4 py-2 rounded-full hover:border-white/40">
              Read the writing →
            </a>
          </div>
        </ScrollReveal>

      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>

    </main>
  )
}
