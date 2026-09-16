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
  /** The subset of `unchanged` whose count the list moves, with both figures.
   *  The landing figure has to carry these copies — it is the one number
   *  compared to 99 — and the diff names them, because a reader adding the row
   *  counts up otherwise lands somewhere the screen never accounts for. In
   *  practice it is the mana base and nothing else. */
  recounted: { oracleId: string; name: string; from: number; to: number }[];
  /** The list's unnamed lines. They replace the deck's existing unresolved rows
   *  wholesale rather than merging — the list is the deck now, and a line the
   *  new list does not carry is not a line the deck is still missing. Because
   *  that replacement is a write, a set differing from the deck's own defeats
   *  `noChange` on its own. */
  unresolved: DeckImport["unresolved"];
  /** True when the plan would write nothing at all. */
  noChange: boolean;
};

/** The commander a list declares, when it is not this deck's. The flow refuses
 *  the update rather than swapping: changing the commander re-decides the
 *  colours and the legality of all ninety-nine.
 *
 *  A PARTNER is the same decision and takes the same refusal. The pair's second
 *  half decides the identity jointly, so a list naming a different one is a
 *  different deck for exactly the reason the first half is. */
export type DeckUpdateConflict = {
  listCommander: string;
  /** The deck's OWN half that the declaration disagrees with — the primary for a
   *  commander mismatch, the partner for a partner one. The banner names one
   *  card on each side, so a partner-only mismatch naming the deck's primary
   *  would describe a disagreement that is not the one being refused. Falls back
   *  to the primary when a declared partner meets a deck that leads alone:
   *  there is no partner to name, and the primary IS what this deck is. */
  deckOracleId: string;
};

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
  /** The deck's partner, where it leads a pair. A list declaring a DIFFERENT
   *  one is refused like a different commander; one declaring this deck's own
   *  is an export artifact and is dropped from the 99, the same way the
   *  commander's line is. Null on a deck with no partner, where any declared
   *  partner is a different deck. */
  partnerOracleId?: string | null;
  /** The unnamed lines the deck already carries. Needed because the apply path
   *  replaces them wholesale, so a list whose unnamed lines differ from these is
   *  a real write however identical the cards are. */
  deckUnresolved: { rawName: string; quantity: number }[];
  /** The cards going in, as the diff draws them. The parsed list carries oracle
   *  ids only, and this module is pure — the catalog belongs to the caller. */
  cardFor: (oracleId: string) => { name: string; typeLine: string };
}): DeckUpdatePlan | DeckUpdateConflict {
  const { parsed, deckCards, commanderOracleId, partnerOracleId, deckUnresolved, cardFor } = args;

  if (parsed.declaredCommander && parsed.declaredCommander.oracleId !== commanderOracleId) {
    return { listCommander: parsed.declaredCommander.name, deckOracleId: commanderOracleId };
  }

  // The same refusal for the pair's second half. Without it a list naming a
  // different partner applied its body while the deck kept the old one — a deck
  // silently left with ninety-nine cards chosen for an identity it no longer
  // leads with. A deck with NO partner refuses any declared one for the same
  // reason: it would be a different deck.
  if (parsed.declaredPartner && parsed.declaredPartner.oracleId !== (partnerOracleId ?? null)) {
    return {
      listCommander: parsed.declaredPartner.name,
      deckOracleId: partnerOracleId ?? commanderOracleId,
    };
  }

  // The deck's own commander appearing in the list is an export artifact, not an
  // intent to put it in the 99 — dropped the same way buildDeckImport drops it.
  const listed = new Map<string, { quantity: number; sourceLine: number }>();
  for (const card of parsed.cards) {
    // The pair's second half is dropped for the commander's own reason: an
    // export lists it, and it leads the deck rather than filling a slot in it.
    if (card.oracleId === commanderOracleId || card.oracleId === partnerOracleId) continue;
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
  const recounted: DeckUpdatePlan["recounted"] = [];
  for (const card of deckCards) {
    const row = {
      oracleId: card.oracleId,
      name: card.name,
      typeLine: card.typeLine,
      sourceLine: null,
      auto: card.auto,
      quantity: card.quantity,
    };
    // A quantity change lands in `unchanged` rather than in a group of its own:
    // the only cards a real list changes the count of are basics, and a diff
    // that listed "your Islands went 12 → 9" among the departures would bury
    // the seven cards that actually left the deck. It is still collected into
    // `recounted`, which the diff prints as a note — not naming the change at
    // all left the landing figure unaccountable.
    const match = listed.get(card.oracleId);
    if (!match) {
      out.push(row);
      continue;
    }
    unchanged.push({ ...row, quantity: match.quantity });
    if (match.quantity !== card.quantity) {
      recounted.push({
        oracleId: card.oracleId,
        name: card.name,
        from: card.quantity,
        to: match.quantity,
      });
    }
  }

  const going: DeckUpdateRow[] = [];
  for (const [oracleId, { quantity, sourceLine }] of listed) {
    if (here.has(oracleId)) continue;
    going.push({ oracleId, ...cardFor(oracleId), sourceLine, quantity, auto: false });
  }

  // Unnamed lines alone are not a change *when the deck already carries them* —
  // state 12's own wording. They are replaced wholesale on apply, so a list
  // naming a different set of unnamed lines is a write, and calling it "nothing
  // changed" would strand the deck holding lines no list still asks for.
  // Compared on name and count only: `sourceLine` points into a paste that no
  // longer exists, and moving a line down the page is not a change to the deck.
  const unresolvedKey = (rs: { rawName: string; quantity: number }[]) =>
    rs.map((r) => `${r.quantity} ${r.rawName}`).sort().join("");
  const unresolvedMoved = unresolvedKey(parsed.unresolved) !== unresolvedKey(deckUnresolved);

  // A quantity-only change is a change, though it appears in no group. A list
  // that takes the deck from twelve Islands to nine has nothing coming out and
  // nothing going in, and calling that "nothing changed" would refuse a write
  // the player asked for.
  const noChange =
    out.length === 0 && going.length === 0 && recounted.length === 0 && !unresolvedMoved;

  return { out, in: going, unchanged, recounted, unresolved: parsed.unresolved, noChange };
}
