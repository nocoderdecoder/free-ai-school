import type { Metadata } from 'next'
import Image from 'next/image'
import { PortfolioShell } from '../components/PortfolioShell'
import { publicProfile } from '../lib/publicProfile'
import s from '../profile.module.css'

export const metadata: Metadata = {
  title: 'Speaking',
  description: 'Speaking topics on go-to-market strategy, business analytics, and practical applications of AI. Contact Anshul Gupta about a talk or workshop.',
  alternates: { canonical: 'https://www.anshul.ai/speaking' },
  openGraph: {
    title: 'Speaking | Anshul Gupta',
    description: 'Practical talks and workshops on business metrics, AI evaluation, and applying AI in commercial workflows.',
    url: 'https://www.anshul.ai/speaking',
  },
}

const topics = [
  {
    title: 'Applying AI in GTM and Commercial Operations',
    audience: 'For GTM, strategy, and operations teams',
    description: 'Take a commercial use case from the initial business need through development and adoption.',
    takeaways: [
      'Choose a practical use case and define its requirements.',
      'Plan delivery with technical teams, testing, and business adoption.',
    ],
  },
  {
    title: 'Before the AI Answer: Make Business Metrics Testable',
    audience: 'For analytics, data, and commercial teams',
    description: 'Define what a business question means before asking AI to answer it.',
    takeaways: [
      'Specify the measure, population, reporting period, and comparison.',
      'Check definitions across sources and identify questions that need clarification.',
    ],
  },
  {
    title: 'Turning Business Questions into AI Evaluation Test Cases',
    audience: 'For analysts and teams developing AI tools',
    description: 'Use a worked example to turn a business question into a small set of useful tests.',
    takeaways: [
      'Create reference checks for common questions and difficult cases.',
      'Distinguish incorrect, incomplete, and unsupported answers.',
    ],
  },
  {
    title: 'Testing an AI Pilot Before Your Team Depends on It',
    audience: 'For project managers, business leaders, and operations teams',
    description: 'Agree on what an AI pilot needs to do and how the team will assess it.',
    takeaways: [
      'Set acceptance criteria and identify where human review belongs.',
      'Account for verification and correction when assessing the pilot.',
    ],
  },
]

export default function Speaking() {
  const speakingEmail = `mailto:${publicProfile.email}?subject=Speaking%20inquiry`

  return (
    <PortfolioShell>
      <header className={s.pageHeader}>
        <p className={s.eyebrow}>Speaking</p>
        <h1 className={s.title}>GTM, business analytics, and practical AI.</h1>
        <p className={s.lead}>I speak about applying AI in commercial and operational work, from defining the business need to testing a tool and getting it into use.</p>
        <div className={s.actions}>
          <a className={s.button} href={speakingEmail}>Invite me to speak</a>
          <a className={s.textLink} href={publicProfile.linkedIn}>LinkedIn</a>
        </div>
      </header>

      <section className={s.section} aria-labelledby="topics-heading">
        <h2 id="topics-heading" className={s.sectionHeading}>Available topics</h2>
        <p className={s.muted}>Sessions use practical examples and can be adapted for a webinar, workshop, or team discussion.</p>
        <div className={s.rows}>
          {topics.map((topic) => (
            <article className={s.row} key={topic.title}>
              <p className={s.rowMeta}>{topic.audience}</p>
              <div className={s.rowContent}>
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
                <ul className={s.bulletList}>
                  {topic.takeaways.map((takeaway) => <li key={takeaway}>{takeaway}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={s.section} aria-labelledby="bio-heading">
        <h2 id="bio-heading" className={s.sectionHeading}>Speaker bio</h2>
        <div className={s.speakerProfile}>
          <Image className={s.smallPortrait} src={publicProfile.headshot} alt="Anshul Gupta" width={160} height={160} />
          <div>
            <p className={s.bio}>{publicProfile.speakerBio}</p>
            <div className={s.actions}>
              <a className={s.textLink} href="/downloads/anshul-gupta-speaker-bio.txt" download>Download bio</a>
              <a className={s.textLink} href={publicProfile.headshot} download="anshul-gupta-headshot.jpg">Download headshot</a>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className={s.contactSection} aria-labelledby="contact-heading">
        <div>
          <h2 id="contact-heading" className={s.sectionHeading}>Speaking inquiries</h2>
          <p>Send me a note with your audience, proposed format, and timing.</p>
        </div>
        <div className={s.actions}>
          <a className={s.textLink} href={speakingEmail}>{publicProfile.email}</a>
          <a className={s.textLink} href={publicProfile.linkedIn}>LinkedIn</a>
        </div>
      </section>
    </PortfolioShell>
  )
}
