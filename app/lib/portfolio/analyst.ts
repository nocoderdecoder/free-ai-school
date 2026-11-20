export const regions = ["All", "North", "South", "West"] as const;
export const months = ["2026-09", "2026-10"] as const;
export const intents = [
  "revenue",
  "target",
  "growth",
  "stockouts",
  "cause",
  "profit",
  "forecast",
  "clarify",
] as const;
export type Intent = (typeof intents)[number];
export type Region = (typeof regions)[number];
export type Query = { intent: Intent; region: Region; month: string };
export type SalesRow = {
  id: string;
  month: string;
  region: Exclude<Region, "All">;
  product: string;
  units: number;
  unitPrice: number;
  revenue: number;
  target: number;
  stockoutDays: number;
};
const seed: [
  string,
  Exclude<Region, "All">,
  number,
  number,
  number,
  number,
  number,
  number,
][] = [
  ["2026-09", "North", 1400, 550, 25000, 25000, 1, 1],
  ["2026-09", "South", 1300, 750, 30000, 30000, 0, 1],
  ["2026-09", "West", 900, 600, 25000, 25000, 0, 0],
  ["2026-10", "North", 1200, 500, 25000, 25000, 4, 3],
  ["2026-10", "South", 1500, 825, 30000, 30000, 0, 0],
  ["2026-10", "West", 1000, 700, 25000, 25000, 1, 2],
];
export const salesRows: SalesRow[] = seed.flatMap(
  ([month, region, a, b, ta, tb, sa, sb], i) => [
    {
      id: `S${String(i * 2 + 1).padStart(2, "0")}`,
      month,
      region,
      product: "Product A",
      units: a,
      unitPrice: 20,
      revenue: a * 20,
      target: ta,
      stockoutDays: sa,
    },
    {
      id: `S${String(i * 2 + 2).padStart(2, "0")}`,
      month,
      region,
      product: "Product B",
      units: b,
      unitPrice: 40,
      revenue: b * 40,
      target: tb,
      stockoutDays: sb,
    },
  ],
);
export type Answer = {
  status: "answered" | "clarify" | "insufficient";
  title: string;
  answer: string;
  formula: string;
  evidence: SalesRow[];
  value: number | null;
  unit: string;
  limitation: string;
};
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const sum = (rows: SalesRow[], field: "revenue" | "target" | "stockoutDays") =>
  rows.reduce((n, r) => n + r[field], 0);
