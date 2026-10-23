import { auth } from "@/auth";
import { getLandingData } from "@/lib/marketing";

import { PageShell } from "@/components/marketing/page-shell";
import { Hero } from "@/components/marketing/hero";
import { Stats } from "@/components/marketing/stats";
import { Principles } from "@/components/marketing/principles";
import { FeaturedBanner } from "@/components/marketing/featured-banner";
import { ProductsSection } from "@/components/marketing/products-section";
import { Roadmap } from "@/components/marketing/roadmap";
import { FaqSection } from "@/components/marketing/faq-section";
import { CtaBand } from "@/components/marketing/cta-band";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [data, session] = await Promise.all([getLandingData(), auth()]);

  return (
    <PageShell
      announcement={data.settings.announcement}
      isSignedIn={Boolean(session?.user)}
    >
      <Hero
        settings={data.settings}
        featured={data.featured}
        featuredSeconds={data.featuredSeconds}
      />
      <Stats
        licenses={data.settings.licenses}
        gmv={data.settings.gmv}
        uptime={data.settings.uptime}
      />
      <Principles />
      <FeaturedBanner featured={data.featured} />
      <ProductsSection products={data.products} />
      <Roadmap />
      <FaqSection />
      <CtaBand />
    </PageShell>
  );
}
