export const siteConfig = {
  name: "CodeGems",
  description:
    "Production-ready source code, boilerplates, and developer kits. Buy once, ship faster, own the code.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  tagline: "Production-ready code, without the archaeology.",
  supportEmail: "hello@codegems.dev",
  nav: [
    { label: "Products", href: "/products" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
    { label: "FAQ", href: "/#faq" },
  ],
  hero: {
    eyebrow: "Independent developer storefront",
    headline: "Next Generation of Production-Ready Code",
    subheadline:
      "Buy battle-tested source code, boilerplates, and developer kits — built to ship, documented to last.",
    primaryCta: { label: "Explore kits", href: "/products" },
    secondaryCta: {
      label: "View the bundle",
      href: "/products/launch-kit-bundle",
    },
    trust: ["Instant download", "Lifetime updates", "Secure license"],
  },
  stats: {
    licenses: "10,000+",
    gmv: "$5M+",
    uptime: "99.9%",
  },
  principles: [
    {
      icon: "code",
      title: "Clean Architecture",
      description:
        "Opinionated boundaries, typed contracts, and no mystery folders. You can read the whole thing.",
    },
    {
      icon: "updates",
      title: "Lifetime Updates",
      description:
        "Buy once. Pull every improvement we ship, forever — no maintenance subscription.",
    },
    {
      icon: "lock",
      title: "Zero Lock-in",
      description:
        "Plain code you own. No runtime dependency on CodeGems, no proprietary platform.",
    },
    {
      icon: "support",
      title: "Direct Support",
      description:
        "Questions land in a human inbox, not a ticket maze. We answer the awkward ones too.",
    },
  ],
  roadmap: [
    {
      version: "v1.4.0",
      date: "Oct 2026",
      title: "License & Secure Download Kit",
      description:
        "Signed download tokens, revoke flows, and audit-ready logs for file-based products.",
      status: "Shipped",
    },
    {
      version: "v1.3.0",
      date: "Sep 2026",
      title: "Midtrans Payment Kit",
      description:
        "Snap checkout, webhook verification, expiry handling, and a mock provider for local work.",
      status: "Shipped",
    },
    {
      version: "v1.5.0",
      date: "Q1 2027",
      title: "AI Agent Starter Kit",
      description:
        "Typed tool calls, retrieval, evals, and a guardrail layer that fails closed.",
      status: "In progress",
    },
  ],
  faqs: [
    {
      question: "What exactly do I get?",
      answer:
        "A complete source repository, setup documentation, and every future update for the kit. Bundles include each available kit under one license.",
    },
    {
      question: "Can I use a kit on client work?",
      answer:
        "Personal licenses cover your own products. Team and agency licenses are handled manually today; request a quote on the pricing page with the scope and we will make it explicit.",
    },
    {
      question: "How do updates work?",
      answer:
        "Updates are versioned and published to your library. Pull the release you need, read the changelog, and keep your own modifications.",
    },
    {
      question: "Do I need a CodeGems account?",
      answer:
        "Yes. Checkout and downloads run through an account so licenses can be issued, verified, and re-downloaded safely.",
    },
    {
      question: "Which stack do the kits use?",
      answer:
        "The core kits are built with Next.js, TypeScript, PostgreSQL, Prisma, and Tailwind. Each listing states its exact stack and version.",
    },
    {
      question: "What is the refund policy?",
      answer:
        "Because source code is delivered immediately, sales are final once a license is issued. If something is broken or misdescribed, contact us and we will fix it.",
    },
  ],
  footer: {
    columns: [
      {
        title: "Store",
        links: [
          { label: "All kits", href: "/products" },
          { label: "Bundle", href: "/products/launch-kit-bundle" },
          { label: "Pricing", href: "/pricing" },
          { label: "Changelog", href: "/changelog" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "Principles", href: "/#principles" },
          { label: "FAQ", href: "/#faq" },
          { label: "Support", href: "mailto:hello@codegems.dev" },
        ],
      },
      {
        title: "Account",
        links: [
          { label: "Sign in", href: "/login" },
          { label: "Dashboard", href: "/dashboard" },
        ],
      },
    ],
  },
} as const;

export type PrincipleIcon = (typeof siteConfig.principles)[number]["icon"];
