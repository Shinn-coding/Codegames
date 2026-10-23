"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { easeOutQuart, formatStatValue, parseStatValue } from "@/lib/count-up";

type CountUpProps = {
  value: string;
  delayMs?: number;
  durationMs?: number;
};

export function CountUp({
  value,
  delayMs = 0,
  durationMs = 1_650,
}: CountUpProps) {
  const parsed = useMemo(() => parseStatValue(value), [value]);
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!parsed || reduceMotion) {
      return;
    }

    const node = ref.current;

    if (!node) {
      return;
    }

    let animationFrame = 0;
    let cancelled = false;
    let started = false;

    const start = () => {
      if (started || cancelled) {
        return;
      }

      started = true;
      const startedAt = performance.now() + delayMs;

      const update = (now: number) => {
        if (cancelled) {
          return;
        }

        const progress = Math.min(
          1,
          Math.max(0, (now - startedAt) / durationMs),
        );
        const nextValue = parsed.target * easeOutQuart(progress);

        if (progress >= 1) {
          setDisplay(value);
          return;
        }

        setDisplay(formatStatValue(nextValue, parsed));
        animationFrame = window.requestAnimationFrame(update);
      };

      setDisplay(formatStatValue(0, parsed));
      animationFrame = window.requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { threshold: 0.45 },
    );

    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [delayMs, durationMs, parsed, reduceMotion, value]);

  if (!parsed) {
    return <>{value}</>;
  }

  const shown = reduceMotion ? value : display;

  return (
    <span
      ref={ref}
      className="relative inline-grid tabular-nums"
      data-count-up={value}
    >
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {value}
      </span>
      <span
        aria-hidden="true"
        className="col-start-1 row-start-1"
        data-count-up-display=""
      >
        {shown}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
