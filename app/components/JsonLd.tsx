import { publicProfile } from '../lib/publicProfile'

/**
 * Reusable JSON-LD structured data injector. Renders a <script
 * type="application/ld+json"> tag with the given schema.org object. Safe to
 * use in both server and client components without hooks or browser-only APIs.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Anshul Gupta',
    url: 'https://www.anshul.ai',
    image: publicProfile.siteUrl + publicProfile.headshot,
    jobTitle: publicProfile.jobTitle,
    worksFor: {
      '@type': 'Organization',
      name: 'Google',
    },
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: 'Kellogg School of Management',
    },
    description:
      publicProfile.description,
    sameAs: [
      publicProfile.linkedIn,
    ],
  }
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Free AI School',
    url: 'https://www.anshul.ai',
    founder: {
      '@type': 'Person',
      name: 'Anshul Gupta',
    },
    description:
      'Free, practical AI education and tools for business professionals. No engineering background required.',
  }
}

export function articleSchema({
  title,
  description,
  url,
  publishedAt,
  authorName = 'Anshul Gupta',
}: {
  title: string
  description?: string
  url: string
  publishedAt?: string
  authorName?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description || undefined,
    url,
    ...(publishedAt ? { datePublished: publishedAt, dateModified: publishedAt } : {}),
    author: {
      '@type': 'Person',
      name: authorName,
      url: 'https://www.anshul.ai',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Free AI School',
      url: 'https://www.anshul.ai',
    },
  }
}
