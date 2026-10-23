"use client";

import { Clock } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type CountdownProps = {
  deadline: string | null;
  initialSeconds: number;
  label?: string;
  tone?: "light" | "dark";
  className?: string;
};

function pad(value: number): string {
  return String(Math.max(0, value)).padStart(2, "0");
}

export function Countdown({
  deadline,
  initialSeconds,
  label = "Early-bird license ends in",
  tone = "light",
  className,
}: CountdownProps) {
  const [remaining, setRemaining] = useState(() =>
    deadline ? Math.max(0, Math.floor(initialSeconds)) : 0,
  );

  useEffect(() => {
    if (!deadline) {
      return;
    }

    const update = () => {
      const seconds = Math.floor(
        (new Date(deadline).getTime() - Date.now()) / 1000,
      );
      setRemaining(Math.max(0, seconds));
    };

    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const days = Math.floor(remaining / 86_400);
  const hours = Math.floor((remaining % 86_400) / 3_600);
  const minutes = Math.floor((remaining % 3_600) / 60);
  const seconds = remaining % 60;
  const expired = remaining <= 0;
  const light = tone === "light";

  return (
    <div
      role="timer"
      aria-label={
        expired
          ? "Early-bird license has ended"
          : `${label}: ${days} days, ${hours} hours, ${minutes} minutes`
      }
      className={cn(
        "rounded-2xl border p-3 backdrop-blur-md",
        light
          ? "border-white/15 bg-[#0b1a14]/65 text-bg"
          : "border-line bg-surface/95 text-ink",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-[8px] font-semibold tracking-[0.16em] uppercase",
          light ? "text-bg/55" : "text-muted",
        )}
      >
        <Clock size={12} weight="light" aria-hidden="true" />
        <span>{label}</span>
      </div>

      {expired ? (
        <p
          className={cn(
            "mt-2 font-mono text-xs tracking-tight",
            light ? "text-bg/80" : "text-ink",
          )}
        >
          Early-bird closed
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {[
            { value: days, unit: "days" },
            { value: hours, unit: "hrs" },
            { value: minutes, unit: "min" },
            { value: seconds, unit: "sec" },
          ].map((segment) => (
            <div
              key={segment.unit}
              className={cn(
                "rounded-lg px-1 py-1.5 text-center",
                light ? "bg-white/10" : "bg-ink/5",
              )}
            >
              <span className="block font-mono text-[15px] leading-none font-medium tabular-nums">
                {pad(segment.value)}
              </span>
              <span
                className={cn(
                  "mt-1 block text-[7px] leading-none tracking-[0.12em] uppercase",
                  light ? "text-bg/45" : "text-muted",
                )}
              >
                {segment.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
