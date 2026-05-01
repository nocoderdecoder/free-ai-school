export default async function Learn() {
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
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Free AI School</p>
        <h1 className="text-4xl font-bold mb-4">AI education for business leaders.</h1>
        <p className="text-white/60 text-lg mb-16">Practical AI knowledge for people who run teams and make decisions. No engineering degree required.</p>
        <div className="border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/40 mb-2">First article coming soon.</p>
          <p className="text-white/30 text-sm">Check back shortly.</p>
        </div>
      </section>
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        2026 Anshul Gupta
      </footer>
    </main>
  )
}
