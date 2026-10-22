import { bracketReach, type BracketReach } from "./bracket-reach";
import type { ComboEdge } from "./fill-gate";
import type { Bracket } from "./rank";
import { helpMeChooseCopy } from "../copy/help-me-choose";
import type { JoinMode } from "../commanders/filter";

/**
 * THE FORM'S HEADS-UP (bracket reach R1b, board A; Hugh's ruling, 2026-10-21): before a credit is
 * spent and before any commander exists, can the player's cards in these colors reach the bracket
 * asked for? Pure, and run in the browser: the form makes ONE read when it opens (`loadFormReach`),
 * and every change of colors, pool or bracket reruns this with no request.
 *
 * AN ESTIMATE, and every line says so: the commander can raise the deck (a commander that tutors,
 * or is a combo piece) or narrow it (its identity), so the hand-off reads the real reach again.
 *
 * THE COLLECTION ALONE. The form never names a card to buy (Hugh's ruling (a), 2026-10-22): it may
 * name one only when every result could offer it, and none can. A result's buying half draws from
 * its commander's own candidates; the one part every commander shares is the universal staples,
 * and the fill's staples step never seeds a Game Changer. So a short reach states what the player's
 * cards come to, and leaves the buy to the commander's own options, on the new deck.
 */

/** One owned card that can move a bracket, with every fact the rule reads about it. */
export type FormCard = {
  id: string;
  name: string;
  identity: string[];
  gameChanger: boolean;
  massLandDenial: boolean;
  extraTurn: boolean;
  /** A copy is free: not every copy is claimed by a committed deck. */
  free: boolean;
  /** Its counted two-card combos with other cards in the payload. */
  combos: ComboEdge[];
  searches: boolean;
  /** The payload cards its search can find. */
  reaches: string[];
};

export type FormReachData = { cards: FormCard[] };

/**
 * A card a commander these answers allow could play. Under Exactly the commander's identity IS the
 * picked colors; under Any (`contains`, `matchesColors`) it holds them and may hold more, so every
 * card is playable by some eligible commander, and the estimate is the widest one. No colors picked
 * reads all five, as the search does.
 */
function within(identity: readonly string[], colors: readonly string[], match: JoinMode): boolean {
  if (colors.length === 0 || match === "contains") return true;
  const allowed = new Set(colors.map((c) => c.toUpperCase()));
  return identity.every((c) => allowed.has(c.toUpperCase()));
}

export function formReach(args: {
  target: Bracket;
  colors: readonly string[];
  match: JoinMode;
  data: FormReachData;
}): BracketReach {
  const owned = args.data.cards.filter((c) => within(c.identity, args.colors, args.match));
  const ownedIds = new Set(owned.map((c) => c.id));
  const byId = new Map(owned.map((c) => [c.id, c]));
  return bracketReach({
    target: args.target,
    commanderIds: [],
    fixedIds: [],
    cards: owned.map((c) => c.id),
    facts: {
      flagsOf: (id) => {
        const c = byId.get(id);
        return { gameChanger: c?.gameChanger ?? false, massLandDenial: c?.massLandDenial ?? false, extraTurn: c?.extraTurn ?? false };
      },
      // Only edges between two cards both in these colors.
      combosOf: (id) => (byId.get(id)?.combos ?? []).filter((e) => ownedIds.has(e.partner)),
      searches: (id) => byId.get(id)?.searches ?? false,
      reaches: (s, p) => byId.get(s)?.reaches.includes(p) ?? false,
      free: (id) => byId.get(id)?.free ?? false,
      priceOf: () => null,
    },
    budgetCents: null,
    ownedOnly: true,
  });
}

/**
 * The Bracket field's caption, from 3 up (board A). Null below 3, where today's caption stands. A
 * deck that reaches the target says so; a short one says what a collection-only deck would be, and
 * that what reaching the target takes is the commander's to say, on the new deck.
 */
export function formReachCaption(args: {
  bracket: Bracket;
  colors: readonly string[];
  match: JoinMode;
  data: FormReachData;
}): { text: string; short: boolean } | null {
  const n = args.bracket;
  if (n < 3) return null;
  const copy = helpMeChooseCopy.intake.bracketReach;
  const where = copy.colorsWhere(args.match === "exactly", args.colors.length);
  const reach = formReach({ target: n, colors: args.colors, match: args.match, data: args.data });
  if (reach.kind !== "short") return reach.kind === "above" ? null : { text: copy.reached(n, where), short: false };
  return { text: copy.none(n, where, helpMeChooseCopy.results.rowBracketValue(reach.collectionPermits)), short: true };
}
