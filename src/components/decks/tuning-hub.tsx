"use client";

// The Tuning hub (tuning hub handoff R1, canvas A; design table `TuningHub`, `ToolTile`, `Tool
// switch`). The last section of the Analysis tab: a tile per tool, in a fixed order, each saying
// what it does and what it costs, and a tool opening in place of the tiles with no route change.
// `openTool` lives HERE, so it resets whenever the Analysis tabpanel unmounts, which it does on
// every tab switch (`builder-shell.tsx`), on leaving the page and on a reload (A6). Runs are read
// from the ledger on mount, so a run still in flight reappears on its tile.

import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { readTuningHub } from "../../app/decks/tuning-hub-actions";
import { tuningHubCopy as copy } from "../../lib/copy/tuning-hub";
import { reveal } from "../../lib/ui/reveal";
import { visitBaseline } from "../../lib/decks/visit";
import type { HubTileRun, HubTiles } from "../../lib/tuning/hub-tiles";
import { historyPress, type HistoryRow, type HistoryTool } from "../../lib/tuning/history";
import { ReviewRunProvider, type ReviewRun } from "./review-run";
import { historyDate, summaryText, TuningHistory } from "./tuning-history";
import { TuningToolMark, type TuningTool } from "./tuning-tool-mark";

/** While a run is in flight the landing re-reads at the tools' own cadence. */
const WATCH_MS = 3000;
/** How long an opening waits for the hub to be shown and the tool's heading to draw before giving up. */
const SHOWN_WAIT_MS = 10_000;

export type HubToolSpec =
  | { tool: "suggested"; panel: ReactNode | null }
  /** Free and read on every open: no run in flight, never inert. */
  | { tool: "mana"; panel: ReactNode }
  | { tool: "cuts"; panel: ReactNode; over: number; total: number }
  /** History is part of the hub: drawn last whenever the hub draws, and its panel is the hub's own. */
  | { tool: "history" };

/** A shortcut's ask: open this tool. `nonce` makes a second press of the same shortcut count. */
export type HubRequest = { tool: TuningTool; nonce: number };

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Each tool's own, stable heading: the one focus moves to on opening. A tool draws a temporary
 *  heading while its first read is pending, which is replaced when it lands, so the first heading
 *  found is not the one to take. */
const HEADING_IDS: Partial<Record<TuningTool, string>> = {
  suggested: "tuning-heading", mana: "mana-heading", cuts: "cuts-heading", history: "history-heading",
};

const NAMES: Record<TuningTool, string> = {
  suggested: copy.tools.suggested.name,
  mana: copy.tools.mana.name,
  cuts: copy.tools.cuts.name,
  history: copy.tools.history.name,
};

type TileView = {
  tool: TuningTool;
  purpose: string;
  cost: string;
  /** Desktop status; the phone drops the outcome (canvas A1b). */
  status: string;
  statusPhone: string;
  running: boolean;
  /** The figure that explains an offer (`this deck is 6 over`), in muted ink, never `--warning`. */
  offer: boolean;
  inert: boolean;
};

function runStatus(run: HubTileRun | null, words: string, outcome: (run: Extract<HubTileRun, { kind: "ok" }>) => string, now: number) {
  if (!run) return { status: "", statusPhone: "", running: false };
  if (run.kind === "running") {
    const s = copy.running(words, clock(now - Date.parse(run.startedAt)));
    return { status: s, statusPhone: s, running: true };
  }
  const date = shortDate(run.at);
  const said = run.kind === "ok" ? outcome(run) : run.kind === "failed" ? copy.outcome.failed : copy.outcome.stopped;
  return { status: copy.lastRun(date, said), statusPhone: copy.lastRun(date), running: false };
}

