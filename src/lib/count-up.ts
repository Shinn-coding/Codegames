export type ParsedStatValue = {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  grouping: boolean;
};

const NUMBER_PATTERN = /-?\d[\d,]*(?:\.\d+)?/;
const formatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Splits a display value such as "$5M+" or "10,000+" into a numeric target and
 * the static text around it. Values without a number stay static.
 */
export function parseStatValue(value: string): ParsedStatValue | null {
  const match = NUMBER_PATTERN.exec(value);

  if (!match || match.index === undefined) {
    return null;
  }

  const numericText = match[0];
  const target = Number(numericText.replace(/,/g, ""));

  if (!Number.isFinite(target)) {
    return null;
  }

  const decimalPart = numericText.split(".")[1];

  return {
    prefix: value.slice(0, match.index),
    suffix: value.slice(match.index + numericText.length),
    target,
    decimals: decimalPart?.length ?? 0,
    grouping: numericText.includes(","),
  };
}

export function formatStatValue(
  value: number,
  parsed: ParsedStatValue,
): string {
  const cacheKey = `${parsed.decimals}:${parsed.grouping}`;
  let formatter = formatterCache.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: parsed.decimals,
      maximumFractionDigits: parsed.decimals,
      useGrouping: parsed.grouping,
    });
    formatterCache.set(cacheKey, formatter);
  }

  return `${parsed.prefix}${formatter.format(value)}${parsed.suffix}`;
}

export function easeOutQuart(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return 1 - Math.pow(1 - clamped, 4);
}
