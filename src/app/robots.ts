import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

const baseUrl = siteConfig.url.replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/login",
        "/checkout",
        "/dev-login",
        "/api",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
