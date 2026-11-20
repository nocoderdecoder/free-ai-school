import type { Metadata } from "next";
import { Shell, PageIntro, DemoNote } from "../../components/portfolio/Shell";
import Planner from "./Planner";
export const metadata: Metadata = {
  title: "GTM activation planner",
  description:
    "An interactive synthetic GTM scenario: diagnose a funnel, compare interventions, and inspect an execution plan.",
};
export default function Page() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Independent demo / 02"
        title="Find the gap. Make a plan."
      >
        <p>
          A fictional software company has signups that do not reach a first
          useful outcome. Explore the funnel, compare interventions, and make
          the assumptions explicit.
        </p>
        <DemoNote />
      </PageIntro>
      <Planner />
    </Shell>
  );
}
