export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-white/10">
        <span className="font-bold text-lg">Anshul Gupta</span>
        <div className="flex gap-6 text-sm text-white/60">
          <a href="/projects" className="hover:text-white transition">Projects</a>
          <a href="/blog" className="hover:text-white transition">Writing</a>
          <a href="https://linkedin.com/in/anshulgupta" target="_blank" className="hover:text-white transition">LinkedIn</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 py-24">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Free AI School</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          AI for business leaders who build.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed mb-10">
          I am Anshul Gupta. GTM Strategy at Google. I write about AI in business, share what I build, and teach non-technical leaders how to use AI as a real competitive advantage.
        </p>
        <div className="flex gap-4">
          <a href="/blog" className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-white/90 transition">
            Read the writing
          </a>
          <a href="/projects" className="border border-white/20 px-6 py-3 rounded-full font-medium hover:border-white/40 transition">
            See projects
          </a>
        </div>
      </section>

      {/* About strip */}
      <section className="border-t border-white/10 px-8 py-16 max-w-3xl mx-auto">
        <p className="text-white/40 text-sm uppercase tracking-widest mb-6">About</p>
        <p className="text-white/70 text-lg leading-relaxed">
          8 years in GTM and channel sales across Google and Unilever. Kellogg MBA. I build real things with AI without being an engineer. Free AI School is where I share everything I learn.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta. Built with Next.js and deployed on Vercel.
      </footer>
    </main>
  );
}