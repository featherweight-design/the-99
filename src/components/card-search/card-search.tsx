"use client";
// Card search, the shell's half (handoff `design_handoff_the99_card_search/`, R2; plan `2026-10-16-card-search.md`,
// PR C). Mounted by the shell beside every page while `CARD_SEARCH_ENABLED` is on for the reader, and absent
// otherwise. It owns what has to be there before anything is pressed: the sheet's frame and its field (so the field
// can take focus inside the icon's own tap, which is what raises the iOS keyboard in the same gesture, resolution
// 5), the query and its reads, recent cards, the polite live region, and the history handover to card details.
//
// What draws the results (the rows, the empty and failed states) and the card details provider the results open
// into load as one chunk on the reader's first intent (`SearchLayer`), so a page nobody searches from ships neither
// card details nor the copy those states reuse. Until it lands the field types and the bar runs.

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type RefObject,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { searchAllCardsAction, cardSignalsAction } from "../../app/card-search-actions";
import { clearRecent, pushRecent, readRecent, type RecentCard } from "../../lib/card-search/recent";
import type { CardSearchRow, CardSignals } from "../../lib/card-search/search";
import { afterDialogsReleased, useBackDismiss, useScrollLock, visibleFocusables } from "../../lib/a11y/dialog";
import { cardSearchCopy } from "../../lib/copy/card-search";
import { SearchField } from "../ui/text-field";
import { useOnlineStatus } from "../../lib/pwa/use-online-status";
import type { SiblingCard } from "../cards/card-detail-provider";
import type { OpenCard, SearchLayerProps } from "./search-layer";

/** A read starts this long after the last key, and only from this many characters (S3). */
export const SEARCH_DEBOUNCE_MS = 150;
export const SEARCH_MIN_CHARS = 2;

const loadLayer = () => import("./search-layer");
const SearchLayer = dynamic<SearchLayerProps>(() => loadLayer().then((m) => m.SearchLayer), { ssr: false });

const LISTBOX_ID = "card-search-list";

export type SearchPhase = "idle" | "searching" | "results" | "failed";

type CardSearchContextValue = {
  /** Opens the search with the field focused, inside the caller's own press (the iOS keyboard needs that). */
  openSearch: (opener: HTMLElement | null) => void;
  /** Starts the results' code downloading: a pointer or focus resting on the control is intent. */
  warmSearch: () => void;
  /** Closes the search; focus goes back to whatever opened it. */
  closeSearch: () => void;
  isOpen: boolean;
  /** The field's text as typed, and its setter (which also drops the return ring and a stale failure). */
  query: string;
  setQuery: (next: string) => void;
  phase: SearchPhase;
  /** The query is long enough to read (`SEARCH_MIN_CHARS`). */
  searching: boolean;
  online: boolean;
  /** What ↑ ↓ and ↵ move through: the results while searching, else the recent cards; nothing offline. */
  list: readonly CardSearchRow[];
  /** The keyboard's place in `list`, or -1. Option ids are `${listboxId}-${index}`. */
  active: number;
  /** A read is in flight, or its rows' code is: the 2px bar (S3). */
  busy: boolean;
  listboxId: string;
  /** The field. Exactly one frame is mounted, and its input takes this ref. */
  inputRef: RefObject<HTMLInputElement | null>;
  /** The element the results are drawn into; the mounted frame hands it over. */
  placeBody: (el: HTMLDivElement | null) => void;
  /** The field's keys: ↑ ↓ move, ↵ opens. */
  onFieldKey: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** Escape: clears a query first, then closes. */
  escape: () => void;
  onClear: () => void;
  pick: (from: readonly CardSearchRow[], index: number) => void;
  retry: () => void;
};

const CardSearchContext = createContext<CardSearchContextValue | null>(null);

/** The search, or null where the shell mounted none (the switch off, or signed out). */
export function useCardSearch(): CardSearchContextValue | null {
  return useContext(CardSearchContext);
}

const NO_SIGNALS: CardSignals = { owned: 0, decks: [], wishlist: false };

