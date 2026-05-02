const projects = [
  {
  name: "Speaking Speed Tester",
  description: "Test how many words per minute you speak. Pick a difficulty, read aloud for 1-2 minutes, and get your WPM score instantly.",
  url: "/tools/speaking-speed",
  stack: "Next.js, Claude API, Web Speech API",
  status: "Live"
  },
  {
    name: "PromptGrade",
    description: "AI prompt scoring and rewriting tool. Paste any prompt and get a quality score plus an improved version instantly.",
    url: "https://ratemyprompt.pro",
    stack: "Next.js, Claude API, Gemini API, Vercel",
    status: "Live"
  },
  {
    name: "Competitive Intelligence Scraper",
    description: "A web scraper that pulls competitor phone offers and formats them for strategy presentations. Built and used in a real Google context.",
    url: "",
    stack: "Python, Playwright, Google Colab",
    status: "Internal"
  },
  {
    name: "HR Assistant Chatbot",
    description: "A RAG-based HR assistant that answers employee questions from internal documents.",
    url: "",
    stack: "LangChain, ChromaDB, Claude Haiku, Gradio",
    status: "Demo"
  },
  {
    name: "AI News to LinkedIn Pipeline",
    description: "Automated system that ingests AI news, summarises it using Claude, and drafts LinkedIn posts for review.",
    url: "",
    stack: "n8n, Claude API, RSS feeds",
    status: "Running"
  },
  {
    name: "CV Tailoring System",
    description: "n8n automation that takes a job description and rewrites a CV to match it using AI.",
    url: "",
    stack: "n8n, Claude API",
    status: "Built"
  }
];

export default function Lab() {
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
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Lab</p>
        <h1 className="text-4xl font-bold mb-4">Things I have built with AI.</h1>
        <p className="text-white/60 text-lg mb-16">Real products and tools. Some live, some internal, all built without a traditional engineering background.</p>
        <div className="space-y-8">
          {projects.map((project) => (
            <div key={project.name} className="border border-white/10 rounded-xl p-6 hover:border-white/20 transition">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-xl font-bold">{project.name}</h2>
                <span className="text-xs text-white/40 border border-white/10 px-2 py-1 rounded-full">{project.status}</span>
              </div>
              <p className="text-white/60 leading-relaxed mb-4">{project.description}</p>
              <p className="text-white/30 text-sm mb-4">{project.stack}</p>
              {project.url && (
                <a href={project.url} target="_blank" className="text-white text-sm hover:text-white/70 transition">Visit →</a>
              )}
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta
      </footer>
    </main>
  );
}
