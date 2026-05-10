import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { resources } from './documents'

export const metadata: Metadata = {
  title: 'Free AI Resources — Anshul Gupta',
  description: 'Free one-pagers, cheat sheets, and guides on AI tools and workflows for business professionals.',
  openGraph: {
    title: 'Free AI Resources — Anshul Gupta',
    description: 'Free one-pagers, cheat sheets, and guides on AI tools and workflows for business professionals.',
    url: 'https://anshul.ai/downloads',
  },
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

// Get unique categories in the order they first appear
function getCategories(resources: typeof import('./documents').resources) {
  const seen = new Set<string>()
  const cats: string[] = []
  for (const r of resources) {
    if (!seen.has(r.category)) {
      seen.add(r.category)
      cats.push(r.category)
    }
  }
  return cats
}

export default function Downloads() {
  const categories = getCategories(resources)
  const isEmpty = resources.length === 0

  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12">
        <p className="text-white/40 text-sm mb-4 uppercase tracking-widest">Free Resources</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          One-pagers.<br />Take them.
        </h1>
        <p className="text-white/60 text-xl leading-relaxed">
          Cheat sheets, quick references, and guides on AI tools and workflows.
          Free to download, no email required.
        </p>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-8 pb-24">

        {isEmpty ? (
          /* Empty state */
          <div className="border border-white/10 rounded-2xl p-16 text-center">
            <div className="flex justify-center mb-4">
              <FileIcon />
            </div>
            <p className="text-white/40 text-sm">Resources coming soon.</p>
            <p className="text-white/25 text-xs mt-2">Check back shortly.</p>
          </div>
        ) : (
          /* Resource grid — grouped by category */
          <div className="space-y-14">
            {categories.map((cat) => {
              const catResources = resources.filter((r) => r.category === cat)
              return (
                <div key={cat}>
                  <p className="text-white/30 text-xs uppercase tracking-widest mb-5">{cat}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {catResources.map((resource) => (
                      <div
                        key={resource.filename}
                        className="group border border-white/10 rounded-xl p-6 hover:border-white/25 transition flex flex-col gap-4"
                      >
                        {/* Text */}
                        <div className="flex-1">
                          <h2 className="text-base font-semibold mb-2 group-hover:text-white transition">
                            {resource.title}
                          </h2>
                          <p className="text-white/50 text-sm leading-relaxed">
                            {resource.description}
                          </p>
                        </div>

                        {/* Footer row */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                          {resource.fileSize ? (
                            <span className="text-white/25 text-xs">{resource.fileSize} · PDF</span>
                          ) : (
                            <span className="text-white/25 text-xs">PDF</span>
                          )}
                          <a
                            href={`/downloads/${resource.filename}`}
                            download={resource.filename}
                            className="flex items-center gap-1.5 text-sm font-medium text-black bg-white px-4 py-1.5 rounded-full hover:bg-white/90 transition"
                          >
                            <DownloadIcon />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-3xl mx-auto px-8 py-12 flex flex-col sm:flex-row justify-between gap-8">
          <div>
            <p className="font-semibold text-white mb-1">Anshul Gupta</p>
            <p className="text-white/30 text-sm">GTM Strategy at Google · Kellogg MBA</p>
            <p className="text-white/20 text-xs mt-4">© {new Date().getFullYear()} · anshul.ai</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <p className="text-white/25 text-xs uppercase tracking-widest mb-1">Pages</p>
              <a href="/about"     className="text-white/40 text-sm hover:text-white transition">About</a>
              <a href="/lab"       className="text-white/40 text-sm hover:text-white transition">Lab</a>
              <a href="/learn"     className="text-white/40 text-sm hover:text-white transition">Learn</a>
              <a href="/trending"  className="text-white/40 text-sm hover:text-white transition">Trending</a>
              <a href="/writing"   className="text-white/40 text-sm hover:text-white transition">Writing</a>
              <a href="/downloads" className="text-white/40 text-sm hover:text-white transition">Downloads</a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-white/25 text-xs uppercase tracking-widest mb-1">Connect</p>
              <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" rel="noopener noreferrer" className="text-white/40 text-sm hover:text-white transition">LinkedIn</a>
              <a href="https://github.com/nocoderdecoder"           target="_blank" rel="noopener noreferrer" className="text-white/40 text-sm hover:text-white transition">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
