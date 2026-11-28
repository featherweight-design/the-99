"use client";
// The trade sheet away from a friend's Spares tab (handoff `design_handoff_the99_friend_trades`, MakeTrade A1 to A3 and
// Lists L1/RH): Friends and Home mount one host, and a press anywhere under it opens the sheet over the page it is on.
// The friend's spares, prices and cap are read at the press (`openTradeSheetAction`), since neither page reads them for
// every friend. One sheet at a time; a press while one is being read is ignored, and a failed read draws the toast.
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { openTradeSheetAction } from "../../app/friends/trade-actions";
import { tradeCopy as t } from "../../lib/copy/trades";
import { personAttrs, type ThirdPartyName } from "../../lib/person-name";
import { captureClientError } from "../../lib/sentry/capture-client";
import type { FeedView } from "../../lib/feed/home";
import type { TradeCard, TradeSheetData } from "../../lib/social/trade-reads";
import { useSpareToast } from "./spare-answer";
import { TradeSheet, type TradeOpen } from "./trade-sheet";

type Host = {
  /** Opens `open` with the friend `friendPublicId`; `key` names the press, for its busy state. */
  open: (friendPublicId: string, open: TradeOpen, key: string) => void;
  /** The press whose friend is being read. */
  pending: string | null;
};

const HostContext = createContext<Host | null>(null);

export function useTradeSheet(): Host | null {
  return useContext(HostContext);
}

export function TradeSheetHost({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<{ friendPublicId: string; data: TradeSheetData; open: TradeOpen } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const toast = useSpareToast();
  // The in-flight guard is a ref: two presses before React commits `pending` would both pass a state check.
  const reading = useRef(false);
  async function open(friendPublicId: string, next: TradeOpen, key: string) {
    if (reading.current) return;
    reading.current = true;
    setPending(key);
    try {
      const data = await openTradeSheetAction(friendPublicId);
      if (data) setSheet({ friendPublicId, data, open: next });
      else toast.fail();
    } catch (e) {
      captureClientError("trades.sheet", e);
      toast.fail();
    } finally {
      reading.current = false;
      setPending(null);
    }
  }
  // A send (or a press on an offered card) moves the sheet on with the data read at the press, so the cap and the
  // offered markers are read again behind it; the sheet stays drawn meanwhile, and a failed re-read keeps what it had.
  function refresh(friendPublicId: string) {
    openTradeSheetAction(friendPublicId)
      .then((data) => { if (data) setSheet((s) => (s && s.friendPublicId === friendPublicId ? { ...s, data } : s)); })
      .catch((e) => captureClientError("trades.sheet", e));
  }
  const sheetKey = (o: TradeOpen) => (o.kind === "trade" ? o.id : o.kind === "askBack" ? `ask:${o.fromRequestId}` : "new");
  return (
    <HostContext.Provider value={{ open: (f, o, k) => void open(f, o, k), pending }}>
      {children}
      {sheet ? (
        <TradeSheet key={sheetKey(sheet.open)} friend={sheet.data.friend} open={sheet.open} held={sheet.data.held}
          theirSpares={sheet.data.theirSpares} yourSpares={sheet.data.yours} offered={sheet.data.offered} prices={sheet.data.prices}
          onClose={() => setSheet(null)} onOpen={(o) => { setSheet({ ...sheet, open: o }); refresh(sheet.friendPublicId); }} />
      ) : null}
      {toast.node}
    </HostContext.Provider>
  );
}

/**
 * Make it a trade on a feed row's Yes receipt (What's new A1, Home's lead A2): one rule for both, a Yes to an ask, never
 * to an offer (an offer is already a give). Draws nothing otherwise, so the caller wraps it in its own action line.
 */
export function FeedAskBack({ item, answered, size }: { item: FeedView; answered: string | null; size: "row" | "lead" }) {
  const ask = item.ask;
  if (!ask || ask.offer !== undefined || answered !== "yes" || !item.friend || !item.card) return null;
  return (
    <AskBackPress friendPublicId={item.friend.publicId} friend={item.friend.displayName} requestId={ask.id} size={size}
      card={{ oracleId: item.card.oracleId, name: item.card.name, imageUri: item.card.image }} />
  );
}

/**
 * Make it a trade (D1), on the holder's Yes receipt: the row's accent link (A1) or the lead's filled press (A2). It opens
 * the sheet with the Yes card on the reader's side. Without a host above it, it draws nothing.
 */
export function AskBackPress({ friendPublicId, friend, requestId, card, size }: {
  friendPublicId: string; friend: ThirdPartyName; requestId: string; card: TradeCard; size: "row" | "lead";
}) {
  const host = useTradeSheet();
  if (!host) return null;
  const key = `ask:${requestId}`;
  const busy = host.pending === key;
  const look = size === "lead"
    ? "inline-flex h-[40px] items-center justify-center rounded-[8px] border-0 bg-[color:var(--accent)] px-[16px] font-sans text-[13.5px] font-semibold whitespace-nowrap text-[color:var(--bg)] md:h-[36px] md:text-[13px]"
    : "inline-flex min-h-[44px] items-center whitespace-nowrap border-0 bg-transparent p-0 font-sans text-[13px] font-medium text-[color:var(--accent-text)] md:min-h-[36px]";
  return (
    <button type="button" data-testid="ask-back" aria-busy={busy || undefined} disabled={host.pending !== null}
      onClick={() => host.open(friendPublicId, { kind: "askBack", fromRequestId: requestId, yes: card }, key)}
      {...personAttrs({ "aria-label": t.askBackAria(friend) }, `${look} cursor-pointer disabled:cursor-default`)}>
      {t.askBack} ›
    </button>
  );
}
