'use client'

import { useState, useRef } from 'react'

const MODULES = [
  {
    key: 'foundations',
    label: 'Foundations',
    tagline: 'What AI is and how it works',
    href: '/learn#foundations',
    articles: [
      { title: 'What AI Actually Is',                  slug: 'ai-basics-what-ai-actually-is' },
      { title: 'Tokens',                               slug: 'ai-basics-tokens' },
      { title: 'How Large Language Models Work',       slug: 'ai-basics-how-llms-work' },
      { title: 'Hallucination',                        slug: 'ai-basics-hallucination' },
      { title: 'Prompts and Prompt Engineering',       slug: 'ai-basics-prompts' },
      { title: 'The Context Window',                   slug: 'ai-basics-context-window' },
      { title: 'AI Agents',                            slug: 'ai-basics-ai-agents' },
      { title: 'The Model vs. The Product',            slug: 'ai-basics-model-vs-product' },
    ],
  },
  {
    key: 'tools',
    label: 'The Tools Layer',
    tagline: 'The tools professionals actually use',
    href: '/learn#tools',
    articles: [
      { title: 'ChatGPT vs. Claude vs. Gemini',        slug: 'tools-chatgpt-vs-claude-vs-gemini' },
      { title: 'How to Evaluate an AI Product',        slug: 'tools-how-to-evaluate-an-ai-product' },
      { title: 'AI Writing Assistants',                slug: 'tools-ai-writing-assistants' },
      { title: 'AI for Meeting Intelligence',          slug: 'tools-ai-for-meeting-intelligence' },
      { title: 'AI for Sales Teams',                   slug: 'tools-ai-for-sales-teams' },
      { title: 'AI for Marketing Teams',               slug: 'tools-ai-for-marketing-teams' },
      { title: 'No-Code AI Builders',                  slug: 'tools-no-code-ai-builders' },
      { title: 'Building vs. Buying AI Tools',         slug: 'tools-building-vs-buying-ai-tools' },
    ],
  },
  {
    key: 'organization',
    label: 'AI in Your Organization',
    tagline: 'Strategy, governance, and leadership',
    href: '/learn#organization',
    articles: [
      { title: 'AI Strategy for Business Leaders',     slug: 'strategy-ai-strategy-for-business-leaders' },
      { title: 'AI ROI and Measurement',               slug: 'strategy-ai-roi-and-measurement' },
      { title: 'AI Governance Frameworks',             slug: 'strategy-ai-governance-frameworks' },
      { title: 'AI Change Management',                 slug: 'strategy-ai-change-management' },
      { title: 'Making the Business Case for AI',      slug: 'strategy-making-the-business-case-for-ai' },
      { title: 'Building an AI Roadmap',               slug: 'strategy-building-an-ai-roadmap' },
      { title: 'AI Risk Management',                   slug: 'strategy-ai-risk-management' },
      { title: 'AI Vendor Evaluation',                 slug: 'strategy-ai-vendor-evaluation' },
    ],
  },
  {
    key: 'hands-on',
    label: 'Hands-On',
    tagline: 'Practical AI habits that stick',
    href: '/learn#hands-on',
    articles: [
      { title: 'Writing Your First Prompt',            slug: 'hands-on-writing-your-first-prompt' },
      { title: 'AI for Your Personal Productivity',    slug: 'hands-on-ai-for-your-personal-productivity' },
      { title: 'AI for Email and Communication',       slug: 'hands-on-ai-for-email-and-communication' },
      { title: 'AI for Meetings',                      slug: 'hands-on-ai-for-meetings' },
      { title: 'AI for Research',                      slug: 'hands-on-ai-for-research' },
      { title: 'AI for Data Analysis Without Code',    slug: 'hands-on-ai-for-data-analysis-without-code' },
      { title: 'Advanced Prompting Techniques',        slug: 'hands-on-advanced-prompting-techniques' },
      { title: 'Building Your Personal AI Stack',      slug: 'hands-on-building-your-personal-ai-stack' },
    ],
  },
]

