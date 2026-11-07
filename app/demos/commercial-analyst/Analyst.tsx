"use client";
import { useState } from "react";
import {
  analyze,
  questionLabels,
  regions,
  months,
  runEvaluations,
  type Query,
  type Intent,
  type Region,
  type Answer,
} from "../../lib/portfolio/analyst";
export default function Analyst() {
  const [query, setQuery] = useState<Query>({
    intent: "target",
    region: "North",
    month: "2026-10",
  });
  const [answer, setAnswer] = useState<Answer>(analyze(query)),
    [tested, setTested] = useState(false),
    [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [mode, setMode] = useState("Guided calculation"),
    [timing, setTiming] = useState<number | null>(null);
  const results = tested ? runEvaluations() : [];
  function run() {
    const start = performance.now();
    setAnswer(analyze(query));
    setTiming(performance.now() - start);
    setMode("Guided calculation");
    setError("");
  }
  async function ask() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/demos/commercial-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "The question could not be processed.");
      setAnswer(data.answer);
      setMode(data.mode);
      setTiming(data.elapsedMs);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Please use the guided questions.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="pf-wrap pf-demo">
      <div className="pf-demo-layout">
        <aside className="pf-panel">
          <h2>Ask a question</h2>
          <label className="pf-field">
            Question
            <select
              value={query.intent}
              onChange={(e) =>
                setQuery({ ...query, intent: e.target.value as Intent })
              }
            >
              {Object.entries(questionLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="pf-field">
            Region
            <select
              value={query.region}
              onChange={(e) =>
                setQuery({ ...query, region: e.target.value as Region })
              }
            >
              {regions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="pf-field">
            Period
            <select
              value={query.month}
              onChange={(e) => setQuery({ ...query, month: e.target.value })}
            >
              {months.map((m) => (
                <option key={m}>{m}</option>
              ))}
              <option value="2026-11">2026-11 (no data)</option>
            </select>
          </label>
          <button className="pf-button" onClick={run}>
            Run calculation
          </button>
          <p className="pf-small" style={{ marginTop: 18 }}>
            Guided mode runs locally with fixed calculations. No model call or
            API charge.
          </p>
        </aside>
        <section className="pf-panel" aria-label="Analytical result">
          <p className="pf-tag">{mode}</p>
          <div
            aria-live="polite"
            className="pf-answer"
            style={{ marginTop: 16 }}
          >
            <h2>{answer.title}</h2>
            <p>{answer.answer}</p>
            {answer.formula && (
              <p style={{ marginTop: 12 }}>
                <strong>Calculation:</strong> {answer.formula}
              </p>
            )}
          </div>
          <p>{answer.limitation}</p>
          {timing !== null && (
            <p className="pf-small" style={{ marginTop: 12 }}>
              Last response: {timing < 1 ? "<1" : Math.round(timing)} ms.{" "}
              {mode === "Guided calculation"
                ? "Browser calculation only; excludes page load."
                : "Server processing including model routing; excludes browser network time."}
            </p>
          )}
          <div className="pf-table-wrap">
            <table className="pf-table">
              <caption>
                {answer.evidence.length} source records used. Invented data,
                USD.
              </caption>
              <thead>
                <tr>
                  {[
                    "ID",
                    "Period",
                    "Region",
                    "Product",
                    "Units",
                    "Unit price",
                    "Sales",
                    "Target",
                    "Stockout days",
                  ].map((h) => (
                    <th scope="col" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {answer.evidence.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.month}</td>
                    <td>{r.region}</td>
                    <td>{r.product}</td>
                    <td>{r.units}</td>
                    <td>{r.unitPrice}</td>
                    <td>{r.revenue.toLocaleString("en-US")}</td>
                    <td>{r.target.toLocaleString("en-US")}</td>
                    <td>{r.stockoutDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a
            className="pf-text-link"
            href="/resources/synthetic-sales.csv"
            download
          >
            Download the full synthetic dataset
          </a>
          <details className="pf-detail" style={{ marginTop: 22 }}>
            <summary>Ask in your own words (optional AI routing)</summary>
            <p>
              Ask only about this fictional dataset. Your question is sent to
              the site’s model provider to select a supported calculation. Do
              not include personal or confidential data. If the model service is
              unavailable, guided mode still works.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
            >
              <label className="pf-field" style={{ marginTop: 16 }}>
                Your question
                <textarea
                  required
                  minLength={8}
                  maxLength={500}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What were North’s sales in October 2026?"
                />
              </label>
              <button disabled={busy} className="pf-button">
                {busy ? "Interpreting…" : "Ask the analyst"}
              </button>
            </form>
            {error && (
              <p className="pf-error" role="alert">
                {error}
              </p>
            )}
          </details>
        </section>
      </div>
      <section className="pf-section">
        <div className="pf-section-head">
          <h2>Check the calculation layer.</h2>
          <button
            className="pf-button secondary"
            onClick={() => setTested(true)}
          >
            Run regression checks
          </button>
        </div>
        <p className="pf-lead">
          40 reference cases cover arithmetic, missing data, clarification, and
          unsupported conclusions.
        </p>
        <p className="pf-small" style={{ marginTop: 12 }}>
          These checks call the calculation function directly. They do not test
          the optional language model’s interpretation of free-text questions,
          and are not a production accuracy claim.
        </p>
        {tested && (
          <div aria-live="polite">
            <p className="pf-note">
              {results.filter((r) => r.passed).length} / {results.length}{" "}
              calculation-layer checks passed in this run.
            </p>
            <div className="pf-table-wrap">
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Category</th>
                    <th>Expected</th>
                    <th>Observed</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.category}</td>
                      <td>
                        {r.expectedStatus}
                        {r.expectedValue !== null
                          ? ` (${r.expectedValue.toFixed(3)})`
                          : ""}
                      </td>
                      <td>
                        {r.actualStatus}
                        {r.actualValue !== null
                          ? ` (${r.actualValue.toFixed(3)})`
                          : ""}
                      </td>
                      <td className={r.passed ? "pf-success" : "pf-error"}>
                        {r.passed ? "Pass" : "Fail"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      <section className="pf-section">
        <h2>Design decisions and limits</h2>
        <div className="pf-grid" style={{ marginTop: 26 }}>
          <article className="pf-card">
            <h3>Keep arithmetic explicit.</h3>
            <p>
              Questions map to a small set of permitted operations. Code
              calculates the result and identifies source rows. The language
              model, when enabled, selects an operation; it does not write SQL,
              execute code, or invent the numerical answer.
            </p>
          </article>
          <article className="pf-card">
            <h3>Make uncertainty useful.</h3>
            <p>
              Missing costs prevent a profit answer. Missing prior-period data
              prevents a growth calculation. A sales movement is reported
              without inventing a cause. Ambiguous performance questions require
              clarification.
            </p>
          </article>
        </div>
        <details className="pf-detail" style={{ marginTop: 24 }}>
          <summary>Data dictionary, cost, and next evaluation step</summary>
          <p>
            Each record is one product, region, and month. Sales equal units ×
            unit price. Target attainment uses total sales / total target, not
            an average of row percentages. Stockout days are summed
            product-region days and can overlap in the calendar.
          </p>
          <p>
            Guided mode makes no model calls. Optional AI routing incurs one
            bounded request; actual provider charges depend on the configured
            model and account. No dollar cost or model accuracy is claimed here.
          </p>
          <p>
            The next evaluation step would use unseen question phrasings,
            repeated model trials, and adversarial requests to test routing
            separately. Before enterprise use, this would need access controls,
            representative datasets, production monitoring, and a wider test
            suite.
          </p>
        </details>
        <div className="pf-actions">
          <a
            className="pf-button secondary"
            href="/writing/evaluating-a-commercial-ai-analyst"
          >
            Read the evaluation guide
          </a>
          <a
            className="pf-button secondary"
            href="https://github.com/nocoderdecoder/free-ai-school/tree/codex/public-ai-gtm-portfolio/app/lib/portfolio"
          >
            Inspect the implementation ↗
          </a>
        </div>
      </section>
    </div>
  );
}
