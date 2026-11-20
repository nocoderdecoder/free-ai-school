import type { ReactNode } from "react";
import { Nav } from "../Nav";
import { profile } from "../../lib/portfolio/content";

export function Footer() {
  return (
    <footer className="pf-footer">
      <div className="pf-wrap pf-footer-inner">
        <p>© {new Date().getFullYear()} Anshul Gupta</p>
        <div>
          <a href={profile.linkedin}>LinkedIn</a>
          <a href={profile.github}>GitHub</a>
          <a href="/learn">Learning resources</a>
          <a href="/contact">Contact</a>
        </div>
        <p className="pf-small">
          Personal projects and views. No employer endorsement.
        </p>
      </div>
    </footer>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="pf-site">
      <Nav />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="pf-wrap pf-intro">
      <p className="pf-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="pf-lead">{children}</div>
    </header>
  );
}
export function DemoNote() {
  return (
    <p className="pf-note">
      Independent demonstration. All data, organizations, and results in this
      example are fictional. Built with AI assistance; no employer data or
      systems are used.
    </p>
  );
}
