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
import { availabilityCopy } from "../../lib/copy/availability";
import { CardFactMark } from "../cards/card-fact-mark";
import { ComboGlyph } from "../cards/combo-glyph";
import { AvailabilityGlyphBox } from "../ui/availability-marker";
import { MarkKey } from "../decks/mark-key";

const ENTRIES = [
  ...CARD_FACTS.map((fact) => ({
    id: fact,
    sample: <CardFactMark fact={fact} silent />,
    word: cardFactName(fact),
  })),
  // THE LEMNISCATE, glossed on the surface it debuts on. Neither clause sentence contains the
  // word "combo" — they say `with {partner}, you own both` — so without this entry a fourth
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
  // THE THREE AVAILABILITY STATES (collection surfaces, Call 3): the chip on the 3-up PHONE tile
  // dropped its word — "1 in a draft" is 81px of a 101px caption — and moved it here instead,
  // using the Availability filter's own labels rather than new words for the same three states.
  // `AvailabilityGlyphBox` (an explicit, non-shrinking layout box around `AvailabilityGlyph`)
  // rather than `AvailabilityMarker`: the marker always speaks a REAL card's counts and
  // claimants, and a key entry decodes the glyph alone, with no card behind it to count. The box
  // matters here specifically: a `transform` never affects layout, so a bare rotated glyph
  // reserves less flex space than it paints, which pulled `MarkKey`'s shared `gap-[5px]` down to
  // ~2.7px against the word and misaligned the sample with the over glyph beside it.
  //
  // `size="key"` (Hugh, 2026-10-03 follow-up): the box's own `"big"` default read ~11.3px of
  // diamond as larger than this key's other 16x16 marks, whose own ink covers less of their box
  // than a filled/outlined diamond does. 8px sits with them instead.
  //
  // UNCONDITIONAL (Hugh, 2026-10-03), reversing the scoping below `md` had for one round: the
  // desktop tile's chip spells the state out in words already, but ONE key describing every mark
  // this surface draws is worth more than trimming three entries the desktop reader did not ask
  // to have trimmed. Drawn once per mount now, not split into a phone instance and a desktop one.
  {
    id: "avail-soft",
    sample: <AvailabilityGlyphBox state="soft" seam="var(--bg)" size="key" />,
    word: availabilityCopy.collection.filterSoft,
  },
  {
    id: "avail-hard",
    sample: <AvailabilityGlyphBox state="hard" seam="var(--bg)" size="key" />,
    word: availabilityCopy.collection.filterHard,
  },
  {
    id: "avail-over",
    sample: <AvailabilityGlyphBox state="over" seam="var(--bg)" size="key" />,
    word: availabilityCopy.collection.filterOver,
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
      {/* 3, matching the phone grid's own 3 columns (Hugh, 2026-10-03): 2 left every entry
          sitting in the grid's left two-thirds, reading as the whole key shifted left of the
          card grid above and below it, rather than landing on the same three vertical lines. */}
      <MarkKey marks={ENTRIES} regionAria={cardMarkCopy.keyRegionAria} phoneColumns={3} />
    </div>
  );
}
