"use client";
// The spare marks a Shopping key draws, and the page's spares context they read: the glyph, its mark, the key's item and the
// context with its hook. Pure: no action, no read, no per-user import. `spare-markers.tsx` (the provider that fills the
// context) and `friend-spares.tsx` re-export these, so every old import path keeps working.

import { createContext, useContext } from "react";
import type { FriendSpare } from "../../lib/social/spares";
import type { AskStateLine } from "../../lib/social/spare-requests";
import { spareCopy } from "../../lib/copy/social";
import type { RequestsCtx } from "./friend-spares";
import type { SpareCard } from "./spare-markers";

/** An ask the asker still holds open: the stored open ask, whatever G3 derives of it at read (it still blocks the card). */
export const isOpen = (a: AskStateLine) => a.state === "open" || a.state === "unavailable" || a.state === "unneeded";

/** The spare glyph's mark on the row and in the key (call 4): requested while an ask is open, accepted after a yes. */
export type SpareMark = "requested" | "accepted" | null;

export function cardMark(asks: readonly AskStateLine[]): SpareMark {
  if (asks.some(isOpen)) return "requested";
  if (asks.some((a) => a.state === "yes")) return "accepted";
  return null;
}

/**
 * The two-people glyph with its mark (`.sg`, `.sg.asked`, `.sg.yes`): fact ink plain, an accent dot at its top right
 * once requested, success ink with a ticked dot at its foot once accepted. The dot's ring is the row's own ground, and
 * the tick is drawn in the ground's ink (`--bg`, the board's fixed dark ink in the dark theme) rather than a hex.
 */
export function MarkedSpareGlyph({ mark, size, testId }: { mark: SpareMark; size: number; testId?: string }) {
  return (
    <span
      data-testid={testId}
      data-mark={mark ?? "spare"}
      className={`relative inline-flex ${mark === "accepted" ? "text-[color:var(--success)]" : "text-[color:var(--fact)]"}`}
    >
      <SpareGlyph size={size} />
      {mark === "requested" ? (
        <span
          aria-hidden="true"
          className="absolute right-[-3px] top-[-2px] size-[7px] rounded-full bg-[color:var(--accent)] shadow-[0_0_0_1.5px_var(--row-bg,var(--bg))]"
        />
      ) : null}
      {mark === "accepted" ? (
        <>
          <span
            aria-hidden="true"
            className="absolute bottom-[-1px] right-[-4px] size-[8px] rounded-full bg-[color:var(--success)] shadow-[0_0_0_1.5px_var(--row-bg,var(--bg))]"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-[2px] right-[-1.5px] z-[1] h-[2px] w-[3.5px] -rotate-45 [border-bottom:1.3px_solid_var(--bg)] [border-left:1.3px_solid_var(--bg)]"
          />
        </>
      ) : null}
    </span>
  );
}

/** The two-people glyph the spare marker and count chip draw (R3 `.spm`, `.sp2`). */
export function SpareGlyph({ size }: { size: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="16.5" cy="9.5" r="2.6" />
      <path d="M15.5 14.2c2.6-.3 4.6 1.3 5.1 4.3" />
    </svg>
  );
}

export type Ctx = {
  /** The cards with a spare, and their friends: the cards on the list NOW only. */
  byCard: ReadonlyMap<string, FriendSpare[]>;
  /** Every card's spares read this visit, a card that left the list included (the cart keeps a line bought this
   *  visit as a held slot, and By friend draws it under the friends it sat under). */
  seen: ReadonlyMap<string, FriendSpare[]>;
  /** The card whose spares-only modal is open (outside a deck page: the cart), or null. */
  opened: SpareCard | null;
  open: (card: SpareCard) => void;
  close: () => void;
  newestAsOf: Date | null;
  requests: RequestsCtx | null;
  /** The cards whose spares read has landed this visit: a card here with no row has no spare now, unless it is in `failed`. */
  loaded: ReadonlySet<string>;
  /** The landed cards whose newest read failed: their spares are not known, so nothing may say they have none. */
  failed: ReadonlySet<string>;
  /** Read every asked card's spares again (the cart's Try again, v2 addendum R2 B2): the failed cards are reading again
   *  until it lands. */
  retry: () => void;
};

export const SparesContext = createContext<Ctx | null>(null);

/** Null outside the provider: the switch is off, and no row reserves the column. */
export function usePageSpares(): Ctx | null {
  return useContext(SparesContext);
}

/**
 * The key's item, drawn only while a spare is (S2: none in S1): among `among` when given, the cards a view draws. Then
 * `requested` and `accepted`, each only while a row draws that mark (E1: after the spare item, in the shipped order).
 */
export function SpareKeyItem({ className, among, reading = false }: {
  className: string;
  among?: ReadonlySet<string>;
  /** The all-decks cart while friends' spares are read: the plain item draws before any spare has landed. */
  reading?: boolean;
}) {
  const ctx = usePageSpares();
  if (!ctx) return null;
  const drawn = [...ctx.byCard.keys()].filter((id) => !among || among.has(id));
  if (drawn.length === 0 && !reading) return null;
  const marks = new Set(ctx.requests ? drawn.map((id) => cardMark(ctx.requests!.asksFor(id))) : []);
  return (
    <>
      <span className={className} data-testid="spare-key">
        <span className="flex w-[18px] justify-center">
          <MarkedSpareGlyph mark={null} size={16} />
        </span>
        {spareCopy.key}
      </span>
      {marks.has("requested") ? (
        <span className={className} data-testid="spare-key-requested">
          <span className="flex w-[18px] justify-center">
            <MarkedSpareGlyph mark="requested" size={16} />
          </span>
          {spareCopy.request.keyRequested}
        </span>
      ) : null}
      {marks.has("accepted") ? (
        <span className={className} data-testid="spare-key-accepted">
          <span className="flex w-[18px] justify-center">
            <MarkedSpareGlyph mark="accepted" size={16} />
          </span>
          {spareCopy.request.keyAccepted}
        </span>
      ) : null}
    </>
  );
}

