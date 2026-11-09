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
 * The card details' chunks (orchestrator's ruling 2026-11-09): every played-deck row opens its card, and 147 cards came to
 * 682 KB, 166 KB gzipped, in one chunk. So a press on a step loads only that step's cards: `binder` (the collection window,
 * Help me choose and Which deck's card), one chunk per deck step, and `shared` for a card more than one step opens (the
 * basic Mountain's 62 KB of printings, for one), fetched once beside whichever step's chunk is pressed first.
 */
export const CARD_CHUNKS = ["binder", "played", "over", "under", "shared"] as const;
export type DemoCardChunk = (typeof CARD_CHUNKS)[number];
/** A chunk a press loads, beside `shared`. */
export type DemoCardStep = Exclude<DemoCardChunk, "shared">;

/**
 * The most bytes each chunk may take, card details and deck combos together, as compact UTF-8 JSON: the exporter refuses to
 * write past one and the committed files' test holds them. Each is the measured figure plus about 5% (orchestrator's ruling);
 * widen one only with the measured figure in the PR that does.
 */
export const CARD_CHUNK_BUDGETS: Record<DemoCardChunk, number> = {
  // Measured 2026-11-09 on the fixture (lane 02's dry run, 147 cards): bytes, then gzipped.
  binder: 98_000, // 93,330, 21,552 (35 cards)
  played: 491_000, // 467,375, 120,155 (82 cards; the basic Mountain's printings are 62 KB of it)
  over: 33_000, // 31,171, 6,900 (7 cards)
  under: 90_000, // 85,163, 17,536 (21 cards)
  shared: 6_000, // 5,455, 2,207 (2 cards)
};

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
 * Where the card-details bytes go, for the export's log: each field's share across every card (its key and value as the
 * file holds them, largest first), and the largest cards. Takes the ENCODED details, the form the budget counts.
 */
