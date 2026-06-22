'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

const LIGHT_NAV_LINKS = [
  { label: 'AI School', href: '/learn' },
  { label: 'Projects',  href: '/projects' },
  { label: 'Trending',  href: '/trending' },
  { label: 'Writing',   href: '/writing' },
  { label: 'About',     href: '/about' },
]

// Light editorial theme is the site's single canonical theme. The `variant` prop
// is kept for call-site compatibility but only 'light' is rendered.
export function Nav({ variant = 'light' }: { variant?: 'light' }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <nav
        className="sticky top-0 z-50 flex justify-between items-center px-8 py-5 border-b backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(253,252,250,0.92)',
          borderColor: 'var(--ed-border)',
        }}
      >
        <a
          href="/"
          data-cursor="Home"
          style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#222' }}
        >
          Anshul Gupta
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-6 text-sm items-center">
          {LIGHT_NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`transition link-slide ${isActive(link.href) ? 'text-[#222]' : 'text-[#999] hover:text-[#222]'}`}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/contact"
            data-cursor="Contact"
            className="text-xs font-semibold px-5 py-2 rounded-md transition btn-press"
            style={{ background: '#222', color: '#FDFCFA', fontSize: '12px' }}
          >
            Contact
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden transition p-1 text-[#999] hover:text-[#222]"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] bg-[#FDFCFA] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center px-8 py-6 border-b border-[#E8E5E0]">
            <a href="/" className="text-[#222]" style={{ fontFamily: 'var(--font-serif)', fontSize: '22px' }} onClick={() => setMobileOpen(false)}>Anshul Gupta</a>
            <button className="text-[#999] hover:text-[#222] transition" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Links */}
          <div className="flex flex-col px-8 py-8 gap-1 overflow-y-auto">
            {LIGHT_NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-3 text-xl font-medium border-b border-[#E8E5E0] transition ${isActive(link.href) ? 'text-[#222]' : 'text-[#999]'}`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
