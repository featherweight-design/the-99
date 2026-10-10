// The Jobs card's tally: one row per job from the label reader. Pure, so the rules are provable
// without a database. A card absent from `labels` is UNLABELED (stale, unwritten or emptied;
// `readLabels` leaves all three out), which is not the same as labeled and doing none of the
// six jobs.

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

export type JobCard = { oracleId: string; name: string; copies: number };

/** What the page ships per labeled card: the rows it falls in. A card in the map and in no row is
 *  labeled and does none of the six jobs; a card absent from it is unlabeled. */
export type JobRowsByCard = Readonly<Record<string, readonly JobRowKey[]>>;

export function jobRowsOf(jobs: readonly Job[]): JobRowKey[] {
  return JOB_ROWS.filter((r) => jobs.some((j) => j.space === r.space && j.kind === r.kind)).map((r) => r.key);
}

export type JobRow = { key: JobRowKey; copies: number; names: string[] };

export type JobTally = {
  rows: JobRow[];
  /** Nonland copies the labels cover. */
  labeled: number;
  /** Labeled copies doing two or more of the six jobs. */
  overlap: number;
  /** Labeled copies doing none of the six. */
  none: number;
  /** Nonland copies with no fresh label. */
  unlabeled: number;
  unlabeledNames: string[];
};

export function jobTally(cards: readonly JobCard[], byCard: JobRowsByCard): JobTally {
  const rows: JobRow[] = JOB_ROWS.map((r) => ({ key: r.key, copies: 0, names: [] }));
  let labeled = 0;
  let overlap = 0;
  let none = 0;
  let unlabeled = 0;
  const unlabeledNames: string[] = [];
  for (const card of cards) {
    const hit = byCard[card.oracleId];
    if (!hit) {
      unlabeled += card.copies;
      unlabeledNames.push(card.name);
      continue;
    }
    labeled += card.copies;
    for (const key of hit) {
      const row = rows.find((r) => r.key === key)!;
      row.copies += card.copies;
      row.names.push(card.name);
    }
    if (hit.length === 0) none += card.copies;
    else if (hit.length > 1) overlap += card.copies;
  }
  return { rows, labeled, overlap, none, unlabeled, unlabeledNames };
}
