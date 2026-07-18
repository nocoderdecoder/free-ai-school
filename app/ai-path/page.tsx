import type { Metadata } from 'next'
import { AdvisorApp } from './AdvisorApp'
import './ai-path.css'

export const metadata: Metadata = {
  title: {
    absolute: 'AI Learning Advisor',
  },
  description: 'A short conversation that turns your goal, experience, and available time into a practical AI learning path.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AIPathPage() {
  return (
    <main className="aiPath">
      <AdvisorApp />
    </main>
  )
}
