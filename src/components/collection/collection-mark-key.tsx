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
import { CardFactMark } from "../cards/card-fact-mark";
import { MarkKey } from "../decks/mark-key";

const ENTRIES = CARD_FACTS.map((fact) => ({
  id: fact,
  sample: <CardFactMark fact={fact} size={13} silent />,
  word: cardFactName(fact),
}));

export function CollectionMarkKey({ className }: { className?: string }) {
  // The TILE grid needs `col-span-full` here, exactly as its `Show more` button does: a bare
  // child of that grid takes one CARD CELL — one of two columns at 390px, and one of six
  // ~178px columns at 1300px, stretched to the tile row's height with its entries wrapped
  // three deep. The row view is a flex column and needs nothing.
  return (
    <div className={className}>
      <MarkKey marks={ENTRIES} regionAria={cardMarkCopy.keyRegionAria} />
    </div>
  );
}
