import { siteConfig } from "@/config/site";

export type LicenseTierId = "personal" | "team" | "agency";

export type LicenseTier = {
  id: LicenseTierId;
  name: string;
  eyebrow: string;
  priceIdr: number;
  description: string;
  bestFor: string;
  highlighted: boolean;
  availableAtCheckout: boolean;
  cta: { label: string; href: string };
  features: string[];
};

const quoteHref = (tier: string) =>
  `mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(
    `${tier} license enquiry`,
  )}`;

export const licenseTiers: LicenseTier[] = [
  {
    id: "personal",
    name: "Personal",
    eyebrow: "For your own products",
    priceIdr: 459_000,
    description:
      "A single developer, one end product, and every update we ship. The default license attached to every kit.",
    bestFor: "Indie developers and solo founders",
    highlighted: true,
    availableAtCheckout: true,
    cta: { label: "Browse personal kits", href: "/products" },
    features: [
      "1 developer",
      "1 end product",
      "Source code and documentation",
      "Lifetime updates",
      "Email support",
    ],
  },
  {
    id: "team",
    name: "Team",
    eyebrow: "For a small product team",
    priceIdr: 1_499_000,
    description:
      "One shared license for the people building the product. Internal projects only, with a straightforward invoice.",
    bestFor: "Product teams of up to five",
    highlighted: false,
    availableAtCheckout: false,
    cta: { label: "Request a team quote", href: quoteHref("Team") },
    features: [
      "Up to 5 developers",
      "Unlimited internal products",
      "Source code and documentation",
      "Lifetime updates",
      "Priority email support",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    eyebrow: "For client work",
    priceIdr: 2_999_000,
    description:
      "Use the kits across client projects without asking permission each time. Includes a short onboarding call.",
    bestFor: "Studios and agencies shipping for clients",
    highlighted: false,
    availableAtCheckout: false,
    cta: { label: "Request an agency quote", href: quoteHref("Agency") },
    features: [
      "Up to 15 developers",
      "Unlimited client projects",
      "Source code and documentation",
      "Lifetime updates",
      "Priority support and onboarding",
    ],
  },
];

export type LicenseComparisonRow = {
  label: string;
  personal: string | boolean;
  team: string | boolean;
  agency: string | boolean;
};

export const licenseComparison: LicenseComparisonRow[] = [
  { label: "Developers", personal: "1", team: "Up to 5", agency: "Up to 15" },
  {
    label: "End products",
    personal: "1",
    team: "Unlimited internal",
    agency: "Unlimited, including client work",
  },
  { label: "Client work", personal: false, team: false, agency: true },
  { label: "Source code", personal: true, team: true, agency: true },
  { label: "Lifetime updates", personal: true, team: true, agency: true },
  {
    label: "Private repository access",
    personal: true,
    team: true,
    agency: true,
  },
  {
    label: "Support",
    personal: "Email",
    team: "Priority email",
    agency: "Priority + onboarding",
  },
  {
    label: "License handling",
    personal: "Instant at checkout",
    team: "Manual invoice",
    agency: "Manual invoice",
  },
];
