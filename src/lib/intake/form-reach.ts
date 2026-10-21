import { bracketReach, type BracketReach } from "./bracket-reach";
import type { ComboEdge } from "./fill-gate";
import type { Bracket } from "./rank";
import { helpMeChooseCopy } from "../copy/help-me-choose";

/**
 * THE FORM'S HEADS-UP (bracket reach R1b, board A; Hugh's ruling, 2026-10-21): before a credit is
 * spent and before any commander exists, can the player's cards in these colors reach the bracket
 * asked for, and what would hitting it cost? Pure, and run in the browser: the form makes ONE read
 * when it opens (`loadFormReach`), and every change of colors, pool, budget or bracket reruns this
 * with no request.
 *
 * AN ESTIMATE, and every line says so: the commander can raise the deck (a commander that tutors,
 * or is a combo piece) or narrow it (its identity), so the hand-off reads the real reach again.
 *
 * Its two halves are the plan's: the COLLECTION is the player's own bracket-moving cards, each with
 * its own facts; BUYING is the catalog's Game Changers alone, with a live price. A buy route through
 * a combo or a tutor depends on what the commander's support list offers, which the form cannot know.
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

/** A catalog Game Changer and its live price, in cents. */
export type BuyCard = { id: string; name: string; identity: string[]; priceCents: number };

export type FormReachData = { cards: FormCard[]; buyable: BuyCard[] };

/** Inside the picked colors; no colors picked reads all five, as the search does. */
function within(identity: readonly string[], colors: readonly string[]): boolean {
  if (colors.length === 0) return true;
  const allowed = new Set(colors.map((c) => c.toUpperCase()));
  return identity.every((c) => allowed.has(c.toUpperCase()));
}

export function formReach(args: {
  target: Bracket;
  colors: readonly string[];
  data: FormReachData;
  budgetCents: number | null;
}): BracketReach {
  const owned = args.data.cards.filter((c) => within(c.identity, args.colors));
  const ownedIds = new Set(owned.map((c) => c.id));
  // A free copy is the collection's; a claimed one is bought like any other, at its live price.
  const freeIds = new Set(owned.filter((c) => c.free).map((c) => c.id));
  const buyable = args.data.buyable.filter((c) => within(c.identity, args.colors) && !freeIds.has(c.id));
  const byId = new Map(owned.map((c) => [c.id, c]));
  const prices = new Map(buyable.map((c) => [c.id, c.priceCents]));
  const gameChangers = new Set(buyable.map((c) => c.id));
  return bracketReach({
    target: args.target,
    commanderIds: [],
    fixedIds: [],
    cards: [...new Set([...owned.map((c) => c.id), ...buyable.map((c) => c.id)])],
    facts: {
      flagsOf: (id) => {
        const c = byId.get(id);
        return c
          ? { gameChanger: c.gameChanger, massLandDenial: c.massLandDenial, extraTurn: c.extraTurn }
          : { gameChanger: gameChangers.has(id), massLandDenial: false, extraTurn: false };
      },
      // Only edges between two cards both in these colors.
      combosOf: (id) => (byId.get(id)?.combos ?? []).filter((e) => ownedIds.has(e.partner)),
      searches: (id) => byId.get(id)?.searches ?? false,
      reaches: (s, p) => byId.get(s)?.reaches.includes(p) ?? false,
      free: (id) => byId.get(id)?.free ?? false,
      priceOf: (id) => prices.get(id) ?? null,
    },
    budgetCents: args.budgetCents,
    // The buying half is offered under own-only too (Design R1b: the card from outside the collection).
    ownedOnly: false,
  });
}

/** The names a reach's card ids stand for, in order. */
export function formNames(ids: readonly string[], data: FormReachData): string[] {
  const names = new Map([...data.cards, ...data.buyable].map((c) => [c.id, c.name]));
  return ids.flatMap((id) => names.get(id) ?? []);
}

/**
 * The Bracket field's caption, from 3 up (board A). Null below 3, where today's caption stands. A
 * deck that reaches the target says so; a short one says what a collection-only deck would be and,
 * when a stocked Game Changer gets there, what hitting the target costs, against the budget when it
 * is over it. Whole dollars, as the rows draw them.
 */
export function formReachCaption(args: {
  bracket: Bracket;
  colors: readonly string[];
  data: FormReachData;
  budgetDollars: number | null;
  ownedOnly: boolean;
}): { text: string; short: boolean } | null {
  const n = args.bracket;
  if (n < 3) return null;
  const copy = helpMeChooseCopy.intake.bracketReach;
  const reach = formReach({ target: n, colors: args.colors, data: args.data, budgetCents: args.budgetDollars === null ? null : args.budgetDollars * 100 });
  if (reach.kind !== "short") return reach.kind === "above" ? null : { text: copy.reached(n), short: false };
  const lands = helpMeChooseCopy.results.rowBracketValue(reach.collectionPermits);
  if (!reach.buy) return { text: copy.none(n, lands), short: true };
  const price = dollars(reach.buy.buyCents);
  if (reach.buy.overBudget && args.budgetDollars !== null) {
    return { text: copy.shortOver(n, lands, price, `$${args.budgetDollars.toLocaleString("en-US")}`), short: true };
  }
  // Only the cards to BUY are named or counted: a free Game Changer in the set is the player's already.
  const free = new Set(args.data.cards.filter((c) => c.free).map((c) => c.id));
  const names = formNames(reach.buy.raisers.filter((id) => !free.has(id)), args.data);
  return { text: args.ownedOnly ? copy.shortOwn(n, lands, names, price) : copy.shortBuy(n, lands, names, price), short: true };
}

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;