function tileOf(spec: HubToolSpec, tiles: HubTiles | null, now: number): TileView {
  if (spec.tool === "history") {
    const h = tiles?.history;
    const status = h ? copy.tools.history.runs(h.runs, h.running) : "";
    return { tool: "history", purpose: copy.tools.history.purpose, cost: "", status, statusPhone: status, running: false, offer: false, inert: false };
  }
  if (spec.tool === "suggested") {
    const t = copy.tools.suggested;
    if (spec.panel === null) {
      return { tool: "suggested", purpose: t.needsReading, cost: "", status: "", statusPhone: "", running: false, offer: false, inert: true };
    }
    const run = runStatus(tiles?.suggested_changes ?? null, copy.runningWords.suggested,
      (r) => (r.total === 0 ? copy.outcome.nothing : copy.outcome.applied(r.accepted, r.total)), now);
    return { tool: "suggested", purpose: t.purpose, cost: t.cost, ...run, offer: false, inert: false };
  }
  if (spec.tool === "mana") {
    // Its last count's date and nothing more: a free count has no outcome to report (R3: no verdict).
    const status = tiles?.mana ? copy.lastRun(shortDate(tiles.mana)) : "";
    return { tool: "mana", purpose: copy.tools.mana.purpose, cost: copy.tools.mana.cost, status, statusPhone: status, running: false, offer: false, inert: false };
  }
  const t = copy.tools.cuts;
  const run = runStatus(tiles?.proposed_cuts ?? null, copy.runningWords.deeper,
    (r) => (r.total === 0 ? copy.outcome.nothing : copy.outcome.cut(r.accepted, r.total)), now);
  // At 100 or under the tile is inert whatever else is true (design table, ToolTile inert): a run
  // still in flight then (the list trimmed elsewhere mid-run) is shown by the panel if it is open,
  // never by making the tile pressable. Over 100, a run in flight is the deck's live fact, and
  // otherwise the figure that explains the offer wins over the last run (A1).
  if (spec.over <= 0) {
    return { tool: "cuts", purpose: t.notOffered(spec.total), cost: "", status: "", statusPhone: "", running: false, offer: false, inert: true };
  }
  if (run.running) return { tool: "cuts", purpose: t.purpose, cost: t.cost, ...run, offer: false, inert: false };
  const over = t.over(spec.over);
  return { tool: "cuts", purpose: t.purpose, cost: t.cost, status: over, statusPhone: over, running: false, offer: true, inert: false };
}

