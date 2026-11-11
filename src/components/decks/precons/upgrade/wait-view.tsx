"use client";

// The wait and the failed run (handoff Wait.dc, W and F), inside the flow. The picks sit on one line above v2's clock, the leave line and three
// skeleton rows. A failure gives both credits back, keeps the picks and names nothing that failed inside.
import { useEffect, useState } from "react";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";

const copy = preconUpgradeCopy;

/** `0:04`: the seconds since the run started, as v2's wait draws them. */
export function clockOf(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The clock of a run that began at `startedAt`, ticking each second. */
export function useClock(startedAt: number): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return clockOf(now - startedAt);
}

export function PicksLine({ lead, bracket, strategy }: { lead: string; bracket: string; strategy: string }) {
  return (
    <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">
      {copy.wait.picksLed} <b className="font-semibold text-[color:var(--fg-body)]">{lead}</b> · {copy.wait.picksBracket} <b className="font-semibold text-[color:var(--fg-body)]">{bracket}</b> · <b className="font-semibold text-[color:var(--fg-body)]">{strategy}</b>
    </p>
  );
}

export function WaitView({ lead, bracket, strategy, startedAt }: { lead: string; bracket: string; strategy: string; startedAt: number }) {
  const clock = useClock(startedAt);
  return (
    <div className="flex flex-col gap-[12px]" aria-busy="true">
      <PicksLine lead={lead} bracket={bracket} strategy={strategy} />
      <div role="status" className="flex flex-col gap-[6px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[12px_14px]">
        <p className="m-0 flex flex-wrap items-baseline gap-x-[10px] text-[13px] text-[color:var(--fg-body)]">
          <span className="font-mono text-[13px] font-semibold text-[color:var(--fg)]">{clock}</span>
          <span>{copy.wait.finding(strategy)}</span>
          <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{copy.wait.usual}</span>
        </p>
        <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{copy.wait.leave}</p>
        <span aria-hidden className="mt-[4px] block h-[2px] w-[40%] rounded-full bg-[color:var(--accent)]" />
      </div>
      {[0, 1, 2].map((i) => <span key={i} aria-hidden className="block h-[36px] rounded-[8px] bg-[color:var(--surface-sunken)]" />)}
    </div>
  );
}

export function FailedView({ lead, bracket, strategy }: { lead: string; bracket: string; strategy: string }) {
  return (
    <div className="flex flex-col gap-[12px]">
      <PicksLine lead={lead} bracket={bracket} strategy={strategy} />
      <p role="alert" className="m-0 font-mono text-[11.5px] leading-[1.55]" style={{ color: "var(--danger)" }}>{copy.failed.line}</p>
    </div>
  );
}
