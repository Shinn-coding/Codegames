import { cn } from "@/lib/utils";

const coverGradients: Record<string, string> = {
  mint: "linear-gradient(138deg, #d3ead8 0%, #8dbf9f 38%, #4f7f67 68%, #203b31 100%)",
  amber:
    "linear-gradient(138deg, #f2e2ba 0%, #d8ae5f 36%, #9c6f2f 70%, #3a3022 100%)",
  sky: "linear-gradient(138deg, #d7e6eb 0%, #93b9c7 38%, #527f92 70%, #20333b 100%)",
  sage: "linear-gradient(138deg, #e0e6d3 0%, #adbc98 38%, #71845e 70%, #2d3928 100%)",
  clay: "linear-gradient(138deg, #f0dacb 0%, #d5a88d 38%, #a86e50 70%, #3f2a22 100%)",
  slate:
    "linear-gradient(138deg, #e0e6e3 0%, #a9b8b3 38%, #70827c 70%, #283632 100%)",
  emerald:
    "linear-gradient(138deg, #c8e7d1 0%, #76b18a 36%, #3d7656 68%, #143629 100%)",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["&", "and", "the", "of"].includes(word.toLowerCase()))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

type ProductCoverProps = {
  name: string;
  category: string;
  version: string;
  gradient?: string | null;
  className?: string;
};

export function ProductCover({
  name,
  category,
  version,
  gradient,
  className,
}: ProductCoverProps) {
  const background = coverGradients[gradient ?? ""] ?? coverGradients.mint;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate overflow-hidden rounded-inner border border-white/15",
        className,
      )}
      style={{ backgroundImage: background }}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div className="absolute -top-16 -right-10 size-48 rounded-full border border-white/25 bg-white/15 blur-2xl" />
      <div className="absolute -bottom-20 -left-10 size-52 rounded-full border border-white/15 bg-black/10 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-full border border-white/20 bg-black/15 px-2.5 py-1 text-[8px] font-semibold tracking-[0.16em] text-white/85 uppercase backdrop-blur-sm">
            {category}
          </span>
          <span className="font-mono text-[9px] tracking-[0.12em] text-white/65">
            v{version}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <span className="font-display text-[clamp(3rem,6vw,4.5rem)] leading-[0.78] font-semibold tracking-[-0.09em] text-white/85">
            {initials(name)}
          </span>
          <span className="pb-1 font-mono text-[8px] tracking-[0.2em] text-white/55 uppercase">
            CodeGems
          </span>
        </div>
      </div>
    </div>
  );
}
