import type { NextConfig } from "next";

import { buildSecurityHeaders } from "./src/lib/security-headers";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders(isProduction),
      },
    ];
  },
};

export default nextConfig;
