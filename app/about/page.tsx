export default function About() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex justify-between items-center px-8 py-6 border-b border-white/10">
        <a href="/" className="font-bold text-lg">Anshul Gupta</a>
        <div className="flex gap-6 text-sm text-white/60">
          <a href="/about" className="hover:text-white transition">About</a>
          <a href="/lab" className="hover:text-white transition">Lab</a>
          <a href="/learn" className="hover:text-white transition">Learn</a>
          <a href="/writing" className="hover:text-white transition">Writing</a>
        </div>
      </nav>
      <section className="max-w-3xl mx-auto px-8 py-24">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">About</p>
        <h1 className="text-4xl font-bold mb-10">GTM leader at Google. AI builder. Educator.</h1>
        <div className="space-y-6">
          <p className="text-white/70 text-lg leading-relaxed">
            I am Anshul Gupta, a GTM Strategy and Business Intelligence leader at Google with a Kellogg MBA and 8 years of experience across Google and Unilever.
          </p>
          <p className="text-white/70 text-lg leading-relaxed">
            I build AI products without an engineering degree and write about what I learn. This site is where I share practical AI knowledge for business leaders who want to actually use AI, not just talk about it.
          </p>
        </div>
      </section>
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta
      </footer>
    </main>
  )
}