import type { Metadata } from "next";
import { Shell } from "./components/portfolio/Shell";
import { JsonLd, personSchema } from "./components/JsonLd";
import { guides } from "./lib/portfolio/content";
export const metadata: Metadata = {
  title: { absolute: "Anshul Gupta | Applied AI & GTM Strategy" },
  description:
    "Commercial judgment, useful AI, and cross-functional execution. Independent demos and practical writing by Anshul Gupta, Google strategy and operations, Kellogg MBA.",
  alternates: { canonical: "https://anshul.ai" },
};
export default function Home() {
  return (
    <Shell>
      <JsonLd data={personSchema()} />
      <section className="pf-wrap pf-hero">
        <div>
          <p className="pf-eyebrow">Applied AI · GTM strategy · Execution</p>
          <h1>Turning business problems into useful AI.</h1>
          <p className="pf-lead">
            I’m Anshul. I work across commercial strategy, product definition,
            and adoption, connecting what a business needs with what a team can
            deliver.
          </p>
          <div className="pf-actions">
            <a className="pf-button" href="/projects">
              Explore the demos <span aria-hidden>↗</span>
            </a>
            <a className="pf-button secondary" href="/cv">
              View my background
            </a>
          </div>
          <div className="pf-credentials">
            <div>
              <strong>Google</strong>Strategy & operations
            </div>
            <div>
              <strong>Kellogg</strong>MBA, 2024
            </div>
            <div>
              <strong>Unilever / GSK</strong>Commercial experience
            </div>
          </div>
        </div>
        <a
          className="pf-proof"
          href="/demos/commercial-analyst"
          aria-label="Explore the commercial analyst demonstration"
        >
          <div className="pf-proof-top">
            <span>Inside the demo</span>
            <span>Synthetic data</span>
          </div>
          <h2>Which region missed its October target?</h2>
          <div className="pf-bars">
            {[
              { name: "North", value: 88 },
              { name: "South", value: 105 },
              { name: "West", value: 96 },
            ].map((x) => (
              <div className="pf-bar-row" key={x.name}>
                <span>{x.name}</span>
                <div className="pf-bar-track">
                  <div
                    className="pf-bar-fill"
                    style={{ width: `${x.value / 1.2}%` }}
                  />
                </div>
                <span>{x.value}%</span>
              </div>
            ))}
          </div>
          <p className="pf-small">Sales as a percentage of target</p>
          <div className="pf-proof-answer">
            <strong>Show the evidence.</strong>Inspect the calculation, check
            the source rows, and separate an observation from a possible
            explanation.
          </div>
          <p className="pf-small" style={{ marginTop: 16 }}>
            Try the example →
          </p>
        </a>
      </section>
      <section className="pf-wrap pf-section">
        <div className="pf-section-head">
          <h2>Explore the work in practice.</h2>
          <a href="/projects">All demonstrations →</a>
        </div>
        <div className="pf-grid">
          <article className="pf-card">
            <span className="pf-tag">01 / Analytical reliability</span>
            <h3>A commercial analyst you can inspect.</h3>
            <p>
              Ask a guided question about an invented retail business. Examine
              the answer, calculation, source records, and evaluation results.
            </p>
            <a className="pf-text-link" href="/demos/commercial-analyst">
              Open the analyst →
            </a>
          </article>
          <article className="pf-card">
            <span className="pf-tag">02 / GTM execution</span>
            <h3>From an activation gap to a program.</h3>
            <p>
              Explore a fictional customer funnel, compare interventions, and
              change assumptions to see how the recommendation holds up.
            </p>
            <a className="pf-text-link" href="/demos/gtm-activation">
              Explore the GTM model →
            </a>
          </article>
        </div>
        <p className="pf-small" style={{ marginTop: 18 }}>
          Independent demonstrations built with AI assistance and synthetic
          data. These are public learning projects, not employer
          implementations.
        </p>
      </section>
      <section className="pf-wrap pf-section">
        <div className="pf-section-head">
          <h2>How I approach the work.</h2>
          <a href="/work">Read the approach →</a>
        </div>
        <div className="pf-grid three">
          {[
            [
              "Define the decision",
              "Get specific about the user, the problem, the available evidence, and what success would change.",
            ],
            [
              "Make quality observable",
              "Specify correct behavior, inspect failures, and test the assumptions behind a convincing answer.",
            ],
            [
              "Build for actual use",
              "Plan ownership, rollout, feedback, and the operating rhythm that turns a tool into recurring use.",
            ],
          ].map(([t, d], i) => (
            <div className="pf-step" key={t}>
              <span>0{i + 1}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="pf-wrap pf-section">
        <div className="pf-section-head">
          <h2>Practical notes.</h2>
          <a href="/writing">All writing →</a>
        </div>
        <div className="pf-rows">
          {guides.map((g) => (
            <a className="pf-row" href={`/writing/${g.slug}`} key={g.slug}>
              <span className="pf-tag">{g.category}</span>
              <div>
                <h3>{g.title}</h3>
                <p>{g.summary}</p>
              </div>
              <span aria-hidden>↗</span>
            </a>
          ))}
        </div>
      </section>
      <section className="pf-wrap pf-section">
        <div className="pf-section-head">
          <h2>Let’s talk about the work.</h2>
        </div>
        <p className="pf-lead">
          For conversations about applied AI, GTM programs, product delivery, or
          a role where those meet.
        </p>
        <div className="pf-actions">
          <a className="pf-button" href="/contact">
            Get in touch
          </a>
          <a className="pf-button secondary" href="/resources">
            Use a checklist
          </a>
        </div>
      </section>
    </Shell>
  );
}
