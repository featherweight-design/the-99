"use client";
// The results under the bar (HANDOFF §4, §5): the order line, the too-narrow note, the best fits,
// the rows, and *Show 12 more*. Every sentence and every lit figure comes from `present.ts`; this
// lays them out.
//
// No total is printed anywhere (F6). Best fits draw only with four or more rows and no narrow
// bar (F7). *Show 12 more* asks the server for the next slice, whose rows then count what the
// player owns as they mount. No motion anywhere (STATES invariant).

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { moreRows, trialFillRows } from "../../app/decks/new/choose/results-actions";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import type { ChooseParams } from "../../lib/intake/params";
import { figures, narrowOptions, orderLine, type Labels } from "../../lib/intake/present";
import type { ResultRow, ResultsPage } from "../../lib/intake/rows";
import { TOO_NARROW_BELOW } from "../../lib/intake/vocabulary";
import { ChooseRow, type Trial } from "./choose-row";
import { useDeeperLooking } from "./deeper-look";
import { NarrowNote } from "./narrow-note";

const BEST_FITS = 3;

export function ChooseResults({
  page,
  params,
  themeLabels,
  cardName,
  cardUnpriced = false,
  queryString,
  changeHref,
}: {
  page: ResultsPage;
  params: ChooseParams;
  /** Theme slug to its vocabulary label. */
  themeLabels: Record<string, string>;
  cardName: string | null;
  /** The build-around card buys with no live price, by its chip: the 4e line before a row's figures land. */
  cardUnpriced?: boolean;
  /** The page's own query string, which the row and paging actions re-parse. */
  queryString: string;
  changeHref: string;
}) {
  const labels: Labels = useMemo(
    () => ({ theme: (slug: string) => themeLabels[slug] ?? slug, card: cardName }),
    [themeLabels, cardName],
  );
  const [rows, setRows] = useState<ResultRow[]>(page.rows);
  const [hasMore, setHasMore] = useState(page.hasMore);
  const [failed, setFailed] = useState(false);
  // While a deeper look runs, the first results stay, dimmed: the rows only, never the labels.
  const dim = useDeeperLooking();
  const [pending, startTransition] = useTransition();

  // THE ROWS' OWNERSHIP FIGURES, counted a slice at a time in ONE action per slice: Next runs a
  // page's Server Actions one after another, so a call per row filled them in single file and held
  // *Show 12 more* behind them. A row absent from the map is still counting.
  const [trials, setTrials] = useState<Record<string, Trial>>({});
  const count = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    trialFillRows(ids, queryString).then(
      (got) => setTrials((prev) => ({
        ...prev,
        ...Object.fromEntries(ids.map((id): [string, Trial] => [id, got[id] ? { state: "ready", figures: got[id]! } : { state: "failed" }])),
      })),
      () => setTrials((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id): [string, Trial] => [id, { state: "failed" }])) })),
    );
  }, [queryString]);
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    count(page.rows.map((r) => r.oracleId));
  }, [count, page.rows]);
  const retry = (id: string) => {
    setTrials((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    count([id]);
  };

  const narrow = page.tooNarrow;
  const options = narrow ? narrowOptions(narrow, params, labels) : [];

  // Nothing fits everything: the note replaces the results, with no order line (5b).
  if (rows.length === 0) {
    return <NarrowNote count={0} options={options} changeHref={changeHref} />;
  }

  const line = orderLine(page.order, params, labels);
  const owned = page.order === "owned";
  const withBest = narrow === null && rows.length >= TOO_NARROW_BELOW;
  const best = withBest ? rows.slice(0, BEST_FITS) : [];
  const rest = withBest ? rows.slice(BEST_FITS) : rows;
  const row = (r: ResultRow, rank?: number) => (
    <ChooseRow
      key={r.oracleId}
      row={r}
      figures={figures(r, page.order, labels)}
      owned={owned}
      params={params}
      cardName={cardName}
      cardUnpriced={cardUnpriced}
      best={rank}
      trial={trials[r.oracleId] ?? { state: "pending" }}
      retry={() => retry(r.oracleId)}
    />
  );

  const showMore = () =>
    startTransition(async () => {
      try {
        const next = await moreRows(queryString, rows.length);
        const seen = new Set(rows.map((r) => r.oracleId));
        const fresh = next.rows.filter((r) => !seen.has(r.oracleId));
        setRows((prev) => [...prev, ...fresh]);
        count(fresh.map((r) => r.oracleId));
        setHasMore(next.hasMore);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });

  return (
    <div className="flex flex-col gap-[14px] md:gap-[18px]">
      <div className="flex flex-col gap-[5px] max-w-[640px]">
        <h2 data-testid="order-line" className="m-0 font-display font-semibold text-[15px] md:text-[18px] text-[color:var(--fg)]">
          {line.title}
        </h2>
        <p className="m-0 text-[12px] md:text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{line.sub}</p>
      </div>

      {narrow && <NarrowNote count={rows.length} options={options} changeHref={changeHref} />}

      {best.length > 0 && (
        <section aria-labelledby="best-fits" className="flex flex-col gap-[10px]">
          <h3 id="best-fits" className="m-0 font-mono font-normal text-[10px] tracking-[.14em] uppercase text-[color:var(--accent)]">
            {copy.results.bestFits}
          </h3>
          <ol data-dim={dim || undefined} className={`m-0 p-0 list-none grid grid-cols-1 gap-[10px] md:grid-cols-[repeat(3,minmax(0,1fr))] md:gap-[14px] ${dim ? "opacity-[0.45]" : ""}`}>
            {best.map((r, i) => row(r, i + 1))}
          </ol>
          <h3 className="m-0 mt-[6px] font-mono font-normal text-[10px] tracking-[.14em] uppercase text-[color:var(--fg-faint)]">
            {copy.results.moreCommanders}
          </h3>
        </section>
      )}

      <ol data-dim={dim || undefined} className={`m-0 p-0 list-none flex flex-col gap-[10px] ${dim ? "opacity-[0.45]" : ""}`}>{rest.map((r) => row(r))}</ol>

      {hasMore && (
        <div className="flex flex-wrap items-center justify-center gap-[14px]">
          <button
            type="button"
            onClick={showMore}
            disabled={pending}
            aria-busy={pending || undefined}
            className="flex-[1_1_100%] md:flex-none inline-flex items-center justify-center h-[44px] md:h-[36px] px-[16px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent text-[13.5px] text-[color:var(--fg-body)] whitespace-nowrap cursor-pointer disabled:cursor-default"
          >
            {copy.results.more}
          </button>
          <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
            {failed ? copy.results.moreFailed : copy.results.moreNote}
          </span>
        </div>
      )}
    </div>
  );
}

const SKELETON_NAME = ["58%", "53%", "48%", "43%", "38%"];

/**
 * The results column: §4's 1080 content (1160 less its 40px sides), CENTERED under the form's 680
 * column rather than pinned left (Hugh, 2026-09-27; ruling Q2b (a), keeping §4's width and its row
 * grid). The page and its loading screen both draw it, so the loader holds the page's position.
 */
export const RESULTS_COLUMN =
  "flex flex-col gap-[14px] md:gap-[18px] w-full max-w-[1160px] mx-auto p-[16px_18px_24px] md:p-[0_40px_48px]";

/**
 * Searching (5c): the order line's heading and five still rows. No shimmer (STATES invariant).
 * `by` names what orders the results; the route's loading screen has no labels to name it with
 * (they come from the database), so it passes none and the line arrives with the page.
 */
export function ResultsSkeleton({ by }: { by?: string }) {
  return (
    <div aria-busy="true" data-testid="results-searching" className="flex flex-col gap-[14px] md:gap-[18px]">
      <div className="flex flex-col gap-[5px] max-w-[640px]">
        <h2 className="m-0 font-display font-semibold text-[15px] md:text-[18px] text-[color:var(--fg)]">{copy.results.loadingHead}</h2>
        {by !== undefined && (
          <p className="m-0 text-[12px] md:text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.results.loadingSub(by)}</p>
        )}
      </div>
      <ol aria-hidden className="m-0 p-0 list-none flex flex-col gap-[10px]">
        {SKELETON_NAME.map((w, i) => (
          <li
            key={w}
            className="flex items-center gap-[14px] p-[10px_12px] md:p-[12px_15px] rounded-[11px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)]"
          >
            <span className="block shrink-0 w-[40px] h-[56px] rounded-[5px] bg-[color:var(--elevated)]" />
            <span className="flex flex-col gap-[9px] flex-1 min-w-0">
              <span className="block h-[11px] rounded-[5px] bg-[color:var(--elevated)]" style={{ width: w }} />
              <span className="block h-[8px] rounded-[4px] bg-[color:var(--surface-raised)]" style={{ width: i % 2 === 0 ? "40%" : "52%" }} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
