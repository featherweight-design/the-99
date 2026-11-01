"use client";
// Card search, the half that loads on first intent (see `card-search.tsx`): the card details provider the results
// open into, and everything drawn in the sheet's body (S1 to S7, property table
// `docs/superpowers/design-tables/card-search-phone.md`). The body is portalled into the sheet the shell keeps
// mounted; the provider stays up while the sheet is closed, because that is when its card is showing.
//
// The provider is the search's own (resolution 2): a sibling of any page's provider, with no deck and no sheet
// under it, so a card opened from search is a first layer and keeps Find a deck, on the deck page too.

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import type { CardSearchRow } from "../../lib/card-search/search";
import { cardSearchCopy } from "../../lib/copy/card-search";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { CardDetailProvider, useCardDetail, type SiblingCard } from "../cards/card-detail-provider";
import type { SearchPhase } from "./card-search";
import { SearchRow } from "./search-row";

/** Collection › Wishlist: the one route whose tiles a wishlist write moves. */
const WISHLIST_PATH = "/collection/wishlist";

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
  /** The card the search opened is drawn. */
  onCardShown: () => void;
  /** The recent cards' signals could not be read. */
  recentsFailed: boolean;
  /** The sheet is up; nothing is announced while it is not. */
  open: boolean;
  openCardRef: MutableRefObject<OpenCard | null>;
  /**
   * Add several cards (add a card from anywhere C2, C-D1): opens the shell's Add cards sheet empty. Null where the
   * shell mounted no sheet host, and then the row is not drawn.
   */
  onAddSeveral?: (() => void) | null;
};

export function SearchLayer(props: SearchLayerProps) {
  // A fresh provider for each route: a navigation drops a read still in flight and any card or sheet stacked over
  // the search's card, all of which would otherwise outlive the page that opened them (the shell outlives every page).
  const pathname = usePathname();
  const router = useRouter();
  // A wishlist write made in a card opened from here: the tiles behind are the server's, and the write's own deferred
  // revalidation never reaches the page that is showing, so on the Wishlist tab the page is asked for again (as that
  // tab's own provider does).
  const onWishlistWrite = useCallback(() => {
    if (pathname === WISHLIST_PATH) router.refresh();
  }, [pathname, router]);
  return (
    <CardDetailProvider key={pathname} onDismiss={props.onCardDismissed} onWishlistWrite={onWishlistWrite}>
      <Bridge openCardRef={props.openCardRef} onCardFailed={props.onCardFailed} onCardShown={props.onCardShown} />
      {props.bodyEl ? createPortal(<SearchBody {...props} />, props.bodyEl) : null}
    </CardDetailProvider>
  );
}

/** Hands the provider's `open` to the shell's half, and closes the card on a navigation, never as a dismissal. */
function Bridge({
  openCardRef,
  onCardFailed,
  onCardShown,
}: {
  openCardRef: MutableRefObject<OpenCard | null>;
  onCardFailed: () => void;
  onCardShown: () => void;
}) {
  const { open, pendingOracleId, openOracleId } = useCardDetail();
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
    // The card's data arrives before its dialog does (the modal's code may still be loading, and the provider keeps the
    // card pending until it is drawn), so the veil lifts only once nothing is pending for it.
    if (openOracleId === a.id && pendingOracleId === null) {
      asked.current = null;
      onCardShown();
    } else if (pendingOracleId === a.id) a.pending = true;
    else if (a.pending && pendingOracleId === null) {
      asked.current = null;
      onCardFailed();
    }
  }, [pendingOracleId, openOracleId, onCardFailed, onCardShown]);
  return null;
}

const META =
  "px-4 pt-3 pb-1 font-mono text-[11.5px] text-[color:var(--fg-faint)] md:px-[14px] md:pt-2 md:pb-[6px] md:text-[10.5px] md:tracking-[0.14em] md:uppercase";
const BOX = "mx-4 mt-[18px] flex flex-col gap-2 rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] p-[18px] md:mx-0 md:mt-0 md:gap-[6px] md:rounded-none md:border-0 md:bg-transparent md:px-4 md:pt-[14px] md:pb-3";
// Phone widths, then the desktop's (D3): each row's two lines.
const SKELETON_WIDTHS: ReadonlyArray<readonly [string, string, string, string]> = [
  ["62%", "40%", "52%", "30%"],
  ["48%", "30%", "40%", "24%"],
  ["70%", "44%", "60%", "34%"],
];

