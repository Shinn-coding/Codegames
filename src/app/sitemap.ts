import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getCatalogData } from "@/lib/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url.replace(/\/$/, "");
  const lastModified = new Date();

  const { products } = await getCatalogData({
    category: null,
    sort: "featured",
  });

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...entries, ...productEntries];
}
