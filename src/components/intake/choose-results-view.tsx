"use client";
// The results under the bar (HANDOFF §4, §5), drawn: the order line, the too-narrow note, the best fits, the rows, and
// *Show 12 more*. Props in, JSX out: the list's state, its model-read phase and its actions live in `choose-results.tsx`,
// which the signed-in page draws; the landing demo draws this with fixture rows. Every sentence and every lit figure comes
// from `present.ts`; this lays them out.
//
// No total is printed anywhere (F6). Best fits draw only with four or more rows and no narrow
// bar (F7). *Show 12 more* asks the server for the next slice, whose rows then count what the
// player owns as they mount. No motion anywhere (STATES invariant).

import { useMemo } from "react";

import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import type { ChooseParams } from "../../lib/intake/params";
import { figures, narrowOptions, orderLine, type Labels } from "../../lib/intake/present";
import type { ReadPhase } from "../../lib/intake/read-phase";
import type { ResultRow, ResultsPage } from "../../lib/intake/rows";
import { TOO_NARROW_BELOW } from "../../lib/intake/vocabulary";
import { ChooseRowView, reasonDrawable, type RowDoorProps, type Trial } from "./choose-row-view";
import { NarrowNote } from "./narrow-note";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { ArrivalOrder } from "../ui/arrival-queue";

const BEST_FITS = 3;

