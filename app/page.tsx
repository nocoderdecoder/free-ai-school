import type { Metadata } from 'next'
import { createClient } from 'next-sanity'
import { Nav } from './components/Nav'
import { publicProfile } from './lib/publicProfile'
import { JsonLd, personSchema, organizationSchema } from './components/JsonLd'

export const metadata: Metadata = {
  title: { absolute: publicProfile.pageTitle },
  description: publicProfile.shortBio,
  alternates: { canonical: 'https://anshul.ai' },
  openGraph: {
    title: publicProfile.pageTitle,
    description: publicProfile.shortBio,
    url: 'https://anshul.ai',
    type: 'website',
  },
  twitter: {
    title: publicProfile.pageTitle,
    description: publicProfile.shortBio,
  },
}

export const revalidate = 3600

const sanity = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

type Post = { title: string; slug: string; publishedAt: string; readTime?: number }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const CREDENTIALS = [
  { org: 'Google',      role: 'GTM Strategy & BI' },
  { org: 'Kellogg',     role: 'Northwestern MBA'  },
  { org: 'Previously',  role: 'HUL / GSK'         },
]

const CARDS = [
  {
    tag: 'Education',
    title: 'Free AI School',
    desc: 'Free guides to AI concepts, tools, and business applications for professionals without an engineering background.',
    cta: 'Start learning →',
    href: '/learn',
    passive: false,
  },
  {
    tag: 'Courses',
    title: 'Short AI Courses',
    desc: 'Free, practical AI courses for business professionals. Finish a full course in under 40 minutes. No coding, no signup.',
    cta: 'shortaicourses.com →',
    href: 'https://shortaicourses.com',
    passive: false,
    external: true,
  },
  {
    tag: 'Products',
    title: 'AI Tools',
    desc: 'GTM playbooks, AI readiness assessments, ROI estimates, and a personal learning compass.',
    cta: 'Try the tools →',
    href: '/tools',
    passive: false,
  },
  {
    tag: 'Professional',
    title: 'At Google',
    desc: 'Commercial strategy, business intelligence, and evaluation of AI-assisted analysis for the Pixel business.',
    cta: 'Professional background',
    href: '/work',
    passive: false,
  },
]

