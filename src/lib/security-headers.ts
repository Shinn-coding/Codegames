export type SecurityHeader = {
  key: string;
  value: string;
};

const BASE_SECURITY_HEADERS: readonly SecurityHeader[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-XSS-Protection", value: "0" },
];

const HSTS_HEADER: SecurityHeader = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
};

export function buildSecurityHeaders(isProduction: boolean): SecurityHeader[] {
  return [
    ...BASE_SECURITY_HEADERS.map((header) => ({ ...header })),
    ...(isProduction ? [{ ...HSTS_HEADER }] : []),
  ];
}

export function buildContentSecurityPolicy(input: {
  nonce: string;
  isDevelopment: boolean;
  upgradeInsecureRequests?: boolean;
}): string {
  const {
    nonce,
    isDevelopment,
    upgradeInsecureRequests = !isDevelopment,
  } = input;
  const connectSources = [
    "'self'",
    "https://blob.vercel-storage.com",
    "https://*.blob.vercel-storage.com",
    ...(isDevelopment ? ["ws:", "wss:"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    // Next.js reads this policy from the request headers and applies the same
    // nonce to its framework and page scripts. Keep the request and response
    // policies identical or the browser will block those scripts.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDevelopment ? " 'unsafe-eval'" : ""
    }`,
    // Tailwind and React can emit style attributes; allowing inline styles
    // does not permit inline scripts or event handlers.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(upgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
