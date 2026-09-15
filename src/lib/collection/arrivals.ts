/**
 * What one collection replace did to the decks, as a receipt.
 *
 * Pure over four inputs, so every rule here is unit-testable and none of it needs a
 * database. `confirmUpload` gathers the inputs either side of the replace and stores
 * the result on `csv_uploads.summary_payload`.
 *
 * WHY FOUR INPUTS AND NOT ONE. Each answers a question none of the others can:
 *
 * 1. OWNED COUNTS, per oracle, before and after. `DeckBuyRow.quantity` is a positive
 *    deficit, so a deck owing one copy reads `[{quantity: 1}]` before and `[]` after
 *    whether one copy arrived or five. The summary says how many arrived, so it has
 *    to read what arrived.
 * 2. BUY ROWS, before and after. Which decks stopped owing, and which started —
 *    diffed by `(deckId, oracleId)` AND quantity, because a deficit falling 2 to 1 is
 *    a real arrival that a membership-only diff reports as nothing at all.
 * 3. CLAIMS on the arrived cards. Contention is a question about committed claims,
 *    and a fully funded deck has no buy row — so the senior holder disappears from
 *    the buy rows exactly when there is something to choose between.
 * 4. THE UPLOAD'S OWN PROBLEMS. A card whose CSV line failed to match did not
 *    arrive, so its deck keeps billing it — but the remedy is *fix the file*, not
 *    *buy the card*, and only the preview payload knows which names failed.
 *
 * WHOSE DEMAND. The buy rows are DRAFT-shaped: `loadDeckBuyRows` builds its claims
 * from live `deck_cards`, so they include a deck's draft adds and exclude its pending
 * removals even when its committed version is untouched. That is the right source for
 * "what will this deck have to buy", which is what the money sections answer. It is
 * the wrong source for contention, which is about hard claims — hence input 3, which
 * is version-shaped. The two can legitimately disagree about one card, and the
 * summary's copy must never imply a sum across them.
 *
 * PARSE ERRORS ARE COUNTED, NEVER ATTRIBUTED. A `ParseError` carries a line number and
 * a reason and no card name, so there is nothing to join a still-owed row to. They
 * reach the reader through the issues line alone.
 */

import { normalizeCardName } from "./match";

/** Copies held, per oracle id. */
export type OwnedCounts = Record<string, number>;

/** One deck's purchase, as `loadDeckBuyRows` returns it: a positive DEFICIT. */
export type BuyRow = { deckId: string; oracleId: string; quantity: number };

/** What a claim read says about one arrived card. Version-shaped; see input 3. */
export type ArrivedClaimState = { owned: number; hard: number };

/** A CSV line whose name matched no card. Carries no oracle id — that is what unmatched means. */
export type UnmatchedLine = { name: string; line: number };

/**
 * Why a deck still owes a card. `partly` and `gone` come out of the buy-row diff;
 * `unmatched` overrides both, because it is the only one the player can act on
 * without buying anything.
 */
export type StillReason =
  | { kind: "partly"; arrived: number; wanted: number }
  | { kind: "gone" }
  | { kind: "unmatched" };

export type ClearedRow = { deckId: string; oracleId: string; copies: number };
export type StillRow = { deckId: string; oracleId: string; owed: number; reason: StillReason };
/**
 * A card more committed decks want than the collection now holds. The claimants are
 * NOT stored: a reservation can be made or moved after this payload is written, so the
 * row's allocation is read live. What is frozen is which cards this import left
 * contested, and how many copies of each it brought.
 */
export type ContestedRow = { oracleId: string; arrived: number };

export type ArrivalsSummary = {
  /** Bumped when the shape changes, so a stored payload stays readable by a later build. */
  version: 1;
  totalBefore: number;
  totalAfter: number;
  /** Copies gained and lost across the whole collection, not per deck. */
  arrived: number;
  left: number;
  issues: { unmatched: number; parseErrors: number };
  cleared: ClearedRow[];
  still: StillRow[];
  contested: ContestedRow[];
  /**
   * Frozen names for the rows above. A card renamed in the catalog later must not
   * rewrite a receipt, and a deck deleted later still has to render its own row.
   */
  names: { cards: Record<string, string>; decks: Record<string, string> };
};

export type ArrivalsInput = {
  ownedBefore: OwnedCounts;
  ownedAfter: OwnedCounts;
  buyBefore: BuyRow[];
  buyAfter: BuyRow[];
  /** Keyed by oracle id, for the arrived cards only. */
  claims: Record<string, ArrivedClaimState>;
  unmatched: UnmatchedLine[];
  parseErrorCount: number;
  cardNames: Record<string, string>;
  deckNames: Record<string, string>;
};

