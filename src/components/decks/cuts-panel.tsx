"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  cancelProposedCuts,
  cutProposed,
  keepProposedCut,
  readCutsPanel,
  restoreProposedCut,
  runProposedCuts,
  undoProposedCut,
} from "../../app/decks/cuts-actions";
import { cssUrl } from "../../lib/collection/browse";
import { creditsCopy } from "../../lib/copy/credits";
import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import { overCopy } from "../../lib/copy/decks-builder";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { isPriorResult, isPriorRun, okKeyOf, visitBaseline, type ToolBaseline } from "../../lib/decks/visit";
import { cutsAsk, MAX_CUTS_PER_RUN } from "../../lib/tuning/cuts-ask";
import { cutChips, type Chip, type CountRow } from "../../lib/tuning/cuts-count";
import type { CutItem, CutsPanel } from "../../lib/tuning/cuts-state";
import { useCardDetail, useCardIntent } from "../cards/card-detail-provider";
import { MutationError } from "./mutation-error";
import { usePreviewRow } from "./hover-preview";
import { useReviewRun } from "./review-run";

/**
 * Proposed cuts (Tuning hub R2, canvas C): the free pass COUNTS and names no card, and Look deeper
 * names the cuts. Mounted on the Analysis tab after Suggested changes, for a deck over 100. It needs
 * no reading: a reading is made of a whole deck and this tool is for one that is over, so the two
 * preconditions exclude each other. It reads its own state on mount and never spends a credit without a press.
 *
 * States, off `CutsPanel` and what the reader just pressed: the count (C1, C5 thin), running (C2),
 * six named (C3), part answered and short (C4), refused (C6, all locked C6c), failed (C7), back to
 * 99 (C8). A result is shown only while the deck still matches the fingerprint it was made
 * against; a cut pressed from it re-chains that fingerprint server-side, so cutting does not bring
 * the offer back and any other edit does (README open 9).
 *
 * The server actions are injectable, so every state is testable without a request.
 */
export type CutsDeps = {
  /** `runId`: a past run History reopened (re-review), read in place of the newest. */
  read: (deckId: string, runId?: string | null) => Promise<CutsPanel | null>;
  run: (deckId: string, opts?: { runId?: string }) => Promise<DeckMutationResult>;
  cancel: (deckId: string, runId: string) => Promise<DeckMutationResult>;
  /** `review`: pressed on a reopened past run, so the server re-checks the card, not the run. */
  cut: (itemId: string, review?: boolean) => Promise<DeckMutationResult>;
  undo: (itemId: string, review?: boolean) => Promise<DeckMutationResult>;
  keep: (itemId: string) => Promise<DeckMutationResult>;
  restore: (itemId: string) => Promise<DeckMutationResult>;
};

const SERVER: CutsDeps = {
  read: readCutsPanel, run: runProposedCuts, cancel: cancelProposedCuts,
  cut: cutProposed, undo: undoProposedCut, keep: keepProposedCut, restore: restoreProposedCut,
};

const copy = deckCutsCopy.panel;
const WATCH_MS = 3000;
const STOP_TRIES = 5;
const STOP_WAIT_MS = 300;
/** The counting frame appears only after this, so a fast read never flashes it. */
const COUNTING_DELAY_MS = 400;

