import type { ReactNode } from 'react'
import { Nav } from './Nav'
import { publicProfile } from '../lib/publicProfile'
import s from '../profile.module.css'

export function ContactLinks() {
  return (
    <div className={s.contactLinks}>
      <a href={publicProfile.linkedIn} target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a href={`mailto:${publicProfile.email}`}>Email</a>
    </div>
  )
}

export function PortfolioShell({ children }: { children: ReactNode }) {
  return (
    <div className={s.site}>
      <a href="#main-content" className={s.skipLink}>Skip to content</a>
      <Nav />
      <main id="main-content" className={s.main}>{children}</main>
      <footer className={s.footer}>
        <div>
          <p>Anshul Gupta</p>
          <p className={s.muted}>Views and independent projects are my own.</p>
        </div>
        <ContactLinks />
      </footer>
    </div>
  )
}
