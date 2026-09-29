"use client";
// The card modal's mana cost, at the size a cost can be read as itself: 22px
// mobile / 26px desktop, per property table §Mana Pip (generic {n}) / §Mana Pip
// (WUBRG colored).
//
// It draws Scryfall's PRINTED symbols rather than a lettered disc. At this size
// a disc reading "2" or "W" is a transcription of the cost; the symbol is the
// cost, and it is the one every other Magic surface the reader knows prints. It
// also says things the disc could only approximate — a twobrid's split ground, a
// Phyrexian's ϕ, snow, colorless — each of which the disc flattened to gray with
// a letter on it.
//
// The small runs stay discs. `CostPips` draws at 11-14px, where a printed
// symbol's interior line work turns to mud, and its contrast against every theme
// is what `probe:black-pip` measures.
//
// This surface also draws BOTH halves of a two-cost card, where the runs in a
// column draw the front half alone — including a modal DFC's castable back, which
// the ingest joins into the same `a // b` string a split card carries. A
// `transform` back is free, so such a card draws one cost and no separator.

import { Fragment } from "react";

import { WUBRG_COLOR } from "../../lib/collection/browse";
import { faceCosts } from "../../lib/cards/faces";
import { manaSymbolBackground } from "../../lib/cards/mana-symbols";
import { manaCopy, spokenFullManaCost } from "../../lib/copy/card-surfaces";
// One parser for both pip treatments. This file carried a second copy of the
// same regex — the two never disagreed, they simply had no reason not to — and a
// rule like the front-face one then has to be written twice to hold. Importing
// it is what makes that impossible to half-do.
import { parseManaCost } from "../ui/cost-pips";

export function ManaCost({ cost }: { cost: string | null }) {
  if (!cost) return null;
  // BOTH halves, where the card has two. A `split`, `adventure` or `prepare`
  // card prints two real costs on one piece of stock — `Repudiate // Replicate`
  // is `{G/U}{G/U} // {1}{G}{U}` — and a reader choosing which half to cast
  // needs both. The runs in a column keep the front half alone, because a 72px
  // track cannot hold two costs and a separator; this surface has the room, and
  // is where a reader is studying the card rather than scanning past it.
  const halves = faceCosts(cost)
    .map((half) => parseManaCost(half))
    .filter((symbols) => symbols.length > 0);
  if (halves.length === 0) return null;
  return (
    <>
      {/* §Mana Cost Pip Container: display flex, gap 4/5px, flex none, padding-top 4px mobile */}
      <span
        aria-hidden
        className="flex items-center gap-[4px] md:gap-[5px] flex-none pt-[4px] md:pt-0"
      >
        {halves.map((symbols, half) => (
          <Fragment key={half}>
            {/* The same `//` the printed name carries, so the two separators on
                this surface agree. Muted and mono: it is punctuation between two
                costs, not a third cost. */}
            {half > 0 ? (
              <span
                className="font-mono text-[12px] md:text-[13px] px-[1px]"
                style={{ color: "var(--fg-muted)" }}
              >
                {manaCopy.costHalfSeparator}
              </span>
            ) : null}
            {symbols.map((sym, i) => (
              <ManaPip key={i} symbol={sym} />
            ))}
          </Fragment>
        ))}
      </span>
      {/* The symbols are art and say nothing, where the retired discs at least
          read out their own letters. The cost is spoken here instead — every
          half of it, since the `//` above cannot be read aloud. The second half
          is announced as `second cost` rather than joined with "or": a hybrid
          symbol already speaks as "green or blue", so an "or" between the halves
          would be the third in the sentence and the only one dividing two
          costs. `costAriaHalves` owns that wording. */}
      <span className="sr-only">{spokenFullManaCost(cost)}</span>
    </>
  );
}

const BOX = "inline-flex items-center justify-center rounded-full w-[22px] h-[22px] md:w-[26px] md:h-[26px]";

function ManaPip({ symbol }: { symbol: string }) {
  const background = manaSymbolBackground(symbol);
  if (background) {
    // A background rather than an `<img>`, matching `ColourPips`: the symbol is
    // decorative — the spoken cost beside it carries the meaning — and every
    // other art surface here draws through `background` for the same reason.
    // Never masked or tinted: these are finished multi-color illustrations, and
    // a hybrid's two halves are the thing a mask would flatten.
    return (
      <span
        className={`${BOX} flex-none`}
        style={{ background }}
      />
    );
  }

  // No committed art. Scryfall's symbol list grows with the card pool and these
  // files move only when someone re-runs `pnpm fetch:mana`, so a symbol printed
  // since the last run lands here — and a lettered disc is a worse cost than the
  // symbol and a far better one than a blank 26px hole.
  const wubrg = /^[WUBRG]$/.test(symbol);
  return (
    <span
      className={`${BOX} font-mono text-[12px] md:text-[13px]`}
      style={{
        background: wubrg ? WUBRG_COLOR[symbol] ?? "var(--border-dashed)" : "var(--border-dashed)",
        color: wubrg ? "var(--bg)" : "var(--fg)",
        fontWeight: wubrg ? 600 : 400,
      }}
    >
      {symbol}
    </span>
  );
}
