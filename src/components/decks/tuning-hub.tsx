"use client";

// The Tuning hub (tuning hub handoff R1, canvas A; design table `TuningHub`, `ToolTile`, `Tool
// switch`). The last section of the Analysis tab: a tile per tool, in a fixed order, each saying
// what it does and what it costs, and a tool opening in place of the tiles with no route change.
// `openTool` lives HERE, so it resets whenever the Analysis tabpanel unmounts, which it does on
// every tab switch (`builder-shell.tsx`), on leaving the page and on a reload (A6). Runs are read
// from the ledger on mount, so a run still in flight reappears on its tile.

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { readTuningHub } from "../../app/decks/tuning-hub-actions";
import { tuningHubCopy as copy } from "../../lib/copy/tuning-hub";
import type { HubTileRun, HubTiles } from "../../lib/tuning/hub-tiles";
import { TuningToolMark, type TuningTool } from "./tuning-tool-mark";

/** While a run is in flight the landing re-reads at the tools' own cadence. */
const WATCH_MS = 3000;
/** How long a shortcut waits for the tab's opening loader to reveal the hub before giving up. */
const SHOWN_WAIT_MS = 10_000;

export type HubToolSpec =
  | { tool: "suggested"; panel: ReactNode | null }
  | { tool: "cuts"; panel: ReactNode; over: number; total: number };

/** A shortcut's ask: open this tool. `nonce` makes a second press of the same shortcut count. */
export type HubRequest = { tool: TuningTool; nonce: number };

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
  if (spec.tool === "suggested") {
    const t = copy.tools.suggested;
    if (spec.panel === null) {
      return { tool: "suggested", purpose: t.needsReading, cost: "", status: "", statusPhone: "", running: false, offer: false, inert: true };
    }
    const run = runStatus(tiles?.suggested_changes ?? null, copy.runningWords.suggested,
      (r) => (r.total === 0 ? copy.outcome.nothing : copy.outcome.applied(r.accepted, r.total)), now);
    return { tool: "suggested", purpose: t.purpose, cost: t.cost, ...run, offer: false, inert: false };
  }
  const t = copy.tools.cuts;
  const run = runStatus(tiles?.proposed_cuts ?? null, copy.runningWords.deeper,
    (r) => (r.total === 0 ? copy.outcome.nothing : copy.outcome.cut(r.accepted, r.total)), now);
  // A run in flight is the deck's live fact; otherwise the figure that explains the offer wins
  // over the last run (A1). At 100 or under the tile is inert, and a run still in flight there
  // is the tool's to show once it opens.
  if (run.running) return { tool: "cuts", purpose: t.purpose, cost: t.cost, ...run, offer: false, inert: false };
  if (spec.over <= 0) {
    return { tool: "cuts", purpose: t.notOffered(spec.total), cost: "", status: "", statusPhone: "", running: false, offer: false, inert: true };
  }
  const over = t.over(spec.over);
  return { tool: "cuts", purpose: t.purpose, cost: t.cost, status: over, statusPhone: over, running: false, offer: true, inert: false };
}

