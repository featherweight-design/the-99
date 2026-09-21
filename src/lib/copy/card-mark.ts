// Production strings for the card mark — the three standing facts about a card, drawn
// wherever a card already appears. Ships as src/lib/copy/card-mark.ts.
//
// Handoff: design/design_handoff_the99_card_mark (R1), audited 🟡 Yellow.
// Brief: docs/superpowers/design-briefs/2026-09-19-the-card-mark.md
//
// THE SHORT VERSION: the dense surfaces carry GLYPHS, not words. Every string here
// exists for one of exactly three jobs — the key that glosses the glyphs, the modal
// that spells them out, and the accessible name each mark carries so a screen reader
// never depends on either.
//
// EVERY VISIBLE STRING IS SOMEONE ELSE'S. "Game Changer" is WotC's proper noun for
// membership of its own published list; "mass land denial" and "extra turns" are the
// rules' own names for the two classified categories. Nothing here paraphrases,
// shortens, pluralises or re-cases them. If a layout cannot fit one, the layout is
// what changes.
//
// The case split carries a fact and is not a typo. `Game Changer` is title case
// because it is a proper noun naming a list a card is ON; the other two are lowercase
// because they describe what a card DOES.

/** Fixed order wherever more than one appears. */
export const CARD_FACTS = ["gameChanger", "massLandDenial", "extraTurns"] as const;

export type CardFact = (typeof CARD_FACTS)[number];

export const cardMarkCopy = {
  // One string each, used in ALL THREE places — the key entry, the modal line and the
  // accessible name. A player who learns "⛰ = mass land denial" from the key hears
  // exactly that phrase in the modal and in VoiceOver. Three surfaces, one vocabulary.
  gameChanger: "Game Changer",
  massLandDenial: "mass land denial",
  extraTurns: "extra turns",

  // THE MODAL BLOCK. The heading has to be true of all three at once, and the three
  // have no shared category in the rules. "In the bracket rules" is literally true of
  // every one: the bracket rules name these three. It states no threshold, no bracket
  // number, and nothing about THIS deck — which the brief requires, since all three are
  // facts about the card with no deck in scope.
  //
  // Rejected, each written down: "Worth mentioning" (a judgement, and the app does not
  // judge cards), "Power level" (invents a scale the rules do not have), "Flags"
  // (internal vocabulary leaking out), "Bracket impact" (implies a threshold, which the
  // brief forbids outright), "Heads up" (it warns, and none of the three is a warning).
  modalHeading: "In the bracket rules",

  // THE HOVER TOOLTIP — an ENHANCEMENT, never the gloss. It does not exist on a phone,
  // so the key still carries the vocabulary and the modal still spells all three out.
  // If this were the only explanation, this would be the retired deck-status design
  // with a desktop-only escape hatch.
  //
  // Each mark owns its own sentence and its own box. A card carrying two facts shows
  // two tooltips, one at a time — never one merged sentence, because the facts are
  // independent and a merged line would imply they add up to something. They do not add
  // up to anything until Round 2.
  //
  // "on the Game Changer list" is membership of WotC's published list, which is what the
  // fact IS — not "is a Game Changer", which sounds like a judgement the app is making.
  // "counts as" reports the rules' classification rather than deciding it.
  //
  // These must never say how many are allowed, what bracket this implies, whether it is
  // good or bad, or where the detection came from (Round 2).
  tooltip: {
    gameChanger: "This card is on the Game Changer list.",
    massLandDenial: "This card counts as mass land denial.",
    extraTurns: "This card takes extra turns.",
  },

  // SPOKEN NAMES. Each mark carries its fact's name as its own accessible name, so the
  // key is a convenience for sighted users and never a dependency. Where a surface
  // COMPOSES its accessible name — /collection's row and tile — the drawn glyph is
  // aria-hidden and this clause is placed explicitly, after the card's own name.
  //
  // Joined with ", " because the names are self-describing; a connective ("and also")
  // would be the app narrating its own UI.
  rowAria: (marks: string[]) => marks.join(", "),

  // The key's own group label on /collection. The decklist's default names the marks
  // under a DECK list; this surface is the collection, and the same words there would
  // describe a list the reader is not looking at.
  keyRegionAria: "What the marks on these cards mean",
} as const;

/** The fact's own name, which is its key entry, its modal line and its spoken name. */
export function cardFactName(fact: CardFact): string {
  return cardMarkCopy[fact];
}

/* ─────────────────────────────────────────────────────────────────────────────
   NOT WRITTEN, ON PURPOSE

   1 · NO POSITIVE CLAIM. There is no string for a card carrying none of the three,
       at any size, on any surface. Detection on two of the three is measured and
       PARTIAL, so "no mass land denial" would be a claim the data cannot support —
       and a drawn absence reads as a cleared check even when it is only silence.

   2 · NO PROVENANCE. "Flagged by both sources" and its siblings are not here. The
       three detection sentences are fixed constants shipping from code and ROUND 2
       DESIGNS THEIR SLOT. Writing one now would hand Round 2 a slot it did not design.

   3 · NO COUNT. Not "2 facts", not "1 of 3". A count invites arithmetic across cards,
       and nothing here adds up until the deck-level verdict says so.
   ───────────────────────────────────────────────────────────────────────────── */
