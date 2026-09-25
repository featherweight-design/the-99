"use client";
// The deeper look (HANDOFF §3, STATES 3a–3g): a panel in the results bar that spends one credit to
// read everything the player wrote, not just the names the free match found, and search again.
// Framed as more depth, never as a correction. Shown only when the submit had words.
//
// THE OUTCOME TRAVELS BY ADDRESS. A read that delivered, or found nothing to add, sends the player
// to the results with `r` naming it (`deeperTarget`); the page then checks the read is theirs and
// settled, and draws `done` or `nothing` from the server. So a reload, Back, or a shared link says
// what happened, and the bar's deeper marks are never the client's word alone.
//
// STOP IS A ROUTE HANDLER, NOT A SERVER ACTION. The client dispatches a page's Server Actions one at
// a time, so a Stop sent as one would wait behind the very press it means to stop. And it is
// believed only when it took: a Stop that arrives after the read delivered (and was charged) is
// answered `stopped: false`, and the panel then waits for that press and shows what it paid for.

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { lookDeeper } from "../../app/decks/new/choose/actions";
import { creditsCopy } from "../../lib/copy/credits";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import type { ChooseParams } from "../../lib/intake/params";
import { deeperTarget } from "../../lib/intake/submit";

/** The allowance as the page read it, serialized: dates as ISO strings. */
export type Standing = {
  used: number;
  limit: number;
  nextAt: string | null;
  reopensAt: string | null;
  /** The 1st of next month, while the app-wide spend cap refuses every call. */
  paused: string | null;
  ownerShare: boolean;
  now: string;
};

type Phase = "offer" | "looking" | "failed" | "done" | "nothing";
/** Why the press is closed, in the tuning panel's precedence: paused, the owner's share, spent. */
type Closed = "paused" | "ownerShare" | "spent" | null;

const Looking = createContext<{ looking: boolean; setLooking: (v: boolean) => void }>({ looking: false, setLooking: () => {} });

/** Holds the one fact the results need from the panel: whether a look is running. */
export function DeeperLookScope({ children }: { children: ReactNode }) {
  const [looking, setLooking] = useState(false);
  return <Looking.Provider value={{ looking, setLooking }}>{children}</Looking.Provider>;
}

/** Whether a deeper look is running: the results dim their rows (never their labels) while it is. */
export function useDeeperLooking(): boolean {
  return useContext(Looking).looking;
}

/** Marks the results while a look runs; what dims is the rows themselves (`useDeeperLooking`). */
export function DimWhileLooking({ children }: { children: ReactNode }) {
  const { looking } = useContext(Looking);
  return <div data-testid="results-dim" data-looking={looking || undefined}>{children}</div>;
}

export function closedBy(s: Standing): Closed {
  if (s.paused) return "paused";
  if (s.ownerShare) return "ownerShare";
  return s.used >= s.limit ? "spent" : null;
}

/** The line under the button, by allowance (STATES "Credit line, by allowance"). */
export function standingLine(s: Standing): string {
  const next = s.nextAt ? new Date(s.nextAt) : null;
  switch (closedBy(s)) {
    case "paused": return creditsCopy.paused(new Date(s.paused!));
    case "ownerShare": return creditsCopy.ownerShare(new Date(s.now));
    case "spent": return creditsCopy.spent(s.limit, s.reopensAt ? new Date(s.reopensAt) : next);
    default: return creditsCopy.first(s.limit - s.used, s.limit, next);
  }
}

const bare = (s: Standing) => creditsCopy.standing(s.limit - s.used, s.limit, s.nextAt ? new Date(s.nextAt) : null);

