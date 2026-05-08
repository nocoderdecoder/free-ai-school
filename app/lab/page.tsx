const projects = [
  {
    name: "PromptGrade",
    tagline: "AI prompt scoring and rewriting",
    description: "Paste any prompt and get a quality score plus an improved version instantly. Built to help professionals get better results from AI without guessing.",
    image: "/projects/promptgrade.png",
    url: "https://ratemyprompt.pro",
    stack: ["Next.js", "Claude API", "Gemini API", "Vercel"],
    status: "Live",
  },
  {
    name: "Speaking Speed Tester",
    tagline: "Real-time words-per-minute measurement",
    description: "Pick a difficulty level, read aloud for 1–2 minutes, and get your WPM score instantly using the browser's speech recognition API.",
    image: "",
    url: "/tools/speaking-speed",
    stack: ["Next.js", "Web Speech API", "Claude API"],
    status: "Live",
  },
  {
    name: "AI News → LinkedIn Pipeline",
    tagline: "Automated content from signal to draft",
    description: "Ingests AI news via RSS, summarises it with Claude, and produces LinkedIn post drafts for review. Runs daily without manual input.",
    image: "",
    url: "",
    stack: ["n8n", "Claude API", "RSS"],
    status: "Running",
  },
  {
    name: "Competitive Intelligence Scraper",
    tagline: "Competitor tracking for strategy teams",
    description: "Pulls competitor offers from the web, structures the data, and formats it for strategy presentations. Built and used in a real Google context.",
    image: "",
    url: "",
    stack: ["Python", "Playwright", "Google Colab"],
    status: "Internal",
  },
  {
    name: "HR Assistant Chatbot",
    tagline: "RAG-based answers from internal documents",
    description: "Answers employee questions by reasoning over uploaded internal documents. No hallucination on out-of-scope questions — it says it does not know.",
    image: "",
    url: "",
    stack: ["LangChain", "ChromaDB", "Claude Haiku", "Gradio"],
    status: "Demo",
  },
  {
    name: "CV Tailoring System",
    tagline: "Job-description-aware resume rewriting",
    description: "Takes a job description and rewrites a CV to match it using AI. Preserves facts, adjusts framing and language to the role.",
    image: "",
    url: "",
    stack: ["n8n", "Claude API"],
    status: "Built",
  },
]

const statusColor: Record<string, string> = {
  Live: "bg-emerald-500",
  Running: "bg-blue-500",
  Internal: "bg-amber-500",
  Demo: "bg-purple-500",
  Built: "bg-white/40",
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function ProjectCard({ project }: { project: typeof projects[number] }) {
  const isExternal = project.url.startsWith('http')
  const Wrapper = project.url
    ? ({ children }: { children: React.ReactNode }) => (
        <a
          href={project.url}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="block border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition group cursor-pointer"
        >
          {children}
        </a>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="block border border-white/10 rounded-xl overflow-hidden">
          {children}
        </div>
      )

  return (
    <Wrapper>
      {/* Image / placeholder area */}
      <div className="relative w-full aspect-video overflow-hidden bg-white/[0.02]">
        {project.image ? (
          <img
            src={project.image}
            alt={project.name}
            className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition duration-500"
          />
        ) : (
          /* Placeholder: subtle grid + initials */
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px)',
            }}
          >
            <span className="text-5xl font-bold text-white/10 select-none tracking-wider">
              {initials(project.name)}
            </span>
          </div>
        )}

        {/* Status badge overlaid on image */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor[project.status] ?? 'bg-white/20'}`} />
          <span className="text-xs text-white/60">{project.status}</span>
        </div>

        {/* Arrow indicator for clickable cards */}
        {project.url && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition duration-300">
            <span className="text-xs text-white/60 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
              Open →
            </span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-7">
        <h2 className="text-xl font-bold mb-1">{project.name}</h2>
        <p className="text-white/40 text-sm mb-4">{project.tagline}</p>
        <p className="text-white/70 leading-relaxed mb-5">{project.description}</p>
        <div className="flex flex-wrap gap-2">
          {project.stack.map((s) => (
            <span key={s} className="text-xs text-white/40 border border-white/10 px-2 py-1 rounded-full">
              {s}
            </span>
          ))}
        </div>
      </div>
    </Wrapper>
  )
}

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

      <section className="max-w-3xl mx-auto px-8 pt-20 pb-8">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Lab</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">Things I have<br />built with AI.</h1>
        <p className="text-white/60 text-xl leading-relaxed">
          Real products and automations. Some are live, some run internally, all were built without a traditional engineering background.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 py-12">
        <div className="space-y-6">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-8 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
