"use client";
// Card search, the half that loads on first intent (see `card-search.tsx`): the card details provider the results
// open into, and everything drawn in the sheet's body (S1 to S7, property table
// `docs/superpowers/design-tables/card-search-phone.md`). The body is portalled into the sheet the shell keeps
// mounted; the provider stays up while the sheet is closed, because that is when its card is showing.
//
// The provider is the search's own (resolution 2): a sibling of any page's provider, with no deck and no sheet
// under it, so a card opened from search is a first layer and keeps Find a deck, on the deck page too.

import { usePathname } from "next/navigation";
import { useEffect, useRef, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import type { CardSearchRow } from "../../lib/card-search/search";
import { cardSearchCopy } from "../../lib/copy/card-search";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { CardDetailProvider, useCardDetail, type SiblingCard } from "../cards/card-detail-provider";
import type { SearchPhase } from "./card-search";
import { SearchRow } from "./search-row";

/** The read's limit (`SEARCH_LIMIT`, which lives beside the database and is held equal by the test). */
export const RESULTS_LIMIT = 20;
/** The live region speaks this long after the results settle (README call 7). */
export const ANNOUNCE_AFTER_MS = 500;

export type OpenCard = (oracleId: string, siblings: SiblingCard[], art: string | null, opener: HTMLElement | null) => void;

export type SearchLayerProps = {
  bodyEl: HTMLElement | null;
  query: string;
  searching: boolean;
  phase: SearchPhase;
  rows: CardSearchRow[];
  rowsFor: string;
  recentRows: CardSearchRow[];
  /** The reader has recent cards (their signals may still be on the way). */
  recentsHeld: boolean;
  online: boolean;
  active: number;
  returned: string | null;
  listboxId: string;
  onPick: (from: readonly CardSearchRow[], index: number) => void;
  onClear: () => void;
  onRetry: () => void;
  onAnnounce: (text: string) => void;
  onCardDismissed: () => void;
  /** A card the search opened never came up (its read failed). */
  onCardFailed: () => void;
  /** The recent cards' signals could not be read. */
  recentsFailed: boolean;
  openCardRef: MutableRefObject<OpenCard | null>;
};

export function SearchLayer(props: SearchLayerProps) {
  return (
    <CardDetailProvider onDismiss={props.onCardDismissed}>
      <Bridge openCardRef={props.openCardRef} onCardFailed={props.onCardFailed} />
      {props.bodyEl ? createPortal(<SearchBody {...props} />, props.bodyEl) : null}
    </CardDetailProvider>
  );
}

/** Hands the provider's `open` to the shell's half, and closes the card on a navigation, never as a dismissal. */
function Bridge({ openCardRef, onCardFailed }: { openCardRef: MutableRefObject<OpenCard | null>; onCardFailed: () => void }) {
  const { open, close, pendingOracleId, openOracleId } = useCardDetail();
  // The card asked for, and whether its read was seen in flight: a read that ends with no card drawn failed, and the
  // provider says so only in its own live region, with no dialog and no dismissal to bring the search back.
  const asked = useRef<{ id: string; pending: boolean } | null>(null);
  useEffect(() => {
    openCardRef.current = (oracleId, siblings, art, opener) => {
      asked.current = { id: oracleId, pending: false };
      open(oracleId, siblings, undefined, { art, opener });
    };
    return () => {
      openCardRef.current = null;
    };
  }, [open, openCardRef]);
  useEffect(() => {
    const a = asked.current;
    if (!a) return;
    if (openOracleId === a.id) asked.current = null;
    else if (pendingOracleId === a.id) a.pending = true;
    else if (a.pending && pendingOracleId === null) {
      asked.current = null;
      onCardFailed();
    }
  }, [pendingOracleId, openOracleId, onCardFailed]);
  // The shell outlives every page, so a card left open by a link inside it (a deck in Find a deck) would otherwise
  // stand over the next route.
  const pathname = usePathname();
  const seen = useRef(pathname);
  useEffect(() => {
    if (seen.current === pathname) return;
    seen.current = pathname;
    close();
  }, [pathname, close]);
  return null;
}

const META = "px-4 pt-3 pb-1 font-mono text-[11.5px] text-[color:var(--fg-faint)]";
const BOX = "mx-4 mt-[18px] flex flex-col gap-2 rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] p-[18px]";
const SKELETON_WIDTHS: ReadonlyArray<readonly [string, string]> = [
  ["62%", "40%"],
  ["48%", "30%"],
  ["70%", "44%"],
];

function SearchBody(p: SearchLayerProps) {
  const stale = p.rowsFor !== p.query;
  const settled = p.searching && p.online && !stale && p.phase === "results";
  const { onAnnounce } = p;

  // The count, or the no-results line, once the results have stood still for half a second.
  useEffect(() => {
    if (!settled) return;
    const text = p.rows.length === 0 ? collectionEditCopy.add.noResultsTitle(p.query) : cardSearchCopy.count(p.rows.length);
    // Emptied first, so a second search with the same count is still heard (the region only speaks a change).
    onAnnounce("");
    const timer = window.setTimeout(() => onAnnounce(text), ANNOUNCE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [settled, p.rows.length, p.query, onAnnounce]);

  // Offline is the frame's own (it cannot wait for this chunk).
  if (!p.online) return null;

  if (!p.searching) {
    if (!p.recentsHeld) return <Empty />;
    if (p.recentsFailed) return <Failed onRetry={p.onRetry} />;
    if (p.recentRows.length === 0) return null;
    return (
      <>
        <div className="flex items-center justify-between px-4 pt-[14px] pb-[6px]">
          <h3 className="font-mono text-[10.5px] font-medium tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
            {cardSearchCopy.recent.heading}
          </h3>
          <button
            type="button"
            onClick={p.onClear}
            className="min-h-9 text-[13.5px] font-medium text-[color:var(--accent)] underline underline-offset-[3px]"
          >
            {cardSearchCopy.recent.clear}
          </button>
        </div>
        <Rows {...p} from={p.recentRows} matchQuery="" />
      </>
    );
  }

  if (p.phase === "failed") return <Failed onRetry={p.onRetry} />;

  if (stale) {
    // A later search keeps the rows it is replacing, at half strength under the bar; the first one draws skeletons.
    if (p.rows.length > 0) {
      return (
        <>
          <p className={META}>{cardSearchCopy.searching}</p>
          <div className="opacity-50">
            <Rows {...p} from={p.rows} matchQuery={p.rowsFor} />
          </div>
        </>
      );
    }
    return (
      <>
        <p className={META}>{cardSearchCopy.searching}</p>
        {SKELETON_WIDTHS.map(([a, b], i) => (
          <div
            key={i}
            aria-hidden
            className={`flex h-[72px] items-center gap-3 px-4 ${i === 0 ? "" : "border-t border-solid border-[color:var(--border)]"}`}
          >
            <span className="h-14 w-10 flex-none rounded-[4px] bg-[color:var(--surface-raised)]" />
            <span className="flex flex-1 flex-col gap-[9px]">
              <span className="h-[10px] rounded-[5px] bg-[color:var(--surface-raised)]" style={{ width: a }} />
              <span className="h-[10px] rounded-[5px] bg-[color:var(--surface-raised)]" style={{ width: b }} />
            </span>
          </div>
        ))}
      </>
    );
  }

  if (p.rows.length === 0) {
    return (
      <div className={BOX}>
        <p className="text-[15.5px] font-semibold text-[color:var(--fg)]">{collectionEditCopy.add.noResultsTitle(p.query)}</p>
        <p className="text-[14px] leading-[1.6] text-[color:var(--fg-muted)]">{collectionEditCopy.add.noResultsBody}</p>
      </div>
    );
  }

  return (
    <>
      <p className={META}>{cardSearchCopy.count(p.rows.length)}</p>
      <Rows {...p} from={p.rows} matchQuery={p.rowsFor} />
      {p.rows.length >= RESULTS_LIMIT ? (
        <p className="border-t border-solid border-[color:var(--border)] px-4 py-[14px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">
          {cardSearchCopy.limitReached}
        </p>
      ) : null}
    </>
  );
}

/** S6: Add cards' failure sentence and Try again, as an alert. */
function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={BOX} role="alert">
      <p className="text-[14px] leading-[1.6] text-[color:var(--fg-body)]">{collectionEditCopy.add.searchFailed}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-[6px] h-11 self-start rounded-[10px] border border-solid border-[color:var(--border-strong)] px-[18px] text-[14px] font-medium text-[color:var(--fg)]"
      >
        {cardSearchCopy.tryAgain}
      </button>
    </div>
  );
}

function Rows({
  from,
  matchQuery,
  active,
  returned,
  listboxId,
  onPick,
}: SearchLayerProps & { from: CardSearchRow[]; matchQuery: string }) {
  return (
    <div role="listbox" id={listboxId} aria-label={cardSearchCopy.label}>
      {from.map((row, i) => (
        <SearchRow
          key={row.oracleId}
          row={row}
          query={matchQuery}
          id={`${listboxId}-${i}`}
          first={i === 0}
          active={i === active}
          returned={row.oracleId === returned}
          onPick={() => onPick(from, i)}
        />
      ))}
    </div>
  );
}

/** S1: graphic A (the brand fan with the lens), the title and the line. No card art anywhere in it. */
function Empty() {
  const card = "absolute top-[14px] h-[100px] w-[70px] rounded-[8px] border-[1.5px] border-solid shadow-[0_10px_24px_rgba(0,0,0,0.5)]";
  return (
    <div className="flex flex-col items-center gap-[10px] px-7 pt-11 text-center">
      <div className="relative h-[150px] w-[200px]" role="img" aria-hidden="true">
        <span className={`${card} left-[31px] rotate-[-18deg] border-[color:var(--border-strong)] bg-[color:var(--elevated)]`} />
        <span className={`${card} left-[65px] border-[color:var(--border-dashed)] bg-[color:var(--surface-raised)]`} />
        <span
          className={`${card} left-[99px] flex rotate-[18deg] items-center justify-center border-[color:var(--accent)] font-display text-[26px] font-bold text-[color:var(--accent)]`}
          style={{ background: "color-mix(in srgb, var(--accent) 14%, var(--surface))" }}
        >
          99
        </span>
        <span
          className="absolute top-[66px] left-[116px] h-14 w-14 rounded-full border-[3px] border-solid border-[color:var(--accent)] shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_10px_24px_rgba(0,0,0,0.45)]"
          style={{ background: "color-mix(in srgb, var(--bg) 35%, transparent)" }}
        />
        <span className="absolute top-[115px] left-[164px] h-[5px] w-[30px] origin-left rotate-45 rounded-[3px] bg-[color:var(--accent)]" />
      </div>
      <p className="font-display text-[19px] font-bold text-[color:var(--fg)]">{cardSearchCopy.empty.title}</p>
      <p className="max-w-[300px] text-[14.5px] leading-[1.6] text-pretty text-[color:var(--fg-muted)]">{cardSearchCopy.empty.body}</p>
    </div>
  );
}
