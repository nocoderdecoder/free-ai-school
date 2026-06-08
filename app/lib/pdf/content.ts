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
}

export type GuideSlug = keyof typeof GUIDES

export const ALL_SLUGS = Object.keys(GUIDES) as GuideSlug[]
