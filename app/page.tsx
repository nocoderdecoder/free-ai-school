import type { Metadata } from 'next'
import { PortfolioShell, ContactLinks } from './components/PortfolioShell'
import { JsonLd, personSchema } from './components/JsonLd'
import { publicProfile } from './lib/publicProfile'
import s from './profile.module.css'

export const metadata: Metadata = {
  title: { absolute: publicProfile.pageTitle },
  description: publicProfile.shortBio,
  alternates: { canonical: '/' },
}

export default function Home() {
  return (
    <PortfolioShell>
      <JsonLd data={personSchema()} />
      <section className={s.hero} aria-labelledby="introduction">
        <div>
          <p className={s.eyebrow}>Anshul Gupta</p>
          <h1 id="introduction" className={s.title}>Go-to-market strategy and applied AI.</h1>
          <p className={s.lead}>
            I work in Global Strategy and Operations at Google, focusing on
            commercial strategy, business analytics, and applied AI.
          </p>
          <p>
            My work spans business planning, defining requirements, working with
            engineering on delivery, and helping teams adopt new tools and processes.
          </p>
          <div className={s.actions}>
            <a className={s.button} href="/work">View my work</a>
            <a className={s.secondaryButton} href="/speaking">Speaking topics</a>
          </div>
          <ContactLinks />
        </div>
        <img src={publicProfile.headshot} alt="Anshul Gupta" width={400} height={400}
          fetchPriority="high" className={s.portrait} />
      </section>
      <section id="about" className={s.section} aria-labelledby="background">
        <h2 id="background" className={s.sectionHeading}>Background</h2>
        <div className={s.background}>
          <p>
            Before Google, I worked at Unilever and GSK in channel strategy,
            business transformation, and distribution. I hold an MBA from
            Northwestern University&apos;s Kellogg School of Management.
          </p>
          <p>
            During my MBA, I worked on strategy consulting projects for Uber,
            the healthcare incubator MATTER, and early-stage startups. These
            projects covered market entry, customer segments, pricing, and partnerships.
          </p>
        </div>
      </section>
      <section className={s.section} aria-labelledby="areas-of-work">
        <h2 id="areas-of-work" className={s.sectionHeading}>Areas of work</h2>
        <div className={s.grid}>
          <div>
            <h3>Go-to-market strategy</h3>
            <p>Market and channel priorities, launch planning, distribution, and commercial performance.</p>
          </div>
          <div>
            <h3>Business analytics</h3>
            <p>Business questions, metric definitions, reporting requirements, and analytical workflows.</p>
          </div>
          <div>
            <h3>Applied AI</h3>
            <p>Practical use cases, solution requirements, delivery with engineering, evaluation, and adoption.</p>
          </div>
        </div>
      </section>
      <section className={s.contactSection} aria-labelledby="get-in-touch">
        <div>
          <h2 id="get-in-touch" className={s.sectionHeading}>Get in touch</h2>
          <p>For speaking invitations, professional discussions, or collaboration.</p>
        </div>
        <a className={s.textLink} href={`mailto:${publicProfile.email}`}>{publicProfile.email}</a>
      </section>
    </PortfolioShell>
  )
}
