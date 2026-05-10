export type Resource = {
  title: string
  description: string
  category: string
  filename: string   // file must exist in /public/downloads/
  fileSize?: string  // e.g. "1.2 MB" — fill this in manually
}

// ─────────────────────────────────────────────
//  ADD YOUR 1-PAGERS HERE
//  1. Drop the PDF into /public/downloads/
//  2. Add an entry below with the same filename
// ─────────────────────────────────────────────
export const resources: Resource[] = [
  // Example — uncomment and fill in when you have a file:
  // {
  //   title: 'Vibe Coding Cheat Sheet',
  //   description: 'Everything you need to start building AI products without writing code from scratch.',
  //   category: 'Vibe Coding',
  //   filename: 'vibe-coding-cheat-sheet.pdf',
  //   fileSize: '0.8 MB',
  // },
  // {
  //   title: 'Claude Code Quick Reference',
  //   description: 'Key commands, shortcuts, and workflows for Claude Code power users.',
  //   category: 'Claude',
  //   filename: 'claude-code-quick-reference.pdf',
  //   fileSize: '1.1 MB',
  // },
  // {
  //   title: 'Gemini for Business Professionals',
  //   description: 'A practical guide to using Gemini at work — prompts, integrations, and real use cases.',
  //   category: 'AI Models',
  //   filename: 'gemini-for-business.pdf',
  //   fileSize: '0.9 MB',
  // },
]
