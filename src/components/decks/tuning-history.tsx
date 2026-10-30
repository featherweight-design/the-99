"use client";

// The Tuning hub's History (tuning hub handoff R2, canvas C H1 to H4b; design table `HistoryRow`,
// `PastRun`, `Failure mark`): every run of every tool on this deck, newest first, a chip per tool,
// and a row reopening that run (in its own tool, or read-only when it has nothing to load). Lives in the hub, which owns the open past run
// so its phone header can carry `‹ History` in the switch slot (H3b).

import { useCallback, useEffect, useRef, useState } from "react";

import { readTuningHistory, readTuningPastRun } from "../../app/decks/tuning-hub-actions";
import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import { formatCapCents } from "../../lib/decks/price";
import { tuningHubCopy } from "../../lib/copy/tuning-hub";
import { afterKey } from "../../lib/tuning/history";
import type { HistoryOutcome, HistoryRow, HistorySummary, HistoryTier, HistoryTool, PastRun } from "../../lib/tuning/history";
import { BALANCE_COLORS, type BalanceColor } from "../../lib/tuning/mana-balance";
import { colorWord } from "../../lib/tuning/mana-view";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { TuningToolMark } from "./tuning-tool-mark";

const copy = tuningHubCopy.history;
const v2Copy = suggestedChangesV2Copy.history;
const NAME: Record<HistoryTool, string> = {
  suggested: tuningHubCopy.tools.suggested.name,
  mana: tuningHubCopy.tools.mana.name,
  cuts: tuningHubCopy.tools.cuts.name,
};
const CHIP_ORDER: HistoryTool[] = ["suggested", "mana", "cuts"];

/** `Oct 27 · 21:40` (`Oct 27 · 09:15` in the morning): US short and month first, the time on a 24-hour clock as History.dc
 *  draws it (Suggested changes v2, History A), in the reader's own zone. */
