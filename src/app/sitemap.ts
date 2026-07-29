import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE } from "@/lib/seo";
import { DISPLAYABLE } from "@/lib/products";
import { BRAND_DIRECTORY, slugify } from "@/lib/brandDirectory";

export const dynamic = "force-dynamic";

const CATEGORIES = ["running", "walking", "sports", "casual", "formal", "orthopedic", "sandals"];
const AUDIENCES = [
  { gender: "men" }, { gender: "women" }, { gender: "kids" }
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/foot-scan`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/match`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/try-on`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/health`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/foot-health`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/brands`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/trends`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/size-chart`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/community`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/data-and-privacy`, changeFrequency: "monthly", priority: 0.5 }
    // /login is deliberately absent: robots.txt disallows it and the page is
    // noindex, so submitting it only earns a "blocked by robots.txt" in Search
    // Console. A sitemap is a list of pages we want indexed, not of pages that
    // exist.
  ];

  const facets: MetadataRoute.Sitemap = [
    ...CATEGORIES.map((c) => ({
      url: `${base}/search?category=${c}`,
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...AUDIENCES.map((a) => ({
      url: `${base}/search?gender=${a.gender}`,
      changeFrequency: "weekly" as const,
      priority: 0.7
    }))
  ];

  let dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const [rows, brands, questions] = await Promise.all([
      prisma.product.findMany({ where: DISPLAYABLE, select: { slug: true, createdAt: true } }),
      Promise.resolve(BRAND_DIRECTORY.map((b) => ({ brand: b.name }))),
      // Community threads are genuine long-tail SEO/AEO surface: real questions
      // in the words shoppers actually use.
      prisma.question.findMany({
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 500
      })
    ]);

    dynamicRoutes = [
      ...rows.map((p) => ({
        url: `${base}/product/${p.slug}`,
        lastModified: p.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.8
      })),
      ...brands.map((b) => ({
        url: `${base}/brands/${slugify(b.brand)}`,
        changeFrequency: "weekly" as const,
        priority: 0.7
      })),
      ...questions.map((q) => ({
        url: `${base}/community/${q.id}`,
        lastModified: q.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.6
      }))
    ];
  } catch {
    // A sitemap is better served incomplete than 500 — crawlers retry.
  }

  return [...staticRoutes, ...facets, ...dynamicRoutes];
}