const overWords = (n: number) => overCopy.trim.words[n] ?? String(n);
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function CutsPanelView({
  deckId,
  deps = SERVER,
  deeperLooks = false,
  onSettled,
  revision,
  freshEachVisit = false,
}: {
  deckId: string;
  deps?: CutsDeps;
  /** Hide a prior visit's result and open on the offer (`lib/decks/visit.ts`). Only where the
   *  prior is still reachable: inside the Tuning hub, beside History. Mounted on its own, the tool
   *  keeps showing its stored result, as it did before the hub. */
  freshEachVisit?: boolean;
  deeperLooks?: boolean;
  onSettled?: () => void;
  /** Changes whenever an input of the count changes elsewhere on the page (the list, the intent, the
   *  declared bracket), so the panel reads again rather than showing a result for a list that has gone. */
  revision?: string;
}) {
  const [panel, setPanel] = useState<CutsPanel | null>(null);
  // A past run History reopened here: its cuts are read in place of the newest run's.
  const review = useReviewRun("cuts");
  const reviewRunId = review?.runId ?? null;
  // Set by this panel's own Look deeper: from then on it reads its newest run, at once.
  const leftReview = useRef(false);
  // What was already stored when this visit to the deck began (`lib/decks/visit`, Hugh
  // 2026-10-11): a prior visit's cuts are not drawn and live only in History, and Look deeper
  // over them runs anew. Recorded by the first read that lands, in the same render as its panel,
  // so a prior result never paints once; a run finishing during the visit, or a remount within
  // it, still shows. The ref (the deck it was recorded for) keeps a later read from recording again.
  const [baseline, setBaseline] = useState<ToolBaseline | null>(null);
  const baselineDeck = useRef<string | null>(null);
  const [counting, setCounting] = useState(false);
  // The first read threw: the count failed, which is its own state and never a panel that vanishes
  // or a counting frame that never ends.
  const [loadFailed, setLoadFailed] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [refused, setRefused] = useState<string | null>(null);
  const [announced, setAnnounced] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const token = useRef(0);
  const ownRun = useRef<string | null>(null);
  // The run request this panel's own press made, and whether it has answered: Stop waits on it, because
  // the server reads the deck and builds the prompt BEFORE it inserts the pending row Stop cancels.
  // Stop is mid-flight: a second press must not enter it, and a new Look deeper waits for it.
  const [stopping, setStopping] = useState(false);
  const stopGuard = useRef(false);
  const inflight = useRef<{ promise: Promise<unknown>; done: boolean } | null>(null);
  const settledRef = useRef(onSettled);
  useEffect(() => { settledRef.current = onSettled; }, [onSettled]);

  // Reads can overlap (the mount's, a watch's, one after each verdict), and a slow one that was
  // ASKED first must not land over a newer answer: only the latest-asked read is drawn.
  const asked = useRef(0);
  // A read landing after the panel has gone (the reader left the deck mid-read) must not open a
  // visit for a deck the reader is no longer on.
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const reread = useCallback(async () => {
    const mine = ++asked.current;
    try {
      const next = await deps.read(deckId, leftReview.current ? null : reviewRunId);
      if (next && freshEachVisit && mounted.current && baselineDeck.current !== deckId) {
        baselineDeck.current = deckId;
        setBaseline(visitBaseline(deckId, "cuts", {
          okKey: okKeyOf(next.lastOkAt),
          // A pending run is drawn as running, and what it settles to happened during this visit.
          runId: next.run && next.run.status !== "pending" ? next.run.id : null,
        }));
      }
      if (mine === asked.current) {
        setPanel(next);
        setLoadFailed(false);
      }
      return next;
    } catch {
      // A failed read leaves nothing trustworthy to draw: the old count or offer may describe a deck
      // the server has since changed, or hide a run that did finish. Draw the count-failed state.
      if (mine === asked.current) { setLoadFailed(true); setPanel(null); }
      return null;
    }
  }, [deps, deckId, freshEachVisit, reviewRunId]);

  // The first read; `onSettled` tells the tab its opening may finish.
  useEffect(() => {
    const t = setTimeout(() => setCounting(true), COUNTING_DELAY_MS);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading external state on mount, as the other panels do
    void reread().finally(() => { clearTimeout(t); settledRef.current?.(); });
    return () => clearTimeout(t);
  }, [reread]);

  // The page's own edits (a sibling panel's apply, the bracket control, the description) change what
  // the count and a stored result are measured against; read again when the revision moves.
  const seenRevision = useRef(revision);
  useEffect(() => {
    if (seenRevision.current === revision) return;
    seenRevision.current = revision;
    void reread();
  }, [revision, reread]);

  // A run begun elsewhere (another tab, a reload mid-run) is re-read until it settles.
  const pendingId = panel?.run?.status === "pending" ? panel.run.id : null;
  useEffect(() => {
    if (pendingId === null) return;
    const id = setInterval(() => void reread(), WATCH_MS);
    return () => clearInterval(id);
  }, [pendingId, reread]);

  const running = pressing || pendingId !== null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (panel === null && loadFailed) {
    return (
      <section aria-labelledby="cuts-heading" className="mt-[18px] rounded-[11px] px-[14px] py-[16px] md:px-[20px] md:py-[18px]"
        style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
        <h2 id="cuts-heading" className="flex items-center gap-[9px] font-display text-[17px] font-semibold md:text-[19px]" style={{ color: "var(--fg)" }}>
          <FailMark label={copy.failed.tag} />{copy.failed.heading}
        </h2>
        <p className="mt-[6px] text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.failed.body}</p>
      </section>
    );
  }
  if (panel === null) {
    return counting ? (
      <section aria-label={copy.heading} aria-busy className="mt-[18px] rounded-[11px] px-[14px] py-[16px] md:px-[20px] md:py-[18px]"
        style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
        <h2 className="font-display text-[17px] font-semibold md:text-[19px]" style={{ color: "var(--fg)" }}>{copy.heading}</h2>
        <p className="mt-[8px] font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>{copy.counting}</p>
      </section>
    ) : null;
  }

  const { items, over, run } = panel;
  const answered = items.filter((i) => i.verdict !== "pending").length;
  const cutCount = items.filter((i) => i.verdict === "accepted").length;
  // A prior visit's result, and a prior visit's failed run, are hidden: the tool opens on its offer.
  const priorResult = isPriorResult(baseline, okKeyOf(panel.lastOkAt));
  const priorRun = isPriorRun(baseline, run?.id);
  // A reopened past run shows its cuts whatever the list has done since: each is re-checked.
  const reviewing = !!panel.review;
  const resultShown = reviewing ? items.length > 0 : panel.resultCurrent && items.length > 0 && !priorResult;
  // Back to 99: the cuts made from a result took the deck to the line, and it finishes in place.
  if (over === 0 && !(resultShown && (cutCount > 0 || reviewing))) return null;

  const failed = !running && !priorRun && run?.status === "failed";
  const refusedRun = failed && run.errorClass === "ungrounded";
  const left = Math.max(0, panel.allowance.limit - panel.allowance.used);
  const spent = panel.allowance.used >= panel.allowance.limit;
  const blocked = spent || !!panel.allowance.paused || panel.allowance.ownerShare === true || panel.allLocked;
  const standing = panel.allowance.paused
    ? creditsCopy.paused(panel.allowance.paused.until, deeperLooks)
    : panel.allowance.ownerShare
      ? creditsCopy.ownerShare(new Date())
      : spent
        ? creditsCopy.spent(panel.allowance.limit, panel.allowance.reopensAt ?? panel.allowance.nextAt, deeperLooks)
        : creditsCopy.standing(left, panel.allowance.limit, panel.allowance.nextAt);

  async function press() {
    if (running || blocked || stopGuard.current) return;
    const mine = ++token.current;
    if (review) { leftReview.current = true; review.leave?.(); }
    const runId = crypto.randomUUID();
    ownRun.current = runId;
    setPressing(true);
    setStartedAt(Date.now());
    setNow(Date.now());
    setRefused(null);
    setAnnounced(copy.announce.started);
    const request = deps.run(deckId, { runId }).catch(
      (): DeckMutationResult => ({ ok: false, message: deckCutsCopy.run.refused }),
    );
    const flight = { promise: request, done: false };
    inflight.current = flight;
    void request.then(() => { flight.done = true; });
    const result = await request;
    if (token.current !== mine) return;
    ownRun.current = null;
    const next = await reread();
    if (token.current !== mine) return;
    setPressing(false);
    if (!result.ok) {
      setRefused(result.message);
      setAnnounced(result.message);
      return;
    }
    const ran = next?.run;
    setAnnounced(
      ran?.status === "ok" ? copy.announce.ready(next?.items.length ?? 0)
        : ran?.status === "failed" && ran.errorClass === "ungrounded" ? copy.announce.refused
          : copy.announce.failed,
    );
    headingRef.current?.focus();
  }

  async function stop() {
    if (stopGuard.current) return;
    stopGuard.current = true;
    setStopping(true);
    try {
      await stopRun();
    } finally {
      stopGuard.current = false;
      setStopping(false);
    }
  }

  async function stopRun() {
    token.current += 1;
    const own = ownRun.current;
    ownRun.current = null;
    const flight = own !== null ? inflight.current : null;
    const target = own ?? pendingId;
    let cancelled = false;
    // A run this panel started may not have its pending row yet, so the cancel is retried until the
    // row exists and is cancelled, or the request itself has answered (the credit is then spent, and
    // the result is drawn). A run begun elsewhere is only looked for a few times.
    for (let attempt = 0; target !== null; attempt += 1) {
      await deps.cancel(deckId, target).catch(() => null);
      const after = await deps.read(deckId).catch(() => null);
      const seen = after?.run?.id === target ? after.run : null;
      cancelled = seen?.status === "cancelled";
      if (cancelled || (seen !== null && seen.status !== "pending") || (seen === null && own === null)) break;
      if (flight ? flight.done : attempt >= STOP_TRIES - 1) break;
      await new Promise((r) => setTimeout(r, STOP_WAIT_MS));
    }
    if (flight && !cancelled) await flight.promise;
    setPressing(false);
    const next = await reread();
    if (cancelled) {
      setAnnounced(copy.announce.stopped);
    } else if (own !== null && next?.run?.id === own && next.run.status !== "pending") {
      // Stop lost the race: the run had already settled, and its own press stood down when Stop
      // began. So say what `press` would have, and move focus to the heading.
      const ran = next.run;
      setAnnounced(
        ran.status === "ok" ? copy.announce.ready(next.items.length)
          : ran.status === "failed" && ran.errorClass === "ungrounded" ? copy.announce.refused
            : copy.announce.failed,
      );
      headingRef.current?.focus();
    }
  }

  async function verdictSettled(announce: string, refusal?: string) {
    setAnnounced(announce);
    // A refusal retires the result it was about, which unmounts the row that drew it: so the panel
    // keeps the reason itself, and the next press or answered verdict clears it.
    setRefused(refusal ?? null);
    await reread();
  }

  // The lead: the over figure in --fg (never --warning), then what the state says next.
  const lead = (() => {
    if (running) return copy.deeper.pendingLead(cutsAsk(over));
    if (resultShown && answered > 0) {
      return copy.leadPart(cutCount, items.filter((i) => i.verdict === "dismissed").length, items.length, items.length - answered);
    }
    if (resultShown) return copy.leadNamed(items.length);
    if (failed || refusedRun) return copy.leadBare;
    return copy.lead;
  })();
  const headline = over === 0 ? copy.done.head(panel.bodySize, cutCount) : copy.overLead(overWords(over), panel.bodySize);

  return (
    <section
      aria-labelledby="cuts-heading"
      aria-busy={running || undefined}
      className="mt-[18px] rounded-[11px] px-[14px] py-[16px] md:mt-6 md:rounded-[12px] md:px-[20px] md:py-[18px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
    >
      <div className="flex flex-col gap-[3px] md:flex-row md:items-baseline md:gap-[12px]">
        <h2 id="cuts-heading" ref={headingRef} tabIndex={-1} className="font-display text-[17px] font-semibold outline-none md:text-[19px]" style={{ color: "var(--fg)" }}>
          {copy.heading}
        </h2>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{copy.sub}</span>
      </div>
      <p className="mt-[8px] text-[13px] leading-[1.5]" style={{ color: "var(--fg-body)" }}>
        <b className="font-semibold" style={{ color: "var(--fg)" }}>{headline}</b>{" "}
        {over === 0 ? copy.done.body : lead}
      </p>

      {over === 0 ? null : (
        <>
          {running ? (
            <Band accent>
              <div className="flex flex-col gap-[10px] md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[13.5px] font-semibold" style={{ color: "var(--fg)" }}>{copy.deeper.pending}</p>
                  <p className="mt-[3px] font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
                    {`${copy.deeper.pendingRead} · ${clock(now - (startedAt ?? (run ? run.createdAt.getTime() : now)))} · ${copy.deeper.stopNote}`}
                  </p>
                </div>
                <button type="button" onClick={() => void stop()} disabled={stopping}
                  className="h-[44px] rounded-[8px] px-[14px] text-[13px] font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)] md:h-auto md:py-[10px]">
                  {copy.deeper.stop}
                </button>
              </div>
            </Band>
          ) : failed && !refusedRun ? (
            <Band>
              <h3 className="flex items-center gap-[9px] font-display text-[17px] font-semibold md:text-[19px]" style={{ color: "var(--fg)" }}>
                <FailMark label={copy.deeper.failedTag} />{copy.deeper.failedHeading}
              </h3>
              <p className="mt-[6px] text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.deeper.failedBody}</p>
              <Offer panel={panel} variant="retry" blocked={blocked} standing={`${standing} · ${copy.deeper.untouched}`} onPress={() => void press()} />
            </Band>
          ) : refusedRun ? (
            <Band>
              <p className="text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.deeper.refused}</p>
              <Offer panel={panel} variant="offer" blocked={blocked} standing={`${standing} · ${copy.deeper.refusedFoot}`} onPress={() => void press()} />
            </Band>
          ) : panel.allLocked ? (
            <Band><p className="text-[13px]" style={{ color: "var(--fg-body)" }}>{copy.allLocked(panel.commander)}</p></Band>
          ) : !resultShown ? (
            <Band>
              <Offer panel={panel} variant="offer" blocked={blocked} standing={standing} onPress={() => void press()} />
            </Band>
          ) : null}
          {refused ? <MutationError message={refused} /> : null}
        </>
      )}

      {resultShown && !running ? (
        <ResultBlock panel={panel} deps={deps} standing={standing} onSettled={verdictSettled} />
      ) : null}

      {over === 0 ? null : (
        <Count panel={panel} divider={resultShown && !running ? (answered > 0 ? copy.facts.dividerPart : copy.facts.dividerResult) : null} />
      )}
      <p role="status" className="sr-only">{announced}</p>
    </section>
  );
}

