"use client";
// PROPOSAL (request history R1d, Hugh 2026-11-17): Waiting on you and Your requests are one box with two tabs. The band
// holds the shipped SegmentedSwitch (compact, fills the band); the foot holds the way to Request history. The box opens
// on Waiting on you when anything waits, else on Your requests. An answer you haven't seen puts the diamond on Your
// requests' tab, so it is never hidden behind the other tab.
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { PANEL, PanelEmpty } from "./section-panel";

type Tab = "waiting" | "mine";
export const boxCopy = {
  label: "Requests",
  waiting: "Waiting on you",
  mine: "Your requests",
  history: "Request history ›",
  waitingEmpty: { title: "Nothing waiting on you", body: "Friend requests, and friends asking for your spares, land here." },
  mineEmpty: { title: "Nothing open right now", body: "Ask a friend for a spare from Shopping or their Spares tab." },
} as const;

export function RequestsBox({ waiting, mine, waitingCount, mineCount, unseenAnswer, tab: initial, history }: {
  waiting: ReactNode; mine: ReactNode; waitingCount: number; mineCount: number; unseenAnswer: boolean; tab?: Tab; history: boolean;
}) {
  const [tab, setTab] = useState<Tab>(initial ?? (waitingCount > 0 ? "waiting" : "mine"));
  const count = (n: number) => <span className="ml-[6px] font-mono text-[11px] text-[color:var(--fg-faint)]">{n}</span>;
  return (
    <section aria-label={boxCopy.label} data-testid="requests-box" className={PANEL}>
      <div className="flex bg-[color:var(--surface-rail)] p-[6px] [border-bottom:1px_solid_var(--border)]">
        <SegmentedSwitch kind="tabs" ariaLabel={boxCopy.label} size="compact" fill value={tab} onChange={setTab} segments={[
          { value: "waiting", label: <span className={waitingCount > 0 ? "text-[color:var(--accent-text)]" : undefined}>{boxCopy.waiting}</span>, count: count(waitingCount) },
          { value: "mine", label: <span className="flex items-center gap-[6px]">{unseenAnswer && <span aria-hidden className="h-[6px] w-[6px] rotate-45 bg-[color:var(--accent)]" />}{boxCopy.mine}</span>, count: count(mineCount) },
        ]} />
      </div>
      {tab === "waiting"
        ? (waitingCount > 0 ? waiting : <PanelEmpty title={boxCopy.waitingEmpty.title} body={boxCopy.waitingEmpty.body} />)
        : (mineCount > 0 ? mine : <PanelEmpty title={boxCopy.mineEmpty.title} body={boxCopy.mineEmpty.body} />)}
      {history && (
        <div className="flex justify-end pr-[6px] [border-top:1px_solid_var(--border)]">
          <Link href="/friends/requests" className="flex min-h-[44px] items-center px-[10px] font-sans text-[13px] font-medium text-[color:var(--fg)] no-underline md:min-h-[36px]">{boxCopy.history}</Link>
        </div>
      )}
    </section>
  );
}