export default async function Home() {
  let recentPosts: Post[] = []
  try {
    recentPosts = await sanity.fetch(
      `*[_type == "post" && status == "published"] | order(publishedAt desc)[0...3] {
        title, "slug": slug.current, publishedAt, readTime
      }`
    ) ?? []
  } catch {}

  const s = {
    wrap: {
      maxWidth: '920px',
      margin: '0 auto',
      paddingLeft: '48px',
      paddingRight: '48px',
    } as React.CSSProperties,
  }

  return (
    <main style={{ backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)' }}>
      <JsonLd data={personSchema()} />
      <JsonLd data={organizationSchema()} />
      <Nav variant="light" />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section style={{ ...s.wrap, paddingTop: '80px', paddingBottom: '64px' }}>

        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.11em', color: 'var(--accent)', marginBottom: '22px' }}>
          AI Builder · GTM Strategist
        </p>

        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(38px, 5.5vw, 52px)',
          fontWeight: 400,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: 'var(--ed-text-dark)',
          maxWidth: '660px',
          marginBottom: '22px',
        }}>
          Building AI tools for<br />people who run things.
        </h1>

        <p style={{ fontSize: '17px', lineHeight: 1.7, color: 'var(--ed-text-muted)', maxWidth: '520px', marginBottom: '40px' }}>
          {publicProfile.shortBio}
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '52px' }}>
          <a
            href="/projects"
            className="btn-press"
            style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: '14px', fontWeight: 600, padding: '11px 22px', borderRadius: '7px',
              background: 'var(--ed-cta)', color: 'var(--ed-bg)', textDecoration: 'none',
            }}
          >
            See what I've built
          </a>
          <a
            href="/learn"
            className="btn-press"
            style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: '14px', fontWeight: 500, padding: '11px 22px', borderRadius: '7px',
              background: 'transparent', color: 'var(--ed-text-secondary)', textDecoration: 'none',
              border: '1px solid var(--ed-border)',
            }}
          >
            Free AI School →
          </a>
        </div>

        {/* Credentials block */}
        <div style={{
          display: 'inline-grid',
          gridTemplateColumns: 'repeat(3, auto)',
          background: '#fff',
          border: '1px solid var(--ed-border)',
          borderRadius: '9px',
          overflow: 'hidden',
        }}>
          {CREDENTIALS.map((c, i) => (
            <div
              key={c.org}
              style={{
                padding: '13px 22px',
                borderRight: i < CREDENTIALS.length - 1 ? '1px solid var(--ed-border)' : 'none',
              }}
            >
              <strong style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ed-text-dark)', display: 'block', letterSpacing: '-0.01em', marginBottom: '2px' }}>
                {c.org}
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--ed-text-light)' }}>{c.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── What I've built ─────────────────────────────────────────── */}
      <section style={{ ...s.wrap, paddingTop: '56px', paddingBottom: '56px', borderTop: '1px solid var(--ed-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ed-text-light)' }}>
            What I've built
          </p>
          <a href="/projects" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ed-text-light)', textDecoration: 'none' }} className="link-slide">
            All projects →
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }} className="home-cards">
          {CARDS.map((card) => {
            const inner = (
              <>
                <span style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: card.passive ? 'var(--ed-text-light)' : 'var(--accent)',
                  background: card.passive ? 'var(--ed-card-warm)' : 'rgba(59,130,246,0.08)',
                  padding: '3px 8px', borderRadius: '4px', width: 'fit-content', marginBottom: '18px',
                  display: 'block',
                }}>
                  {card.tag}
                </span>
                <h3 style={{
                  fontFamily: 'var(--font-serif)', fontSize: '19px', fontWeight: 400,
                  lineHeight: 1.3, letterSpacing: '-0.015em', color: 'var(--ed-text-dark)', marginBottom: '10px',
                }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--ed-text-muted)', flex: 1, marginBottom: '22px' }}>
                  {card.desc}
                </p>
                <span style={{
                  fontSize: '12px', fontWeight: 600,
                  color: card.passive ? 'var(--ed-text-light)' : 'var(--ed-text-muted)',
                  display: 'block', marginTop: 'auto',
                }}>
                  {card.cta}
                </span>
              </>
            )

            const sharedStyle: React.CSSProperties = {
              background: '#fff',
              border: '1px solid var(--ed-border)',
              borderRadius: '10px',
              padding: '26px',
              display: 'flex',
              flexDirection: 'column',
            }

            return card.href ? (
              <a
                key={card.title}
                href={card.href}
                className="ed-list-card"
                target={'external' in card && card.external ? '_blank' : undefined}
                rel={'external' in card && card.external ? 'noopener noreferrer' : undefined}
                style={{ ...sharedStyle, textDecoration: 'none', color: 'inherit' }}
              >
                {inner}
              </a>
            ) : (
              <div key={card.title} style={sharedStyle}>
                {inner}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Writing ─────────────────────────────────────────────────── */}
      <section style={{ ...s.wrap, paddingTop: '56px', paddingBottom: '80px', borderTop: '1px solid var(--ed-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ed-text-light)', marginBottom: '24px' }}>
            Writing
          </p>
          <a href="/writing" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ed-text-light)', textDecoration: 'none' }} className="link-slide">
            All essays →
          </a>
        </div>

        {recentPosts.length > 0 ? (
          <div>
            {recentPosts.map((post, i) => (
              <a
                key={post.slug}
                href={`/writing/${post.slug}`}
                className="essay-row"
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '24px',
                  padding: '17px 0',
                  borderTop: i === 0 ? '1px solid var(--ed-border)' : 'none',
                  borderBottom: '1px solid var(--ed-border)',
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ed-text)', lineHeight: 1.45 }}>
                  {post.title}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--ed-text-light)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {fmtDate(post.publishedAt)}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--ed-text-muted)', paddingTop: '8px' }}>
            Longer essays are in development. Practical guides are available in the AI School.{' '}
            <a href="/learn" style={{ color: 'var(--ed-text-secondary)', fontWeight: 500 }}>Explore learning resources</a>
          </p>
        )}
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--ed-border)' }}>
        <div style={{ ...s.wrap, paddingTop: '28px', paddingBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--ed-text-light)' }}>
            © {new Date().getFullYear()} Anshul Gupta · anshul.ai
          </span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="https://github.com/nocoderdecoder" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--ed-text-light)', textDecoration: 'none' }} className="link-slide">GitHub</a>
            <a href="https://www.linkedin.com/in/anshul-gupta1/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--ed-text-light)', textDecoration: 'none' }} className="link-slide">LinkedIn</a>
            <a href="/contact" style={{ fontSize: '13px', color: 'var(--ed-text-light)', textDecoration: 'none' }} className="link-slide">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
