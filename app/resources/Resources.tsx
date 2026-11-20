"use client";
import { guides } from "../lib/portfolio/content";
import { PrintButton } from "../components/portfolio/PrintButton";
export default function Resources() {
  return (
    <section className="pf-wrap pf-demo">
      <div className="pf-actions" style={{ marginTop: 0, marginBottom: 30 }}>
        <PrintButton />
        <a
          className="pf-button secondary"
          href="/resources/ai-gtm-checklists.txt"
          download
        >
          Download all checklists
        </a>
      </div>
      {guides.map((g) => (
        <article className="pf-panel" key={g.slug} style={{ marginBottom: 22 }}>
          <p className="pf-tag">{g.category}</p>
          <h2>{g.title}</h2>
          <div className="pf-checklist">
            {g.sections
              .flatMap((s) => s.checklist || [])
              .map((item, i) => (
                <label key={item}>
                  <input type="checkbox" name={`${g.slug}-${i}`} />
                  <span>{item}</span>
                </label>
              ))}
          </div>
          <a className="pf-text-link" href={`/writing/${g.slug}`}>
            Read the worked example →
          </a>
        </article>
      ))}
      <p className="pf-small">
        Checklist selections last for this page visit. Nothing you tick is sent
        to a server. These are planning aids, not compliance certifications.
      </p>
    </section>
  );
}
