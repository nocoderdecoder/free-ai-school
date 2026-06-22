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
    <svg className="w-8 h-8" style={{ color: 'var(--ed-text-light)' }} fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

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
    <main className="min-h-screen" style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <p className="section-label text-sm mb-4 uppercase tracking-widest" style={{ color: 'var(--ed-text-faint)' }}>Free Resources</p>
        <h1 className="text-5xl leading-tight mb-6" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--ed-text-dark)' }}>
          One-pagers.<br />Take them.
        </h1>
        <p className="text-xl leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
          Cheat sheets, quick references, and guides on AI tools and workflows.
          Free to download, no email required.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-24">

        {isEmpty ? (
          <div className="rounded-2xl p-16 text-center" style={{ background: 'var(--ed-card-warm)' }}>
            <div className="flex justify-center mb-4">
              <FileIcon />
            </div>
            <p className="text-sm" style={{ color: 'var(--ed-text-muted)' }}>Resources coming soon.</p>
            <p className="text-xs mt-2" style={{ color: 'var(--ed-text-light)' }}>Check back shortly.</p>
          </div>
        ) : (
          <div className="space-y-14">
            {categories.map((cat) => {
              const catResources = resources.filter((r) => r.category === cat)
              return (
                <div key={cat}>
                  <p className="text-xs uppercase tracking-widest mb-5" style={{ color: 'var(--ed-text-faint)' }}>{cat}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {catResources.map((resource) => (
                      <div
                        key={resource.filename}
                        className="group rounded-xl p-6 transition flex flex-col gap-4 ed-list-card card-hover"
                        style={{ background: 'var(--ed-card-warm)', borderRadius: '14px' }}
                      >
                        <div className="flex-1">
                          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--ed-text)' }}>
                            {resource.title}
                          </h2>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--ed-text-muted)' }}>
                            {resource.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--ed-border)' }}>
                          {resource.fileSize ? (
                            <span className="text-xs" style={{ color: 'var(--ed-text-light)' }}>{resource.fileSize} · PDF</span>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--ed-text-light)' }}>PDF</span>
                          )}
                          <a
                            href={`/api/pdf/${resource.filename}`}
                            download={resource.filename}
                            data-cursor="Download"
                            className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full transition btn-press"
                            style={{ background: 'var(--ed-cta)', color: '#FDFCFA' }}
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

      <footer style={{ borderTop: '1px solid var(--ed-border)' }}>
        <div className="max-w-3xl mx-auto px-8 py-12 flex flex-col sm:flex-row justify-between gap-8">
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--ed-text-dark)' }}>Anshul Gupta</p>
            <p className="text-sm" style={{ color: 'var(--ed-text-faint)' }}>GTM Strategy at Google · Kellogg MBA</p>
            <p className="text-xs mt-4" style={{ color: 'var(--ed-text-light)' }}>© {new Date().getFullYear()} · anshul.ai</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ed-text-light)' }}>Pages</p>
              <a href="/about" className="text-sm transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>About</a>
              <a href="/work" className="text-sm transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>Work</a>
              <a href="/projects" className="text-sm transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>Projects</a>
              <a href="/learn" className="text-sm transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>AI School</a>
              <a href="/analysis" className="text-sm transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>Analysis</a>
              <a href="/writing" className="text-sm transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>Writing</a>
              <a href="/downloads" className="text-sm transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>Downloads</a>
              <a href="/contact" className="text-sm transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>Contact</a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ed-text-light)' }}>Connect</p>
              <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" rel="noopener noreferrer" data-cursor="Visit" className="text-sm transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>LinkedIn</a>
              <a href="https://github.com/nocoderdecoder" target="_blank" rel="noopener noreferrer" data-cursor="Visit" className="text-sm transition link-slide" style={{ color: 'var(--ed-text-faint)' }}>GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
