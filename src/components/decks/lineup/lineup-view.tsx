"use client";

// Stats on /decks (handoff `design_handoff_the99_lineup`, R2): every deck side by side, one card per figure,
// with decks as its rows. The shelves, search and tile filters leave; a folder never scopes Stats (ruling 3).
// The filter has two positions, held for this visit: `All decks` (brews included) and `Finished only`, which
// leaves brews out of every chart.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { decksStatsCopy } from "../../../lib/copy/decks-stats";
import { defaultChosen, jobsGrid, strip, worth } from "../../../lib/lineup/among";
import { fullestSlot, recency, scoped, spread } from "../../../lib/lineup/figures";
import type { LineupData, LineupFilter } from "../../../lib/lineup/types";
import { sharedView } from "../../../lib/lineup/shared";
import { CardDetailProvider } from "../../cards/card-detail-provider";
import { AmongBody } from "./among-card";
import { SharedBody } from "./shared-card";
import { CollectionBody, type WantedPick } from "./collection-card";
import { collectionScope, wantedRows } from "../../../lib/lineup/collection";
import { FoldCard, useDecksStatsFold } from "./fold";
import { JobsBody } from "./jobs-card";
import { WorthBody } from "./worth-card";
import { RecencyBody } from "./recency-card";
import { SpreadBody } from "./spread-card";
import { onSegmentKeys } from "./segment-keys";
import { SEGMENT, SEGMENT_OFF, SEGMENT_ON, viewPanelId, viewTabId } from "./stats-view-switch";

const copy = decksStatsCopy;

const FILTERS = ["all", "finished"] as const;

/** One tab stop, arrows move the selection (the radiogroup contract). Drawn twice, for the two widths, so
 *  each copy's ids carry its width. */
function Filter({ filter, onFilter, phone }: { filter: LineupFilter; onFilter: (f: LineupFilter) => void; phone: boolean }) {
  const idOf = (f: LineupFilter) => `stats-filter-${phone ? "phone" : "wide"}-${f}`;
  return (
    <div
      role="radiogroup"
      aria-label={copy.filter.aria}
      onKeyDown={(e) => onSegmentKeys(e, FILTERS, idOf, onFilter)}
      className={`gap-[2px] rounded-[9px] border border-[color:var(--border-strong)] p-[2px] ${phone ? "grid grid-cols-2" : "flex flex-none"}`}
    >
      {FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          role="radio"
          id={idOf(f)}
          aria-checked={filter === f}
          tabIndex={filter === f ? 0 : -1}
          data-stats-filter={f}
          onClick={() => onFilter(f)}
          className={`${SEGMENT} ${filter === f ? SEGMENT_ON : SEGMENT_OFF}`}
        >
          {f === "all" ? copy.filter.all : copy.filter.finished}
        </button>
      ))}
    </div>
  );
}

