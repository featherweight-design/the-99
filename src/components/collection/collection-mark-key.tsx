// The key for /collection's three fact marks.
//
// THE RULE THE WORDLESS MARK RESTS ON: a glyph identifies and cannot teach, so something
// on the surface has to say the word. The deck-status marks shipped wordless AND unglossed
// and were retired in a day.
//
// The three glyphs arrive on /collection in the same change that adds this, so there was
// never a window where they drew unglossed — which is the point. `MarkKey` existed for the
// deck surface's `buy` and `proxy`, and the gloss for these three is built here rather than
// reached for from `decklist.tsx`, whose entries are that surface's own.
//
// It lives WITH THE VIEWS rather than above them in `browser.tsx`, so a view mounted
// anywhere else brings its own gloss instead of depending on a caller to remember.
//
// Unconditional: a fact entry defines a glyph and claims nothing about any row, so a
// player scanning for Game Changers finds the entry BEFORE they find a card. `buy` and
// `proxy` are absent because this surface draws neither.

"use client";

import { CARD_FACTS, cardFactName, cardMarkCopy } from "../../lib/copy/card-mark";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { CardFactMark } from "../cards/card-fact-mark";
import { ComboGlyph } from "../cards/combo-glyph";
import { MarkKey } from "../decks/mark-key";

const ENTRIES = [
  ...CARD_FACTS.map((fact) => ({
    id: fact,
    sample: <CardFactMark fact={fact} silent />,
    word: cardFactName(fact),
  })),
  // THE LEMNISCATE, glossed on the surface it debuts on. Neither clause sentence contains the
  // word "combo" — they say `with {partner} — you own both` — so without this entry a fourth
  // glyph arrives on /collection with nothing anywhere to say what it means, which is exactly
  // what the header above records the deck-status marks being retired for.
  //
  // APPENDED rather than folded into `CARD_FACTS`: that list is the fact vocabulary and its
  // fixed ORDER, both Round 2's, and this round needed the shape rather than a membership.
  // When Round 2 ships the lemniscate as a fact, this entry goes with it.
  {
    id: "combo",
    // AT THE SIZE THE READER SEES, which is 12px and not the 16 the three above draw at.
    // A key decodes a glyph, so a sample that is not the glyph on the surface is decoding
    // something else — and the two sizes are both the spec rather than drift from it:
    // Round 1's facts sit on a NAME line at 16, and this clause leads a secondary line of
    // 9.5-10.5px mono, where 16 is taller than the text it introduces.
    sample: <ComboGlyph />,
    word: comboAwarenessCopy.keyWord,
  },
];

export function CollectionMarkKey({ className }: { className?: string }) {
  // The TILE grid needs `col-span-full` here, exactly as its `Show more` button does: a bare
  // child of that grid takes one CARD CELL — one of two columns at 390px, and one of six
  // ~178px columns at 1300px, stretched to the tile row's height with its entries wrapped
  // three deep. The row view is a flex column and needs nothing.
  return (
    // Room above and below on the phone (H7): it sat tight against the head and the
    // first row, and read as part of either rather than as the key to both.
    <div className={["py-[10px] md:py-0", className].filter(Boolean).join(" ")}>
      <MarkKey marks={ENTRIES} regionAria={cardMarkCopy.keyRegionAria} phoneColumns={2} />
    </div>
  );
}
