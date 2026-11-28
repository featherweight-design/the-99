"use client";
// The Friends page's one Requests box (request history R1d, Hugh 2026-11-17): Waiting on you and Your requests are two tabs
// of one panel. The band holds the shipped SegmentedSwitch (compact, filling the band); the foot holds the way to Request
// history. The box opens on Waiting on you when anything waits, else on Your requests. An answer the reader has not seen
// puts the diamond on Your requests' tab, so it is never hidden behind the other tab. Both lists stay MOUNTED (the hidden
// one is `hidden`, not unmounted), so Waiting on you keeps its visit state and a withdrawn ask still reaches the trade frame.
// Friend trades (handoff `design_handoff_the99_friend_trades`, Lists L1/E3) add a third tab, Trades: five rows, waiting on
// you first, a press opening the trade sheet over this page (`TradeSheetHost`), and a foot naming the rest.
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { historyCopy } from "../../lib/copy/request-history";
import { PendingReporter } from "../shell/pending-reporter";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { PANEL, PanelEmpty } from "./section-panel";
import { tradeCopy } from "../../lib/copy/trades";
import type { TradeListRow } from "../../lib/social/trade-reads";
import { useHydrated } from "../ui/hydrated-art";
import { TradeRows } from "./trade-rows";
import { useTradeSheet } from "./trade-sheet-host";

type Tab = "waiting" | "mine" | "trades";
const b = historyCopy.box;

/** The Trades tab's read: the first five rows, and the rest's count with how many of them wait on the reader. */
export type BoxTrades = { rows: TradeListRow[]; rest: number; restWaiting: number; now: Date };

export function RequestsBox({ waiting, mine, waitingCount, mineCount, unseenAnswer, history, trades }: {
  waiting: ReactNode;
  mine: ReactNode;
  waitingCount: number;
  mineCount: number;
  unseenAnswer: boolean;
  /** The reader has a request history to open. */
  history: boolean;
  trades: BoxTrades;
}) {
  const tradeCount = trades.rows.length + trades.rest;
  const tradeWaits = trades.rows.some((r) => r.row.waitsOnYou) || trades.restWaiting > 0;
  // Asks first, as shipped; with none waiting, a trade that waits on the reader opens its tab.
  const [tab, setTab] = useState<Tab>(waitingCount > 0 ? "waiting" : tradeWaits ? "trades" : "mine");
  const count = (n: number) => <span className="ml-[6px] font-mono text-[11px] text-[color:var(--fg-faint)]">{n}</span>;
  return (
    <section aria-label={b.label} data-testid="requests-box" className={PANEL}>
      <div className="flex bg-[color:var(--surface-rail)] p-[6px] [border-bottom:1px_solid_var(--border)]">
        <SegmentedSwitch
          kind="tabs"
          ariaLabel={b.label}
          size="compact"
          fill
          value={tab}
          onChange={setTab}
          segments={[
            { value: "waiting", label: <span className={waitingCount > 0 ? "text-[color:var(--accent-text)]" : undefined}>{b.waiting}</span>, count: count(waitingCount) },
            {
              value: "mine",
              label: (
                <span className="flex items-center gap-[6px]">
                  {unseenAnswer ? <span aria-hidden className="h-[6px] w-[6px] rotate-45 bg-[color:var(--accent)]" /> : null}
                  {b.mine}
                </span>
              ),
              count: count(mineCount),
            },
            {
              value: "trades",
              label: <span className={tradeWaits ? "text-[color:var(--accent-text)]" : undefined}>{tradeCopy.listTab}</span>,
              count: count(tradeCount),
              data: { "data-testid": "requests-tab-trades" },
            },
          ]}
        />
      </div>
      <div role="tabpanel" aria-label={b.waiting} hidden={tab !== "waiting"}>
        <div className="peer">{waiting}</div>
        {/* An answered last row stays as a receipt in the list (`WaitingOnYou` keeps it), so the empty state yields to it. */}
        {waitingCount === 0 ? <div className="peer-has-[[data-testid=waiting-on-you]]:hidden"><PanelEmpty title={b.waitingEmpty.title} body={b.waitingEmpty.body} /></div> : null}
      </div>
      <div role="tabpanel" aria-label={b.mine} hidden={tab !== "mine"}>
        <div className="peer">{mine}</div>
        {mineCount === 0 ? <div className="peer-has-[[data-testid=your-requests]]:hidden"><PanelEmpty title={b.mineEmpty.title} body={b.mineEmpty.body} /></div> : null}
      </div>
      <div role="tabpanel" aria-label={tradeCopy.listTab} hidden={tab !== "trades"} data-testid="requests-trades">
        {tradeCount === 0
          ? <PanelEmpty title={tradeCopy.empty.listTitle} body={tradeCopy.empty.listBody} />
          : <BoxTradeRows trades={trades} />}
      </div>
      {history || tradeCount > 0 ? (
        <div className="flex items-center justify-end gap-[12px] pl-[14px] pr-[6px] [border-top:1px_solid_var(--border)] md:pl-[16px]">
          {/* Board L1: past five rows, the foot names the rest, the ones waiting on the reader first. */}
          {tab === "trades" && trades.rest > 0 ? (
            <p data-testid="trades-more" className={`m-0 mr-auto flex min-w-0 items-center gap-[7px] font-sans text-[12.5px] ${trades.restWaiting > 0 ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-muted)]"}`}>
              {trades.restWaiting > 0 ? <span aria-hidden className="h-[6px] w-[6px] flex-none rotate-45 bg-[color:var(--accent)]" /> : null}
              {trades.restWaiting > 0 ? tradeCopy.row.moreWaiting(trades.restWaiting, trades.rest) : tradeCopy.row.more(trades.rest)}
            </p>
          ) : null}
          <Link href="/friends/requests" className="flex min-h-[44px] flex-none items-center px-[10px] font-sans text-[13px] font-medium text-[color:var(--fg)] no-underline md:min-h-[36px]">{b.history}<PendingReporter href="/friends/requests" /></Link>
        </div>
      ) : null}
    </section>
  );
}

/** The Trades tab's rows: a press opens the trade sheet over Friends, through the page's `TradeSheetHost`. */
function BoxTradeRows({ trades }: { trades: BoxTrades }) {
  const host = useTradeSheet();
  const hydrated = useHydrated();
  return (
    <TradeRows rows={trades.rows} now={trades.now} timeZone={hydrated ? undefined : "UTC"}
      onOpen={(id) => {
        const row = trades.rows.find((r) => r.id === id);
        if (row) host?.open(row.friend.publicId, { kind: "trade", id }, `trade:${id}`);
      }} />
  );
}
