/**
 * The Consider filter (card labels item 7, item 1; Hugh's ruling 2026-10-04: role agreement). Pure: the
 * deck page reads the labels, and this decides which picks to drop.
 *
 * Only a ROLE-GAP pick can be dropped (`reasonType === "role"`): `suggestDeck` chose it from the owned
 * pool by its TEXT role alone, with no evidence this commander plays it. The text classifier counts a
 * graveyard exile as removal, cycling or a Clue as draw, and mana that lasts until end of combat as
 * ramp; a fresh label that names no job of the role the pick fills says the card does not fill it.
 * An EDHREC pick, owned or a Top pick, is never dropped: EDHREC measured it in this commander's decks.
 *
 * Measured read-only on staging's 22 decks (2026-10-04): 14 role picks dropped, 13 of them correctly.
 * The alternative ruled out, dropping a pick whose label is irrelevant to the deck's types, dropped 0.
 *
 * Every rule here is "the label is present AND names no job of this role". A card with no fresh label
 * is kept exactly as today, and so is a land face, which is a land drop whatever its label says
 * (Escape Tunnel's label names ramp and evasion, and it was a land pick 21 times).
 */
import { isLandFace } from "../cards/facet";
import type { Suggestion } from "../decks/suggest";
import type { Job } from "./types";

/** The label kinds that fill each role. A counterspell takes a spell away, so it fills removal. */
const FILLS: Record<Exclude<Suggestion["reason"], "edhrec">, readonly string[]> = {
  ramp: ["ramp"],
  draw: ["draw"],
  removal: ["removal", "counterspell"],
  wipes: ["wipes"],
  land: ["land"],
};

/** True only when the card HAS a fresh label and none of its jobs is a kind that fills `role`. */
export function labelDisagrees(
  jobs: readonly Job[] | undefined,
  card: { typeLine: string },
  role: Suggestion["reason"],
): boolean {
  if (role === "edhrec") return false;
  if (jobs === undefined || jobs.length === 0) return false;
  if (isLandFace(card.typeLine)) return false;
  return !jobs.some((j) => FILLS[role].includes(j.kind));
}

/**
 * The suggestions with every role-gap pick whose fresh label disagrees with its role left out. A pick is
 * a role-gap pick exactly when its `reason` is a role (`suggest.ts` sets `reasonType` from it), and
 * `labelDisagrees` never judges the `edhrec` reason, so EDHREC and Top picks always stay.
 */
export function filterConsider<T extends { oracleId: string; reason: Suggestion["reason"]; typeLine: string }>(
  suggestions: readonly T[],
  labels: ReadonlyMap<string, readonly Job[]>,
): T[] {
  return suggestions.filter((s) => !labelDisagrees(labels.get(s.oracleId), s, s.reason));
}
