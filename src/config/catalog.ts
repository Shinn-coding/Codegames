export type CatalogProductStatus = "AVAILABLE" | "COMING_SOON";

export type CatalogRelease = {
  version: string;
  date: string;
  title: string;
  notes: string[];
};

export type CatalogSeedProduct = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  stack: string[];
  changelog: CatalogRelease[];
  category: string;
  status: CatalogProductStatus;
  priceIdr: number;
  earlyBirdPriceIdr: number | null;
  earlyBirdEndsAt: string | null;
  licenseType: string;
  version: string;
  coverGradient: string;
  demoUrl: string | null;
  featured: boolean;
  sortOrder: number;
};

const earlyBirdEndsAt = new Date(
  Date.now() + 14 * 24 * 60 * 60 * 1000,
).toISOString();

export const catalogSeedProducts: CatalogSeedProduct[] = [
  {
    slug: "nextjs-saas-starter",
    name: "Next.js SaaS Starter",
    tagline: "The production-ready foundation for your next subscription product.",
    description:
      "Auth, billing, teams, email, and an operator-ready admin surface. Typed end to end, documented, and deliberately boring where it matters.",
    features: [
      "Email/password, Google, and local demo auth",
      "Organizations, team invites, and role checks",
      "Billing-ready subscription boundaries",
      "Transactional email templates",
      "Operator admin surface",
      "Typed environment validation and CI checks",
    ],
    stack: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "PostgreSQL",
      "Prisma 6",
      "Auth.js",
      "Tailwind CSS 4",
    ],
    changelog: [
      {
        version: "1.4.0",
        date: "2026-10-12",
        title: "Team invites and audit trail",
        notes: [
          "Invite flow with expiring tokens",
          "Admin-visible membership audit log",
          "New organization settings screen",
        ],
      },
      {
        version: "1.3.0",
        date: "2026-08-24",
        title: "Billing boundaries",
        notes: [
          "Subscription model and entitlement helpers",
          "Webhook-safe billing state transitions",
          "Mock billing provider for local development",
        ],
      },
      {
        version: "1.2.0",
        date: "2026-07-08",
        title: "Operator polish",
        notes: [
          "Command menu for admin actions",
          "Email template preview route",
          "Improved empty states across the dashboard",
        ],
      },
      {
        version: "1.0.0",
        date: "2026-06-02",
        title: "Initial release",
        notes: [
          "Auth, organizations, roles, and dashboard",
          "Documented setup and deployment path",
        ],
      },
    ],
    category: "SaaS Starter",
    status: "AVAILABLE",
    priceIdr: 1_099_000,
    earlyBirdPriceIdr: null,
    earlyBirdEndsAt: null,
    licenseType: "personal",
    version: "1.4.0",
    coverGradient: "mint",
    demoUrl: null,
    featured: false,
    sortOrder: 1,
  },
  {
    slug: "midtrans-payment-kit",
    name: "Midtrans Payment Kit",
    tagline: "Snap checkout, webhooks, and order state — wired correctly.",
    description:
      "A complete IDR payment flow for Indonesian products: server-side pricing, idempotent webhooks, expiry handling, and a mock provider for local development.",
    features: [
      "Midtrans Snap checkout for IDR",
      "Server-side price resolution",
      "Idempotent webhook handler",
      "Order expiry and retry states",
      "Mock payment provider for local dev",
      "Typed payment state machine",
    ],
    stack: [
      "Next.js 16",
      "TypeScript",
      "Midtrans Snap",
      "PostgreSQL",
      "Prisma 6",
      "Zod",
    ],
    changelog: [
      {
        version: "1.3.0",
        date: "2026-09-18",
        title: "Idempotency hardening",
        notes: [
          "Webhook replay protection",
          "Order state machine tests",
          "Sandbox setup guide",
        ],
      },
      {
        version: "1.2.0",
        date: "2026-08-02",
        title: "Expiry and retries",
        notes: [
          "Expired order cleanup",
          "Retry-safe payment intents",
          "Customer receipt email",
        ],
      },
      {
        version: "1.0.0",
        date: "2026-06-20",
        title: "Initial release",
        notes: [
          "Snap checkout and webhook verification",
          "Mock provider and seeded orders",
        ],
      },
    ],
    category: "Payments",
    status: "AVAILABLE",
    priceIdr: 629_000,
    earlyBirdPriceIdr: null,
    earlyBirdEndsAt: null,
    licenseType: "personal",
    version: "1.3.0",
    coverGradient: "amber",
    demoUrl: null,
    featured: false,
    sortOrder: 2,
  },
  {
    slug: "license-download-kit",
    name: "License & Secure Download Kit",
    tagline: "Issue, verify, and gate downloads without leaking files.",
    description:
      "Hashed license keys, activation limits, short-lived download tokens, and an audit trail. Built for products where the file is the product.",
    features: [
      "Hashed license key issuance",
      "Activation limits per license",
      "Short-lived signed download tokens",
      "Revoke and reissue flows",
      "Download audit trail",
      "Local and S3-compatible storage adapters",
    ],
    stack: [
      "Node.js",
      "TypeScript",
      "Prisma 6",
      "PostgreSQL",
      "HMAC-SHA256",
      "Local storage",
      "S3-compatible storage",
    ],
    changelog: [
      {
        version: "1.2.0",
        date: "2026-10-02",
        title: "Download audit trail",
        notes: [
          "Per-download audit events",
          "Revocation reason codes",
          "Signed URL expiry policy",
        ],
      },
      {
        version: "1.1.0",
        date: "2026-08-16",
        title: "Reissue flow",
        notes: [
          "Lost-license reissue",
          "Activation reset with audit note",
          "Storage adapter contract tests",
        ],
      },
      {
        version: "1.0.0",
        date: "2026-07-12",
        title: "Initial release",
        notes: [
          "License issuance and verification",
          "Private file delivery",
          "Setup and threat-model docs",
        ],
      },
    ],
    category: "Licensing",
    status: "AVAILABLE",
    priceIdr: 799_000,
    earlyBirdPriceIdr: null,
    earlyBirdEndsAt: null,
    licenseType: "personal",
    version: "1.2.0",
    coverGradient: "sky",
    demoUrl: null,
    featured: false,
    sortOrder: 3,
  },
  {
    slug: "ai-agent-starter-kit",
    name: "AI Agent Starter Kit",
    tagline: "A practical agent stack with tools, memory, and evals.",
    description:
      "A grounded starting point for agent products: typed tool calls, retrieval, evaluation harnesses, and guardrails that fail closed.",
    features: [
      "Typed tool-call contracts",
      "Retrieval pipeline with citations",
      "Evaluation harness and fixtures",
      "Guardrails that fail closed",
      "Streaming chat surface",
      "Cost and latency tracing",
    ],
    stack: [
      "Next.js 16",
      "TypeScript",
      "AI SDK",
      "PostgreSQL",
      "pgvector",
      "Zod",
    ],
    changelog: [
      {
        version: "0.9.0",
        date: "2026-10-14",
        title: "Private beta",
        notes: [
          "Tool registry and typed schemas",
          "Retrieval eval fixtures",
          "Streaming UI shell",
        ],
      },
      {
        version: "0.8.0",
        date: "2026-09-22",
        title: "Guardrail pass",
        notes: [
          "Fail-closed tool policy",
          "Prompt-injection test suite",
          "Trace viewer",
        ],
      },
      {
        version: "0.7.0",
        date: "2026-08-30",
        title: "Internal preview",
        notes: ["Initial agent loop", "Memory adapter", "Cost tracking"],
      },
    ],
    category: "AI",
    status: "COMING_SOON",
    priceIdr: 1_299_000,
    earlyBirdPriceIdr: null,
    earlyBirdEndsAt: null,
    licenseType: "personal",
    version: "0.9.0",
    coverGradient: "sage",
    demoUrl: null,
    featured: false,
    sortOrder: 4,
  },
  {
    slug: "admin-dashboard-ui-kit",
    name: "Admin Dashboard UI Kit",
    tagline: "A dense admin UI kit built for real operational work.",
    description:
      "Tables, filters, command menus, empty states, and permission-aware patterns. Designed to stay readable when the data gets messy.",
    features: [
      "Dense data tables and saved views",
      "Command menu and keyboard shortcuts",
      "Filter and saved-query patterns",
      "Permission-aware UI states",
      "Empty, loading, and error states",
      "Charts with accessible summaries",
    ],
    stack: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "Tailwind CSS 4",
      "Radix UI",
      "Recharts",
    ],
    changelog: [
      {
        version: "0.8.0",
        date: "2026-10-08",
        title: "Saved views",
        notes: [
          "Table view persistence",
          "Keyboard shortcut map",
          "New bulk action bar",
        ],
      },
      {
        version: "0.7.0",
        date: "2026-09-11",
        title: "Filter system",
        notes: [
          "Composable filter chips",
          "URL-backed query state",
          "Density toggle",
        ],
      },
      {
        version: "0.6.0",
        date: "2026-08-19",
        title: "Private preview",
        notes: [
          "Core table primitives",
          "Permission state matrix",
          "Accessible chart wrappers",
        ],
      },
    ],
    category: "UI Kit",
    status: "COMING_SOON",
    priceIdr: 459_000,
    earlyBirdPriceIdr: null,
    earlyBirdEndsAt: null,
    licenseType: "personal",
    version: "0.8.0",
    coverGradient: "clay",
    demoUrl: null,
    featured: false,
    sortOrder: 5,
  },
  {
    slug: "cli-boilerplate-generator",
    name: "CLI Boilerplate Generator",
    tagline: "Generate consistent service scaffolds from one command.",
    description:
      "A small, hackable CLI for teams that want consistency without a platform. Templates, prompts, and repeatable project setup.",
    features: [
      "Composable project templates",
      "Interactive prompts with defaults",
      "Non-interactive CI mode",
      "Template version pinning",
      "Post-generation health check",
      "Hackable TypeScript source",
    ],
    stack: ["Node.js", "TypeScript", "Clipanion", "Zod", "tsup", "Vitest"],
    changelog: [
      {
        version: "0.7.0",
        date: "2026-10-16",
        title: "Template pinning",
        notes: [
          "Versioned template manifests",
          "Offline template cache",
          "CI-safe flags",
        ],
      },
      {
        version: "0.6.0",
        date: "2026-09-25",
        title: "Health check",
        notes: [
          "Post-install verification",
          "Clear failure output",
          "Template test harness",
        ],
      },
      {
        version: "0.5.0",
        date: "2026-08-28",
        title: "Private alpha",
        notes: [
          "Initial generator",
          "Interactive prompts",
          "Next.js service template",
        ],
      },
    ],
    category: "Tooling",
    status: "COMING_SOON",
    priceIdr: 629_000,
    earlyBirdPriceIdr: null,
    earlyBirdEndsAt: null,
    licenseType: "personal",
    version: "0.7.0",
    coverGradient: "slate",
    demoUrl: null,
    featured: false,
    sortOrder: 6,
  },
  {
    slug: "launch-kit-bundle",
    name: "Launch Kit Bundle",
    tagline: "Every available kit in one launch-ready bundle.",
    description:
      "The full CodeGems shelf: SaaS foundation, payments, licensing, and secure delivery. One license, every update, one clean launch path.",
    features: [
      "Every available CodeGems kit",
      "One personal license, one price",
      "Lifetime updates across the bundle",
      "Priority email support",
      "Private repository access",
      "Launch checklist and architecture notes",
    ],
    stack: [
      "Next.js 16",
      "TypeScript",
      "PostgreSQL",
      "Prisma 6",
      "Midtrans Snap",
      "Tailwind CSS 4",
    ],
    changelog: [
      {
        version: "2026.1",
        date: "2026-10-20",
        title: "Launch Kit Bundle",
        notes: [
          "Includes the SaaS Starter, Payment Kit, and Download Kit",
          "One license covers all three codebases",
          "Launch checklist added",
        ],
      },
      {
        version: "2026.0",
        date: "2026-09-30",
        title: "Early-bird bundle",
        notes: [
          "Bundle pricing introduced",
          "Private repository access",
          "Priority support inbox",
        ],
      },
    ],
    category: "Bundle",
    status: "AVAILABLE",
    priceIdr: 1_999_000,
    earlyBirdPriceIdr: 1_599_000,
    earlyBirdEndsAt,
    licenseType: "bundle",
    version: "2026.1",
    coverGradient: "emerald",
    demoUrl: null,
    featured: true,
    sortOrder: 0,
  },
];

export const catalogSeedSettings: Record<string, string> = {
  "stats.licenses": "10,000+",
  "stats.gmv": "$5M+",
  "stats.uptime": "99.9%",
  "hero.headline": "Next Generation of Production-Ready Code",
  "hero.subheadline":
    "Buy battle-tested source code, boilerplates, and developer kits — built to ship, documented to last.",
  "featured.slug": "launch-kit-bundle",
  "featured.endsAt": earlyBirdEndsAt,
  announcement: "Early-bird pricing is live for the Launch Kit Bundle.",
};
