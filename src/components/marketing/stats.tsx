import { CountUp } from "@/components/marketing/count-up";
import { Reveal } from "@/components/ui/reveal";

type StatsProps = {
  licenses: string;
  gmv: string;
  uptime: string;
};

export function Stats({ licenses, gmv, uptime }: StatsProps) {
  const stats = [
    { value: licenses, label: "Licenses issued" },
    { value: gmv, label: "Developer revenue" },
    { value: uptime, label: "API uptime" },
  ];

  return (
    <section className="relative bg-bg" aria-label="CodeGems in numbers">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 md:py-20">
        <div className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
          {stats.map((stat, index) => (
            // Keep the cell background static so the grid divider color never
            // flashes through while the content fades up.
            <div key={stat.label} className="h-full bg-bg">
              <Reveal delay={index * 0.06} className="h-full">
                <div className="flex h-full flex-col justify-between p-6 sm:p-8 md:p-9">
                  <span className="font-mono text-[9px] tracking-[0.18em] text-muted">
                    0{index + 1}
                  </span>
                  <p className="mt-8 font-mono text-[clamp(2.5rem,4.6vw,4.4rem)] leading-none font-medium tracking-[-0.08em] text-ink tabular-nums">
                    <CountUp value={stat.value} delayMs={index * 110} />
                  </p>
                  <p className="mt-3 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                    {stat.label}
                  </p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
