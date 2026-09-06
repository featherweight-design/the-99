// Updating a deck from a list — the diff, and nothing else (#277).
//
// Pure like import.ts and for the same reason: every ruling below is a decision
// with a cost if it regresses, and purity makes each one a unit test rather than
// an integration one. This module reads a parsed `DeckImport` and the deck as it
// stands, and answers one question — what would change. It writes nothing and
// decides nothing about persistence.
//
// The plan is computed twice on purpose. The client renders one to draw the
// diff; the server re-parses the same text and re-plans on Apply, and the only
// thing the client contributes is the `keep` array. Trusting a client-computed
// plan would let a crafted request delete an arbitrary set of a deck's cards.

import type { DeckImport } from "./import";

/** The deck as the planner needs it: one row per card, with the flag that
 *  decides whether a removal gets the "you added this" marker. */
export type DeckUpdateCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  quantity: number;
  /** False for a hand-add *and* for a previous import's rows — which is why the
   *  copy says "you added this" rather than "by hand". */
  auto: boolean;
};

export type DeckUpdateRow = {
  oracleId: string;
  name: string;
  /** The list line that named this card, for a row going in. Null for a removal
   *  and for an unchanged row: neither came from a line the player can look up. */
  sourceLine: number | null;
  /** The diff's rows carry it; the planner only passes it through. */
  typeLine: string;
  /** The quantity the deck lands on. For a removal, what is being taken out. */
  quantity: number;
  auto: boolean;
};

export type DeckUpdatePlan = {
  /** In the deck, not named by the list. The only group with a decision in it. */
  out: DeckUpdateRow[];
  /** Named by the list, not in the deck. */
  in: DeckUpdateRow[];
  /** In both. A quantity change on a basic lands here and reconciles silently. */
  unchanged: DeckUpdateRow[];
  /** The list's unnamed lines. They replace the deck's existing unresolved rows
   *  wholesale rather than merging — the list is the deck now, and a line the
   *  new list does not carry is not a line the deck is still missing. */
  unresolved: DeckImport["unresolved"];
  /** How many of `out` the player added themselves. Drives the one clause in the
   *  group's sentence that explains why the group is first. */
  handAddedOut: number;
  /** True when the plan would write nothing at all. */
  noChange: boolean;
};

/** The commander a list declares, when it is not this deck's. The flow refuses
 *  the update rather than swapping: changing the commander re-decides the
 *  colours and the legality of all ninety-nine. */
export type DeckUpdateConflict = { listCommander: string };

/**
 * Compares a parsed list against a deck.
 *
 * Returns a conflict instead of a plan when the list *declares* a commander that
 * is not this deck's. A list that merely happens to contain a legend does not
 * conflict — `legendaryCandidates` is a picker's shortlist, not a declaration,
 * and refusing on it would break every deck whose 99 includes a legend.
 */
export function planDeckUpdate(args: {
  parsed: DeckImport;
  deckCards: DeckUpdateCard[];
  /** The deck's own commander, to compare a declaration against. */
  commanderOracleId: string;
  /** The cards going in, as the diff draws them. The parsed list carries oracle
   *  ids only, and this module is pure — the catalog belongs to the caller. */
  cardFor: (oracleId: string) => { name: string; typeLine: string };
}): DeckUpdatePlan | DeckUpdateConflict {
  const { parsed, deckCards, commanderOracleId, cardFor } = args;

  if (parsed.declaredCommander && parsed.declaredCommander.oracleId !== commanderOracleId) {
    return { listCommander: parsed.declaredCommander.name };
  }

  // The deck's own commander appearing in the list is an export artifact, not an
  // intent to put it in the 99 — dropped the same way buildDeckImport drops it.
  const listed = new Map<string, { quantity: number; sourceLine: number }>();
  for (const card of parsed.cards) {
    if (card.oracleId === commanderOracleId) continue;
    const seen = listed.get(card.oracleId);
    // First line wins. Two lines naming the same card sum their copies, and the
    // figure beside the row should point at where the card first appears.
    listed.set(card.oracleId, {
      quantity: (seen?.quantity ?? 0) + card.quantity,
      sourceLine: seen?.sourceLine ?? card.sourceLine,
    });
  }

  const here = new Map(deckCards.map((c) => [c.oracleId, c]));

  const out: DeckUpdateRow[] = [];
  const unchanged: DeckUpdateRow[] = [];
  for (const card of deckCards) {
    const row = {
      oracleId: card.oracleId,
      name: card.name,
      typeLine: card.typeLine,
      sourceLine: null,
      auto: card.auto,
      quantity: card.quantity,
    };
    // A quantity change lands in `unchanged` and reconciles silently: the only
    // cards a real list changes the count of are basics, and a diff that
    // announced "your Islands went 12 → 9" would bury the seven cards that
    // actually left the deck.
    const match = listed.get(card.oracleId);
    if (match) unchanged.push({ ...row, quantity: match.quantity });
    else out.push(row);
  }

  const going: DeckUpdateRow[] = [];
  for (const [oracleId, { quantity, sourceLine }] of listed) {
    if (here.has(oracleId)) continue;
    going.push({ oracleId, ...cardFor(oracleId), sourceLine, quantity, auto: false });
  }

  const handAddedOut = out.filter((r) => !r.auto).length;

  // Unnamed lines alone are not a change: they replace rows that say the same
  // thing. This is the second way the "nothing changed" screen is reached.
  //
  // A quantity-only change is a change, though it appears in no group. A list
  // that takes the deck from twelve Islands to nine has nothing coming out and
  // nothing going in, and calling that "nothing changed" would refuse a write
  // the player asked for.
  const quantityMoved = unchanged.some((r) => here.get(r.oracleId)?.quantity !== r.quantity);
  const noChange = out.length === 0 && going.length === 0 && !quantityMoved;

  return { out, in: going, unchanged, unresolved: parsed.unresolved, handAddedOut, noChange };
}
