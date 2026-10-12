"use client";
// Where an added copy went, as one row: the card, the sentence, and Change (plan
// `plan-added-copy-2026-10-12`, the handoff's CopyLine). Change opens the shipped chooser under the
// row and becomes Done; a pick moves the copy through the chooser's own write (`assignCopy`), and
// the sentence redraws from the card that write read back.
//
// Drawn on the upload summary's `No longer to buy` rows. Add Cards and I got it reuse it in the
// next PR, which is why it lives beside `ContestedCardRow` and not in the summary.

import { useId, useState } from "react";
import { addedCopyCopy as copy } from "../../lib/copy/added-copy";
import { pickedSentence } from "../../lib/collection/copy-line";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { ContestedCardRow } from "./contested-card-row";

export function CopyLine({
  cardName,
  sentence,
  chooser,
}: {
  cardName: string;
  /** Where the copy went, frozen at the add. */
  sentence: string;
  /** The live chooser behind Change. Absent when no deck claims the card any more: no Change. */
  chooser?: ContestedCard;
}) {
  const [open, setOpen] = useState(false);
  // The card the last settled pick read back. The sentence follows it, never the frozen one.
  const [live, setLive] = useState<ContestedCard | null>(null);
  const panel = useId();
  const said = (live && pickedSentence(live)) ?? sentence;

  return (
    <li style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex flex-col md:flex-row md:items-center gap-[2px] md:gap-[10px] py-[6px] min-h-[46px] md:min-h-[44px]">
        <span
          className="text-[13.5px] font-semibold md:w-[170px] md:flex-none min-w-0 md:truncate"
          style={{ color: "var(--fg)" }}
        >
          {cardName}
        </span>
        <span className="flex items-center gap-[10px] min-w-0 md:flex-1">
          <span className="text-[13px] flex-1 min-w-0" style={{ color: "var(--fg-body)" }}>{said}</span>
          {chooser ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panel}
              aria-label={copy.changeAria(cardName)}
              onClick={() => setOpen((o) => !o)}
              className="text-[13.5px] min-h-[44px] flex-none text-[color:var(--accent)]"
            >
              {open ? copy.done : copy.change}
            </button>
          ) : null}
        </span>
      </div>
      {chooser && open ? (
        <div id={panel} className="pt-[2px] pb-[12px]">
          <ContestedCardRow card={live ?? chooser} addedCopy onCard={setLive} />
        </div>
      ) : null}
    </li>
  );
}