function Band({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <div className="mt-[14px] rounded-[10px] px-[14px] py-[14px] md:px-[16px]"
      style={{ background: "var(--surface)", border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}` }}>
      {children}
    </div>
  );
}

/** Look deeper: the hub's one filled button, with its credit as a segment inside it. */
function Offer({ panel, variant, blocked, standing, onPress }: {
  panel: CutsPanel; variant: "offer" | "retry"; blocked: boolean; standing: string; onPress: () => void;
}) {
  const spent = panel.allowance.used >= panel.allowance.limit;
  const d = copy.deeper;
  return (
    <div className={variant === "offer" ? "" : "mt-[12px]"}>
      {variant === "offer" ? (
        <div className="flex flex-col gap-[12px] md:flex-row md:items-start md:justify-between md:gap-[20px]">
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold" style={{ color: "var(--fg)" }}>{d.offerTitle(cutsAsk(panel.over))}</h3>
            <p className="mt-[5px] text-[12.5px] leading-[1.5]" style={{ color: "var(--fg-body)" }}>
              {panel.thin ? d.offerLeadThin : d.offerLead(cutsAsk(panel.over))}
            </p>
          </div>
          <CreditButton label={d.action} filled blocked={blocked} spent={spent} onPress={onPress} />
        </div>
      ) : (
        <CreditButton label={d.retry} filled={false} blocked={blocked} spent={spent} onPress={onPress} />
      )}
      <p className="mt-[10px] font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{standing}</p>
    </div>
  );
}

function CreditButton({ label, filled, blocked, spent, onPress }: {
  label: string; filled: boolean; blocked: boolean; spent: boolean; onPress: () => void;
}) {
  const d = copy.deeper;
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={blocked}
      aria-label={spent ? `${label}. No credits left.` : `${label}. Uses 1 credit.`}
      className={`flex h-[44px] w-full flex-none items-stretch overflow-hidden rounded-[8px] border border-[color:var(--accent)] text-[13px] font-semibold disabled:opacity-50 md:h-[38px] md:w-auto ${filled ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : "bg-transparent text-[color:var(--accent)]"}`}
    >
      <span className="flex flex-1 items-center justify-center px-[16px]">{label}</span>
      {spent ? null : (
        <span
          aria-hidden
          className={`flex items-center gap-[5px] border-l px-[11px] font-mono text-[11px] ${filled ? "[border-left-color:color-mix(in_srgb,var(--bg)_35%,transparent)]" : "border-[color:var(--accent)]"}`}
        >
          <span>{"◆"}</span>{d.credit}
        </span>
      )}
    </button>
  );
}

function FailMark({ label }: { label: string }) {
  return (
    <svg role="img" aria-label={label} width="18" height="18" viewBox="0 0 16 16" className="flex-none">
      {/* A filled disc with the `!` cut out (even-odd), so whatever is behind it shows through. */}
      <path fill="var(--danger)" fillRule="evenodd" clipRule="evenodd" d="M8 1.2 A6.8 6.8 0 1 0 8 14.8 A6.8 6.8 0 1 0 8 1.2 Z M7.05 4 H8.95 L8.6 9.3 H7.4 Z M8 10.5 A1.15 1.15 0 1 0 8 12.8 A1.15 1.15 0 1 0 8 10.5 Z" />
    </svg>
  );
}

/** "What we counted": the model's input, as it is. Nothing here names a card. */
function Count({ panel, divider }: { panel: CutsPanel; divider: string | null }) {
  const f = copy.facts;
  return (
    <div className="mt-[18px]">
      {divider ? (
        <div className="mb-[10px] flex items-center gap-[10px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>{divider}</span>
          <span aria-hidden className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>
      ) : null}
      <div className="flex flex-col gap-[3px] md:flex-row md:items-baseline md:gap-[10px]">
        <h3 className="text-[13.5px] font-semibold" style={{ color: "var(--fg)" }}>{f.head}</h3>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
          {f.read(panel.total, panel.commander, panel.edhrecDecks, panel.declaredBracket)}
        </span>
      </div>
      {panel.rows.length === 0 ? (
        <p className="mt-[8px] text-[12.5px]" style={{ color: "var(--fg-body)" }}>{f.none}</p>
      ) : (
        <ul className="mt-[8px]" style={{ borderTop: "1px solid var(--border)" }}>
          {panel.rows.map((r) => <CountLine key={r.key} row={r} />)}
        </ul>
      )}
      <p className="mt-[10px] font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
        {copy.neverCut(panel.commander, panel.lockedCount, panel.keyCount)}
      </p>
    </div>
  );
}

function CountLine({ row }: { row: CountRow }) {
  return (
    <li
      data-testid={`count-${row.key}`}
      className={`grid grid-cols-[64px_1fr_auto] items-baseline gap-x-[12px] py-[9px] md:grid-cols-[84px_1fr_auto_minmax(0,220px)] md:gap-x-[16px] ${row.thin ? "mt-[4px] rounded-[7px] px-[8px]" : ""}`}
      style={row.thin ? { border: "1px dashed var(--border-dashed)" } : { borderBottom: "1px solid var(--border)" }}
    >
      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>{copy.sources[row.source]}</span>
      <span className="min-w-0 text-[13px]" style={{ color: row.thin ? "var(--fg-muted)" : "var(--fg)" }}>
        {row.label}
        <span className="block font-mono text-[11px] md:hidden" style={{ color: "var(--fg-muted)" }}>{row.note}</span>
      </span>
      {row.figure === null ? <span /> : <span className="text-right font-mono text-[13px] font-semibold" style={{ color: "var(--fg)" }}>{row.figure}</span>}
      <span className="hidden font-mono text-[11px] md:inline" style={{ color: "var(--fg-muted)" }}>{row.note}</span>
    </li>
  );
}

function ResultBlock({ panel, deps, standing, onSettled }: {
  panel: CutsPanel; deps: CutsDeps; standing: string; onSettled: (announce: string, refusal?: string) => Promise<void>;
}) {
  const { items, asked } = panel;
  const d = copy.deeper;
  // A run that hit the per-run cap leaves the rest of the overage for the next one.
  const more = asked >= MAX_CUTS_PER_RUN ? Math.max(0, panel.over - items.filter((i) => i.verdict !== "accepted").length) : 0;
  const slots = Array.from({ length: Math.max(0, asked - items.length) }, (_, i) => items.length + i + 1);
  const hasRead = panel.itemsReport !== null;
  return (
    <div className="mt-[14px] rounded-[10px] px-[12px] py-[14px] md:px-[14px]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex flex-col gap-[3px] md:flex-row md:items-baseline md:gap-[10px]">
        <h3 className="text-[14px] font-semibold" style={{ color: "var(--fg)" }}>{d.resultHead(items.length)}</h3>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{d.resultRead}</span>
      </div>
      <ul className="mt-[10px] flex flex-col gap-[8px]">
        {items.map((item) => (
          <li key={item.id}><CutRow item={item} panel={panel} deps={deps} items={items} onSettled={onSettled} /></li>
        ))}
        {slots.map((n) => (
          <li key={`short-${n}`} data-testid="short-slot"
            className="flex flex-col gap-[3px] rounded-[9px] px-[12px] py-[10px] md:flex-row md:items-baseline md:justify-between"
            style={{ border: "1px dashed var(--border-dashed)" }}>
            <span className="text-[12.5px]" style={{ color: "var(--fg-muted)" }}>{`– ${d.shortRow(n)}`}</span>
            <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{d.shortWhy}</span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p data-testid="cuts-more" className="mt-[10px] text-[12.5px]" style={{ color: "var(--fg-muted)" }}>{d.resultMore(more)}</p>
      )}
      <p className="mt-[12px] font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
        {`${d.resultFoot(items.length, hasRead ? asked : items.length)} · ${standing}`}
      </p>
    </div>
  );
}

function CutRow({ item, panel, deps, items, onSettled }: {
  item: CutItem; panel: CutsPanel; deps: CutsDeps; items: CutItem[]; onSettled: (announce: string, refusal?: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const { open } = useCardDetail();
  const intent = useCardIntent(item.cutOracleId);
  // Hover and press on the same card, answered or not (Hugh, 2026-10-12): every row that names a card has both.
  const previewHandlers = usePreviewRow(item.cutImageUri);
  const openCard = (event: React.MouseEvent<HTMLElement>) =>
    open(item.cutOracleId, items.map((i) => ({ oracleId: i.cutOracleId, name: i.cutName, imageUri: i.cutImageUri })), undefined, { opener: event.currentTarget });

  async function answer(kind: "cut" | "undo" | "keep" | "restore") {
    setBusy(kind);
    const reviewing = !!panel.review;
    const result = await (kind === "cut" || kind === "undo" ? deps[kind](item.id, reviewing) : deps[kind](item.id)).catch((): DeckMutationResult => ({ ok: false, message: copy.refusals.generic }));
    // Busy until the follow-up read has replaced this row: a second press in that gap would repeat
    // the verdict and overwrite the answer with a refusal.
    if (!result.ok) {
      // A refusal means the list is not the one this row was named for: read again.
      await onSettled("", result.message);
      setBusy(null);
      return;
    }
    await onSettled(
      kind === "cut" ? copy.announce.cut(item.cutName)
        : kind === "undo" ? copy.announce.undone(item.cutName)
          : kind === "keep" ? copy.announce.kept : copy.announce.restored,
    );
    setBusy(null);
  }

  if (item.verdict !== "pending") {
    const done = item.verdict === "accepted";
    return (
      <div>
        <div
          data-testid={done ? "answered-cut" : "answered-kept"}
          {...previewHandlers}
          className="flex flex-wrap items-center gap-[9px] rounded-[9px] px-[12px] py-[9px]"
          style={{ background: done ? "var(--surface)" : "var(--surface-sunken)", border: `1px solid ${done ? "var(--success)" : "var(--border)"}` }}
        >
          {done ? (
            <span aria-hidden className="flex size-[15px] items-center justify-center rounded-[4px] text-[9px]" style={{ border: "1px solid var(--success)", color: "var(--success)" }}>{"✓"}</span>
          ) : null}
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: done ? "var(--success)" : "var(--fg-locked)" }}>
            {done ? copy.cutDone : copy.kept}
          </span>
          <button type="button" onClick={openCard} {...intent} aria-label={item.cutName}
            className={`min-w-0 text-left text-[13px] [border-bottom:1px_dotted_var(--border-strong)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid] ${done ? "line-through [text-decoration-color:var(--fg-locked)] text-[color:var(--fg-body)]" : "text-[color:var(--fg-faint)]"}`}>
            {item.cutName}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void answer(done ? "undo" : "restore")}
            className="ml-auto min-h-[32px] rounded-[7px] px-[11px] py-[6px] text-[12px] font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)]">
            {done ? copy.undo : copy.showAgain}
          </button>
        </div>
      </div>
    );
  }

  // A reopened past run's cut the deck has moved past: drawn, never offered (re-review).
  if (panel.review && (item.inDeck === false || item.locked === true)) {
    return (
      <div
        data-testid="answered-broken"
        className="flex flex-wrap items-center gap-[9px] rounded-[9px] px-[12px] py-[9px]"
        style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
      >
        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>
          {deckTuningCopy.lists.noLongerApplies}
        </span>
        <span className="min-w-0 text-[13px]" style={{ color: "var(--fg-faint)" }}>
          {item.inDeck === false ? deckTuningCopy.lists.cutGone(item.cutName) : lockedCardsCopy.tuning.cutLocked(item.cutName)}
        </span>
      </div>
    );
  }

  const chips: Chip[] = cutChips(item.evidence, item.reason, panel.chips);
  return (
    <article aria-label={item.cutName} {...previewHandlers} className="flex flex-col gap-[9px] rounded-[9px] px-[12px] py-[11px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
      <div className="flex flex-col gap-[9px] md:flex-row md:items-center md:justify-between md:gap-[12px]">
        <span className="flex min-w-0 items-center gap-[10px]">
          <span className="w-[86px] flex-none rounded-full px-[8px] py-[2px] text-center font-mono text-[9px] uppercase tracking-[0.1em]"
            style={{ color: "var(--accent)", border: "1px solid var(--accent-dim)" }}>{copy.suggestion}</span>
          <span aria-hidden className="h-[31px] w-[22px] flex-none rounded-[3px] bg-cover bg-center [border:1px_solid_var(--border-strong)]"
            style={item.cutImageUri ? { backgroundImage: cssUrl(item.cutImageUri) } : undefined} />
          <button type="button" onClick={openCard} {...intent} aria-label={item.cutName}
            className="min-w-0 text-left text-[13px] font-semibold text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)] hover:[border-bottom-style:solid] focus-visible:[border-bottom-style:solid]">
            {item.cutName}
          </button>
        </span>
        <span className="flex gap-[8px] md:flex-none md:gap-[7px]">
          <button type="button" disabled={busy !== null} onClick={() => void answer("cut")}
            className="h-[44px] flex-1 rounded-[8px] text-[13px] font-semibold text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] md:h-auto md:flex-none md:rounded-[7px] md:px-[13px] md:py-[6px] md:text-[12.5px]">
            {copy.cut}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void answer("keep")}
            className="h-[44px] flex-1 rounded-[8px] text-[13px] font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)] md:h-auto md:flex-none md:rounded-[7px] md:px-[12px] md:py-[6px] md:text-[12.5px]">
            {copy.keep}
          </button>
        </span>
      </div>
      <p className="text-[12.5px] leading-[1.5] md:pl-[96px]" style={{ color: "var(--fg-body)" }}>{item.reason}</p>
      <ul className="flex flex-wrap gap-[6px] md:pl-[96px] md:gap-[5px]">
        {chips.map((c) => (
          <li key={c.key} className="flex items-baseline gap-[5px] rounded-[5px] px-[7px] py-[3px] font-mono text-[9.5px]"
            style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
            <span className="uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>{c.kind}</span>
            <span style={{ color: "var(--fg-muted)" }}>{c.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
