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
      'Everything a business professional needs to get great results from ChatGPT — models, modes, the moves that matter, and the mistakes that quietly waste your time.',
    category: 'AI Tools',
    sections: [
      {
        type: 'table',
        heading: 'Key Capabilities',
        columns: ['Capability', 'What it does', 'Best for', 'Limitation'],
        rows: [
          ['Web browsing', 'Pulls live info from the web with links', 'News, prices, recent events', 'Source quality varies'],
          ['Image generation', 'Creates images from a text prompt', 'Concepts, slides, social', 'Weak at exact text in images'],
          ['Code interpreter', 'Runs Python on uploaded files', 'Data analysis, charts, cleanup', 'Files reset between sessions'],
          ['File uploads', 'Reads PDFs, spreadsheets, decks', 'Summaries, extraction, Q&A', 'Very long files get truncated'],
          ['Memory', 'Remembers facts across chats', 'Personal context, preferences', 'Can carry stale assumptions'],
          ['Custom GPTs', 'Pre-configured task assistants', 'Repeatable team workflows', 'Quality depends on setup'],
        ],
      },
      {
        type: 'flow',
        heading: '5 Things to Try in Your First Session',
        steps: [
          { label: 'Set Custom Instructions', description: 'Add your role, company, and preferred output style once — it shapes every future reply.' },
          { label: 'Summarize a real document', description: 'Upload a report or long email and ask for a 5-bullet brief with the decision up top.' },
          { label: 'Draft and iterate', description: 'Write a rough email, then refine with "make it tighter / more executive / warmer."' },
          { label: 'Analyze a spreadsheet', description: 'Upload a CSV and ask for trends, a chart, and the three numbers that matter.' },
          { label: 'Stress-test a plan', description: 'Paste your plan and ask: "Argue the strongest case against this." ' },
        ],
      },
      {
        type: 'grid',
        heading: 'ChatGPT Models at a Glance',
        cells: [
          { label: 'Flagship', value: 'GPT-4o', color: '#10a37f' },
          { label: 'Fast + cheap', value: 'GPT-4o mini', color: '#10a37f' },
          { label: 'Deep reasoning', value: 'o1', color: '#10a37f' },
          { label: 'Coding', value: 'o3-mini', color: '#10a37f' },
          { label: 'Legacy', value: 'GPT-4', color: '#64748b' },
          { label: 'Large context', value: 'GPT-4 Turbo', color: '#64748b' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The single most powerful move: stop asking one-shot questions. Tell ChatGPT to "ask me up to 3 clarifying questions before answering." For any non-trivial business task, this one habit lifts output quality more than any clever prompt phrasing.',
      },
      {
        type: 'bullets',
        heading: 'Common Mistakes to Avoid',
        bullets: [
          'Pasting confidential data into a personal account — use an enterprise plan with data controls.',
          'Accepting the first draft instead of iterating with targeted, specific refinements.',
          'Trusting names, numbers, dates, and citations without verifying them yourself.',
          'Writing vague prompts and expecting specific output — specificity in, specificity out.',
          'Using the slow reasoning model for everything when the fast model would do.',
        ],
      },
    ],
  },

  'claude-quick-reference': {
    title: 'Claude Quick Reference Guide',
    subtitle:
      'Get the most out of Claude for writing, analysis, and long-document work — a practical reference for business users who care about quality and nuance.',
    category: 'AI Tools',
    sections: [
      {
        type: 'table',
        heading: 'Claude Models Compared',
        columns: ['Model', 'Speed', 'Context', 'Best for'],
        rows: [
          ['Claude Opus 4', 'Moderate', '200K tokens', 'Hardest reasoning, deep analysis, agentic work'],
          ['Claude Sonnet 4.5', 'Fast', '200K tokens', 'The daily driver — writing, coding, most tasks'],
          ['Claude Haiku 3.5', 'Fastest', '200K tokens', 'High-volume, low-latency, simple tasks'],
        ],
      },
      {
        type: 'flow',
        heading: 'How to Get the Best from Claude',
        steps: [
          { label: 'Be specific about role and task', description: 'Open with "Act as a skeptical editor" or "You are a B2B pricing analyst" to set depth and tone.' },
          { label: 'Give context generously', description: 'Paste source material first, then ask your question last — Claude handles long context exceptionally well.' },
          { label: 'Ask for reasoning', description: 'Request a plan or step-by-step thinking before the final answer when correctness matters.' },
          { label: 'Iterate in the same thread', description: 'Refine with "30% shorter," "more concrete," or "flag every weak claim" — context compounds.' },
          { label: 'Use Projects for ongoing work', description: 'Load brand voice, product docs, and standards once so every chat stays on-brand.' },
        ],
      },
      {
        type: 'grid',
        heading: "Claude's Standout Strengths",
        cells: [
          { label: 'Strength', value: 'Long documents', color: '#d97706' },
          { label: 'Strength', value: 'Precise writing', color: '#d97706' },
          { label: 'Strength', value: 'Complex reasoning', color: '#d97706' },
          { label: 'Strength', value: 'Code review', color: '#d97706' },
          { label: 'Strength', value: 'Research synthesis', color: '#d97706' },
          { label: 'Strength', value: 'Nuanced analysis', color: '#d97706' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: "Claude's 200K context window holds roughly 500 pages — an entire contract set, a full quarter of transcripts, or a book. Drop the whole thing in and ask cross-document questions instead of chunking. You can reason over the complete picture, not fragments.",
      },
      {
        type: 'bullets',
        heading: 'Prompting Tips Specific to Claude',
        bullets: [
          'Use XML-style tags (<context>, <task>) to cleanly separate instructions from source material.',
          'Put long reference material at the top and your actual question at the very end.',
          'Ask it to "think step by step" inside <thinking> tags, then give the final answer.',
          'When Claude hedges, give it more context rather than fighting it — caution usually signals a real gap.',
          'Request explicit formats — table, memo, email — Claude follows structural instructions closely.',
        ],
      },
    ],
  },

  'gemini-quick-reference': {
    title: 'Google Gemini Quick Reference Guide',
    subtitle:
      'Use Gemini across Google Workspace and the web to research, draft, and analyze — built for professionals already living in Gmail, Docs, and Sheets.',
    category: 'AI Tools',
    sections: [
      {
        type: 'table',
        heading: 'Gemini Models',
        columns: ['Model', 'Strengths', 'Context', 'Where to access'],
        rows: [
          ['Gemini 2.5 Pro', 'Reasoning, long docs, coding', '1M+ tokens', 'Gemini Advanced, AI Studio'],
          ['Gemini 2.5 Flash', 'Speed, everyday tasks, cost', '1M tokens', 'Free tier, Workspace apps'],
          ['Gemini in Workspace', 'Native Gmail/Docs/Sheets help', 'Doc-scoped', 'Side panel in each app'],
          ['Deep Research', 'Multi-source web briefs', 'Large', 'Gemini Advanced'],
        ],
      },
      {
        type: 'flow',
        heading: 'Gemini in Google Workspace: 5 Power Moves',
        steps: [
          { label: 'Gmail thread summary', description: 'Open a long thread and ask the side panel to summarize decisions and draft a decision-ready reply.' },
          { label: 'Docs drafting', description: 'Use "Help me write" for outlines and first drafts, then refine passages inline without leaving the doc.' },
          { label: 'Sheets formula help', description: 'Describe what you need in plain English and let Gemini write the formula or classify a column.' },
          { label: 'Slides design', description: 'Generate first-draft slide content and speaker notes from an existing Doc.' },
          { label: 'Meet notes', description: 'Let Gemini capture notes and action items so you stay present in the conversation.' },
        ],
      },
      {
        type: 'grid',
        heading: 'What Gemini Does Better Than Competitors',
        cells: [
          { label: 'Advantage', value: 'Real-time info', color: '#4285f4' },
          { label: 'Advantage', value: 'Google integration', color: '#4285f4' },
          { label: 'Advantage', value: 'Multimodal input', color: '#4285f4' },
          { label: 'Advantage', value: 'Large context', color: '#4285f4' },
          { label: 'Advantage', value: 'Free tier', color: '#4285f4' },
          { label: 'Advantage', value: 'YouTube summaries', color: '#4285f4' },
        ],
      },
      {
        type: 'callout',
        style: 'info',
        text: 'Gemini Advanced (in the Google One AI Premium plan, ~$20/mo) unlocks the Pro model, Deep Research, and Gemini in Gmail, Docs, and Sheets. The free tier covers everyday chat and the Flash model — upgrade only once Workspace integration becomes part of your daily workflow.',
      },
      {
        type: 'bullets',
        heading: 'When NOT to Use Gemini',
        bullets: [
          'For long-form writing where tone and nuance are paramount — Claude tends to edge it out.',
          'When you need a mature plugin or custom-assistant ecosystem — ChatGPT is further ahead.',
          'For sensitive data on a personal account — confirm your org policy and use enterprise controls.',
          'When you cannot verify sources — grounding reduces but never eliminates errors.',
          'For tasks needing deep, deterministic coding workflows over many files.',
        ],
      },
    ],
  },

  'perplexity-quick-reference': {
    title: 'Perplexity AI Quick Reference Guide',
    subtitle:
      'Perplexity is the AI answer engine — fast, sourced research for professionals. Get trustworthy, citation-backed answers and brief yourself in minutes.',
    category: 'AI Tools',
    sections: [
      {
        type: 'table',
        heading: 'Perplexity vs Google Search vs ChatGPT',
        columns: ['Feature', 'Perplexity', 'Google', 'ChatGPT'],
        rows: [
          ['Real-time results', 'Yes, native', 'Yes', 'With browsing on'],
          ['Source citations', 'Inline, every claim', 'Links only', 'Sometimes'],
          ['Follow-up questions', 'Excellent, threaded', 'No', 'Yes'],
          ['Deep research', 'Pro Research mode', 'Manual', 'Deep Research'],
          ['Free tier', 'Generous', 'Yes', 'Yes (limited)'],
          ['Best for', 'Sourced research', 'Navigation', 'Drafting + reasoning'],
        ],
      },
      {
        type: 'flow',
        heading: 'The Perplexity Research Workflow',
        steps: [
          { label: 'Start with a broad question', description: 'Frame the topic with scope and timeframe: "EV charging market in the US over the last 18 months."' },
          { label: 'Follow up to drill down', description: 'Ask threaded follow-ups — Perplexity keeps context and narrows precisely.' },
          { label: 'Check the sources', description: 'Open the inline citations and confirm claims against primary sources, not aggregators.' },
          { label: 'Export the brief', description: 'Save the synthesized answer and citations into a Collection or your notes.' },
          { label: 'Refine and verify', description: 'Ask for "the 3 most authoritative sources" and confirm anything surprising independently.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Best Use Cases for Perplexity',
        cells: [
          { label: 'Use case', value: 'Competitor scans', color: '#20b2aa' },
          { label: 'Use case', value: 'Market sizing', color: '#20b2aa' },
          { label: 'Use case', value: 'Meeting prep', color: '#20b2aa' },
          { label: 'Use case', value: 'Fact validation', color: '#20b2aa' },
          { label: 'Use case', value: 'News synthesis', color: '#20b2aa' },
          { label: 'Use case', value: 'Source-finding', color: '#20b2aa' },
        ],
      },
      {
        type: 'callout',
        style: 'info',
        text: 'Pro Deep Research runs dozens of searches, reads the results, and returns a structured, multi-section report with citations in a few minutes — work that would take a human analyst hours. Use it for market briefs, diligence scans, and competitive landscapes.',
      },
      {
        type: 'bullets',
        heading: 'Power User Tips',
        bullets: [
          'Use Focus filters (Academic, Web, Social) to control where answers are sourced from.',
          'Organize recurring research in Spaces/Collections so context persists by project.',
          'Upload your own files to ask questions grounded in internal documents.',
          'Switch the underlying model when you need more reasoning depth on a hard question.',
          'Ask for a comparison table when evaluating options — it formats cleanly with sources.',
        ],
      },
    ],
  },

  'copilot-quick-reference': {
    title: 'Microsoft Copilot Quick Reference Guide',
    subtitle:
      'Make Copilot work across Microsoft 365 — Outlook, Word, Excel, PowerPoint, and Teams. A guide for professionals who live in the Microsoft stack.',
    category: 'AI Tools',
    sections: [
      {
        type: 'table',
        heading: 'Copilot Across Microsoft 365',
        columns: ['App', 'What Copilot does', 'Time saved', 'Key prompt example'],
        rows: [
          ['Word', 'Drafts and rewrites from a prompt or file', '30–60 min/doc', '"Draft a 1-page project brief from this email thread."'],
          ['Excel', 'Analyzes data, suggests formulas, finds trends', '20–40 min/analysis', '"Show the top 3 trends and chart revenue by region."'],
          ['PowerPoint', 'Turns a doc into a starter deck', '1–2 hrs/deck', '"Create a 10-slide deck from this Word report."'],
          ['Outlook', 'Summarizes threads, drafts replies, triages', '30 min/day', '"Summarize this thread and draft a reply agreeing to Friday."'],
          ['Teams', 'Recaps meetings, lists action items', '15 min/meeting', '"What did I miss and what are my action items?"'],
          ['OneNote', 'Organizes notes, drafts plans', '15 min/session', '"Turn these notes into a structured project plan."'],
        ],
      },
      {
        type: 'flow',
        heading: 'Getting Started with Copilot M365',
        steps: [
          { label: 'Confirm your license', description: 'Check that M365 Copilot is enabled for your account and which apps it covers.' },
          { label: 'Tidy your data', description: 'Well-named files and clear meeting titles dramatically improve grounded answers.' },
          { label: 'Start in Outlook and Teams', description: 'Thread summaries and meeting recaps deliver the fastest, most obvious wins.' },
          { label: 'Reference specifics', description: 'Name files, people, and meetings directly so Copilot grounds the answer in your data.' },
          { label: 'Build one daily habit', description: 'Pick a single recurring workflow and use it daily before expanding.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Copilot License Tiers',
        cells: [
          { label: 'Free', value: 'Copilot (Bing)', color: '#0078d4' },
          { label: '$20/mo', value: 'Copilot Pro', color: '#0078d4' },
          { label: '$30/user/mo', value: 'M365 Copilot', color: '#0078d4' },
          { label: 'Custom', value: 'Copilot Studio', color: '#0078d4' },
          { label: 'Per user', value: 'GitHub Copilot', color: '#0078d4' },
          { label: 'Consumption', value: 'Security Copilot', color: '#0078d4' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'Most users miss the standalone Copilot chat (the "Business Chat" experience) that reasons across all your emails, files, chats, and meetings at once. Ask "Summarize everything about the Q3 launch from my emails and chats" — it stitches context no single app can.',
      },
      {
        type: 'bullets',
        heading: "What Copilot Can't Do (Yet)",
        bullets: [
          'Reliably catch every nuance in very long email threads — always verify the summary.',
          'Access data outside your Microsoft 365 permissions — it only sees what you can see.',
          'Produce final-quality decks without human design and editing passes.',
          'Replace judgment on sensitive or high-stakes communications.',
          'Work well on poorly organized data — garbage in still means garbage out.',
        ],
      },
    ],
  },

  'notebooklm-quick-reference': {
    title: 'NotebookLM Quick Reference Guide',
    subtitle:
      'NotebookLM turns your own documents into a grounded research assistant. Build notebooks, ask source-cited questions, and generate audio overviews.',
    category: 'AI Tools',
    sections: [
      {
        type: 'table',
        heading: 'What You Can Do With NotebookLM',
        columns: ['Feature', 'How to use it', 'Best for'],
        rows: [
          ['Grounded Q&A', 'Ask questions across all uploaded sources', 'Querying a pile of documents'],
          ['Inline citations', 'Click a citation to jump to the exact passage', 'Verification and trust'],
          ['Briefing doc', 'Auto-generate a summary of all sources', 'Fast comprehension'],
          ['Study guide', 'Generate questions and key concepts', 'Learning dense material'],
          ['Audio Overview', 'Create a podcast-style discussion', 'Reviewing on the go'],
          ['Notes', 'Save answers to build a synthesized output', 'Assembling deliverables'],
        ],
      },
      {
        type: 'flow',
        heading: 'The NotebookLM Research Workflow',
        steps: [
          { label: 'Upload your sources', description: 'Add 5–20 focused, high-quality documents on a single topic.' },
          { label: 'Ask grounded questions', description: 'Query across sources: "What do these reports agree and disagree on?"' },
          { label: 'Generate an outline', description: 'Ask for a briefing doc or structured outline of the whole set.' },
          { label: 'Create a study guide', description: 'Turn dense material into key concepts and review questions.' },
          { label: 'Export an audio overview', description: 'Generate a podcast-style summary to review during a commute.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Supported Source Types',
        cells: [
          { label: 'Source', value: 'PDFs', color: '#10b981' },
          { label: 'Source', value: 'Google Docs', color: '#10b981' },
          { label: 'Source', value: 'Google Slides', color: '#10b981' },
          { label: 'Source', value: 'Web URLs', color: '#10b981' },
          { label: 'Source', value: 'YouTube videos', color: '#10b981' },
          { label: 'Source', value: 'Audio files', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The Audio Overview feature turns any set of documents into a surprisingly natural two-host podcast that explains and discusses your material. It is the fastest way to absorb a dense research bundle — generate it, then listen while commuting or exercising.',
      },
      {
        type: 'bullets',
        heading: 'Power User Tips for NotebookLM',
        bullets: [
          'Keep each notebook single-topic — off-topic sources noticeably degrade answer quality.',
          'Use it for synthesis across your sources, not for facts outside your uploads.',
          'Re-upload updated documents to keep the notebook current.',
          'Ask for timelines or tables to structure messy information across sources.',
          'Combine the briefing doc and audio overview for the fastest path to comprehension.',
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
        type: 'table',
        heading: 'Key Parameters Cheat Sheet',
        columns: ['Parameter', 'What it does', 'Example value', 'Effect'],
        rows: [
          ['--ar', 'Sets aspect ratio', '--ar 16:9', 'Slide-shaped wide image'],
          ['--style', 'Adjusts the aesthetic mode', '--style raw', 'Less stylized, more literal'],
          ['--chaos', 'Controls variety across the 4 results', '--chaos 30', 'More diverse options'],
          ['--v', 'Selects the model version', '--v 6', 'Latest quality and coherence'],
          ['--q', 'Controls render quality/time', '--q 2', 'Higher detail, slower'],
          ['--no', 'Excludes elements', '--no text, watermark', 'Removes unwanted items'],
        ],
      },
      {
        type: 'flow',
        heading: 'Writing Great Midjourney Prompts',
        steps: [
          { label: 'Name the subject', description: 'Be concrete: "a modern open-plan office with a small team collaborating."' },
          { label: 'Set style and medium', description: 'Add "editorial photography," "flat vector illustration," or "3D render."' },
          { label: 'Describe the lighting', description: 'Specify mood: "soft morning light" or "dramatic, high-contrast."' },
          { label: 'Set the mood and composition', description: 'Add "wide shot, centered, negative space on the left for headline text."' },
          { label: 'Add technical params', description: 'Finish with --ar, --v, and --style to lock format and quality.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Style Shortcuts That Work',
        cells: [
          { label: 'Style', value: 'photorealistic', color: '#10b981' },
          { label: 'Style', value: 'cinematic', color: '#10b981' },
          { label: 'Style', value: 'watercolor', color: '#10b981' },
          { label: 'Style', value: 'corporate clean', color: '#10b981' },
          { label: 'Style', value: 'infographic', color: '#10b981' },
          { label: 'Style', value: 'editorial', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'Use --sref (style reference) with a URL to an image you like, and Midjourney will mimic its look across every generation. This is the trick for brand consistency — feed it one on-brand image and produce a whole campaign that shares the same visual language.',
      },
      {
        type: 'bullets',
        heading: 'Common Prompt Mistakes',
        bullets: [
          'Overstuffing the prompt — 3–5 strong descriptors beat a wall of adjectives.',
          'Expecting accurate text inside images; Midjourney is unreliable at rendering words.',
          'Generating identifiable people or copyrighted characters for commercial use.',
          'Forgetting to leave negative space when you plan to add headlines or logos later.',
          'Rewriting the whole prompt instead of using "vary" to iterate on a near-miss.',
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
        type: 'table',
        heading: 'Evaluation Matrix',
        columns: ['Criterion', 'Weight', 'What to look for', 'Red flags'],
        rows: [
          ['Use case fit', 'High', 'Solves your actual job at your quality bar', 'Impressive demo, weak on real tasks'],
          ['Data privacy', 'High', 'Training opt-out, SOC 2, clear deletion', 'Vague data policy, trains on your inputs'],
          ['Integration', 'Med', 'Fits your existing suite and data', 'Standalone silo, manual copy-paste'],
          ['Cost', 'Med', 'Per-seat price vs measured time saved', 'Usage pricing that scales unpredictably'],
          ['Reliability', 'High', 'Consistent output, strong uptime', 'Flaky results, frequent outages'],
          ['Support', 'Low', 'Responsive, real docs, roadmap', 'No SLA, ghost-town community'],
        ],
      },
      {
        type: 'flow',
        heading: 'The 5-Step AI Tool Selection Process',
        steps: [
          { label: 'Define the need', description: 'Write a one-sentence "job to be done" with the desired output and quality bar.' },
          { label: 'Research options', description: 'Shortlist 2–3 candidates that plausibly fit — ignore the rest.' },
          { label: 'Run a pilot', description: 'Give one team the same real tasks across each tool for 2–4 weeks.' },
          { label: 'Measure ROI', description: 'Compare time saved, quality, and satisfaction against your metrics.' },
          { label: 'Scale or swap', description: 'Standardize the winner as the default, or cut your losses and retest.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Tool Categories & When to Use Them',
        cells: [
          { label: 'Category', value: 'Writing tools', color: '#10b981' },
          { label: 'Category', value: 'Research tools', color: '#10b981' },
          { label: 'Category', value: 'Code tools', color: '#10b981' },
          { label: 'Category', value: 'Image tools', color: '#10b981' },
          { label: 'Category', value: 'Meeting tools', color: '#10b981' },
          { label: 'Category', value: 'Automation tools', color: '#10b981' },
          { label: 'Category', value: 'Analysis tools', color: '#10b981' },
          { label: 'Category', value: 'Presentation tools', color: '#10b981' },
          { label: 'Category', value: 'Communication tools', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'warning',
        text: 'The hidden costs most teams ignore: change-management and training time, integration and admin overhead, the security review, and switching costs if you later move off. A "cheaper" tool that nobody adopts or that locks in your data is the most expensive option.',
      },
      {
        type: 'bullets',
        heading: 'Questions to Ask Every AI Vendor',
        bullets: [
          'Do you train on our data, and can we opt out in writing?',
          'Where is data processed and stored, and how is it deleted?',
          'What certifications do you hold (SOC 2, ISO 27001) and can we see them?',
          'How does pricing change as our usage scales?',
          'What is your uptime SLA and incident history?',
          'How do we export our data and content if we leave?',
        ],
      },
    ],
  },

  'how-to-evaluate-ai-products': {
    title: 'How to Evaluate AI Products',
    subtitle:
      "Cut through the hype. A buyer's guide to evaluating AI products and vendors on the dimensions that actually predict success.",
    category: 'Comparison',
    sections: [
      {
        type: 'table',
        heading: 'Evaluation Scorecard',
        columns: ['Dimension', 'Score (1-5)', 'Notes', 'Dealbreaker?'],
        rows: [
          ['Output quality', '___', 'Accuracy and consistency on real tasks', 'Yes'],
          ['Reliability', '___', 'Uptime and consistent results under load', 'Yes'],
          ['Speed', '___', 'Latency in real workflows, not demos', 'No'],
          ['Privacy/Security', '___', 'Training opt-out, certs, data handling', 'Yes'],
          ['Pricing', '___', 'TCO including usage, integration, training', 'No'],
          ['Integration', '___', 'Fits your stack and data flow', 'Maybe'],
          ['Support', '___', 'Responsiveness, docs, SLA', 'No'],
          ['Roadmap', '___', 'Vendor stability and pace of improvement', 'Maybe'],
        ],
      },
      {
        type: 'flow',
        heading: 'Running a 2-Week AI Product Pilot',
        steps: [
          { label: 'Days 1–2: Setup', description: 'Provision access, connect data, and define the success metrics you will measure.' },
          { label: 'Days 3–5: Daily use', description: 'Run real tasks yourself, including edge cases, and log quality and time.' },
          { label: 'Days 6–10: Team trial', description: 'Expand to a small representative group and gather structured feedback.' },
          { label: 'Days 11–13: Measure', description: 'Compare results against baseline — time saved, quality, satisfaction.' },
          { label: 'Day 14: Decision', description: 'Score against your criteria and decide: adopt, extend the pilot, or pass.' },
        ],
      },
      {
        type: 'ratings',
        heading: 'What Actually Matters in AI Evaluation',
        items: [
          { label: 'Output Quality', score: 9, max: 10, note: 'The single best predictor of real-world value. Test on your data.' },
          { label: 'Data Security', score: 8, max: 10, note: 'A non-negotiable gate for anything touching sensitive information.' },
          { label: 'Ease of Use', score: 7, max: 10, note: 'Drives adoption — a great tool nobody uses delivers zero ROI.' },
          { label: 'Integration Depth', score: 7, max: 10, note: 'Fitting into existing workflows multiplies the value.' },
          { label: 'Support Quality', score: 6, max: 10, note: 'Matters most for mission-critical or complex deployments.' },
        ],
      },
      {
        type: 'callout',
        style: 'info',
        text: 'The benchmark trap: vendor demos and leaderboard scores are tuned for ideal conditions. Real use brings messy inputs, edge cases, and scale that benchmarks never test. Always run your own pilot on your own data before believing any number.',
      },
      {
        type: 'bullets',
        heading: "Signs an AI Product Isn't Enterprise-Ready",
        bullets: [
          'It cannot clearly explain its own limitations or failure modes.',
          'No training opt-out, SOC 2, or clear data-deletion terms.',
          'Quality degrades sharply on your real data versus the demo.',
          'No admin controls, audit logs, or role-based permissions.',
          'Usage-based pricing with no cap that punishes you for adopting it.',
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
        type: 'table',
        heading: 'The Prompt Formula',
        columns: ['Element', 'Purpose', 'Example', 'Optional?'],
        rows: [
          ['Role', 'Sets tone and depth', '"You are a B2B pricing analyst."', 'Recommended'],
          ['Task', 'States exactly what to do', '"Draft a pricing recommendation."', 'Required'],
          ['Context', 'Supplies background and audience', '"For our CFO, based on this data."', 'Recommended'],
          ['Format', 'Shapes the output', '"As a one-page memo with bullets."', 'Recommended'],
          ['Constraints', 'Sets limits and exclusions', '"Under 300 words, no jargon."', 'Optional'],
          ['Examples', 'Locks the pattern', '"Match the tone of this sample."', 'Optional'],
        ],
      },
      {
        type: 'flow',
        heading: 'Iterating a Prompt from Bad to Great',
        steps: [
          { label: 'Vague', description: '"Write something about our product." Generic, unusable output.' },
          { label: 'Add a task', description: '"Write a product announcement email." Better, but still flat.' },
          { label: 'Add audience + format', description: '"Write a launch email to existing customers, 150 words, one CTA."' },
          { label: 'Add role + context', description: '"As our product marketer, announce [feature] solving [pain]."' },
          { label: 'Add an example', description: '"Match the voice of this past email." Now it is on-brand and ready.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Prompt Templates by Business Function',
        cells: [
          { label: 'Template', value: 'Executive summary', color: '#10b981' },
          { label: 'Template', value: 'Email draft', color: '#10b981' },
          { label: 'Template', value: 'Meeting agenda', color: '#10b981' },
          { label: 'Template', value: 'SWOT analysis', color: '#10b981' },
          { label: 'Template', value: 'Job description', color: '#10b981' },
          { label: 'Template', value: 'Project brief', color: '#10b981' },
          { label: 'Template', value: 'Sales script', color: '#10b981' },
          { label: 'Template', value: 'Data analysis', color: '#10b981' },
          { label: 'Template', value: 'Strategy memo', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The single change that improves 80% of business prompts: name your audience and the output format. "Summarize this for our CFO as a 5-bullet memo, decision first" beats "summarize this" every time. The model can only match a target it can see.',
      },
      {
        type: 'bullets',
        heading: 'Prompt Anti-Patterns to Eliminate',
        bullets: [
          'Describing source material from memory instead of pasting it in.',
          'Asking vague questions and blaming the model for generic answers.',
          'Accepting the first draft rather than refining with targeted asks.',
          'Stuffing five unrelated requests into one prompt.',
          'Omitting the audience, so the tone misses every time.',
        ],
      },
    ],
  },

  'advanced-prompting': {
    title: 'Advanced Prompting Techniques',
    subtitle:
      'Level up from basic prompts to reliable, high-quality results. The techniques the best AI users rely on — explained for business contexts.',
    category: 'Prompting',
    sections: [
      {
        type: 'table',
        heading: 'Prompting Techniques Ranked',
        columns: ['Technique', 'Complexity', 'When to use', 'Example use case'],
        rows: [
          ['Zero-shot', 'Low', 'Simple, common tasks', 'Quick rewrite or summary'],
          ['Few-shot', 'Low', 'Specific output format needed', 'Classify tickets by your taxonomy'],
          ['Chain of thought', 'Med', 'Multi-step reasoning', 'Pricing logic, root-cause analysis'],
          ['Role prompting', 'Low', 'Need expert depth/tone', '"As a skeptical CFO, critique this."'],
          ['Tree of thought', 'High', 'Explore multiple paths', 'Strategy options with trade-offs'],
          ['Self-consistency', 'Med', 'Accuracy-critical answers', 'Run twice, compare, reconcile'],
          ['ReAct', 'High', 'Tool-using agents', 'Research that fetches then reasons'],
        ],
      },
      {
        type: 'flow',
        heading: 'Chain of Thought Prompting: Step by Step',
        steps: [
          { label: 'State the problem clearly', description: 'Give the full question and all relevant data in one place.' },
          { label: 'Ask it to reason first', description: 'Add "Think step by step before giving your answer."' },
          { label: 'Have it show assumptions', description: 'Request that it surface assumptions so you can correct them early.' },
          { label: 'Review the reasoning', description: 'Check the logic chain, not just the conclusion, for errors.' },
          { label: 'Request the final answer', description: 'Once the reasoning holds, ask for the clean, formatted result.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Advanced Techniques Quick Reference',
        cells: [
          { label: 'Technique', value: 'Chain-of-thought', color: '#10b981' },
          { label: 'Technique', value: 'Few-shot examples', color: '#10b981' },
          { label: 'Technique', value: 'Role assignment', color: '#10b981' },
          { label: 'Technique', value: 'Output constraints', color: '#10b981' },
          { label: 'Technique', value: 'Step-by-step decomposition', color: '#10b981' },
          { label: 'Technique', value: 'Self-critique loop', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The "think step by step" trick works because it forces the model to generate intermediate reasoning instead of jumping to a guess. Each step conditions the next, so errors surface early and the final answer is far more accurate on anything requiring multi-step logic.',
      },
      {
        type: 'bullets',
        heading: 'When Advanced Prompting Is Overkill',
        bullets: [
          'Simple rewrites, summaries, and tone changes — zero-shot is plenty.',
          'When a clear example would communicate the goal faster than a technique.',
          'For throwaway tasks where "good enough" beats squeezing out 5% more quality.',
          'When the real problem is missing context, not insufficient reasoning.',
          'If you cannot verify the output anyway — complexity without checking adds risk.',
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
        type: 'table',
        heading: 'Top 20 Prompts by Marketing Function',
        columns: ['Function', 'Prompt Template', 'Output', 'Time saved'],
        rows: [
          ['Blog post', '"Outline a blog on [topic] for [audience]."', 'Structured outline', '45 min'],
          ['Social caption', '"Write 5 captions for [post] in [tone]."', 'Caption variations', '20 min'],
          ['Email subject', '"Give 10 subject lines for [offer]."', 'A/B test set', '15 min'],
          ['Ad copy', '"Write 3 ad variations for [platform]."', 'Headlines + body', '30 min'],
          ['Landing page', '"Draft a hero + 3 sections for [product]."', 'Page copy', '60 min'],
          ['SEO meta', '"Write title + meta for [page], <60 chars."', 'Meta tags', '10 min'],
          ['Newsletter', '"Draft a 5-section newsletter on [theme]."', 'Email draft', '40 min'],
          ['Case study', '"Turn these notes into a case study."', 'Story draft', '90 min'],
          ['Press release', '"Write a release for [announcement]."', 'PR draft', '45 min'],
          ['Campaign brief', '"Outline a 4-week launch for [product]."', 'Campaign plan', '60 min'],
        ],
      },
      {
        type: 'flow',
        heading: 'The AI Content Creation Workflow',
        steps: [
          { label: 'Brief', description: 'Give the AI the audience, goal, key points, and tone in one structured prompt.' },
          { label: 'Draft', description: 'Generate a first draft, plus 2–3 angle variations to choose from.' },
          { label: 'Review', description: 'Edit for accuracy, voice, and a single clear call to action.' },
          { label: 'Optimize', description: 'Ask for SEO meta, subject lines, and social variants from the final piece.' },
          { label: 'Publish', description: 'Schedule across channels and capture what worked for the prompt library.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Prompt Categories',
        cells: [
          { label: '10 prompts', value: 'Content creation', color: '#10b981' },
          { label: '8 prompts', value: 'Social media', color: '#10b981' },
          { label: '8 prompts', value: 'Email', color: '#10b981' },
          { label: '6 prompts', value: 'SEO', color: '#10b981' },
          { label: '6 prompts', value: 'Analytics', color: '#10b981' },
          { label: '12 prompts', value: 'Strategy', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The content multiplier: "Take this blog post and repurpose it into 5 LinkedIn posts, 3 tweets, an email, and a short video script — each with a different hook." One strong asset becomes a week of distribution in minutes.',
      },
      {
        type: 'bullets',
        heading: '10 More High-Value Marketing Prompts',
        bullets: [
          '"Draft a positioning statement for [product] targeting [segment] vs [competitor]."',
          '"Build a simple persona for [segment]: goals, pains, buying triggers, objections."',
          '"Suggest 5 A/B tests for this landing page, ranked by likely impact."',
          '"Critique this email for clarity, persuasion, and a single CTA."',
          '"Generate 10 keyword themes for [topic] grouped by funnel stage."',
          '"Define our brand voice in 5 adjectives with do/don\'t examples."',
          '"Summarize this competitor\'s messaging and where we can differentiate."',
          '"Turn this survey data into a one-page insight summary with 3 actions."',
          '"Write a webinar invite, reminder, and follow-up email set."',
          '"Create a content calendar for [month] across blog, email, and social."',
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
        type: 'table',
        heading: 'Top 15 Sales Prompts',
        columns: ['Stage', 'Prompt', 'What it produces', 'Use case'],
        rows: [
          ['Prospecting', '"Write a 3-line cold email to [persona]."', 'Outreach email', 'Cold outbound'],
          ['Qualification', '"List 5 questions to qualify [opportunity]."', 'Qual checklist', 'Early calls'],
          ['Discovery', '"Suggest discovery questions for [role]."', 'Question set', 'Discovery calls'],
          ['Demo prep', '"Tailor a demo flow to [priorities]."', 'Demo script', 'Pre-demo'],
          ['Objections', '"Give 3 responses to: [objection]."', 'Rebuttals', 'Live objection'],
          ['Proposal', '"Draft a proposal summary for [deal]."', 'Summary email', 'Mid-cycle'],
          ['Follow-up', '"Write a post-demo follow-up with next steps."', 'Recap email', 'After calls'],
          ['Negotiation', '"Reframe a price objection around ROI."', 'Talk track', 'Late-stage'],
          ['Closing', '"Write a nudge to sign before quarter-end."', 'Closing email', 'Deal close'],
          ['Renewal', '"Draft a renewal check-in highlighting value."', 'Renewal email', 'Post-sale'],
        ],
      },
      {
        type: 'flow',
        heading: 'AI-Assisted Sales Cycle',
        steps: [
          { label: 'Research', description: 'Generate an account brief and likely pain points before the first touch.' },
          { label: 'Outreach', description: 'Draft personalized, multi-touch sequences tailored by persona and trigger.' },
          { label: 'Discovery', description: 'Prep smart questions and turn call notes into a recap with next steps.' },
          { label: 'Proposal', description: 'Reframe features as outcomes and draft the proposal summary.' },
          { label: 'Close & renew', description: 'Handle objections, nudge to signature, then plan the renewal motion.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Prompt Categories',
        cells: [
          { label: '8 prompts', value: 'Prospecting', color: '#10b981' },
          { label: '8 prompts', value: 'Discovery', color: '#10b981' },
          { label: '8 prompts', value: 'Proposals', color: '#10b981' },
          { label: '8 prompts', value: 'Objections', color: '#10b981' },
          { label: '8 prompts', value: 'Follow-up', color: '#10b981' },
          { label: '10 prompts', value: 'Coaching', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The personalization prompt that triples reply rates: "Using these notes about the prospect and their company, write a 3-line email where the first line proves I researched them, the second connects to a likely pain, and the third has one soft CTA." Specific beats generic, every time.',
      },
      {
        type: 'bullets',
        heading: '10 More High-Value Sales Prompts',
        bullets: [
          '"Summarize what this company does and its likely pain points for [product]."',
          '"Draft 5 subject lines for an outreach email to [role]."',
          '"Build a 4-touch sequence (email, call script, LinkedIn) for [segment]."',
          '"Turn these discovery notes into a recap email with clear next steps."',
          '"Reframe our features as outcomes for a [role] persona."',
          '"Draft a competitive comparison talking point vs [competitor]."',
          '"Write a response to re-engage a stalled deal\'s champion."',
          '"Prepare answers to the 5 toughest questions a [role] might ask."',
          '"Draft a mutual action plan for this deal."',
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
      'How modern marketing teams use AI to do more with less — across content, demand gen, design, and analytics. A practical playbook, not theory.',
    category: 'Business Functions',
    sections: [
      {
        type: 'table',
        heading: 'AI Tools by Marketing Function',
        columns: ['Function', 'Best AI tool', 'What it replaces', 'Monthly cost'],
        rows: [
          ['Content writing', 'ChatGPT / Claude', 'Freelance drafting', '$20'],
          ['Social media', 'Jasper / Buffer AI', 'Manual scheduling', '$30–50'],
          ['SEO', 'Surfer / Clearscope', 'SEO consultant hours', '$60–100'],
          ['Email', 'Copy.ai / native ESP AI', 'Copywriter time', '$30–50'],
          ['Design', 'Midjourney / Canva AI', 'Stock + basic design', '$10–30'],
          ['Analytics', 'GA4 + AI insights', 'Manual reporting', 'Included'],
          ['Ads', 'AdCreative.ai', 'Creative iteration', '$30–60'],
          ['Video', 'Descript / Runway', 'Video editor hours', '$15–35'],
          ['PR', 'Perplexity + ChatGPT', 'Media research', '$20'],
        ],
      },
      {
        type: 'flow',
        heading: 'Building Your AI Marketing Stack in 30 Days',
        steps: [
          { label: 'Week 1: Content tools', description: 'Stand up your writing assistant, set brand voice, build a prompt library.' },
          { label: 'Week 2: Social & email', description: 'Add scheduling and email AI; templatize repeatable campaigns.' },
          { label: 'Week 3: Analytics', description: 'Wire up reporting and AI insights to turn dashboards into narratives.' },
          { label: 'Week 4: Integrate & optimize', description: 'Connect the tools, kill redundancies, and measure time saved.' },
        ],
      },
      {
        type: 'ratings',
        heading: 'AI Impact by Marketing Function',
        items: [
          { label: 'Content creation', score: 9, max: 10, note: 'Biggest win — drafting, repurposing, and variation at scale.' },
          { label: 'Social media', score: 8, max: 10, note: 'Caption generation and scheduling save hours weekly.' },
          { label: 'SEO optimization', score: 8, max: 10, note: 'Keyword clusters and on-page guidance accelerate ranking.' },
          { label: 'Email marketing', score: 7, max: 10, note: 'Subject lines and drafts speed up, but test rigorously.' },
          { label: 'Paid advertising', score: 7, max: 10, note: 'Creative variation is strong; targeting still needs humans.' },
          { label: 'Brand strategy', score: 5, max: 10, note: 'AI assists thinking but cannot own positioning judgment.' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The workflow that cuts content production time by 70%: brief the AI once with audience, goal, and voice; generate the long-form asset; then have it auto-repurpose into social, email, and ad variants. You move from blank page to a full distribution set in a single sitting.',
      },
      {
        type: 'bullets',
        heading: 'Marketing AI Mistakes That Cost Time',
        bullets: [
          'Publishing AI drafts without a human voice and accuracy pass.',
          'Skipping a shared prompt library, so quality is inconsistent across the team.',
          'Generating one version instead of variations to test.',
          'Trusting AI analytics without validating against the raw data.',
          'Adopting ten tools when three would cover 90% of the work.',
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
        type: 'table',
        heading: 'AI Tools for Each Sales Stage',
        columns: ['Stage', 'Tool', 'Use case', 'ROI indicator'],
        rows: [
          ['Prospecting', 'Apollo / Clay AI', 'Find and research targets', 'More qualified leads'],
          ['Lead scoring', 'CRM AI (HubSpot/SFDC)', 'Rank by fit and intent', 'Higher conversion'],
          ['Outreach', 'ChatGPT / Lavender', 'Personalized sequences', 'Higher reply rate'],
          ['Discovery', 'Gong / Fathom', 'Call notes and insights', 'Better next steps'],
          ['Proposal', 'ChatGPT / Claude', 'Draft summaries fast', 'Shorter cycle time'],
          ['Negotiation', 'Claude', 'ROI reframes, talk tracks', 'Protected margin'],
          ['Closing', 'CRM AI', 'Nudges and risk flags', 'Higher win rate'],
          ['CRM update', 'Gong / auto-capture', 'Hands-free logging', 'Cleaner pipeline'],
        ],
      },
      {
        type: 'flow',
        heading: 'The AI-Augmented Sales Day',
        steps: [
          { label: 'Morning: prep', description: 'AI briefs you on today\'s accounts — recent news, pain points, talking points.' },
          { label: 'Mid-morning: outreach', description: 'Send personalized sequences drafted from prospect notes in minutes.' },
          { label: 'Midday: calls', description: 'AI captures notes and surfaces next steps while you stay present.' },
          { label: 'Afternoon: follow-up', description: 'Auto-draft recap emails, proposals, and CRM updates from call notes.' },
          { label: 'End of day: forecast', description: 'AI summarizes deal status and risks ahead of your pipeline review.' },
        ],
      },
      {
        type: 'ratings',
        heading: 'AI Impact on Sales Activities',
        items: [
          { label: 'Lead research', score: 9, max: 10, note: 'Account briefs in seconds instead of 20 minutes of digging.' },
          { label: 'Personalized outreach', score: 9, max: 10, note: 'Human-quality personalization at volume lifts reply rates.' },
          { label: 'Call prep', score: 8, max: 10, note: 'Tailored questions and talking points before every meeting.' },
          { label: 'Proposal writing', score: 8, max: 10, note: 'First-draft summaries cut hours from the deal cycle.' },
          { label: 'CRM hygiene', score: 9, max: 10, note: 'Auto-capture finally makes the pipeline trustworthy.' },
          { label: 'Forecasting', score: 7, max: 10, note: 'Better summaries, but confirm against the CRM source of truth.' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The prospecting prompt that generates 3x more qualified responses: "Using these notes about the company and contact, write a 3-line email — line 1 proves I did my research, line 2 ties to a likely pain, line 3 is one low-friction CTA." Relevance, not volume, drives replies.',
      },
      {
        type: 'bullets',
        heading: 'Sales AI Red Flags to Avoid',
        bullets: [
          'Mass-blasting AI-written emails that all sound identical — relevance dies.',
          'Letting AI summaries into the forecast without checking the CRM.',
          'Putting customer data into unapproved, non-enterprise tools.',
          'Outsourcing the relationship — AI assists, the rep owns the trust.',
          'Measuring activity (emails sent) instead of outcomes (pipeline created).',
        ],
      },
    ],
  },

  'ai-for-hr': {
    title: 'AI for HR & People Ops',
    subtitle:
      'How people teams use AI responsibly to hire faster, support employees better, and reduce admin load — without losing the human touch.',
    category: 'Business Functions',
    sections: [
      {
        type: 'table',
        heading: 'AI Use Cases in HR',
        columns: ['Function', 'AI application', 'Tool examples', 'Risk to manage'],
        rows: [
          ['Recruiting', 'Sourcing and outreach drafts', 'LinkedIn AI, ChatGPT', 'Bias in targeting'],
          ['JD writing', 'Inclusive, accurate drafts', 'Textio, ChatGPT', 'Overstated requirements'],
          ['Screening', 'Resume summarization', 'ATS AI features', 'Discriminatory filtering'],
          ['Onboarding', 'Role-specific plans', 'ChatGPT, NotebookLM', 'Generic, impersonal plans'],
          ['L&D', 'Course and content drafts', 'ChatGPT, Claude', 'Inaccurate material'],
          ['Performance', 'Feedback summaries', 'Claude', 'Unfair characterization'],
          ['Employee comms', 'Tone-tuned messaging', 'ChatGPT', 'Insensitive wording'],
          ['HR analytics', 'Survey theme clustering', 'Claude, Gemini', 'Misreading sentiment'],
        ],
      },
      {
        type: 'flow',
        heading: 'AI-Assisted Hiring Process',
        steps: [
          { label: 'Draft the JD', description: 'Generate an inclusive, accurate job description and review for bias.' },
          { label: 'Source & screen', description: 'Summarize resumes for fit — never auto-reject; humans decide.' },
          { label: 'Prep interviews', description: 'Create structured questions tied to the role\'s real competencies.' },
          { label: 'Evaluate consistently', description: 'Turn interview notes into comparable, structured evaluations.' },
          { label: 'Offer & onboard', description: 'Draft the offer comms and a role-specific onboarding plan.' },
        ],
      },
      {
        type: 'grid',
        heading: 'AI HR Tools by Category',
        cells: [
          { label: 'Use', value: 'JD generation', color: '#10b981' },
          { label: 'Use', value: 'Resume screening', color: '#10b981' },
          { label: 'Use', value: 'Interview prep', color: '#10b981' },
          { label: 'Use', value: 'Onboarding content', color: '#10b981' },
          { label: 'Use', value: 'Policy drafting', color: '#10b981' },
          { label: 'Use', value: 'Survey analysis', color: '#10b981' },
          { label: 'Use', value: 'Training content', color: '#10b981' },
          { label: 'Use', value: 'Performance summaries', color: '#10b981' },
          { label: 'Use', value: 'Comp benchmarking', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'warning',
        text: 'Bias risk in AI-assisted hiring is real and legally consequential. AI trained on historical data can replicate past discrimination. HR must audit: never auto-reject candidates, test tools for disparate impact, keep humans accountable for every decision, and document your process to withstand scrutiny.',
      },
      {
        type: 'bullets',
        heading: 'HR AI Implementation Checklist',
        bullets: [
          'Define which decisions AI may assist with and which it may never make.',
          'Audit screening and ranking tools for bias and disparate impact regularly.',
          'Use enterprise tools with strict controls for sensitive employee data.',
          'Keep a human in the loop and accountable for all people decisions.',
          'Comply with employment and privacy law in every market you operate in.',
          'Be transparent with candidates and employees about where AI is used.',
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
        type: 'table',
        heading: 'AI Applications in Finance',
        columns: ['Use case', 'Tool type', 'Time saved', 'Risk level'],
        rows: [
          ['Financial modeling', 'Spreadsheet AI', 'Hours/model', 'High — verify math'],
          ['Variance analysis', 'LLM + data', 'Hours/close', 'Medium'],
          ['Report writing', 'ChatGPT / Claude', 'Hours/report', 'Low'],
          ['Forecast narration', 'Claude', '1–2 hrs', 'Low'],
          ['Contract review', 'Claude (long context)', 'Hours/contract', 'Medium'],
          ['Expense analysis', 'Code interpreter', 'Hours/cycle', 'Medium'],
          ['Board prep', 'ChatGPT / Claude', 'Days/deck', 'Medium'],
          ['Audit support', 'Document AI', 'Hours/request', 'High'],
        ],
      },
      {
        type: 'flow',
        heading: 'AI-Assisted Monthly Close Process',
        steps: [
          { label: 'Collect & reconcile', description: 'Use AI to flag anomalies and summarize reconciliation exceptions.' },
          { label: 'Analyze variances', description: 'Ask AI to explain variances and list plausible drivers to investigate.' },
          { label: 'Draft commentary', description: 'Generate first-draft management commentary from your trend data.' },
          { label: 'Build the deck', description: 'Turn figures and commentary into board-ready slides.' },
          { label: 'Review & verify', description: 'Independently check every number before anything is finalized.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Finance AI Quick Wins',
        cells: [
          { label: 'Win', value: 'Variance commentary', color: '#10b981' },
          { label: 'Win', value: 'Board deck narrative', color: '#10b981' },
          { label: 'Win', value: 'Budget vs actual', color: '#10b981' },
          { label: 'Win', value: 'Cash flow forecast', color: '#10b981' },
          { label: 'Win', value: 'Vendor analysis', color: '#10b981' },
          { label: 'Win', value: 'KPI dashboard', color: '#10b981' },
          { label: 'Win', value: 'Audit prep', color: '#10b981' },
          { label: 'Win', value: 'Policy review', color: '#10b981' },
          { label: 'Win', value: 'FP&A modeling', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'warning',
        text: 'What AI gets wrong in financial analysis: it can produce confident but incorrect arithmetic, misattribute variance drivers, and fabricate plausible-looking figures. Catch it by independently verifying every calculation, tracing numbers to primary sources, and treating AI as a draft generator — never the system of record.',
      },
      {
        type: 'bullets',
        heading: 'Finance AI Governance Checklist',
        bullets: [
          'Verify every calculation independently — never trust AI math blindly.',
          'Keep confidential financials in approved, secure, enterprise tools only.',
          'Maintain audit trails and human sign-off on all AI-assisted outputs.',
          'Trace every number back to its primary source before publishing.',
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
        type: 'table',
        heading: 'AI Across the Product Lifecycle',
        columns: ['Phase', 'AI use', 'Tool', 'Output quality'],
        rows: [
          ['Discovery', 'Synthesize user research', 'Claude', 'High'],
          ['Ideation', 'Generate solution options', 'ChatGPT', 'High'],
          ['Prioritization', 'Structure trade-offs', 'Claude', 'Medium'],
          ['Spec writing', 'Draft PRDs and stories', 'Claude / ChatGPT', 'High'],
          ['Development', 'Clarify edge cases', 'ChatGPT', 'Medium'],
          ['Launch', 'Release notes, enablement', 'ChatGPT', 'High'],
          ['Analytics', 'Interpret usage data', 'Code interpreter', 'Medium'],
          ['Iteration', 'Cluster feedback', 'Claude', 'High'],
        ],
      },
      {
        type: 'flow',
        heading: 'AI-Assisted Product Discovery Sprint',
        steps: [
          { label: 'Synthesize research', description: 'Turn interview transcripts into themes, quotes, and insights.' },
          { label: 'Frame the problem', description: 'Distill the synthesis into a sharp, validated problem statement.' },
          { label: 'Ideate solutions', description: 'Generate a wide set of solution options, then narrow with the team.' },
          { label: 'Prioritize', description: 'Structure trade-offs with RICE or impact/effort populated by your data.' },
          { label: 'Draft the PRD', description: 'Produce a first-draft spec to refine with engineering and design.' },
        ],
      },
      {
        type: 'grid',
        heading: 'PM AI Toolkit',
        cells: [
          { label: 'Task', value: 'User interview analysis', color: '#10b981' },
          { label: 'Task', value: 'Feature prioritization', color: '#10b981' },
          { label: 'Task', value: 'PRD writing', color: '#10b981' },
          { label: 'Task', value: 'Competitive analysis', color: '#10b981' },
          { label: 'Task', value: 'Roadmap narrative', color: '#10b981' },
          { label: 'Task', value: 'Release notes', color: '#10b981' },
          { label: 'Task', value: 'A/B test analysis', color: '#10b981' },
          { label: 'Task', value: 'NPS analysis', color: '#10b981' },
          { label: 'Task', value: 'OKR drafting', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The PRD prompt that produces first-draft specs in 10 minutes: "Act as a senior PM. From this problem statement and these constraints, draft a PRD with goals, non-goals, user stories, acceptance criteria, edge cases, and open questions." You edit a draft instead of staring at a blank page.',
      },
      {
        type: 'bullets',
        heading: 'Where AI Falls Short for PMs',
        bullets: [
          'It cannot talk to customers — real discovery still requires human conversations.',
          'It will invent plausible-sounding user needs; validate every assumption.',
          'It lacks your org\'s political and strategic context for prioritization calls.',
          'It cannot own the decision — judgment and accountability stay with you.',
          'Its data analysis needs checking against the source before it shapes a roadmap.',
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
        type: 'table',
        heading: 'Operations AI Use Cases',
        columns: ['Process', 'AI application', 'Tools', 'Effort to implement'],
        rows: [
          ['Process documentation', 'Draft SOPs from a description', 'ChatGPT / Claude', 'Low'],
          ['SOP creation', 'Structure steps and checklists', 'ChatGPT', 'Low'],
          ['Vendor management', 'Compare contracts and terms', 'Claude', 'Medium'],
          ['Incident reporting', 'Summarize and draft post-mortems', 'Claude', 'Low'],
          ['Meeting ops', 'Capture notes and action items', 'Otter / Fathom', 'Low'],
          ['Data analysis', 'Surface bottlenecks and trends', 'Code interpreter', 'Medium'],
          ['Workflow automation', 'Design logic and rules', 'ChatGPT + Zapier', 'High'],
          ['Training materials', 'Generate guides and FAQs', 'ChatGPT', 'Low'],
        ],
      },
      {
        type: 'flow',
        heading: 'Automating a Business Process with AI',
        steps: [
          { label: 'Map the process', description: 'Have AI turn your description into a clear step-by-step process map.' },
          { label: 'Identify AI touchpoints', description: 'Flag the repetitive, rules-based steps best suited to automation.' },
          { label: 'Build the prompts', description: 'Create and document reusable prompts or workflow logic for each step.' },
          { label: 'Test', description: 'Run real cases through it, including edge cases, and refine.' },
          { label: 'Deploy', description: 'Roll out with a human-in-the-loop checkpoint and monitor results.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Operations AI Quick Wins',
        cells: [
          { label: 'Win', value: 'SOP generation', color: '#10b981' },
          { label: 'Win', value: 'Process maps', color: '#10b981' },
          { label: 'Win', value: 'Meeting notes', color: '#10b981' },
          { label: 'Win', value: 'Status reports', color: '#10b981' },
          { label: 'Win', value: 'Vendor comparison', color: '#10b981' },
          { label: 'Win', value: 'Budget tracking', color: '#10b981' },
          { label: 'Win', value: 'Policy drafting', color: '#10b981' },
          { label: 'Win', value: 'FAQ creation', color: '#10b981' },
          { label: 'Win', value: 'Training content', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The process documentation prompt that captures any workflow in 5 minutes: "Interview me one question at a time about how I do [process], then write a clean SOP with numbered steps, owners, inputs, outputs, and common failure points." It pulls tribal knowledge out of your head and onto the page.',
      },
      {
        type: 'bullets',
        heading: 'Operations AI Governance Rules',
        bullets: [
          'Keep a human in the loop for decisions and exceptions, not just the happy path.',
          'Use approved tools to protect operational and customer data.',
          'Pilot on one process and prove value before expanding.',
          'Standardize prompts and templates so quality is repeatable across the team.',
          'Track cycle time, error rates, and time saved to prove and sustain ROI.',
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
        type: 'table',
        heading: 'Adoption Phases',
        columns: ['Phase', 'Timeline', 'Focus', 'Success metrics', 'Common failures'],
        rows: [
          ['Foundation', 'Weeks 1–4', 'Policy, tools, literacy', 'Policy live, tools chosen', 'Chasing tools, no "why"'],
          ['Experimentation', 'Months 2–3', 'Pilots on real work', 'Time saved, quality', 'Pilots with no metrics'],
          ['Scaling', 'Months 4–9', 'Roll out proven wins', 'Adoption, outcomes', 'Access without enablement'],
          ['Optimization', 'Ongoing', 'Embed and govern', 'ROI, compliance', 'Treating AI as a project'],
        ],
      },
      {
        type: 'flow',
        heading: 'The 90-Day AI Adoption Plan',
        steps: [
          { label: 'Month 1: Awareness & tools', description: 'Set the "why," choose enterprise tools, publish policy, and run AI literacy training.' },
          { label: 'Month 2: Pilots', description: 'Launch 2–3 pilots with motivated teams and clearly defined success metrics.' },
          { label: 'Month 3: Measure & scale', description: 'Quantify results, capture playbooks, and roll proven workflows to adjacent teams.' },
        ],
      },
      {
        type: 'ratings',
        heading: 'Readiness Dimensions to Assess',
        items: [
          { label: 'Leadership buy-in', score: 9, max: 10, note: 'Importance: without sponsorship, adoption stalls fast.' },
          { label: 'Change management', score: 9, max: 10, note: 'Importance: the human side decides success more than the tech.' },
          { label: 'Data infrastructure', score: 8, max: 10, note: 'Importance: clean, accessible data multiplies AI value.' },
          { label: 'Skill readiness', score: 8, max: 10, note: 'Importance: training turns access into real productivity.' },
          { label: 'Governance', score: 7, max: 10, note: 'Importance: guardrails enable speed rather than blocking it.' },
          { label: 'Budget', score: 7, max: 10, note: 'Importance: needed, but smaller than the human factors.' },
        ],
      },
      {
        type: 'callout',
        style: 'warning',
        text: 'The #1 reason AI adoption fails is not the technology — it is change management. Teams get licenses but no training, no clear workflows, and no incentive to change habits. Access is not adoption. Invest as much in enablement and behavior change as you do in the tools themselves.',
      },
      {
        type: 'bullets',
        heading: 'Adoption Accelerators That Actually Work',
        bullets: [
          'Appoint visible champions in each function who model real daily use.',
          'Share a living library of proven prompts and use cases.',
          'Celebrate and quantify early wins to build momentum.',
          'Integrate AI into existing tools and workflows, not alongside them.',
          'Make time-saved measurement and storytelling part of the rollout.',
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
        type: 'table',
        heading: 'ROI Framework',
        columns: ['Value driver', 'How to measure', 'Typical range', 'Data needed'],
        rows: [
          ['Time saved', 'Hours × loaded cost × people', '20–40% on tasks', 'Time studies, headcount'],
          ['Error reduction', 'Cost of rework avoided', '10–50% fewer errors', 'Error rates, rework cost'],
          ['Revenue uplift', 'Conversion or output gains', '5–20%', 'Funnel and output data'],
          ['Cost avoidance', 'Headcount or vendor deferral', 'Varies', 'Current spend baseline'],
          ['Speed to market', 'Cycle-time reduction', '20–50% faster', 'Project timelines'],
          ['Employee satisfaction', 'Retention, engagement', 'Hard to quantify', 'Survey, attrition data'],
        ],
      },
      {
        type: 'flow',
        heading: 'Building Your AI Business Case in 5 Steps',
        steps: [
          { label: 'Define the problem', description: 'Start from a specific business problem, not "we should use AI."' },
          { label: 'Quantify the baseline', description: 'Measure the current cost in hours, errors, delays, or missed revenue.' },
          { label: 'Model scenarios', description: 'Build conservative, base, and upside cases with defensible assumptions.' },
          { label: 'Present risk/reward', description: 'Pair the ROI with named risks and concrete mitigations.' },
          { label: 'Get sign-off', description: 'Make the ask explicit, phased, and easy to approve.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Business Case Components',
        cells: [
          { label: 'Section', value: 'Executive summary', color: '#10b981' },
          { label: 'Section', value: 'Problem statement', color: '#10b981' },
          { label: 'Section', value: 'Current state cost', color: '#10b981' },
          { label: 'Section', value: 'Proposed solution', color: '#10b981' },
          { label: 'Section', value: 'ROI model', color: '#10b981' },
          { label: 'Section', value: 'Risk analysis', color: '#10b981' },
          { label: 'Section', value: 'Implementation plan', color: '#10b981' },
          { label: 'Section', value: 'Success metrics', color: '#10b981' },
          { label: 'Section', value: 'The ask', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The ROI formula that wins approval: (Hours saved per person × loaded hourly cost × number of people × frequency) − total cost of ownership = annual net benefit. Divide TCO by monthly benefit for payback period. Use conservative numbers you can defend — credibility beats a big headline.',
      },
      {
        type: 'bullets',
        heading: 'Common Business Case Mistakes',
        bullets: [
          'Leading with the technology instead of the business outcome.',
          'Using optimistic assumptions that collapse under finance\'s scrutiny.',
          'Counting efficiency only, ignoring quality and revenue upside.',
          'Omitting total cost of ownership — integration, training, and oversight.',
          'Asking for a big-bang investment instead of a phased, de-risked plan.',
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
        type: 'table',
        heading: 'AI Risk Categories',
        columns: ['Risk type', 'Likelihood', 'Impact', 'Mitigation'],
        rows: [
          ['Data privacy breach', 'Medium', 'Severe', 'Enterprise tools, training opt-out'],
          ['Hallucination', 'High', 'High', 'Verification standards, human review'],
          ['Bias in outputs', 'Medium', 'Severe', 'Audits, human decisions, testing'],
          ['IP/copyright', 'Medium', 'High', 'Usage policy, commercial-use checks'],
          ['Security vulnerability', 'Medium', 'Severe', 'Vendor assessment, access controls'],
          ['Vendor lock-in', 'Medium', 'Medium', 'Data portability, exit planning'],
          ['Compliance', 'Medium', 'Severe', 'Regulatory mapping, legal review'],
          ['Reputational', 'Low', 'Severe', 'Brand guardrails, oversight'],
        ],
      },
      {
        type: 'flow',
        heading: 'Implementing AI Governance in 5 Steps',
        steps: [
          { label: 'Policy', description: 'Publish an acceptable-use policy: approved tools and what data is allowed.' },
          { label: 'Training', description: 'Train people on the policy, verification, and data handling — not just publish it.' },
          { label: 'Review process', description: 'Create an intake and review path for new high-risk use cases.' },
          { label: 'Monitoring', description: 'Watch for quality, bias, and policy compliance in live usage.' },
          { label: 'Audit', description: 'Keep records and run periodic audits on sensitive applications.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Governance Building Blocks',
        cells: [
          { label: 'Block', value: 'Acceptable use policy', color: '#10b981' },
          { label: 'Block', value: 'Data classification', color: '#10b981' },
          { label: 'Block', value: 'Approved tool list', color: '#10b981' },
          { label: 'Block', value: 'Output review process', color: '#10b981' },
          { label: 'Block', value: 'Incident response', color: '#10b981' },
          { label: 'Block', value: 'Vendor assessment', color: '#10b981' },
          { label: 'Block', value: 'Compliance mapping', color: '#10b981' },
          { label: 'Block', value: 'Training program', color: '#10b981' },
          { label: 'Block', value: 'Audit schedule', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'warning',
        text: 'The regulatory landscape is tightening fast. GDPR governs personal data in AI workflows; the EU AI Act imposes tiered obligations by risk level with real penalties; and sector rules (HIPAA, financial regs) still apply. Map your use cases to applicable regulation now — retrofitting compliance later is far more expensive.',
      },
      {
        type: 'bullets',
        heading: 'Minimum Viable AI Governance Checklist',
        bullets: [
          'A published acceptable-use policy everyone has actually read.',
          'An approved-tools list with enterprise data protections and training opt-out.',
          'Clear data classification: what can and cannot be put into AI tools.',
          'Human-in-the-loop requirements for consequential decisions.',
          'A named owner or committee accountable for AI governance.',
          'A simple channel to report concerns and incidents.',
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
        type: 'table',
        heading: 'The 7-Day Plan',
        columns: ['Day', 'Focus', 'Tool', 'Task to complete', 'Time needed'],
        rows: [
          ['Day 1', 'Setup', 'ChatGPT/Claude', 'Create account, set custom instructions', '20 min'],
          ['Day 2', 'Basics', 'Same tool', 'Run 5 low-stakes tasks, practice follow-ups', '30 min'],
          ['Day 3', 'Real work', 'Same tool', 'Use AI on one real job, start to finish', '45 min'],
          ['Day 4', 'Documents', 'Same tool', 'Upload a file and ask questions about it', '30 min'],
          ['Day 5', 'Templates', 'Same tool', 'Save your 3 best prompts as templates', '30 min'],
          ['Day 6', 'Expand', 'A 2nd tool', 'Try a research tool like Perplexity', '30 min'],
          ['Day 7', 'Reflect', 'All', 'Pick 2–3 workflows to keep weekly', '20 min'],
        ],
      },
      {
        type: 'flow',
        heading: 'Building the AI Habit',
        steps: [
          { label: 'Start simple', description: 'Run low-stakes tasks until prompting feels natural and unintimidating.' },
          { label: 'Find your use case', description: 'Identify the one recurring task where AI saves you the most time.' },
          { label: 'Build a workflow', description: 'Turn that task into a repeatable prompt or template you reuse.' },
          { label: 'Measure the gain', description: 'Notice the time and effort saved so the habit reinforces itself.' },
          { label: 'Expand', description: 'Add a second use case and a second tool only once the first sticks.' },
        ],
      },
      {
        type: 'grid',
        heading: 'Quick Win Tasks for Day 1',
        cells: [
          { label: 'Try', value: 'Summarize a long email', color: '#10b981' },
          { label: 'Try', value: 'Draft a meeting agenda', color: '#10b981' },
          { label: 'Try', value: 'Research a topic', color: '#10b981' },
          { label: 'Try', value: 'Write a first draft', color: '#10b981' },
          { label: 'Try', value: 'Brainstorm ideas', color: '#10b981' },
          { label: 'Try', value: 'Explain a complex concept', color: '#10b981' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The one thing that separates power users from casual users: iteration. Casual users accept the first answer; power users treat it as a draft and refine with "make it tighter, more specific, more executive." The magic is rarely in the first prompt — it is in the second and third.',
      },
      {
        type: 'bullets',
        heading: 'What to Do When AI Gets It Wrong',
        bullets: [
          'Add the context it was missing rather than just repeating the prompt.',
          'Tell it specifically what was wrong: "too generic," "wrong audience," "made up a number."',
          'Ask it to show its reasoning so you can spot where it went off track.',
          'Give an example of what a good answer looks like.',
          'Verify any fact or figure independently before you rely on it.',
        ],
      },
    ],
  },

  'personal-ai-stack': {
    title: 'Building Your Personal AI Stack',
    subtitle:
      "How to assemble a lean, powerful set of AI tools tailored to how you actually work — without paying for things you won't use.",
    category: 'Getting Started',
    sections: [
      {
        type: 'table',
        heading: 'The Essential AI Stack',
        columns: ['Category', 'Tool', 'Cost', 'What it replaces', 'Setup time'],
        rows: [
          ['Writing assistant', 'ChatGPT / Claude', '$20/mo', 'Drafting time', '10 min'],
          ['Research', 'Perplexity', '$0–20/mo', 'Hours of googling', '5 min'],
          ['Image generation', 'Midjourney / Canva AI', '$10–30/mo', 'Stock + designer', '15 min'],
          ['Meeting notes', 'Fathom / Otter', '$0–20/mo', 'Manual note-taking', '10 min'],
          ['Coding', 'GitHub Copilot / Cursor', '$10–20/mo', 'Boilerplate effort', '15 min'],
          ['Automation', 'Zapier / Make', '$0–20/mo', 'Repetitive tasks', '30 min'],
          ['Search', 'Perplexity / Gemini', '$0', 'Research rabbit holes', '5 min'],
          ['Presentation', 'Gamma / Canva AI', '$0–20/mo', 'Slide building', '15 min'],
        ],
      },
      {
        type: 'flow',
        heading: 'Stack Selection in 5 Steps',
        steps: [
          { label: 'Audit your work', description: 'List the tasks you do most and where your hours actually go.' },
          { label: 'Identify bottlenecks', description: 'Find the recurring work that drains the most time each week.' },
          { label: 'Match tools to tasks', description: 'Pick one tool per real bottleneck — fit beats feature lists.' },
          { label: 'Run 2-week trials', description: 'Test each candidate on real work before committing to a subscription.' },
          { label: 'Standardize your stack', description: 'Keep what saves time, cut the rest, and master the survivors.' },
        ],
      },
      {
        type: 'ratings',
        heading: 'Tool Categories by ROI',
        items: [
          { label: 'Writing & communication', score: 9, max: 10, note: 'Typically saves 3–5 hrs/week — the highest-ROI category.' },
          { label: 'Research & learning', score: 9, max: 10, note: 'Cuts research time dramatically with sourced answers.' },
          { label: 'Coding assistance', score: 8, max: 10, note: 'Saves hours for anyone who writes code or scripts.' },
          { label: 'Meeting productivity', score: 8, max: 10, note: 'Frees attention in meetings and saves note-taking time.' },
          { label: 'Automation', score: 8, max: 10, note: 'High payoff once set up, on repetitive workflows.' },
          { label: 'Image & design', score: 7, max: 10, note: 'Big saver for visual roles, less so otherwise.' },
        ],
      },
      {
        type: 'callout',
        style: 'tip',
        text: 'The $50/month stack that replaces $500/month of software: one assistant (ChatGPT or Claude, $20), Perplexity for research ($20), and a meeting + presentation tool on free tiers. For most knowledge workers this trio covers drafting, research, and synthesis — the bulk of the day.',
      },
      {
        type: 'bullets',
        heading: 'Stack Management Rules',
        bullets: [
          'Resist tool sprawl — each new tool adds cost and cognitive load.',
          'Master one primary assistant deeply before adding specialists.',
          'Build a personal prompt library you reuse and refine over time.',
          'Review the stack quarterly and drop anything you no longer use.',
          'Prefer paid plans with data controls for anything work-related.',
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // PLAYBOOKS (2)
  // ─────────────────────────────────────────────────────────────
  'ai-for-sales-playbook': {
    title: 'AI for Sales: The Complete Playbook',
    subtitle: "How modern sales teams use AI to prospect faster, personalise at scale, close more deals, and build a pipeline that doesn't rely on heroics.",
    category: 'Playbooks',
    sections: [
      {
        type: 'callout',
        text: 'Sales teams using AI consistently outperform peers by 35% on quota attainment. This playbook shows you exactly how — from first touch to closed-won.',
        style: 'info',
      },
      {
        type: 'table',
        heading: 'The AI Sales Stack',
        columns: ['Category', 'Top Tools', 'Primary Use', 'ROI Impact'],
        rows: [
          ['Prospecting', 'Apollo, Clay, LinkedIn Sales Nav', 'Build targeted account and contact lists with AI scoring', 'Reduces list-building from days to hours'],
          ['Outreach', 'Outreach, Salesloft, Instantly', 'AI-personalised sequences and send-time optimisation', 'Improves reply rates 2-3x vs manual outreach'],
          ['Research', 'Perplexity, Gong, Chorus', 'Real-time account research and conversation intelligence', 'Meeting prep in 5 min instead of 30 min'],
          ['Personalisation', 'Lavender, Regie.ai, Copy.ai', 'Email grading, AI drafts, and personalisation at scale', '2-3x improvement in email reply rates'],
          ['CRM Automation', 'Salesforce Einstein, HubSpot AI, Pipedrive AI', 'Auto-logging, deal scoring, next-step suggestions', 'Saves 5 hrs/rep/week on data entry'],
          ['Forecasting', 'Clari, Aviso, People.ai', 'ML-based pipeline prediction and deal risk scoring', '+40% forecast accuracy vs gut-feel models'],
          ['Competitive Intel', 'Klue, Crayon, Battlecards AI', 'Real-time competitor monitoring and battle card updates', 'Reduces competitive loss rate by 15-20%'],
          ['Coaching', 'Gong, Chorus, Allego', 'Call recording, AI analysis, and rep coaching at scale', 'Surfaces coachable moments without manager listening to every call'],
        ],
      },
      {
        type: 'flow',
        heading: 'The AI-Powered Sales Funnel',
        steps: [
          { label: 'Identify', description: 'AI scores and ranks target accounts by fit, intent signals, and buying readiness — no more spray-and-pray list building.' },
          { label: 'Engage', description: 'AI drafts personalised first touch messages referencing specific triggers: funding, job changes, news, tech stack.' },
          { label: 'Qualify', description: 'AI flags intent signals and calculates a fit score based on firmographic data, engagement history, and behavioural signals.' },
          { label: 'Research', description: 'AI builds a complete meeting brief in 2 minutes: company snapshot, stakeholder priorities, recent news, and tailored talk tracks.' },
          { label: 'Demo', description: 'AI suggests talk tracks based on account profile, surfaces likely objections, and recommends relevant case studies in real time.' },
          { label: 'Close', description: 'AI drafts proposal, monitors for deal risk signals (email silence, missed follow-ups), and flags stalled deals before they die.' },
          { label: 'Expand', description: 'AI identifies upsell signals in product usage data and customer support tickets — serving expansion plays before the QBR.' },
        ],
      },
      {
        type: 'table',
        heading: 'Prospecting at Scale',
        columns: ['Method', 'AI Tool', 'Time Saved', 'What to Prompt'],
        rows: [
          ['Ideal Customer Profile build', 'ChatGPT / Claude', '3 hrs → 20 min', '"Define my ICP for [product] in [market] — include company size, industry, tech stack, and 3 key pain points."'],
          ['Account list building', 'Apollo / Clay', '1 day → 1 hr', 'Filter by tech stack + headcount + funding stage; AI ranks by fit score automatically.'],
          ['Intent data enrichment', '6sense / Bombora', 'Manual → automated', 'Auto-flag accounts spiking on category keywords; pipe directly into Outreach sequences.'],
          ['LinkedIn sourcing', 'Sales Nav + AI', '2 hrs/day → 30 min', 'Boolean search + AI-drafted InMail referencing specific profile detail in first sentence.'],
          ['Trigger-based outreach', 'Clay', 'Reactive → proactive', 'Set triggers for job change, funding round, leadership hire, or news mention — auto-enroll in sequence.'],
          ['Company research', 'Perplexity', '30 min/account → 5 min', '"Summarise [company] for a sales call: business model, recent news, growth signals, and likely priorities."'],
        ],
      },
      {
        type: 'grid',
        heading: 'Lead Scoring Signals',
        cells: [
          { label: 'Intent Signals', value: 'Website visits, content downloads, ad clicks, review site research, and keyword search spikes on G2 / Capterra.' },
          { label: 'Firmographic Fit', value: 'Company size, industry, growth stage, annual revenue, and geographic footprint vs your ICP definition.' },
          { label: 'Tech Stack Match', value: 'Uses complementary tools (strong buy signal) or direct competitors (displacement opportunity) — sourced via BuiltWith or G2.' },
          { label: 'Engagement History', value: 'Email open and reply rate, demo requests, content downloads, event attendance, and prior CRM touches.' },
          { label: 'Buying Committee', value: 'Decision-maker identified and mapped, economic buyer engaged, champion inside the account confirmed active.' },
          { label: 'Timing Indicators', value: 'Fiscal year-end approaching, recent funding round closed, rapid headcount growth, or key executive change.' },
        ],
      },
      {
        type: 'table',
        heading: 'Personalisation at Scale',
        columns: ['Signal', 'Where to Find It', 'How to Use It', 'AI Tool'],
        rows: [
          ['Recent company news', 'Google Alerts, Perplexity', 'Reference in email opener: "I saw you just announced X — congrats. That\'s why I\'m reaching out..."', 'Perplexity + Clay'],
          ['Job postings', 'LinkedIn', 'Infer pain point from role they\'re hiring: a "Head of Data Quality" post signals a data infrastructure problem.', 'Clay + ChatGPT'],
          ['Funding announcement', 'Crunchbase, TechCrunch', 'Tie product to growth initiative: "You just raised a Series B — teams at this stage typically need to scale X."', 'Clay trigger'],
          ['Tech stack', 'BuiltWith, G2', 'Show integration story or displacement narrative based on what they already use.', 'Apollo / Clay enrichment'],
          ['Shared connection', 'LinkedIn 2nd degree', 'Warm intro reference: "I noticed we\'re both connected to [name] at [company]..."', 'Sales Nav'],
          ['Executive quote', 'Company blog, earnings call, press release', 'Personalise value prop: "In your Q3 earnings call you mentioned [priority] — here\'s how we help..."', 'Perplexity + GPT'],
        ],
      },
      {
        type: 'flow',
        heading: '5-Step Meeting Prep (in 10 minutes with AI)',
        steps: [
          { label: 'Company snapshot', description: '"Summarise [company] including recent news, revenue, business model, and key strategic initiatives in 5 bullets."' },
          { label: 'Stakeholder research', description: '"Find the likely priorities and concerns for a [title] at a [company type] in [industry] right now."' },
          { label: 'Tailored agenda', description: '"Build a 45-minute discovery call agenda for selling [product] to a [persona] at a [company stage] company."' },
          { label: 'Objection prep', description: '"List the 5 most likely objections to [product] for this type of buyer and the strongest response to each."' },
          { label: 'Strong opener', description: '"Write a 2-sentence meeting opener that references [specific company context] and sets a collaborative tone."' },
        ],
      },
      {
        type: 'table',
        heading: 'Objection Handling Framework',
        columns: ['Objection', 'Root Cause', 'AI-Assisted Response', 'Proof Point to Pull'],
        rows: [
          ['"We\'re happy with our current solution"', 'Status quo bias; cost of switching feels too high', '"What would need to be true for you to consider switching? What\'s the one thing your current solution can\'t do?"', 'Competitor displacement case study from similar company'],
          ['"Too expensive"', 'Budget constraint or ROI not clear', 'Reframe to cost of inaction: "What\'s the cost of [problem] per quarter? Our typical customer sees payback in 4 months."', 'Customer ROI story with hard numbers'],
          ['"Not the right time"', 'Competing priorities; no internal urgency', '"I understand — what\'s taking priority right now? Many of our customers said the same thing before [business event] changed things."', 'Urgency framework tied to their fiscal calendar'],
          ['"Need to think about it"', 'Unclear decision process; missing stakeholders', '"Totally fair. What would make this an easy yes? And who else should be part of the next conversation?"', 'Multi-threading play to engage economic buyer'],
          ['"IT / Legal won\'t approve it"', 'Procurement friction; unknown compliance requirements', '"We have a security package that addresses the most common IT requirements. Can I send it directly to your IT lead?"', 'Enterprise security one-pager + pilot agreement template'],
          ['"We can build this ourselves"', 'Engineering bandwidth is underestimated', '"Teams often go that route — here\'s a TCO comparison including eng time, maintenance, and opportunity cost."', 'Build vs buy calculator with real time/cost data'],
        ],
      },
      {
        type: 'table',
        heading: 'AI-Enhanced Pipeline Management',
        columns: ['Metric', 'Manual Approach', 'With AI', '% Improvement'],
        rows: [
          ['Forecast accuracy', 'Gut feel + spreadsheet updated weekly', 'ML model running on CRM activity signals, email patterns, and engagement data', '+40% vs human forecast'],
          ['Deal risk detection', 'Weekly pipeline review in team meeting', 'Real-time flag when engagement drops, email reply rate falls, or key stakeholder goes dark', 'Catches 80% of at-risk deals 30 days early'],
          ['Next-step compliance', 'Rep discipline; manager nags in 1:1s', 'Auto-prompt after every call: "No next step logged — add one now or this deal loses priority"', '+60% next-step rate logged in CRM'],
          ['Winning activity patterns', 'Manager observes top reps and tries to coach others', 'Gong / Chorus surface which talk tracks, questions, and follow-up cadences win more deals', 'Replicates top rep behaviour across the team'],
          ['Pipeline coverage', 'Manual calculation before each forecast call', 'Auto-updated with AI-scored probability; alerts when coverage drops below 3x', 'Always-on 3x pipeline visibility'],
          ['Time-to-close prediction', 'Estimated manually by rep based on feel', 'AI predicts by deal type, size, and buyer seniority based on historical patterns', '±3 day accuracy vs 2-week human estimate'],
        ],
      },
      {
        type: 'flow',
        heading: 'CRM Automation Triggers',
        steps: [
          { label: 'Call Completed', description: 'AI transcribes, summarises key points, extracts action items, and auto-logs everything to CRM — rep touches nothing.' },
          { label: 'Email Sent', description: 'AI tracks open and click events; flags no-response after 48 hours and suggests follow-up message.' },
          { label: 'Deal Stage Advanced', description: 'AI drafts the next follow-up sequence appropriate for the new stage and suggests internal stakeholders to loop in.' },
          { label: 'Champion Identified', description: 'AI builds a multi-thread map: who else in the account should be engaged and what message is right for each role.' },
          { label: 'Risk Signal Detected', description: 'AI alerts rep and manager with a specific suggested action: "No email reply in 12 days — send a breakup email or call."' },
          { label: 'Contract Sent', description: 'AI monitors for stall (contract opened but not signed after 3 days) and prompts a check-in call with a suggested script.' },
        ],
      },
      {
        type: 'table',
        heading: 'Competitive Intelligence System',
        columns: ['Intel Type', 'AI Method', 'Tool', 'Update Frequency'],
        rows: [
          ['Win / loss patterns', 'Analyse closed-lost reasons in CRM + call transcripts; categorise by competitor and loss reason', 'Gong + ChatGPT', 'Weekly'],
          ['Competitor positioning changes', 'Monitor their website, job posts, and press releases for messaging shifts', 'Crayon / Klue', 'Daily'],
          ['Pricing intel', 'Track competitor pricing on review sites, G2, Capterra, and LinkedIn posts from their customers', 'Klue + Perplexity', 'Monthly'],
          ['Feature gap tracking', 'Aggregate customer feature requests and tag to competitor capabilities', 'Gong + Notion AI', 'Each sprint'],
          ['Battle card freshness', 'Score each battle card against recent wins/losses and flag stale claims', 'Klue AI', 'Quarterly'],
          ['Rep awareness', 'Quiz reps on competitive positioning; track pass rates and knowledge gaps', 'Allego', 'Monthly'],
        ],
      },
      {
        type: 'ratings',
        heading: 'Areas Where AI Has the Biggest Sales Impact',
        items: [
          { label: 'Prospecting speed', score: 9, max: 10, note: 'AI reduces list-building from days to hours; Apollo + Clay transforms what one SDR can cover.' },
          { label: 'Email personalisation', score: 8, max: 10, note: 'Lavender and Regie.ai improve reply rates 2-3x by grading and rewriting emails before send.' },
          { label: 'Meeting prep quality', score: 9, max: 10, note: '10-minute AI brief beats 1-hour manual research and produces more tailored, relevant meetings.' },
          { label: 'Forecast accuracy', score: 7, max: 10, note: 'Clari and Aviso cut sandbagging and happy-ears forecasts; still needs clean CRM data to work.' },
          { label: 'Coaching at scale', score: 8, max: 10, note: 'Gong surfaces coachable moments from every call without the manager needing to listen to recordings.' },
          { label: 'CRM hygiene', score: 9, max: 10, note: 'Auto-logging eliminates the #1 rep complaint and gives managers clean data for AI forecasting.' },
        ],
      },
      {
        type: 'table',
        heading: 'Email Sequence Design with AI',
        columns: ['Stage', 'Trigger', 'Message Goal', 'AI Prompt to Use'],
        rows: [
          ['Day 1 — Cold open', 'New lead enters sequence', 'Pattern-interrupt opener with specific personalisation', '"Write a 3-sentence cold email to [name] at [company] referencing [trigger]. Under 100 words. Soft CTA."'],
          ['Day 3 — Value add', 'No reply to Day 1', 'Add value — share a relevant insight or resource', '"Write a 2-sentence follow-up offering [insight] relevant to [industry]. No ask."'],
          ['Day 7 — Challenge', 'No reply to Day 3', 'Challenge the status quo or share a relevant case study', '"Write a challenge email that questions their current approach to [problem]. 3 sentences."'],
          ['Day 14 — Breakup', 'No reply to Day 7', 'Low-commitment CTA that leaves the door open', '"Write a breakup email for a sales sequence that closes with \'happy to reconnect whenever the timing\'s better.\'"'],
          ['Inbound — Fast response', 'Form fill or content download', 'Immediate personalised response in under 5 minutes', '"Write a same-day response to [name] who downloaded [asset]. Reference the asset, ask one qualifying question."'],
          ['Post-demo — Next step', 'Demo completed', 'Confirm next step and recap key points while memory is fresh', '"Write a post-demo recap for [company] referencing [2-3 specific things discussed]. Confirm [next step] at the end."'],
        ],
      },
      {
        type: 'grid',
        heading: 'Forecasting Methods Ranked by AI Enhancement',
        cells: [
          { label: 'Gut Feel', value: 'Low AI value — AI cannot fix opinion-based forecasting. Garbage in, garbage out. Fix the process first.' },
          { label: 'Activity-Based', value: 'Medium AI value — AI tracks activities accurately but cannot predict intent from volume alone.' },
          { label: 'Engagement-Based', value: 'High AI value — AI reads all email, call, and content engagement signals to score deal health in real time.' },
          { label: 'Predictive ML', value: 'Highest AI value — Clari and Aviso models consistently outperform human forecasts by 40% when CRM data is clean.' },
        ],
      },
      {
        type: 'table',
        heading: '90-Day AI Sales Implementation Roadmap',
        columns: ['Phase', 'Weeks', 'Key Actions', 'Success Metric'],
        rows: [
          ['Foundation', '1–4', 'Audit CRM data quality; deploy Gong/Chorus; set up intent data (6sense); define ICP in writing', '>90% CRM field completion'],
          ['Automation', '5–8', 'Launch AI outreach sequences; activate lead scoring; build battle cards; A/B test AI vs manual emails', '20% more meetings/rep/week'],
          ['Optimisation', '9–12', 'Weekly Gong coaching sessions; AI forecast live in Clari; win/loss tracking by competitor', '15% quota attainment lift'],
        ],
      },
      {
        type: 'table',
        heading: 'ROI Calculator — What AI Saves Your Team',
        columns: ['Activity', 'Hours/Week/Rep', 'With AI', 'Annual Saving (@ $80/hr)'],
        rows: [
          ['CRM data entry', '5 hrs', '1 hr', '$16,640/rep/year'],
          ['Prospect research', '8 hrs', '2 hrs', '$24,960/rep/year'],
          ['Email drafting', '4 hrs', '1 hr', '$12,480/rep/year'],
          ['Meeting prep', '3 hrs', '0.5 hrs', '$10,400/rep/year'],
          ['Reporting + forecasting', '2 hrs', '0.25 hrs', '$7,280/rep/year'],
          ['Total', '22 hrs/week', '4.75 hrs/week', '$71,760/rep/year saved'],
        ],
      },
      {
        type: 'bullets',
        heading: 'Top AI Sales Tools at a Glance',
        bullets: [
          'Apollo ($49/mo) — Prospecting: build targeted account lists and run AI-scored outreach sequences at volume.',
          'Clay ($149/mo) — Enrichment: hyper-personalised outreach using 50+ data sources combined with AI writing.',
          'Outreach ($100+/mo) — Sequences: enterprise sales engagement with AI-suggested next actions and reply detection.',
          'Gong ($1,200/seat/yr) — Intelligence: call recording, deal risk scoring, and rep coaching from conversation data.',
          'Clari ($150+/mo) — Forecasting: ML-powered pipeline prediction with 40% better accuracy than human gut-feel.',
          'Lavender ($29/mo) — Email: real-time email grading and AI rewrites to improve reply rates before you hit send.',
        ],
      },
      {
        type: 'callout',
        text: 'AI will not fix a broken sales process — it will accelerate it, good or bad. Before deploying AI tools, audit your ICP definition, your messaging, and your qualification criteria. AI amplifies whatever is already there.',
        style: 'warning',
      },
      {
        type: 'bullets',
        heading: 'AI Sales Ethics & Best Practices',
        bullets: [
          'Never use AI to fabricate personalisation — fake references to content the prospect did not actually publish erode trust the moment they notice.',
          'Disclose AI-assisted outreach where required by law or by your company\'s communication policy.',
          'Verify all AI-generated statistics, case studies, and proof points before including them in proposals or presentations.',
          'Use AI to enhance human connection — not replace it. The relationship is still the moat that competitors cannot easily replicate.',
          'Audit your AI tools for data privacy compliance (GDPR, CCPA) before feeding in customer or prospect data.',
          'Do not let AI-generated volume erode your brand reputation — high-quality, relevant outreach still beats high-volume noise.',
          'Train reps on what AI can and cannot do so they do not over-rely on AI-generated content in live calls where improvisation is required.',
        ],
      },
      {
        type: 'table',
        heading: 'Top 10 AI Prompts for Sales Reps',
        columns: ['Use Case', 'Prompt (fill in brackets)', 'What You Get'],
        rows: [
          ['ICP research', 'Describe the ICP for [product] in [market]: company size, industry, role, 3 pain points.', 'ICP with segmentation + messaging hooks'],
          ['Account research', 'Summarise [company] for a sales call: news, business model, growth signals, priorities.', '5-bullet call brief in under 5 min'],
          ['Cold email', 'Write a cold email to a [title] at [company] referencing [trigger]. Under 100 words, soft CTA.', 'Personalised opener + clear next step'],
          ['Objection response', 'Prospect said "[objection]". Write 3 responses: empathetic, direct, and reframe.', '3 response options by tone'],
          ['Proposal outline', 'Create a proposal for [company] wanting [goal]: problem, solution, ROI, timeline, next steps.', 'Structured proposal skeleton'],
          ['Discovery questions', 'Write 8 discovery questions for a [persona] at a [company type] evaluating [category].', 'Question bank: pain, impact, timeline, decision'],
          ['Follow-up email', 'Write a post-demo recap for [name] at [company]. Reference [2 topics discussed]. Confirm [next step].', 'Recap email with action items'],
          ['Competitive compare', 'Compare [our product] vs [competitor] for a [buyer type]. Be objective.', 'Battle brief for coaching + live calls'],
          ['Deal risk', 'Here are my deal notes: [paste]. Identify top 3 risks and what I should do about each.', 'Risk list with recommended actions'],
          ['Call coaching', 'Here is a call transcript: [paste]. 3 things done well + 3 specific improvements with examples.', 'Coaching notes with evidence'],
        ],
      },
    ],
  },

  'ai-for-recruiting-playbook': {
    title: 'AI for Recruiting: The Complete Playbook',
    subtitle: 'How talent acquisition teams use AI to source faster, screen smarter, reduce bias, and hire the people who actually perform — without losing the human touch.',
    category: 'Playbooks',
    sections: [
      {
        type: 'callout',
        text: '65% of talent acquisition leaders are already using AI in their hiring process. Teams that use AI strategically cut time-to-hire by 40% and improve quality-of-hire scores by 25%. This playbook shows you exactly how.',
        style: 'info',
      },
      {
        type: 'table',
        heading: 'The Recruiting AI Landscape',
        columns: ['Category', 'Top Tools', 'Best For', 'Pricing'],
        rows: [
          ['Sourcing', 'LinkedIn Recruiter + AI, Gem, hireEZ', 'Volume sourcing and passive candidate identification from 800M+ profiles', '$100–500/mo'],
          ['Screening', 'Ashby AI, Greenhouse AI, Lever', 'Resume screening, structured scoring, and candidate ranking against criteria', '$200–800/mo'],
          ['Outreach', 'Beamery, Phenom, Paradox', 'Personalised candidate outreach at scale with AI-written messages', '$300–1,000/mo'],
          ['Interview Scheduling', 'Calendly AI, Paradox Olivia, Clara', 'Eliminating scheduling back-and-forth with conversational AI booking bots', '$15–200/mo'],
          ['Assessment', 'Pymetrics, HireVue, Codility', 'Skills and cognitive assessments with AI scoring and bias reduction', '$50–500/mo'],
          ['Reference Checks', 'Checkr AI, SkillSurvey', 'Async structured reference collection that gets more honest data than phone calls', '$5–20/check'],
          ['Analytics', 'Visier, Tableau + AI, Eightfold', 'Workforce planning, hiring funnel analytics, and quality-of-hire reporting', '$500+/mo'],
          ['Job Descriptions', 'Textio, Ongig', 'Bias-free and SEO-optimised job description writing with predictive performance scores', '$100–500/mo'],
        ],
      },
      {
        type: 'flow',
        heading: 'The AI-Powered Recruiting Funnel',
        steps: [
          { label: 'Define', description: 'AI analyses historical hire performance data to sharpen the role profile — identifying which skills, backgrounds, and traits predict success in this specific role.' },
          { label: 'Source', description: 'AI scans databases, LinkedIn, GitHub, and alumni networks to build a ranked candidate list weighted by fit score and likelihood to be open to a move.' },
          { label: 'Engage', description: 'AI drafts personalised outreach messages referencing each candidate\'s specific experience; a chatbot handles first-touch FAQs around comp, role, and team.' },
          { label: 'Screen', description: 'AI scores resumes against structured criteria defined in intake; flags green lights (top 20%) and red flags; human reviews borderline cases only.' },
          { label: 'Interview', description: 'AI generates tailored question sets based on role competencies and candidate background; scheduling bot eliminates back-and-forth calendar coordination.' },
          { label: 'Assess', description: 'AI scores structured interview responses against a rubric; reference check AI collects structured peer feedback 3x faster than phone-based checks.' },
          { label: 'Decide & Onboard', description: 'AI drafts the offer letter with comp benchmarked to market; an onboarding bot delivers personalised Day 1–90 content and checks in at each milestone.' },
        ],
      },
      {
        type: 'table',
        heading: 'Job Description Optimisation with AI',
        columns: ['Element', 'Without AI', 'With AI', 'Impact'],
        rows: [
          ['Job title', 'Generic "Senior Manager, Operations"', 'SEO-optimised title matching how candidates actually search (e.g., "Head of Revenue Operations")', '+30% apply rate from organic search'],
          ['Requirements list', 'Laundry list of 15 requirements; many nice-to-haves treated as must-haves', 'AI trims to 6 true must-haves; nice-to-haves listed separately as growth areas', '+40% diverse applicant pool; fewer overqualified candidates who self-select out'],
          ['Language bias', 'Male-coded language: "rockstar", "dominate", "aggressive growth"', 'Textio flags and replaces biased words with neutral, high-performing language', '+22% female applicants on average in A/B tests'],
          ['Salary range', 'Often omitted to preserve negotiating leverage', 'AI benchmarks comp range vs market (Levels.fyi, Radford, Glassdoor) and recommends disclosure', '+35% application completion rate where legally required or voluntarily included'],
          ['Role scope', 'Vague "responsible for X and Y" format', 'AI rewrites using outcome-oriented format: "In 90 days, you will have delivered X and reduced Y by Z%"', 'Higher quality applicants who self-qualify accurately against real outcomes'],
          ['Culture signals', 'Generic "fast-paced environment, passionate team"', 'Specific culture signals matched to what your target persona values (autonomy, craft, scale, mission)', 'Better culture fit hires; lower 90-day attrition'],
        ],
      },
      {
        type: 'bullets',
        heading: 'Sourcing at Scale — 8 AI Tactics',
        bullets: [
          'Build a Boolean search string with AI: "Create a LinkedIn Boolean search for a [role] with [skills A, B, C] at [company type] in [location] — exclude agencies."',
          'Use hireEZ or Gem to surface passive candidates who match the profile of your top 10% of performers, not just those who match a job description.',
          'Set up trigger-based sourcing: new grad from a target school, recently promoted, or just changed companies — all high-intent signals worth engaging now.',
          'Mine your own ATS before going external — most companies have 60–70% of their next hire already in their database from previous applicants.',
          'Ask ChatGPT to identify non-obvious talent pools: "What adjacent roles produce great [target role] candidates? Where do people learn the skills this role needs?"',
          'Use Perplexity to research talent density by geography before making a location decision for a new role or office.',
          'Build talent community content with AI — monthly newsletters, event invites, job alerts — to warm passive candidates over 6–12 months before you need them.',
          'Score your sourcing channels quarterly using AI: which sources produce the highest-performing hires at 6 months? Shift budget toward the winners.',
        ],
      },
      {
        type: 'callout',
        text: 'The mirror hire trap: AI trained on your historical hires will replicate your existing team\'s profile. Actively audit your AI sourcing criteria to include candidates from non-traditional backgrounds, different schools, and adjacent industries. Diversity of thought requires deliberate configuration — it will not happen by default.',
        style: 'tip',
      },
      {
        type: 'table',
        heading: 'Candidate Outreach — Channel Performance',
        columns: ['Channel', 'AI Tool', 'Response Rate Lift', 'Best Practice'],
        rows: [
          ['LinkedIn InMail', 'LinkedIn AI + manual personalisation layer', '3–5x vs generic InMail templates', 'Reference a specific piece of their work, a mutual connection, or a recent career milestone in the first sentence.'],
          ['Email', 'Beamery / Phenom', '2–3x vs generic templates', 'Keep under 100 words; lead with what is interesting about the opportunity for them, not a company pitch.'],
          ['Text / SMS', 'Paradox Olivia', '5–8x vs email for scheduling confirmations', 'Use only after initial consent; maintain conversational tone; never use for cold outreach.'],
          ['Referral ask (internal)', 'AI drafts referral ask to internal employees based on role and network', '2x referral volume vs manual ask', '"Write a referral ask for [role] I can send to my team in Slack — make it specific about what we\'re looking for."'],
          ['Talent community nurture', 'Automated content drip with AI-written content', 'Passive → active conversion at 3x the rate', 'Monthly touch with relevant content (industry news, company updates, open roles) — not just job posts.'],
          ['Event invite', 'AI-personalised invite based on candidate background and interests', '+40% event attendance vs generic blast', 'Match the event topic to the candidate\'s stated career interests or current skills gap.'],
        ],
      },
      {
        type: 'grid',
        heading: 'AI Screening Dimensions — What to Score',
        cells: [
          { label: 'Skills Match', value: 'Hard skills vs role requirements scored against structured criteria defined in the intake meeting — not the job description (which is often aspirational).' },
          { label: 'Career Trajectory', value: 'Progression speed, scope growth across roles, and pattern of promotion — does this person level up consistently or plateau?' },
          { label: 'Communication Quality', value: 'Clarity and precision in cover letter or email — a strong proxy for how this person will communicate with customers, managers, and peers.' },
          { label: 'Cultural Indicators', value: 'Values alignment signals from public writing, volunteering, side projects, and the questions they ask in early conversations.' },
          { label: 'Red Flag Detection', value: 'Unexplained gaps, high-frequency job changes without scope growth, inconsistent dates between application and LinkedIn, and inflated titles.' },
          { label: 'Potential Signals', value: 'Learning velocity (certifications, new skills added), scope beyond formal title (led initiatives, built things outside their job), and initiative taken in previous roles.' },
        ],
      },
      {
        type: 'table',
        heading: 'Interview Question Generation by Role Type',
        columns: ['Role Type', 'Question Category', 'AI Prompt', 'Evaluation Goal'],
        rows: [
          ['Leadership role', 'Strategic thinking + org design', '"Generate 5 questions to assess strategic thinking for a VP of [function] at a [company stage] company."', 'Evaluates systems thinking, long-range planning, and ability to make trade-offs at scale'],
          ['IC / Maker role', 'Technical craft + problem solving', '"Write 4 technical scenario questions for a senior [role] in [domain] working on [type of problem]."', 'Tests depth of expertise, problem-solving approach, and intellectual honesty about limits'],
          ['Sales role', 'Resilience + customer empathy', '"Create 5 behavioural questions to assess sales resilience and customer focus for a [role] selling [product type]."', 'Evaluates grit under pressure, empathy, deal instinct, and handling of rejection'],
          ['Operations role', 'Process design + prioritisation', '"Write 4 questions to assess operational rigour for a [role] managing [scope] across [function]."', 'Tests structured thinking, prioritisation under constraint, and cross-functional influence'],
          ['Customer-facing role', 'EQ + communication under pressure', '"Generate 5 questions to evaluate emotional intelligence and communication for a [role] managing [situation type]."', 'Assesses listening quality, de-escalation instinct, and adaptability to different personalities'],
          ['Data role', 'Analytical reasoning + business translation', '"Write 4 case-based questions for a [data/analytics role] working with [stakeholder type] to drive [outcome]."', 'Evaluates analytical rigour, speed of insight generation, and ability to translate data to decisions'],
        ],
      },
      {
        type: 'ratings',
        heading: 'Where AI Has the Biggest Recruiting Impact',
        items: [
          { label: 'Sourcing speed', score: 10, max: 10, note: 'AI reduces time-to-shortlist from weeks to hours; hireEZ and Gem find passive candidates that would take days to find manually.' },
          { label: 'Resume screening consistency', score: 9, max: 10, note: 'Structured AI scoring eliminates reviewer mood bias, Monday-morning effect, and halo bias from brand-name companies.' },
          { label: 'Outreach personalisation', score: 8, max: 10, note: 'AI-personalised messages get 3–5x higher response rates vs templates; still requires a human to review before sending.' },
          { label: 'Interview scheduling', score: 10, max: 10, note: 'Scheduling bots eliminate 80% of back-and-forth emails; Paradox Olivia books interviews in <2 minutes.' },
          { label: 'Reference checking', score: 7, max: 10, note: 'AI-assisted async reference tools (SkillSurvey) get more honest responses than phone calls and complete 3x faster.' },
          { label: 'Onboarding content delivery', score: 8, max: 10, note: 'AI-driven 90-day onboarding plans improve new hire retention by 20% in the first year.' },
        ],
      },
      {
        type: 'flow',
        heading: 'Candidate Experience — 5 AI Touchpoints',
        steps: [
          { label: 'Application submitted', description: 'AI sends an instant, personalised confirmation with specific role details and a realistic timeline — not a generic "we\'ll be in touch" autoresponder.' },
          { label: 'Screening stage', description: 'AI chatbot answers FAQs about the role, team structure, comp range, and hiring process in real time — candidates never wait 3 days for an email reply.' },
          { label: 'Interview scheduled', description: 'AI scheduling bot offers available times, confirms the booking, and automatically sends prep materials, interviewer bios, and logistics details.' },
          { label: 'Post-interview', description: 'AI sends a personalised thank-you and status update within 24 hours — not a form letter, but a message referencing what was discussed.' },
          { label: 'Decision', description: 'AI drafts offer letters with comp, equity, start date, and key benefits highlighted; rejection emails are personalised by role and include genuine encouragement to reapply.' },
        ],
      },
      {
        type: 'table',
        heading: 'Offer Intelligence — Benchmarking with AI',
        columns: ['Factor', 'Data Source', 'AI Use', 'Outcome'],
        rows: [
          ['Base salary', 'Levels.fyi, Glassdoor, Radford, Mercer', 'AI benchmarks by role, level, and geography in 5 minutes and flags if your range is below the 50th percentile', 'Make competitive first offers and reduce negotiation cycles that slow time-to-close'],
          ['Equity structure', 'Carta benchmarks, Blind, internal cap table', 'AI models expected value of equity at multiple exit scenarios so recruiters can explain it clearly on the offer call', 'Candidate-ready equity explanation that turns complexity into a compelling number, not a deterrent'],
          ['Benefits comparison', 'LinkedIn Talent Insights, competitor career pages', 'AI identifies which benefits matter most to your target persona by role type and career stage', 'Highlight the benefits that differentiate you — not the ones everyone has'],
          ['Time-to-offer', 'Internal ATS data', 'AI flags candidates at risk of accepting another offer if the process exceeds day 7 post-final-interview', 'Reduce offer acceptance lag from an average of 12 days to 5 days'],
          ['Comp banding', 'Internal pay equity analysis + market data', 'AI audits proposed offer for compression vs existing team and equity gaps by gender or tenure', 'Stay compliant, fair, and avoid the internal resentment that follows when pay gaps are discovered later'],
        ],
      },
      {
        type: 'flow',
        heading: 'AI-Powered Onboarding — 90 Days',
        steps: [
          { label: 'Day 1', description: 'AI delivers a personalised welcome pack: org chart with key contacts highlighted, first-week agenda, tools access checklist, and a curated set of "read this first" documents.' },
          { label: 'Week 1', description: 'AI chatbot answers new hire questions about policies, benefits, processes, and team norms — reducing HR ticket volume by 50% and answering at 2 AM when anxious new hires are reading their handbook.' },
          { label: 'Month 1', description: 'AI sends a structured 30-day pulse survey, surfaces themes and concerns to the manager, and flags flight risks before they become resignation conversations.' },
          { label: 'Month 2', description: 'AI recommends personalised learning resources (courses, internal docs, shadowing opportunities) based on the new hire\'s role and their 30-day feedback themes.' },
          { label: 'Month 3', description: 'AI facilitates the 90-day review with structured reflection prompts, a goal-setting template for the next quarter, and a sentiment check sent to both the hire and their manager.' },
        ],
      },
      {
        type: 'callout',
        text: 'AI bias in hiring is real and legally consequential. The EEOC and EU AI Act both require auditability of AI screening decisions. Before deploying any AI screening tool: (1) run a disparate impact analysis on historical data, (2) ensure human review of all AI-rejected candidates, (3) document your criteria and weighting, (4) audit quarterly for drift.',
        style: 'warning',
      },
      {
        type: 'table',
        heading: 'Employer Brand & Candidate Marketing with AI',
        columns: ['Channel', 'AI Use', 'Tool', 'Content Type'],
        rows: [
          ['LinkedIn', 'Draft employee spotlights, culture posts, and job ads; A/B test copy variations to find highest-performing format', 'Taplio + ChatGPT', 'Long-form thought leadership + short-form hooks + job post copy'],
          ['Glassdoor', 'AI analyses reviews to surface recurring themes; draft empathetic response templates for negative reviews', 'ChatGPT + Notion AI', 'Review response scripts + reputation improvement content calendar'],
          ['Career site', 'AI rewrites generic boilerplate into a compelling, specific value proposition; chatbot handles live candidate questions', 'Ongig + Paradox', 'JD copy, team pages, value prop + live chatbot for candidate Q&A'],
          ['Email nurture', 'AI personalises content to candidate background and career stage; optimises send time for each individual', 'Beamery / Phenom', 'Monthly newsletter with industry content + targeted job alerts'],
          ['Events', 'AI generates event landing page copy, speaker bios, and post-event follow-up sequences for each attendee', 'ChatGPT', 'Event pages + personalised follow-up emails + recap content'],
          ['Referral programme', 'AI drafts personalised referral ask messages employees can send to their specific networks via Slack or email', 'Gem + ChatGPT', 'Slack messages + email templates tailored to the specific open role'],
        ],
      },
      {
        type: 'grid',
        heading: 'Recruiter Productivity Stack — 8 Tool Categories',
        cells: [
          { label: 'ATS + AI', value: 'Ashby or Greenhouse — AI built into the core workflow: scoring, scheduling, and communication all in one system.' },
          { label: 'Sourcing', value: 'hireEZ or Gem — finds passive candidates at scale from 800M+ profiles ranked by fit and open-to-move signals.' },
          { label: 'Outreach', value: 'Beamery or Phenom — personalised candidate nurture at scale with AI writing assistance and send-time optimisation.' },
          { label: 'Scheduling', value: 'Paradox Olivia — eliminates 80% of scheduling emails; books interviews conversationally via SMS or chat.' },
          { label: 'JD Writing', value: 'Textio — bias-free, SEO-optimised job descriptions with predictive apply-rate scores before you publish.' },
          { label: 'Interview Prep', value: 'ChatGPT or Claude — custom question sets by role and competency in under 2 minutes per role.' },
          { label: 'Analytics', value: 'Visier or Eightfold — funnel analytics, quality-of-hire tracking, and workforce planning in one platform.' },
          { label: 'Reference Checks', value: 'SkillSurvey — async, structured reference collection that takes 3 minutes to send and returns richer data than phone calls.' },
        ],
      },
      {
        type: 'table',
        heading: 'Recruiting Metrics — AI Baseline vs Enhanced',
        columns: ['KPI', 'Industry Baseline', 'With AI', 'Benchmark Leader'],
        rows: [
          ['Time-to-hire', '42 days', '25 days', '<20 days (tech-forward talent teams)'],
          ['Source-to-screen ratio', '15:1', '8:1', '5:1'],
          ['Offer acceptance rate', '72%', '82%', '90%+'],
          ['Quality-of-hire score', '62 / 100', '74 / 100', '80+ / 100'],
          ['Cost-per-hire', '$4,700', '$2,800', '<$2,000'],
          ['Candidate NPS', '-12', '+28', '+50+'],
          ['Recruiter-to-hire ratio', '1:50 / year', '1:80 / year', '1:120 / year (with full AI stack)'],
        ],
      },
      {
        type: 'table',
        heading: '90-Day AI Recruiting Implementation Roadmap',
        columns: ['Phase', 'Weeks', 'Key Actions', 'Success Metric'],
        rows: [
          ['Audit & Foundation', '1–4', 'Audit ATS data; select AI sourcing + screening tools; run bias audit; train team on prompting', '>80% ATS field completion; bias audit done'],
          ['Automate & Scale', '5–8', 'Launch AI outreach (Beamery/Phenom); activate AI resume scoring; deploy scheduling bot (Paradox)', '30% faster time-to-screen; 50% fewer scheduling emails'],
          ['Optimise & Measure', '9–12', 'Quality-of-hire analysis on recent hires; candidate NPS survey; optimise AI scoring weights', '20% quality-of-hire improvement; positive cNPS'],
        ],
      },
      {
        type: 'bullets',
        heading: 'Compliance & Data Privacy in AI Recruiting',
        bullets: [
          'GDPR requires candidate consent before processing personal data with AI tools — build a consent mechanism into your application flow before deploying any AI screening.',
          'The EEOC\'s AI hiring guidance requires that employers using AI screening tools can demonstrate non-discrimination — document your criteria and weighting before going live.',
          'The EU AI Act classifies recruitment AI as "high risk" — requires a conformity assessment, detailed logging of decisions, and human oversight of all AI outputs before deployment.',
          'Retain AI screening decisions, criteria, and score outputs for at least 2 years to support any audit, legal challenge, or regulatory inquiry.',
          'Never use AI to screen on protected characteristics — even indirectly through proxies like zip code, school name, graduation year, or membership in certain organisations.',
          'Validate your AI scoring model annually for disparate impact across gender, race, and age — model drift is real and can introduce bias that was not present at launch.',
          'Inform candidates when AI is used in material decisions about their application — this is already required in several US states and is rapidly becoming the global standard.',
        ],
      },
      {
        type: 'table',
        heading: 'Top 10 AI Prompts for Recruiters',
        columns: ['Use Case', 'Prompt (fill in brackets)', 'What You Get'],
        rows: [
          ['Write a JD', 'Write a JD for a [title] at a [company type]. 5 must-haves, 3 nice-to-haves, 90-day outcomes. No gendered language.', 'Ready-to-post JD with inclusive language'],
          ['Boolean string', 'Create a LinkedIn Boolean search for a [role] with [skills A, B, C] at [company types] in [location].', 'Copy-paste Boolean for LinkedIn or hireEZ'],
          ['Outreach InMail', 'Write a 3-sentence InMail for a [role] passive candidate. Reference [specific achievement]. Lead with the opportunity.', 'Personalised InMail under 100 words'],
          ['Interview questions', 'Generate 6 behavioural questions for a [role] focused on [competency]. What does a strong answer look like?', 'Question bank + scoring guide'],
          ['Rejection email', 'Write a rejection email for a [role] candidate at [stage]. Thank sincerely; encourage future applications.', 'Empathetic rejection, brand-safe'],
          ['Offer negotiation', 'Candidate wants [X above budget]. Write 3 responses: counter, repackage differently, hold firm.', '3-option negotiation playbook'],
          ['Sourcing strategy', 'Identify 5 non-obvious talent pools for a [role] in [industry]. Why good? How to find them?', 'Expansion ideas with specific channels'],
          ['Reference questions', 'Write 8 structured reference check questions for a [role] focused on [competencies] with follow-up probes.', 'Reference guide with primary + probes'],
          ['Intake agenda', 'Write an intake meeting agenda for a [role]: must-haves, dealbreakers, first-year success metrics, A-player definition.', 'Agenda that surfaces gaps before sourcing'],
          ['Candidate feedback', 'Write feedback for a candidate strong overall but weak on [topic]. Be specific, encouraging, professional.', 'Feedback that builds goodwill in rejection'],
        ],
      },
    ],
  },
}

export type GuideSlug = keyof typeof GUIDES

export const ALL_SLUGS = Object.keys(GUIDES) as GuideSlug[]
