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
 * Computes the fit bar's fill percentage and per-segment flex-grow ratios.
 * The synergy segment is omitted when fitSynergy is null.
 *
 * The bar fills against the score's own denominator, not against 100. A
 * commander with no synergy read scores out of 40, so 32 of 40 draws a bar at
 * 80% — the same fraction the figure beside it states. Capping at 100 instead
 * drew that commander at 32% full next to a note saying 40 is all there is.
 */
export function fitSegments(
  s: Pick<CommanderScore, "fitPool" | "fitRoles" | "fitSynergy" | "score" | "measurableTotal">,
): FitSegmentsResult {
  const pct = (100 * s.score) / s.measurableTotal;
  const segments: FitSegment[] = [
    { key: "pool", grow: s.fitPool },
    { key: "roles", grow: s.fitRoles },
  ];
  if (s.fitSynergy !== null) {
    segments.push({ key: "synergy", grow: s.fitSynergy });
  }
  return { pct, segments };
}
