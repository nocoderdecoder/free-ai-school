import type { Metadata } from "next";
import { Shell, PageIntro, DemoNote } from "../../components/portfolio/Shell";
import Analyst from "./Analyst";
export const metadata: Metadata = {
  title: "Commercial analyst demonstration",
  description:
    "Inspect calculations, source rows, and regression results in an independent commercial analytics example using synthetic data.",
};
export default function Page() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Independent demo / 01"
        title="An answer you can check."
      >
        <p>
          Explore a fictional retailer’s sales. Inspect the numbers and the
          evidence, including the questions this dataset cannot answer.
        </p>
        <DemoNote />
      </PageIntro>
      <Analyst />
    </Shell>
  );
}