export function historyDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${day} · ${time}`;
}

/** `Oct 26`: the day alone, as History B and C's head and lead draw a reopened run's date. */
export function historyDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** `October 2026`, the sticky month heading. */
export function historyMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** A row's summary line, from the facts the read shaped. */
/** While a listed run is in flight, the list re-reads at the tools' own cadence. */
const HISTORY_WATCH_MS = 3000;

export function summaryText(row: Pick<HistoryRow, "tool" | "tier" | "outcome" | "summary" | "ask">): string {
  const s = copy.summary;
  // A Suggested changes v2 run (History A): its count and the list it is on while it is made, then asked · found ·
  // applied once it has finished. Any other v2 outcome says what the shipped row says.
  if (row.ask && row.outcome === "running") return v2Copy.running(row.ask.count, v2RunningWords(row.ask.phase));
  if (row.ask && row.summary.kind === "suggestedV2") return v2Summary(row.ask.count, row.summary, row.outcome === "short" || row.tier === "refunded");
  if (row.outcome === "running") return s.running[row.tool];
  if (row.outcome === "failed") return s.failed;
  if (row.outcome === "refused") return s.refused;
  if (row.outcome === "stopped") return row.tool === "suggested" ? s.stopped.suggested : s.stopped.deeper;
  return summaryOf(row.summary);
}

/** The words a v2 run in flight says on its tile and its History row (Wait A: `choosing cuts · 0:41`). */
export function v2RunningWords(phase: "additions" | "cuts"): string {
  return phase === "cuts" ? v2Copy.choosingCuts : tuningHubCopy.runningWords.suggested;
}

/** `$2`, or `$2.50`: the cap as History A quotes it ("found under $2"). */
/** History A: an ok run leads `3 in, 3 out`; a short or refunded one says `N asked`, and names the cap only there, where it
 *  explains the count. */
function v2Summary(asked: number, s: Extract<HistorySummary, { kind: "suggestedV2" }>, short: boolean): string {
  const found = v2Copy.pair(s.found.add, s.found.cut);
  const applied = s.applied.add + s.applied.cut === 0 ? v2Copy.appliedNone : v2Copy.pair(s.applied.add, s.applied.cut);
  if (!short) return v2Copy.summaryOk(suggestedChangesV2Copy.run.askedCount(asked), found, applied);
  return s.capCents === null ? v2Copy.summary(asked, found, applied) : v2Copy.summaryCapped(asked, found, formatCapCents(s.capCents), applied);
}

function summaryOf(summary: HistorySummary): string {
  const s = copy.summary;
  switch (summary.kind) {
    case "suggestedOk": return s.suggestedOk(summary.in, summary.out, summary.added, summary.cut, summary.rejected);
    // Only a row with its ask carries this summary, and `summaryText` answers that row first.
    case "suggestedV2": return s.counted;
    case "cutsDeeperOk": return s.cutsDeeperOk(summary.named, summary.asked, summary.cut, summary.kept);
    case "cutsFree": return s.cutsFree(summary.over, summary.roles);
    case "manaFree": return s.manaFree(summary.pips, summary.sources);
    case "manaHelp": return s.manaHelp(BALANCE_COLORS.includes(summary.color as BalanceColor) ? colorWord(summary.color as BalanceColor) : summary.color, summary.trades);
    case "none": return s.counted;
  }
}

/** The failure mark (design table `Failure mark`): a disc with the exclamation cut out of it. */
export function FailureMark({ size, label }: { size: number; label?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className="block flex-none"
      fill="currentColor"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path
        fillRule="evenodd"
        d="M8 1.2 A6.8 6.8 0 1 0 8 14.8 A6.8 6.8 0 1 0 8 1.2 Z M7.05 4 H8.95 L8.6 9.3 H7.4 Z M8 10.5 A1.15 1.15 0 1 0 8 12.8 A1.15 1.15 0 1 0 8 10.5 Z"
      />
    </svg>
  );
}

type ListState =
  /** `chips`: a chip press is reloading, so the chip row stays up and the pressed chip keeps focus. */
  | { kind: "loading"; chips?: boolean }
  | { kind: "failed" }
  | { kind: "ok"; rows: HistoryRow[]; nextCursor: string | null; more: "idle" | "loading" | "failed" };

export function TuningHistory({
  deckId,
  tools,
  past,
  onOpenPast,
  focusRow = null,
}: {
  deckId: string;
  /** The tools this hub draws: a chip is offered only for a tool the reader can open. */
  tools: readonly HistoryTool[];
  /** The past run open, owned by the hub so its phone header can say `‹ History`. */
  past: HistoryRow | null;
  onOpenPast: (row: HistoryRow | null) => void;
  /** The row to focus once the list lands: the one whose run the reader just came back from. */
  focusRow?: string | null;
}) {
  const [filter, setFilter] = useState<HistoryTool | null>(null);
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const asked = useRef(0);

  // Sets state only when the read lands, so the mount effect below starts it without a render.
  const fetchPage = useCallback((tool: HistoryTool | null) => {
    const ticket = ++asked.current;
    readTuningHistory(deckId, tool, null)
      .then((page) => {
        if (ticket !== asked.current) return;
        setState(page ? { kind: "ok", rows: page.rows, nextCursor: page.nextCursor, more: "idle" } : { kind: "failed" });
      })
      .catch(() => { if (ticket === asked.current) setState({ kind: "failed" }); });
  }, [deckId]);

  // The first page, on mount. The filter starts at All, and a chip press reads its own page.
  const initial = useRef(true);
  useEffect(() => {
    if (!initial.current) return;
    initial.current = false;
    fetchPage(null);
  }, [fetchPage]);
  const load = (tool: HistoryTool | null, chips = false) => {
    setState({ kind: "loading", chips });
    fetchPage(tool);
  };

  // A row still running settles in place: while one is listed, the first page is read again at the
  // tools' own cadence and laid over the rows already drawn (pages loaded past it are kept).
  // One re-read at a time: a slow one is never overtaken by a later one, so an older snapshot
  // cannot land over a newer one and put a settled row back to running.
  const hasRunning = state.kind === "ok" && state.rows.some((r) => r.outcome === "running");
  const watching = useRef(false);
  useEffect(() => {
    if (!hasRunning) return;
    const watch = setInterval(() => {
      if (watching.current) return;
      watching.current = true;
      const ticket = asked.current;
      readTuningHistory(deckId, filter, null)
        .finally(() => { watching.current = false; })
        .then((page) => {
          if (!page || ticket !== asked.current) return;
          setState((s) => {
            if (s.kind !== "ok") return s;
            const fresh = new Set(page.rows.map((r) => r.id));
            const last = page.rows.at(-1) ?? null;
            // Keep only the older rows a later page brought in, below the fresh first page, in the
            // keyset's own order (a tie on the millisecond falls to the id).
            const tail = s.rows.filter((r) => !fresh.has(r.id) && last !== null && afterKey(r, last));
            return { ...s, rows: [...page.rows, ...tail], nextCursor: tail.length ? s.nextCursor : page.nextCursor };
          });
        })
        .catch(() => {});
    }, HISTORY_WATCH_MS);
    return () => clearInterval(watch);
  }, [hasRunning, deckId, filter]);
  const choose = (tool: HistoryTool | null) => {
    if (tool === filter) return;
    setFilter(tool);
    load(tool, true);
  };

  const showMore = () => {
    if (state.kind !== "ok" || !state.nextCursor || state.more === "loading") return;
    const ticket = asked.current;
    const cursor = state.nextCursor;
    setState({ ...state, more: "loading" });
    readTuningHistory(deckId, filter, cursor)
      .then((page) => {
        if (ticket !== asked.current) return;
        setState((s) => (s.kind !== "ok" ? s : page
          ? { kind: "ok", rows: [...s.rows, ...page.rows], nextCursor: page.nextCursor, more: "idle" }
          : { ...s, more: "failed" }));
      })
      .catch(() => { if (ticket === asked.current) setState((s) => (s.kind === "ok" ? { ...s, more: "failed" } : s)); });
  };

  // Back from a past run lands on the row that opened it.
  const lastOpened = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (past !== null || lastOpened.current === null) return;
    listRef.current?.querySelector<HTMLElement>(`[data-history-row="${CSS.escape(lastOpened.current)}"]`)?.focus();
  }, [past]);

  // Back from a run History reopened in its tool: that row, once the list has drawn it.
  const focused = useRef(false);
  useEffect(() => {
    // Settled either way: a list that failed to arrive has no row, and focus goes to the heading.
    if (focused.current || !focusRow || state.kind === "loading") return;
    focused.current = true;
    // The list comes back on All, first page: a row from a filter or a later page may not be in it,
    // and focus then lands on History's heading rather than nowhere.
    const target = listRef.current?.querySelector<HTMLElement>(`[data-history-row="${CSS.escape(focusRow)}"]`)
      ?? document.getElementById("history-heading");
    target?.focus();
  }, [focusRow, state.kind]);

  if (past) return <PastRunView deckId={deckId} row={past} onBack={() => onOpenPast(null)} />;

  const chips = CHIP_ORDER.filter((t) => tools.includes(t));
  const empty = state.kind === "ok" && state.rows.length === 0;
  // Unfiltered and empty: the deck has no runs, so the chips have nothing to choose between. Kept
  // up while a chip's page loads, All included, so the pressed chip keeps focus.
  const showChips = state.kind !== "failed" && (filter !== null || (state.kind === "loading" && state.chips === true) || (state.kind === "ok" && !empty));

  return (
    <div ref={listRef} data-history="" className="flex flex-col gap-[14px] rounded-[11px] px-[14px] py-[16px] md:rounded-[12px] md:px-[20px] md:py-[18px]" style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
      <div className="flex flex-wrap items-baseline gap-[10px]">
        <h3 id="history-heading" tabIndex={-1} className="font-display text-[17px] font-normal outline-none md:text-[19px]" style={{ color: "var(--fg)" }}>{tuningHubCopy.tools.history.name}</h3>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{empty && filter === null ? copy.subEmpty : copy.sub}</span>
      </div>
      {showChips ? <Chips tools={chips} value={filter} onChange={choose} /> : null}
      {state.kind === "loading" ? (
        // `data-hub-pending` while nothing has been read yet: the hub waits for it before scrolling, or the
        // page is too short to bring the hub's top up and the rows land below the fold.
        <div aria-busy="true" data-hub-pending={state.chips === true ? undefined : ""} className="min-h-[60px]" />
      ) : state.kind === "failed" ? (
        <LoadFailed onRetry={() => load(filter)} />
      ) : empty ? (
        <div data-history-empty="" className="flex flex-col gap-[6px] rounded-[10px] px-[16px] py-[18px]" style={{ border: "1px dashed var(--border-dashed)" }}>
          <span className="text-[13.5px] font-semibold" style={{ color: "var(--fg-body)" }}>{filter === null ? copy.empty.head : copy.emptyFiltered}</span>
          {filter === null ? (
            <span className="text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-faint)", textWrap: "pretty" }}>{copy.empty.body}</span>
          ) : null}
        </div>
      ) : (
        <>
          <div
            role="region"
            aria-label={copy.regionLabel}
            tabIndex={0}
            className="relative -mx-[4px] flex max-h-[460px] flex-col gap-[10px] overflow-y-auto overscroll-contain border-t border-b border-t-[color:var(--border)] border-b-[color:var(--border)] px-[4px] pb-[18px] md:max-h-[420px]"
            style={{
              maskImage: "linear-gradient(to bottom, #000 calc(100% - 28px), transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 28px), transparent)",
            }}
          >
            {byMonth(state.rows).map(([month, rows]) => (
              <div key={month} className="flex flex-col gap-[6px]">
                <div className="sticky top-0 z-[1] px-[2px] pt-[8px] pb-[6px] font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)", background: "var(--surface-sunken)" }}>
                  {month}
                </div>
                {rows.map((row) => (
                  <Row key={row.id} row={row} onOpen={() => { lastOpened.current = row.id; onOpenPast(row); }} />
                ))}
              </div>
            ))}
            {state.nextCursor ? (
              <button
                type="button"
                data-history-more=""
                aria-busy={state.more === "loading" || undefined}
                onClick={showMore}
                className="flex min-h-[44px] items-center justify-center text-[12.5px] font-medium text-[var(--accent-text)] md:min-h-[30px]"
              >
                {copy.more}
              </button>
            ) : null}
          </div>
          <p className="border-t border-t-[color:var(--border)] pt-[10px] font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{copy.foot}</p>
        </>
      )}
    </div>
  );
}

function byMonth(rows: HistoryRow[]): [string, HistoryRow[]][] {
  const out: [string, HistoryRow[]][] = [];
  for (const row of rows) {
    const month = historyMonth(row.at);
    const last = out[out.length - 1];
    if (last && last[0] === month) last[1].push(row);
    else out.push([month, [row]]);
  }
  return out;
}

/** All's value inside the switch, whose values are strings: the filter itself stays `null` for All. */
const ALL = "all";

function Chips({ tools, value, onChange }: { tools: HistoryTool[]; value: HistoryTool | null; onChange: (t: HistoryTool | null) => void }) {
  // A radiogroup (segmented switch 3b): the arrows move the choice and the focus together, and a press reads its
  // own page while the switch stays up, so the chosen segment keeps focus. Default size, for the 44px floor the old chips held; it
  // scrolls sideways when the row is narrower than its tools, at any width, rather than wrapping.
  return (
    <div>
      <SegmentedSwitch<HistoryTool | typeof ALL>
        kind="radio"
        scroll
        ariaLabel={copy.filterLabel}
        segments={[
          { value: ALL, label: copy.filterAll, data: { "data-history-chip": ALL } },
          ...tools.map((id) => ({
            value: id,
            // History.dc `.hchips`: the short tool word alone (`Suggested`, `Mana`, `Cuts`), no mark, so All and three tools
            // fit a 390 phone's row without scrolling.
            label: copy.tool[id],
            data: { "data-history-chip": id },
          })),
        ]}
        value={value ?? ALL}
        onChange={(v) => onChange(v === ALL ? null : v)}
      />
    </div>
  );
}

// History A's pills (History.dc `.oc`, `.tier`), for every row of every tool: a ring in the outcome's own ink.
// Whole class strings: Tailwind scans the source text, so an interpolated utility is never generated.
const OUTCOME_CLASS: Record<HistoryOutcome, string> = {
  ok: "text-[color:var(--success)] [border-color:color-mix(in_oklab,var(--success)_45%,transparent)]",
  short: "text-[color:var(--warning)] [border-color:color-mix(in_oklab,var(--warning)_45%,transparent)]",
  running: "text-[color:var(--accent-text)] border-[color:var(--accent-shadow)]",
  failed: "text-[color:var(--danger)] [border-color:color-mix(in_oklab,var(--danger)_45%,transparent)]",
  // Not drawn on History.dc: the quiet ring the board gives a refunded pill.
  refused: "text-[color:var(--fg-body)] border-[color:var(--border-strong)]",
  stopped: "text-[color:var(--fg-muted)] border-[color:var(--border-strong)]",
};
/** A short run that gave its credit back reads quiet, not as a warning (History A, `.oc.rf`). */
const OUTCOME_REFUNDED = "text-[color:var(--fg-muted)] border-[color:var(--border-strong)]";

export function outcomeClass(outcome: HistoryOutcome, tier: HistoryTier): string {
  // Only a finished run's pill goes quiet: a failed or stopped run that gave its credit back keeps its outcome's ink.
  return tier === "refunded" && (outcome === "ok" || outcome === "short") ? OUTCOME_REFUNDED : OUTCOME_CLASS[outcome];
}

const TIER_CLASS: Record<HistoryTier, string> = {
  free: "text-[color:var(--fg-faint)] border-[color:var(--border-strong)]",
  credit: "text-[color:var(--accent-text)] border-[color:var(--accent-shadow)]",
  // A v2 run of more than 10 changes: drawn as `credit`, only its words differ.
  credit2: "text-[color:var(--accent-text)] border-[color:var(--accent-shadow)]",
  // A refunded v2 run (History A): the tier struck, in faint ink, with no credit mark.
  refunded: "text-[color:var(--fg-faint)] border-[color:var(--border-strong)] line-through",
  // Not drawn on History.dc: the deeper look keeps its shipped fill.
  deeper: "text-[color:var(--accent-text)] border-[color:var(--accent-dim)] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)]",
};

export function TierPill({ tier }: { tier: HistoryTier }) {
  return (
    <span data-tier={tier} className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border px-[8px] py-[1px] font-mono text-[10px] ${TIER_CLASS[tier]}`}>
      {tier === "free" || tier === "refunded" ? null : <span aria-hidden="true" className="h-[6px] w-[6px] flex-none rotate-45" style={{ background: "currentColor" }} />}
      {copy.tier[tier]}
    </span>
  );
}

