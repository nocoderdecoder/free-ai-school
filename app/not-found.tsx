import { Nav } from './components/Nav'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />
      <section className="max-w-3xl mx-auto px-8 py-40 text-center">
        <p className="text-white/20 text-xs uppercase tracking-widest mb-6">404</p>
        <h1 className="text-5xl font-bold mb-6">Page not found.</h1>
        <p className="text-white/50 text-xl leading-relaxed mb-12 max-w-xl mx-auto">
          This page does not exist — or was moved. Try one of these instead.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a href="/learn"   className="bg-white text-black px-6 py-3 rounded-full font-medium text-sm hover:bg-white/90 transition">Start learning</a>
          <a href="/lab"     className="border border-white/20 px-6 py-3 rounded-full font-medium text-sm hover:border-white/40 transition">See what I built</a>
          <a href="/writing" className="border border-white/20 px-6 py-3 rounded-full font-medium text-sm hover:border-white/40 transition">Read the writing</a>
        </div>
      </section>
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
