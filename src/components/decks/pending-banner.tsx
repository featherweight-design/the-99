"use client";

// Surface 1 (#389), what is left of it: the committed version line ("vN · committed <date>"), and the
// focus a commit or a discard lands on. A draft's changes are the to-do card's pending row now
// (handoff `deck_messages`, `PendingRow` in todo-card.tsx), with Commit and Discard in Review; this
// strip stays until PR 2 makes it the card's foot.

import { useEffect, useRef } from "react";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { hasChanges, type DraftState } from "../../lib/decks/draft-shape";
import { formatDeckDate } from "../../lib/decks/format";
import { COMMIT_RECEIPT_HASH, DISCARD_RECEIPT_HASH } from "./draft-announcer";
import { mirrorUrl } from "../../lib/url/mirror";

const copy = deckVersioningCopy.pending;

interface PendingBannerProps {
  state: DraftState;
}

/** The committed version line, and where a commit lands. Focusable but not a tab
 *  stop — `tabIndex={-1}` — because it is a statement, not a control: it exists
 *  to be reachable programmatically once, the paint after the commit sheet or a
 *  discard navigated here. See `COMMIT_RECEIPT_HASH` for why that matters. */
function VersionLine({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const hash = window.location.hash;
    if (hash !== COMMIT_RECEIPT_HASH && hash !== DISCARD_RECEIPT_HASH) return;
    ref.current?.focus();
    // `replaceState`, so the receipt does not become an entry the reader can go
    // back to and re-fire.
    mirrorUrl(`${window.location.pathname}${window.location.search}`);
  }, []);
  return (
    <span
      ref={ref}
      tabIndex={-1}
      className="font-mono text-[11px] text-[color:var(--fg-faint)]"
    >
      {text}
    </span>
  );
}

export function PendingBanner({ state }: PendingBannerProps) {
  // A brew has no version to state, and a draft with changes is the to-do card's row. `hasChanges`
  // and not a nameable count, because a draft that moved only basics is still a draft.
  if (state.version === null || hasChanges(state)) return null;
  return (
    <div className={STRIP}>
      <VersionLine
        text={copy.versionLine(state.version.number, formatDeckDate(state.version.committedAt))}
      />
    </div>
  );
}

// The clean state is not the pending banner — it is a single line — so it keeps
// the strip it shipped in.
const STRIP =
  "flex flex-wrap md:flex-nowrap items-center gap-[10px] md:gap-[12px] " +
  "px-[16px] py-[10px] md:px-[30px] md:py-[12px] bg-[color:var(--surface-rail)] " +
  "[border-bottom:1px_solid_var(--border)]";
