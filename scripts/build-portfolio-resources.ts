import { writeFileSync, mkdirSync } from "node:fs";
import { guides } from "../app/lib/portfolio/content";
import {
  salesRows,
  evalCases,
  runEvaluations,
} from "../app/lib/portfolio/analyst";
mkdirSync("public/resources", { recursive: true });
writeFileSync(
  "public/resources/ai-gtm-checklists.txt",
  `PRACTICAL AI AND GTM CHECKLISTS\nAnshul Gupta | anshul.ai\nOriginal public resources. Fictional examples. No employer materials.\n\n` +
    guides
      .map(
        (g) =>
          `${g.title}\n${g.sections
            .flatMap((s) => s.checklist || [])
            .map((x) => `[ ] ${x}`)
            .join("\n")}\nRead: https://anshul.ai/writing/${g.slug}`,
      )
      .join("\n\n"),
);
const fields = Object.keys(
  salesRows[0],
) as (keyof (typeof salesRows)[number])[];
writeFileSync(
  "public/resources/synthetic-sales.csv",
  fields.join(",") +
    "\n" +
    salesRows.map((r) => fields.map((f) => r[f]).join(",")).join("\n") +
    "\n",
);
writeFileSync(
  "public/resources/analyst-reference-cases.json",
  JSON.stringify(
    {
      description:
        "Synthetic calculation-layer regression cases, not a model accuracy benchmark.",
      cases: evalCases,
    },
    null,
    2,
  ) + "\n",
);
const results = runEvaluations();
if (results.some((r) => !r.passed))
  throw new Error("Portfolio regression failure");
console.log(
  `Generated public resources; ${results.length}/${results.length} calculation-layer checks passed.`,
);
