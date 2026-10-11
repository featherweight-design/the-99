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

import { lookDeeper, lookStatus, type LookDeeperResult } from "../../app/decks/new/choose/actions";
import { creditsCopy } from "../../lib/copy/credits";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import { INTAKE_POLL_MS, INTAKE_WAIT_MS } from "../../lib/intake/limits";
import type { ChooseParams } from "../../lib/intake/params";
import { deeperTarget } from "../../lib/intake/submit";
import { bareStanding, closedBy, standingLine, type Standing } from "../../lib/intake/standing";

export { closedBy, standingLine, type Standing };

type Phase = "offer" | "looking" | "failed" | "done" | "nothing";

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

const bare = bareStanding;

export function DeeperLook({
  params,
  standing,
  settled,
  deps = { look: lookDeeper, stop: postStop, status: lookStatus },
}: {
  params: ChooseParams;
  /**
   * The credit standing, or `null` when its read failed. A failed read closes the press and
   * nothing else: a look that already settled at `r` still draws, with no count under it.
   */
  standing: Standing | null;
  /** What the page found at `r`: the read this panel's press already produced, if any. */
  settled: "read" | "nothing" | null;
  deps?: { look: typeof lookDeeper; stop: (readId: string) => Promise<boolean>; status: typeof lookStatus };
}) {
  const router = useRouter();
  const { setLooking } = useContext(Looking);
  const [phase, setPhase] = useState<Phase>(settled === "read" ? "done" : settled === "nothing" ? "nothing" : "offer");
  const [stopping, setStopping] = useState(false);
  const [announced, setAnnounced] = useState("");
  const token = useRef(0);
  const own = useRef<string | null>(null);
  // Waiting on another look of the player's rather than running one of its own (`wait`).
  const waiting = useRef(false);
  const closed = standing ? closedBy(standing) : null;

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
      .look({
        readId, words: params.words, budgetDollars: params.budgetDollars, bracket: params.bracket,
        themes: params.themes, card: params.card,
      })
      .catch(() => ({ kind: "failed" as const }));
    if (token.current !== mine) return;
    own.current = null;
    setStopping(false);
    switch (out.kind) {
      case "read":
      case "nothing":
        deliver(out);
        return;
      case "reused":
        // This press's own id is already written: the press was sent twice, and its first send is
        // the read now running, holding its unit. It is still this press's, so Stop cancels it by
        // its id rather than only ending the wait.
        own.current = readId;
        await wait(mine);
        return;
      case "in_flight":
        // Another look of the player's is running (another tab). No state in the table says
        // otherwise, so the panel stays Looking and asks until that look settles. Nothing was
        // reserved for this press, so Stop only ends the wait.
        await wait(mine);
        return;
      case "refused":
        // The press's own input was out of shape: nothing was reserved, and Retry is a new press.
        enter("failed");
        setAnnounced(copy.deeper.failTag);
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

  /** A settled read, delivered by address. */
  function deliver(out: Extract<LookDeeperResult, { kind: "read" | "nothing" }>) {
    // Pushed, not replaced: Back returns to the first results, which are still true.
    // The read's own id: a repeated ask answers with the read already stored, under its id.
    //
    // `chips` carries through even when refunded (round 2, pre-open-review follow-up): a card
    // that only differs from one the player already has is still a real answer `deeperTarget`
    // displaces into "Still not used" — forcing an empty list here made it disappear instead.
    router.push(deeperTarget(params, { chips: out.chips, notUsed: out.notUsed, notUnderstood: out.notUnderstood }, out.readId));
  }

  /**
   * Waits on the look already running, asking every `INTAKE_POLL_MS`: its read of this ask is
   * delivered as this press's would be; a look that ended without answering it returns the offer,
   * since nothing was spent; and one still running at `INTAKE_WAIT_MS` reads as failed.
   */
  async function wait(mine: number) {
    waiting.current = true;
    const until = Date.now() + INTAKE_WAIT_MS;
    try {
      while (Date.now() < until) {
        await new Promise((r) => setTimeout(r, INTAKE_POLL_MS));
        if (token.current !== mine) return;
        // Each ask races what is left of the wait: one that hangs, or answers after it, reads as
        // the wait running out, so no read is delivered past the limit.
        const s = await Promise.race([
          deps
            .status({ words: params.words, budgetDollars: params.budgetDollars, bracket: params.bracket })
            // A failed ask says nothing about the other look: ask again next time.
            .catch(() => ({ kind: "running" as const })),
          new Promise<{ kind: "expired" }>((r) => setTimeout(() => r({ kind: "expired" }), Math.max(0, until - Date.now()))),
        ]);
        if (token.current !== mine) return;
        if (s.kind === "read" || s.kind === "nothing") return deliver(s);
        if (s.kind === "idle") {
          // The other look is over and may have spent a credit: read the standing again.
          enter("offer");
          router.refresh();
          return;
        }
        if (s.kind === "refused" || s.kind === "expired") break;
      }
      enter("failed");
      setAnnounced(copy.deeper.failTag);
    } finally {
      if (token.current === mine) {
        waiting.current = false;
        own.current = null;
      }
    }
  }

  async function stop() {
    // Waiting on another look, there is nothing of this press's to stop: Stop ends the wait.
    if (!own.current && waiting.current) {
      token.current += 1;
      waiting.current = false;
      enter("offer");
      setAnnounced(copy.deeper.stopped);
      return;
    }
    const readId = own.current;
    if (!readId || stopping) return;
    const mine = token.current;
    setStopping(true);
    const took = await deps.stop(readId).catch(() => false);
    // Not taken: the read had already settled, and its press is about to answer and owns the
    // panel; or the request itself failed, and the player can press Stop again. Either way the
    // Stop is live again: a refused one only asks once more and is refused once more.
    if (!took) {
      if (token.current === mine) setStopping(false);
      return;
    }
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
    : !standing ? null
    : phase === "done" ? copy.deeper.doneLine(bare(standing))
    // Nothing to add: no press follows, so the bare count, not "Uses a credit".
    : phase === "nothing" ? bare(standing)
    : standingLine(standing);
  // Offered once per set of words: after a look delivered or found nothing, there is no press.
  // With no standing there is no press either: what it would cost is unknown.
  const offered = standing !== null && (phase === "offer" || phase === "failed");
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
          <div className="flex w-full items-center gap-[8px] md:w-auto">
            {/* The press, hairlined while it runs: the stub stays, first, as it was pressed. On a
                phone it takes the rest of the row beside Stop. Named like every other state. */}
            <button
              type="button"
              disabled
              aria-label={`${copy.deeper.cost}. ${copy.deeper.actionPending}`}
              className={`${buttonBase} flex-auto md:flex-none bg-transparent border border-solid border-[color:var(--border-strong)] text-[color:var(--fg-muted)] cursor-default`}
            >
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
            // The cost first, in the name as on the pill; the live offer's name is the copy's own.
            aria-label={closed === null && phase === "offer" ? copy.deeper.aria : `${pill}. ${label}.`}
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
        {line && (
          <p data-testid="deeper-line" className="m-0 font-mono text-[10px] md:text-[10.5px] leading-[1.5] [text-wrap:pretty] text-center md:text-right text-[color:var(--fg-faint)] md:max-w-[360px]">
            {line}
          </p>
        )}
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
