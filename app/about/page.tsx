import type { Metadata } from "next";
import { Shell, PageIntro } from "../components/portfolio/Shell";
import { profile, career, education } from "../lib/portfolio/content";
export const metadata: Metadata = {
  title: "About",
  description: profile.summary,
  alternates: { canonical: "https://anshul.ai/about" },
};
export default function About() {
  return (
    <Shell>
      <PageIntro
        eyebrow="About"
        title="Commercial experience. An applied AI focus."
      >
        <p>{profile.summary}</p>
      </PageIntro>
      <section className="pf-wrap pf-article">
        <p>
          My interests sit where business judgment meets product execution:
          defining a useful problem, making success measurable, and helping
          people adopt a better way of working.
        </p>
        <p>
          Earlier commercial roles gave me experience with channel strategy,
          distribution, and organizational change. Today, I’m exploring how AI
          can support business decisions and how to evaluate the systems behind
          those decisions.
        </p>
        <p>
          This site brings together independent projects, practical guides, and
          synthetic demonstrations. Employer work, internal data, and
          proprietary methods are excluded.
        </p>
        <div className="pf-actions">
          <a className="pf-button" href="/cv">
            View CV
          </a>
          <a className="pf-button secondary" href={profile.linkedin}>
            LinkedIn ↗
          </a>
        </div>
      </section>
      <section className="pf-wrap pf-section">
        <div className="pf-section-head">
          <h2>Professional background</h2>
        </div>
        {career.map((c) => (
          <article key={c.org} className="pf-timeline">
            <div>
              <h2>{c.org}</h2>
              <p>{c.dates}</p>
            </div>
            <div>
              <ul>
                {c.roles.map((r) => (
                  <li key={r.title}>
                    <h3>{r.title}</h3>
                    <p>{r.dates}</p>
                  </li>
                ))}
              </ul>
              <p>{c.description}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="pf-wrap pf-section">
        <div className="pf-section-head">
          <h2>Education</h2>
        </div>
        {education.map((e) => (
          <article className="pf-timeline" key={e.school}>
            <div>
              <p>{e.year}</p>
            </div>
            <div>
              <h3>{e.school}</h3>
              <p>{e.degree}</p>
            </div>
          </article>
        ))}
        <p className="pf-small">
          Kellogg client projects included work with Uber, Tego, and MATTER.
          These were academic engagements, not employment.
        </p>
      </section>
    </Shell>
  );
}
