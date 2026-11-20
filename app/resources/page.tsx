import type { Metadata } from "next";
import { Shell, PageIntro } from "../components/portfolio/Shell";
import Resources from "./Resources";
export const metadata: Metadata = {
  title: "Practical checklists",
  description:
    "Reusable checklists for AI evaluation, business value, and GTM program planning.",
};
export default function Page() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Practical resources"
        title="Make the next step concrete."
      >
        <p>
          Three working checklists. Tick items as you go, download a plain-text
          copy, or print a clean version.
        </p>
      </PageIntro>
      <Resources />
    </Shell>
  );
}
