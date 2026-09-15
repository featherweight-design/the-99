// MarkKey — one line under the decklist toolbar that decodes the marks on the
// rows below it.
//
// It exists because the marks are one character each. A glyph identifies and
// cannot teach, so something on the surface has to say the word — and once marks
// are a FAMILY (money, proxy, and whatever comes next) a reader cannot learn a
// hue per mark either, because the token contract has four hue families and all
// four are booked. The system is: the glyph identifies, the key decodes, and
// colour only says "there is a mark here".
//
// IT RENDERS ONLY WHAT THE VIEW CONTAINS, and nothing at all when the view has
// no marked rows. An empty legend is furniture, and this app is strict about
// that. It takes the marks as DATA rather than hardcoding the pair, because it
// is the surface every future mark is added to.

import type { ReactNode } from "react";
import { proxyCopy } from "../../lib/copy/proxies";

export type MarkKeyEntry = { id: string; sample: ReactNode; word: string };

export function MarkKey({ marks }: { marks: MarkKeyEntry[] }) {
  if (marks.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={proxyCopy.key.regionAria}
      // Wraps rather than scrolls: it grows by one pair per mark, and a
      // horizontally scrolling legend on a phone is a control nobody presses.
      className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] font-mono text-[10px] md:text-[10.5px]"
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
          <span aria-hidden="true">{mark.sample}</span>
          <span>{mark.word}</span>
        </span>
      ))}
      {/* The about page does not exist yet, so its door is ABSENT rather than
          dead. When it lands, this is where it goes. */}
    </div>
  );
}
