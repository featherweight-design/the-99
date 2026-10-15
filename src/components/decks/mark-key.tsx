// MarkKey — one line under the decklist toolbar that decodes the marks on the
// rows — or, since card captions (R1), the card tiles — below it.
//
// It exists because the marks are one character each. A glyph identifies and
// cannot teach, so something on the surface has to say the word — and once marks
// are a FAMILY (money, proxy, and whatever comes next) a reader cannot learn a
// hue per mark either, because the token contract has four hue families and all
// four are booked. The system is: the glyph identifies, the key decodes, and
// colour only says "there is a mark here".
//
// IT RENDERS WHAT IT IS GIVEN, and nothing at all when given nothing — an empty
// legend is furniture, and this app is strict about that. It takes the marks as
// DATA rather than hardcoding a set, because it is the surface every future mark
// is added to.
//
// WHAT THE CALLER PASSES IS THE CALLER'S RULE, and the two kinds differ:
//
//   `buy` and `proxy` are CONDITIONAL, because they describe the rows below — an
//   unconditional buy entry prints `not owned` over a deck whose rows the player
//   owns, which is the falsehood this component was built to prevent.
//
//   The three bracket facts are UNCONDITIONAL on a surface that can draw them,
//   because a fact entry defines a glyph and claims nothing about any row. A
//   player scanning for Game Changers needs the entry before they find one, and
//   a collection holding none is not a collection the vocabulary is false for.
//
// The rule both obey: never gloss a mark the reader cannot find on this screen.
// That is why the facts are absent in card view, where no tile draws one.

import type { ReactNode } from "react";
import { proxyCopy } from "../../lib/copy/proxies";

export type MarkKeyEntry = { id: string; sample: ReactNode; word: string };

export function MarkKey({
  marks,
  regionAria = proxyCopy.key.regionAria,
  phoneColumns,
}: {
  marks: MarkKeyEntry[];
  /**
   * Equal-width columns below `md` instead of the wrapping line (H7, Hugh's walk
   * 2026-10-02). Wrapped, the collection's key broke wherever its words happened to
   * end, so its entries sat at a different place on every line. Opt-in, so every
   * other key is unchanged; from `md` it wraps as before.
   */
  phoneColumns?: 2 | 3;
  /**
   * The group's own label, taken as data for the same reason the marks are: the
   * card view mounts a second instance over cards rather than rows, and its
   * label cannot be the list's. Defaulted, so the list's call site is unchanged.
   */
  regionAria?: string;
}) {
  if (marks.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={regionAria}
      // Wraps rather than scrolls: it grows by one pair per mark, and a
      // horizontally scrolling legend on a phone is a control nobody presses.
      className={[
        phoneColumns === 3
          ? "grid grid-cols-3 md:flex md:flex-wrap"
          : phoneColumns === 2
            ? "grid grid-cols-2 md:flex md:flex-wrap"
            : "flex flex-wrap",
        "items-center gap-x-[12px] gap-y-[6px] font-mono text-[10px] md:text-[10.5px]",
      ].join(" ")}
      style={{ color: "var(--fg-faint)" }}
    >
      {marks.map((mark) => (
        // The real mark at its real size beside the word, so the line is a
        // SAMPLE rather than a description of one.
        <span key={mark.id} className="inline-flex items-center gap-[5px]">
          {/* The sample is DECORATIVE here: it is the same component the rows
              draw, so it carries that mark's own `sr-only` word — and this line
              says the word right beside it. Left spoken, every key entry read
              its mark twice, and the whole legend became a second copy of the
              row vocabulary in the reading order. */}
          {/* A flex box rather than an inline one: an inline-flex sample (the lock's 14px box) sits on the
              baseline of an inline wrapper and the line grows by the strut, so the first lock stretched the
              key's slot by 2.8px. As a flex item the sample is its own height and the entry is the taller
              of it and the word. */}
          <span aria-hidden="true" className="inline-flex items-center">{mark.sample}</span>
          <span>{mark.word}</span>
        </span>
      ))}
      {/* The about page does not exist yet, so its door is ABSENT rather than
          dead. When it lands, this is where it goes. */}
    </div>
  );
}