export function Nav() {
  const [open, setOpen] = useState(false)
  const [activeModule, setActiveModule] = useState(MODULES[0].key)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  const active = MODULES.find((m) => m.key === activeModule) ?? MODULES[0]

  return (
    <nav className="flex justify-between items-center px-8 py-6 border-b border-white/10 relative z-50">
      <a href="/" className="font-bold text-lg">Anshul Gupta</a>

      <div className="flex gap-6 text-sm text-white/60 items-center">
        <a href="/about"   className="hover:text-white transition">About</a>
        <a href="/lab"     className="hover:text-white transition">Lab</a>

        {/* Learn trigger */}
        <div
          className="relative"
          onMouseEnter={() => { cancelClose(); setOpen(true) }}
          onMouseLeave={scheduleClose}
        >
          <button
            className={`flex items-center gap-1 hover:text-white transition ${open ? 'text-white' : ''}`}
          >
            Learn
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
            >
              <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Mega-menu */}
          {open && (
            <div
              className="absolute right-0 top-full pt-3"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              {/* Arrow pointer */}
              <div className="absolute right-5 top-[6px] w-3 h-3 rotate-45 bg-[#111] border-l border-t border-white/10" />

              <div
                className="flex rounded-2xl overflow-hidden"
                style={{
                  background: '#0d0d0d',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
                  minWidth: 560,
                }}
              >
                {/* Left: modules */}
                <div className="flex flex-col py-3 border-r border-white/[0.06]" style={{ width: 220 }}>
                  <p className="text-white/25 text-[10px] uppercase tracking-widest px-5 py-2 mb-1">Modules</p>
                  {MODULES.map((mod) => (
                    <button
                      key={mod.key}
                      onMouseEnter={() => setActiveModule(mod.key)}
                      onClick={() => { window.location.href = mod.href }}
                      className={`w-full text-left px-5 py-3 transition-all group flex items-center justify-between ${
                        activeModule === mod.key
                          ? 'bg-white/[0.06]'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-medium transition ${
                          activeModule === mod.key ? 'text-white' : 'text-white/60 group-hover:text-white/80'
                        }`}>
                          {mod.label}
                        </p>
                        <p className="text-[11px] text-white/30 mt-0.5 leading-snug">{mod.tagline}</p>
                      </div>
                      <svg
                        className={`w-3 h-3 shrink-0 ml-2 transition ${
                          activeModule === mod.key ? 'text-white/50' : 'text-white/20 group-hover:text-white/40'
                        }`}
                        viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                      >
                        <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ))}

                  <div className="mt-3 px-5 pt-3 border-t border-white/[0.06]">
                    <a
                      href="/learn"
                      className="text-[11px] text-white/30 hover:text-white/60 transition flex items-center gap-1"
                    >
                      View full curriculum →
                    </a>
                  </div>
                </div>

                {/* Right: articles */}
                <div className="flex flex-col py-3" style={{ width: 300 }}>
                  <p className="text-white/25 text-[10px] uppercase tracking-widest px-5 py-2 mb-1">
                    {active.label}
                  </p>
                  {active.articles.map((article) => (
                    <a
                      key={article.slug}
                      href={`/learn/${article.slug}`}
                      className="px-5 py-2.5 text-sm text-white/55 hover:text-white hover:bg-white/[0.04] transition flex items-center justify-between group"
                    >
                      <span>{article.title}</span>
                      <svg
                        className="w-3 h-3 shrink-0 ml-2 opacity-0 group-hover:opacity-100 text-white/40 transition"
                        viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                      >
                        <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  ))}
                  <div className="mt-2 mx-5 pt-3 border-t border-white/[0.06]">
                    <a
                      href={active.href}
                      className="text-[11px] text-white/30 hover:text-white/60 transition flex items-center gap-1"
                    >
                      All {active.label} articles →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <a href="/writing" className="hover:text-white transition">Writing</a>
      </div>
    </nav>
  )
}
