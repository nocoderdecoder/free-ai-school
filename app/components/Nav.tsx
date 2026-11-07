"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
const links = [
  { label: "Approach", href: "/work" },
  { label: "Demos", href: "/projects" },
  { label: "Writing", href: "/writing" },
  { label: "About", href: "/about" },
  { label: "CV", href: "/cv" },
  { label: "Contact", href: "/contact" },
];
export function Nav(_props: { variant?: "light" } = {}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="pf-nav">
      <a className="pf-skip" href="#main-content">
        Skip to content
      </a>
      <div className="pf-wrap pf-nav-inner">
        <a className="pf-brand" href="/">
          Anshul Gupta<span>Applied AI & GTM</span>
        </a>
        <button
          className="pf-menu"
          aria-expanded={open}
          aria-controls="site-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close menu" : "Menu"}
        </button>
        <nav
          id="site-navigation"
          aria-label="Main navigation"
          className={open ? "pf-links is-open" : "pf-links"}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={path === link.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
