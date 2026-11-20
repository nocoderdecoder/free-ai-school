import type { Metadata } from "next";
import { createClient } from "next-sanity";
import { Shell, PageIntro } from "../components/portfolio/Shell";
import { guides } from "../lib/portfolio/content";
export const metadata: Metadata = {
  title: "Learning resources",
  description:
    "Selected practical guides and tools for business professionals exploring applied AI.",
};
export const revalidate = 3600;
export default async function Learn() {
  const client = createClient({
    projectId: "8w4exnl4",
    dataset: "production",
    apiVersion: "2024-01-01",
    useCdn: true,
  });
  const raw = await client
    .fetch<
      { title: string; slug: { current: string } }[]
    >('*[_type == "article" && editorialReviewed == true && defined(slug.current)] | order(_updatedAt desc) {title,slug}')
    .catch(() => []);
  const articles = [...new Map(raw.map((a) => [a.slug.current, a])).values()];
  return (
    <Shell>
      <PageIntro
        eyebrow="Learning resources"
        title="Learn through a useful problem."
      >
        <p>
          Start with a practical guide, inspect a demonstration, and use a
          checklist to make the next step concrete.
        </p>
      </PageIntro>
      <section className="pf-wrap pf-section">
        <div className="pf-grid three">
          {guides.map((g) => (
            <article className="pf-card" key={g.slug}>
              <span className="pf-tag">{g.category}</span>
              <h2>{g.title}</h2>
              <p>{g.summary}</p>
              <a className="pf-text-link" href={`/writing/${g.slug}`}>
                Read the guide →
              </a>
            </article>
          ))}
        </div>
        <div className="pf-actions">
          <a className="pf-button" href="/tools/ai-learning-compass">
            Find a learning direction
          </a>
          <a className="pf-button secondary" href="https://shortaicourses.com">
            Explore Short AI Courses ↗
          </a>
          <a className="pf-button secondary" href="/resources">
            Use the checklists
          </a>
        </div>
      </section>
      {articles.length > 0 && (
        <section className="pf-wrap pf-section">
          <h2>From the learning library</h2>
          <div className="pf-rows">
            {articles.map((a) => (
              <a
                className="pf-row"
                key={a.slug.current}
                href={`/learn/${a.slug.current}`}
              >
                <span className="pf-tag">Guide</span>
                <h3>{a.title}</h3>
                <span aria-hidden>↗</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