function SearchBody(p: SearchLayerProps) {
  const stale = p.rowsFor !== p.query;
  const settled = p.open && p.searching && p.online && !stale && p.phase === "results";
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
    // Above Recent cards, and above the empty state when there are none (C2, C-D1). The search is open but nothing is
    // typed: once a query is, the results stand alone (C3, C-D2's dropdown).
    const way = p.onAddSeveral ? <AddSeveralRow onPress={p.onAddSeveral} /> : null;
    if (!p.recentsHeld) return <>{way}<Empty /></>;
    if (p.recentsFailed) return <>{way}<Failed onRetry={p.onRetry} /></>;
    if (p.recentRows.length === 0) return way;
    return (
      <>
        {way}
        <div className="flex items-center justify-between px-4 pt-[14px] pb-[6px] md:px-[14px] md:pt-2">
          <h3 className="font-mono text-[10.5px] font-medium tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
            {cardSearchCopy.recent.heading}
          </h3>
          <button
            type="button"
            onClick={p.onClear}
            className="min-h-9 text-[13.5px] font-medium md:min-h-0 md:text-[13px] text-[color:var(--accent-text)] underline underline-offset-[3px]"
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
        {SKELETON_WIDTHS.map(([a, b, da, db], i) => (
          <div
            key={i}
            aria-hidden
            className={`flex h-[72px] items-center gap-3 px-4 md:h-[58px] md:px-[14px] ${i === 0 ? "" : "border-t border-solid border-[color:var(--border)]"}`}
          >
            <span className="h-14 w-10 flex-none rounded-[4px] bg-[color:var(--surface-raised)] md:h-[42px] md:w-[30px] md:bg-[color:var(--elevated)]" />
            <span className="flex flex-1 flex-col gap-[9px]">
              <span className="h-[10px] w-[var(--w)] rounded-[5px] bg-[color:var(--surface-raised)] md:w-[var(--wd)] md:bg-[color:var(--elevated)]" style={{ "--w": a, "--wd": da } as React.CSSProperties} />
              <span className="h-[10px] w-[var(--w)] rounded-[5px] bg-[color:var(--surface-raised)] md:w-[var(--wd)] md:bg-[color:var(--elevated)]" style={{ "--w": b, "--wd": db } as React.CSSProperties} />
            </span>
          </div>
        ))}
      </>
    );
  }

  if (p.rows.length === 0) {
    return (
      <div className={BOX}>
        <p className="text-[15.5px] font-semibold text-[color:var(--fg)] md:text-[14.5px]">{collectionEditCopy.add.noResultsTitle(p.query)}</p>
        <p className="text-[14px] leading-[1.6] text-[color:var(--fg-muted)] md:text-[13.5px] md:leading-[1.55]">{collectionEditCopy.add.noResultsBody}</p>
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

/**
 * Add several cards: the Add cards sheet's own way-row shape (its "Have a file?" row), 52px on the phone and 44px in
 * the desktop dropdown. Its `+`, the lead, the aside in `--fg-faint`, and the chevron.
 */
function AddSeveralRow({ onPress }: { onPress: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      data-card-search-add-several=""
      onClick={onPress}
      className="mx-4 mt-3 mb-[2px] flex min-h-[52px] w-[calc(100%-32px)] cursor-pointer items-center gap-3 rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--bg)] px-[14px] text-left text-[14px] text-[color:var(--fg)] md:mx-[14px] md:mt-[6px] md:mb-1 md:min-h-[44px] md:w-[calc(100%-28px)] md:gap-[10px] md:rounded-[9px] md:px-3 md:text-[13.5px]"
    >
      <span aria-hidden className="flex flex-none text-[color:var(--accent-text)]">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3.6v12.8M3.6 10h12.8" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        {cardSearchCopy.addSeveral.lead}{" "}
        <span className="text-[color:var(--fg-faint)]">
          <span aria-hidden>{"· "}</span>
          {cardSearchCopy.addSeveral.aside}
        </span>
      </span>
      <span aria-hidden className="flex-none text-[color:var(--fg-faint)]">
        {"›"}
      </span>
    </button>
  );
}

/** S6: Add cards' failure sentence and Try again, as an alert. */
function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={BOX} role="alert">
      <p className="text-[14px] leading-[1.6] text-[color:var(--fg-body)] md:text-[13.5px] md:leading-[1.55]">{collectionEditCopy.add.searchFailed}</p>
      <button
        type="button"
        onClick={onRetry}
        data-card-search-retry
        className="mt-[6px] h-11 self-start rounded-[10px] border border-solid border-[color:var(--border-strong)] px-[18px] text-[14px] font-medium text-[color:var(--fg)] md:h-[34px] md:rounded-[8px] md:px-[14px] md:text-[13px]"
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
          // A row focus came back to (H3) keeps the list's keys: ↑ ↓ move between rows, ↵ and Space open.
          onKey={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPick(from, i);
            } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const options = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="option"]');
              if (!options || options.length === 0) return;
              const next = e.key === "ArrowDown" ? (i + 1) % options.length : (i - 1 + options.length) % options.length;
              options[next]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}

/** S1: graphic A (the brand fan with the lens), the title and the line. No card art anywhere in it. */
function Empty() {
  const card = "absolute top-[14px] h-[100px] w-[70px] rounded-[8px] border-[1.5px] border-solid shadow-[0_10px_24px_rgba(0,0,0,0.5)]";
  return (
    <div className="flex flex-col items-center gap-[10px] px-7 pt-11 text-center md:flex-row md:gap-[18px] md:px-[18px] md:py-[14px] md:text-left">
      {/* At 62% beside the sentence in the desktop dropdown (D2n); the box is sized to the scaled graphic. */}
      <div className="md:h-[93px] md:w-[124px] md:flex-none">
      <div className="relative h-[150px] w-[200px] md:origin-top-left md:scale-[0.62]" role="img" aria-hidden="true">
        <span className={`${card} left-[31px] rotate-[-18deg] border-[color:var(--border-strong)] bg-[color:var(--elevated)]`} />
        <span className={`${card} left-[65px] border-[color:var(--border-dashed)] bg-[color:var(--surface-raised)]`} />
        <span
          className={`${card} left-[99px] flex rotate-[18deg] items-center justify-center border-[color:var(--accent)] font-display text-[26px] font-bold text-[color:var(--accent-text)]`}
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
      </div>
      <div className="flex flex-col items-center gap-[10px] md:items-start md:gap-[6px]">
        <p className="font-display text-[19px] font-bold text-[color:var(--fg)] md:font-sans md:text-[14.5px] md:font-semibold">{cardSearchCopy.empty.title}</p>
        <p className="max-w-[300px] text-[14.5px] leading-[1.6] text-pretty text-[color:var(--fg-muted)] md:text-[13.5px] md:leading-[1.55]">{cardSearchCopy.empty.body}</p>
      </div>
    </div>
  );
}
