"use client";

// The body of the `notes` figure (the Deck notes entry). `NoteTags` itself, so the underlines are the
// panel's own: solid for the card the deck holds, dashed for one it does not. A client module because the
// `CardDetailProvider` takes a callback, which cannot cross from the server module that lists the figures.
// Inert like every specimen (`Specimen` sets `pointer-events: none`): nothing here writes or opens anything.

import { NOTE_ROW } from "../../lib/about/fixtures";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { NoteTags } from "../decks/notes/note-tags";

/** The select box, the text with two tags, and the date: under the text on a phone, beside it from `md`,
 *  with the real row's phone reductions (22px box and 10px padding, 18px and 12px from `md`). */
export function NotesFigureBody() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <div className="m-[12px] flex items-start gap-[10px] rounded-[8px] border border-solid border-[color:var(--border-strong)] px-[10px] py-[9px] md:px-[12px]">
        <span aria-hidden className="mt-[1px] h-[22px] w-[22px] flex-none rounded-[5px] border border-solid border-[color:var(--border-strong)] md:h-[18px] md:w-[18px]" />
        <div className="min-w-0 flex-1">
          <p className="m-0 break-words text-[13.5px] leading-[1.5] text-[color:var(--fg)]"><NoteTags drawn={NOTE_ROW.drawn} /></p>
          <span className="font-mono text-[10px] text-[color:var(--fg-locked)] md:hidden">{NOTE_ROW.date}</span>
        </div>
        <span className="hidden flex-none pt-[2px] font-mono text-[10.5px] text-[color:var(--fg-locked)] md:inline">{NOTE_ROW.date}</span>
      </div>
    </CardDetailProvider>
  );
}
