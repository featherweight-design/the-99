"use client";
// The read's panel on the results (the read addendum R1, STATES 7d to 7n). It replaces the retired
// Look deeper panel and NEVER OFFERS: the read starts at the form's submit (F8), and this reports on
// it. The one press it draws is *Try again*, after a read that was stopped or did not finish, which
// submits the same answers and words again (a new read, under a new id). F10: no *Read it* and no
// `0 left` pill anywhere on the results.
//
// The state comes from the server (`loadTheRead` for the read `r` names); while it is pending the
// panel asks `theReadState` every `INTAKE_POLL_MS`, moves its step from the shortlist to the
// judgement, and refreshes the page once the read settles, so the server draws the re-ordered
// results. No motion anywhere (STATES invariant).
//
// STOP IS A ROUTE HANDLER, NOT A SERVER ACTION: the client runs a page's Server Actions one at a
// time, so a Stop sent as one would wait behind the poll in flight. It is believed only when it
// took: a read that settled first is left to the next poll to report.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { submitChoose, theReadState } from "../../app/decks/new/choose/actions";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import { colorNames } from "../../lib/copy/color-labels";
import { INTAKE_POLL_MS } from "../../lib/intake/limits";
import { serializeChooseParams, type ChooseParams } from "../../lib/intake/params";
import { phaseOf, type ReadPhase } from "../../lib/intake/read-phase";
import type { TheReadState } from "../../lib/intake/run-store";
import { bareStanding, closedBy, standingLine, type Standing } from "../../lib/intake/standing";


type Scope = {
  /** `null` with no words: there is no read, and the results say nothing of one. */
  phase: ReadPhase | null;
  setPhase: (p: ReadPhase) => void;
  /** How many commanders the answers allow, once the results have arrived to say. */
  pool: number | null;
  setPool: (n: number) => void;
};

const ReadContext = createContext<Scope>({ phase: null, setPhase: () => {}, pool: null, setPool: () => {} });

/**
 * Holds what the panel and the results share: the read's phase (the server's, then the panel's as
 * it polls or stops) and the pool count the results report. The page keys it on the server's state,
 * so a refresh that finds the read settled starts both afresh.
 */
export function ReadScope({ initial, children }: { initial: ReadPhase | null; children: ReactNode }) {
  const [phase, setPhase] = useState<ReadPhase | null>(initial);
  const [pool, setPool] = useState<number | null>(null);
  return <ReadContext.Provider value={{ phase, setPhase, pool, setPool }}>{children}</ReadContext.Provider>;
}

/** The read's phase, or `null` with no words. */
export function useReadPhase(): ReadPhase | null {
  return useContext(ReadContext).phase;
}

/** The results report the pool here (the read's step 1 names it). */
export function useReportPool(): (n: number) => void {
  return useContext(ReadContext).setPool;
}

/** Marks the results while the read runs; what dims is the rows themselves (`useReadPhase`). */
export function DimWhileReading({ children }: { children: ReactNode }) {
  const reading = useReadPhase() === "reading";
  return <div data-testid="results-dim" data-reading={reading || undefined}>{children}</div>;
}

const fmt = (n: number) => n.toLocaleString("en-US");

type ReadPanelDeps = {
  state: (readId: string) => Promise<TheReadState>;
  stop: (readId: string) => Promise<boolean>;
  submit: (query: string) => Promise<unknown>;
};

/** One object for the life of the module, so the poll's effect is not restarted by every render. */
const DEPS: ReadPanelDeps = { state: (id) => theReadState(id), stop: (id) => postStop(id), submit: (q) => submitChoose(q) };