export function ChooseResultsView({
  page,
  rows,
  hasMore,
  failed,
  pending,
  trials,
  read,
  retry,
  showMore,
  door,
  inert = false,
  params,
  themeLabels,
  cardName,
  cardUnpriced = false,
  changeHref,
  deckNames,
  pastRun = false,
  pastReasons = pastRun,
  gone = null,
}: {
  page: ResultsPage;
  /** The rows drawn so far: the page's own, then each slice *Show 12 more* added. */
  rows: ResultRow[];
  hasMore: boolean;
  /** The last *Show 12 more* failed. */
  failed: boolean;
  /** A *Show 12 more* is in flight. */
  pending: boolean;
  /** Each row's ownership figures, by oracle id; a row absent from the map is still counting. */
  trials: Readonly<Record<string, Trial>>;
  /** The model read's phase: its picks lead once done, and the results dim while it runs. Null when no read was asked. */
  read: ReadPhase | null;
  retry: (oracleId: string) => void;
  showMore: () => void;
  /** The card-name control of a row (see `ChooseRowView`). */
  door: (props: RowDoorProps) => React.ReactNode;
  /** The rows go nowhere (the landing demo): see `ChooseRowView`. */
  inert?: boolean;
  params: ChooseParams;
  /** Theme slug to its vocabulary label. */
  themeLabels: Record<string, string>;
  cardName: string | null;
  /** The build-around card buys with no live price, by its chip: the 4e line before a row's figures land. */
  cardUnpriced?: boolean;
  changeHref: string;
  /** A deck commander's oracle id to its short name, for the read's reasons. */
  deckNames?: Readonly<Record<string, string>>;
  /** A run opened from History: lines naming a deleted deck say so. */
  pastRun?: boolean;
  /** See `ChooseRowView`: false after a failed deck lookup, so no line claims a deck was deleted. */
  pastReasons?: boolean;
  /** A past run's picks the search no longer lists, drawn as one group after the open picks. */
  gone?: React.ReactNode;
}) {
  const labels: Labels = useMemo(
    () => ({ theme: (slug: string) => themeLabels[slug] ?? slug, card: cardName }),
    [themeLabels, cardName],
  );
  // While the read runs, the results stay, dimmed: the rows and best fits, never the labels (T3).
  const dim = read === "reading";

  const narrow = page.tooNarrow;
  const options = narrow ? narrowOptions(narrow, params, labels) : [];

  // Nothing fits everything: the note replaces the results, with no order line (5b).
  if (rows.length === 0) {
    // A past run's picks that went still draw: their Open deck links are the way into the decks built since.
    return (
      <HoverPreviewProvider className="flex flex-col gap-[14px] md:gap-[18px]">
        {gone ?? null}
        <NarrowNote count={0} options={options} changeHref={changeHref} />
      </HoverPreviewProvider>
    );
  }

  const free = orderLine(page.order, params, labels);
  // The read's order (the read addendum R1): its picks lead once it is done; while it runs, and
  // when it was never read into this order, the free order's own title says what orders the rows.
  const line =
    // A done read whose picks the current answers no longer list leads with none: the free head.
    read === "done" && page.rows.some((r) => r.reason) ? {
      title: copy.results.byWords,
      sub: copy.results.byWordsSub(
        page.rows.filter((r) => r.reason).length,
        page.order === "owned",
        // The same check the row draws by, so the head never promises a line a row leaves out.
        page.rows.every((r) => !r.reason || reasonDrawable(r.reason, deckNames ?? {})),
      ),
    }
    : read === "reading" ? { title: free.title, sub: copy.results.pendingSub }
    : read !== null && page.order === "owned" ? { title: free.title, sub: copy.results.notReadSub }
    : free;
  const owned = page.order === "owned";
  // The read's picks, as drawn: the rows the server ordered first, each carrying its line.
  const picks = rows.filter((r) => r.reason).length;
  const picked = picks > 0;
  const withBest = narrow === null && rows.length >= TOO_NARROW_BELOW;
  // Best fits are the read's picks when there are any, so a free row never takes a pick's rank
  // above the divider: fewer than three picks draw fewer best fits.
  const bestCount = picked ? Math.min(BEST_FITS, picks) : BEST_FITS;
  const best = withBest ? rows.slice(0, bestCount) : [];
  const rest = withBest ? rows.slice(bestCount) : rows;
  const row = (r: ResultRow, rank?: number) => (
    <ChooseRowView
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
      door={door}
      inert={inert}
      deckNames={deckNames}
      pastRun={pastRun}
      pastReasons={pastReasons}
    />
  );
  // After the read's picks, the divider: the first row of the rest with no reason, once any row
  // above it carried one. Picks always lead, so it falls between the two.
  const restAt = picked ? rest.findIndex((r) => !r.reason) : -1;
  return (
    <HoverPreviewProvider className="flex flex-col gap-[14px] md:gap-[18px]">
      <div className="flex flex-col gap-[5px] max-w-[640px]">
        <h2 data-testid="order-line" className="m-0 font-display font-semibold text-[16px] md:text-[18px] [text-wrap:pretty] text-[color:var(--fg)]">
          {line.title}
        </h2>
        <p className="m-0 text-[12.5px] md:text-[13px] leading-[1.55] [text-wrap:pretty] text-[color:var(--fg-muted)]">{line.sub}</p>
      </div>

      {narrow && <NarrowNote count={rows.length} options={options} changeHref={changeHref} />}

      {/* One reading order across the best fits and the rest (`ArrivalOrder`). */}
      <ArrivalOrder>
      {/* A past run whose picks all went: the group heads the results, before any free row. */}
      {gone && !picked ? gone : null}
      {best.length > 0 && (
        <section aria-labelledby="best-fits" className="flex flex-col gap-[10px]">
          <h3 id="best-fits" className="m-0 font-mono font-normal text-[10px] tracking-[.14em] uppercase text-[color:var(--accent-text)]">
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

      <ol data-dim={dim || undefined} className={`m-0 p-0 list-none flex flex-col gap-[10px] ${dim ? "opacity-[0.45]" : ""}`}>
        {rest.map((r, i) => (i === restAt ? [gone ? <li key="gone-picks" className="list-none">{gone}</li> : null, <RestDivider key="rest-divider" owned={owned} />, row(r)] : row(r)))}
        {gone && picked && restAt === -1 ? <li key="gone-picks" className="list-none">{gone}</li> : null}
      </ol>
      </ArrivalOrder>

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
    </HoverPreviewProvider>
  );
}

/** Between the read's picks and the rest of the results, in the free order (the read addendum R1). */
function RestDivider({ owned }: { owned: boolean }) {
  return (
    <li data-testid="rest-divider" role="presentation" className="flex items-center gap-[12px] mt-[8px]">
      <span className="font-mono text-[10px] tracking-[.14em] uppercase text-[color:var(--fg-faint)] whitespace-nowrap">{copy.results.restHead}</span>
      <span aria-hidden className="flex-1 h-px bg-[color:var(--border)]" />
      {/* The tail names the owned order, so it is drawn only when that is the rest's order. */}
      {owned && <span className="hidden md:inline font-mono text-[10.5px] text-[color:var(--fg-faint)] whitespace-nowrap">{copy.results.restTail}</span>}
    </li>
  );
}
