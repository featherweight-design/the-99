// Builder Spine — §Builder Spine (header, /decks/[id]).
// Client component. The header itself is the two art-wash bands; what is left
// here is the availability rollup that sits between them and the decklist.
"use client";

import type { DeckDetail } from "../../lib/decks/read";
import { AvailabilityGlyph } from "@/components/ui/availability-marker";
import { availabilityCopy } from "../../lib/copy/availability";
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
    built: number; ownedCount: number; toBuyCount: number; proxiedCount?: number;
  };
  onExport: () => void;
  /**
   * Cards in this deck that some draft also wants. The over-committed count, its disjoint partner,
   * is the to-do card's spoken-for-twice row (deck messages A6).
   */
  softClaimed: number;
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

/**
 * The soft band: cards a draft also wants. Its red neighbour is the to-do card's spoken-for-twice
 * row now (deck messages A6), so it stands alone, and it moves into the card's foot next. The two
 * widths are separate trees because the skin differs: a full-bleed band, heading over body, on the
 * phone; a rounded card, heading beside body, on desktop.
 */
function SoftBand({ softClaimed }: { softClaimed: number }) {
  const rollup = availabilityCopy.deckRollup;
  const heading = rollup.softHeading(softClaimed);
  return (
    <section
      aria-label={rollup.regionAria}
      className="mt-[14px] md:mt-[18px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div
        className="md:hidden flex items-start gap-[9px] px-[16px] py-[10px]"
        style={{ background: "var(--surface)", borderLeft: "3px solid var(--border-dashed)" }}
      >
        <span className="mt-[4px] flex-none">
          <AvailabilityGlyph state="soft" seam="var(--surface)" />
        </span>
        <div className="flex-1">
          <div className="text-[12.5px] font-semibold" style={{ color: "var(--fg-body)" }}>{heading}</div>
          <div className="text-[12px] mt-[3px]" style={{ color: "var(--fg-muted)", lineHeight: 1.55 }}>
            {rollup.softBody}
          </div>
        </div>
      </div>
      <div className="hidden md:flex flex-col px-[30px] py-[14px]">
        <div
          className="flex items-center gap-[11px] rounded-[10px] px-[16px] py-[12px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--border-dashed)",
          }}
        >
          <AvailabilityGlyph state="soft" seam="var(--surface)" />
          <div className="text-[13px] font-semibold flex-none" style={{ color: "var(--fg-body)" }}>{heading}</div>
          <div className="text-[13px]" style={{ color: "var(--fg-muted)" }}>{rollup.softBody}</div>
        </div>
      </div>
    </section>
  );
}

export function BuilderSpine({
  deck,
  counts,
  onExport,
  softClaimed,
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

    {/* Below the spine: a claim about the whole deck. No count, no region. */}
    {softClaimed > 0 && <SoftBand softClaimed={softClaimed} />}
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
