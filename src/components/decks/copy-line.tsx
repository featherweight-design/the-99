"use client";
// Where an added copy went, as one row: the card, the sentence, and Change (plan
// `plan-added-copy-2026-10-12`, the handoff's CopyLine). Change opens the shipped chooser under the
// row and becomes Done; a pick moves the copy through the chooser's own write (`assignCopy`), and
// the sentence redraws from the card that write read back.
//
// Two forms. `row`: the upload summary's `No longer to buy` rows, the card in its own column and
// the sentence short. `line`: Add Cards' saved state, one sentence that names the card.

import { useId, useRef, useState } from "react";
import { addedCopyCopy as copy } from "../../lib/copy/added-copy";
import { destinationDecks, emphasize, liveDestination, liveSentence, longSentence } from "../../lib/collection/copy-line";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { ContestedCardRow } from "./contested-card-row";

export function CopyLine({
  cardName,
  sentence,
  chooser,
  form = "row",
  decks = [],
}: {
  form?: "row" | "line";
  /** The line form: the deck names the frozen sentence prints, drawn in `--fg` (design table). */
  decks?: readonly string[];
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
  const said = live === undefined ? sentence
    : !live ? null
      : form === "row" ? liveSentence(live)
        : ((d) => (d ? longSentence(d, cardName) : null))(liveDestination(live));
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
    // Closing the terminal chooser takes its button with it, so focus goes to the row's card (the
    // line form's sentence).
    if (gone && open) name.current?.focus();
    setOpen((o) => !o);
  };
  const change = current ? (
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
  ) : null;
  const panelEl = current && open ? (
    <div id={panel} className="pt-[2px] pb-[12px]">
      <ContestedCardRow card={current} addedCopy onCard={onCard} />
    </div>
  ) : null;

  if (form === "line") {
    // Add Cards (design table, CopyLine): min-h 44, pad 8 0, a top rule, the sentence 13.5 / 1.5,
    // `--fg-body` with the card `--fg` 600 and each deck `--fg`, frozen and live alike.
    const liveDecks = live ? ((d) => (d ? destinationDecks(d) : []))(liveDestination(live)) : decks;
    const parts = said ? emphasize(said, cardName, liveDecks) : [];
    return (
      <li style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex min-h-[44px] items-center gap-[10px] py-[8px]">
          {/* The terminal chooser's Done takes its button with it: focus comes here, as on the row's card. */}
          <span ref={name} tabIndex={-1} className="min-w-0 flex-1 text-[13.5px] leading-[1.5]" style={{ color: "var(--fg-body)" }}>
            {parts.map((p, i) => (p.em
              ? <span key={i} data-em={p.em} className={p.em === "card" ? "font-semibold" : undefined} style={{ color: "var(--fg)" }}>{p.text}</span>
              : p.text))}
          </span>
          {change}
        </div>
        {panelEl}
      </li>
    );
  }

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
          {change}
        </span>
      </div>
      {panelEl}
    </li>
  );
}
