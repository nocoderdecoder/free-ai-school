import type { Metadata } from "next";
import { Shell, PageIntro } from "../components/portfolio/Shell";
export const metadata: Metadata = {
  title: "Approach",
  description:
    "A practical approach to problem definition, AI evaluation, and GTM execution.",
  alternates: { canonical: "https://anshul.ai/work" },
};
const steps = [
  [
    "Start with a decision",
    "Who needs to decide or act, what is difficult today, and what would a better outcome look like? Define the workflow and a baseline before choosing a tool.",
    "/writing/turning-a-gtm-problem-into-a-program",
    "Use the GTM program brief",
  ],
  [
    "Make the problem testable",
    "Specify the data, the metric, and the expected behavior. Include ambiguous requests and cases where the system should ask a question or decline to conclude.",
    "/writing/evaluating-a-commercial-ai-analyst",
    "Read the evaluation guide",
  ],
  [
    "Inspect the tradeoffs",
    "Compare the simplest workable approaches. Make assumptions about quality, cost, time, and implementation effort visible.",
    "/demos/commercial-analyst",
    "Inspect a working demonstration",
  ],
  [
    "Plan for recurring use",
    "Assign ownership, define the rollout, and measure the full workflow. Connect adoption to an observable outcome and a decision about what happens next.",
    "/writing/from-ai-time-saved-to-business-value",
    "Use the value worksheet",
  ],
];
export default function Work() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Approach"
        title="From a business question to a working plan."
      >
        <p>
          Practical methods for defining a useful AI product and running the
          program around it.
        </p>
      </PageIntro>
      <section className="pf-wrap pf-section">
        <div className="pf-grid">
          {steps.map(([t, d, h, l], i) => (
            <article className="pf-card" key={t}>
              <span className="pf-tag">0{i + 1}</span>
              <h2>{t}</h2>
              <p>{d}</p>
              <a className="pf-text-link" href={h}>
                {l} →
              </a>
            </article>
          ))}
        </div>
        <p className="pf-note">
          These guides are original public resources using invented examples.
          They do not describe, reproduce, or evaluate any employer’s internal
          work.
        </p>
      </section>
    </Shell>
  );
}