export const questionLabels: Record<Intent, string> = {
  revenue: "What were sales?",
  target: "How did sales compare with target?",
  growth: "How did sales change from last month?",
  stockouts: "Where was stock unavailable?",
  cause: "What caused the change in sales?",
  profit: "What was profit?",
  forecast: "What will sales be next month?",
  clarify: "Which region performed best?",
};
export function isQuery(x: unknown): x is Query {
  if (!x || typeof x !== "object") return false;
  const q = x as Query;
  return (
    intents.includes(q.intent) &&
    regions.includes(q.region) &&
    typeof q.month === "string" &&
    /^\d{4}-\d{2}$/.test(q.month)
  );
}
export function analyze(q: Query): Answer {
  const rows = salesRows.filter(
    (r) => r.month === q.month && (q.region === "All" || r.region === q.region),
  );
  const base = {
    evidence: rows,
    value: null,
    unit: "",
    formula: "",
    limitation:
      "Synthetic data. Sales are gross revenue in USD, before returns, tax, and costs.",
  };
  if (q.intent === "clarify")
    return {
      ...base,
      status: "clarify",
      title: "Choose a definition of performance",
      answer:
        "Do you mean sales, target attainment, sales growth, or stock availability? The ranking may change with the measure.",
      evidence: [],
    };
  if (!rows.length)
    return {
      ...base,
      status: "insufficient",
      title: "No data for this period",
      answer:
        "This example contains September and October 2026 only. No result is inferred for another period.",
    };
  const revenue = sum(rows, "revenue"),
    target = sum(rows, "target");
  if (q.intent === "revenue")
    return {
      ...base,
      status: "answered",
      title: `${q.region} sales`,
      answer: `Sales were ${money(revenue)} in ${q.month}.`,
      formula: `Sum of units × unit price across ${rows.length} source rows = ${money(revenue)}.`,
      value: revenue,
      unit: "USD",
    };
  if (q.intent === "target")
    return {
      ...base,
      status: "answered",
      title: "Target attainment",
      answer: `${((revenue / target) * 100).toFixed(1)}% of target: ${money(revenue)} in sales against ${money(target)} planned. The gap is ${money(revenue - target)}.`,
      formula: `${revenue} / ${target} × 100. Gap = sales − target.`,
      value: (revenue / target) * 100,
      unit: "percent",
    };
  if (q.intent === "profit")
    return {
      ...base,
      status: "insufficient",
      title: "Profit cannot be calculated",
      answer:
        "The dataset has sales and targets, but no costs, returns, or tax. Revenue must not be presented as profit.",
      formula: "Profit requires a defined cost basis and additional inputs.",
    };
  if (q.intent === "forecast")
    return {
      ...base,
      status: "insufficient",
      title: "A forecast is outside this example",
      answer:
        "Two months of invented observations do not support a defensible next-month forecast. No prediction is generated.",
    };
  if (q.intent === "stockouts")
    return {
      ...base,
      status: "answered",
      title: "Recorded stock unavailability",
      answer: `${sum(rows, "stockoutDays")} product-region days of stock unavailability were recorded. This is a sum across products and regions, not distinct calendar days or lost sales.`,
      formula: "Sum stockoutDays across the selected product-region records.",
      value: sum(rows, "stockoutDays"),
      unit: "product-region days",
      limitation:
        "Stockout days alone do not establish demand, lost revenue, or the cause of a sales change.",
    };
  const [y, m] = q.month.split("-").map(Number),
    prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const previous = salesRows.filter(
      (r) => r.month === prev && (q.region === "All" || r.region === q.region),
    ),
    before = sum(previous, "revenue");
  if (!previous.length || !before)
    return {
      ...base,
      status: "insufficient",
      title: "Comparison period unavailable",
      answer: `No usable ${prev} baseline is available. A growth rate or explanation would require that baseline.`,
    };
  const change = revenue - before,
    growth = (change / before) * 100;
  if (q.intent === "cause")
    return {
      ...base,
      status: "insufficient",
      title: "The change is observable; the cause is not",
      answer: `Sales changed by ${money(change)} (${growth.toFixed(1)}%) from ${prev} to ${q.month}. Stock availability and unit volumes can be investigated, but this dataset cannot establish why the change happened.`,
      formula: `Observed change = ${money(revenue)} − ${money(before)}. This is a comparison, not a causal estimate.`,
      evidence: [...previous, ...rows],
    };
  return {
    ...base,
    status: "answered",
    title: "Month-over-month sales change",
    answer: `Sales changed ${growth.toFixed(1)}%, from ${money(before)} to ${money(revenue)}. The absolute change is ${money(change)}.`,
    formula: `(${revenue} − ${before}) / ${before} × 100.`,
    value: growth,
    unit: "percent",
    evidence: [...previous, ...rows],
  };
}
// Independent, hand-calculated reference values. These are checks of a bounded calculation layer, not an LLM benchmark.
const reference = [
  {
    region: "All",
    revenue: 155000,
    target: 96.875,
    growth: 4.72972972972973,
    stockouts: 10,
  },
  { region: "North", revenue: 44000, target: 88, growth: -12, stockouts: 7 },
  { region: "South", revenue: 63000, target: 105, growth: 12.5, stockouts: 0 },
  {
    region: "West",
    revenue: 48000,
    target: 96,
    growth: 14.285714285714285,
    stockouts: 3,
  },
] as const;
export type EvalCase = {
  id: string;
  query: Query;
  expectedStatus: Answer["status"];
  expectedValue: number | null;
  category: string;
};
export const evalCases: EvalCase[] = reference.flatMap((r) => [
  ...(["revenue", "target", "growth", "stockouts"] as const).map((intent) => ({
    id: `${r.region}-${intent}`,
    query: { region: r.region, intent, month: "2026-10" },
    expectedStatus: "answered" as const,
    expectedValue: r[intent],
    category: "Calculation",
  })),
  ...(["cause", "profit", "forecast"] as const).map((intent) => ({
    id: `${r.region}-${intent}`,
    query: { region: r.region, intent, month: "2026-10" },
    expectedStatus: "insufficient" as const,
    expectedValue: null,
    category: "Evidence boundary",
  })),
  {
    id: `${r.region}-ambiguous`,
    query: { region: r.region, intent: "clarify" as const, month: "2026-10" },
    expectedStatus: "clarify" as const,
    expectedValue: null,
    category: "Clarification",
  },
  {
    id: `${r.region}-missing`,
    query: { region: r.region, intent: "revenue" as const, month: "2026-11" },
    expectedStatus: "insufficient" as const,
    expectedValue: null,
    category: "Missing data",
  },
  {
    id: `${r.region}-no-baseline`,
    query: { region: r.region, intent: "growth" as const, month: "2026-09" },
    expectedStatus: "insufficient" as const,
    expectedValue: null,
    category: "Missing data",
  },
]);
export function runEvaluations() {
  return evalCases.map((test) => {
    const result = analyze(test.query);
    return {
      ...test,
      actualStatus: result.status,
      actualValue: result.value,
      passed:
        result.status === test.expectedStatus &&
        (test.expectedValue === null
          ? result.value === null
          : result.value !== null &&
            Math.abs(result.value - test.expectedValue) < 0.000001),
    };
  });
}
