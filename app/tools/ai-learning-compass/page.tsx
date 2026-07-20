import type { Metadata } from 'next'
import { Nav } from '../../components/Nav'
import { CompassApp } from './CompassApp'

export const metadata: Metadata = {
  title: 'AI Learning Compass',
  description: 'A five-question adaptive assessment that creates a 30-day AI execution pack with exact tools, steps, prompts, tests, fallbacks, and proof.',
  openGraph: {
    title: 'AI Learning Compass — Get your specific 30-day AI path',
    description: 'Answer five adaptive questions by voice or text. Get an exact pathway, tool stack, build recipe, prompts, tests, fallbacks, and proof.',
    url: 'https://anshul.ai/tools/ai-learning-compass',
  },
}

export default function AILearningCompassPage() {
  return (
    <main className="min-h-screen" style={{backgroundColor: 'var(--ed-bg)', color: 'var(--ed-text)', fontFamily: 'var(--font-sans)'}}>
      <Nav variant="light" />
      <CompassApp />
      <footer className="border-t px-8 py-8 text-center text-sm" style={{borderColor: 'var(--ed-border)', color: 'var(--ed-text-faint)'}}>
        © {new Date().getFullYear()} Anshul Gupta · anshul.ai
      </footer>
    </main>
  )
}
