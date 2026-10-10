// The Jobs card's tally: one row per job from the label reader. Pure, so the rules are provable
// without a database. A card absent from `labels` has no fresh label (stale, unwritten or emptied;
// `readLabels` leaves all three out) and is read from its rules text, the classifier's single
// `role`, exactly as the strip reads it (Hugh, 2026-10-10: the app never mentions labels). That is
// the ONE fallback; the strip's counts come from this tally, so the two cannot disagree. A card
// the classifier gives no role to, or one that is labeled and does none of the six, is in no row.

import type { Job } from "../labels/types";

export const JOB_ROWS = [
  { key: "ramp", space: "role", kind: "ramp" },
  { key: "draw", space: "role", kind: "draw" },
  { key: "removal", space: "role", kind: "removal" },
  { key: "wipes", space: "role", kind: "wipes" },
  { key: "protection", space: "theme", kind: "protection" },
  { key: "finisher", space: "theme", kind: "finisher" },
] as const;

export type JobRowKey = (typeof JOB_ROWS)[number]["key"];

/** `role` is the classifier's single role for the card (`card.role`); only the four it can name
 *  count as a row for a card with no fresh label. */
export type JobCard = { oracleId: string; name: string; copies: number; role?: string };

const FALLBACK_ROWS: ReadonlySet<string> = new Set(["ramp", "draw", "removal", "wipes"]);

/** What the page ships per labeled card: the rows it falls in. A card absent from it is read from its text. */
export type JobRowsByCard = Readonly<Record<string, readonly JobRowKey[]>>;

export function jobRowsOf(jobs: readonly Job[]): JobRowKey[] {
  return JOB_ROWS.filter((r) => jobs.some((j) => j.space === r.space && j.kind === r.kind)).map((r) => r.key);
}

export type JobRow = { key: JobRowKey; copies: number; names: string[] };

export type JobTally = {
  rows: JobRow[];
  /** Nonland copies counted. */
  cast: number;
  /** Copies doing two or more of the six jobs. */
  overlap: number;
  /** Copies whose label names none of the six. A card with no label is never counted here. */
  none: number;
};

export function jobTally(cards: readonly JobCard[], byCard: JobRowsByCard): JobTally {
  const rows: JobRow[] = JOB_ROWS.map((r) => ({ key: r.key, copies: 0, names: [] }));
  let cast = 0;
  let overlap = 0;
  let none = 0;
  for (const card of cards) {
    cast += card.copies;
    const hit: readonly JobRowKey[] =
      byCard[card.oracleId] ?? (card.role && FALLBACK_ROWS.has(card.role) ? [card.role as JobRowKey] : []);
    for (const key of hit) {
      const row = rows.find((r) => r.key === key)!;
      row.copies += card.copies;
      row.names.push(card.name);
    }
    // Only a card that HAS a label can be said to do none: the classifier cannot see Protection or
    // Win conditions, so a card it gives no role is unknown rather than idle.
    if (hit.length === 0) { if (byCard[card.oracleId]) none += card.copies; }
    else if (hit.length > 1) overlap += card.copies;
  }
  return { rows, cast, overlap, none };
}
