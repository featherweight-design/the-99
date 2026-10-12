"use client";

// Stats on /decks (handoff `design_handoff_the99_lineup`, R2): every deck side by side, one card per figure,
// with decks as its rows. The shelves, search and tile filters leave; a folder never scopes Stats (ruling 3).
// The filter has two positions, held for this visit: `All decks` (brews included) and `Finished only`, which
// leaves brews out of every chart.

import { useMemo, useState, type ReactNode } from "react";
import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import { fullestSlot, recency, scoped, spread } from "../../../lib/lineup/figures";
import type { LineupData, LineupFilter } from "../../../lib/lineup/types";
import { FoldCard, useDecksStatsFold } from "./fold";
import { RecencyBody } from "./recency-card";
import { SpreadBody } from "./spread-card";
import { SEGMENT, SEGMENT_OFF, SEGMENT_ON } from "./stats-view-switch";

const copy = decksStatsCopy;

function Filter({ filter, onFilter, phone }: { filter: LineupFilter; onFilter: (f: LineupFilter) => void; phone: boolean }) {
  const seg = (f: LineupFilter, label: string) => (
    <button type="button" role="radio" aria-checked={filter === f} data-stats-filter={f} onClick={() => onFilter(f)} className={`${SEGMENT} ${filter === f ? SEGMENT_ON : SEGMENT_OFF}`}>
      {label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label={copy.filter.aria} className={`gap-[2px] rounded-[9px] border border-[color:var(--border-strong)] p-[2px] ${phone ? "grid grid-cols-2" : "flex flex-none"}`}>
      {seg("all", copy.filter.all)}
      {seg("finished", copy.filter.finished)}
    </div>
  );
}

export function LineupView({ data, now, foldServer, viewSwitch }: {
  data: LineupData;
  /** The server's clock, ISO: every "N days ago" is measured against it. */
  now: string;
  /** The fold memory the page read from its cookie, so the server draws the cards this browser keeps open. */
  foldServer: string | null;
  viewSwitch: ReactNode;
}) {
  const [filter, setFilter] = useState<LineupFilter>("all");
  const fold = useDecksStatsFold(foldServer);
  const decks = useMemo(() => scoped(data.decks, filter), [data.decks, filter]);
  const brews = data.decks.filter((d) => d.brew).length;
  const one = data.decks.length === 1;
  const scope = one ? copy.filter.one : filter === "finished" ? copy.filter.scopeFinished(decks.length, brews) : copy.filter.scopeAll(decks.length, brews);
  const rec = useMemo(() => recency(decks, now), [decks, now]);
  const spr = useMemo(() => spread(decks), [decks]);
  const top = fullestSlot(spr);
  const expand = (
    <button type="button" data-stats-expand onClick={() => fold.setAll(!fold.allOpen)} className="inline-flex min-h-[44px] items-center text-[13px] text-[color:var(--accent)] md:min-h-[34px]">
      {fold.allOpen ? copy.fold.collapseAll : copy.fold.expandAll}
    </button>
  );
  const scopeLine = <span data-stats-scope className="font-mono text-[11px] text-[color:var(--fg-muted)]">{scope}</span>;

  return (
    <div data-decks-stats className="flex min-h-0 w-full flex-auto flex-col md:max-w-[900px]">
      {/* The view row: the switch, then (from md) the filter and its scope line in the same row. */}
      <div className="flex items-center gap-[8px] px-[16px] pt-[8px] pb-[10px] md:flex-wrap md:gap-[6px] md:border-t md:border-t-[color:var(--border)] md:px-[22px] md:py-[10px]">
        {viewSwitch}
        <span aria-hidden="true" className="mx-[6px] hidden h-[22px] w-[1px] flex-none bg-[var(--border-strong)] md:block" />
        <span className="hidden md:contents">
          <Filter filter={filter} onFilter={setFilter} phone={false} />
          {scopeLine}
        </span>
        <span className="flex-1" />
        {expand}
      </div>
      <div className="flex flex-col gap-[8px] px-[16px] pb-[12px] md:hidden">
        <Filter filter={filter} onFilter={setFilter} phone />
        {scopeLine}
      </div>

      <div className="flex flex-col gap-[10px] px-[16px] pt-[4px] pb-[20px] md:gap-[12px] md:border-t md:border-t-[color:var(--border)] md:px-[22px] md:pt-[14px] md:pb-[28px]">
        {one ? <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.one}</p> : null}
        <FoldCard
          id="recency"
          title={copy.recency.title}
          denom={copy.recency.denom(rec.lanes.length, decks.length)}
          summary={rec.lastAgo === null ? copy.summary.recencyNone(rec.never.length) : copy.summary.recency(rec.lastAgo, rec.wins, rec.games, rec.never.length)}
          open={fold.open.has("recency")}
          onToggle={() => fold.toggle("recency")}
        >
          <RecencyBody r={rec} total={decks.length} />
        </FoldCard>
        <FoldCard
          id="spread"
          title={copy.spread.title}
          denom={copy.spread.denom(spr.analyzed, decks.length)}
          summary={top ? copy.summary.spread(top.label, top.decks.length, spr.notAnalyzed.length) : copy.summary.spreadNone(spr.notAnalyzed.length)}
          open={fold.open.has("spread")}
          onToggle={() => fold.toggle("spread")}
        >
          <SpreadBody s={spr} decks={decks} />
        </FoldCard>
      </div>
    </div>
  );
}
