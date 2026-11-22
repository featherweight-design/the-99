"use client";
// The Wishlist tile's friend-spare press (find-a-friend's-spare R1, call 2): the deck row's other-ways box (outlined 26px,
// the spare glyph in `--fact`, `TOUCH_HIT` to 44px on a coarse pointer) over the caption's lower right. It is the tile
// press's SIBLING, never its child: a button holds no button. One friend draws the glyph, two or more draw the glyph and
// how many; a request mark rides the glyph as on the deck row. It opens the shipped spares-only modal, which the page's
// provider hosts. Nothing here reads: the provider's one read lands after the page, and a card it found nothing for, or
// a read that failed, draws no press at all.

import { wishlistCopy } from "../../lib/copy/wishlist";
import { spareCopy } from "../../lib/copy/social";
import { MarkedSpareGlyph, cardMark, usePageSpares } from "../social/spare-key-item";
import type { SpareCard } from "../social/spare-markers";
import { TOUCH_HIT } from "../ui/touch-hit";

/** The press's draw: the same on the tab's tile and in the sort's key. The fade is the late arrival's, none under reduced motion. */
export const SPARE_PRESS_FADE = "motion-safe:animate-[spare-fade-in_160ms_ease-out]";

/** What an Ask from here names: no deck, and the copies the line still wants (want minus have, at least one). */
export const stillNeeded = (want: number, have: number) => Math.max(1, want - have);

export function WishlistSparePress({ card, want, have }: { card: SpareCard; want: number; have: number }) {
  const ctx = usePageSpares();
  const friends = ctx?.byCard.get(card.oracleId)?.length ?? 0;
  if (!ctx || friends === 0) return null;
  const mark = ctx.requests ? cardMark(ctx.requests.asksFor(card.oracleId)) : null;
  const base = wishlistCopy.page.sparePress.aria(card.name, friends);
  const label = mark ? spareCopy.request.markAria(base, mark) : base;
  const open = ctx.opened?.oracleId === card.oracleId;
  return (
    <span className="absolute bottom-[8px] right-[6px] z-[1] flex md:bottom-[9px] md:right-[8px]">
    <button
      type="button"
      data-testid="wishlist-spare-press"
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => ctx.open({ ...card, quantity: stillNeeded(want, have) })}
      className={`${SPARE_PRESS_FADE} ${TOUCH_HIT} flex h-[26px] min-w-[26px] cursor-pointer items-center justify-center gap-[4px] rounded-[6px] bg-transparent px-[5px] [border:1px_solid_var(--border-strong)] ${open ? "ring-2 ring-[color:var(--accent)]" : ""}`}
    >
      <MarkedSpareGlyph mark={mark} size={16} testId="wishlist-spare-glyph" />
      {friends > 1 ? <span aria-hidden className="font-mono text-[10px] leading-none text-[color:var(--fg-muted)]">{friends}</span> : null}
    </button>
    </span>
  );
}
