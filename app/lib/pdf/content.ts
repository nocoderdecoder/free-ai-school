/**
 * Content library for all 25 Free AI School downloadable guides.
 *
 * Each guide maps a URL slug to structured content rendered by
 * `app/lib/pdf/PdfTemplate.tsx`. Content is written for business and
 * GTM professionals — practical, specific, and ready to act on.
 */

import type { PdfSection } from './PdfTemplate'

type Guide = {
  title: string
  subtitle: string
  category: string
  // Most guides use the legacy bullets-only shape; richer guides use typed
  // PdfSection variants (table, grid, ratings, flow, callout).
  sections: Array<{ heading: string; bullets: string[] } | PdfSection>
}

export const GUIDES: Record<string, Guide> = {
  // ─────────────────────────────────────────────────────────────
  // AI TOOLS (7)
  // ─────────────────────────────────────────────────────────────
  'chatgpt-quick-reference': {
    title: 'ChatGPT Quick Reference Guide',
    subtitle:
      'Everything a business professional needs to get great results from ChatGPT — fast. Models, modes, prompting moves, and the workflows that actually save time.',
    category: 'AI Tools',
    sections: [
      {
        heading: 'Choosing the Right Model',
        bullets: [
          'Use the flagship reasoning model for anything analytical: strategy memos, financial logic, multi-step problems.',
          'Use the fast default model for everyday drafting, rewriting, and Q&A where speed matters more than depth.',
          'Switch to a vision-capable model when working from screenshots, charts, slides, or photos.',
          'Reserve "deep research" or browsing modes for tasks that need current, sourced information from the web.',
          'When unsure, start fast and escalate to the reasoning model only if the answer feels shallow.',
        ],
      },
      {
        heading: 'Core Prompting Moves',
        bullets: [
          'Give it a role: "You are a B2B pricing analyst" sharpens tone and depth instantly.',
          'State the audience and format: "for a CFO, as a one-page memo with bullets."',
          'Provide examples of what good looks like — one strong example beats a paragraph of instructions.',
          'Ask for the reasoning, then the answer, when correctness matters.',
          'End with "Ask me up to 3 clarifying questions before answering" for complex requests.',
        ],
      },
      {
        heading: 'Power Features Worth Using',
        bullets: [
          'Custom Instructions: set your role, company, and preferred output style once — it applies to every chat.',
          'Projects/folders: keep all context for a workstream (deal, launch, report) in one place.',
          'File uploads: drop in spreadsheets, PDFs, and decks for analysis and summarization.',
          'Canvas/editor mode: co-write long documents with inline edits instead of regenerating from scratch.',
          'Voice mode: brainstorm hands-free during a commute or walk.',
        ],
      },
      {
        heading: 'High-Value Business Workflows',
        bullets: [
          'Turn meeting notes into a structured summary, decisions, and owner-tagged action items.',
          'Rewrite a rough email into three tones — direct, warm, and executive — and pick the best.',
          'Convert a dense report into a 5-bullet brief plus three discussion questions.',
          'Stress-test a plan: "Argue the strongest case against this strategy."',
          'Generate first-draft frameworks (RACI, SWOT, OKRs) then refine with your real data.',
        ],
      },
      {
        heading: 'Avoiding Common Mistakes',
        bullets: [
          'Never paste confidential data into a personal account — use an enterprise plan with data controls.',
          'Always verify names, numbers, dates, and citations; the model can sound confident while being wrong.',
          'Don\'t accept the first draft — iterate with "make this tighter / more specific / less generic."',
          'Avoid vague prompts; specificity in equals specificity out.',
          'Treat output as a draft from a fast junior analyst, not a finished deliverable.',
        ],
      },
    ],
  },

  'claude-quick-reference': {
    title: 'Claude Quick Reference Guide',
    subtitle:
      'Get the most out of Claude for writing, analysis, and long-document work. A practical reference for business users who care about quality and nuance.',
    category: 'AI Tools',
    sections: [
      {
        heading: 'Why Claude, and When',
        bullets: [
          'Reach for Claude when tone, nuance, and long-form writing quality matter most.',
          'It excels at working across very long documents — contracts, transcripts, full reports.',
          'Strong at careful reasoning and at saying "I\'m not sure" instead of inventing answers.',
          'Great for editing and critique: it gives specific, structured feedback.',
          'Use the most capable model for hard analysis; use a faster model for quick drafting.',
        ],
      },
      {
        heading: 'Prompting Claude Well',
        bullets: [
          'Use clear structure — Claude responds well to headings, numbered steps, and XML-like tags.',
          'Put long source material first, then your question last, for the sharpest answers.',
          'Tell it the role and the standard: "Act as a skeptical editor; flag every weak claim."',
          'Ask for a plan before execution on multi-part tasks.',
          'Request the format explicitly: table, bullets, memo, or email.',
        ],
      },
      {
        heading: 'Projects and Artifacts',
        bullets: [
          'Projects let you load persistent context (brand voice, product docs) reused across chats.',
          'Artifacts render documents, tables, and code in a side panel you can iterate on.',
          'Use Artifacts to co-write a one-pager and refine it section by section.',
          'Upload reference files to a Project so every conversation stays on-brand.',
          'Keep one Project per major workstream to avoid context bleed.',
        ],
      },
      {
        heading: 'Standout Business Use Cases',
        bullets: [
          'Summarize a 40-page report into an executive brief with key risks and recommendations.',
          'Compare two contracts and surface every meaningful difference in a table.',
          'Draft thoughtful, on-voice customer or stakeholder communications.',
          'Turn raw interview transcripts into themes, quotes, and insights.',
          'Pressure-test strategy documents for logical gaps and unstated assumptions.',
        ],
      },
      {
        heading: 'Quality and Safety Habits',
        bullets: [
          'Claude is cautious by design — if it hedges, give it more context rather than fighting it.',
          'Verify any factual claim, figure, or citation before it leaves your hands.',
          'Use enterprise plans for sensitive data and to keep content out of training.',
          'Iterate: "Make this 30% shorter without losing the key argument."',
          'Save strong prompts as reusable templates for your team.',
        ],
      },
    ],
  },

  'gemini-quick-reference': {
    title: 'Google Gemini Quick Reference Guide',
    subtitle:
      'Use Gemini across Google Workspace and the web to research, draft, and analyze. A practical guide for professionals already living in Gmail, Docs, and Sheets.',
    category: 'AI Tools',
    sections: [
      {
        heading: 'Where Gemini Fits',
        bullets: [
          'Best when your work lives in Google Workspace — it plugs directly into Gmail, Docs, Sheets, and Slides.',
          'Strong at grounded answers using Google Search for current information.',
          'Handles large context well — useful for long documents and big datasets.',
          'Multimodal: analyze images, PDFs, and screenshots alongside text.',
          'Pick the Pro/advanced model for reasoning; the faster model for quick tasks.',
        ],
      },
      {
        heading: 'Gemini in Workspace',
        bullets: [
          'In Gmail: draft, summarize threads, and adjust tone without leaving the inbox.',
          'In Docs: generate outlines, expand bullet points, and rewrite passages inline.',
          'In Sheets: create formulas, classify data, and build starter tables from a prompt.',
          'In Slides: generate speaker notes and first-draft slide content.',
          'Use "Help me write" as a starting draft, then edit for accuracy and voice.',
        ],
      },
      {
        heading: 'Research and Grounding',
        bullets: [
          'Ask for sourced answers and click through to verify the linked references.',
          'Use Deep Research mode to compile a structured brief across many web sources.',
          'Specify recency: "Only use information from the last 12 months."',
          'Cross-check surprising claims against the original sources.',
          'Combine search grounding with your own uploaded documents for context.',
        ],
      },
      {
        heading: 'Practical Business Workflows',
        bullets: [
          'Summarize a long email thread and draft a decision-ready reply.',
          'Turn a messy spreadsheet into a clean, categorized table.',
          'Research a market or competitor and produce a sourced one-pager.',
          'Convert a Doc into a slide outline for a stakeholder review.',
          'Extract action items and owners from meeting notes.',
        ],
      },
      {
        heading: 'Getting Reliable Results',
        bullets: [
          'Be explicit about format, audience, and length in every prompt.',
          'Always verify figures and citations — grounding reduces but does not eliminate errors.',
          'Check your organization\'s data policy before using personal vs. enterprise accounts.',
          'Iterate inline in Docs rather than regenerating whole documents.',
          'Keep prompts specific; generic asks produce generic output.',
        ],
      },
    ],
  },

  'perplexity-quick-reference': {
    title: 'Perplexity AI Quick Reference Guide',
    subtitle:
      'Perplexity is the AI answer engine — fast, sourced research for professionals. Learn how to get trustworthy, citation-backed answers and brief yourself in minutes.',
    category: 'AI Tools',
    sections: [
      {
        heading: 'What Perplexity Is Best At',
        bullets: [
          'Real-time research with inline citations you can click and verify.',
          'Quick competitive and market scans without opening 20 browser tabs.',
          'Answering factual questions where you need the source, not just the answer.',
          'Summarizing recent news, filings, and announcements.',
          'A faster alternative to a Google rabbit hole when you need a synthesized brief.',
        ],
      },
      {
        heading: 'Modes and Focus',
        bullets: [
          'Use Pro/Research mode for deeper, multi-step questions that need broad sourcing.',
          'Use Focus filters (Academic, Web, etc.) to control where answers come from.',
          'Spaces/Collections keep related research organized by project.',
          'Upload files to ask questions grounded in your own documents.',
          'Switch the underlying model when you want more reasoning depth.',
        ],
      },
      {
        heading: 'Asking Better Questions',
        bullets: [
          'Be specific about scope and timeframe: "in the US, over the last 18 months."',
          'Ask follow-ups — Perplexity keeps context and drills down well.',
          'Request a comparison table when evaluating options.',
          'Ask for "primary sources only" when accuracy is critical.',
          'End with "list the 3 most authoritative sources" to prioritize verification.',
        ],
      },
      {
        heading: 'Business Research Workflows',
        bullets: [
          'Build a one-page competitor brief with sourced facts in minutes.',
          'Scan an industry trend and capture the key data points with citations.',
          'Prep for a meeting by summarizing a company\'s recent moves.',
          'Validate a claim before putting it in a deck or report.',
          'Compile a reading list of authoritative sources on a topic.',
        ],
      },
      {
        heading: 'Trust but Verify',
        bullets: [
          'Always open the cited sources — citations can be loosely matched.',
          'Prefer primary sources (filings, official sites) over aggregators.',
          'Treat output as a research starting point, not a final fact-checked document.',
          'Note publication dates; some cited material may be outdated.',
          'For sensitive topics, confirm with a second independent source.',
        ],
      },
    ],
  },

  'copilot-quick-reference': {
    title: 'Microsoft Copilot Quick Reference Guide',
    subtitle:
      'Make Copilot work for you across Microsoft 365 — Outlook, Word, Excel, PowerPoint, and Teams. A guide for professionals who live in the Microsoft stack.',
    category: 'AI Tools',
    sections: [
      {
        heading: 'Where Copilot Lives',
        bullets: [
          'Built into Microsoft 365 apps — it sees your emails, files, and meetings (with permissions).',
          'Strongest value comes from grounding in your own organizational data.',
          'Available as a standalone chat plus embedded assistants in each app.',
          'Respects your existing Microsoft permissions — it only sees what you can see.',
          'Best for teams already standardized on Outlook, Teams, and Office.',
        ],
      },
      {
        heading: 'Copilot in the Core Apps',
        bullets: [
          'Outlook: summarize long threads, draft replies, and triage your inbox.',
          'Word: generate drafts from a prompt or an existing file, then rewrite sections.',
          'Excel: analyze data, suggest formulas, and surface trends in tables.',
          'PowerPoint: turn a Word doc into a starter deck and refine slides.',
          'Teams: get meeting recaps, action items, and "what did I miss" summaries.',
        ],
      },
      {
        heading: 'Prompting Copilot',
        bullets: [
          'Reference specific files, people, or meetings by name to ground the answer.',
          'Be explicit about output: "a 5-bullet recap and a list of decisions."',
          'Use "/" commands and suggested prompts to discover capabilities.',
          'Ask it to cite which document or email an answer came from.',
          'Iterate on drafts in-app rather than starting over.',
        ],
      },
      {
        heading: 'High-Impact Workflows',
        bullets: [
          'Catch up on a project: "Summarize everything about the Q3 launch from my emails and chats."',
          'Prep for a 1:1 by pulling recent context on a person or topic.',
          'Convert meeting notes into an owner-tagged action plan.',
          'Draft a status update from your recent activity across apps.',
          'Build a first-draft deck from an existing report.',
        ],
      },
      {
        heading: 'Getting Value and Staying Safe',
        bullets: [
          'Data stays within your Microsoft 365 tenant boundary on enterprise plans.',
          'Verify summaries against the source — Copilot can miss nuance in long threads.',
          'Good data hygiene improves results: well-named files and clear meeting titles help.',
          'Start with one or two daily workflows to build the habit.',
          'Check admin-configured policies for what Copilot can access.',
        ],
      },
    ],
  },

  'notebooklm-quick-reference': {
    title: 'NotebookLM Quick Reference Guide',
    subtitle:
      'NotebookLM turns your own documents into a grounded research assistant. Learn to build notebooks, ask source-cited questions, and generate audio overviews.',
    category: 'AI Tools',
    sections: [
      {
        heading: 'What Makes NotebookLM Different',
        bullets: [
          'It answers only from the sources you upload — grounded, not from the open web.',
          'Every answer cites the exact passage it came from, so verification is built in.',
          'Ideal for turning a pile of documents into a queryable knowledge base.',
          'Great for studying dense material — reports, research, transcripts, manuals.',
          'Generates an "audio overview" — a podcast-style discussion of your sources.',
        ],
      },
      {
        heading: 'Building a Good Notebook',
        bullets: [
          'Add 5–20 high-quality sources on one topic rather than a sprawling mix.',
          'Supported sources include PDFs, Google Docs, pasted text, and links.',
          'Group sources by project so answers stay focused and relevant.',
          'Remove off-topic sources — noise degrades answer quality.',
          'Re-upload updated documents to keep the notebook current.',
        ],
      },
      {
        heading: 'Asking and Synthesizing',
        bullets: [
          'Ask cross-document questions: "What do these reports agree and disagree on?"',
          'Generate a briefing doc, FAQ, or study guide from all your sources at once.',
          'Click citations to jump straight to the supporting passage.',
          'Ask for a timeline or a table to structure messy information.',
          'Save useful answers as notes to build a synthesized output.',
        ],
      },
      {
        heading: 'Business Use Cases',
        bullets: [
          'Onboard to a new domain by loading key docs and asking your way in.',
          'Build an internal FAQ from policy and process documents.',
          'Turn a research bundle into an executive briefing with citations.',
          'Prep for a deal by querying all the relevant materials in one place.',
          'Create an audio overview to review material during a commute.',
        ],
      },
      {
        heading: 'Best Practices',
        bullets: [
          'Trust but verify — even grounded answers can misread a passage.',
          'Keep notebooks single-topic for the sharpest results.',
          'Use it for synthesis across sources, not for facts outside your uploads.',
          'Mind data sensitivity — only upload what you\'re permitted to.',
          'Combine the briefing doc and audio overview for fast comprehension.',
        ],
      },
    ],
  },

  'midjourney-quick-reference': {
    title: 'Midjourney Quick Reference Guide',
    subtitle:
      'Create professional-quality images for decks, marketing, and concepts. A practical prompting guide for business users — no design degree required.',
    category: 'AI Tools',
    sections: [
      {
        heading: 'Getting Started',
        bullets: [
          'Midjourney generates images from text prompts via its web app or Discord.',
          'Best for concept art, marketing visuals, mood boards, and hero imagery.',
          'Generates four options per prompt; upscale or vary the one you like.',
          'Not a precise tool for text-in-image or exact brand logos — set expectations.',
          'Check usage rights on your plan before commercial use.',
        ],
      },
      {
        heading: 'Anatomy of a Good Prompt',
        bullets: [
          'Subject first: what is in the image. Be concrete.',
          'Style and medium: "editorial photography," "flat vector illustration," "3D render."',
          'Lighting and mood: "soft morning light," "dramatic, high-contrast."',
          'Composition: "wide shot," "close-up," "centered, negative space for text."',
          'Avoid overstuffing — 3–5 strong descriptors beat a wall of adjectives.',
        ],
      },
      {
        heading: 'Useful Parameters',
        bullets: [
          '--ar sets aspect ratio (16:9 for slides, 1:1 for social, 9:16 for stories).',
          '--style and --stylize control how strongly Midjourney applies its aesthetic.',
          '--no excludes elements you don\'t want ("--no text, watermark").',
          'Image prompts: paste a reference image URL to guide style or composition.',
          'Seeds let you keep a consistent look across a set of images.',
        ],
      },
      {
        heading: 'Business Applications',
        bullets: [
          'Generate custom hero images for landing pages and pitch decks.',
          'Create concept visuals to align stakeholders before a real shoot.',
          'Produce on-theme social and ad imagery quickly and cheaply.',
          'Build mood boards to brief designers and agencies.',
          'Visualize product or campaign concepts for early feedback.',
        ],
      },
      {
        heading: 'Pro Tips and Pitfalls',
        bullets: [
          'Iterate with "vary" rather than rewriting the whole prompt from scratch.',
          'Leave negative space when you plan to add headlines or logos later.',
          'Avoid generating identifiable people or copyrighted characters for commercial use.',
          'Keep a prompt log so you can reproduce successful styles.',
          'Pair with a photo editor for final cropping, text, and brand polish.',
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // COMPARISON (3)
  // ─────────────────────────────────────────────────────────────
  'chatgpt-vs-claude-vs-gemini': {
    title: 'ChatGPT vs Claude vs Gemini: The Definitive Comparison',
    subtitle:
      'Which AI should you use — and when. A practical decision guide for business professionals.',
    category: 'Comparison',
    sections: [
      {
        type: 'table',
        heading: 'Head-to-Head: Core Capabilities',
        columns: ['Capability', 'ChatGPT', 'Claude', 'Gemini'],
        rows: [
          ['Reasoning', 'Strong', 'Best', 'Strong'],
          ['Writing', 'Strong', 'Best', 'Good'],
          ['Coding', 'Best', 'Best', 'Strong'],
          ['Data / Analysis', 'Best', 'Good', 'Best'],
          ['Image understanding', 'Strong', 'Good', 'Best'],
          ['Context window', '128K', '200K', '1M+'],
          ['Real-time web', 'Yes', 'Limited', 'Yes (native)'],
          ['Free tier', 'Generous', 'Good', 'Generous'],
          ['Best for', 'All-rounder', 'Writing + docs', 'Google + data'],
        ],
      },
      {
        type: 'flow',
        heading: 'The Decision Flowchart: Which Tool to Use',
        steps: [
          {
            label: 'Writing & Communication',
            description:
              'Use Claude. Best for long-form writing, editing, and nuance.',
          },
          {
            label: 'Data & Research',
            description:
              'Use ChatGPT or Gemini. Strong data interpretation plus web search.',
          },
          {
            label: 'Code & Technical Work',
            description:
              'Use ChatGPT (GPT-4o) or Claude (Sonnet). Both excellent.',
          },
          {
            label: 'Google Workspace',
            description:
              'Use Gemini. Native integration with Docs, Sheets, and Gmail.',
          },
          {
            label: 'Long Documents',
            description:
              'Use Claude. A 200K context window handles entire books.',
          },
        ],
      },
      {
        type: 'grid',
        heading: 'Best Use Cases by Tool',
        cells: [
          { label: 'ChatGPT', value: 'Strategy memos', color: '#10b981' },
          { label: 'ChatGPT', value: 'Data analysis', color: '#10b981' },
          { label: 'ChatGPT', value: 'Plugin ecosystem', color: '#10b981' },
          { label: 'Claude', value: 'Long documents', color: '#f59e0b' },
          { label: 'Claude', value: 'Precise writing', color: '#f59e0b' },
          { label: 'Claude', value: 'Complex reasoning', color: '#f59e0b' },
          { label: 'Gemini', value: 'Google Workspace', color: '#3b82f6' },
          { label: 'Gemini', value: 'Multimodal tasks', color: '#3b82f6' },
          { label: 'Gemini', value: 'Real-time info', color: '#3b82f6' },
        ],
      },
      {
        type: 'table',
        heading: 'Pricing Comparison (2025)',
        columns: ['Plan', 'ChatGPT', 'Claude', 'Gemini'],
        rows: [
          ['Free tier', 'GPT-4o (limited)', 'Sonnet (limited)', 'Flash (generous)'],
          ['Pro / Plus', '$20/mo', '$20/mo', '$20/mo'],
          ['Context limit', '128K tokens', '200K tokens', '1M+ tokens'],
          ['Best value pick', 'Power users', 'Writers', 'Workspace users'],
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'Pro tip: Most power users maintain accounts on all three. Use Claude for drafting, ChatGPT for research and code, and Gemini when you need real-time data or are working in Google Workspace.',
      },
      {
        type: 'bullets',
        heading: 'Common Mistakes to Avoid',
        bullets: [
          'Using only one tool for everything — each has genuine specializations.',
          'Assuming the free tier is enough for business-critical work.',
          'Ignoring context window differences for document-heavy workflows.',
          'Not testing prompts across tools — the same prompt can yield very different quality.',
          'Overlooking Gemini for Google Workspace users (deep native integration).',
        ],
      },
    ],
  },

  'ai-tool-selection-framework': {
    title: 'AI Tool Selection Framework',
    subtitle:
      'A repeatable framework for choosing the right AI tool for any job — so your team stops debating and starts shipping.',
    category: 'Comparison',
    sections: [
      {
        heading: 'Start With the Job, Not the Tool',
        bullets: [
          'Define the task, the desired output, and the quality bar before naming any tool.',
          'Classify the work: drafting, analysis, research, automation, or creative.',
          'Identify who uses it and how often — daily workflows justify deeper investment.',
          'Note constraints: data sensitivity, budget, and existing tech stack.',
          'Write a one-sentence "job to be done" you can test tools against.',
        ],
      },
      {
        heading: 'The Five Evaluation Criteria',
        bullets: [
          'Capability: does it actually do the job well enough at your quality bar?',
          'Integration: does it fit where work already happens (your suite, your data)?',
          'Security: data handling, training opt-out, compliance, and admin controls.',
          'Cost: per-seat price vs. measured time saved and outcomes improved.',
          'Adoption: how easily will real people fit it into their day?',
        ],
      },
      {
        heading: 'Run a Structured Pilot',
        bullets: [
          'Pick 2–3 candidate tools and one representative team.',
          'Define success metrics up front (time saved, quality, satisfaction).',
          'Give everyone the same set of real tasks to run through each tool.',
          'Time-box the pilot to 2–4 weeks to force a decision.',
          'Collect both numbers and qualitative feedback before deciding.',
        ],
      },
      {
        heading: 'Score and Decide',
        bullets: [
          'Weight the five criteria by what matters most for this job.',
          'Score each tool 1–5 on each criterion and total the weighted scores.',
          'Beware "feature fascination" — pick the tool that wins on the job, not the demo.',
          'Document the decision and the reasoning for future reference.',
          'Choose a default tool to reduce decision fatigue across the org.',
        ],
      },
      {
        heading: 'Avoiding Selection Traps',
        bullets: [
          'Don\'t buy on benchmarks alone — they rarely match your real tasks.',
          'Don\'t over-index on the newest model; reliability beats novelty.',
          'Avoid tool sprawl; every extra tool adds training and security overhead.',
          'Re-evaluate quarterly, but don\'t thrash — switching has real costs.',
          'Keep a fallback tool for when your primary is down or limited.',
        ],
      },
    ],
  },

  'how-to-evaluate-ai-products': {
    title: 'How to Evaluate AI Products',
    subtitle:
      'Cut through the hype. A buyer\'s guide to evaluating AI products and vendors on the dimensions that actually predict success.',
    category: 'Comparison',
    sections: [
      {
        heading: 'Separate Signal From Hype',
        bullets: [
          'Ask what specific problem it solves and for whom — vague "AI-powered" claims are red flags.',
          'Request a demo on your data and your tasks, not the vendor\'s curated examples.',
          'Distinguish genuine AI value from a thin wrapper around a general model.',
          'Look for measurable outcomes from existing customers, not just logos.',
          'Be wary of products that can\'t explain their limitations.',
        ],
      },
      {
        heading: 'Evaluate the Core Quality',
        bullets: [
          'Test accuracy and consistency across many realistic inputs, including edge cases.',
          'Check how it handles being wrong — does it flag uncertainty or fail silently?',
          'Assess latency and reliability under real load, not just a quick demo.',
          'Evaluate the human-in-the-loop experience: how easy is it to review and correct?',
          'Probe whether quality holds as your data grows and changes.',
        ],
      },
      {
        heading: 'Data, Security, and Compliance',
        bullets: [
          'Understand exactly what data the product collects, stores, and trains on.',
          'Confirm opt-out of training and clear data ownership and deletion terms.',
          'Check certifications (SOC 2, ISO) and regulatory fit for your industry.',
          'Review how it handles PII and confidential business information.',
          'Ask where data is processed and stored geographically.',
        ],
      },
      {
        heading: 'Vendor and Total Cost',
        bullets: [
          'Assess vendor stability, roadmap, and support quality — AI vendors come and go.',
          'Model total cost of ownership: licenses, usage fees, integration, and training.',
          'Watch for usage-based pricing that scales unpredictably with success.',
          'Check switching costs and data portability before locking in.',
          'Favor vendors who improve the underlying model over time.',
        ],
      },
      {
        heading: 'Run the Decision',
        bullets: [
          'Define success criteria and a measurable pilot before signing.',
          'Involve security, legal, and end users early, not at the finish line.',
          'Start with a paid pilot or short contract before a long commitment.',
          'Set checkpoints to confirm the product delivers in production.',
          'Document the evaluation so the next purchase is faster and sharper.',
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // PROMPTING (4)
  // ─────────────────────────────────────────────────────────────
  'business-prompt-guide': {
    title: "Business Professional's Prompt Guide",
    subtitle:
      'The prompting fundamentals every knowledge worker should know — written for business outcomes, not for engineers.',
    category: 'Prompting',
    sections: [
      {
        heading: 'The Anatomy of a Strong Prompt',
        bullets: [
          'Role: tell the AI who to be ("a seasoned product marketer").',
          'Task: state exactly what you want done.',
          'Context: provide the background, audience, and constraints.',
          'Format: specify the output shape (memo, table, email, bullets).',
          'Quality bar: define what "good" looks like or give an example.',
        ],
      },
      {
        heading: 'Context Is Everything',
        bullets: [
          'Paste the source material rather than describing it from memory.',
          'Name your audience: a board deck reads nothing like a customer email.',
          'Share constraints: word count, tone, things to avoid.',
          'Give one strong example of the output you want.',
          'State the goal behind the task so the AI can optimize for it.',
        ],
      },
      {
        heading: 'Iterate Like a Pro',
        bullets: [
          'Treat the first response as a draft, then refine with targeted asks.',
          'Use "make it tighter," "more specific," "less generic," "more executive."',
          'Ask for alternatives: "give me three versions with different angles."',
          'Have it critique its own output, then improve it.',
          'Keep the conversation going — context compounds across turns.',
        ],
      },
      {
        heading: 'Reusable Prompt Patterns',
        bullets: [
          'Summarize: "Summarize this for a [audience] in [N] bullets, leading with the decision."',
          'Rewrite: "Rewrite this in a [tone] tone for [audience]."',
          'Analyze: "List the top 3 risks and the strongest counterargument."',
          'Brainstorm: "Generate 10 ideas, then rank them by impact and effort."',
          'Extract: "Pull out every action item with an owner and due date."',
        ],
      },
      {
        heading: 'Habits That Protect You',
        bullets: [
          'Verify every fact, figure, name, and citation before using output.',
          'Never paste confidential data into non-approved tools.',
          'Save your best prompts as templates and share them with your team.',
          'Be specific; vague prompts waste time on both ends.',
          'Stay in the loop — you own the final deliverable, not the AI.',
        ],
      },
    ],
  },

  'advanced-prompting': {
    title: 'Advanced Prompting Techniques',
    subtitle:
      'Level up from basic prompts to reliable, high-quality results. Techniques the best AI users rely on — explained for business contexts.',
    category: 'Prompting',
    sections: [
      {
        heading: 'Make the Model Think',
        bullets: [
          'Chain-of-thought: ask it to reason step by step before answering.',
          'Plan-then-execute: have it outline an approach, then carry it out.',
          'Self-critique: "Review your answer for errors and weak claims, then revise."',
          'Decomposition: break a big task into a sequence of smaller prompts.',
          'Ask it to show assumptions so you can correct course early.',
        ],
      },
      {
        heading: 'Few-Shot and Examples',
        bullets: [
          'Provide 1–3 examples of input-output pairs to set the pattern.',
          'Show edge cases so it handles tricky inputs the way you want.',
          'Use examples to lock tone, structure, and level of detail.',
          'Keep examples short but representative of real work.',
          'Examples beat instructions when the output format is specific.',
        ],
      },
      {
        heading: 'Roles, Personas, and Panels',
        bullets: [
          'Assign an expert role to raise the depth and vocabulary of answers.',
          'Use a "panel" prompt: have it answer as three different experts and synthesize.',
          'Add a skeptic persona to stress-test recommendations.',
          'Define the audience persona to tune tone and complexity.',
          'Combine roles: "As a CFO reviewing this, what would you push back on?"',
        ],
      },
      {
        heading: 'Structure and Output Control',
        bullets: [
          'Use delimiters or tags to separate instructions from source content.',
          'Specify exact output schemas (columns, fields, JSON) for downstream use.',
          'Ask for a single best answer, not a menu, when you need a decision.',
          'Constrain length and format to keep results usable.',
          'Request "no preamble" when you only want the deliverable.',
        ],
      },
      {
        heading: 'Reliability Techniques',
        bullets: [
          'Ask for sources and confidence levels on factual claims.',
          'Run important prompts twice and compare for consistency.',
          'Give the model an "out": "If you\'re unsure, say so rather than guessing."',
          'Provide reference material to ground answers and reduce hallucination.',
          'Build a tested prompt library so quality is repeatable, not lucky.',
        ],
      },
    ],
  },

  '50-prompts-marketing': {
    title: '50 AI Prompts for Marketing Teams',
    subtitle:
      'A curated prompt pack for every stage of the marketing workflow — strategy, content, campaigns, and analysis. Copy, adapt, and ship.',
    category: 'Prompting',
    sections: [
      {
        heading: 'Strategy and Positioning',
        bullets: [
          '"Draft a positioning statement for [product] targeting [segment] vs [competitor]."',
          '"Generate three messaging angles for [audience] and the proof points for each."',
          '"Summarize this customer research into 5 insights and 3 implications."',
          '"Build a simple persona for [segment]: goals, pains, buying triggers, objections."',
          '"List the top 5 jobs-to-be-done our product solves and the message for each."',
        ],
      },
      {
        heading: 'Content Creation',
        bullets: [
          '"Write 10 blog title options for [topic], optimized for [audience]."',
          '"Turn this product page into a 300-word landing section with a clear CTA."',
          '"Draft a 5-email nurture sequence for [offer], one goal per email."',
          '"Repurpose this blog post into 5 LinkedIn posts with different hooks."',
          '"Write three ad variations (headline + body) for [campaign] and [platform]."',
        ],
      },
      {
        heading: 'Campaigns and Channels',
        bullets: [
          '"Outline a multi-channel launch plan for [product] over 4 weeks."',
          '"Suggest 10 keyword themes for [topic] grouped by funnel stage."',
          '"Draft a webinar invite, reminder, and follow-up email set."',
          '"Create a content calendar for [month] across blog, email, and social."',
          '"Write a press-release-style announcement for [news]."',
        ],
      },
      {
        heading: 'Analysis and Optimization',
        bullets: [
          '"Analyze these campaign metrics and tell me what to do next."',
          '"Suggest 5 A/B tests for this landing page, ranked by likely impact."',
          '"Critique this email for clarity, persuasion, and a single CTA."',
          '"Summarize this competitor\'s messaging and where we can differentiate."',
          '"Turn this survey data into a one-page insight summary."',
        ],
      },
      {
        heading: 'Brand and Voice',
        bullets: [
          '"Define our brand voice in 5 adjectives with do/don\'t examples."',
          '"Rewrite this copy to match a [confident, friendly] brand voice."',
          '"Generate 10 taglines for [product] in [tone]."',
          '"Audit this page for off-brand language and suggest fixes."',
          '"Create a style cheat-sheet for our writers from these examples."',
        ],
      },
    ],
  },

  '50-prompts-sales': {
    title: '50 AI Prompts for Sales Teams',
    subtitle:
      'A prompt pack for the full sales motion — prospecting, discovery, objection handling, and follow-up. Built to save reps hours every week.',
    category: 'Prompting',
    sections: [
      {
        heading: 'Prospecting and Outreach',
        bullets: [
          '"Write a 3-line cold email to [persona] at [company] referencing [trigger]."',
          '"Draft 5 subject lines for an outreach email to [role]."',
          '"Personalize this template using these notes about the prospect."',
          '"Write a LinkedIn connection note and a follow-up message for [persona]."',
          '"Build a 4-touch sequence (email, call script, LinkedIn) for [segment]."',
        ],
      },
      {
        heading: 'Research and Account Planning',
        bullets: [
          '"Summarize what this company does and likely pain points for [product]."',
          '"List 5 smart discovery questions for a [role] at [company]."',
          '"Draft an account plan outline for [target account]."',
          '"Identify likely stakeholders and their priorities for this deal."',
          '"Summarize this earnings/news item into a relevant talking point."',
        ],
      },
      {
        heading: 'Discovery and Demos',
        bullets: [
          '"Turn these discovery notes into a recap email with next steps."',
          '"Suggest a demo flow tailored to [prospect\'s stated priorities]."',
          '"Reframe our features as outcomes for a [role] persona."',
          '"List the 3 most important questions to qualify this opportunity."',
          '"Draft a mutual action plan for this deal."',
        ],
      },
      {
        heading: 'Objections and Negotiation',
        bullets: [
          '"Give 3 ways to respond to the objection: [objection]."',
          '"Reframe a price objection around value and ROI for [persona]."',
          '"Draft a competitive comparison talking point vs [competitor]."',
          '"Write a response to a stalled deal to re-engage the champion."',
          '"Prepare answers to the 5 toughest questions a [role] might ask."',
        ],
      },
      {
        heading: 'Follow-Up and Closing',
        bullets: [
          '"Write a follow-up email after a demo with clear next steps."',
          '"Draft a proposal summary email highlighting value and pricing."',
          '"Create a sequence to nudge a deal toward signature this quarter."',
          '"Write a thank-you and onboarding kickoff email after close-won."',
          '"Summarize this deal\'s status and risks for my forecast review."',
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // BUSINESS FUNCTIONS (6)
  // ─────────────────────────────────────────────────────────────
  'ai-for-marketing': {
    title: 'AI for Marketing: Complete Playbook',
    subtitle:
      'How modern marketing teams use AI to do more with less — across strategy, content, demand gen, and analytics. A practical playbook, not theory.',
    category: 'Business Functions',
    sections: [
      {
        heading: 'Where AI Moves the Needle',
        bullets: [
          'Content velocity: draft, repurpose, and localize at a fraction of the time.',
          'Research: synthesize market, competitor, and customer insight quickly.',
          'Personalization: tailor messaging by segment and stage at scale.',
          'Analytics: turn raw data into plain-language insight and next actions.',
          'Operations: automate briefs, summaries, and routine production steps.',
        ],
      },
      {
        heading: 'Content and Creative',
        bullets: [
          'Use AI for first drafts and outlines; keep humans for voice and final judgment.',
          'Repurpose one asset into ten across channels in minutes.',
          'Generate variations for testing instead of guessing at one version.',
          'Localize and adapt copy for different markets and personas.',
          'Build a prompt library so quality is consistent across the team.',
        ],
      },
      {
        heading: 'Demand Gen and Campaigns',
        bullets: [
          'Draft full campaign plans and email sequences to accelerate launches.',
          'Generate ad copy variations for systematic creative testing.',
          'Build keyword and topic clusters for SEO and content planning.',
          'Personalize nurture flows by segment and behavior.',
          'Use AI to summarize campaign performance and recommend next steps.',
        ],
      },
      {
        heading: 'Analytics and Insight',
        bullets: [
          'Translate dashboards into narratives executives actually read.',
          'Cluster customer feedback into themes and surface drivers.',
          'Forecast and scenario-plan with AI as a thinking partner.',
          'Generate hypotheses for experiments, ranked by impact.',
          'Always validate AI analysis against the underlying data.',
        ],
      },
      {
        heading: 'Rollout and Governance',
        bullets: [
          'Start with 2–3 high-frequency workflows to prove value fast.',
          'Set brand and quality guardrails before scaling AI content.',
          'Train the team on prompting and verification, not just access.',
          'Use enterprise tools to protect customer and proprietary data.',
          'Measure time saved and outcomes, not just adoption.',
        ],
      },
    ],
  },

  'ai-for-sales': {
    title: 'AI for Sales: Complete Playbook',
    subtitle:
      'A field guide to using AI across the sales cycle — prospecting, discovery, deal management, and forecasting. Built to help reps sell, not just type.',
    category: 'Business Functions',
    sections: [
      {
        heading: 'Where AI Helps Reps Most',
        bullets: [
          'Research: instant account and persona briefings before every call.',
          'Personalization: outreach that feels human, at scale.',
          'Admin reduction: auto-draft recaps, CRM notes, and follow-ups.',
          'Coaching: feedback on calls, emails, and objection handling.',
          'Forecasting: cleaner pipeline summaries and risk flags.',
        ],
      },
      {
        heading: 'Top of Funnel',
        bullets: [
          'Generate researched, personalized outreach in minutes, not hours.',
          'Build multi-touch sequences tailored by segment and trigger.',
          'Summarize a prospect\'s company and likely pain points pre-call.',
          'Draft smart discovery questions for each persona.',
          'Keep messaging on-brand with a shared prompt library.',
        ],
      },
      {
        heading: 'Deal Execution',
        bullets: [
          'Turn call notes into recap emails and next steps automatically.',
          'Reframe features as outcomes for each stakeholder.',
          'Prepare objection-handling responses before tough conversations.',
          'Draft mutual action plans and proposal summaries.',
          'Surface deal risks from notes and activity for review.',
        ],
      },
      {
        heading: 'Pipeline and Forecasting',
        bullets: [
          'Summarize deal status and risks ahead of forecast calls.',
          'Spot stalled deals and draft re-engagement messages.',
          'Generate concise account plans for strategic opportunities.',
          'Cluster win/loss notes into patterns the team can act on.',
          'Always confirm AI summaries against the CRM source of truth.',
        ],
      },
      {
        heading: 'Enablement and Trust',
        bullets: [
          'Train reps on prompting and on verifying every claim and number.',
          'Protect customer data with approved, enterprise-grade tools.',
          'Keep the human in control of relationships and final messaging.',
          'Standardize high-performing prompts across the team.',
          'Measure impact in time saved and pipeline created, not activity.',
        ],
      },
    ],
  },

  'ai-for-hr': {
    title: 'AI for HR & People Ops',
    subtitle:
      'How people teams use AI responsibly to hire faster, support employees better, and reduce administrative load — without losing the human touch.',
    category: 'Business Functions',
    sections: [
      {
        heading: 'High-Value Use Cases',
        bullets: [
          'Recruiting: draft job descriptions, screening questions, and outreach.',
          'Onboarding: generate role-specific plans and answer common questions.',
          'Policy and docs: turn dense policies into clear, searchable answers.',
          'Communications: draft sensitive messages with the right tone.',
          'Analytics: summarize engagement survey data into themes and actions.',
        ],
      },
      {
        heading: 'Talent Acquisition',
        bullets: [
          'Write inclusive, accurate job descriptions from a few inputs.',
          'Generate structured interview questions tied to the role\'s competencies.',
          'Draft personalized candidate outreach and follow-ups.',
          'Summarize interview notes into consistent, comparable evaluations.',
          'Never let AI make the hiring decision — it assists, humans decide.',
        ],
      },
      {
        heading: 'Employee Experience',
        bullets: [
          'Build an internal FAQ assistant grounded in your real policies.',
          'Draft onboarding checklists tailored to role and team.',
          'Help managers write clear, fair performance feedback.',
          'Summarize 1:1 and review notes into development plans.',
          'Generate first drafts of internal communications and announcements.',
        ],
      },
      {
        heading: 'People Analytics',
        bullets: [
          'Cluster open-text survey responses into actionable themes.',
          'Summarize attrition and engagement trends in plain language.',
          'Draft action plans from survey findings for leadership.',
          'Prepare talking points for sensitive people topics.',
          'Validate every insight against the raw data before acting.',
        ],
      },
      {
        heading: 'Responsibility and Risk',
        bullets: [
          'Be vigilant about bias — review AI output for fairness, never automate decisions.',
          'Protect highly sensitive employee data with strict tool controls.',
          'Comply with employment and privacy regulations in every market.',
          'Keep humans accountable for all people decisions.',
          'Be transparent with employees about where and how AI is used.',
        ],
      },
    ],
  },

  'ai-for-finance': {
    title: 'AI for Finance Teams',
    subtitle:
      'A practical guide for finance professionals to use AI for analysis, reporting, and forecasting — with the controls accuracy demands.',
    category: 'Business Functions',
    sections: [
      {
        heading: 'Where AI Adds Value in Finance',
        bullets: [
          'Reporting: turn numbers into clear narratives for stakeholders.',
          'Analysis: explore variances, drivers, and scenarios faster.',
          'Research: synthesize filings, market data, and benchmarks.',
          'Automation: speed up routine reconciliation and documentation prep.',
          'Communication: draft board materials and commentary.',
        ],
      },
      {
        heading: 'Reporting and Commentary',
        bullets: [
          'Draft management commentary from your variance and trend data.',
          'Summarize a financial report into an executive one-pager.',
          'Translate complex results into plain language for non-finance teams.',
          'Generate first-draft board slides from your figures.',
          'Standardize recurring report narratives with reusable prompts.',
        ],
      },
      {
        heading: 'Analysis and Forecasting',
        bullets: [
          'Use AI as a thinking partner to brainstorm scenario assumptions.',
          'Ask it to explain a variance and list plausible drivers to investigate.',
          'Build first-draft models and formulas, then validate rigorously.',
          'Summarize peer or market data for benchmarking.',
          'Generate sensitivity questions to pressure-test a forecast.',
        ],
      },
      {
        heading: 'Research and Diligence',
        bullets: [
          'Summarize 10-Ks, filings, and contracts to find key terms fast.',
          'Compare documents and surface meaningful differences.',
          'Compile sourced market and competitor benchmarks.',
          'Extract structured data from unstructured documents.',
          'Always trace numbers back to primary sources.',
        ],
      },
      {
        heading: 'Controls and Accuracy',
        bullets: [
          'Never trust AI math blindly — verify every calculation independently.',
          'Keep confidential financials in approved, secure tools only.',
          'Maintain audit trails and human sign-off on all outputs.',
          'Treat AI as a draft generator, not a system of record.',
          'Comply with regulatory and disclosure requirements at all times.',
        ],
      },
    ],
  },

  'ai-for-product': {
    title: 'AI for Product Managers',
    subtitle:
      'How PMs use AI to sharpen strategy, accelerate discovery, and ship better — from research synthesis to spec writing and prioritization.',
    category: 'Business Functions',
    sections: [
      {
        heading: 'The PM\'s AI Toolkit',
        bullets: [
          'Research synthesis: turn interviews and feedback into themes fast.',
          'Documentation: draft PRDs, specs, and release notes.',
          'Prioritization: structure trade-offs and pressure-test decisions.',
          'Communication: tailor updates for execs, engineering, and customers.',
          'Analysis: explore usage data and generate hypotheses.',
        ],
      },
      {
        heading: 'Discovery and Research',
        bullets: [
          'Synthesize customer interviews into themes, quotes, and insights.',
          'Cluster support tickets and reviews to surface top problems.',
          'Draft research plans and interview guides quickly.',
          'Summarize competitive products and gaps.',
          'Generate hypotheses to validate, not conclusions to trust.',
        ],
      },
      {
        heading: 'Definition and Specs',
        bullets: [
          'Draft a PRD from a problem statement, then refine with the team.',
          'Turn rough notes into clear user stories and acceptance criteria.',
          'Generate edge cases and risks you might have missed.',
          'Write crisp release notes and changelogs from a feature summary.',
          'Create FAQ and enablement content for launch.',
        ],
      },
      {
        heading: 'Prioritization and Strategy',
        bullets: [
          'Structure trade-offs with frameworks (RICE, impact/effort) populated by your data.',
          'Stress-test a roadmap: "Argue why this is the wrong bet."',
          'Draft strategy narratives and one-pagers for alignment.',
          'Summarize a market or trend to inform direction.',
          'Generate discussion questions to sharpen team debate.',
        ],
      },
      {
        heading: 'Working Well With AI',
        bullets: [
          'Keep the customer and the data at the center — AI assists judgment, not replaces it.',
          'Verify every claim and number before it enters a decision.',
          'Protect roadmap and customer data with approved tools.',
          'Build a shared prompt library for your product org.',
          'Measure whether AI improves cycle time and decision quality.',
        ],
      },
    ],
  },

  'ai-for-operations': {
    title: 'AI for Operations Teams',
    subtitle:
      'A playbook for ops leaders to use AI to streamline processes, document knowledge, and make better operational decisions.',
    category: 'Business Functions',
    sections: [
      {
        heading: 'Where Ops Wins With AI',
        bullets: [
          'Process documentation: turn tribal knowledge into clear SOPs.',
          'Automation: draft and design routine workflows faster.',
          'Analysis: surface bottlenecks and trends from operational data.',
          'Communication: standardize updates, reports, and escalations.',
          'Knowledge: build searchable, grounded internal references.',
        ],
      },
      {
        heading: 'Process and Documentation',
        bullets: [
          'Generate first-draft SOPs from a description of how work gets done.',
          'Turn messy notes into clean, step-by-step process docs.',
          'Create checklists and runbooks for recurring operations.',
          'Draft onboarding guides for new team members.',
          'Keep documentation current by regenerating from updated inputs.',
        ],
      },
      {
        heading: 'Workflow and Automation',
        bullets: [
          'Map a process and identify steps ripe for automation.',
          'Draft logic and rules for automated workflows.',
          'Generate templates for tickets, forms, and approvals.',
          'Summarize incidents and draft post-mortems.',
          'Design escalation paths and communication templates.',
        ],
      },
      {
        heading: 'Operational Analytics',
        bullets: [
          'Translate operational dashboards into plain-language insight.',
          'Identify likely bottlenecks and root causes to investigate.',
          'Cluster recurring issues from tickets and logs.',
          'Draft capacity and resourcing scenarios as a thinking partner.',
          'Validate every insight against the source data.',
        ],
      },
      {
        heading: 'Scaling Responsibly',
        bullets: [
          'Pilot on one process, prove value, then expand.',
          'Keep humans in the loop for decisions and exceptions.',
          'Use approved tools to protect operational and customer data.',
          'Standardize prompts and templates across the team.',
          'Track cycle time, error rates, and time saved to prove ROI.',
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // STRATEGY (3)
  // ─────────────────────────────────────────────────────────────
  'ai-adoption-roadmap': {
    title: 'AI Adoption Roadmap',
    subtitle:
      'A stage-by-stage roadmap for rolling out AI across an organization — from first pilots to embedded, governed capability.',
    category: 'Strategy',
    sections: [
      {
        heading: 'Stage 1: Foundations',
        bullets: [
          'Set a clear "why": tie AI to specific business goals, not hype.',
          'Establish baseline policies on data, security, and acceptable use.',
          'Choose default enterprise tools with proper data controls.',
          'Identify executive sponsors and an AI working group.',
          'Run a literacy program so everyone understands the basics.',
        ],
      },
      {
        heading: 'Stage 2: Pilots',
        bullets: [
          'Select 2–3 high-frequency, low-risk workflows to start.',
          'Pick motivated teams and define success metrics up front.',
          'Time-box pilots and measure time saved and quality.',
          'Capture what works as reusable prompts and playbooks.',
          'Decide clearly: scale, iterate, or stop.',
        ],
      },
      {
        heading: 'Stage 3: Scale',
        bullets: [
          'Roll out proven workflows to adjacent teams with enablement.',
          'Build a shared prompt and use-case library.',
          'Appoint champions in each function to drive adoption.',
          'Integrate AI into existing tools and processes, not alongside them.',
          'Track adoption and outcomes, and address blockers quickly.',
        ],
      },
      {
        heading: 'Stage 4: Embed and Govern',
        bullets: [
          'Formalize governance: risk, review, and accountability structures.',
          'Bake AI into onboarding and role expectations.',
          'Monitor for quality, bias, and policy compliance.',
          'Evaluate emerging tools against your framework, not the news cycle.',
          'Treat AI capability as a continuously improving program.',
        ],
      },
      {
        heading: 'Common Pitfalls',
        bullets: [
          'Skipping the "why" and chasing tools — start from business value.',
          'Buying licenses without enablement; access is not adoption.',
          'Ignoring data security until it becomes a crisis.',
          'Over-piloting forever; force decisions on a timeline.',
          'Treating AI as a project instead of an ongoing capability.',
        ],
      },
    ],
  },

  'ai-business-case': {
    title: 'Building the Business Case for AI',
    subtitle:
      'How to make a credible, numbers-backed case for AI investment that wins over finance and leadership — and survives scrutiny.',
    category: 'Strategy',
    sections: [
      {
        heading: 'Frame the Problem and Opportunity',
        bullets: [
          'Start from a specific business problem, not "we should use AI."',
          'Quantify the current cost: hours, errors, delays, missed revenue.',
          'Define the desired outcome in measurable terms.',
          'Connect it to a strategic priority leadership already cares about.',
          'Keep the scope tight enough to be credible and achievable.',
        ],
      },
      {
        heading: 'Quantify Costs and Benefits',
        bullets: [
          'Estimate time saved × loaded hourly cost × people × frequency.',
          'Include quality and revenue upside, not just efficiency.',
          'Count total costs: licenses, integration, training, and oversight.',
          'Use conservative assumptions you can defend under scrutiny.',
          'Show payback period and a simple ROI, with a sensitivity range.',
        ],
      },
      {
        heading: 'Address Risk Head-On',
        bullets: [
          'Name the risks: accuracy, security, compliance, and adoption.',
          'Describe specific mitigations for each, not hand-waving.',
          'Propose a pilot to de-risk before a full commitment.',
          'Clarify human-in-the-loop controls for quality and accountability.',
          'Acknowledge what could go wrong and how you\'d respond.',
        ],
      },
      {
        heading: 'Structure the Proposal',
        bullets: [
          'Lead with the outcome and the headline numbers.',
          'Recommend a phased approach: pilot, measure, then scale.',
          'Define clear success metrics and decision checkpoints.',
          'Specify the budget, owners, and timeline.',
          'Make the ask explicit and easy to approve.',
        ],
      },
      {
        heading: 'Win the Room',
        bullets: [
          'Speak finance\'s language — ROI, payback, risk-adjusted returns.',
          'Bring a small proof point or demo on real work.',
          'Pre-align with key stakeholders before the meeting.',
          'Show you\'ll measure and report results honestly.',
          'Position AI as a capability investment, not a one-off purchase.',
        ],
      },
    ],
  },

  'ai-risk-governance': {
    title: 'AI Risk & Governance Framework',
    subtitle:
      'A practical framework for governing AI use responsibly — managing risk without strangling innovation.',
    category: 'Strategy',
    sections: [
      {
        heading: 'Why Governance Matters',
        bullets: [
          'Unmanaged AI use creates data, accuracy, legal, and reputational risk.',
          'Good governance enables adoption by giving teams clear guardrails.',
          'It protects customers, employees, and the business from harm.',
          'Regulators increasingly expect demonstrable AI oversight.',
          'The goal is responsible speed, not bureaucratic slowdown.',
        ],
      },
      {
        heading: 'Core Risk Categories',
        bullets: [
          'Data security: leakage of confidential or personal information.',
          'Accuracy: hallucinations and errors entering decisions and deliverables.',
          'Bias and fairness: discriminatory outcomes, especially in people decisions.',
          'Compliance: violating privacy, IP, or sector-specific regulations.',
          'Over-reliance: humans deferring judgment to flawed AI output.',
        ],
      },
      {
        heading: 'Controls and Guardrails',
        bullets: [
          'Approved-tools list with enterprise data protections and training opt-out.',
          'Clear acceptable-use policy: what data can and cannot be used.',
          'Human-in-the-loop requirements for consequential decisions.',
          'Verification standards for facts, figures, and citations.',
          'Higher scrutiny tiers for high-risk use cases.',
        ],
      },
      {
        heading: 'Roles and Accountability',
        bullets: [
          'Name an owner or committee for AI governance.',
          'Assign accountability for outputs to humans, not tools.',
          'Define an intake and review process for new high-risk use cases.',
          'Provide a clear channel to raise concerns and incidents.',
          'Keep records and audit trails for sensitive applications.',
        ],
      },
      {
        heading: 'Make It Workable',
        bullets: [
          'Right-size controls to risk — don\'t gate low-risk drafting.',
          'Train people on the policy, not just publish it.',
          'Review the framework regularly as tools and regulations evolve.',
          'Measure both adoption and incidents to balance the program.',
          'Treat governance as an enabler of trusted AI, not a blocker.',
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // GETTING STARTED (2)
  // ─────────────────────────────────────────────────────────────
  'first-week-with-ai': {
    title: 'Your First Week with AI: 7-Day Plan',
    subtitle:
      'A simple day-by-day plan to go from AI-curious to AI-capable in one week — built for busy professionals starting from zero.',
    category: 'Getting Started',
    sections: [
      {
        heading: 'Days 1–2: Get Set Up and Comfortable',
        bullets: [
          'Day 1: Pick one assistant (ChatGPT, Claude, or Gemini) and create an account.',
          'Day 1: Set custom instructions with your role and preferred output style.',
          'Day 2: Run 5 low-stakes tasks — summarize an article, draft an email, explain a concept.',
          'Day 2: Practice iterating: ask follow-ups and refine the output.',
          'Goal: lose the fear and learn the basic rhythm of prompting.',
        ],
      },
      {
        heading: 'Days 3–4: Apply It to Real Work',
        bullets: [
          'Day 3: Use AI on one real task in your job, start to finish.',
          'Day 3: Learn the prompt formula — role, task, context, format.',
          'Day 4: Try uploading a document and asking questions about it.',
          'Day 4: Draft something you\'d normally avoid, then edit it.',
          'Goal: experience real time savings on actual work.',
        ],
      },
      {
        heading: 'Days 5–6: Build Habits and Skills',
        bullets: [
          'Day 5: Save your three best prompts as reusable templates.',
          'Day 5: Practice verifying — fact-check an AI answer against a source.',
          'Day 6: Try a second tool for research or a specific task.',
          'Day 6: Find one recurring task to automate with AI each week.',
          'Goal: turn experiments into repeatable workflows.',
        ],
      },
      {
        heading: 'Day 7: Reflect and Plan',
        bullets: [
          'Review what worked and where AI saved you time.',
          'Pick 2–3 workflows to keep doing every week.',
          'Note where AI struggled so you set realistic expectations.',
          'Share one useful prompt with a colleague.',
          'Goal: leave the week with a concrete personal AI routine.',
        ],
      },
      {
        heading: 'Ground Rules for the Whole Week',
        bullets: [
          'Verify facts, numbers, and citations every time.',
          'Never paste confidential data into a personal account.',
          'Be specific — vague prompts waste your time.',
          'Treat output as a smart first draft you improve.',
          'Stay curious; the skill compounds with practice.',
        ],
      },
    ],
  },

  'personal-ai-stack': {
    title: 'Building Your Personal AI Stack',
    subtitle:
      'How to assemble a lean, powerful set of AI tools tailored to how you actually work — without paying for things you won\'t use.',
    category: 'Getting Started',
    sections: [
      {
        heading: 'Start With Your Workflows',
        bullets: [
          'List the tasks you do most: writing, research, analysis, planning.',
          'Note where you lose the most time each week.',
          'Identify your existing ecosystem (Google, Microsoft, etc.).',
          'Decide your quality bar and data-sensitivity needs.',
          'Let your real work, not the hype, define your stack.',
        ],
      },
      {
        heading: 'The Core Layer',
        bullets: [
          'One primary assistant for daily drafting, analysis, and Q&A.',
          'Choose based on ecosystem fit and the work you do most.',
          'Set custom instructions so it knows your role and style.',
          'Invest time mastering one tool deeply before adding more.',
          'This single tool will cover the majority of your needs.',
        ],
      },
      {
        heading: 'Specialist Add-Ons',
        bullets: [
          'A research/answer engine (e.g., Perplexity) for sourced facts.',
          'A document-grounded tool (e.g., NotebookLM) for your own files.',
          'An image tool if you create visuals regularly.',
          'A second general assistant if you do heavy writing or analysis.',
          'Add specialists only when a real, recurring need appears.',
        ],
      },
      {
        heading: 'Keep It Lean and Effective',
        bullets: [
          'Resist tool sprawl — each tool adds cost and cognitive load.',
          'Build a personal prompt library you reuse and refine.',
          'Standardize where work happens to reduce context switching.',
          'Review your stack quarterly; drop what you don\'t use.',
          'Spend on the one or two tools that save you the most time.',
        ],
      },
      {
        heading: 'Use It Safely',
        bullets: [
          'Prefer paid plans with data controls for anything work-related.',
          'Never put confidential data into unapproved tools.',
          'Verify outputs before they leave your hands.',
          'Keep a fallback tool for when your primary is unavailable.',
          'Treat your stack as a living system that evolves with you.',
        ],
      },
    ],
  },
}

export type GuideSlug = keyof typeof GUIDES

export const ALL_SLUGS = Object.keys(GUIDES) as GuideSlug[]
