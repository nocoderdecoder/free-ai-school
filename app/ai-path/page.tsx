import type { Metadata } from 'next'
import { AdvisorApp } from './AdvisorApp'
import './ai-path.css'

export const metadata: Metadata = {
  title: {
    absolute: 'AI Path Diagnostic Studio',
  },
  description: 'A two-path AI diagnostic that turns a use case or evidence of experience into a focused project, learning sequence, and first move.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AIPathPage() {
  return (
    <div className="aiPath">
      <AdvisorApp />
    </div>
  )
}
