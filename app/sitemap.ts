import type { MetadataRoute } from "next";
import { createClient } from "next-sanity";
import { guides } from "./lib/portfolio/content";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = [
    "",
    "/work",
    "/projects",
    "/writing",
    "/about",
    "/cv",
    "/contact",
    "/resources",
    "/learn",
    "/tools",
    "/tools/ai-learning-compass",
    "/tools/speaking-speed",
    "/tools/gtm-playbook",
    "/tools/ai-readiness",
    "/tools/roi-calculator",
    "/demos/commercial-analyst",
    "/demos/gtm-activation",
    ...guides.map((g) => `/writing/${g.slug}`),
  ];
  const client = createClient({
    projectId: "8w4exnl4",
    dataset: "production",
    apiVersion: "2024-01-01",
    useCdn: true,
  });
  const docs = await client
    .fetch<
      { _type: string; slug: string; _updatedAt: string }[]
    >('*[_type in ["article","trending","deal-event"] && editorialReviewed == true && defined(slug.current)]{_type,"slug":slug.current,_updatedAt}')
    .catch(() => []);
  const prefix: Record<string, string> = {
    article: "learn",
    trending: "trending",
    "deal-event": "deals-events",
  };
  return [
    ...paths.map((path) => ({
      url: `https://anshul.ai${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...docs.map((d) => ({
      url: `https://anshul.ai/${prefix[d._type]}/${d.slug}`,
      lastModified: new Date(d._updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
