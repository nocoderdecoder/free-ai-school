import type { Metadata } from "next";
import { Shell, PageIntro } from "../components/portfolio/Shell";
import { career, education, profile } from "../lib/portfolio/content";
import { PrintButton } from "../components/portfolio/PrintButton";
export const metadata: Metadata = {
  title: "CV",
  description:
    "Public professional profile of Anshul Gupta: Google, Unilever, GSK, and Kellogg MBA.",
  alternates: { canonical: "https://anshul.ai/cv" },
};
export default function CV() {
  return (
    <Shell>
      <PageIntro eyebrow="Public professional profile" title="Anshul Gupta">
        <p>{profile.summary}</p>
        <p className="pf-small">
          Sunnyvale, California · {profile.email} · anshul.ai
        </p>
        <div className="pf-actions">
          <PrintButton />
          <a className="pf-button secondary" href="/contact">
            Request a tailored CV
          </a>
        </div>
      </PageIntro>
      <section className="pf-wrap">
        <p className="pf-note">
          This public profile summarizes roles and education. Detailed employer
          projects, internal metrics, and proprietary information are omitted.
        </p>
        {career.map((c) => (
          <article className="pf-timeline" key={c.org}>
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
          <p key={e.school} style={{ marginBottom: 18 }}>
            <strong>{e.school}</strong>
            <br />
            {e.degree}, {e.year}
          </p>
        ))}
      </section>
      <section className="pf-wrap pf-section">
        <div className="pf-section-head">
          <h2>Independent projects and writing</h2>
        </div>
        <p className="pf-lead">
          anshul.ai: practical resources on AI evaluation, adoption, and GTM
          execution. Public demonstrations use synthetic data and are built with
          AI assistance.
        </p>
        <p className="pf-small" style={{ marginTop: 15 }}>
          Kellogg client projects included Uber, Tego, and MATTER. Academic
          engagements, not employment.
        </p>
      </section>
    </Shell>
  );
}
