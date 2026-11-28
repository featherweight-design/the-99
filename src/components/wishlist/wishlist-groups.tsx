"use client";
// Cart on your wishlist (handoff `design_handoff_the99_cart_wishlist`): the tab's one-time offer (W1, call 2) and, while
// the sync is on, the tab split by source into deck boxes (W2, call 3).

import { useState, useTransition } from "react";
import { wishlistCopy } from "../../lib/copy/wishlist";
import { Bookmark } from "../card-search/search-row";
import { ArrivalDismiss } from "../decks/arrival-strip";
import { GhostButton } from "../ui/button";
import { acceptWishlistOfferAction, dismissWishlistOfferAction } from "../../app/collection/wishlist/actions";

const copy = wishlistCopy.page;

/** A box of the split tab: `Added by you` (deckId null) or one deck's. */
export type WishlistGroup = { key: string; title: string; deck: { id: string; name: string } | null; oracleIds: string[] };

/**
 * The split (call 3). A line the hand side wants sits in `Added by you` only; a synced line sits in the box of every
 * deck that needs it. `Added by you` comes first, then the decks in the order given (by name). A box with no card is
 * not drawn. A synced line whose decks are all gone (a deck deleted before the next pass takes its line) sits in `Added
 * by you` rather than vanishing, so every card the meta line counts is drawn.
 */
export function groupTiles(
  tiles: readonly { oracleId: string; source?: "hand" | "deck"; deckIds?: readonly string[] }[],
  decks: readonly { id: string; name: string }[],
): WishlistGroup[] {
  const hand: string[] = [];
  const byDeck = new Map<string, string[]>();
  const known = new Set(decks.map((d) => d.id));
  for (const t of tiles) {
    const ids = t.source === "deck" ? (t.deckIds ?? []).filter((id) => known.has(id)) : [];
    if (ids.length === 0) {
      hand.push(t.oracleId);
      continue;
    }
    for (const id of ids) {
      const list = byDeck.get(id);
      if (list) list.push(t.oracleId);
      else byDeck.set(id, [t.oracleId]);
    }
  }
  const groups: WishlistGroup[] = [];
  if (hand.length > 0) groups.push({ key: "hand", title: copy.groups.you, deck: null, oracleIds: hand });
  for (const d of decks) {
    const ids = byDeck.get(d.id);
    if (ids?.length) groups.push({ key: d.id, title: copy.groups.deck(d.name), deck: { id: d.id, name: d.name }, oracleIds: ids });
  }
  return groups;
}

/**
 * The offer (W1): the bookmark, the count and what Add them does, the ghost Add them, and the ✕ (`Not now`). Either
 * answer is for good, so the strip leaves at the press; a failed Add them brings it back with the failure toast.
 */
export function CartOffer({ cards, onAdded, onFailure }: { cards: number; onAdded: () => void; onFailure: (what: "add" | "dismiss") => void }) {
  const [gone, setGone] = useState(false);
  const [pending, start] = useTransition();
  if (gone) return null;

  function add() {
    start(async () => {
      try {
        await acceptWishlistOfferAction();
        setGone(true);
        onAdded();
      } catch {
        onFailure("add");
      }
    });
  }

  // The strip leaves at the press; a refused write brings it back under the failure toast, never silently.
  function dismiss() {
    setGone(true);
    dismissWishlistOfferAction().catch(() => {
      setGone(false);
      onFailure("dismiss");
    });
  }

  return (
    <div
      data-testid="wishlist-offer"
      className="mx-[14px] mt-[12px] flex items-start gap-[12px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-[16px] py-[12px] text-[13.5px] text-[color:var(--fg-body)] md:mx-[34px] md:mt-[14px] md:items-center md:text-[14px]"
    >
      <span aria-hidden className="mt-[2px] flex-none text-[color:var(--accent-text)] md:mt-0">
        <Bookmark />
      </span>
      <div className="min-w-0 flex-1 md:flex md:items-center md:gap-[16px]">
        <p className="m-0 min-w-0 md:flex-1">
          <span className="font-medium text-[color:var(--fg)]">{copy.offer.lead(cards)}</span>{" "}
          <span className="text-[color:var(--fg-muted)]">{copy.offer.body}</span>
        </p>
        <GhostButton
          onClick={add}
          disabled={pending}
          className="mt-[12px] h-[44px] min-h-0 flex-none rounded-[9px] px-[18px] text-[13.5px] font-semibold disabled:opacity-50 md:mt-0 md:h-[36px]"
        >
          {copy.offer.add}
        </GhostButton>
      </div>
      <ArrivalDismiss onDismiss={dismiss} label={copy.offer.dismiss} />
    </div>
  );
}
