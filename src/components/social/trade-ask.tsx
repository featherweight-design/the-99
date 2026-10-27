"use client";
// Ask in place (Hugh's ruling 2026-10-27, the menu-home plan's product call 8): a trade match's press (What's new's rows
// and lead story on Home, Waiting on you on /friends) opens the card's spares sheet over the page it was pressed on,
// that friend first, with Ask, and navigates nowhere. The sheet is `SparesSheet` as it ships, through the friend's
// Spares tab's own provider settings: the card's spares read when its sheet opens (the loader until they land), the
// reader's asks for every trade-match card on the page read after it, so a row says Requested or Accepted from its first
// paint and changes as an Ask lands. The push's tap keeps its `?spare=` landing on the friend's tab.

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { PriceFact } from "../../lib/decks/price";
import type { TradeAskCard, TradeAskPayload } from "../../lib/social/trade-ask";
import { socialCopy, spareCopy } from "../../lib/copy/social";
import { rowAsk } from "./friend-spares";
import { FriendSparesProvider, SparesSheetHost, usePageSpares } from "./spare-markers";
import { refreshFriendsAction } from "../../app/friends/spare-actions";


/** The row's state for its friend, in the sheet's words: Requested while the ask is open, Accepted after a yes. */
export type TradeAskState = "requested" | "accepted" | null;

type Ctx = {
  /** Opens the card's sheet with this friend first. The press takes focus first, so closing returns to it on Safari. */
  open: (oracleId: string, friendPublicId: string, from: HTMLElement) => void;
  stateFor: (oracleId: string, friendPublicId: string) => TradeAskState;
  has: (oracleId: string) => boolean;
};

const TradeAskContext = createContext<Ctx | null>(null);

/** Null outside the provider (spare requests off, or a page that does not mount it): the press stays its link. */
export const useTradeAsk = (): Ctx | null => useContext(TradeAskContext);

export function TradeAskProvider({
  cards,
  prices,
  newestAsOf,
  asksVersion,
  refreshFriends = false,
  children,
}: {
  cards: readonly TradeAskCard[];
  /** /friends: an Ask redraws the page, so Your requests lists it (`refreshFriendsAction`). */
  refreshFriends?: boolean;
  /** `FriendSparesProvider`'s: moves when the page's asks changed outside the sheet (Your requests on /friends). */
  asksVersion?: string;
  /** The page's prices for the cards (`loadPrices`), for the sheet's buy tag; a card without one draws the bare tag. */
  prices: Readonly<Record<string, PriceFact | null>>;
  newestAsOf: Date | null;
  children: ReactNode;
}) {
  const ids = useMemo(() => cards.map((c) => c.oracleId), [cards]);
  return (
    <FriendSparesProvider oracleIds={ids} newestAsOf={newestAsOf} requests deckId={null} standalone sparesOnOpen hostSheet={false} asksVersion={asksVersion} onAsk={refreshFriends ? refresh : undefined}>
      <Inner cards={cards} prices={prices}>{children}</Inner>
    </FriendSparesProvider>
  );
}

const refresh = () => void refreshFriendsAction().catch(() => {});

const NONE: TradeAskPayload = { cards: [], prices: {}, newestAsOf: null };

/**
 * The provider over a page's payload, mounted whether or not there is one (Copilot round 1, #2288): a payload that goes
 * (the last trade match hidden, the refresh after an answer) would otherwise swap the provider for a fragment and remount
 * the page under it, dropping what the visit holds (an answer's receipt, Show all). With no card the provider reads
 * nothing and every press stays its link (`has` is false).
 */
export function TradeAskFrame({ payload, asksVersion, refreshFriends, children }: {
  payload: TradeAskPayload | null; asksVersion?: string; refreshFriends?: boolean; children: ReactNode;
}) {
  const p = payload ?? NONE;
  return (
    <TradeAskProvider cards={p.cards} prices={p.prices} newestAsOf={p.newestAsOf} asksVersion={asksVersion} refreshFriends={refreshFriends}>
      {children}
    </TradeAskProvider>
  );
}

function Inner({ cards, prices, children }: { cards: readonly TradeAskCard[]; prices: Readonly<Record<string, PriceFact | null>>; children: ReactNode }) {
  const spares = usePageSpares();
  const [first, setFirst] = useState<string | undefined>(undefined);
  const byId = useMemo(() => new Map(cards.map((c) => [c.oracleId, c])), [cards]);
  const value = useMemo<Ctx | null>(() => {
    if (!spares?.requests) return null;
    const asks = spares.requests;
    return {
      open: (oracleId, friendPublicId, from) => {
        const card = byId.get(oracleId);
        if (!card) return;
        from.focus();
        setFirst(friendPublicId);
        spares.open({ oracleId, name: card.name, printedName: null, layout: null, imageUri: card.imageUri, price: prices[oracleId] ?? null });
      },
      stateFor: (oracleId, friendPublicId) => {
        const kind = rowAsk(asks.asksFor(oracleId), friendPublicId).kind;
        return kind === "requested" ? "requested" : kind === "accepted" ? "accepted" : null;
      },
      has: (oracleId) => byId.has(oracleId),
    };
  }, [spares, byId, prices]);
  return (
    <TradeAskContext.Provider value={value}>
      {children}
      {/* A trade match is a card on the reader's wishlist, so the box says so, as the friend's tab does. */}
      <SparesSheetHost first={first} kickerFor={() => socialCopy.friendPage.spares.onWishlist} />
    </TradeAskContext.Provider>
  );
}

/** The asked press's name: the Ask it was, then its state, so a reader hears the friend as well as Requested. */
export function tradeAskAria(ask: string, state: Exclude<TradeAskState, null>): string {
  return `${ask}, ${state === "requested" ? spareCopy.request.requested : spareCopy.request.accepted}`;
}

/**
 * The press's words once this friend has been asked: the tab's caption, as a label. On the lead's filled button
 * (`filled`) the dot and the words take the button's own ink, since the accent dot and the success green would not read
 * on the accent fill.
 */
export function TradeAskLabel({ state, filled = false }: { state: Exclude<TradeAskState, null>; filled?: boolean }) {
  if (state === "requested") {
    return (
      <span data-trade-ask="requested" className="inline-flex items-center gap-[6px]">
        <i aria-hidden className={`size-[7px] flex-none rounded-full ${filled ? "bg-current" : "bg-[color:var(--accent)]"}`} />
        {spareCopy.request.requested}
      </span>
    );
  }
  return (
    <span data-trade-ask="accepted" className={filled ? undefined : "text-[color:var(--success)]"}>
      ✓ {spareCopy.request.accepted}
    </span>
  );
}
