import type { Metadata } from 'next'

import '../legal.css'

export const metadata: Metadata = {
  title: { absolute: 'Privacy — AI Path' },
  description: 'How AI Path handles diagnostic answers and account data.',
  robots: { index: false, follow: false },
}

export default function AIPathPrivacyPage() {
  return (
    <main className="ap-legal-shell">
      <article className="ap-legal-card">
        <a href="/ai-path">← Back to AI Path</a>
        <h1>Privacy</h1>
        <p className="ap-legal-updated">Last updated July 18, 2026</p>
        <p>AI Path is operated by Anshul Gupta. This notice explains the current private-preview behavior.</p>

        <p className="ap-legal-warning"><strong>Do not enter passwords, API keys, financial or health information, or confidential customer, employee, or company data.</strong> Describe sensitive work in general terms.</p>

        <h2>What the tool uses</h2>
        <p>Your answers are used to create the project and learning plan shown to you. Basic technical and abuse-prevention information may be processed to keep the service reliable and secure.</p>

        <h2>Saving and retention</h2>
        <p>Without account saving, your diagnostic is processed for the response and is not added to an account. “Save my answers and plan” is optional and only appears for a verified signed-in user when secure storage has been enabled. The current intended retention period for saved diagnostics is up to 90 days.</p>

        <h2>Local browser data</h2>
        <p>If you save a next step, that small preference is stored in this browser for up to 30 days. You can remove it by selecting the saved button again or clearing browser storage.</p>

        <h2>AI and outside services</h2>
        <p>Provider-backed adaptation remains independently controlled. The interface continues to work with its fixed question route when that feature is unavailable. External learning links are governed by their own privacy terms.</p>

        <h2>Your choices</h2>
        <p>You can use the plan without saving it to an account. Account export and deletion controls will only be activated after their hosted privacy checks pass. For a privacy question or request, use the <a href="/contact">contact page</a>.</p>
      </article>
    </main>
  )
}
