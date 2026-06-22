import type { MetadataRoute } from 'next'

// Allow all crawlers, including AI/LLM crawlers (GPTBot, ClaudeBot, etc.) —
// this site is meant to be discoverable and cited by AI assistants and
// search engines alike. See app/sitemap.ts for the generated sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://anshul.ai/sitemap.xml',
  }
}