const key = (r: BuyRow) => `${r.deckId} ${r.oracleId}`;

/**
 * Quantity-aware, not membership-aware. A row present in both sets with a smaller
 * deficit is an arrival; a membership diff sees no change at all and the summary would
 * report nothing for a card that really did turn up.
 */
function diffBuyRows(before: BuyRow[], after: BuyRow[]) {
  const b = new Map(before.map((r) => [key(r), r]));
  const a = new Map(after.map((r) => [key(r), r]));
  const cleared: ClearedRow[] = [];
  const reduced: { row: BuyRow; wanted: number }[] = [];
  const raised: BuyRow[] = [];
  for (const [k, row] of b) {
    const now = a.get(k);
    if (!now) cleared.push({ deckId: row.deckId, oracleId: row.oracleId, copies: row.quantity });
    else if (now.quantity < row.quantity) reduced.push({ row: now, wanted: row.quantity });
    else if (now.quantity > row.quantity) raised.push(now);
  }
  for (const [k, row] of a) if (!b.has(k)) raised.push(row);
  return { cleared, reduced, raised };
}

/** Total copies across a collection snapshot. */
function total(owned: OwnedCounts): number {
  let n = 0;
  for (const q of Object.values(owned)) n += q;
  return n;
}

export function buildArrivalsSummary(input: ArrivalsInput): ArrivalsSummary {
  const { ownedBefore, ownedAfter, claims, unmatched } = input;

  let arrived = 0;
  let left = 0;
  for (const oracleId of new Set([...Object.keys(ownedBefore), ...Object.keys(ownedAfter)])) {
    const delta = (ownedAfter[oracleId] ?? 0) - (ownedBefore[oracleId] ?? 0);
    if (delta > 0) arrived += delta;
    else left += -delta;
  }

  // Normalised, because a CSV line that failed to match is joined to a row by NAME —
  // there is no id to join on. The importer's own normaliser, so a `Fire // Ice`
  // spelled `Fire/Ice` in the file still lines up with its card.
  const failedNames = new Set(unmatched.map((u) => normalizeCardName(u.name)));

  const reasonFor = (oracleId: string, fallback: StillReason): StillReason => {
    const name = input.cardNames[oracleId];
    if (name && failedNames.has(normalizeCardName(name))) return { kind: "unmatched" };
    return fallback;
  };

  const { cleared, reduced, raised } = diffBuyRows(input.buyBefore, input.buyAfter);

  const still: StillRow[] = [
    ...reduced.map(({ row, wanted }): StillRow => ({
      deckId: row.deckId,
      oracleId: row.oracleId,
      owed: row.quantity,
      reason: reasonFor(row.oracleId, {
        kind: "partly",
        arrived: wanted - row.quantity,
        wanted,
      }),
    })),
    ...raised.map((row): StillRow => ({
      deckId: row.deckId,
      oracleId: row.oracleId,
      owed: row.quantity,
      reason: reasonFor(row.oracleId, { kind: "gone" }),
    })),
  ];

  // A card this import brought copies of, that more committed decks want than the
  // collection now holds. Arrivals only: a card that was already contested and did not
  // move is not news about this import, and the deck pages have always shown it.
  const contested: ContestedRow[] = [];
  for (const [oracleId, state] of Object.entries(claims)) {
    const delta = (ownedAfter[oracleId] ?? 0) - (ownedBefore[oracleId] ?? 0);
    if (delta > 0 && state.hard > state.owned) contested.push({ oracleId, arrived: delta });
  }

  const cards: Record<string, string> = {};
  const decks: Record<string, string> = {};
  for (const r of [...cleared, ...still]) {
    const card = input.cardNames[r.oracleId];
    const deck = input.deckNames[r.deckId];
    if (card) cards[r.oracleId] = card;
    if (deck) decks[r.deckId] = deck;
  }
  for (const r of contested) {
    const card = input.cardNames[r.oracleId];
    if (card) cards[r.oracleId] = card;
  }

  return {
    version: 1,
    totalBefore: total(ownedBefore),
    totalAfter: total(ownedAfter),
    arrived,
    left,
    issues: { unmatched: unmatched.length, parseErrors: input.parseErrorCount },
    cleared,
    still,
    contested,
    names: { cards, decks },
  };
}

/** Nothing about the decks moved. The receipt still renders — see STATES 6. */
export function summaryIsEmpty(s: ArrivalsSummary): boolean {
  return s.cleared.length === 0 && s.still.length === 0 && s.contested.length === 0;
}