export function DeeperLook({
  params,
  standing,
  settled,
  deps = { look: lookDeeper, stop: postStop },
}: {
  params: ChooseParams;
  standing: Standing;
  /** What the page found at `r`: the read this panel's press already produced, if any. */
  settled: "read" | "nothing" | null;
  deps?: { look: typeof lookDeeper; stop: (readId: string) => Promise<boolean> };
}) {
  const router = useRouter();
  const { setLooking } = useContext(Looking);
  const [phase, setPhase] = useState<Phase>(settled === "read" ? "done" : settled === "nothing" ? "nothing" : "offer");
  const [stopping, setStopping] = useState(false);
  const [announced, setAnnounced] = useState("");
  const token = useRef(0);
  const own = useRef<string | null>(null);
  const closed = closedBy(standing);

  // The results dim while, and only while, this panel is looking; a panel that leaves (the page
  // moved to the read's own results) takes the dimming with it.
  useEffect(() => {
    setLooking(phase === "looking");
    return () => setLooking(false);
  }, [phase, setLooking]);

  function enter(next: Phase) {
    setPhase(next);
  }

  async function press() {
    const mine = ++token.current;
    const readId = crypto.randomUUID();
    own.current = readId;
    enter("looking");
    setAnnounced(copy.deeper.pendingTitle);
    const out = await deps
      .look({ readId, words: params.words, budgetDollars: params.budgetDollars, bracket: params.bracket })
      .catch(() => ({ kind: "failed" as const }));
    if (token.current !== mine) return;
    own.current = null;
    setStopping(false);
    switch (out.kind) {
      case "read":
        // Pushed, not replaced: Back returns to the first results, which are still true.
        router.push(deeperTarget(params, out, readId));
        return;
      case "nothing":
        router.push(deeperTarget(params, { chips: [], notUsed: out.notUsed, notUnderstood: out.notUnderstood }, readId));
        return;
      case "stopped":
        enter("offer");
        setAnnounced(copy.deeper.stopped);
        return;
      case "allowance":
      case "paused":
      case "ownerShare":
        // The standing moved under the panel: read it again, and the press closes on its own.
        enter("offer");
        router.refresh();
        return;
      default:
        enter("failed");
        setAnnounced(copy.deeper.failTag);
    }
  }

  async function stop() {
    const readId = own.current;
    if (!readId || stopping) return;
    setStopping(true);
    const took = await deps.stop(readId).catch(() => false);
    // Not taken: the read had already settled. Its press is about to answer, and owns the panel.
    if (!took) return;
    token.current += 1;
    own.current = null;
    setStopping(false);
    enter("offer");
    setAnnounced(copy.deeper.stopped);
  }

  const looking = phase === "looking";
  const title =
    looking ? copy.deeper.pendingTitle
    : phase === "done" || phase === "nothing" ? copy.deeper.doneTitle
    : copy.deeper.title;
  const lead =
    looking ? copy.deeper.pendingLead
    : phase === "done" ? copy.deeper.doneLead
    : phase === "nothing" ? copy.deeper.emptyLead
    : phase === "failed" ? copy.deeper.failedLead
    : copy.deeper.lead;
  const tag = phase === "done" ? copy.deeper.doneTag : phase === "failed" ? copy.deeper.failTag : null;
  const line =
    looking ? copy.deeper.pendingLine
    : phase === "done" ? copy.deeper.doneLine(bare(standing))
    // Nothing to add: no press follows, so the bare count, not "Uses a credit".
    : phase === "nothing" ? bare(standing)
    : standingLine(standing);
  // Offered once per set of words: after a look delivered or found nothing, there is no press.
  const offered = phase === "offer" || phase === "failed";
  const pill = closed === "spent" ? copy.deeper.costSpent : closed ? copy.deeper.costPaused : copy.deeper.cost;

  const label = phase === "failed" ? copy.deeper.retry : copy.deeper.action;
  const buttonBase =
    "inline-flex items-center justify-center md:justify-start gap-[9px] h-[44px] md:h-[38px] pl-[6px] pr-[14px] rounded-full text-[13.5px] font-semibold whitespace-nowrap";
  const pillBase = "inline-flex items-center h-[30px] md:h-[26px] px-[10px] rounded-full font-mono text-[10.5px]";

  return (
    <div
      data-testid="deeper-look"
      data-phase={phase}
      className="flex flex-col gap-[12px] md:flex-row md:items-center md:gap-[24px] p-[13px_14px] md:p-[14px_16px] rounded-[10px] border border-solid border-[color:color-mix(in_oklab,var(--accent)_28%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_6%,var(--surface-sunken))]"
    >
      <div className="flex flex-col gap-[4px] flex-1 min-w-0">
        <h3 className="m-0 flex flex-wrap items-center gap-[8px] font-display font-semibold text-[14.5px] md:text-[15.5px] text-[color:var(--fg)]">
          {title}
          {tag && (
            <span
              className={[
                "rounded-full px-[8px] py-[2px] font-mono text-[9.5px] font-normal tracking-[.12em] uppercase",
                phase === "failed"
                  ? "text-[color:var(--danger)] bg-[color:color-mix(in_oklab,var(--danger)_12%,transparent)]"
                  : "text-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_12%,transparent)]",
              ].join(" ")}
            >
              {tag}
            </span>
          )}
        </h3>
        <p className="m-0 max-w-[520px] text-[12.5px] md:text-[13px] leading-[1.55] [text-wrap:pretty] text-[color:var(--fg-body)]">{lead}</p>
      </div>
      <div className="flex flex-col gap-[6px] md:items-end shrink-0">
        {looking ? (
          <div className="flex items-center gap-[8px]">
            {/* The press, hairlined while it runs: the stub stays, first, as it was pressed. */}
            <button type="button" disabled className={`${buttonBase} bg-transparent border border-solid border-[color:var(--border-strong)] text-[color:var(--fg-muted)] font-normal cursor-default`}>
              <span className={`${pillBase} font-medium bg-[color:var(--surface)] text-[color:var(--fg-muted)]`}>{copy.deeper.cost}</span>
              {copy.deeper.actionPending}
            </button>
            <button
              type="button"
              onClick={stop}
              disabled={stopping}
              className="inline-flex items-center h-[44px] md:h-[36px] px-[12px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent text-[13px] text-[color:var(--fg-muted)] cursor-pointer disabled:cursor-default"
            >
              {copy.deeper.stop}
            </button>
          </div>
        ) : offered ? (
          <button
            type="button"
            onClick={press}
            disabled={closed !== null}
            aria-label={`${pill}. ${label}.`}
            className={
              closed === null
                ? `${buttonBase} border-0 bg-[color:var(--accent)] text-[color:var(--bg)] cursor-pointer`
                : `${buttonBase} border border-solid border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-disabled)] cursor-default`
            }
          >
            <span
              className={
                closed === null
                  ? `${pillBase} font-semibold bg-[color:color-mix(in_oklab,var(--bg)_22%,transparent)]`
                  : `${pillBase} font-medium bg-[color:var(--surface)] text-[color:var(--fg-disabled)]`
              }
            >
              {pill}
            </span>
            {label}
          </button>
        ) : null}
        <p data-testid="deeper-line" className="m-0 font-mono text-[10px] md:text-[10.5px] leading-[1.5] [text-wrap:pretty] text-center md:text-right text-[color:var(--fg-faint)] md:max-w-[360px]">
          {line}
        </p>
      </div>
      <p role="status" aria-live="polite" className="sr-only">{announced}</p>
    </div>
  );
}

async function postStop(readId: string): Promise<boolean> {
  const res = await fetch("/decks/new/choose/stop", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ readId }),
  });
  if (!res.ok) return false;
  const body = (await res.json().catch(() => null)) as { stopped?: unknown } | null;
  return body?.stopped === true;
}
