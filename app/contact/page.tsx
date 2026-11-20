import type { Metadata } from "next";
import { Shell, PageIntro } from "../components/portfolio/Shell";
import { ContactForm } from "../components/ContactForm";
import { profile } from "../lib/portfolio/content";
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch about applied AI, GTM programs, product delivery, or professional opportunities.",
};
export default function Contact() {
  return (
    <Shell>
      <PageIntro eyebrow="Contact" title="Let’s talk about the work.">
        <p>
          For professional opportunities, conversations about applied AI and GTM
          execution, speaking, or collaboration.
        </p>
      </PageIntro>
      <section className="pf-wrap pf-article">
        <div className="pf-actions" style={{ marginTop: 0, marginBottom: 32 }}>
          <a className="pf-button secondary" href={profile.linkedin}>
            Connect on LinkedIn ↗
          </a>
          <a className="pf-button secondary" href={`mailto:${profile.email}`}>
            Email directly
          </a>
        </div>
        <ContactForm variant="light" />
        <p className="pf-small" style={{ marginTop: 20 }}>
          Your message is sent by email to Anshul. Please do not include
          confidential information.
        </p>
      </section>
    </Shell>
  );
}
