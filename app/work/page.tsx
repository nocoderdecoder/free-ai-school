import type { Metadata } from 'next'
import { PortfolioShell } from '../components/PortfolioShell'
import s from '../profile.module.css'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Selected work in go-to-market strategy, business analytics, applied AI, and MBA consulting projects.',
  alternates: { canonical: 'https://www.anshul.ai/work' },
  openGraph: {
    title: 'Work | Anshul Gupta',
    description: 'Experience across Google, Unilever, GSK, and consulting projects completed during the Kellogg MBA.',
    url: 'https://www.anshul.ai/work',
  },
}

const experience = [
  {
    category: 'Go-to-market strategy',
    title: 'Commercial planning and execution',
    description: 'My experience at Google, Unilever, and GSK covers market and channel priorities, launch planning, distribution, and commercial performance. I connect market analysis with the requirements, people, and processes needed to carry a plan through.',
  },
  {
    category: 'Business analytics',
    title: 'Reporting that reflects the business',
    description: 'At Google, I define business metrics and reporting requirements, work with engineering on analytical tools, and help teams test and adopt the resulting workflows. This includes clarifying what a measure means and how it should be compared.',
  },
]

const consulting = [
  {
    name: 'Uber',
    description: 'Evaluated U.S. expansion opportunities for business shuttle services, comparing customer segments and route economics. Presented a phased market-entry recommendation as part of a Kellogg client project.',
  },
  {
    name: 'MATTER',
    description: 'Researched pharmaceutical-company priorities and potential partnerships for the Chicago healthcare incubator through a graduate independent study.',
  },
  {
    name: 'Early-stage startups',
    description: 'Worked on customer segmentation, pricing, and sales channels for U.S. market entry during my MBA.',
  },
]

const projects = [
  { name: 'Free AI School', href: '/learn', description: 'Practical guides to AI concepts, tools, and business applications.' },
  { name: 'Short AI Courses', href: 'https://shortaicourses.com', description: 'Short, free courses for business professionals.' },
  { name: 'Awesome Business AI', href: 'https://github.com/nocoderdecoder/awesome-business-ai', description: 'An open collection of workflow playbooks, templates, and evaluation examples.' },
]

export default function Work() {
  return (
    <PortfolioShell>
      <header className={s.pageHeader}>
        <p className={s.eyebrow}>Work</p>
        <h1 className={s.title}>Strategy, analytics, and applied AI.</h1>
        <p className={s.lead}>Selected experience from commercial planning through delivery and adoption.</p>
      </header>

      <section id="experience" className={s.section} aria-labelledby="experience-heading">
        <h2 id="experience-heading" className={s.sectionHeading}>Professional experience</h2>
        <div className={s.rows}>
          {experience.map((item) => (
            <article className={s.row} key={item.category}>
              <p className={s.rowMeta}>{item.category}</p>
              <div className={s.rowContent}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="ai-for-gtm" className={s.section} aria-labelledby="ai-for-gtm-heading">
        <h2 id="ai-for-gtm-heading" className={s.sectionHeading}>AI for GTM</h2>
        <p className={s.bio}>
          My focus is on practical uses of AI in commercial work, including business
          analysis, reporting, and routine workflows. I define business needs, shape
          requirements with engineering, test the resulting tools, and help teams
          put them into use.
        </p>
      </section>

      <section className={s.section} aria-labelledby="consulting-heading">
        <h2 id="consulting-heading" className={s.sectionHeading}>Consulting projects at Kellogg</h2>
        <p className={s.muted}>Completed during my MBA at Northwestern University, 2023 to 2024.</p>
        <div className={s.rows}>
          {consulting.map((item) => (
            <article className={s.row} key={item.name}>
              <h3 className={s.rowMeta}>{item.name}</h3>
              <div className={s.rowContent}><p>{item.description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section id="resources" className={s.section} aria-labelledby="projects-heading">
        <div id="projects">
          <h2 id="projects-heading" className={s.sectionHeading}>Independent projects</h2>
          <p className={s.muted}>Tools and learning resources I develop outside work.</p>
          <div className={s.grid}>
            {projects.map((project) => (
              <article className={s.resource} key={project.name}>
                <h3><a className={s.textLink} href={project.href}>{project.name}</a></h3>
                <p>{project.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PortfolioShell>
  )
}
