import type { MetadataRoute } from "next";
import { getPublishedArticleSlugs, getThreadSlugs } from "@/lib/queries";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Published articles and threads are public, so they belong in the sitemap.
 *  Drafts, /write, /settings and /admin deliberately do not. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articleSlugs, threadSlugs] = await Promise.all([
    getPublishedArticleSlugs(),
    getThreadSlugs(),
  ]);

  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/articles`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/discussions`, changeFrequency: "hourly", priority: 0.9 },
    ...articleSlugs.map((slug) => ({
      url: `${BASE}/articles/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...threadSlugs.map((slug) => ({
      url: `${BASE}/discussions/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
