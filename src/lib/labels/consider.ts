/**
 * The Consider filter (card labels item 7, item 1). Pure: the deck page reads the labels and the lens,
 * and this decides which picks to drop.
 *
 * Only a ROLE-GAP pick can be dropped (`reasonType === "role"`): `suggestDeck` chose it from the whole
 * owned pool by its text role alone, with no evidence this commander plays it, which is where an Elf
 * mana dork "fills ramp" in a Dinosaur deck. An EDHREC pick, owned or a Top pick, is never dropped:
 * EDHREC measured it in this commander's decks.
 *
 * Every rule here is "the label is present AND says the card does nothing for this deck". A card with
 * no fresh label is kept exactly as today.
 */
import type { ReasonType } from "../decks/suggest";
import { isLandFace } from "../cards/facet";
import type { DeckLens } from "../swaps/honest";
import { relevant } from "./match";
import type { Job } from "./types";

/**
 * True only when the card HAS a fresh label and every job fails `relevant()` under the deck's lens AND
 * under the lens keyed on each of the commanders' own creature types. The commander's types count
 * because a deck still being built has no key type until five creatures share one
 * (`keyCreatureType`), and an Elf payoff is not irrelevant to an Elf commander's deck of three Elves.
 * A land face is never irrelevant: it is a land drop whatever its label says.
 *
 * Reads `relevant()` per job directly, not `jobsByKey`, which also discards `land` keys and a ramp
 * job with no `rampKind` for reasons that have nothing to do with this deck.
 */
export function considerIrrelevant(
  jobs: readonly Job[] | undefined,
  card: { typeLine: string },
  lens: DeckLens,
  commanderTypes: readonly string[],
  isCreatureType: (w: string) => boolean,
): boolean {
  if (jobs === undefined || jobs.length === 0) return false;
  if (isLandFace(card.typeLine)) return false;
  const lenses = [lens, ...commanderTypes.map((t) => ({ ...lens, keyType: t }))];
  return !jobs.some((j) => lenses.some((l) => relevant(j, l, isCreatureType)));
}

/** The suggestions with every role-gap pick whose fresh label proves it irrelevant left out. */
export function filterConsider<T extends { oracleId: string; reasonType: ReasonType; typeLine: string }>(
  suggestions: readonly T[],
  labels: ReadonlyMap<string, readonly Job[]>,
  lens: DeckLens,
  commanderTypes: readonly string[],
  isCreatureType: (w: string) => boolean,
): T[] {
  return suggestions.filter((s) =>
    s.reasonType !== "role"
    || !considerIrrelevant(labels.get(s.oracleId), s, lens, commanderTypes, isCreatureType));
}
