import { GUIDES, ALL_SLUGS } from '../lib/pdf/content'

export type Resource = {
  title: string
  description: string
  category: string
  filename: string   // this is the slug, e.g. "chatgpt-quick-reference"
  fileSize?: string
}

export const resources: Resource[] = ALL_SLUGS.map(slug => ({
  title: GUIDES[slug].title,
  description: GUIDES[slug].subtitle,
  category: GUIDES[slug].category,
  filename: slug,
  fileSize: 'PDF',
}))