export function ReadPanel({
  readId,
  served,
  standing,
  params,
  changeHref,
  repeat = false,
  busy = false,
  hasDecks = null,
  deps = DEPS,
}: {
  /** The read `r` names; `null` when the submit started none. */
  readId: string | null;
  /** What the server found at `r`, or `null` with no `r`. */
  served: TheReadState | null;
  /** The credit standing, or `null` when its read failed: the panel then draws no count. */
  standing: Standing | null;
  params: ChooseParams;
  changeHref: string;
  /** The read was this ask's stored answer, charged nothing (7m). */
  repeat?: boolean;
  /** Unread because another of the player's reads was still running. */
  busy?: boolean;
  /** Whether the player has any deck (7k); `null` when that read failed, so nothing is claimed. */
  hasDecks?: boolean | null;
  deps?: ReadPanelDeps;
}) {
  const router = useRouter();
  const scope = useContext(ReadContext);
  const phase = scope.phase ?? phaseOf(served);
  const setPhase = scope.setPhase;
  const [step, setStep] = useState<"shortlist" | "judge">(served?.kind === "pending" && served.phase === "judge" ? "judge" : "shortlist");
  const [stopping, setStopping] = useState(false);
  const [announced, setAnnounced] = useState("");
  const [retrying, startRetry] = useTransition();
  const live = useRef(true);

  // While it reads, ask where it stands. A failed ask says nothing: ask again next time. A settled
  // read refreshes the page, whose server draws the results in the read's order.
  useEffect(() => {
    if (phase !== "reading" || !readId) return;
    live.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const ask = async () => {
      const s = await deps.state(readId).catch(() => null);
      if (!live.current) return;
      if (s === null || s.kind === "pending") {
        if (s?.phase === "judge") setStep("judge");
        timer = setTimeout(ask, INTAKE_POLL_MS);
        return;
      }
      const next = phaseOf(s);
      if (next === "failed") setAnnounced(copy.read.failed);
      if (next === "stopped") setAnnounced(copy.read.stopped);
      setPhase(next);
      router.refresh();
    };
    timer = setTimeout(ask, INTAKE_POLL_MS);
    return () => {
      live.current = false;
      clearTimeout(timer);
    };
  }, [phase, readId, deps, router, setPhase]);

  async function stop() {
    if (!readId || stopping) return;
    setStopping(true);
    const took = await deps.stop(readId).catch(() => false);
    setStopping(false);
    // Not taken: the read settled first, or the request failed. The poll reports the first; the
    // player can press Stop again for the second.
    if (!took) return;
    live.current = false;
    setPhase("stopped");
    setAnnounced(copy.read.stopped);
    router.refresh();
  }

  // The same answers and words, submitted again as the form would: a new read, under a new id.
  const retry = () =>
    startRetry(async () => {
      await deps.submit(serializeChooseParams({ ...params, readId: null, results: false }));
    });

  const result = served?.kind === "done" || served?.kind === "nothing" ? served.result : null;
  const closed = standing ? closedBy(standing) : null;

  const title =
    phase === "reading" ? copy.read.pendingTitle
    : phase === "nothing" ? copy.read.emptyTitle
    : phase === "unread" ? copy.read.unreadTitle
    : copy.read.title;
  const tag =
    phase === "done" ? { text: copy.read.doneTag, tone: "accent" as const }
    : phase === "failed" ? { text: copy.read.failTag, tone: "danger" as const }
    : phase === "stopped" ? { text: copy.read.stoppedTag, tone: "muted" as const }
    : null;
  const exactly = params.match === "exactly" && params.colors.length > 0;
  const lead =
    phase === "reading" ? copy.read.pendingLead
    : phase === "stopped" ? copy.read.stoppedLead
    : phase === "failed" ? copy.read.failedLead
    : phase === "unread" ? (busy ? copy.read.busyLead : copy.read.unreadLead)
    : phase === "done" && result ? [
      copy.read.doneLead(fmt(result.pool), result.weighed),
      // 7i: an exact identity held, so nothing outside it was read.
      ...(exactly ? [copy.read.heldColors(copy.intake.colorsJoin(colorNames(params.colors.map((c) => c.toUpperCase()))))] : []),
      // 7k: no deck to set the picks against.
      ...(hasDecks === false ? [copy.read.noDecks] : []),
    ].join(" ")
    : phase === "nothing" && result ? copy.read.emptyLead(fmt(result.pool))
    : null;
  const line =
    phase === "reading" ? copy.read.pendingLine
    : phase === "done" && repeat ? copy.read.repeatLine
    : !standing ? null
    : phase === "done" ? copy.read.doneLine(bareStanding(standing))
    : phase === "nothing" ? copy.read.emptyLine(bareStanding(standing))
    // Unread: the lead says why, so the bare count; paused or the owner's share say their own (7n).
    : phase === "unread" ? (closed === "paused" || closed === "ownerShare" ? standingLine(standing) : bareStanding(standing))
    // Stopped, failed: what *Try again* would do with a credit.
    : standingLine(standing);
  const retried = phase === "stopped" || phase === "failed";
  // The pill names what the press costs; with nothing left the press lands on the unread results.
  const pill = closed === null;

  const buttonBase =
    "inline-flex items-center justify-center md:justify-start gap-[9px] h-[44px] md:h-[38px] pl-[6px] pr-[14px] rounded-full text-[13.5px] font-semibold whitespace-nowrap";
  const pillBase = "inline-flex items-center h-[30px] md:h-[26px] px-[10px] rounded-full font-mono text-[10.5px]";
  const tagTone = {
    accent: "text-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_12%,transparent)]",
    danger: "text-[color:var(--danger)] bg-[color:color-mix(in_oklab,var(--danger)_12%,transparent)]",
    muted: "text-[color:var(--fg-muted)] bg-[color:color-mix(in_oklab,var(--fg-muted)_12%,transparent)]",
  };

  return (
    <div
      data-testid="read-panel"
      data-phase={phase}
      className="flex flex-col gap-[12px] md:flex-row md:items-center md:gap-[24px] p-[13px_14px] md:p-[14px_16px] rounded-[10px] border border-solid border-[color:color-mix(in_oklab,var(--accent)_28%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_6%,var(--surface-sunken))]"
    >
      <div className="flex flex-col gap-[6px] flex-1 min-w-0">
        <h3 className="m-0 flex flex-wrap items-center gap-[8px] font-display font-semibold text-[14.5px] md:text-[15.5px] text-[color:var(--fg)]">
          {title}
          {tag && (
            <span
              data-testid="read-tag"
              className={`rounded-full px-[8px] py-[2px] font-mono text-[9.5px] font-normal tracking-[.12em] uppercase ${tagTone[tag.tone]}`}
            >
              {tag.text}
            </span>
          )}
        </h3>
        {lead && (
          <p data-testid="read-lead" className="m-0 max-w-[520px] text-[12.5px] md:text-[13px] leading-[1.55] [text-wrap:pretty] text-[color:var(--fg-body)]">{lead}</p>
        )}
        {phase === "reading" && <Steps step={step} pool={scope.pool} />}
        {phase === "nothing" && (
          <p data-testid="read-widen" className="m-0 max-w-[520px] text-[12.5px] leading-[1.5] [text-wrap:pretty] text-[color:var(--fg-muted)]">
            <Link
              href={changeHref}
              className="text-[color:var(--accent)] no-underline border-0 border-b border-solid border-b-[color:color-mix(in_oklab,var(--accent)_50%,transparent)]"
            >
              {copy.readAs.change}
            </Link>{" "}
            {copy.read.emptyWiden}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-[6px] md:items-end shrink-0 md:max-w-[300px]">
        {phase === "reading" ? (
          <div className="flex w-full items-center gap-[8px] md:w-auto">
            {/* The submit's press, hairlined while the read it started runs. Named like the form's. */}
            <button
              type="button"
              disabled
              aria-label={`${copy.read.cost}. ${copy.read.actionPending}`}
              className={`${buttonBase} flex-auto md:flex-none bg-transparent border border-solid border-[color:var(--border-strong)] text-[color:var(--fg-muted)] cursor-default`}
            >
              <span className={`${pillBase} font-medium bg-[color:var(--surface)] text-[color:var(--fg-muted)]`}>{copy.read.cost}</span>
              {copy.read.actionPending}
            </button>
            {readId && (
              <button
                type="button"
                onClick={stop}
                disabled={stopping}
                className="inline-flex items-center h-[44px] md:h-[36px] px-[12px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent text-[13px] text-[color:var(--fg-muted)] cursor-pointer disabled:cursor-default"
              >
                {copy.read.stop}
              </button>
            )}
          </div>
        ) : retried ? (
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            aria-busy={retrying || undefined}
            aria-label={pill ? `${copy.read.cost}. ${copy.read.retry}.` : undefined}
            className={`${buttonBase} ${pill ? "" : "px-[14px]"} border-0 bg-[color:var(--accent)] text-[color:var(--bg)] cursor-pointer disabled:cursor-default`}
          >
            {pill && <span className={`${pillBase} font-semibold bg-[color:color-mix(in_oklab,var(--bg)_22%,transparent)]`}>{copy.read.cost}</span>}
            {copy.read.retry}
          </button>
        ) : null}
        {line && (
          <p data-testid="read-line" className="m-0 font-mono text-[10px] md:text-[10.5px] leading-[1.5] [text-wrap:pretty] text-center md:text-right text-[color:var(--fg-faint)]">
            {line}
          </p>
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">{announced}</p>
    </div>
  );
}

/** The read's two steps while it runs: the current one lit, the one after it ringed. */
function Steps({ step, pool }: { step: "shortlist" | "judge"; pool: number | null }) {
  const steps = [
    { key: "shortlist", text: pool === null ? copy.read.stepScanAll : copy.read.stepScan(fmt(pool)) },
    { key: "judge", text: copy.read.stepWeigh },
  ] as const;
  const at = step === "judge" ? 1 : 0;
  return (
    <ol data-testid="read-steps" className="m-0 mt-[4px] p-0 list-none flex flex-col gap-[5px]">
      {steps.map((s, i) => {
        const state = i === at ? "now" : i > at ? "next" : "done";
        return (
          <li key={s.key} data-step={state} className="flex items-center gap-[9px] text-[12.5px] leading-[1.45]">
            <span
              aria-hidden
              className={[
                "block shrink-0 w-[7px] h-[7px] rounded-full",
                state === "now" ? "bg-[color:var(--accent)]"
                : state === "next" ? "border border-solid border-[color:var(--border-dashed)]"
                : "bg-[color:var(--fg-faint)]",
              ].join(" ")}
            />
            <span className={state === "now" ? "text-[color:var(--fg)]" : state === "next" ? "text-[color:var(--fg-faint)]" : "text-[color:var(--fg-muted)]"}>
              {s.text}
            </span>
            {state !== "done" && (
              <span className="font-mono text-[9.5px] tracking-[.08em] text-[color:var(--fg-locked)]">{state === "now" ? copy.read.stepNow : copy.read.stepNext}</span>
            )}
          </li>
        );
      })}
    </ol>
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