export function LineupView({ data, now, foldServer, viewSwitch, cartEnabled = false, amongDeck = null }: {
  data: LineupData;
  /** The server's clock, ISO: every "N days ago" is measured against it. */
  now: string;
  /** The fold memory the page read from its cookie, so the server draws the cards this browser keeps open. */
  foldServer: string | null;
  viewSwitch: ReactNode;
  /** `ALL_DECKS_CART_ENABLED`: a shared row's to-buy line links to Shopping for all decks only while it is on. */
  cartEnabled?: boolean;
  /** A tile's `See it among your decks`: the deck This deck among yours opens on, with that card open and focused. */
  amongDeck?: string | null;
}) {
  const [filter, setFilter] = useState<LineupFilter>("all");
  const fold = useDecksStatsFold(foldServer);
  const decks = useMemo(() => scoped(data.decks, filter), [data.decks, filter]);
  const brews = data.decks.filter((d) => d.brew).length;
  const one = data.decks.length === 1;
  // `1 deck` is the All decks shorthand only: Finished only always counts what it kept, which can be none.
  const scope = filter === "finished" ? copy.filter.scopeFinished(decks.length, brews) : one ? copy.filter.one : copy.filter.scopeAll(decks.length, brews);
  const rec = useMemo(() => recency(decks, now), [decks, now]);
  const spr = useMemo(() => spread(decks), [decks]);
  const top = fullestSlot(spr);
  // The deck This deck among yours compares, and that Worth and Jobs mark: the reader's pick while it is in
  // scope, else the one played most recently (a brew picked, then left out by Finished only, falls back).
  const [picked, setPicked] = useState<string | null>(amongDeck);
  // Held here, not in the card's body, so the folded summary counts what the select and the cut last showed.
  const [wantedPick, setWantedPick] = useState<WantedPick>({ deckId: null, cut: 40 });
  const chosen = decks.find((d) => d.id === picked) ?? defaultChosen(decks);
  // The build cards compare decks, so they need two with figures (T1: one deck draws none of them).
  const built = decks.filter((d) => d.build);
  const comparing = built.length >= 2 && chosen?.build ? chosen : null;
  // Arriving from a tile: open This deck among yours and put focus on its head, since the tile's menu that had
  // focus has gone with Tiles. Once per arrival (a later fold of that card is the reader's own). With no card to
  // compare in (one deck, or no build figures), nothing is opened or remembered and focus goes to the first head.
  const arrived = useRef<string | null>(null);
  const { show } = fold;
  const canCompare = comparing !== null;
  useEffect(() => {
    if (!amongDeck || arrived.current === amongDeck) return;
    arrived.current = amongDeck;
    if (canCompare) show("among");
    document.querySelector<HTMLElement>(canCompare ? '[data-stats-card="among"] > button' : "[data-stats-card] > button")?.focus();
  }, [amongDeck, canCompare, show]);
  const rank = (key: "valueCents" | "ramp") => {
    const s = comparing ? strip(decks, comparing, key) : null;
    return s ? copy.among.rank(s.chosen.rank, s.total, s.chosen.tied) : "";
  };
  const w = useMemo(() => worth(decks, "most"), [decks]);
  const sharedTop = useMemo(() => (data.shared ? sharedView(data.shared, new Set(decks.map((d) => d.id)), "most") : null), [data.shared, decks]);
  const grid = useMemo(() => jobsGrid(decks, "ramp"), [decks]);
  const expand = (
    <button type="button" data-stats-expand onClick={() => fold.setAll(!fold.allOpen)} className="inline-flex min-h-[44px] items-center text-[13px] text-[color:var(--accent)] md:min-h-[34px]">
      {fold.allOpen ? copy.fold.collapseAll : copy.fold.expandAll}
    </button>
  );
  const scopeLine = <span data-stats-scope className="font-mono text-[11px] text-[color:var(--fg-muted)]">{scope}</span>;

  return (
    // Every card name in Stats opens its card (handoff R1 call 11). The view takes the Tiles view's container and
    // gutters, the whole of `<main>` with 22px sides from md (Hugh, 2026-10-12), rather than a 900 column pinned left.
    <CardDetailProvider>
    <div data-decks-stats className="flex min-h-0 w-full flex-auto flex-col">
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

      <div role="tabpanel" id={viewPanelId("stats")} aria-labelledby={viewTabId("stats")} className="flex flex-col gap-[10px] px-[16px] pt-[4px] pb-[20px] md:gap-[12px] md:border-t md:border-t-[color:var(--border)] md:px-[22px] md:pt-[14px] md:pb-[18px]">
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
        {sharedTop ? (
          <FoldCard
            id="shared"
            title={copy.shared.title}
            denom={decks.length === 1 ? copy.filter.one : copy.shared.denom(decks.length, filter === "finished" ? data.cardCounts.finished : data.cardCounts.all)}
            summary={decks.length < 2 ? copy.summary.sharedOne : !sharedTop.rows[0] ? copy.summary.sharedNone : copy.summary.shared(sharedTop.rows[0].name, sharedTop.rows[0].decks.length, sharedTop.rows[0].owned, sharedTop.wantedMore)}
            open={fold.open.has("shared")}
            onToggle={() => fold.toggle("shared")}
          >
            <SharedBody shared={data.shared!} decks={decks} cartEnabled={cartEnabled} />
          </FoldCard>
        ) : null}
        {data.collection ? (() => {
          const c = data.collection;
          const sc = collectionScope(c, filter);
          const inScope = new Set(decks.map((d) => d.id));
          const chosen = wantedPick.deckId && inScope.has(wantedPick.deckId) ? wantedPick.deckId : null;
          const wanted = wantedRows(c, inScope, chosen).filter((r) => r.pct >= wantedPick.cut).length;
          // Dated by the collection's own price read, not the decks', which ran first.
          const age = c.asOf ? copy.worth.age((Date.parse(now) - Date.parse(c.asOf)) / 60_000) : null;
          return (
            <FoldCard
              id="collection"
              title={copy.collection.title}
              denom={copy.collection.denom(c.copies, c.cards)}
              summary={copy.summary.collection(sc.inDeckCopies, c.copies, c.pricedCopies > 0 ? sc.pctValue : null, wanted)}
              open={fold.open.has("collection")}
              onToggle={() => fold.toggle("collection")}
            >
              <CollectionBody c={c} decks={decks} filter={filter} age={age} pick={wantedPick} onPick={setWantedPick} />
            </FoldCard>
          );
        })() : null}
        {comparing ? (
          <>
            <FoldCard
              id="among"
              title={copy.among.title}
              denom={copy.among.denom(decks.length)}
              summary={copy.summary.among(comparing.name, rank("valueCents"), rank("ramp"))}
              open={fold.open.has("among")}
              onToggle={() => fold.toggle("among")}
            >
              <AmongBody decks={decks} chosen={comparing} onChoose={setPicked} />
            </FoldCard>
            <FoldCard
              id="jobs"
              title={copy.jobs.title}
              denom={copy.jobs.denom(built.length)}
              summary={copy.summary.jobs(grid.range.ramp, grid.range.draw, grid.range.removal)}
              open={fold.open.has("jobs")}
              onToggle={() => fold.toggle("jobs")}
            >
              <JobsBody decks={decks} chosenId={comparing.id} />
            </FoldCard>
            <FoldCard
              id="worth"
              title={copy.worth.title}
              denom={copy.worth.denom(w.rows.length)}
              summary={copy.summary.worth(w.sumCents, w.maxCents, w.medianCents)}
              open={fold.open.has("worth")}
              onToggle={() => fold.toggle("worth")}
            >
              <WorthBody decks={decks} chosenId={comparing.id} pricesAsOf={data.pricesAsOf} now={now} />
            </FoldCard>
          </>
        ) : null}
      </div>
    </div>
    </CardDetailProvider>
  );
}
