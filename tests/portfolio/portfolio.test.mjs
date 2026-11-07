import test from "node:test";
import assert from "node:assert/strict";
import analyst from "../../app/lib/portfolio/analyst.ts";
const { analyze, runEvaluations, salesRows, isQuery } = analyst;
import activation from "../../app/lib/portfolio/activation.ts";
const { modelActivation } = activation;
for (const c of runEvaluations())
  test(`reference: ${c.id}`, () => assert.equal(c.passed, true));
test("target attainment uses weighted totals", () =>
  assert.equal(
    analyze({ intent: "target", region: "All", month: "2026-10" }).value,
    96.875,
  ));
test("causal answers do not turn correlations into an explanation", () => {
  const a = analyze({ intent: "cause", region: "North", month: "2026-10" });
  assert.equal(a.status, "insufficient");
  assert.match(a.answer, /cannot establish/);
  assert.equal(a.value, null);
});
test("source records reconcile revenue", () => {
  for (const row of salesRows)
    assert.equal(row.revenue, row.units * row.unitPrice);
});
test("query validator rejects unsupported operations", () => {
  assert.equal(
    isQuery({ intent: "sql", region: "All", month: "2026-10" }),
    false,
  );
  assert.equal(
    isQuery({ intent: "revenue", region: "Unknown", month: "2026-10" }),
    false,
  );
  assert.equal(isQuery(null), false);
});
test("zero-lift scenario does not recommend a program", () => {
  const p = modelActivation("small", 0, 15000);
  assert.equal(p.recommendation, null);
  assert.ok(p.options.every((x) => x.costPerActivation === null));
});
test("insufficient budget has no feasible recommendation", () =>
  assert.equal(modelActivation("small", 8, 0).recommendation, null));
test("default scenario calculations match independent reference", () => {
  const p = modelActivation("small", 8, 15000);
  assert.equal(p.baseline, 30);
  assert.equal(p.options[0].cost, 3920);
  assert.equal(p.options[0].additional, 19.2);
  assert.equal(p.options[1].additional, 28.8);
  assert.equal(p.recommendation.id, "setup");
});
test("activation rates cannot exceed 100 percent", () => {
  for (const id of ["small", "mid", "enterprise"]) {
    const p = modelActivation(id, 25, 100000);
    assert.ok(
      p.options.every(
        (o) =>
          o.projectedRate <= 100 &&
          o.additional <= p.cohort.signedUp - p.cohort.activated,
      ),
    );
  }
});
test("invalid assumptions fail validation", () => {
  for (const args of [
    ["small", -1, 1000],
    ["small", NaN, 1000],
    ["unknown", 10, 1000],
    ["mid", 10, -1],
  ])
    assert.throws(() => modelActivation(...args));
});
