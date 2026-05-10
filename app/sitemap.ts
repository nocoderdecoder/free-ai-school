import { MetadataRoute } from 'next'
import { createClient } from 'next-sanity'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await client
    .fetch(`*[_type == "article"] { "slug": slug.current, publishedAt }`)
    .catch(() => [])

  const articleUrls: MetadataRoute.Sitemap = articles.map((a: any) => ({
    url: `https://anshul.ai/learn/${a.slug}`,
    lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [
    { url: 'https://anshul.ai',         lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: 'https://anshul.ai/learn',   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: 'https://anshul.ai/lab',     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://anshul.ai/writing', lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: 'https://anshul.ai/about',     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://anshul.ai/downloads', lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    ...articleUrls,
  ]
}
