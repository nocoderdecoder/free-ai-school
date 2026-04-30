export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">

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

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 py-24">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">anshul.ai</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          I build with AI.<br />I teach what I learn.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed mb-10">
          GTM Strategy at Google. Kellogg MBA. I am a non-engineer who ships real AI products and shares everything along the way.
        </p>
        <div className="flex gap-4 flex-wrap">
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

      {/* Three sections */}
      <section className="border-t border-white/10 max-w-3xl mx-auto px-8 py-16 grid grid-cols-1 gap-12">

        {/* Lab */}
        <div>
          <p className="text-white/40 text-sm uppercase tracking-widest mb-3">Lab</p>
          <h2 className="text-2xl font-bold mb-3">AI products I have built</h2>
          <p className="text-white/60 leading-relaxed mb-4">
            From prompt scoring tools to competitive intelligence scrapers. Real products built without writing a single line of code from scratch.
          </p>
          <a href="/lab" className="text-white/40 text-sm hover:text-white transition">View all projects →</a>
        </div>

        {/* Learn */}
        <div>
          <p className="text-white/40 text-sm uppercase tracking-widest mb-3">Free AI School</p>
          <h2 className="text-2xl font-bold mb-3">AI education for business leaders</h2>
          <p className="text-white/60 leading-relaxed mb-4">
            No fluff. No hype. Practical AI knowledge for people who run teams, make decisions, and want to actually use AI at work.
          </p>
          <a href="/learn" className="text-white/40 text-sm hover:text-white transition">Start learning →</a>
        </div>

        {/* Writing */}
        <div>
          <p className="text-white/40 text-sm uppercase tracking-widest mb-3">Writing</p>
          <h2 className="text-2xl font-bold mb-3">Honest takes on AI in business</h2>
          <p className="text-white/60 leading-relaxed mb-4">
            I write about what I am building, what is working, what failed, and what I think is actually happening in AI right now.
          </p>
          <a href="/writing" className="text-white/40 text-sm hover:text-white transition">Read the writing →</a>
        </div>

      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · Built with Next.js · Deployed on Vercel
      </footer>

    </main>
  );
}