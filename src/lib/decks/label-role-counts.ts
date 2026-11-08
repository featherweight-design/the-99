// The strip's role counts by LABEL: the Jobs card's own tally, so the two cannot disagree
// (labels-everywhere plan, PR 2). Pure, so the rules are provable without a database.
//
// Differences from `computeRoleCounts`, all deliberate and all the Jobs card's rules:
//   - a card counts in EVERY role its label names (a ramp-and-draw card is one of each), where
//     `card.role` is the first of the classifier's roles;
//   - a card with no fresh label (absent from `byCard`) falls back to the classifier for that card
//     inside `jobRowsFor` (the Jobs card's tally uses it too), as the fill, the fit score, Discover, the suggestions and the profile do
//     (one rule, 2026-10-10), and nothing is said about it; a labeled card doing none counts toward no role;
//   - lands still count by `card.role === "land"`, which is `isLandFace`, and never reach the tally.

import { jobRowsFor, type JobRowsByCard } from "./job-tally";
import type { MixRole, RoleCountCard } from "./mix";

export type LabelCountCard = RoleCountCard & { oracleId?: string; name?: string };

/** The roles one card is counted in: the strip's single membership rule. A land is the land role alone; a
 *  nonland card is the rows its label names (`jobRowsFor`, with its classifier fallback), or, with no label
 *  read at all (`byCard` null), its `card.role`. Every count and every list derives from this. */
export function rolesOfCard(card: LabelCountCard, byCard: JobRowsByCard | null | undefined): MixRole[] {
  if (card.role === "land") return ["land"];
  if (!byCard) return card.role === "other" ? [] : [card.role];
  return labelRolesOf(jobRowsFor({ oracleId: card.oracleId ?? "", role: card.role }, byCard));
}

export function computeLabelRoleCounts(
  cards: readonly LabelCountCard[],
  byCard: JobRowsByCard | null | undefined,
): Record<MixRole, number> {
  const counts: Record<MixRole, number> = { ramp: 0, draw: 0, removal: 0, wipes: 0, land: 0 };
  for (const c of cards) for (const role of rolesOfCard(c, byCard)) counts[role] += c.quantity;
  return counts;
}

/** The cards `computeLabelRoleCounts` counts in `role`, so the copies of the result sum to that figure. A card
 *  that does two jobs is a member of both roles. The list a role count opens is this, never `card.role`. */
export function roleMembers<C extends LabelCountCard>(
  cards: readonly C[],
  byCard: JobRowsByCard | null | undefined,
  role: MixRole,
): C[] {
  return cards.filter((c) => rolesOfCard(c, byCard).includes(role));
}

/** The four role cells a label names, in the strip's order. A card's toast and its shelf use the
 *  first. */
export function labelRolesOf(rows: readonly string[] | undefined): Exclude<MixRole, "land">[] {
  if (!rows) return [];
  return (["ramp", "draw", "removal", "wipes"] as const).filter((r) => rows.includes(r));
}

/**
 * The role a card's toast or resolve clause names. By label that is the first role the label names;
 * a labeled card with no role names none. A land, an unlabeled card (the classifier's call, the
 * one rule) or a card the page never queried (a search result) takes the classifier's `card.role`.
 */
export function roleNamedFor(
  card: { oracleId: string; role: string },
  byCard: JobRowsByCard | null | undefined,
  queried: ReadonlySet<string> | null | undefined,
): string | undefined {
  if (!byCard || card.role === "land" || !queried?.has(card.oracleId)) return card.role;
  const rows = byCard[card.oracleId];
  return rows ? labelRolesOf(rows)[0] : card.role;
}

export type RoleCounter = {
  (cards: readonly LabelCountCard[]): Record<MixRole, number>;
  /** True when counts come from labels. */
  byLabel: boolean;
};

/**
 * The one fold a surface counts with. A null `byCard` (switch off, or the label read failed) counts
 * by `card.role`, which is `computeRoleCounts` exactly as before, so a caller never branches on the switch itself.
 */
export function roleCounterFor(byCard: JobRowsByCard | null | undefined): RoleCounter {
  const fn = ((cards: readonly LabelCountCard[]) => computeLabelRoleCounts(cards, byCard)) as RoleCounter;
  fn.byLabel = Boolean(byCard);
  return fn;
}
