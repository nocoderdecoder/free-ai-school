import type { Metadata } from "next";
import { Shell, PageIntro } from "../components/portfolio/Shell";
import { guides } from "../lib/portfolio/content";
export const metadata: Metadata = {
  title: "Writing",
  description:
    "Practical writing on AI evaluation, adoption, business value, and GTM execution.",
  alternates: { canonical: "https://anshul.ai/writing" },
};
export default function Writing() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Writing"
        title="Useful questions. Explicit assumptions."
      >
        <p>
          Practical notes on making AI useful in business, with worked examples
          and checklists you can apply.
        </p>
      </PageIntro>
      <section className="pf-wrap pf-section">
        <div className="pf-rows">
          {guides.map((g) => (
            <a key={g.slug} className="pf-row" href={`/writing/${g.slug}`}>
              <span className="pf-tag">
                {g.category} · {g.minutes} min
              </span>
              <div>
                <h3>{g.title}</h3>
                <p>{g.summary}</p>
              </div>
              <span aria-hidden>↗</span>
            </a>
          ))}
        </div>
        <p className="pf-note">
          The examples are fictional. These articles express a personal approach
          and do not document employer projects or internal methods.
        </p>
      </section>
    </Shell>
  );
}
