import type { Metadata } from "next";
import { Shell, PageIntro, DemoNote } from "../components/portfolio/Shell";
export const metadata: Metadata = {
  title: "Independent demonstrations",
  description:
    "Explore synthetic commercial analytics and GTM activation demonstrations, with calculations and assumptions you can inspect.",
  alternates: { canonical: "https://anshul.ai/projects" },
};
export default function Projects() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Independent projects"
        title="Try it. Inspect it. Question it."
      >
        <p>
          Two demonstrations of how I approach analytical reliability and
          business execution. Each makes the inputs, assumptions, and
          limitations visible.
        </p>
      </PageIntro>
      <section className="pf-wrap pf-section">
        <div className="pf-grid">
          <article className="pf-card">
            <span className="pf-tag">Guided analytical demo</span>
            <h2>Commercial analyst</h2>
            <p>
              Explore target attainment, sales changes, and stock availability
              in a fictional retail business. Every supported answer includes
              its calculation and source rows.
            </p>
            <p>
              Includes a reproducible regression suite. Guided mode uses
              deterministic calculations, not a live language model.
            </p>
            <a className="pf-text-link" href="/demos/commercial-analyst">
              Try the analyst →
            </a>
          </article>
          <article className="pf-card">
            <span className="pf-tag">Interactive planning model</span>
            <h2>GTM activation planner</h2>
            <p>
              Diagnose a fictional activation funnel. Compare a guided setup,
              customer workshop, or onboarding change using explicit cost and
              lift assumptions.
            </p>
            <p>
              Includes an editable scenario and program brief. Estimates are
              planning assumptions, not measured customer outcomes.
            </p>
            <a className="pf-text-link" href="/demos/gtm-activation">
              Explore the planner →
            </a>
          </article>
        </div>
        <DemoNote />
      </section>
      <section className="pf-wrap pf-section">
        <div className="pf-section-head">
          <h2>Other tools and learning projects</h2>
        </div>
        <div className="pf-grid three">
          {[
            [
              "PromptGrade",
              "A prompt scoring and rewriting tool. Scores are suggestions, not evidence that a prompt will improve task performance.",
              "https://www.ratemyprompt.pro/",
            ],
            [
              "AI Learning Compass",
              "An adaptive interview and learning plan for professionals deciding what to learn and build next.",
              "/tools/ai-learning-compass",
            ],
            [
              "Speaking speed tester",
              "A small browser experiment for measuring speaking pace.",
              "/tools/speaking-speed",
            ],
          ].map(([t, d, h]) => (
            <article className="pf-card" key={t}>
              <h3>{t}</h3>
              <p>{d}</p>
              <a className="pf-text-link" href={h}>
                Explore →
              </a>
            </article>
          ))}
        </div>
        <div className="pf-actions">
          <a className="pf-button secondary" href="/tools">
            Browse existing AI tools
          </a>
          <a
            className="pf-button secondary"
            href="https://github.com/nocoderdecoder/free-ai-school"
          >
            View site source ↗
          </a>
        </div>
      </section>
    </Shell>
  );
}
