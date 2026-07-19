import type { CommanderScore } from "./score";

/**
 * Returns a "receipts preview" string: up to `max` card names joined by " · ",
 * with a " +N" suffix when names.length > max.
 * Returns "" for empty input.
 */
export function receiptsPreview(names: string[], max = 3): string {
  if (names.length === 0) return "";
  const shown = names.slice(0, max);
  const overflow = names.length - max;
  const base = shown.join(" · ");
  if (overflow > 0) return `${base} +${overflow}`;
  return base;
}

export type FitSegment = { key: "pool" | "roles" | "synergy"; grow: number };
export type FitSegmentsResult = { pct: number; segments: FitSegment[] };

/**
 * Computes the fit bar's total percentage and per-segment flex-grow ratios.
 * pct = min(score, 100). synergy segment is omitted when fitSynergy is null.
 */
export function fitSegments(
  s: Pick<CommanderScore, "fitPool" | "fitRoles" | "fitSynergy" | "score">,
): FitSegmentsResult {
  const pct = Math.min(s.score, 100);
  const segments: FitSegment[] = [
    { key: "pool", grow: s.fitPool },
    { key: "roles", grow: s.fitRoles },
  ];
  if (s.fitSynergy !== null) {
    segments.push({ key: "synergy", grow: s.fitSynergy });
  }
  return { pct, segments };
}
