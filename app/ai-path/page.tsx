import type { Metadata } from 'next'
import { AdvisorApp } from './AdvisorApp'
import './ai-path.css'

export const metadata: Metadata = {
  title: {
    absolute: 'AI Path — Your practical AI plan',
  },
  description: 'Answer six short questions and get a practical AI project, learning plan, and first step.',
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
