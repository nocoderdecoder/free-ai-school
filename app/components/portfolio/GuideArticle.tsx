import { Shell, PageIntro } from "./Shell";
import { type Guide } from "../../lib/portfolio/content";
export function GuideArticle({ guide }: { guide: Guide }) {
  return (
    <Shell>
      <PageIntro
        eyebrow={`${guide.category} · ${guide.minutes} minute read`}
        title={guide.title}
      >
        <p>{guide.summary}</p>
      </PageIntro>
      <article className="pf-wrap pf-article">
        <p className="pf-small">
          By Anshul Gupta · Original guide with fictional examples · November
          2026
        </p>
        {guide.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {section.checklist && (
              <div className="pf-checklist">
                <ul>
                  {section.checklist.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
        {guide.sources && (
          <section>
            <h2>Further reading</h2>
            <ul>
              {guide.sources.map((s) => (
                <li key={s.url}>
                  <a className="pf-text-link" href={s.url}>
                    {s.label} ↗
                  </a>
                </li>
              ))}
            </ul>
            <p className="pf-small">
              The worked examples and checklists above are original. These
              references offer broader context.
            </p>
          </section>
        )}
        <div className="pf-actions">
          <a className="pf-button secondary" href="/resources">
            Open the checklists
          </a>
          <a className="pf-button secondary" href="/writing">
            More writing
          </a>
        </div>
      </article>
    </Shell>
  );
}
