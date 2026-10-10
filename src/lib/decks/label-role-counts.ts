// The strip's role counts by LABEL: the Jobs card's own tally, so the two cannot disagree
// (labels-everywhere plan, PR 2). Pure, so the rules are provable without a database.
//
// Differences from `computeRoleCounts`, all deliberate and all the Jobs card's rules:
//   - a card counts in EVERY role its label names (a ramp-and-draw card is one of each), where
//     `card.role` is the first of the classifier's roles;
//   - a card with no fresh label counts toward no role (absent from `byCard`), which is a
//     different state from labeled-and-doing-none;
//   - lands still count by `card.role === "land"`, which is `isLandFace`, and never reach the tally.

import { jobTally, type JobRowsByCard } from "./job-tally";
import { computeRoleCounts, type MixRole, type RoleCountCard } from "./mix";

export type LabelCountCard = RoleCountCard & { oracleId?: string; name?: string };

export type LabelRoleCounts = {
  counts: Record<MixRole, number>;
  /** Nonland copies with no fresh label: the figure the strip's disclosure names. */
  unlabeled: number;
};

export function computeLabelRoleCounts(
  cards: readonly LabelCountCard[],
  byCard: JobRowsByCard,
): LabelRoleCounts {
  const lands = cards.reduce((n, c) => (c.role === "land" ? n + c.quantity : n), 0);
  const tally = jobTally(
    cards.filter((c) => c.role !== "land").map((c) => ({ oracleId: c.oracleId ?? "", name: c.name ?? "", copies: c.quantity })),
    byCard,
  );
  const copies = (key: "ramp" | "draw" | "removal" | "wipes") => tally.rows.find((r) => r.key === key)!.copies;
  return {
    counts: { ramp: copies("ramp"), draw: copies("draw"), removal: copies("removal"), wipes: copies("wipes"), land: lands },
    unlabeled: tally.unlabeled,
  };
}

/** The four role cells a label names, in the strip's order. A card's toast and its shelf use the
 *  first. */
export function labelRolesOf(rows: readonly string[] | undefined): Exclude<MixRole, "land">[] {
  if (!rows) return [];
  return (["ramp", "draw", "removal", "wipes"] as const).filter((r) => rows.includes(r));
}

/**
 * The role a card's toast or resolve clause names. By label that is the first role the label names,
 * and a queried card with no label names none. A land, or a card the page never queried (a search
 * result), takes the classifier's `card.role`: the label map is sparse, so absence from it cannot
 * tell "unlabeled" from "never asked", and `queried` is what can.
 */
export function roleNamedFor(
  card: { oracleId: string; role: string },
  byCard: JobRowsByCard | null | undefined,
  queried: ReadonlySet<string> | null | undefined,
): string | undefined {
  if (!byCard || card.role === "land" || !queried?.has(card.oracleId)) return card.role;
  return labelRolesOf(byCard[card.oracleId])[0];
}

export type RoleCounter = {
  (cards: readonly LabelCountCard[]): Record<MixRole, number>;
  /** True when counts come from labels. */
  byLabel: boolean;
  /** Nonland copies with no fresh label among `cards`; 0 when not counting by label. */
  unlabeled: (cards: readonly LabelCountCard[]) => number;
};

/**
 * The one fold a surface counts with. A null `byCard` (switch off, or the label read failed) is
 * `computeRoleCounts` exactly as before, so a caller never branches on the switch itself.
 */
export function roleCounterFor(byCard: JobRowsByCard | null | undefined): RoleCounter {
  const fn = ((cards: readonly LabelCountCard[]) =>
    byCard ? computeLabelRoleCounts(cards, byCard).counts : computeRoleCounts([...cards])) as RoleCounter;
  fn.byLabel = Boolean(byCard);
  fn.unlabeled = (cards) => (byCard ? computeLabelRoleCounts(cards, byCard).unlabeled : 0);
  return fn;
}
