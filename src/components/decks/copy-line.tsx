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
import { liveSentence } from "../../lib/collection/copy-line";
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
  // The card the last settled write read back. `undefined` is BEFORE any write, and only then is
  // the frozen sentence drawn: after a pick is cleared it could name that pick. Null is a write
  // that settled with no card to read back (the last copy went in another tab), which says nothing
  // rather than claim a destination.
  const [live, setLive] = useState<ContestedCard | null | undefined>(undefined);
  const panel = useId();
  const said = live === undefined ? sentence : live ? liveSentence(live) : null;
  // The chooser behind Change: the read-back once there is one. A null read-back (the last copy
  // went) takes Change away, since every option it offered can only be refused.
  const current = live === null ? null : (live ?? chooser);

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
          <span className="text-[13px] flex-1 min-w-0" style={{ color: "var(--fg-body)" }}>{said ?? ""}</span>
          {current ? (
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
      {current && open ? (
        <div id={panel} className="pt-[2px] pb-[12px]">
          <ContestedCardRow card={current} addedCopy onCard={setLive} />
        </div>
      ) : null}
    </li>
  );
}
