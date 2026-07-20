import type { Metadata } from 'next'

import '../legal.css'

export const metadata: Metadata = {
  title: { absolute: 'Terms — AI Path' },
  description: 'Terms for the AI Path private preview.',
  robots: { index: false, follow: false },
}

export default function AIPathTermsPage() {
  return (
    <main className="ap-legal-shell">
      <article className="ap-legal-card">
        <a href="/ai-path">← Back to AI Path</a>
        <h1>Preview terms</h1>
        <p className="ap-legal-updated">Last updated July 18, 2026</p>
        <p>AI Path is a private-preview learning and planning tool operated by Anshul Gupta. It is intended for adults using it for personal or professional learning.</p>

        <h2>Educational guidance</h2>
        <p>The plan is educational guidance, not legal, medical, financial, security, or employment advice. Check important decisions with an appropriately qualified person.</p>

        <h2>Your responsibility</h2>
        <p>Use only information you are allowed to share. Do not submit credentials, secrets, regulated personal data, or confidential material. Review AI-assisted outputs before acting on them.</p>

        <h2>Preview availability</h2>
        <p>The service may change, pause, or produce incomplete recommendations during the preview. No course, paid tool, or outside service is purchased on your behalf.</p>

        <h2>Learning resources</h2>
        <p>Third-party resources remain subject to their providers’ terms, availability, and pricing. A recommendation is not an endorsement or guarantee.</p>

        <h2>Questions</h2>
        <p>For support or questions about these terms, use the <a href="/contact">contact page</a>.</p>
      </article>
    </main>
  )
}