function Row({ row, onOpen }: { row: HistoryRow; onOpen: () => void }) {
  const running = row.outcome === "running";
  const summary = summaryText(row);
  const date = historyDate(row.at);
  const ask = row.ask ?? null;
  const request = ask ? (ask.request ? `“${ask.request}”` : v2Copy.noRequest) : null;
  return (
    <button
      type="button"
      data-history-row={row.id}
      data-outcome={row.outcome}
      onClick={onOpen}
      aria-label={`${NAME[row.tool]}, ${date}, ${copy.tier[row.tier]}, ${copy.outcome[row.outcome]}: ${request ? `${request}, ` : ""}${summary}`}
      // History.dc `.hrow`: 114 · 128 · rest · 92 · 76 on desktop; a run in flight on `.nw`'s raised fill and accent-shadow edge.
      className={`grid min-h-[60px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-[10px] gap-y-[6px] rounded-[9px] border px-[12px] py-[9px] text-left md:min-h-[44px] md:grid-cols-[114px_128px_minmax(0,1fr)_92px_76px] md:gap-[10px] ${
        running ? "border-[var(--accent-shadow)] bg-[var(--elevated-hover)]" : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <span className="col-start-2 row-start-1 whitespace-nowrap font-mono text-[11px] md:col-start-1" style={{ color: "var(--fg-faint)" }}>{date}</span>
      <span className="col-start-1 row-start-1 flex w-[110px] items-center gap-[7px] text-[12px] font-medium md:col-start-2 md:w-auto" style={{ color: "var(--fg-body)" }}>
        <span style={{ color: "var(--fg-body)" }}><TuningToolMark tool={row.tool} size={14} /></span>
        {copy.tool[row.tool]}
      </span>
      {ask ? (
        // A v2 run (History A): its request quoted and cut to one line, then asked · found · applied under it.
        <span data-history-ask="" className="col-span-full row-start-2 flex min-w-0 flex-col text-[12.5px] leading-[1.45] md:col-span-1 md:col-start-3 md:row-start-1" style={{ color: "var(--fg-body)" }}>
          {ask.request ? (
            <span data-history-request="" className="flex min-w-0" style={{ color: "var(--fg)" }}>
              <span aria-hidden="true">“</span>
              <span className="min-w-0 truncate">{ask.request}</span>
              <span aria-hidden="true">”</span>
            </span>
          ) : (
            <span data-history-request="" style={{ color: "var(--fg-muted)" }}>{v2Copy.noRequest}</span>
          )}
          <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{summary}</span>
        </span>
      ) : (
        <span className="col-span-full row-start-2 min-w-0 text-[12.5px] leading-[1.45] md:col-span-1 md:col-start-3 md:row-start-1" style={{ color: "var(--fg-body)" }}>{summary}</span>
      )}
      <span className="col-span-full row-start-3 justify-self-start md:col-span-1 md:col-start-4 md:row-start-1"><TierPill tier={row.tier} /></span>
      <span
        data-history-outcome={row.outcome}
        className={`col-start-3 row-start-1 flex items-center gap-[5px] justify-self-end rounded-full border px-[8px] py-[2px] font-mono text-[9.5px] uppercase tracking-[0.12em] md:col-start-5 ${outcomeClass(row.outcome, row.tier)}`}
      >
        {row.outcome === "failed" ? <FailureMark size={13} /> : null}
        {copy.outcome[row.outcome]}
      </span>
    </button>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div data-history-failed="" className="flex flex-col gap-[14px]">
      <div className="flex items-start gap-[10px]">
        <span className="mt-[2px] flex-none" style={{ color: "var(--danger)" }}><FailureMark size={18} label={copy.loadFailed.tag} /></span>
        <p className="min-w-0 flex-1 text-[13.5px] leading-[1.6]" style={{ color: "var(--fg-body)" }}>{copy.loadFailed.body}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex min-h-[44px] items-center self-start rounded-[8px] border border-[var(--accent)] bg-transparent px-[18px] text-[13.5px] font-semibold text-[var(--accent-text)] md:min-h-[40px]"
      >
        {copy.retry}
      </button>
    </div>
  );
}

// --- A past run with nothing to load, opened read-only (H3 / H3b) ----------------------------

/** An answered line's label, in the words its own tool uses for that verdict. */
function pastVerdictLabel(kind: "suggested" | "cutsDeeper", v: "applied" | "rejected"): string {
  if (kind === "cutsDeeper") return v === "applied" ? deckCutsCopy.panel.cutDone : deckCutsCopy.panel.kept;
  return v === "applied" ? deckTuningCopy.card.applied : deckTuningCopy.card.rejected;
}

export function PastRunView({ deckId, row, onBack }: { deckId: string; row: HistoryRow; onBack: () => void }) {
  const [run, setRun] = useState<PastRun | null | "loading" | "failed">("loading");
  // A run opened while still in flight is read again at the list's cadence until it settles, so
  // the view lands on its result rather than staying on `running`. One read at a time.
  const [reads, setReads] = useState(0);
  useEffect(() => {
    let live = true;
    let again: ReturnType<typeof setTimeout> | undefined;
    readTuningPastRun(deckId, row.id)
      .then((r) => {
        if (!live) return;
        setRun(r ?? "failed");
        if (r && "outcome" in r && r.outcome === "running") again = setTimeout(() => setReads((n) => n + 1), HISTORY_WATCH_MS);
      })
      .catch(() => { if (live) setRun("failed"); });
    return () => { live = false; clearTimeout(again); };
  }, [deckId, row.id, reads]);

  // Opening a run moves focus to its heading, as opening a tool does.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);

  const date = historyDate(row.at);
  const tier = copy.tier[row.tier];
  const loaded = run !== "loading" && run !== "failed" && run !== null ? run : null;
  const version = loaded?.readVersion ?? null;
  const meta = version === null ? copy.pastMetaNoVersion(date, tier) : copy.pastMeta(date, version, tier);
  const moved = loaded?.moved ?? null;

  return (
    <div data-past-run={row.id} className="flex flex-col gap-[14px] rounded-[11px] px-[14px] py-[16px] md:rounded-[12px] md:px-[20px] md:py-[18px]" style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
      {/* The phone's way back sits in the hub's switch slot (H3b); desktop draws it here. */}
      <button type="button" onClick={onBack} className="hidden self-start text-[12.5px] font-medium text-[var(--fg-muted)] md:block">
        {copy.back}
      </button>
      <div className="flex flex-wrap items-center gap-[10px]">
        <span style={{ color: "var(--fg-body)" }}><TuningToolMark tool={row.tool} size={20} /></span>
        <h3 ref={headingRef} tabIndex={-1} className="font-display text-[17px] font-normal outline-none md:text-[19px]" style={{ color: "var(--fg)" }}>{NAME[row.tool]}</h3>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{meta}</span>
      </div>
      <p data-past-note="" className="rounded-[9px] px-[12px] py-[9px] text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-faint)", border: "1px dashed var(--border-dashed)" }}>
        {moved ? copy.pastNote(moved) : copy.pastNoteUncounted}
      </p>
      {run === "loading" ? (
        <div aria-busy="true" className="min-h-[60px]" />
      ) : !loaded ? (
        <p className="text-[12.5px]" style={{ color: "var(--fg-body)" }}>{copy.pastFailed}</p>
      ) : loaded.kind === "count" ? (
        <p className="text-[12.5px] leading-[1.45]" style={{ color: "var(--fg-body)" }}>{summaryText({ tool: loaded.tool, tier: "free", outcome: "ok", summary: loaded.summary })}</p>
      ) : loaded.lines.length === 0 ? (
        <p className="text-[12.5px] leading-[1.45]" style={{ color: "var(--fg-body)" }}>
          {loaded.outcome === "ok" ? copy.pastNothing : summaryText({ ...row, outcome: loaded.outcome })}
        </p>
      ) : (
        // A run with lines reopens in its own tool (`historyPress`). It lands here only when that tool
        // has nothing to draw, so each line shows its reason open, with no write control.
        <ul className="flex flex-col gap-[6px]">
          {loaded.lines.map((l, i) => (
            <li key={i} data-past-line={l.verdict} className="flex flex-col gap-[4px] rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-[12px] py-[9px]">
              <span className="flex flex-wrap items-baseline gap-[9px] text-[12.5px]" style={{ color: "var(--fg-body)" }}>
                {l.verdict === "open" ? null : (
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-locked)" }}>{pastVerdictLabel(loaded.kind, l.verdict)}</span>
                )}
                {"add" in l ? (
                  <span>{[l.cut, l.add].filter(Boolean).join(" → ")}</span>
                ) : <b className="font-semibold" style={{ color: "var(--fg)" }}>{l.cut}</b>}
              </span>
              <p className="text-[12.5px] leading-[1.55]" style={{ color: "var(--fg-body)", textWrap: "pretty" }}>{l.reason}</p>
              {l.cites.length ? <p className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{l.cites.join(" · ")}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
