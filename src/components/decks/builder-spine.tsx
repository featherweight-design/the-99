// Builder Spine — §Builder Spine (header, /decks/[id]).
// Client component: the two art-wash bands and their shared deck Move. The commitments roll-up
// that sat under them is the to-do card's now (deck messages A6): spoken for twice a row, other
// drafts a foot segment.
"use client";

import type { DeckDetail } from "../../lib/decks/read";
import type { TileBracket } from "../../lib/decks/read";
import { SpineDesktop } from "./spine-desktop";
import { SpineMobile } from "./spine-mobile";
import { useDeckShelfMove, type DeckShelf } from "./deck-shelf-move";
import type { DeckMove } from "./deck-card-overflow";
import type { StatusPill } from "../../lib/decks/status";
import type { HeaderNotice } from "./notice-tag";

interface BuilderSpineProps {
  deck: DeckDetail;
  /**
   * From the builder's optimistic list, not `deck` — the spine holds the
   * progress bar, which is the largest thing on the page and the one the user
   * is watching when they click. Leaving it on server counts would make the
   * headline number the last thing to move.
   */
  counts: {
    built: number; ownedCount: number; toBuyCount: number;
  };
  onExport: () => void;
  /**
   * The server status, computed once in builder-shell. A prop rather than a
   * second `statusPill()` call here: the shell's is keyed off the server counts
   * deliberately, and a spine that recomputed it from its own optimistic
   * `counts` would name a different status than the page it sits on.
   */
  status: StatusPill;
  /** Passed straight through to both widths — see `SpineBandProps`. */
  offerFirstCommit?: boolean;
  /** The header's bracket chip, or null when the deck is unread. See `SpineBandProps`. */
  bracket?: TileBracket | null;
  onOpenBracket?: () => void;
  /** The header's notice and its press. See `SpineBandProps`. */
  notice?: HeaderNotice | null;
  onOpenNotices?: () => void;
  /** The deck's shelf and the shelves it can move to, for the ⋯ menu's Move. Absent, no Move row. */
  shelf?: DeckShelf;
}

export function BuilderSpine({
  deck,
  counts,
  onExport,
  status,
  offerFirstCommit,
  bracket = null,
  onOpenBracket,
  notice = null,
  onOpenNotices,
  shelf,
}: BuilderSpineProps) {
  // One drawing of both spines, with the deck menu's Move when the page read the shelves.
  const spines = (move?: DeckMove) => (
    <>
      <SpineDesktop
        deck={deck}
        counts={counts}
        status={status}
        onExport={onExport}
        offerFirstCommit={offerFirstCommit}
        bracket={bracket}
        onOpenBracket={onOpenBracket}
        notice={notice}
        onOpenNotices={onOpenNotices}
        move={move}
      />
      <SpineMobile
        deck={deck}
        counts={counts}
        status={status}
        onExport={onExport}
        offerFirstCommit={offerFirstCommit}
        bracket={bracket}
        onOpenBracket={onOpenBracket}
        notice={notice}
        onOpenNotices={onOpenNotices}
        move={move}
      />
    </>
  );
  return (
    <>
    {shelf ? <ShelfSpines shelf={shelf} deckId={deck.id}>{spines}</ShelfSpines> : spines()}
    </>
  );
}

/** Both spines share one Move: one shelf prediction, one create dialog, one announcement. */
function ShelfSpines({ deckId, shelf, children }: {
  deckId: string;
  shelf: DeckShelf;
  children: (move: DeckMove) => React.ReactNode;
}) {
  const { move, dialog, announced } = useDeckShelfMove(deckId, shelf);
  return (
    <>
      {children(move)}
      {dialog}
      <span role="status" className="sr-only">{announced}</span>
    </>
  );
}
