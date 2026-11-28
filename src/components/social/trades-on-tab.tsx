"use client";
// Friend trades on a friend's Spares tab (handoff `design_handoff_the99_friend_trades`, Spares S0/S0w/S9 and Ask S1):
// the Trades with X box above the spares, the trade sheet over the tab, and the spares sheet's Trade press. One sheet at
// a time: a Trade press closes the spares sheet before the trade sheet opens on the pressed card. `?trade=<id>` opens
// that trade on landing, once, and is stripped from the address first (`mirrorUrl`), as `?spare=` is.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { mirrorUrl } from "../../lib/url/mirror";
import { useHydrated } from "../ui/hydrated-art";
import type { FriendSpareLine } from "../../lib/social/spares";
import type { OtherSide } from "../../lib/social/spare-requests";
import type { OfferedTo, TradeListRow, TradePrices, TradeView } from "../../lib/social/trade-reads";
import { TradesHead } from "./trades-head";
import { TradeSheet, type TradeOpen } from "./trade-sheet";
import { TradePressContext } from "./friend-spares";
import { usePageSpares } from "./spare-markers";

/** What the page read for trades with this friend; absent, the tab draws no trades. */
export type TabTrades = {
  /** The friend, as the trade reads draw them (a `ThirdPartyName`). */
  friend: OtherSide;
  rows: TradeListRow[];
  /** Q10: an offer of the reader's to this friend is unanswered. */
  held: boolean;
  /** The reader's own spares as this friend sees them (`loadOwnSparesFor`). */
  yours: FriendSpareLine[];
  /** Q9: the reader's spares already in one of their open offers. */
  offered: Record<string, OfferedTo[]>;
  prices: TradePrices;
  /** `?trade=`'s trade, when it is one of the reader's; null otherwise. */
  landing: TradeView | null;
  now: Date;
};

const OpenTrade = createContext<((open: TradeOpen) => void) | null>(null);

export function TradesOnTab({ friend, theirSpares, trades, children }: {
  friend: OtherSide; theirSpares: readonly FriendSpareLine[]; trades: TabTrades; children: ReactNode;
}) {
  const [open, setOpen] = useState<TradeOpen | null>(null);
  const hydrated = useHydrated();
  const timeZone = hydrated ? undefined : "UTC";
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current) return;
    landed.current = true;
    const url = new URL(window.location.href);
    // Only a parameter still in the address lands: a Back that remounts the tab must not reopen the sheet.
    if (!url.searchParams.has("trade")) return;
    url.searchParams.delete("trade");
    mirrorUrl(url);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is read only after mount, and decides the sheet
    if (trades.landing) setOpen({ kind: "trade", id: trades.landing.id, view: trades.landing });
  }, [trades.landing]);
  return (
    <OpenTrade.Provider value={setOpen}>
      <TradesHead friend={friend.displayName} rows={trades.rows} held={trades.held} now={trades.now} timeZone={timeZone}
        onOpen={(id) => setOpen({ kind: "trade", id })} onPropose={() => setOpen({ kind: "new" })} />
      {children}
      {open ? (
        <TradeSheet key={open.kind === "trade" ? open.id : "new"} friend={friend} open={open} held={trades.held} theirSpares={theirSpares} yourSpares={trades.yours}
          offered={trades.offered} prices={trades.prices} onClose={() => setOpen(null)} onOpen={setOpen} />
      ) : null}
    </OpenTrade.Provider>
  );
}

/** Opens the tab's trade sheet (the Wanted call-out's Trade press); null outside `TradesOnTab`. */
export function useOpenTrade(): ((open: TradeOpen) => void) | null {
  return useContext(OpenTrade);
}

/**
 * The spares sheet's Trade press, inside `FriendSparesProvider` (whose sheet it closes first). Held (Q10), the row says
 * Offer waiting instead.
 */
export function TradePressBridge({ friend, held, wants, open, children }: {
  friend: string; held: boolean; wants: readonly string[]; open: number; children: ReactNode;
}) {
  const setOpen = useContext(OpenTrade);
  const spares = usePageSpares();
  if (!setOpen) return <>{children}</>;
  return (
    <TradePressContext.Provider value={{
      of: (id) => (id === friend ? { held, wants, open } : null),
      onTrade: (_friend, oracleId) => { spares?.close(); setOpen({ kind: "new", first: oracleId }); },
    }}>
      {children}
    </TradePressContext.Provider>
  );
}