export function cardDetailBytes(encoded: Record<string, Record<string, unknown>>, top = 5): { fields: [string, number][]; cards: [string, number][] } {
  const fields = new Map<string, number>();
  const cards: [string, number][] = [];
  for (const [id, card] of Object.entries(encoded)) {
    for (const [k, v] of Object.entries(card)) fields.set(k, (fields.get(k) ?? 0) + utf8Bytes({ [k]: v }) - 2);
    cards.push([typeof card.name === "string" ? `${card.name} (${id})` : id, utf8Bytes(card)]);
  }
  const desc = (a: [string, number], b: [string, number]) => b[1] - a[1];
  return { fields: [...fields].sort(desc), cards: cards.sort(desc).slice(0, top) };
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
 * is counted. Takes any tree, so the committed file's own decks can be listed the same way.
 */
export function deckIdsIn(details: unknown): Set<string> {
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
 * Every card a press in the demo can open, each once, in a fixed order (lane 21's list for 5l-c). Taken from the projected
 * steps themselves, so a card the demo draws with a press ring and the details exported for it cannot drift apart:
 *   - step 1: the collection window;
 *   - step 3: Help me choose's rows (step 2's commander rows open their public page instead, so none here);
 *   - step 4: each deck's commander and partner, the shopping rows that bill them, and every row of the played deck, in
 *     the decklist's own order: step 4 draws the whole list, and every row's View details opens its card (lane 21, 5l-d);
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
  for (const id of playedRowIds(steps.decks.played)) ids.add(id);
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

/** The played deck's rows, every one, in decklist order (its siblings, less the commanders, which are not rows). */
function playedRowIds(played: Projected["decks"]["played"]): string[] {
  const rows = new Set(played.cards.map((r) => r.oracleId));
  return played.siblings.map((s) => s.oracleId).filter((id) => rows.has(id));
}

/**
 * The cards a press opens FROM a deck step, by the deck it opens them in (lane 21's host): a modal opened on a deck's page reads
 * its combos against that deck (`comboScopeIds`), so these are the cards `deckCombos` is read for. Each deck's commanders and the
 * shopping rows that bill them; the played deck's rows and Suggested changes' cards (steps 4 to 6); the over deck's named
 * cuts; the under deck's Top off candidates and Mana Balance cards (step 7). Collection, Help me choose and Which deck's card
 * open off any deck, so they are not here.
 */
export function demoDeckCardIds(steps: CardIdSteps): Record<DeckRole, string[]> {
  const own = (deck: Projected["decks"][DeckRole]) => [
    deck.commander.oracleId,
    ...(deck.partner ? [deck.partner.oracleId] : []),
    ...deck.commanderShopping.map((r) => r.oracleId),
  ];
  const suggested = (steps.suggested?.state.items ?? []).flatMap((item) => isLine(item) ? [item.cardOracleId] : [item.addOracleId, item.cutOracleId]);
  const unique = (ids: string[]) => [...new Set(ids)];
  return {
    played: unique([...own(steps.decks.played), ...playedRowIds(steps.decks.played), ...suggested]),
    over: unique([...own(steps.decks.over), ...steps.cuts.items.map((i) => i.cutOracleId)]),
    under: unique([
      ...own(steps.decks.under),
      ...steps.topOff.candidates.slice(0, TOP_OFF_OPENABLE).map((c) => c.oracleId),
      ...Object.values(steps.mana.ids),
    ]),
  };
}

/** The cards each step's chunk opens, before the cards two steps share move to `shared` (`chunkCardIds`). */
export function demoStepCardIds(steps: CardIdSteps): Record<DemoCardStep, string[]> {
  const binder = [...new Set([
    ...steps.collection.cards.map((c) => c.oracleId),
    ...(steps.choose?.page.rows ?? []).map((r) => r.oracleId),
    steps.fits.card.oracleId,
  ])];
  return { binder, ...demoDeckCardIds(steps) };
}

/** Each chunk's cards: a card one step opens goes in that step's chunk, a card two or more steps open goes in `shared`. */
export function chunkCardIds(steps: CardIdSteps): Record<DemoCardChunk, string[]> {
  const byStep = demoStepCardIds(steps);
  const names = Object.keys(byStep) as DemoCardStep[];
  const count = new Map<string, number>();
  for (const step of names) for (const id of byStep[step]) count.set(id, (count.get(id) ?? 0) + 1);
  const out = { shared: [] } as unknown as Record<DemoCardChunk, string[]>;
  for (const step of names) out[step] = byStep[step].filter((id) => count.get(id) === 1);
  out.shared = [...count].filter(([, n]) => n > 1).map(([id]) => id);
  return out;
}

/** A deck step's combos for a card, where they differ from the card's own: null when the deck's read finds none. */
export type DemoDeckCombo = NonNullable<DemoCardDetail["cardCombos"]> | null;

/** Per deck role, the cards whose combos read differently from that deck (`demoDeckCardIds`); the host lays
 *  `deckCombos[role][id]` over `cardDetails[id].cardCombos` for a press from that deck's step. */
export type DemoDeckCombos = Record<DeckRole, Record<string, DemoDeckCombo>>;

/** What the card-details chunk holds (`card-details.ts`): every card a press opens, and the deck steps' combo overrides. */
export type DemoCardData = { cardDetails: DemoCardDetails; deckCombos: DemoDeckCombos };

/** The overrides worth shipping: a deck's read of a card's combos, kept only where it is not what `cardDetails` already says. */
export function deckComboOverrides(details: DemoCardDetails, scoped: Record<DeckRole, ReadonlyMap<string, DemoDeckCombo>>): DemoDeckCombos {
  const out = { played: {}, over: {}, under: {} } as DemoDeckCombos;
  for (const role of ROLES) {
    for (const [id, combos] of scoped[role]) {
      if (!Object.hasOwn(details, id)) throw new Error(`deck combos: ${id} has no card details`);
      if (JSON.stringify(combos) !== JSON.stringify(details[id].cardCombos ?? null)) out[role][id] = combos;
    }
  }
  return out;
}

type DeckRole = "played" | "over" | "under";
const ROLES: readonly DeckRole[] = ["played", "over", "under"];

/** What a merge reads back from a fresh fixture for free to compare with the committed file: the collection window, and each
 *  deck's commanders and rows (`deck_cards`: card and copies). */
export type FreshCardSet = {
  collectionIds: readonly string[];
  commanders: Record<DeckRole, { commander: string; partner: string | null }>;
  deckRows: Record<DeckRole, readonly { oracleId: string; quantity: number }[]>;
};

const rowKey = (rows: readonly { oracleId: string; quantity: number }[]) => rows.map((r) => `${r.oracleId}x${r.quantity}`).sort().join(",");

/**
 * What differs between the committed file and a fresh fixture, over the cards a merge can recompute (`FreshCardSet`). A merge
 * (`demo:export --merge=cardDetails`) takes its card set from the committed file, so details read from a fixture whose
 * collection or decks have drifted would describe cards other than the ones the file draws: any difference refuses it.
 */
export function cardSetDrift(committed: Pick<Projected, "collection" | "decks">, fresh: FreshCardSet): string[] {
  const out: string[] = [];
  const was = committed.collection.cards.map((c) => c.oracleId);
  if (was.length !== fresh.collectionIds.length || was.some((id, i) => id !== fresh.collectionIds[i])) {
    out.push(`the collection window is not the committed one (${was.length} committed, ${fresh.collectionIds.length} now)`);
  }
  for (const role of ROLES) {
    const deck = committed.decks[role];
    const now = fresh.commanders[role];
    if (deck.commander.oracleId !== now.commander || (deck.partner?.oracleId ?? null) !== now.partner) {
      out.push(`the ${role} deck's commanders are not the committed ones`);
    }
    if (rowKey(deck.cards) !== rowKey(fresh.deckRows[role])) out.push(`the ${role} deck's cards are not the committed ones`);
  }
  return out;
}

/**
 * Where details read on a fresh fixture disagree with what the committed file draws beside them: a collection card's copies,
 * and a deck row's copies and claims (`owned`, and which decks claim how many). A press ring drawn from the committed file
 * must open a modal that says the same thing, so any disagreement refuses a merge. Basics carry no availability on either
 * side and are skipped.
 *
 * The two sides are read from different vantages. A deck row's availability is its own deck's (`loadAvailability` with
 * `excludeDeckId`): that deck is out of its claims, and its `hard`, `soft` and `free` are worked out against seniority and
 * grants. A card detail reads with no vantage, every deck in. So the detail's claims, less the row's own deck, must be the
 * row's claims exactly; `hard`, `soft` and `free` cannot be compared, since no figure here re-derives the excluded form.
 */
export function detailsDisagree(committed: Pick<Projected, "collection" | "decks">, details: DemoCardDetails): string[] {
  const out: string[] = [];
  for (const c of committed.collection.cards) {
    const d = details[c.oracleId];
    if (d && d.quantity !== c.quantity) out.push(`${c.oracleId}: ${d.quantity} copies now, ${c.quantity} in the collection window`);
  }
  for (const role of ROLES) {
    const deck = committed.decks[role];
    const claims = (x: { claims: { id: string; quantity: number }[] }) =>
      x.claims.filter((c) => c.id !== deck.id).map((c) => `${c.id}x${c.quantity}`).sort().join(",");
    for (const row of deck.cards) {
      const a = row.availability;
      const b = details[row.oracleId]?.availability;
      if (!a || !b) continue;
      if (a.owned !== b.owned || claims(a) !== claims(b)) {
        out.push(`${row.oracleId}: its copies or claims are not what the ${role} deck's row draws`);
      }
    }
  }
  return out;
}

