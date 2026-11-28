"use client";
// Trade on the spares sheet over a deck or All shopping (handoff `design_handoff_the99_friend_trades`, Ask D1, FromDeck
// D2 to D4). Inside `FriendSparesProvider` and a `TradeSheetHost`, around the `SparesSheetHost` it adds Trade to: every
// friend row on the opened card gains Trade, or `Offer waiting` (Q10), once that friend's facts are read
// (`tradePressesAction`, one read per sheet for the friends not read this visit). Trade closes the spares sheet and opens
// the trade sheet with the card on the friend's side; its back reopens the spares sheet, so the two never stack. On a deck
// a card with stand-ins opens the stand-ins sheet instead, whose friends section is the same rows: `sheet` names that one.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { tradePressesAction } from "../../app/friends/trade-actions";
import { captureClientError } from "../../lib/sentry/capture-client";
import { TRADE_PRESS_FRIENDS, type TradeFrom } from "../../lib/social/trade-from";
import type { TradePressFacts } from "../../lib/social/trade-reads";
import { TradePressContext } from "./friend-spares";
import { usePageSpares } from "./spare-key-item";
import { useTradeSheet } from "./trade-sheet-host";

/** The sheet whose friend rows gain Trade: the card it is open on, how to close it, and how the trade sheet's back reopens it. */
export type TradeFromSheet = { oracleId: string | null; close: () => void; reopen: () => void };

export function TradeFromList({ from, sheet, children }: { from: TradeFrom; sheet?: TradeFromSheet; children: ReactNode }) {
  const spares = usePageSpares();
  const host = useTradeSheet();
  const [facts, setFacts] = useState<Readonly<Record<string, TradePressFacts>>>({});
  // The friends asked for this visit (landed or in flight), so a reopened sheet reads nothing again.
  const asked = useRef(new Set<string>());
  const opened = spares?.opened ?? null;
  const on: TradeFromSheet | null = sheet ?? (spares ? {
    oracleId: opened?.oracleId ?? null,
    close: spares.close,
    reopen: () => { if (opened) spares.open(opened); },
  } : null);
  const oracleId = on?.oracleId ?? null;
  const friends = oracleId ? (spares?.byCard.get(oracleId) ?? []).map((s) => s.friend.publicId) : [];
  const friendsKey = friends.join(",");
  useEffect(() => {
    const ids = friendsKey === "" ? [] : friendsKey.split(",").filter((id) => !asked.current.has(id));
    if (ids.length === 0) return;
    for (const id of ids) asked.current.add(id);
    // One read takes TRADE_PRESS_FRIENDS friends at most, so a card more friends spare is asked in batches.
    for (let i = 0; i < ids.length; i += TRADE_PRESS_FRIENDS) {
      const batch = ids.slice(i, i + TRADE_PRESS_FRIENDS);
      tradePressesAction(batch)
        .then((read) => setFacts((f) => ({ ...f, ...read })))
        .catch((e) => {
          // A failed read draws those rows as shipped (Ask only) and lets a later open try again.
          for (const id of batch) asked.current.delete(id);
          captureClientError("trades.presses", e);
        });
    }
  }, [friendsKey]);
  if (!spares || !host || !on) return <>{children}</>;
  return (
    <TradePressContext.Provider value={{
      of: (id) => facts[id] ?? null,
      onTrade: (friend, oracleId) => {
        // A sheet already being read would ignore this open, so the spares sheet stays rather than closing on nothing.
        if (host.pending !== null) return;
        const reopen = on.reopen;
        // A trade started here may take the cap (Q10), so this friend is read again at the next open.
        asked.current.delete(friend);
        setFacts((f) => { const next = { ...f }; delete next[friend]; return next; });
        on.close();
        host.open(friend, { kind: "new", first: oracleId }, `trade:${friend}`, { from, back: reopen });
      },
    }}>
      {children}
    </TradePressContext.Provider>
  );
}