export function TuningHub({
  deckId,
  tools,
  drawn,
  request,
  onSettled,
}: {
  deckId: string;
  tools: HubToolSpec[];
  /** Whether the section draws: over a reading, or for a deck over 100 that has none. Mounted
   *  either way, so its first read still settles the tab's opening loader. */
  drawn: boolean;
  request?: HubRequest | null;
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

  const settledRef = useRef(onSettled);
  useEffect(() => { settledRef.current = onSettled; });
  const read = useCallback(() => {
    readTuningHub(deckId)
      .then((t) => setTiles(t))
      // A failed read leaves the tiles without a status line; every tool still opens.
      .catch(() => {})
      .finally(() => settledRef.current?.());
  }, [deckId]);

  // On mount, and each time the reader comes back to the tiles: a tool's own run may have settled.
  useEffect(() => {
    if (openTool === null) read();
  }, [openTool, read]);

  const running = !!tiles && Object.values(tiles).some((t) => t?.kind === "running");
  useEffect(() => {
    if (!running) return;
    const watch = setInterval(read, WATCH_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(watch); clearInterval(tick); };
  }, [running, read]);

  // Back on the landing, focus returns to the tile of the tool just left: the control that took
  // the reader there (All tools, or the phone's back) is gone with the tool.
  const [leftTool, setLeftTool] = useState<TuningTool | null>(null);
  const open = useCallback((tool: TuningTool | null, how: { focus: boolean; scroll?: boolean } = { focus: true }) => {
    if (tool === null) setLeftTool(openTool);
    setOpening((prev) => (tool === null ? null : { tool, focus: how.focus, scroll: how.scroll ?? false, seq: (prev?.seq ?? 0) + 1 }));
  }, [openTool]);
  useEffect(() => {
    if (openTool !== null || leftTool === null) return;
    sectionRef.current?.querySelector<HTMLElement>(`button[data-tool-tile="${leftTool}"]`)?.focus();
  }, [openTool, leftTool]);

  // A shortcut on Your deck, answered once per nonce and during render rather than in an effect,
  // so the tool is open in the same paint the tab arrives with.
  const [answered, setAnswered] = useState<number | null>(null);
  if (request && request.nonce !== answered) {
    setAnswered(request.nonce);
    if (tools.some((t) => t.tool === request.tool)) {
      setOpening((prev) => ({ tool: request.tool, focus: true, scroll: true, seq: (prev?.seq ?? 0) + 1 }));
    }
  }

  useEffect(() => {
    if (!opening) return;
    const settle = () => {
      if (opening.scroll) sectionRef.current?.scrollIntoView({ block: "start" });
      if (!opening.focus) return;
      // The tool's own heading keeps its landmark (README, other decisions 2); focus moves to it.
      const heading = toolRef.current?.querySelector<HTMLElement>("h2, h3");
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    };
    // A shortcut lands on the tab while its opening loader still hides the body under a `hidden`
    // ancestor (`analysis-panel`), and a hidden box can be neither scrolled to nor focused, so wait
    // for it to be shown.
    const shown = () => !!sectionRef.current && !sectionRef.current.closest("[hidden]");
    if (shown()) { settle(); return; }
    const giveUp = Date.now() + SHOWN_WAIT_MS;
    let frame = requestAnimationFrame(function wait() {
      if (shown()) settle();
      else if (Date.now() < giveUp) frame = requestAnimationFrame(wait);
    });
    return () => cancelAnimationFrame(frame);
  }, [opening]);

  const views = tools.map((spec) => tileOf(spec, tiles, now));
  // A tool that stopped being offered while it was open finishes in place (C8); one that is not
  // drawn at all (its switch is off) never opens.
  const opened = openTool ? tools.find((t) => t.tool === openTool) ?? null : null;
  const openedView = opened ? views.find((v) => v.tool === opened.tool)! : null;

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

  if (!drawn || tools.length === 0) return null;
  return (
    <section
      ref={sectionRef}
      aria-labelledby="tuning-hub-heading"
      data-tuning-hub=""
      className={`flex flex-col gap-[12px] pt-[16px] ${opened ? "md:gap-[14px]" : ""}`}
      style={{ borderTop: "1px solid var(--border)", scrollMarginTop: 16 }}
    >
      <h2 id="tuning-hub-heading" className="font-display text-[17px] font-normal md:text-[19px]" style={{ color: "var(--fg)" }}>
        {copy.title}
      </h2>
      {opened && openedView ? (
        <>
          {/* DESKTOP: an underline tab row, deliberately unlike the deck tabs' filled pills. */}
          <div role="tablist" aria-label={copy.title} className="hidden gap-[22px] md:flex" style={{ borderBottom: "1px solid var(--border)" }}>
            {[null, ...tools.map((t) => t.tool)].map((id, i) => {
              const active = id === opened.tool;
              const view = id ? views.find((v) => v.tool === id) : null;
              return (
                <button
                  key={id ?? "all"}
                  ref={(el) => { if (el) tabRefs.current.set(id ?? "all", el); else tabRefs.current.delete(id ?? "all"); }}
                  type="button"
                  role="tab"
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
          <div className="flex items-center justify-between md:hidden">
            <button type="button" onClick={() => open(null)} className="flex h-[44px] items-center text-[13px] font-medium text-[var(--fg-muted)]">
              {copy.back}
            </button>
            <span className="flex items-center gap-[7px] font-mono text-[10px]" style={{ color: "var(--fg-faint)" }}>
              <span style={{ color: "var(--fg-body)" }}><TuningToolMark tool={opened.tool} size={14} /></span>
              {copy.toolOf(tools.findIndex((t) => t.tool === opened.tool) + 1, tools.length)}
            </span>
          </div>
          <div ref={toolRef} data-tuning-tool={opened.tool}>{opened.panel}</div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2 md:gap-[10px]">
          {views.map((v) => <ToolTile key={v.tool} view={v} onOpen={() => open(v.tool)} />)}
        </div>
      )}
    </section>
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
