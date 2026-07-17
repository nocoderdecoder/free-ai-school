import type { Metadata } from 'next'
import { Nav } from '../components/Nav'
import { AdvisorApp } from './AdvisorApp'
import './ai-path.css'

export const metadata: Metadata = {
  title: 'AI Path Advisor — Private Alpha',
  description: 'A voice-first conversation that turns your goals, experience, and available time into a realistic 30-day AI learning plan.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AIPathPage() {
  return (
    <main className="aiPath">
      <Nav variant="light" />
      <AdvisorApp />
    </main>
  )
}
