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

  const dealEvents = await client
    .fetch(`*[_type == "deal-event"] { "slug": slug.current, publishedAt }`)
    .catch(() => [])

  const dealEventUrls: MetadataRoute.Sitemap = dealEvents.map((d: any) => ({
    url: `https://anshul.ai/deals-events/${d.slug}`,
    lastModified: d.publishedAt ? new Date(d.publishedAt) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const trendingArticles = await client
    .fetch(`*[_type == "trending"] { "slug": slug.current, publishedAt }`)
    .catch(() => [])

  const trendingUrls: MetadataRoute.Sitemap = trendingArticles.map((t: any) => ({
    url: `https://anshul.ai/trending/${t.slug}`,
    lastModified: t.publishedAt ? new Date(t.publishedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const posts = await client
    .fetch(`*[_type == "post" && status == "published" && defined(slug.current)] { "slug": slug.current, publishedAt }`)
    .catch(() => [])

  const projects = await client
    .fetch(`*[_type == "project" && defined(slug.current)] { "slug": slug.current, _updatedAt }`)
    .catch(() => [])

  return [
    { url: 'https://anshul.ai',              lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: 'https://anshul.ai/work',         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://anshul.ai/projects',     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://anshul.ai/learn',        lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: 'https://anshul.ai/analysis',     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: 'https://anshul.ai/writing',      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: 'https://anshul.ai/downloads',    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: 'https://anshul.ai/tools',        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://anshul.ai/tools/speaking-speed', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://anshul.ai/tools/gtm-playbook',   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://anshul.ai/tools/ai-readiness',   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://anshul.ai/tools/roi-calculator',  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://anshul.ai/about',        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://anshul.ai/contact',      lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
    ...articleUrls,
    ...dealEventUrls,
    ...trendingUrls,
    ...posts.map((p: any) => ({
      url: `https://anshul.ai/writing/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...projects.map((p: any) => ({
      url: `https://anshul.ai/projects/${p.slug}`,
      lastModified: p._updatedAt ? new Date(p._updatedAt) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