export function TuningHub({
  deckId,
  tools,
  drawn,
  request,
  onRequestAnswered,
  onSettled,
}: {
  deckId: string;
  tools: HubToolSpec[];
  /** Whether the section draws: over a reading, or for a deck over 100 that has none. Mounted
   *  either way, so its first read still settles the tab's opening loader. */
  drawn: boolean;
  request?: HubRequest | null;
  /** Told when a request has been answered, so its owner can drop it: the hub remounts on every
   *  visit to the tab, and a request still held then would reopen the tool over the landing. */
  onRequestAnswered?: (nonce: number) => void;
  /** Called once the landing's first read has landed or failed (the tab's opening loader). */
  onSettled?: () => void;
}) {
  // What is open, and how it was opened: a tile or a shortcut moves focus to the tool's heading,
  // a shortcut also brings the Tuning heading to the top, and a tab keeps focus on the tab row so
  // the arrow keys keep working. `seq` makes every opening its own event.
  const [opening, setOpening] = useState<{ tool: TuningTool; focus: boolean; scroll: boolean; seq: number } | null>(null);
  const openTool = opening?.tool ?? null;
  const [tiles, setTiles] = useState<HubTiles | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const sectionRef = useRef<HTMLElement>(null);
  const toolRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  // A tool opened before the hub's first read lands (a shortcut opens one in the first render, and
  // a tile can be pressed while the status lines load) waits for it: the read records the visit's
  // baseline, and a tool reading first would record its own, which can already hold a run that
  // settled since arrival and would then be hidden as a prior one. The tab's opening loader waits
  // on the same read, so nothing visible is held back.
  const [baselineRead, setBaselineRead] = useState(false);
  const settledRef = useRef(onSettled);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const toolsRef = useRef<TuningTool[]>([]);
  useEffect(() => { toolsRef.current = tools.map((t) => t.tool); });
  useEffect(() => { settledRef.current = onSettled; });
  // Reads overlap (the mount read, the watch and a return to the tiles), so only the newest one
  // asked for is applied: an older answer landing late would put a finished run back to running.
  const latest = useRef(0);
  const read = useCallback(() => {
    const ask = ++latest.current;
    readTuningHub(deckId)
      .then((t) => {
        // The visit's baseline, recorded here first (`visitBaseline` keeps the first it is given):
        // a run in flight now that settles before its tool is opened is then this visit's, not
        // a prior one. Not after the hub has gone: the reader may have left the deck.
        if (t?.seen && mountedRef.current) {
          for (const tool of ["suggested", "cuts"] as const) {
            if (toolsRef.current.includes(tool)) visitBaseline(deckId, tool, t.seen[tool]);
          }
        }
        if (ask === latest.current) setTiles(t);
      })
      // A failed read leaves the tiles without a status line; every tool still opens.
      .catch(() => {})
      .finally(() => { setBaselineRead(true); settledRef.current?.(); });
  }, [deckId]);

  // On mount, whether or not a shortcut opened a tool in the first render (the tab's opening
  // loader waits on this read). And on leaving a tool, for the tiles or for another tool: at once,
  // and once more a moment later, because a run or an Apply pressed in the tool just left can still
  // be in its preflight, so the first read may not see its pending row yet; the second does, and a
  // run it finds starts the watch below. Opening a tool from the tiles reads nothing.
  const readOnce = useRef(false);
  const lastTool = useRef<TuningTool | null>(null);
  useEffect(() => {
    const left = lastTool.current;
    lastTool.current = openTool;
    const first = !readOnce.current;
    readOnce.current = true;
    if (!first && left === null) return;
    read();
    if (first) return;
    const again = setTimeout(read, WATCH_MS);
    return () => clearTimeout(again);
  }, [openTool, read]);

  const running = !!tiles && [tiles.suggested_changes, tiles.proposed_cuts].some((t) => t?.kind === "running");
  useEffect(() => {
    if (!running) return;
    const watch = setInterval(read, WATCH_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(watch); clearInterval(tick); };
  }, [running, read]);

  // Back on the landing, focus returns to the tile of the tool just left: the control that took
  // the reader there (All tools, or the phone's back) is gone with the tool.
  const [leftTool, setLeftTool] = useState<TuningTool | null>(null);
  // The past run History has open: the hub's, so the phone's switch slot can say `‹ History`.
  const [past, setPast] = useState<HistoryRow | null>(null);
  // A run History reopened in its own tool (re-review, Hugh 2026-10-12): the tool reads it through
  // `ReviewRunProvider`, and the hub draws the note above it. Any other opening drops it.
  // `left`: the reader ran the tool again from the reopened run, so it reads as ordinary now.
  const [review, setReview] = useState<{ run: ReviewRun; row: HistoryRow; left: boolean } | null>(null);
  const leaveReview = useCallback(() => setReview((r) => (r ? { ...r, left: true } : r)), []);
  // The History row to focus on the way back from a reviewed run.
  const [returnRow, setReturnRow] = useState<string | null>(null);
  const open = useCallback((tool: TuningTool | null, how: { focus: boolean; scroll?: boolean } = { focus: true }) => {
    setPast(null);
    setReview(null);
    setReturnRow(null);
    if (tool === null) setLeftTool(openTool);
    setOpening((prev) => (tool === null ? null : { tool, focus: how.focus, scroll: how.scroll ?? false, seq: (prev?.seq ?? 0) + 1 }));
  }, [openTool]);
  useEffect(() => {
    if (openTool !== null || leftTool === null) return;
    // The tile the reader left, or, when that tool went inert while it was open (the last cut
    // brought the deck to 100), the Tuning heading: focus never falls to the document.
    const tile = sectionRef.current?.querySelector<HTMLElement>(`button[data-tool-tile="${leftTool}"]`);
    const heading = sectionRef.current?.querySelector<HTMLElement>("#tuning-hub-heading");
    if (tile) tile.focus();
    else heading?.focus();
  }, [openTool, leftTool]);

  // A shortcut on Your deck, answered once per nonce and during render rather than in an effect,
  // so the tool is open in the same paint the tab arrives with.
  const [drawnThisVisit, setDrawnThisVisit] = useState(drawn);
  if (drawn && !drawnThisVisit) setDrawnThisVisit(true);

  const [answered, setAnswered] = useState<number | null>(null);
  if (request && request.nonce !== answered) {
    setAnswered(request.nonce);
    if (tools.some((t) => t.tool === request.tool)) {
      setReview(null);
      setOpening((prev) => ({ tool: request.tool, focus: true, scroll: true, seq: (prev?.seq ?? 0) + 1 }));
    }
  }

  const answeredRef = useRef(onRequestAnswered);
  useEffect(() => { answeredRef.current = onRequestAnswered; });
  useEffect(() => {
    if (answered !== null) answeredRef.current?.(answered);
  }, [answered]);

  useEffect(() => {
    if (!opening) return;
    // A shortcut lands on the tab while its opening loader still hides the body under a `hidden`
    // ancestor (`analysis-panel`), and a hidden box can be neither scrolled to nor focused; and both
    // tools draw nothing until their own first read lands, so their heading arrives later still.
    // So wait for the section to be shown AND the tool's heading to exist, then scroll and focus:
    // scrolled any sooner, the page is not yet tall enough to bring the hub to the top, and the
    // tool then grows below the fold (measured: the hub stopped 508px down at 1300). A tool whose
    // heading draws before its first rows (History) marks that wait `data-hub-pending`, and the scroll
    // waits for it too; past the wait the scroll and focus happen anyway rather than never.
    const shown = () => !!sectionRef.current && !sectionRef.current.closest("[hidden]");
    const step = (late = false) => {
      if (!shown()) return false;
      // The tool's own heading keeps its landmark (README, other decisions 2); focus moves to it.
      const id = HEADING_IDS[opening.tool];
      const heading = id ? toolRef.current?.querySelector<HTMLElement>(`#${id}`) : null;
      if (opening.focus && !heading) return false;
      if (!late && opening.scroll && toolRef.current?.querySelector("[data-hub-pending]")) return false;
      if (opening.scroll) reveal(sectionRef.current);
      if (!opening.focus || !heading) return true;
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
      return true;
    };
    if (step()) return;
    const giveUp = Date.now() + SHOWN_WAIT_MS;
    let frame = requestAnimationFrame(function wait() {
      if (step()) return;
      if (Date.now() < giveUp) frame = requestAnimationFrame(wait);
      else step(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [opening]);

  // A History row's press: its tool with that run loaded, its tool on the deck as it is now (a free
  // count, a run in flight), or the read-only past view for a run with nothing to load.
  const openFromHistory = (row: HistoryRow | null) => {
    if (row === null) { setPast(null); return; }
    const press = historyPress(row);
    // A tool with no panel to draw (Suggested changes before a reading) cannot take the run: History's
    // read-only view shows its lines instead.
    const spec = tools.find((t) => t.tool === row.tool);
    if (press.kind === "past" || !spec || ("panel" in spec && spec.panel === null)) { setPast(row); return; }
    // A run still in flight is the tool's own newest run: the tool as any opening shows it, no note.
    // A tool that is inert now (Proposed cuts on a deck back at 100) draws nothing for a run in flight
    // or a count: History's own view shows it instead, as it does a run with nothing to load.
    if (press.kind === "live" && views.find((v) => v.tool === row.tool)?.inert) { setPast(row); return; }
    if (press.kind === "live" && !press.counted) { open(row.tool, { focus: true }); return; }
    setPast(null);
    setReturnRow(null);
    setReview({ run: { tool: row.tool, runId: press.kind === "review" ? press.runId : null }, row, left: false });
    setOpening((prev) => ({ tool: row.tool, focus: true, scroll: false, seq: (prev?.seq ?? 0) + 1 }));
  };
  const backToHistory = () => {
    const from = review?.row.id ?? null;
    setReview(null);
    setPast(null);
    setReturnRow(from);
    setOpening((prev) => ({ tool: "history", focus: false, scroll: false, seq: (prev?.seq ?? 0) + 1 }));
  };
  const views = tools.map((spec) => tileOf(spec, tiles, now));
  // History's chips: the run-making tools this hub draws.
  const historyTools = tools.flatMap((t): HistoryTool[] => (t.tool === "history" ? [] : [t.tool]));
  // A tool that stopped being offered while it was open finishes in place (C8); one that is not
  // drawn at all (its switch is off) never opens.
  const opened = openTool ? tools.find((t) => t.tool === openTool) ?? null : null;
  const openedView = opened ? views.find((v) => v.tool === opened.tool)! : null;
  const reviewed = review && opened?.tool === review.run.tool ? review : null;
  const reviewing = reviewed && !reviewed.left ? reviewed : null;

  // The keys step over an inert tool's tab, as a press cannot open it either (it is disabled), so
  // focus never lands on a control that cannot take it.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const ids: (TuningTool | null)[] = [null, ...tools.map((t) => t.tool)];
    const live = (i: number) => ids[i] === null || ids[i] === openTool || !views.find((v) => v.tool === ids[i])?.inert;
    const step = e.key === "ArrowRight" || e.key === "Home" ? 1 : e.key === "ArrowLeft" || e.key === "End" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    let next = e.key === "Home" ? 0 : e.key === "End" ? ids.length - 1 : (index + step + ids.length) % ids.length;
    while (!live(next)) next = (next + step + ids.length) % ids.length;
    const id = ids[next];
    tabRefs.current.get(id ?? "all")?.focus();
    open(id, { focus: false });
  };

  // Once drawn, the hub stays for the rest of this visit to the tab: the last cut on a deck that
  // was never read brings it to 100 with no reading, and the tool must still finish in place (C8)
  // rather than vanish with focus inside it. The tabpanel's unmount resets this on the next visit.
  if (!drawn && !drawnThisVisit) return null;
  if (tools.length === 0) return null;
  return (
    <section
      ref={sectionRef}
      aria-labelledby="tuning-hub-heading"
      data-tuning-hub=""
      className={`flex flex-col gap-[12px] pt-[16px] ${opened ? "md:gap-[14px]" : ""}`}
      style={{ borderTop: "1px solid var(--border)", scrollMarginTop: 16 }}
    >
      <h2 id="tuning-hub-heading" tabIndex={-1} className="outline-none font-display text-[17px] font-normal md:text-[19px]" style={{ color: "var(--fg)" }}>
        {copy.title}
      </h2>
      {opened && openedView ? (
        <>
          {/* DESKTOP: an underline tab row, deliberately unlike the deck tabs' filled pills. */}
          <div role="tablist" aria-label={copy.title} className="anim-gentle-in hidden gap-[22px] md:flex" style={{ borderBottom: "1px solid var(--border)" }}>
            {[null, ...tools.map((t) => t.tool)].map((id, i) => {
              const active = id === opened.tool;
              const view = id ? views.find((v) => v.tool === id) : null;
              return (
                <button
                  key={id ?? "all"}
                  ref={(el) => { if (el) tabRefs.current.set(id ?? "all", el); else tabRefs.current.delete(id ?? "all"); }}
                  type="button"
                  role="tab"
                  id={`tuning-tab-${id ?? "all"}`}
                  aria-controls={active ? "tuning-tool-panel" : undefined}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  disabled={!!view?.inert && !active}
                  onClick={() => open(id, { focus: false })}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`-mb-px flex items-center gap-[7px] border-b-2 px-0 pt-[4px] pb-[10px] text-[13px] disabled:cursor-default ${
                    active
                      ? "border-[var(--accent)] font-semibold text-[var(--fg)]"
                      : `border-transparent font-medium ${view?.inert ? "text-[var(--fg-locked)]" : "text-[var(--fg-muted)]"}`
                  }`}
                >
                  {id ? (
                    // The mark's own ink by state (design table `TuningToolMark`), apart from its label's.
                    <span style={{ color: active ? "var(--accent)" : view?.inert ? "var(--fg-locked)" : "var(--fg-body)" }}>
                      <TuningToolMark tool={id} size={14} />
                    </span>
                  ) : null}
                  {id ? NAMES[id] : copy.allTools}
                  {view?.running ? <span aria-hidden="true" className="anim-dots h-[6px] w-[6px] rounded-full" style={{ background: "var(--accent)" }} /> : null}
                </button>
              );
            })}
          </div>
          {/* PHONE: the tool alone, with a 44px way back; the landing is the switcher. */}
          <div className="anim-gentle-in flex items-center justify-between md:hidden">
            {(opened.tool === "history" && past) || reviewing ? (
              <button type="button" data-history-back="" onClick={() => (reviewing ? backToHistory() : setPast(null))} className="flex h-[44px] items-center text-[13px] font-medium text-[var(--fg-muted)]">
                {copy.history.back}
              </button>
            ) : (
              <button type="button" onClick={() => open(null)} className="flex h-[44px] items-center text-[13px] font-medium text-[var(--fg-muted)]">
                {copy.back}
              </button>
            )}
            <span className="flex items-center gap-[7px] font-mono text-[10px]" style={{ color: "var(--fg-faint)" }}>
              <span style={{ color: "var(--fg-body)" }}><TuningToolMark tool={opened.tool} size={14} /></span>
              {copy.toolOf(tools.findIndex((t) => t.tool === opened.tool) + 1, tools.length)}
            </span>
          </div>
          {/* Keyed on the tool, so a tab press arrives gently too, not only the first open. The tab
              row above is not keyed: it stays put while the panel under it changes. */}
          <div key={opened.tool} ref={toolRef} id="tuning-tool-panel" role="tabpanel" className="anim-gentle-in" aria-labelledby={`tuning-tab-${opened.tool}`} data-tuning-tool={opened.tool}>
            {opened.tool === "history" ? (
              <TuningHistory deckId={deckId} tools={historyTools} past={past} onOpenPast={openFromHistory} focusRow={returnRow} />
            ) : baselineRead ? (
              <>
                {reviewing ? <ReviewNote row={reviewing.row} counted={reviewing.run.runId === null} onBack={backToHistory} /> : null}
                {/* Keyed on the run, so a tool reopened on another run, or back on its own read, reads afresh. */}
                <Fragment key={reviewed ? reviewed.row.id : "live"}>
                  <ReviewRunProvider value={reviewing ? { ...reviewing.run, leave: leaveReview } : null}>{opened.panel}</ReviewRunProvider>
                </Fragment>
              </>
            ) : null}
          </div>
        </>
      ) : (
        <div className="anim-gentle-in grid grid-cols-1 gap-[8px] md:grid-cols-2 md:gap-[10px]">
          {/* A tile can sit below the fold, and the tool opens in its place starting at the tab row:
              bring the hub's top into view, as a shortcut does (Hugh, 2026-10-11), smoothly unless the
              reader asks for reduced motion (`reveal`). */}
          {views.map((v) => <ToolTile key={v.tool} view={v} onOpen={() => open(v.tool, { focus: true, scroll: true })} />)}
        </div>
      )}
    </section>
  );
}

/** Above a tool History reopened: which run it is, and the way back to History (desktop; the phone's
 *  is the switch slot). A free count's note keeps what it found, since the tool reads the deck now. */
function ReviewNote({ row, counted, onBack }: { row: HistoryRow; counted: boolean; onBack: () => void }) {
  const date = historyDate(row.at);
  const r = copy.history.review;
  const text = counted
    ? r.counted(date, summaryText(row))
    : row.tool === "cuts" ? r.note.cuts(date) : r.note.suggested(date);
  return (
    <div data-review-note={row.id} className="mb-[2px] flex flex-col gap-[6px] md:flex-row md:items-baseline md:justify-between md:gap-[14px]">
      <p className="rounded-[9px] px-[12px] py-[9px] text-[12.5px] leading-[1.55] md:flex-1" style={{ color: "var(--fg-muted)", border: "1px dashed var(--border-dashed)" }}>
        {text}
      </p>
      <button type="button" onClick={onBack} className="hidden flex-none text-[12.5px] font-medium text-[var(--fg-muted)] md:block">
        {copy.history.back}
      </button>
    </div>
  );
}

function ToolTile({ view, onOpen }: { view: TileView; onOpen: () => void }) {
  const name = NAMES[view.tool];
  const markInk = view.running ? "var(--accent)" : view.inert ? "var(--fg-locked)" : "var(--fg-body)";
  const body = (
    <>
      <span className="flex items-center gap-[10px]">
        <span style={{ color: markInk }}><TuningToolMark tool={view.tool} size={20} /></span>
        <span className="text-[14px] font-semibold" style={{ color: view.inert ? "var(--fg-faint)" : "var(--fg)" }}>{name}</span>
        <span className="flex-1" />
        {view.inert ? null : <span aria-hidden="true" className="font-mono text-[14px]" style={{ color: "var(--fg-faint)" }}>›</span>}
      </span>
      <span className="text-[12.5px] leading-[1.5]" style={{ color: view.inert ? "var(--fg-faint)" : "var(--fg-body)", textWrap: "pretty" }}>
        {view.purpose}
      </span>
      {view.inert ? null : (
        <>
          <span className="flex-1" />
          <span className="flex flex-wrap items-center gap-[8px] font-mono text-[10.5px]">
            {view.cost ? (
              <span className="rounded-full" style={{ color: "var(--fg-faint)", border: "1px solid var(--border-strong)", padding: "1px 8px" }}>{view.cost}</span>
            ) : null}
            {view.running ? (
              <span aria-hidden="true" className="anim-dots h-[6px] w-[6px] rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent)" }} />
            ) : null}
            {view.status ? (
              <span style={{ color: view.running ? "var(--accent)" : view.offer ? "var(--fg-muted)" : "var(--fg-faint)" }}>
                <span className="hidden md:inline">{view.status}</span>
                <span className="md:hidden">{view.statusPhone}</span>
              </span>
            ) : null}
          </span>
        </>
      )}
    </>
  );
  const shell = "flex min-h-[44px] flex-col gap-[6px] rounded-[10px] px-[14px] py-[12px] text-left md:min-h-[112px] md:px-[16px] md:py-[14px]";
  if (view.inert) {
    return (
      <div data-tool-tile={view.tool} data-inert="" className={shell} style={{ background: "transparent", border: "1px dashed var(--border-dashed)" }}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      data-tool-tile={view.tool}
      data-running={view.running || undefined}
      aria-label={copy.tileLabel(name, view.status)}
      onClick={onOpen}
      className={`${shell} border bg-[var(--surface)] ${view.running ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
    >
      {body}
    </button>
  );
}
