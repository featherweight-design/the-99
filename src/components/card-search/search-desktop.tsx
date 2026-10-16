"use client";
// Card search on the desktop (handoff R2, `R2 - Rail-Desktop.dc.html` D1 to D8; plan `2026-10-16-card-search.md`,
// PR D). The shell's half (`CardSearchRoot`) owns the query, the reads, recent cards and the handover; at md and up it
// draws nothing, and this is the frame it hands its `inputRef` and `placeBody` to: a 540px field opening 12px out from
// the rail, with the results in a dropdown under it, the page still visible and live beside it. Not modal: Tab leaves
// it, nothing is locked, and a press outside closes it.
//
// Mounted by the rail (`NavRail`), which is the one place that is already at md and up; the media query still gates it,
// so below md exactly one frame (the phone's) is mounted and the results have one host.

import { useEffect, useRef, useSyncExternalStore } from "react";
import { dialogIsUp, isMacPlatform, isSearchShortcut } from "../../lib/card-search/shortcut";
import { cardSearchCopy } from "../../lib/copy/card-search";
import { useMinWidth } from "../ui/use-min-width";
import { SearchField } from "../ui/text-field";
import { SearchGlyph, SearchProgress, useCardSearch } from "./card-search";

const noSubscribe = () => () => {};
/** Whether this device takes ⌘ (read after hydration, so the server's render and the first paint agree). */
function useIsMac(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => isMacPlatform(navigator as Navigator & { userAgentData?: { platform?: string } }),
    () => false,
  );
}

/** The shortcut as the rail's name tag and `aria-keyshortcuts` spell it, for this platform. */
export function useSearchShortcutLabel(): { label: string; keys: string } {
  return useIsMac()
    ? { label: cardSearchCopy.shortcutMac, keys: "Meta+K" }
    : { label: cardSearchCopy.shortcutOther, keys: "Control+K" };
}

/** The desktop's field and dropdown, and ⌘K / Ctrl+K. Nothing where the shell mounted no search, or below md. */
export function SearchDesktop() {
  const search = useCardSearch();
  const desktop = useMinWidth("(min-width: 768px)");
  if (!search || !desktop) return null;
  return <DesktopFrame />;
}

function DesktopFrame() {
  const { isOpen, query, setQuery, list, active, listboxId, onFieldKey, closeSearch, busy, placeBody, escape, inputRef, openSearch, warmSearch, searching } =
    useCardSearch()!;
  const frameRef = useRef<HTMLDivElement>(null);
  const shortcut = useSearchShortcutLabel();

  // Escape, from the field or from a row the card's return left focus on. A native listener, because the results
  // are portalled into the body host and a React handler on this frame would never see a key pressed in them.
  const escapeRef = useRef(escape);
  useEffect(() => {
    escapeRef.current = escape;
  }, [escape]);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing) return;
      e.preventDefault();
      escapeRef.current();
    };
    frame.addEventListener("keydown", onKey);
    return () => frame.removeEventListener("keydown", onKey);
  }, []);

  // ⌘K on a Mac, Ctrl+K elsewhere, from anywhere including a page field (README call 7). A second press from inside the
  // open field refocuses it. Never while a dialog other than this one is up: it is modal and the page is inert.
  const mac = shortcut.keys === "Meta+K";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isSearchShortcut(e, mac)) return;
      if (!isOpen && dialogIsUp(document, frameRef.current)) return;
      e.preventDefault();
      if (isOpen) {
        // Already open: refocus the field, and leave the opener (where focus returns on close) as it was.
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      warmSearch();
      openSearch(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mac, isOpen, openSearch, warmSearch, inputRef]);

  // The foot line is D4's alone: results are up (D2, D2n and DD2 draw none).
  const showFoot = searching && list.length > 0;

  return (
    <>
      {/* The page stays visible and live; a press outside the dropdown closes the search. */}
      {isOpen ? <div aria-hidden className="fixed inset-0 z-[39]" onPointerDown={closeSearch} /> : null}
      <div
        ref={frameRef}
        role="dialog"
        aria-labelledby="card-search-heading-desktop"
        hidden={!isOpen}
        data-card-search-frame="desktop"
        // Its top is the slot's (73px under the mark: 14 + 39 + 20; the touch rail's are 69 and 61), 12px out from the rail.
        className="fixed top-[73px] left-[calc(var(--rail-w)+12px)] z-40 flex w-[540px] flex-col gap-2 touch:top-[69px] touch-short:top-[61px]"
      >
        <h2 id="card-search-heading-desktop" className="sr-only">
          {cardSearchCopy.label}
        </h2>
        {/* The caret back to the rail's slot, as the lock note draws it. */}
        <span
          aria-hidden
          className="absolute top-[18px] -left-[6px] z-10 h-[10px] w-[10px] rotate-45 border-b border-l border-solid border-[color:var(--accent)] bg-[color:var(--bg)]"
        />
        <div className="rounded-[10px] border border-solid border-[color:var(--accent)] bg-[color:var(--bg)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          <SearchField
            ref={inputRef}
            containerClassName="h-[46px] min-w-0 gap-3 rounded-none border-0 bg-transparent pr-[10px] pl-4 focus-within:shadow-none"
            className="text-[15px] whitespace-nowrap"
            leading={
              <span className="flex-none text-[color:var(--fg-muted)]">
                <SearchGlyph size={18} />
              </span>
            }
            trailing={
              query === "" ? (
                <kbd
                  aria-hidden
                  className="flex-none rounded-[5px] border border-solid border-[color:var(--border-strong)] px-[6px] py-[2px] font-mono text-[10.5px] font-medium text-[color:var(--fg-faint)]"
                >
                  {shortcut.label}
                </kbd>
              ) : null
            }
            role="combobox"
            aria-expanded={list.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listboxId}-${active}` : undefined}
            aria-keyshortcuts={shortcut.keys}
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
        </div>
        {/* The dropdown: its own box under the field, the Wishlist panel's look (`.dres`). */}
        <div className="flex max-h-[min(560px,calc(100dvh-170px))] flex-col overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] py-[6px] shadow-[0_22px_50px_rgba(0,0,0,0.6)]">
          {busy ? (
            <div className="mb-1 flex-none">
              <SearchProgress />
            </div>
          ) : null}
          <div ref={placeBody} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" />
          {showFoot ? (
            <p className="flex flex-none items-center justify-between gap-3 border-t border-solid border-[color:var(--border)] px-[14px] pt-[9px] pb-[5px] font-mono text-[11px] text-[color:var(--fg-faint)]">
              <span>{cardSearchCopy.keysHint}</span>
              <span>{cardSearchCopy.shortcutFoot(shortcut.label)}</span>
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
