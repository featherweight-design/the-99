import type { ComboModal } from "../bracket/combo-modal";
import type { Job } from "../labels/types";

/**
 * One card of a reading's list, as every benchmark reads it (plan
 * `2026-10-10-evidence-benchmarks.md`). Built once per reading by `benchCards`: the stored list's
 * own fields, the cards' text columns, and the card's jobs, which are its fresh label's or, for a
 * card with no fresh label, the ones its rules text gives (`jobsFromText`). No benchmark can tell
 * the two apart, and no surface says which a card had.
 */
export type BenchCard = {
  oracleId: string;
  name: string;
  quantity: number;
  /** In the command zone. A commander is never in the 99 and is always available. */
  commander: boolean;
  typeLine: string;
  manaValue: number;
  manaCost: string | null;
  /** For a tutor's reach (`tutorReaches`): a colour-bound search finds only a piece in its colours. */
  colorIdentity: readonly string[];
  /** The face that is cast (`castFaceText`), so a land back never reads as the spell's text. */
  oracleText: string | null;
  keywords: readonly string[];
  jobs: readonly Job[];
};

/** One assembled line: every piece held (a must-be-commander piece only from the command zone). */
export type BenchLine = ComboModal & { pieceIds: readonly string[] };

/** Five ordered steps, 1 low to 5 top. Never a count. */
export type Step = 1 | 2 | 3 | 4 | 5;

/** Ascending thresholds: a value at or above `cuts[i]` reaches step `i + 2`. */
export type GradeCuts = readonly [number, number, number, number];

export type Strength = "heavy" | "light";
