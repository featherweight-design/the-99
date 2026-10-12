"use client";

// `Put back` — the one control this feature adds.
//
// It sits in the action slot `DiffRowOut` already reserves (and draws nothing
// in when it is null), on every row under `Going out`, for as long as the draft
// exists. It always succeeds, and that is a ruling rather than an omission: a
// restore is an ADD, and adds in this app never refuse on claims — they price
// them. Refusing one would make putting a card back stricter than adding the
// same card from the deck page one route away.
//
// Borderless, unlike `PullControl` beside it, whose `ACTION_BOX` carries a
// border. That is deliberate and was ratified at R3: demoting `Pull it` to
// match was withdrawn with the refusal states it was fitting on one line, so
// the two controls differ. The one that writes to another deck keeps its box.

import { useEffect } from "react";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { draftAnnouncer } from "./draft-announcer";

const copy = deckVersioningCopy.restore;

/** 44px square on the phone, 34px above it, right-aligned — never centred,
 *  which leaves the label inboard of its target and the trailing column ragged.
 *  No border and no fill: the row's only weight is the word. */
export const PUT_BACK_LINK =
  "inline-flex items-center justify-end min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-[34px] " +
  "pr-[3px] bg-transparent border-0 font-sans font-semibold text-[12.5px] md:text-[12px] " +
  "text-[color:var(--accent)] md:hover:text-[color:var(--accent-hover)] cursor-pointer transition-colors " +
  "disabled:opacity-50 disabled:cursor-default";

export function PutBackControl({
  card,
  onRestore,
}: {
  card: { oracleId: string; name: string };
  /** The list owns the write, because the row is what leaves. This control only
   *  says which card and stays out of the way. */
  onRestore: (card: { oracleId: string; name: string }) => void;
}) {
  // The region has to be in the document before any text reaches it — a region
  // that appears in the same paint as its message is not announced at all — and
  // this row is removed by its own success, so the region cannot live inside it.
  useEffect(() => {
    draftAnnouncer();
  }, []);

  return (
    <button
      type="button"
      className={PUT_BACK_LINK}
      // The two words repeat down the column; out of context they say nothing
      // about which card is going back.
      aria-label={copy.ctaA11y(card.name)}
      onClick={(event) => {
        // The whole row is a button that opens the card. Without this, putting
        // a card back also opens it.
        event.stopPropagation();
        onRestore(card);
      }}
    >
      {copy.cta}
    </button>
  );
}
