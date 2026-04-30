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
        <h1 className="text-4xl font-bold mb-8">The non-engineer who builds with AI.</h1>
        <div className="space-y-6 text-white/70 text-lg leading-relaxed">
          <p>I am Anshul Gupta. I work in GTM Strategy and Business Intelligence at Google. Before that I spent years at Unilever running channel sales and operations in India. I have a Kellogg MBA.</p>
          <p>None of that makes me a technical person. I cannot write backend code from scratch. I do not have a CS degree. But I build real AI products, ship them, and use them in real business contexts.</p>
          <p>That gap between technical AI people and business people is what Free AI School is about. I am living proof that you do not need to be an engineer to build with AI.</p>
          <p>I am based in Sunnyvale, CA. I plan to return to India in about 10 years. This site is where I document everything I learn along the way.</p>
        </div>
      </section>
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta
      </footer>
    </main>
  );
}
