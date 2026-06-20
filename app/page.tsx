import type { Metadata } from 'next'
import { createClient } from 'next-sanity'
import { Nav } from './components/Nav'

export const metadata: Metadata = {
  title: 'Anshul Gupta — AI Builder & Educator',
  description: 'GTM Strategy at Google. Kellogg MBA. I build AI products without an engineering degree and teach practical AI to business professionals.',
  openGraph: {
    title: 'Anshul Gupta — AI Builder & Educator',
    description: 'GTM Strategy at Google. Kellogg MBA. I build AI products and teach practical AI to business professionals.',
    url: 'https://anshul.ai',
    type: 'website',
  },
  twitter: {
    title: 'Anshul Gupta — AI Builder & Educator',
    description: 'GTM Strategy at Google. Kellogg MBA. I build AI products and teach practical AI to business professionals.',
  },
}

export const revalidate = 60

const sanity = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export default async function Home() {
  let trendingArticles: { title: string; slug: string; publishedAt: string }[] = []
  let totalTrending = 0
  try {
    const [articles, count] = await Promise.all([
      sanity.fetch(
        `*[_type == "trending"] | order(publishedAt desc)[0...4] { title, "slug": slug.current, publishedAt }`
      ),
      sanity.fetch(`count(*[_type == "trending"])`),
    ])
    trendingArticles = articles || []
    totalTrending = count || 0
  } catch {}

  return (
    <main style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <Nav variant="light" />

      {/* Hero */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: '56px',
          alignItems: 'start',
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '80px 48px 64px',
        }}
        className="ed-hero"
      >
        {/* Left */}
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '54px',
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: '-0.01em',
              color: 'var(--ed-text-dark)',
              marginBottom: '20px',
            }}
          >
            Building AI tools for people who run things.
          </h1>
          <p style={{ fontSize: '17px', lineHeight: 1.7, color: 'var(--ed-text-muted)', marginBottom: '32px', maxWidth: '480px' }}>
            GTM Strategy at Google. Kellogg MBA. I build AI products without an engineering degree and teach what I learn — all of it, openly.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
            <a
              href="/projects"
              style={{ background: 'var(--ed-cta)', color: 'var(--ed-bg)', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s' }}
            >
              See what I&apos;ve built
            </a>
            <a
              href="/learn"
              style={{ background: 'var(--ed-card-warm)', color: 'var(--ed-text-secondary)', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s' }}
            >
              Start learning →
            </a>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '32px',
              fontSize: '13px',
              color: 'var(--ed-text-light)',
              paddingTop: '24px',
              borderTop: '1px solid var(--ed-border)',
            }}
          >
            <div><strong style={{ color: 'var(--ed-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '1px' }}>Google</strong>GTM Strategy</div>
            <div><strong style={{ color: 'var(--ed-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '1px' }}>Kellogg</strong>Northwestern MBA</div>
            <div><strong style={{ color: 'var(--ed-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '1px' }}>Previously</strong>Uber</div>
          </div>
        </div>

        {/* Right — Trending sidebar */}
        <aside
          style={{
            background: 'var(--ed-card-warm)',
            borderRadius: '14px',
            padding: '28px',
          }}
        >
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ed-text-faint)', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ed-trending-dot)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Trending today
          </div>
          {trendingArticles.map((article, i) => (
            <a
              key={article.slug}
              href={`/trending/${article.slug}`}
              className="ed-trend-item"
              style={{
                display: 'block',
                padding: '14px 0',
                borderTop: i === 0 ? 'none' : '1px solid #E0DCD6',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'padding-left 0.15s',
              }}
            >
              <h4 style={{ fontSize: '14px', fontWeight: 500, color: '#333', lineHeight: 1.4, marginBottom: '3px' }}>
                {article.title}
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--ed-text-light)' }}>
                {new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </a>
          ))}
          {totalTrending > 4 && (
            <a
              href="/trending"
              style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--ed-text-faint)',
                fontWeight: 500,
                textDecoration: 'none',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid #E0DCD6',
                transition: 'color 0.15s',
              }}
              className="ed-trend-all"
            >
              Browse all {totalTrending}+ articles →
            </a>
          )}
        </aside>
      </section>

      {/* Featured cards */}
      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 48px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="ed-cards">
        <a href="/learn" className="ed-feat-card" style={{ padding: '44px', borderRadius: '14px', background: 'var(--ed-card-school)', textDecoration: 'none', color: 'var(--ed-text)', display: 'flex', flexDirection: 'column', transition: 'filter 0.25s, transform 0.25s' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '16px', opacity: 0.5 }}>Education</span>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, lineHeight: 1.2, marginBottom: '12px' }}>Free AI School</h3>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ed-text-muted)', marginBottom: '20px', flex: 1 }}>
            Five modules, ninety-nine articles. A complete curriculum for business professionals — no prerequisites, no engineering degree.
          </p>
          <span className="ed-feat-link" style={{ fontSize: '13px', color: 'var(--ed-text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>Start learning →</span>
        </a>
        <a href="/projects" className="ed-feat-card" style={{ padding: '44px', borderRadius: '14px', background: 'var(--ed-card-projects)', textDecoration: 'none', color: 'var(--ed-text)', display: 'flex', flexDirection: 'column', transition: 'filter 0.25s, transform 0.25s' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '16px', opacity: 0.5 }}>Projects</span>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, lineHeight: 1.2, marginBottom: '12px' }}>AI tools I&apos;ve built</h3>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ed-text-muted)', marginBottom: '20px', flex: 1 }}>
            Prompt scoring, competitive intelligence, learning compass — real products I built and shipped in public.
          </p>
          <span className="ed-feat-link" style={{ fontSize: '13px', color: 'var(--ed-text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>View all projects →</span>
        </a>
      </section>

      {/* Bottom cards */}
      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 48px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="ed-cards">
        <a href="/writing" className="ed-bottom-card" style={{ padding: '36px', background: 'var(--ed-card-warm)', borderRadius: '14px', textDecoration: 'none', color: 'var(--ed-text)', display: 'flex', flexDirection: 'column', transition: 'background 0.25s, transform 0.25s' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, marginBottom: '8px', lineHeight: 1.25 }}>Writing</h3>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ed-text-muted)', marginBottom: '18px', flex: 1 }}>
            Honest takes on building with AI. What&apos;s working, what failed, and what I think is actually happening right now.
          </p>
          <span style={{ fontSize: '12px', color: 'var(--ed-text-secondary)', fontWeight: 600 }}>Read the essays →</span>
        </a>
        <a href="/lab" className="ed-bottom-card" style={{ padding: '36px', background: 'var(--ed-card-warm)', borderRadius: '14px', textDecoration: 'none', color: 'var(--ed-text)', display: 'flex', flexDirection: 'column', transition: 'background 0.25s, transform 0.25s' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, marginBottom: '8px', lineHeight: 1.25 }}>Lab</h3>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ed-text-muted)', marginBottom: '18px', flex: 1 }}>
            Interactive AI tools you can try right now — prompt scorer, learning compass, and more.
          </p>
          <span style={{ fontSize: '12px', color: 'var(--ed-text-secondary)', fontWeight: 600 }}>Open the lab →</span>
        </a>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--ed-border)', maxWidth: '1080px', margin: '0 auto', padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--ed-text-light)' }}>
          <strong style={{ color: 'var(--ed-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Anshul Gupta</strong>
          © {new Date().getFullYear()} · anshul.ai
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="https://github.com/nocoderdecoder" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--ed-text-faint)', textDecoration: 'none', transition: 'color 0.15s' }} className="ed-footer-link">GitHub</a>
          <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--ed-text-faint)', textDecoration: 'none', transition: 'color 0.15s' }} className="ed-footer-link">LinkedIn</a>
          <a href="/contact" style={{ fontSize: '13px', color: 'var(--ed-text-faint)', textDecoration: 'none', transition: 'color 0.15s' }} className="ed-footer-link">Contact</a>
        </div>
      </footer>
    </main>
  )
}
