"use client";
import { useState } from "react";
import { cohorts, modelActivation } from "../../lib/portfolio/activation";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export default function Planner() {
  const [segment, setSegment] = useState("small"),
    [lift, setLift] = useState(8),
    [budget, setBudget] = useState(15000);
  const plan = modelActivation(segment, lift, budget),
    c = plan.cohort,
    r = plan.recommendation;
  function download() {
    const body = `GTM ACTIVATION PROGRAM BRIEF\nFictional scenario. Planning assumptions, not measured outcomes.\n\nSegment: ${c.label}\nCohort: ${c.signedUp} accounts; ${c.connected} connected; ${c.activated} activated.\nActivation: first successful workflow within 14 days of signup. All baseline accounts have a full observation window.\nBaseline: ${plan.baseline.toFixed(1)}%\nBudget: ${money(budget)}\nBase assumed lift: ${lift} percentage points\n\n${plan.options.map((o) => `${o.name}: assumed lift ${o.appliedLift.toFixed(1)} pp; expected additional activations ${o.additional.toFixed(1)}; cost ${money(o.cost)}; ${o.withinBudget ? "within" : "over"} budget`).join("\n")}\n\nSuggested option under this cost-per-additional-activation rule: ${r?.name || "No feasible positive-impact option"}\nOwner: ${r?.owner || "Assign after scoping"}\nDependency: ${r?.dependency || "Revise cost or impact assumptions"}\n\nWeek 1: Validate instrumentation and interview customers about failed activation attempts.\nWeek 2: Randomize eligible pilot accounts where practical and launch the intervention.\nWeeks 3-4: Observe a full 14-day window, then compare activation and support burden.\nPrimary measure: 14-day activation, same event definition and denominator.\nGuardrails: successful workflow quality, support hours per account, and customer complaints.\nDecision: expand only with credible evidence of useful improvement and acceptable support burden; revise or stop otherwise.\n\nLimits: synthetic aggregate data cannot establish causes or treatment effects. Lift assumptions are illustrative. Expected counts can be fractional. This is not a revenue or ROI model. No statistical power claim is made.\n`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "gtm-activation-program-brief.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="pf-wrap pf-demo">
      <section className="pf-panel">
        <h2>1. Inspect the baseline</h2>
        <p>
          Activation means a first successful workflow within 14 days of signup.
          All fictional accounts have completed the observation window.
          Connected accounts have completed the setup connection; activated
          accounts are a subset of connected accounts.
        </p>
        <div className="pf-table-wrap">
          <table className="pf-table">
            <caption>Synthetic mature signup cohorts, September 2026</caption>
            <thead>
              <tr>
                <th>Segment</th>
                <th>Signed up</th>
                <th>Connected</th>
                <th>Activated</th>
                <th>Activation rate</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((x) => (
                <tr key={x.id}>
                  <td>{x.label}</td>
                  <td>{x.signedUp}</td>
                  <td>{x.connected}</td>
                  <td>{x.activated}</td>
                  <td>{((x.activated / x.signedUp) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pf-small">
          A funnel drop identifies an investigation point. It does not reveal
          why customers stopped.
        </p>
      </section>
      <section className="pf-section">
        <div className="pf-section-head">
          <h2>2. Compare possible interventions</h2>
        </div>
        <div className="pf-demo-layout">
          <aside className="pf-panel">
            <label className="pf-field">
              Customer segment
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              >
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="pf-field">
              Base assumed activation lift: {lift} percentage points
              <input
                aria-label="Base assumed activation lift"
                type="range"
                min={0}
                max={25}
                step={1}
                value={lift}
                onChange={(e) => setLift(Number(e.target.value))}
              />
            </label>
            <label className="pf-field">
              Pilot budget (USD)
              <input
                type="number"
                min={0}
                max={100000}
                step={500}
                value={budget}
                onChange={(e) =>
                  setBudget(
                    Math.max(0, Math.min(100000, Number(e.target.value) || 0)),
                  )
                }
              />
            </label>
            <p className="pf-small">
              Guided setup uses the base lift, workshops 1.5×, and assisted
              onboarding 2×. These multipliers are deliberately editable
              planning assumptions through the base lift, not empirical
              estimates.
            </p>
          </aside>
          <div className="pf-panel">
            <div className="pf-metrics">
              <div className="pf-metric">
                <span>Current activation</span>
                <strong>{plan.baseline.toFixed(1)}%</strong>
              </div>
              <div className="pf-metric">
                <span>Not yet activated</span>
                <strong>{c.signedUp - c.activated}</strong>
              </div>
              <div className="pf-metric">
                <span>Accounts in scenario</span>
                <strong>{c.signedUp}</strong>
              </div>
            </div>
            <div className="pf-table-wrap">
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Assumed lift</th>
                    <th>Expected extra activations</th>
                    <th>Cost</th>
                    <th>Cost / extra activation</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.options.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.name}
                        {!o.withinBudget && (
                          <div className="pf-small">Over budget</div>
                        )}
                      </td>
                      <td>{o.appliedLift.toFixed(1)} pp</td>
                      <td>{o.additional.toFixed(1)}</td>
                      <td>{money(o.cost)}</td>
                      <td>
                        {o.costPerActivation === null
                          ? "No assumed gain"
                          : money(o.costPerActivation)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pf-answer" aria-live="polite">
              <h3>
                {r
                  ? `Investigate: ${r.name}`
                  : "Revise the scenario before choosing an intervention"}
              </h3>
              <p>
                {r
                  ? `${r.name} has the lowest modeled cost per additional activation among options within this budget. Validate the lift assumption before committing. No option has been tested with customers.`
                  : "No option combines a positive assumed lift with an affordable cost. Increase the feasible budget, revise the scope, or gather evidence before proceeding."}
              </p>
            </div>
            <details className="pf-detail">
              <summary>Inspect the formulas and costs</summary>
              <p>
                Expected additional activations = signup cohort × assumed
                percentage-point lift / 100, capped at the unactivated
                population. Expected counts may be fractional because they are
                estimates.
              </p>
              <p>
                Total cost = fixed preparation cost + cost per signup account ×
                cohort size. All costs are invented, one-time pilot costs.
                Guided setup: $2,000 + $8/account. Workshop: $3,500 +
                $30/account. Assisted onboarding: $4,500 + $80/account.
              </p>
              <p>
                The model assumes the full segment cohort is offered the
                intervention. It ignores longer-term retention, revenue, and
                spillovers. The ranking is sensitive to assumptions and is not a
                claim of causal impact.
              </p>
            </details>
          </div>
        </div>
      </section>
      <section className="pf-section">
        <div className="pf-section-head">
          <h2>3. Turn the hypothesis into a program</h2>
          <button className="pf-button secondary" onClick={download}>
            Download this brief
          </button>
        </div>
        <p className="pf-lead">
          {r ? r.hypothesis : "Define a feasible hypothesis before a pilot."}
        </p>
        <div className="pf-grid" style={{ marginTop: 25 }}>
          <article className="pf-card">
            <span className="pf-tag">Ownership</span>
            <h3>{r?.owner || "Assign accountable roles"}</h3>
            <p>
              {r?.dependency ||
                "Resolve the cost, scope, and outcome assumptions first."}
            </p>
            <p>
              A GTM program lead owns the decision log and coordination. Product
              owns instrumentation. Customer success owns the rollout and
              feedback. The executive sponsor resolves scope and resource
              tradeoffs.
            </p>
          </article>
          <article className="pf-card">
            <span className="pf-tag">Measurement</span>
            <h3>A full observation window.</h3>
            <p>
              Compare 14-day activation using the same event and eligibility
              rules. Randomize a pilot and comparison group where practical;
              check sample size before claiming an effect.
            </p>
            <p>
              Track support hours, failed workflows, and complaints alongside
              activation. Keep projected lift separate from observed results.
            </p>
          </article>
        </div>
        <div className="pf-grid three" style={{ marginTop: 24 }}>
          {[
            [
              "Week 1",
              "Validate the baseline, inspect failed attempts, and interview customers. Record the hypothesis and expansion criteria.",
            ],
            [
              "Week 2",
              "Launch a bounded pilot after instrumentation and capacity checks. Keep a comparison group where feasible.",
            ],
            [
              "Weeks 3–4",
              "Wait for each account’s full observation window. Review outcomes and support burden before expanding, revising, or stopping.",
            ],
          ].map(([t, d]) => (
            <div className="pf-step" key={t}>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
        <a
          className="pf-text-link"
          href="/writing/turning-a-gtm-problem-into-a-program"
        >
          Read the program-planning guide →
        </a>
      </section>
    </div>
  );
}