export function CardSearchRoot({ userId, children }: { userId: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [layerWanted, setLayerWanted] = useState(false);
  const [layerReady, setLayerReady] = useState(false);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [rows, setRows] = useState<CardSearchRow[]>([]);
  const [rowsFor, setRowsFor] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [recents, setRecents] = useState<RecentCard[]>([]);
  const [recentSignals, setRecentSignals] = useState<Record<string, CardSignals> | null>(null);
  const [active, setActive] = useState(-1);
  const [returned, setReturned] = useState<string | null>(null);
  const [handover, setHandover] = useState<{ oracleId: string; siblings: SiblingCard[]; art: string | null; opener: HTMLElement | null } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const online = useOnlineStatus();
  const desktop = useDesktop();
  const pathname = usePathname();

  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const openCardRef = useRef<OpenCard | null>(null);
  const savedScroll = useRef(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const placeBody = useCallback((el: HTMLDivElement | null) => {
    bodyRef.current = el;
    setBodyEl(el);
  }, []);
  const seq = useRef(0);

  const trimmed = query.trim();
  const searching = trimmed.length >= SEARCH_MIN_CHARS;

  const warmSearch = useCallback(() => {
    setLayerWanted(true);
    void loadLayer();
  }, []);

  const openSearch = useCallback(
    (opener: HTMLElement | null) => {
      openerRef.current = opener;
      setReturned(null);
      setLayerWanted(true);
      // Drawn in this press, then focused in it: a focus after an await or an effect leaves the keyboard down on iOS.
      flushSync(() => setOpen(true));
      inputRef.current?.focus();
      setRecents(readRecent(userId));
      setRecentSignals(null);
    },
    [userId],
  );

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
    openerRef.current?.focus();
  }, []);

  useScrollLock(open);
  // One history entry while the sheet is up, so Back closes it in one press (resolution 3).
  useBackDismiss(open, close);

  // The recents' signals, read fresh on each open (README call 5). Offline the list is hidden, so nothing is asked.
  useEffect(() => {
    if (!open || !online || recentSignals !== null) return;
    if (recents.length === 0) return;
    let live = true;
    cardSignalsAction(recents.map((r) => r.oracleId))
      .then((s) => live && setRecentSignals(s))
      .catch(() => live && setRecentSignals({}));
    return () => {
      live = false;
    };
  }, [open, online, recents, recentSignals]);

  // The read: 150ms after the last key, from two characters, never offline (S7 re-runs it on `online`).
  useEffect(() => {
    if (!searching) {
      // Abandons a read still in flight; what is drawn follows `searching`, not the phase.
      seq.current += 1;
      return;
    }
    if (!online) return;
    const n = ++seq.current;
    const timer = window.setTimeout(() => {
      setPhase("searching");
      searchAllCardsAction(trimmed)
        .then((found) => {
          if (n !== seq.current) return;
          setRows(found);
          setRowsFor(trimmed);
          setActive(-1);
          setPhase("results");
        })
        .catch(() => {
          if (n !== seq.current) return;
          setPhase("failed");
          // S6 is drawn with the keyboard down, Try again in reach.
          inputRef.current?.blur();
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [trimmed, searching, online, attempt]);

  const recentRows = useMemo<CardSearchRow[]>(
    () => (recentSignals === null ? [] : recents.map((r) => ({ ...r, ...(recentSignals[r.oracleId] ?? NO_SIGNALS) }))),
    [recents, recentSignals],
  );
  // What ↑ ↓ and ↵ move through: the results while searching, else the recent cards; nothing offline.
  const list = !online ? [] : searching ? (phase === "failed" ? [] : rows) : recentRows;

  const pick = useCallback(
    (from: readonly CardSearchRow[], index: number) => {
      const card = from[index];
      if (!card) return;
      setRecents(pushRecent(userId, card));
      savedScroll.current = bodyRef.current?.scrollTop ?? 0;
      setReturned(card.oracleId);
      setActive(-1);
      setHandover({
        oracleId: card.oracleId,
        siblings: from.map((r) => ({ oracleId: r.oracleId, name: r.name, imageUri: r.imageUri })),
        art: card.imageUri,
        // The row is the card's opener, so the card's own close puts focus back on it (H3).
        opener: bodyRef.current?.querySelector<HTMLElement>(`[data-card-search-row="${CSS.escape(card.oracleId)}"]`) ?? null,
      });
      setOpen(false);
    },
    [userId],
  );

  // The handover: the card opens only once the search's own entry has left the history, so it pushes its own in
  // the search's place and never stands on top of it (resolution 3).
  useEffect(() => {
    if (!handover) return;
    return afterDialogsReleased(() => {
      openCardRef.current?.(handover.oracleId, handover.siblings, handover.art, handover.opener);
      setHandover(null);
    });
  }, [handover]);

  // The reader closed the card: the search comes back as it was, the keyboard down and the field unfocused, with
  // the ring on the row that opened it (H3).
  const onCardDismissed = useCallback(() => {
    setOpen(true);
  }, []);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!open || returned === null || !body) return;
    body.scrollTop = savedScroll.current;
    body.querySelector<HTMLElement>(`[data-card-search-row="${CSS.escape(returned)}"]`)?.focus({ preventScroll: true });
  }, [open, returned]);

  // A navigation takes the sheet with it; the card it opened is closed by the layer (never as a dismissal).
  // Turned past md with the sheet up (a phone rotated to landscape), the phone frame is not drawn, so the search
  // closes rather than hold the page's scroll and a Back entry under nothing.
  const [wasDesktop, setWasDesktop] = useState(desktop);
  if (wasDesktop !== desktop) {
    setWasDesktop(desktop);
    if (desktop) setOpen(false);
  }
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setOpen(false);
  }

  const onClear = useCallback(() => {
    clearRecent(userId);
    setRecents([]);
    inputRef.current?.focus();
  }, [userId]);

  const onFieldKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (list.length === 0) return;
        e.preventDefault();
        setActive((i) => (e.key === "ArrowDown" ? (i + 1) % list.length : i <= 0 ? list.length - 1 : i - 1));
      } else if (e.key === "Enter" && active >= 0) {
        e.preventDefault();
        pick(list, active);
      }
    },
    [list, active, pick],
  );

  // Escape clears a query first, then closes (README call 7).
  const escape = useCallback(() => {
    if (query.length > 0) {
      setQuery("");
      inputRef.current?.focus();
    } else close();
  }, [query, close]);

  const changeQuery = useCallback((next: string) => {
    setQuery(next);
    setReturned(null);
    // A new query is a new attempt: the failure belonged to the last one.
    setPhase((p) => (p === "failed" ? "idle" : p));
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const busy = open && searching && online && (phase === "searching" || !layerReady);

  const value = useMemo<CardSearchContextValue>(
    () => ({
      openSearch,
      warmSearch,
      closeSearch: close,
      isOpen: open,
      query,
      setQuery: changeQuery,
      phase,
      searching,
      online,
      list,
      active,
      busy,
      listboxId: LISTBOX_ID,
      inputRef,
      placeBody,
      onFieldKey,
      escape,
      onClear,
      pick,
      retry,
    }),
    [openSearch, warmSearch, close, open, query, changeQuery, phase, searching, online, list, active, busy, placeBody, onFieldKey, escape, onClear, pick, retry],
  );

  const layerProps: SearchLayerProps = {
    bodyEl,
    query: trimmed,
    searching,
    phase,
    rows,
    rowsFor,
    recentRows,
    recentsHeld: recents.length > 0,
    online,
    active,
    returned,
    listboxId: LISTBOX_ID,
    onPick: pick,
    onClear,
    onRetry: retry,
    onAnnounce: setAnnouncement,
    onCardDismissed,
    openCardRef,
    onReady: () => setLayerReady(true),
  };

  return (
    <CardSearchContext.Provider value={value}>
      {children}
      {/* The phone's sheet. At md and up the desktop draws its own field from the same context (PR D), handing it
          `inputRef` and `placeBody`; one frame is mounted at a time, so the results have one host. */}
      {desktop ? null : <PhoneFrame />}
      {/* Always mounted, so the first announcement is heard (README call 7). */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {layerWanted ? <SearchLayer {...layerProps} /> : null}
    </CardSearchContext.Provider>
  );
}

/** The phone's full-screen sheet (S1 to S7's frame): the field row, the bar, and the host the results draw into. */
function PhoneFrame() {
  const { isOpen, query, setQuery, list, active, listboxId, onFieldKey, closeSearch, busy, placeBody, escape, inputRef } =
    useContext(CardSearchContext)!;
  const sheetRef = useRef<HTMLDivElement>(null);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      escape();
      return;
    }
    if (e.key !== "Tab" || !sheetRef.current) return;
    // A modal: Tab wraps inside it rather than walking into the page underneath.
    const focusables = visibleFocusables(sheetRef.current);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-search-heading"
      hidden={!isOpen}
      onKeyDown={onKey}
      className="fixed inset-0 z-40 flex flex-col bg-[color:var(--bg)] md:hidden"
    >
      <h2 id="card-search-heading" className="sr-only">
        {cardSearchCopy.label}
      </h2>
      <div className="flex items-center gap-[6px] border-b border-b-[color:var(--border)] py-3 pr-2 pl-[14px] pt-[14px]">
        {/* The app's one search field (\`SearchField\`): its ✕, its focus on the box, WebKit's own ✕ hidden. */}
        <SearchField
          ref={inputRef}
          containerClassName="h-11 min-w-0 flex-1 rounded-[10px] border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] pr-[6px] pl-[13px]"
          className="text-[16px] whitespace-nowrap"
          leading={
            <span className="flex-none text-[color:var(--fg-muted)]">
              <SearchGlyph size={18} />
            </span>
          }
          role="combobox"
          aria-expanded={list.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listboxId}-${active}` : undefined}
          aria-label={cardSearchCopy.label}
          placeholder={cardSearchCopy.label}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onFieldKey}
          onClear={() => setQuery("")}
        />
        <button
          type="button"
          aria-label={cardSearchCopy.closeAria}
          onClick={closeSearch}
          className="flex h-11 w-11 flex-none items-center justify-center text-[16px] text-[color:var(--fg-muted)]"
        >
          ✕
        </button>
      </div>
      {busy ? <SearchProgress /> : null}
      <div
        ref={placeBody}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
        // Dragging the list lowers the keyboard (S4b): the field gives up focus, the query stays.
        onTouchMove={() => {
          if (document.activeElement === inputRef.current) inputRef.current?.blur();
        }}
      />
    </div>
  );
}

/** The 2px bar while a read is in flight (S3), for either frame. */
export function SearchProgress() {
  return (
    <div className="h-[2px] overflow-hidden bg-[color:var(--border)]" aria-hidden>
      <div className="anim-search-progress h-full w-[38%] bg-[color:var(--accent)]" />
    </div>
  );
}

const DESKTOP_QUERY = "(min-width: 768px)";
function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia?.(DESKTOP_QUERY);
  mq?.addEventListener("change", onChange);
  return () => mq?.removeEventListener("change", onChange);
}
/** Whether the desktop's frame is the one drawn (`md`). The server, and the first render, say no. */
function useDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia?.(DESKTOP_QUERY).matches ?? false,
    () => false,
  );
}

export function SearchGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <circle cx="8.6" cy="8.6" r="5.6" />
      <path d="M12.8 12.8 17 17" />
    </svg>
  );
}

/** The phone header's icon, left of the account button (HP1); `--fg` on `--elevated` while the sheet is up (DP4). */
export function CardSearchIcon() {
  const search = useCardSearch();
  if (!search) return null;
  return (
    <button
      type="button"
      aria-label={cardSearchCopy.label}
      aria-haspopup="dialog"
      aria-expanded={search.isOpen}
      onPointerDown={search.warmSearch}
      onFocus={search.warmSearch}
      onClick={(e) => search.openSearch(e.currentTarget)}
      className={`mr-[2px] flex h-11 w-11 flex-none items-center justify-center rounded-[12px] ${
        search.isOpen ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"
      }`}
    >
      <SearchGlyph size={20} />
    </button>
  );
}
