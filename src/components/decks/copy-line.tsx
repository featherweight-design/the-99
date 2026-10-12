"use client";
// Where an added copy went, as one row: the card, the sentence, and Change (plan
// `plan-added-copy-2026-10-12`, the handoff's CopyLine). Change opens the shipped chooser under the
// row and becomes Done; a pick moves the copy through the chooser's own write (`assignCopy`), and
// the sentence redraws from the card that write read back.
//
// Drawn on the upload summary's `No longer to buy` rows. Add Cards and I got it reuse it in the
// next PR, which is why it lives beside `ContestedCardRow` and not in the summary.

import { useId, useRef, useState } from "react";
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
  // The last card a write read back (before any, the chooser prop), kept for the one state with no
  // card to draw: a null read-back arrives WITH the chooser's refusal, and unmounting the chooser in
  // that same update would drop the sentence and the focus the player's press left on it.
  const [last, setLast] = useState<ContestedCard | undefined>(undefined);
  const panel = useId();
  const name = useRef<HTMLSpanElement>(null);
  const said = live === undefined ? sentence : live ? liveSentence(live) : null;
  // The chooser behind Change: the read-back once there is one. A null read-back (the last copy
  // went) is terminal: the open chooser stays to show its refusal, and `Done` closes it for good,
  // since every option a reopened chooser offered could only be refused.
  const gone = live === null;
  const current = gone ? (open ? (last ?? chooser) : undefined) : (live ?? chooser);
  const onCard = (c: ContestedCard | null) => {
    setLive(c);
    if (c) setLast(c);
  };
  const toggle = () => {
    // Closing the terminal chooser takes its button with it, so focus goes to the row's card.
    if (gone && open) name.current?.focus();
    setOpen((o) => !o);
  };

  return (
    <li style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex flex-col md:flex-row md:items-center gap-[2px] md:gap-[10px] py-[6px] min-h-[46px] md:min-h-[44px]">
        <span
          ref={name}
          tabIndex={-1}
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
              onClick={toggle}
              className="text-[13.5px] min-h-[44px] flex-none text-[color:var(--accent)]"
            >
              {open ? copy.done : copy.change}
            </button>
          ) : null}
        </span>
      </div>
      {current && open ? (
        <div id={panel} className="pt-[2px] pb-[12px]">
          <ContestedCardRow card={current} addedCopy onCard={onCard} />
        </div>
      ) : null}
    </li>
  );
}
