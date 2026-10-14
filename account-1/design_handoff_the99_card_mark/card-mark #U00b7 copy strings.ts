// card-mark · copy strings
//
// Handoff: design_handoff_the99_card_mark (R1).
// Brief: docs/superpowers/design-briefs/2026-09-19-the-card-mark.md (main).
//
// THE SHORT VERSION: the dense surfaces carry GLYPHS, not words. Every string
// below exists for one of exactly three jobs — the key that glosses the
// glyphs, the modal that spells them out, and the accessible name each mark
// carries so a screen reader never depends on either.
//
// EVERY VISIBLE STRING IS SOMEONE ELSE'S. "Game Changer" is WotC's proper noun
// for membership of its own published list; "mass land denial" and "extra
// turns" are the rules' own names for the two classified categories. Nothing
// here paraphrases, shortens, pluralises or re-cases them. If a layout cannot
// fit one, the layout is what changes.

export const cardMarkCopy = {
  /* ───────────────────────────────────────────────────────────────────────
     THE THREE FACTS — one string each, used in ALL THREE places

     The key entry, the modal line and the accessible name are the same
     string. That is deliberate: a player who learns "⛰ = mass land denial"
     from the key hears exactly that phrase in the modal and in VoiceOver.
     Three surfaces, one vocabulary, nothing to reconcile.

     Fixed order wherever more than one appears: gameChanger,
     massLandDenial, extraTurns.

     The case split carries a fact and is not a typo. `Game Changer` is title
     case because it is a proper noun naming a list you are on; the other two
     are lowercase because they describe what a card does. The SENTENCE that
     says so properly is Round 2's.
     ─────────────────────────────────────────────────────────────────────── */
  gameChanger: "Game Changer",
  massLandDenial: "mass land denial",
  extraTurns: "extra turns",

  /* ───────────────────────────────────────────────────────────────────────
     THE KEY — MarkKey goes from two entries to five

     No new strings needed: each entry is the glyph followed by the fact's own
     name above. Listed here so the ORDER is owned by one file.

     The key is what makes a wordless mark legal (§3). The deck-status marks
     shipped wordless AND unglossed and were retired in a day; MarkKey is the
     component that exists so that cannot recur, and it is already on both
     screens that carry these marks.

     ALWAYS ALL FIVE, never filtered to what is on screen. The key is a
     vocabulary, not a legend of the current page — a player scanning for
     Game Changers needs the entry to be there BEFORE they find one.
     ─────────────────────────────────────────────────────────────────────── */
  keyOrder: ["buy", "proxy", "gameChanger", "massLandDenial", "extraTurns"],

  /* ───────────────────────────────────────────────────────────────────────
     THE MODAL BLOCK

     Heading, then one line per fact: the glyph at 16px followed by the fact's
     name in plain text. The modal is the one surface with room to spell it
     out, so it does — this is where a player who never read the key learns
     the vocabulary.

     No body copy beyond the names. No provenance, no count, no link, and no
     empty state — the block is absent on a card with no facts, exactly as
     AvailabilityDetail returns null rather than saying "nothing to report".

     WHY THIS HEADING. It has to be true of all three at once, and the three
     have no shared category in the rules. "In the bracket rules" is literally
     true of every one of them: the bracket rules name these three. It states
     no threshold, no bracket number, and nothing about THIS deck — which §2
     requires, since all three are facts about the card with no deck in scope.

     WHAT IT IS NOT, each written down and rejected:
       "Worth mentioning"  — a judgement, and the app does not judge cards.
       "Power level"       — invents a scale the rules do not have.
       "Flags"             — internal vocabulary (`bracketFlags`) leaking out.
       "Bracket impact"    — implies a threshold, which §3 forbids outright.
       "Heads up"          — Kitchen Table, but it warns, and none of the
                             three is a warning.
     ─────────────────────────────────────────────────────────────────────── */
  modalHeading: "In the bracket rules",

  /* ───────────────────────────────────────────────────────────────────────
     THE HOVER TOOLTIP — one sentence per fact

     An ENHANCEMENT, never the gloss. It does not exist on a phone, so the key
     still carries the vocabulary and the modal still spells all three out; if
     the tooltip were the only explanation this would be the retired
     deck-status design with a desktop-only escape hatch.

     Each mark owns its own sentence and its own box. A card carrying two
     facts shows two tooltips, one at a time — never one merged sentence,
     because the facts are independent and a merged line would imply they add
     up to something. They do not add up to anything until Round 2.

     VOICE. Kitchen Table: a full sentence, plainly stated, no hedging and no
     jargon. Each one names the fact and stops.
       · "on the Game Changer list" — membership of WotC's published list,
         which is what the fact IS. Not "is a Game Changer", which sounds like
         a judgement the app is making rather than a list the card is on.
       · "counts as" — the rules classify it; the app is reporting the
         classification, not deciding it.
       · "takes extra turns" — the rule's own words, in the plainest frame.

     WHAT THEY MUST NEVER SAY: how many are allowed, what bracket this implies,
     whether it is good or bad, or where the detection came from (Round 2).
     ─────────────────────────────────────────────────────────────────────── */
  tooltip: {
    gameChanger: "This card is on the Game Changer list.",
    massLandDenial: "This card counts as mass land denial.",
    extraTurns: "This card takes extra turns.",
  },

  /* ───────────────────────────────────────────────────────────────────────
     SPOKEN NAMES

     Each mark carries its fact's name as its own accessible name, so the key
     is a convenience for sighted users and never a dependency. Where a
     surface COMPOSES its accessible name — /collection's row (explicit
     aria-label) and tile (text content, meta line before name line) — the
     drawn glyph is aria-hidden and this clause is placed explicitly, after
     the card's own name.

     Joined with ", " because the names are self-describing; a connective
     ("and also") would be the app narrating its own UI.

     The decklist row needs nothing: its name is its own trigger and the mark
     sits beside it, exactly as the EDHREC figure does.
     ─────────────────────────────────────────────────────────────────────── */
  rowAria: (marks: string[]) => marks.join(", "),
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
   NOT WRITTEN, ON PURPOSE

   1 · NO POSITIVE CLAIM. There is no string for a card carrying none of the
       three, at any size, on any surface. Detection on two of the three is
       measured and partial (§2), so "no mass land denial" would be a claim
       the data cannot support — and a drawn absence reads as a cleared check
       even when it is only silence.

   2 · NO PROVENANCE. "Flagged by both sources" and its siblings are not here.
       The three detection sentences are fixed constants shipping from code and
       ROUND 2 DESIGNS THEIR SLOT. Writing one now would hand Round 2 a slot it
       did not design.

   3 · NO `title` ATTRIBUTE. The tooltip above is a real positioned element,
       not the browser's native one: `title` cannot be styled, fires on a
       ~1s OS delay, and is announced redundantly by screen readers that
       already have the aria-label. The tooltip is also NEVER the gloss — it
       is absent on touch, so the key and the modal carry the vocabulary.

   3b · NO TAP EQUIVALENT. Tapping a row already opens the modal, which spells
       all three facts out. A tap target on the mark would compete with the
       row's own target for ~14px of hit area.

   4 · NO THRESHOLD, ANYWHERE. No count, no "1 of 3 allowed", no "pushes you to
       bracket 4". The mark states a fact about a card. What a deck's facts add
       up to is the verdict, and the verdict is Round 2's.
   ───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   REUSED — nothing retyped

   | Drawn beside the mark      | Owner                                       |
   |----------------------------|---------------------------------------------|
   | `×N` count                 | addPanelCopy.row.quantity                   |
   | `none free`, `short N`     | availabilityCopy.marker                     |
   | `$` + its full aria        | BuyTag density="collapsed"                  |
   | `P`                        | ProxyTag                                    |
   | `//` + "two-faced card"    | twoFacedCopy.mark / markAria                |
   | `edhrec N%`                | recommendationsCopy.shopping.rowFigure      |
   | `SET · rarity`             | grid-view.tsx — UNCHANGED, nothing drops    |
   | collection row aria-label  | availabilityCopy.collection.rowAria — gains |
   |                            | one clause, see cardMarkCopy.rowAria        |
   ───────────────────────────────────────────────────────────────────────────── */
