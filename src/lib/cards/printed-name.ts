// The name to print on a card the reader owns. DB-FREE ON PURPOSE, and that is the whole
// reason it is not in `owned-printings.ts` beside the resolution that produces the field:
// nine `"use client"` components value-import this helper, and that module reaches the
// collection reader. `src/lib/decks/status.ts` states the rule and
// `client-bundle-safety.test.ts` enforces the static half of it; this keeps the spirit as
// well, so no client graph holds a database reader for the sake of one string.
//
// `printedNameOf` and `printedFaceName` live here for the same reason (demo split 5a): the collection grid draws them, and a
// surface a signed-out visitor sees may not reach `src/lib/collection/`. `browse.ts` re-exports both, so no caller moves.

import { faceNames, isTwoFaced } from "./faces";

/**
 * The name to caption a commander with: the one printed on the copy the player owns
 * where they own a renamed printing, the oracle name otherwise.
 *
 * `printedNameOf` in the collection reader is the same rule for a `BrowseCard`, whose
 * `printedName` is a required field. Every deck surface carries it OPTIONALLY — the
 * fixtures across the suite build commander literals that never touch the catalog — so
 * this is the one place that absence is read as null, rather than at nine call sites.
 */
export function commanderDisplayName(c: { name: string; printedName?: string | null }): string {
  return c.printedName ?? c.name;
}

/**
 * The name to show a player looking at their own copy: the printing's own name
 * where it has one, the oracle name otherwise. One place, so no surface has to
 * remember which way round the fallback goes.
 */
export function printedNameOf(card: { name: string; printedName: string | null }): string {
  return card.printedName ?? card.name;
}

/**
 * The same name, cut to its front face — what a row or a tile shows.
 *
 * Scryfall's `flavor_name` is one string per printing and joins a two-faced
 * card's halves with ` // `, exactly as `cards.name` does, so a renamed modal
 * card arrives here as `Battle of Olympus // Aftermath`. A 93px tile caption
 * cannot hold that and locked decision 3 forbids the second line, so rows and
 * tiles take the front half and the modal keeps the whole string.
 *
 * The split is applied ONLY to a printed name on a card whose layout really has
 * two faces. `Fire // Ice` and `Bonecrusher Giant // Stomp` carry the separator
 * on one piece of card stock, so cutting them would drop half of a name the row
 * shows whole today — the same reason `isTwoFaced` asks the layout word instead
 * of looking for the mark. A card with no printed name is returned
 * byte-identically, `//` and all: the surfaces still reading this one draw no
 * `//` mark, so a front face alone would hide the back. The deck list, which
 * draws the mark, cuts every two-faced name through `deckRowName` instead.
 */
export function printedFaceName(
  card: { name: string; printedName: string | null; layout?: string | null },
): string {
  if (!card.printedName) return card.name;
  return isTwoFaced(card.layout) ? faceNames(card.printedName).front : card.printedName;
}
