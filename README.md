# anshul.ai

Personal site and AI learning platform for Anshul Gupta, built as a single Next.js application. It combines a portfolio (About, Work, Projects, Writing, Downloads, Contact) with an AI School (`/learn`) — a library of articles and a set of interactive, Claude-powered tools (`/tools`) — plus daily auto-generated content sections (`/trending`, `/deals-events`).

The project is also a deliberate technical exercise: every page, content pipeline, and tool is built and maintained directly, without a traditional engineering team, as a demonstration of end-to-end product execution.

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **CMS**: Sanity (embedded Studio at `/studio`, schemas in `sanity/schemaTypes`)
- **Database/Auth**: Supabase
- **Email**: Resend (contact form, subscriptions)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`) — powers interactive tools and content generation
- **PDF generation**: `@react-pdf/renderer`
- **Hosting**: Vercel
- **Analytics**: Vercel Analytics

## Architecture

- **CMS-driven content**: Articles, trending posts, and deals/events are Sanity documents, rendered through `next-sanity` + `@portabletext/react`. `app/sitemap.ts` pulls live content from Sanity to build the sitemap.
- **AI-powered tools** (`app/tools/*`, `app/api/tools/*`): Server-side API routes call the Claude API for tools like the AI Learning Compass, AI Readiness assessment, AI Tool Recommender, Competitive Analysis, GTM Playbook, Meeting Brief, and ROI Calculator.
- **PDF generation system** (`app/api/pdf/[slug]/route.tsx`, `app/lib/pdf/`): Dynamically renders tool/article output to downloadable PDFs using React PDF templates.
- **Automated content pipelines** (`scripts/`): Standalone Node scripts (`generate-trending.mjs`, `generate-deals-events.mjs`, `publish-article.mjs`, `publish-claude-module.mjs`) call the Claude API to draft content and publish it directly to Sanity via the write token.
- **Scheduled automation** (`.github/workflows/`): GitHub Actions cron jobs (`daily-trending.yml`, `daily-deals-events.yml`) run the generation scripts daily, fully automating the trending and deals/events sections.

## Running locally

```bash
npm install
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

Requires environment variables for Sanity (project ID/dataset/write token), Supabase, Resend, and `ANTHROPIC_API_KEY` for the AI tools and content scripts to function.
