'use client'

import { usePathname } from 'next/navigation'
import s from '../profile.module.css'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '/work' },
  { label: 'Speaking', href: '/speaking' },
]

// Retain the prop for older resource pages that share this navigation.
export function Nav({ variant: _variant = 'light' }: { variant?: 'light' }) {
  const pathname = usePathname()
  return (
    <header className={s.header}>
      <nav className={s.navigation} aria-label="Main navigation">
        <a className={s.brand} href="/">Anshul Gupta</a>
        <div className={s.navLinks}>
          {links.map(link => (
            <a key={link.href} href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}>
              {link.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  )
}
