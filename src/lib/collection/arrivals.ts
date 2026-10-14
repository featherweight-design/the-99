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
import { placementsOf, type Placement } from "../decks/placements";
import { regrant } from "../decks/mark-bought";
import type { Availability } from "../decks/availability";

/** Copies held, per oracle id. */
export type OwnedCounts = Record<string, number>;

/** One deck's purchase, as `loadDeckBuyRows` returns it: a positive DEFICIT. */
export type BuyRow = { deckId: string; oracleId: string; quantity: number };

/**
 * What a claim read says about one arrived card. Version-shaped; see input 3.
 *
 * `committedDecks` counts CLAIMANTS, not copies, and it is what separates a contested card from
 * a merely short one: a chooser needs two decks to choose between.
 */
export type ArrivedClaimState = { owned: number; hard: number; committedDecks: number };

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
export type ContestedRow = {
  oracleId: string;
  arrived: number;
  /**
   * Copies held BEFORE this import. Frozen with the rest of the receipt, and what decides
   * between `keeps it` and `gets it` on a commander's option: `keeps it` says the deck had the
   * card before the import, which is false when the copy it is holding is the one that just
   * turned up.
   */
  ownedBefore: number;
};

/**
 * A committed deck this upload left shorter on one card, as the write's own deck check counted it
 * (`newlyShort` in `write.ts`, the rule behind the pre-confirm warning). VERSION-SHAPED, like the
 * warning: a brew was never covered, so it is never named here. Not a money row, and never summed
 * with one; `still` is draft-shaped and answers a different question.
 */
export type NowShortRow = { deckId: string; oracleId: string; short: number };

/**
 * Where one card's arrived copies went (version 4, plan `plan-added-copy-2026-10-12` G2), frozen
 * like the rest of the receipt: the line says where the copies went AT the import. A Change after
 * it redraws the row from the live chooser card, never from this.
 *
 * `held` when a deck holds a new copy (a committed deck by seniority, or any deck the player
 * picked); `soft` when the copy is loose and the brews listed read it as theirs; `none` when no
 * deck took one. Per card, not per (deck, card): three brews on one copy are one row.
 */
export type WentRow = {
  kind: "held" | "soft" | "none";
  /** Held: the decks that took copies, with how many and whether it was a pick. Soft: the brews. */
  decks: { deckId: string; copies: number; picked: boolean }[];
  /** Copies this import brought. */
  copies: number;
  /** Copies held before it: the chooser's `keeps it` reads it, as a contested row's does. */
  ownedBefore: number;
};

