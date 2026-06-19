import type { Metadata } from 'next'
import { Nav } from '../../components/Nav'
import { CompassApp } from './CompassApp'

export const metadata: Metadata = {
  title: 'AI Learning Compass',
  description: 'Answer five questions by voice or text and get a focused, personal 30-day AI learning roadmap.',
  openGraph: {
    title: 'AI Learning Compass — What should you learn next?',
    description: 'Talk through where you are. Leave with a focused 30-day AI learning roadmap.',
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
