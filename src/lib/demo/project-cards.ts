// The landing demo's card details (plan 2026-11-08-public-landing-demo.md, step 5l-c): what a press on a card in the demo
// opens. A sibling of `project.ts` on its rules: it takes what `loadCardDetail` (the modal's own read, behind
// `getCardDetail`) returned for each card the demo can open, and gives what the modal draws, nothing else. Pure, so it is
// tested on synthetic input, and `scripts/demo-export.mts` is only the reads and the file write around it.
//
// Every field is classified (`KEEP` or `DROP`), and a field that is neither refuses the export: a field added to
// `BrowseCard` later is not shipped to every visitor until someone decides it is free to show.

import type { BrowseCard } from "../collection/browse";
import type { Projected } from "./projected";

/** One card's details as the demo opens them: `BrowseCard` less the account's own fields and the paid doors. */
export type DemoCardDetail = Omit<BrowseCard, DroppedField>;

/** The demo's card details, keyed by oracle id. */
export type DemoCardDetails = Record<string, DemoCardDetail>;

/**
 * The most bytes the card details may take, as compact JSON: the exporter refuses to write past it and the committed file's
 * test holds it. They are the largest step per card (every printing, each with its prices), and the file ships with the demo.
 * Widen it only with the measured figure in the PR that does.
 */
export const CARD_DETAILS_BUDGET = 400_000;

/**
 * Fields the modal draws from catalog rows and the fixture's own collection, decks and prices: free reads, and the
 * fixture's names (each still passes the exporter's name scans).
 */
const KEEP = [
  "kind", "tokenBuyUrl", "oracleId", "name", "typeLine", "manaCost", "cmc", "oracleText", "keywords", "rarity",
  "colorIdentity", "imageUri", "printedName", "foil", "layout", "backImageUri", "quantity", "facts", "comboPartner",
  "comboOtherPartners", "comboPartners", "cardCombos", "availability", "unownedAvailability", "proxiedBy", "prices",
  "printings", "setCodes", "primarySetCode", "preferredPrinting",
] as const satisfies readonly (keyof BrowseCard)[];

/**
 * Fields the demo never carries. `added`, `since`, `wishlist` and `draftWants` are the account's own history and plans.
 * `commanderLegal`, `hasDecks` and `fitsRead` open Find a deck, whose read is a paid model call: absent reads as closed
 * (`BrowseCard`), so the demo draws no door to it.
 */
const DROP = ["added", "since", "wishlist", "draftWants", "commanderLegal", "hasDecks", "fitsRead"] as const satisfies readonly (keyof BrowseCard)[];
type DroppedField = (typeof DROP)[number];

// Every field of `BrowseCard` is in exactly one list: a new field fails to compile here until it is classified.
type Unclassified = Exclude<keyof BrowseCard, (typeof KEEP)[number] | DroppedField>;
const _everyFieldClassified: [Unclassified] extends [never] ? true : Unclassified = true;
void _everyFieldClassified;

const kept = new Set<string>(KEEP);
const dropped = new Set<string>(DROP);

/**
 * The details for `ids`, in that order, from what `loadCardDetail` gave for each. Throws when a card the demo can open
 * has no details (a press would open a modal that fails), when one came back for another card, or when a read carries a
 * field neither list names (the type check's twin at run time, for a field a loader adds outside the type).
 */
export function projectCardDetails(ids: readonly string[], read: ReadonlyMap<string, BrowseCard | null>): DemoCardDetails {
  const out: DemoCardDetails = {};
  for (const id of ids) {
    const card = read.get(id);
    if (!card) throw new Error(`projectCardDetails: no details for ${id}, which the demo can open`);
    if (card.oracleId !== id) throw new Error(`projectCardDetails: the details read for ${id} are ${card.oracleId}'s`);
    const detail: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(card)) {
      if (kept.has(key)) detail[key] = value;
      else if (!dropped.has(key)) throw new Error(`projectCardDetails: ${id} carries "${key}", which is neither kept nor dropped`);
    }
    out[id] = detail as DemoCardDetail;
  }
  return out;
}

/**
 * Every card a press in the demo can open, in a fixed order, each once: the collection window's cards, Help me choose's
 * commanders, and each deck's commander and partner, which a press on its commander line opens. Taken from the projected
 * steps themselves, so a card the demo draws with a press ring and the card details exported for it cannot drift apart.
 */
export function demoCardIds(steps: Pick<Projected, "collection" | "choose" | "decks">): string[] {
  const ids = new Set<string>();
  for (const c of steps.collection.cards) ids.add(c.oracleId);
  for (const r of steps.choose?.page.rows ?? []) ids.add(r.oracleId);
  for (const deck of [steps.decks.played, steps.decks.over, steps.decks.under]) {
    ids.add(deck.commander.oracleId);
    if (deck.partner) ids.add(deck.partner.oracleId);
  }
  return [...ids];
}
