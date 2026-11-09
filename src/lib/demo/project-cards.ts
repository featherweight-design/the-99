// The landing demo's card details (plan 2026-11-08-public-landing-demo.md, step 5l-c): what a press on a card in the demo
// opens. A sibling of `project.ts` on its rules: it takes what `loadCardDetail` (the modal's own read, behind
// `getCardDetail`) returned for each card the demo can open, and gives what the modal draws, nothing else. Pure, so it is
// tested on synthetic input, and `scripts/demo-export.mts` is only the reads and the file write around it.
//
// Every field is classified (`KEEP` or `DROP`), and a field that is neither refuses the export: a field added to
// `BrowseCard` later is not shipped to every visitor until someone decides it is free to show.

import type { BrowseCard } from "../collection/browse";
import { isLine } from "../tuning/state";
import type { Projected } from "./projected";

/** One card's details as the demo opens them: `BrowseCard` less the account's own fields and the paid doors. */
export type DemoCardDetail = Omit<BrowseCard, DroppedField>;

/** The demo's card details, keyed by oracle id. */
export type DemoCardDetails = Record<string, DemoCardDetail>;

/**
 * The most bytes the card details may take, as compact UTF-8 JSON (lane 21's target for the demo host): the exporter refuses to write past it and the committed file's
 * test holds it. They are the largest step per card (every printing, each with its prices), and the file ships with the demo.
 * Widen it only with the measured figure in the PR that does.
 */
export const CARD_DETAILS_BUDGET = 250_000;

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

/** The size of `encoded` as the file holds it: UTF-8 bytes of its compact JSON, so "Æther" counts its two-byte letter. */
export function utf8Bytes(encoded: unknown): number {
  return new TextEncoder().encode(JSON.stringify(encoded)).length;
}

/**
 * The reads inside a card's details that FAILED: `loadCardDetail` settles each side read to null rather than failing the
 * card, so a partly failed read still comes back, and would ship a modal with no prices or no copies block. Each null below
 * means "nobody answered", never "none" (`BrowseCard`). A token has no copies or proxies to read. The combos and bracket
 * facts reads cannot be told apart this way: each omits its field both when it failed and when there is nothing to draw.
 */
/** The basic-land test `loadAvailability`'s owned rows use (`type_line !~ '\mBasic\M'`). */
const BASIC = /\bBasic\b/;

export function failedReads(details: DemoCardDetails): string[] {
  const out: string[] = [];
  for (const [id, d] of Object.entries(details)) {
    const failed: string[] = [];
    if (d.prices === null) failed.push("prices");
    if (d.kind !== "token") {
      // A basic land has no availability at all: `loadAvailability` leaves basics out, so null there is an answer.
      if (d.quantity > 0 && d.availability == null && !BASIC.test(d.typeLine)) failed.push("availability");
      if (d.quantity === 0 && d.unownedAvailability === null) failed.push("unownedAvailability");
      if (d.proxiedBy === null) failed.push("proxiedBy");
    }
    if (failed.length > 0) out.push(`${d.name} (${id}): ${failed.join(", ")}`);
  }
  return out;
}

/**
 * Every deck id the details name: the decks holding copies (`availability`, `unownedAvailability`: `claims`), proxying it
 * (`proxiedBy`) and holding a combo partner's copies (`cardCombos`: `decks`). Walked by key, so a list of decks at any depth
 * is counted.
 */
export function deckIdsIn(details: DemoCardDetails): Set<string> {
  const ids = new Set<string>();
  const visit = (node: unknown, deckList: boolean) => {
    if (Array.isArray(node)) {
      for (const n of node) {
        if (deckList && n && typeof n === "object" && typeof (n as { id?: unknown }).id === "string") ids.add((n as { id: string }).id);
        visit(n, false);
      }
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) visit(v, DECK_LISTS.has(k));
    }
  };
  visit(details, false);
  return ids;
}

const DECK_LISTS = new Set(["claims", "proxiedBy", "decks"]);

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

type CardIdSteps = Pick<Projected, "collection" | "choose" | "decks" | "suggested" | "cuts" | "topOff" | "mana" | "fits">;

/** How many of Top off's ranked candidates the demo opens: the strip's first page. */
export const TOP_OFF_OPENABLE = 8;

/**
 * Whether a played-deck row carries a mark the demo draws a press ring on (step 4): a proxy, a copy the player does not own
 * (the buy tag), copies other decks hold or are short of, or a combo partner.
 */
function marked(row: Projected["decks"]["played"]["cards"][number]): boolean {
  const a = row.availability;
  const heldOrShort = a != null && (a.claims.length > 0 || a.hard + a.soft > a.owned);
  return row.proxied || !row.owned || heldOrShort || row.comboPartner != null;
}

/**
 * Every card a press in the demo can open, each once, in a fixed order (lane 21's list for 5l-c). Taken from the projected
 * steps themselves, so a card the demo draws with a press ring and the details exported for it cannot drift apart:
 *   - step 1: the collection window;
 *   - step 3: Help me choose's rows (step 2's commander rows open their public page instead, so none here);
 *   - step 4: each deck's commander and partner, the shopping rows that bill them, and in the played deck every marked
 *     row plus the first row of each type group (where the press ring lands), in the decklist's own order; no other row;
 *   - the cards a step's line names: Suggested changes' adds and cuts (6), Giada's named cuts, Top off's first
 *     `TOP_OFF_OPENABLE` candidates and Mana Balance's named cards (7), and Which deck's card (8).
 */
export function demoCardIds(steps: CardIdSteps): string[] {
  const ids = new Set<string>();
  for (const c of steps.collection.cards) ids.add(c.oracleId);
  for (const r of steps.choose?.page.rows ?? []) ids.add(r.oracleId);
  for (const deck of [steps.decks.played, steps.decks.over, steps.decks.under]) {
    ids.add(deck.commander.oracleId);
    if (deck.partner) ids.add(deck.partner.oracleId);
    for (const r of deck.commanderShopping) ids.add(r.oracleId);
  }
  const played = steps.decks.played;
  const rows = new Map(played.cards.map((r) => [r.oracleId, r]));
  const groups = new Set<string>();
  for (const { oracleId } of played.siblings) {
    const row = rows.get(oracleId);
    if (!row) continue;
    const first = !groups.has(row.cardTypeGroup);
    groups.add(row.cardTypeGroup);
    if (first || marked(row)) ids.add(oracleId);
  }
  for (const item of steps.suggested?.state.items ?? []) {
    if (isLine(item)) ids.add(item.cardOracleId);
    else ids.add(item.addOracleId).add(item.cutOracleId);
  }
  for (const item of steps.cuts.items) ids.add(item.cutOracleId);
  for (const c of steps.topOff.candidates.slice(0, TOP_OFF_OPENABLE)) ids.add(c.oracleId);
  for (const id of Object.values(steps.mana.ids)) ids.add(id);
  ids.add(steps.fits.card.oracleId);
  return [...ids];
}
