"use client";
// The Friends page's one Requests box (request history R1d, Hugh 2026-11-17): Waiting on you and Your requests are two tabs
// of one panel. The band holds the shipped SegmentedSwitch (compact, filling the band); the foot holds the way to Request
// history. The box opens on Waiting on you when anything waits, else on Your requests. An answer the reader has not seen
// puts the diamond on Your requests' tab, so it is never hidden behind the other tab. Both lists stay MOUNTED (the hidden
// one is `hidden`, not unmounted), so Waiting on you keeps its visit state and a withdrawn ask still reaches the trade frame.
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { historyCopy } from "../../lib/copy/request-history";
import { PendingReporter } from "../shell/pending-reporter";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { PANEL, PanelEmpty } from "./section-panel";

type Tab = "waiting" | "mine";
const b = historyCopy.box;

export function RequestsBox({ waiting, mine, waitingCount, mineCount, unseenAnswer, history }: {
  waiting: ReactNode;
  mine: ReactNode;
  waitingCount: number;
  mineCount: number;
  unseenAnswer: boolean;
  /** The reader has a request history to open. */
  history: boolean;
}) {
  const [tab, setTab] = useState<Tab>(waitingCount > 0 ? "waiting" : "mine");
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
      {history ? (
        <div className="flex justify-end pr-[6px] [border-top:1px_solid_var(--border)]">
          <Link href="/friends/requests" className="flex min-h-[44px] items-center px-[10px] font-sans text-[13px] font-medium text-[color:var(--fg)] no-underline md:min-h-[36px]">{b.history}<PendingReporter href="/friends/requests" /></Link>
        </div>
      ) : null}
    </section>
  );
}
