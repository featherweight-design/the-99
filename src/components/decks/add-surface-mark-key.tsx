// The key for the four marks the deck's ADD surfaces draw — the Consider tile and the
// top-off row.
//
// THE RULE THE WORDLESS MARK RESTS ON: a glyph identifies and cannot teach, so something on
// the surface has to say the word. The deck-status marks shipped wordless AND unglossed, and
// were retired in a day.
//
// Both surfaces were already drawing one unglossed glyph before this: `ComboClause` renders
// `ComboGlyph`, and its sentence never contained the word "combo" — and since 2026-09-22 it
// draws no words at all, only the glyph and the partner's name, which makes THIS KEY the only
// thing on either surface that says what the lemniscate means. The lemniscate arrived on two
// surfaces with nothing anywhere to say what it meant. The three fact marks arrive in the same change as this key, so there
// is no window where any of the four draws unglossed.
//
// UNCONDITIONAL, and that is the difference from `decklist.tsx`'s key rather than a
// divergence from it. A DECK IS A CLOSED SET — all 100 cards are on screen, so absence is
// knowable and an entry for a fact the deck does not hold stops being a decoder and becomes a
// claim. These two surfaces are WINDOWS: the Consider shelves cap at `SHELF_CAP` behind a
// `Show all`, and the top-off list ranks a pool of 262 candidates for the average commander.
// "No Game Changer on this screen" is not "none among the candidates", which is
// `CollectionMarkKey`'s reasoning exactly, arriving by ranking instead of by paging.
//
// It lives WITH the surfaces rather than above them, so a panel mounted anywhere else brings
// its own gloss instead of depending on a caller to remember.

"use client";

import { CARD_FACTS, cardFactName, cardMarkCopy } from "../../lib/copy/card-mark";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { CardFactMark } from "../cards/card-fact-mark";
import { ComboGlyph } from "../cards/combo-glyph";
import { MarkKey } from "./mark-key";

const ENTRIES = [
  ...CARD_FACTS.map((fact) => ({
    id: fact,
    sample: <CardFactMark fact={fact} silent />,
    word: cardFactName(fact),
  })),
  {
    id: "combo",
    // `ComboGlyph` takes no size prop — Hugh's 2026-09-21 ruling, recorded in that
    // component. Both callers draw the lemniscate at the app's one mark size.
    sample: <ComboGlyph />,
    word: comboAwarenessCopy.keyWord,
  },
];

export function AddSurfaceMarkKey({ className }: { className?: string }) {
  return (
    <div className={className}>
      <MarkKey marks={ENTRIES} regionAria={cardMarkCopy.keyRegionAria} />
    </div>
  );
}