export type ArrivalsSummary = {
  /**
   * Bumped when the shape changes, so a stored payload stays readable by a later build.
   *
   * 2 adds `ContestedRow.ownedBefore`. A version-1 receipt has no such field, and the reader
   * treats its absence as nought — which makes `keeps it` unavailable on those rows rather than
   * wrong, the safe direction for a word that claims the deck had the card before the import.
   *
   * 3 adds `nowShort`. A version-2 receipt has none, and the reader treats its absence as no deck
   * named, which is what it was written as: those receipts never said.
   *
   * 4 adds `went`, written only while `ADDED_COPY_ENABLED` is on. A version-2 or 3 receipt has
   * none, and renders its `No longer to buy` rows per (deck, card) as it always did, with no Change.
   */
  version: 2 | 3 | 4;
  totalBefore: number;
  totalAfter: number;
  /** Copies gained and lost across the whole collection, not per deck. */
  arrived: number;
  left: number;
  issues: { unmatched: number; parseErrors: number };
  cleared: ClearedRow[];
  still: StillRow[];
  contested: ContestedRow[];
  /** Committed decks this upload left short. Absent on a version-2 receipt. */
  nowShort?: NowShortRow[];
  /** Where each arrived card's copies went, per card. Version 4 only. */
  went?: Record<string, WentRow>;
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
  /** The write's own deck check: committed decks the change left shorter. */
  nowShort: NowShortRow[];
  unmatched: UnmatchedLine[];
  parseErrorCount: number;
  cardNames: Record<string, string>;
  deckNames: Record<string, string>;
  /**
   * Who took each arrived card's copies (`placementsOf`), keyed by oracle id. Passed only while
   * `ADDED_COPY_ENABLED` is on; absent, the receipt is a version 3, byte for byte.
   */
  placements?: Record<string, Placement>;
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
  const unchanged: BuyRow[] = [];
  for (const [k, row] of b) {
    const now = a.get(k);
    if (!now) cleared.push({ deckId: row.deckId, oracleId: row.oracleId, copies: row.quantity });
    else if (now.quantity < row.quantity) reduced.push({ row: now, wanted: row.quantity });
    else if (now.quantity > row.quantity) raised.push(now);
    else unchanged.push(now);
  }
  for (const [k, row] of a) if (!b.has(k)) raised.push(row);
  return { cleared, reduced, raised, unchanged };
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

  const isUnmatched = (oracleId: string): boolean => {
    const name = input.cardNames[oracleId];
    return Boolean(name && failedNames.has(normalizeCardName(name)));
  };
  const reasonFor = (oracleId: string, fallback: StillReason): StillReason =>
    (isUnmatched(oracleId) ? { kind: "unmatched" } : fallback);

  const { cleared, reduced, raised, unchanged } = diffBuyRows(input.buyBefore, input.buyAfter);

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
    // A DEFICIT THAT DID NOT MOVE, but only when the card's own CSV line failed. An upload
    // can carry a valid copy of a card AND a duplicate line that failed to parse its name,
    // so the deck stays exactly as short as it was — no clear, no reduction, no rise — while
    // the reason the player can act on is sitting in the file. Every OTHER unchanged deficit
    // stays out: it is not news about this import, and the deck page has always shown it.
    ...unchanged
      .filter((row) => isUnmatched(row.oracleId))
      .map((row): StillRow => ({
        deckId: row.deckId,
        oracleId: row.oracleId,
        owed: row.quantity,
        reason: { kind: "unmatched" },
      })),
  ];

  // A card this import brought copies of, that more committed decks want than the
  // collection now holds. Arrivals only: a card that was already contested and did not
  // move is not news about this import, and the deck pages have always shown it.
  //
  // TWO DECKS, NOT TWO COPIES OF DEMAND. `hard > owned` is a shortage, which is a different
  // question: one committed deck asking for three Relentless Rats with one copy owned is short
  // by two and has nobody to be short AGAINST. Drawn as a contested row it would offer a single
  // option and no decision — a chooser with one choice. Its purchase is already reported in
  // `Still to buy`, which is where a shortage belongs.
  const contested: ContestedRow[] = [];
  for (const [oracleId, state] of Object.entries(claims)) {
    const delta = (ownedAfter[oracleId] ?? 0) - (ownedBefore[oracleId] ?? 0);
    if (delta > 0 && state.committedDecks > 1 && state.hard > state.owned) {
      contested.push({ oracleId, arrived: delta, ownedBefore: ownedBefore[oracleId] ?? 0 });
    }
  }

  const cards: Record<string, string> = {};
  const decks: Record<string, string> = {};
  for (const r of [...cleared, ...still, ...input.nowShort]) {
    const card = input.cardNames[r.oracleId];
    const deck = input.deckNames[r.deckId];
    if (card) cards[r.oracleId] = card;
    if (deck) decks[r.deckId] = deck;
  }
  for (const r of contested) {
    const card = input.cardNames[r.oracleId];
    if (card) cards[r.oracleId] = card;
  }

  let went: Record<string, WentRow> | undefined;
  if (input.placements) {
    went = {};
    for (const [oracleId, p] of Object.entries(input.placements)) {
      const arrivedHere = (ownedAfter[oracleId] ?? 0) - (ownedBefore[oracleId] ?? 0);
      if (arrivedHere <= 0) continue;
      const row = wentOf(p, arrivedHere, ownedBefore[oracleId] ?? 0);
      went[oracleId] = row;
      const card = input.cardNames[oracleId];
      if (card) cards[oracleId] = card;
      for (const d of row.decks) {
        const deck = input.deckNames[d.deckId];
        if (deck) decks[d.deckId] = deck;
      }
    }
  }

  return {
    version: went ? 4 : 3,
    totalBefore: total(ownedBefore),
    totalAfter: total(ownedAfter),
    arrived,
    left,
    issues: { unmatched: unmatched.length, parseErrors: input.parseErrorCount },
    cleared,
    still,
    contested,
    nowShort: input.nowShort,
    ...(went ? { went } : {}),
    names: { cards, decks },
  };
}

