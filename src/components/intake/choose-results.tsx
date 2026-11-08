"use client";
// The signed-in results list: `ChooseResultsView` (the drawing, shared with the landing demo) wired to this reader's
// state: the rows' ownership counts and *Show 12 more* (server actions), the model read's phase, and the card detail.

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { moreRows, trialFillRows } from "../../app/decks/new/choose/results-actions";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import type { ChooseParams } from "../../lib/intake/params";
import type { ResultRow, ResultsPage } from "../../lib/intake/rows";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { StallWatch } from "../shell/nav-stall";
import { ChooseResultsView } from "./choose-results-view";
import type { RowDoorProps, Trial } from "./choose-row-view";
import { useReadPhase, useReportPool } from "./read-panel";

const cardDoor = ({ oracleId, name, imageUri, preview, testId, className, children }: RowDoorProps) => (
  <CardDetailTrigger oracleId={oracleId} name={name} imageUri={imageUri} preview={preview} testId={testId} className={className}>
    {children}
  </CardDetailTrigger>
);

export function ChooseResults({
  page,
  queryString,
  ...view
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
  /** A deck commander's oracle id to its short name, for the read's reasons. */
  deckNames?: Readonly<Record<string, string>>;
  /** A run opened from History: lines naming a deleted deck say so. */
  pastRun?: boolean;
  /** See `ChooseRow`: false after a failed deck lookup, so no line claims a deck was deleted. */
  pastReasons?: boolean;
  /** A past run's picks the search no longer lists, drawn as one group after the open picks. */
  gone?: React.ReactNode;
}) {
  const [rows, setRows] = useState<ResultRow[]>(page.rows);
  const [hasMore, setHasMore] = useState(page.hasMore);
  const [failed, setFailed] = useState(false);
  const read = useReadPhase();
  // The read's step 1 names how many commanders the answers allow: this list is that pool.
  const reportPool = useReportPool();
  useEffect(() => { reportPool(page.total); }, [reportPool, page.total]);
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

  // The next slice in the order this list was drawn in: a page drawn before its read settled asks
  // without `r`, so a settle between two slices cannot cut the second from a different order.
  const moreQuery = rows.some((r) => r.reason) ? queryString : withoutRead(queryString);

  const showMore = () =>
    startTransition(async () => {
      try {
        const next = await moreRows(moreQuery, rows.length);
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
    <ChooseResultsView
      {...view}
      page={page}
      rows={rows}
      hasMore={hasMore}
      failed={failed}
      pending={pending}
      trials={trials}
      read={read}
      retry={retry}
      showMore={showMore}
      door={cardDoor}
    />
  );
}

const SKELETON_NAME = ["58%", "53%", "48%", "43%", "38%"];

/**
 * The loading state stood in for the list while the read the form started is pending: the same
 * skeleton, and the pool the free search counted, which the read's step 1 names ("Scanning the N
 * commanders"). The rows themselves are not drawn (`page.tsx`, `holdList`).
 */
export function HeldResults({ total, by }: { total: number; by?: string }) {
  const reportPool = useReportPool();
  useEffect(() => { reportPool(total); }, [reportPool, total]);
  return <ResultsSkeleton by={by} watch={false} />;
}

/**
 * Searching (5c): the order line's heading and five skeleton rows. They breathe (`anim-skeleton`;
 * Hugh, 2026-10-12, superseding the STATES invariant that held them still): opacity alone, no shimmer.
 * `by` names what orders the results; the route's loading screen has no labels to name it with
 * (they come from the database), so it passes none and the line arrives with the page.
 */
// It carries `data-loading-screen` and `StallWatch` as every in-page `LoadingScreen` does: it is the
// page's own Suspense fallback and the route loader's body, so the stuck-loader diagnostic watches it.
// `HeldResults` passes `watch={false}`: there it stands in while a model read runs, which may take
// longer than the 8 seconds a stuck page is reported at, by design.
export function ResultsSkeleton({ by, watch = true }: { by?: string; watch?: boolean }) {
  return (
    <div aria-busy="true" data-testid="results-searching" data-loading-screen={watch ? "" : undefined} className="flex flex-col gap-[14px] md:gap-[18px]">
      {watch ? <StallWatch /> : null}
      <div className="flex flex-col gap-[5px] max-w-[640px]">
        <h2 className="m-0 font-display font-semibold text-[16px] md:text-[18px] [text-wrap:pretty] text-[color:var(--fg)]">{copy.results.loadingHead}</h2>
        {by !== undefined && (
          <p className="m-0 text-[12.5px] md:text-[13px] leading-[1.55] [text-wrap:pretty] text-[color:var(--fg-muted)]">{copy.results.loadingSub(by)}</p>
        )}
      </div>
      <ol aria-hidden className="anim-skeleton m-0 p-0 list-none flex flex-col gap-[10px]">
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

/** A query string with its read `r` taken out. */
function withoutRead(queryString: string): string {
  const sp = new URLSearchParams(queryString);
  sp.delete("r");
  return sp.toString();
}
