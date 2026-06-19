import type { Metadata } from 'next'
import { Nav } from '../../components/Nav'
import { CompassApp } from './CompassApp'

export const metadata: Metadata = {
  title: 'AI Learning Compass',
  description: 'A five-question adaptive voice assessment that creates a specific 30-day AI learning prescription from your goals, evidence, domain, and constraints.',
  openGraph: {
    title: 'AI Learning Compass — Get your specific 30-day AI path',
    description: 'Answer five adaptive questions by voice or text. Get exact capabilities, tasks, deliverables, and proof to build next.',
    url: 'https://anshul.ai/tools/ai-learning-compass',
  },
}

export default function AILearningCompassPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Nav />
      <CompassApp />
      <footer className="border-t border-white/10 px-8 py-8 text-center text-sm text-white/30">
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