/**
 * Who took the copies an import brought, from ONE read after it: the allocation now against the
 * allocation over the copies held before, with the player's reservations granted as the claim
 * model would have granted them out of that smaller supply (`regrant`). So a pick this import
 * filled reads as `which you picked earlier`, not as seniority.
 *
 * `reservations` are this card's `card_assignments` rows OLDEST FIRST, `(created_at, deck_id)`:
 * the claim model's own order, which decides which of two reservations a smaller supply covers.
 * Never the claims' order, which is by deck name.
 */
export function arrivalPlacement(
  after: Pick<Availability, "owned" | "claims">,
  brought: number,
  reservations: readonly { deckId: string; copies: number }[],
): Placement {
  return placementsOf(regrant({ ...after, owned: Math.max(after.owned - brought, 0) }, reservations), after);
}

/** One card's placement, as the receipt freezes it. A deck that holds a copy wins over a soft read. */
export function wentOf(p: Placement, copies: number, ownedBefore: number): WentRow {
  if (p.held.length > 0) {
    return {
      kind: "held",
      decks: p.held.map(({ deckId, copies: c, picked }) => ({ deckId, copies: c, picked })),
      copies,
      ownedBefore,
    };
  }
  if (p.soft.length > 0) {
    return { kind: "soft", decks: p.soft.map(({ deckId }) => ({ deckId, copies: 0, picked: false })), copies, ownedBefore };
  }
  return { kind: "none", decks: [], copies, ownedBefore };
}

/** Nothing about the decks moved. The receipt still renders — see STATES 6. */
export function summaryIsEmpty(s: ArrivalsSummary): boolean {
  return s.cleared.length === 0 && s.still.length === 0 && s.contested.length === 0
    && (s.nowShort ?? []).length === 0;
}

/**
 * The money sections with the rows the chooser has taken over removed from them.
 *
 * A CONTESTED CARD IS REPORTED ONCE, in the section that decides it. The frozen payload and the
 * live contested read are computed from different questions, so one card reached both: the
 * receipt listed `Skyclave Relic` under `No longer to buy` against whichever deck seniority
 * favoured, while the chooser below was still asking which deck gets it. Picking the other deck
 * falsified the line above without touching it.
 *
 * AT THE READ, not at the write. The payload is a record of what one import did and stays
 * faithful to it; what changes is which of its rows a surface draws beside a live chooser. Doing
 * it here also repairs receipts written before this rule existed, which a write-time filter
 * could not reach — the payload is frozen the moment the confirm lands.
 *
 * BY DECK AND CARD, never by card alone, and the deck list is the chooser's OWN claimants. The
 * two sides count different decks: the money rows are draft-shaped, so a deck whose draft adds
 * the card has a row here while the version-shaped chooser never lists it as a claimant. Dropping
 * every row for the card would take that deck's only line off the receipt and leave its demand
 * reported nowhere at all.
 *
 * AN UNMATCHED ROW SURVIVES REGARDLESS. That row is about the FILE — a line whose name did not
 * parse — and the issues line at the top of the page promises that any deck still counting one of
 * those as a card to buy is marked below. The chooser draws no file-error marker, so excluding it would leave that
 * promise pointing at nothing.
 */
export function withoutUndecided(
  summary: ArrivalsSummary,
  undecided: { oracleId: string; deckIds: string[] }[],
): ArrivalsSummary {
  if (undecided.length === 0) return summary;
  const taken = new Map(undecided.map((u) => [u.oracleId, new Set(u.deckIds)]));
  const decided = (r: { oracleId: string; deckId: string }) =>
    !taken.get(r.oracleId)?.has(r.deckId);
  return {
    ...summary,
    cleared: summary.cleared.filter(decided),
    still: summary.still.filter((r) => r.reason.kind === "unmatched" || decided(r)),
  };
}
