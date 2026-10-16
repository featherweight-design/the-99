"use client";

import { CardSearchIcon, SearchGlyph, useCardSearch } from "../card-search/card-search";
import { SearchDesktop, useSearchShortcutLabel } from "../card-search/search-desktop";
import { cardSearchCopy } from "../../lib/copy/card-search";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import type { QuickReturnMode } from "../../lib/ui/quick-return";
import { useQuickReturn } from "./use-quick-return";
import { AccountMenu } from "./account-menu";
import { NavIcon, type NavHref } from "./nav-icons";
import { Lock } from "../ui/lock";
import { PendingPip } from "./pending-pip";
import { useRailTag } from "./rail-tag";
import { useAboutSheetUp } from "./about-sheet-presence";
import { usePendingPush } from "./pending-push";
import { OfflinePill } from "../pwa/offline-pill";
import { InstallSlot } from "../pwa/install-slot";
import { Crowned99 } from "../marks";
import { refreshCopy } from "../../lib/copy/refresh";
import { nameList } from "../../lib/copy/deck-analysis";
import type { ThemeKey } from "../../lib/theme/themes";
import { reveal } from "../../lib/ui/reveal";
import { momentsCopy } from "../../lib/copy/moments";
import { useMomentAnchor } from "../moments/moments-provider";

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

type NavItem = {
  href: NavHref;
  label: string;
  lockable: boolean; // Home is never locked; every other destination is.
};

// Adjudication #1 (no <Mark> icons in rail nav items — Diamond + label ONLY) was
// RETIRED by the 2026-09-07 refresh, on client instruction. The reason it
// existed still holds where it was made: the Mark inside a nav row was a second
// logo. A 19px stroke glyph is not the Mark, and at 62px the rail has no room
// for labels — so the labels moved into aria-label + title instead of coming
// out. See design/design_handoff_the99_refresh/CHROME-rail-and-tabs.md.
// If the ruling is ever reinstated, the rail widens to hold labels and the
// icons come out. A 62px rail with labels is not a third option.
//
// Discover sits after Commanders and before Decks: owned before unowned, so the
// two commander lanes read as one shelf, and Decks stays last because it is the
// destination the app is for. It locks with the rest — a lane of 3,301
// commanders you cannot yet score against is a catalogue, not a tool.
const ITEMS: NavItem[] = [
  { href: "/",           label: "Home",       lockable: false },
  { href: "/collection", label: "Collection", lockable: true  },
  { href: "/commanders", label: "Commanders", lockable: true  },
  { href: "/discover",   label: "Discover",   lockable: true  },
  { href: "/decks",      label: "Decks",      lockable: true  },
];

/** The live slots: every item, or while locked those the lock does not hold (Home, and Collection when open). */
function liveItems(locked: boolean, openLock: OpenLock): NavItem[] {
  if (!locked) return ITEMS;
  const held = new Set(lockedItems(openLock).map((i) => i.href));
  return ITEMS.filter((i) => !held.has(i.href));
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const LOCKABLE = ITEMS.filter((i) => i.lockable);

/**
 * The lock at zero cards with NO_COLLECTION_ENTRY_ENABLED (no-collection entry, call 6), or null for the shipped
 * four-slot lock. Collection opens, because its empty state is where a player who starts empty starts; Commanders,
 * Discover and Decks wait for a card. `hasDecks` says whether this is first run (no decks: the note's button is
 * `Go to step 1`) or not (`Add your cards`, and the note says where the decks are).
 */
export type OpenLock = { hasDecks: boolean } | null;

/** The slots the lock holds: all four as shipped, or the three after Collection with the lock open. */
function lockedItems(openLock: OpenLock): NavItem[] {
  return openLock ? LOCKABLE.filter((i) => i.href !== "/collection") : LOCKABLE;
}

// ---------------------------------------------------------------------------
// The lock — first-run locked nav
// Design table: docs/superpowers/design-tables/first-run-locked-nav.md
// ---------------------------------------------------------------------------

const lockCopy = refreshCopy.firstRun.lock;

// Where the desktop note's caret sits: a 10px square at top 28 of the note's
// padding box, which starts inside its 1px border, so the caret's centre is 34px
// below the note's outer top edge (3.9, 3.10). The note is placed against the
// slot's measured centre, never a row index, so it follows the slot wherever it
// lays out.
const RAIL_CARET_CENTRE = 1 + 28 + 5;
// The note's 1px border: an absolutely placed caret is offset from the padding
// box, inside it.
const NOTE_BORDER = 1;
// The phone note's left inset, which its caret is placed against (5.1, 5.8).
const TAB_NOTE_INSET = 12;

/**
 * Where "Go to step 1" goes. On first run the checklist's `Upload a CSV` is on
 * the page, so it is brought into view and focused; anywhere else (an account
 * with decks and no collection, or a locked route) there is no step 1 on screen
 * and the replace route is the same flow on its own page.
 *
 * With the lock open (no-collection entry) the button is drawn on first run
 * alone, and step 1 is Home's: off Home, the fallback goes there rather than to
 * the replace page, which would drop the ways group the step now carries. An
 * account with decks gets `Add your cards` instead and never reaches this.
 */
function useGoToStep1(openLock: OpenLock) {
  // A code-started navigation to a route that is not kept, so it reports its press like a link.
  const { go } = usePendingPush();
  return useCallback(() => {
    // The upload entry first; while step 1's review is open that entry is unmounted, and the
    // step-1 card itself is the target, so the review in hand is never navigated away from.
    const target =
      document.querySelector<HTMLElement>("[data-step1-upload]") ??
      document.querySelector<HTMLElement>("[data-step1-card]");
    if (target) {
      reveal(target, "center");
      target.focus({ preventScroll: true });
    } else {
      go(openLock ? "/" : "/collection/replace");
    }
  }, [go, openLock]);
}

/**
 * The note's one button. First run, and the shipped lock: `Go to step 1`. With the lock open and a deck there is no
 * step 1, so it reads `Add your cards` and goes to /collection, where every way in is.
 */
function useNoteAction(openLock: OpenLock): { label: string; run: () => void } {
  const goToStep1 = useGoToStep1(openLock);
  const { go } = usePendingPush();
  const addYourCards = useCallback(() => go("/collection"), [go]);
  return openLock?.hasDecks ? { label: lockCopy.addYourCards, run: addYourCards } : { label: lockCopy.goToStep1, run: goToStep1 };
}

type OpenNote = { href: NavHref; x: number; y: number } | null;

/**
 * One chrome's locked slots and their notes. Each slot owns a note that is
 * always in the document (its sentence is the slot's description, so it can
 * never be empty), and at most one is open at a time.
 *
 * Closing on Escape and on a press outside is shared; opening is the chrome's
 * own. The Escape handler acts only while focus is on a slot, inside the open
 * note, or nowhere (a note opened by hover): a key pressed inside a dialog is
 * that dialog's, and this does not fight it.
 */
function useLockNotes(place: (slot: HTMLElement) => { x: number; y: number }) {
  const [open, setOpen] = useState<OpenNote>(null);
  const slots = useRef(new Map<NavHref, HTMLButtonElement>());
  const notes = useRef(new Map<NavHref, HTMLDivElement>());

  const show = useCallback(
    (href: NavHref) => {
      const slot = slots.current.get(href);
      if (slot) setOpen({ href, ...place(slot) });
    },
    [place],
  );

  const close = useCallback((href: NavHref, returnFocus: boolean) => {
    // The focus call fires the slot's open-on-focus, and that update and this close are batched
    // into one render, the close last: the note ends closed. Pinned by the hover-then-Escape test.
    if (returnFocus) slots.current.get(href)?.focus();
    setOpen(null);
  }, []);

  const inLock = useCallback((node: Node | null, href: NavHref) => {
    if (!node) return false;
    if (notes.current.get(href)?.contains(node)) return true;
    for (const slot of slots.current.values()) if (slot.contains(node)) return true;
    return false;
  }, []);

  useEffect(() => {
    if (!open) return;
    const { href } = open;
    const onPointerDown = (e: PointerEvent) => {
      // A press on the About sheet is not a press away from the note (H1): the note is
      // waiting for that sheet, and its Later or Show me is how the wait ends.
      const t = e.target as Element | null;
      if (t?.closest?.("[data-about-sheet]")) return;
      if (!inLock(e.target as Node, href)) setOpen(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const active = document.activeElement;
      const nowhere = !active || active === document.body;
      if (!nowhere && !inLock(active, href)) return;
      close(href, true);
    };
    const onResize = () => show(href);
    // The touch rail's nav scrolls on a short screen, and the note is `fixed`, so a scroll there
    // re-places it the way a resize does (audit V-E3). Scroll does not bubble: listen in capture.
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", onResize, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", onResize, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, inLock, close, show]);

  return { open, setOpen, show, close, slots, notes, inLock };
}

/**
 * The note's sentence, with the slot's own label drawn in `--fg`. It names the other slots the lock holds, and with
 * the lock open and a deck it adds where the decks are.
 */
function NoteSentence({ id, label, className, openLock }: { id: string; label: string; className: string; openLock: OpenLock }) {
  const others = nameList(lockedItems(openLock).filter((i) => i.label !== label).map((i) => i.label));
  const sentence = openLock?.hasDecks ? `${lockCopy.note(label, others)} ${lockCopy.withDecks}` : lockCopy.note(label, others);
  const rest = sentence.startsWith(label) ? sentence.slice(label.length) : null;
  return (
    <p id={id} className={className}>
      {rest === null ? (
        sentence
      ) : (
        <>
          <span className="text-[color:var(--fg)]">{label}</span>
          {rest}
        </>
      )}
    </p>
  );
}

function registerRef<T extends HTMLElement>(map: RefObject<Map<NavHref, T>>, href: NavHref) {
  return (el: T | null) => {
    if (el) map.current.set(href, el);
    else map.current.delete(href);
  };
}

function railPlace(slot: HTMLElement) {
  const r = slot.getBoundingClientRect();
  const rail = slot.closest("aside")?.getBoundingClientRect();
  return { x: (rail?.right ?? r.right) + 12, y: r.top + r.height / 2 - RAIL_CARET_CENTRE };
}

function tabPlace(slot: HTMLElement) {
  const r = slot.getBoundingClientRect();
  // The caret's left edge inside the note's padding box: the slot's centre, less
  // the note's inset, its border and half the 10px caret.
  return { x: r.left + r.width / 2 - TAB_NOTE_INSET - NOTE_BORDER - 5, y: 0 };
}

/**
 * Desktop: the well around the locked slots (all four, or the three after Collection when the
 * open lock leaves Collection out), its padlock and LOCKED foot,
 * and each slot's note (1.x, 1a, 1b, 3.x).
 *
 * The note opens on hover, keyboard focus or a click of a slot, and hovering
 * another slot moves it there. It does NOT close when the pointer leaves the
 * slot, so the pointer can travel onto it (WCAG 1.4.13); it closes on Escape,
 * on focus leaving slot and note, and on a press outside both.
 */
function RailLock({ pathname, openLock }: { pathname: string; openLock: OpenLock }) {
  const { open, show, close, slots, notes, inLock, setOpen } = useLockNotes(railPlace);
  const action = useNoteAction(openLock);
  const baseId = useId();

  const onBlur = (href: NavHref) => (e: React.FocusEvent) => {
    if (open?.href !== href) return;
    if (inLock(e.relatedTarget as Node | null, href)) return;
    setOpen(null);
  };

  return (
    <div
      data-lock-well
      className="flex w-[48px] shrink-0 flex-col items-center gap-1 rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)] pt-[4px] pb-[9px] touch:w-[80px] touch:rounded-[14px] touch:px-[3px] touch-short:pb-[5px]"
    >
      {lockedItems(openLock).map(({ href, label }) => {
        const isOpen = open?.href === href;
        const noteId = `${baseId}-note-${label}`;
        const sentenceId = `${noteId}-sentence`;
        return (
          <LockedSlotAndNote key={href}>
            <button
              type="button"
              ref={registerRef(slots, href)}
              data-locked-slot={label}
              aria-label={refreshCopy.firstRun.lockedItemAria(label)}
              aria-expanded={isOpen}
              aria-controls={noteId}
              aria-describedby={sentenceId}
              // A locked route still renders (/collection with no cards is its
              // empty state), so a locked slot can be the current page.
              aria-current={isActive(pathname, href) ? "page" : undefined}
              onPointerEnter={() => show(href)}
              onFocus={() => show(href)}
              onClick={() => show(href)}
              onBlur={onBlur(href)}
              className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-transparent text-[color:var(--fg-locked)] focus-visible:shadow-[0_0_0_2px_var(--accent)] focus-visible:outline-none ${RAIL_TOUCH_SLOT}`}
            >
              <NavIcon href={href} />
              <RailLabel label={label} />
            </button>
            <div
              id={noteId}
              ref={registerRef(notes, href)}
              data-lock-note={isOpen ? "open" : "closed"}
              // Focusable (not tabbable) while open, so a press on the note's
              // text moves focus INTO the note rather than to the page, and the
              // blur rule does not read it as leaving.
              tabIndex={isOpen ? -1 : undefined}
              onBlur={onBlur(href)}
              className={
                isOpen
                  ? "fixed z-10 flex w-[268px] flex-col gap-[8px] rounded-[10px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-[14px_16px_16px] shadow-[0_18px_40px_rgba(0,0,0,.45)] outline-none"
                  : "sr-only"
              }
              style={isOpen ? { left: open.x, top: open.y } : undefined}
            >
              {isOpen && (
                <span
                  aria-hidden="true"
                  data-lock-caret
                  className="absolute top-[28px] left-[-6px] h-[10px] w-[10px] rotate-45 border-b-[1px] border-l border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]"
                />
              )}
              {isOpen && (
                <span className="font-mono text-[10px] tracking-[0.12em] text-[color:var(--fg-faint)] uppercase">
                  {lockCopy.railLabel}
                </span>
              )}
              <NoteSentence
                id={sentenceId}
                label={label}
                openLock={openLock}
                className="m-0 text-[13px] leading-[1.5] [text-wrap:pretty] text-[color:var(--fg-body)]"
              />
              {isOpen && (
                <button
                  type="button"
                  onClick={() => {
                    action.run();
                    close(href, false);
                  }}
                  className="mt-[2px] h-[32px] self-start rounded-[8px] border border-[color:var(--border-strong)] bg-transparent px-[13px] text-[12.5px] text-[color:var(--fg)]"
                >
                  {action.label}
                </button>
              )}
            </div>
          </LockedSlotAndNote>
        );
      })}
      {/* The well's foot: decorative, since every slot above names itself
          locked. */}
      <div
        aria-hidden="true"
        className="mt-[3px] flex flex-col items-center gap-[5px] touch-short:mt-0 touch-short:gap-[4px]"
      >
        <Lock size="lg" ink="var(--fg-locked)" />
        {/* The short rule sets LOCKED's line to the 10px V1 draws (audit V-E1). */}
        <span className="font-mono text-[8.5px] tracking-[0.1em] text-[color:var(--fg-locked)] uppercase touch-short:leading-[10px]">
          {lockCopy.railLabel}
        </span>
      </div>
    </div>
  );
}

// A slot and its note are siblings in the document, so the note's button is the
// next tab stop after its slot. The wrapper draws nothing: `contents` leaves the
// slot a direct flex item of its chrome's row or column.
function LockedSlotAndNote({ children }: { children: React.ReactNode }) {
  return <div className="contents">{children}</div>;
}

/**
 * Phone: the tab bar's locked slots and their note (4a, 5.x). The note opens on
 * a TAP only; it closes on a press outside, a second tap on the slot, Go to step
 * 1, or Escape. Focus stays on the slot, and the note's button is next.
 */
function TabLockSlots({ pathname, liveHome, openLock }: { pathname: string; liveHome: React.ReactNode; openLock: OpenLock }) {
  const { open, show, close, slots, notes } = useLockNotes(tabPlace);
  // The About sheet holds this slot while it is up (H1): a tapped note stays
  // open in state and is drawn once the sheet closes.
  const sheetUp = useAboutSheetUp();
  const action = useNoteAction(openLock);
  const baseId = useId();

  return (
    <div className="flex w-full items-center">
      {liveHome}
      {lockedItems(openLock).map(({ href, label }) => {
        // Open in STATE (`waiting`) and drawn (`isOpen`) differ only while the About sheet
        // is up. The toggle reads the state, so a second tap cancels a waiting note rather
        // than asking for it again.
        const waiting = open?.href === href;
        const isOpen = waiting && !sheetUp;
        const noteId = `${baseId}-note-${label}`;
        const sentenceId = `${noteId}-sentence`;
        return (
          <LockedSlotAndNote key={href}>
            <button
              type="button"
              ref={registerRef(slots, href)}
              data-locked-slot={label}
              aria-label={refreshCopy.firstRun.lockedItemAria(label)}
              aria-expanded={isOpen}
              aria-controls={noteId}
              aria-describedby={sentenceId}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              onClick={() => (waiting ? close(href, false) : show(href))}
              // Tapped: an inset outline, never a fill (4a.7).
              className={`flex h-[52px] flex-1 flex-col items-center justify-center gap-[5px] rounded-[12px] bg-transparent text-[color:var(--fg-locked)] ${
                isOpen ? "shadow-[inset_0_0_0_1px_var(--border-strong)]" : ""
              }`}
            >
              <NavIcon href={href} />
              <span className="font-mono text-[9px] tracking-[0.06em] max-[359px]:text-[8.5px] max-[359px]:tracking-normal">
                {label}
              </span>
            </button>
            <div
              id={noteId}
              ref={registerRef(notes, href)}
              data-lock-note={isOpen ? "open" : "closed"}
              className={
                isOpen
                  ? "fixed right-[12px] bottom-[calc(var(--tabbar-h)+10px)] left-[12px] flex flex-col gap-[10px] rounded-[12px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-[14px_16px_16px] shadow-[0_-12px_36px_rgba(0,0,0,.45)]"
                  : "sr-only"
              }
            >
              {isOpen && (
                <span
                  aria-hidden="true"
                  data-lock-caret
                  className="absolute bottom-[-6px] h-[10px] w-[10px] rotate-45 border-r-[1px] border-b-[1px] border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]"
                  style={{ left: open.x }}
                />
              )}
              <NoteSentence
                id={sentenceId}
                label={label}
                openLock={openLock}
                className="m-0 text-[14px] leading-[1.5] [text-wrap:pretty] text-[color:var(--fg-body)]"
              />
              {isOpen && (
                <button
                  type="button"
                  onClick={() => {
                    action.run();
                    close(href, false);
                  }}
                  className="flex h-[44px] w-full items-center justify-center rounded-[10px] border border-[color:var(--border-strong)] bg-transparent text-[14px] text-[color:var(--fg)]"
                >
                  {action.label}
                </button>
              )}
            </div>
          </LockedSlotAndNote>
        );
      })}
    </div>
  );
}

/**
 * The phone's bracket over the locked tabs, carrying the reason in words (4.4-4.11): tabs 2 to 5 as shipped, tabs 3
 * to 5 with the lock open (no-collection entry, call 6), where Collection is live beside Home.
 */
function TabBracket({ openLock }: { openLock: OpenLock }) {
  return (
    // `ml-[20%]`: one slot of the bar's content width (374 at 390 = 5 x 74.8),
    // so the row spans slots 2 to 5 at any phone width; `ml-[40%]`, two slots, spans 3 to 5.
    <div data-lock-bracket className={`relative h-[14px] flex-none ${openLock ? "ml-[40%]" : "ml-[20%]"}`}>
      <span
        aria-hidden="true"
        data-lock-bracket-box
        className="absolute top-[7px] right-[8px] left-[8px] h-[6px] rounded-t-[3px] border border-b-0 border-[color:var(--border-strong)]"
      />
      <span
        data-lock-bracket-label
        className="absolute top-0 left-1/2 inline-flex -translate-x-1/2 items-center gap-[5px] whitespace-nowrap bg-[color:var(--surface-rail)] px-[7px] font-mono text-[9px] leading-[14px] tracking-[0.08em] text-[color:var(--fg-locked)] uppercase"
      >
        <Lock size="sm" ink="var(--fg-locked)" />
        {lockCopy.tabBracket}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavRail — desktop only (hidden md:flex)
// §Rail container / §Rail Wordmark area / §Rail Nav section / §Rail Account trigger
// ---------------------------------------------------------------------------

// The touch rail's slot (desktop nav labels handoff, R1 as the touch rail): the tab bar's slot as it
// is, the 19px icon over a 9px mono label, 72 × 52 at radius 12, and 72 × 44 with a 2px gap on a
// short screen (V1). On the rail only, never in NavSlot's base, because every phone is
// `(hover: none)` too and the tab bar shares NavSlot (audit E5).
const RAIL_TOUCH_SLOT =
  "touch:h-[52px] touch:w-[72px] touch:flex-col touch:gap-[3px] touch:rounded-[12px] touch-short:h-[44px] touch-short:gap-[2px]";

// The touch rail's visible label. `aria-hidden`: the slot is already named by its `aria-label`,
// and the two strings are identical, so the name is heard once (audit E3). Its line is set to the
// 12px the handoff draws rather than preflight's 1.5 (V-E1). Takes the slot's colour.
function RailLabel({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      data-rail-label
      className="hidden font-mono text-[9px] leading-[12px] tracking-[0.06em] touch:block"
    >
      {label}
    </span>
  );
}

// The rail's card search slot (card search PR D, R-A): a plain slot under the mark and above Home, with a short rule under
// it. It lights like a nav slot on hover and while the search is open. The shortcut is in its name tag and nowhere at
// rest. Drawn only where the shell mounted the search (the switch on, signed in).
function RailSearchSlot({ bind }: { bind: ReturnType<typeof useRailTag>["bind"] }) {
  const search = useCardSearch();
  const shortcut = useSearchShortcutLabel();
  if (!search) return null;
  return (
    <>
      <button
        type="button"
        aria-label={cardSearchCopy.label}
        aria-haspopup="dialog"
        aria-expanded={search.isOpen}
        aria-keyshortcuts={shortcut.keys}
        {...bind("#card-search", `${cardSearchCopy.label} ${shortcut.label}`)}
        onPointerDown={search.warmSearch}
        onClick={(e) => search.openSearch(e.currentTarget)}
        className={`relative flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] ${RAIL_TOUCH_SLOT} ${
          search.isOpen
            ? "bg-elevated text-[color:var(--fg)]"
            : "bg-transparent text-[color:var(--fg-muted)] hover:bg-elevated hover:text-[color:var(--fg)]"
        }`}
      >
        <SearchGlyph size={19} stroke={1.5} />
        <RailLabel label={cardSearchCopy.touchRailLabel} />
      </button>
      <span aria-hidden className="mt-[6px] mb-[6px] h-px w-6 shrink-0 bg-[color:var(--border-strong)]" />
    </>
  );
}

// A live nav slot. Locked slots are not links: they are buttons that open their
// note (RailLock, TabLockSlots above).
type NavSlotProps = {
  href: NavHref;
  active: boolean;
  // Where the pending pip sits: the rail's slot or the tab bar's (PendingPip).
  pip: "rail" | "tab";
  // The rail passes its label as the slot's name: beside a pointer it draws none,
  // and on touch its drawn label is aria-hidden, so the name is heard once. The
  // tab bar leaves the name to its visible label.
  name: string | undefined;
  className: string;
  // The pointer rail's name tag listens on its slots (useRailTag). The tab bar passes none.
  handlers?: ReturnType<ReturnType<typeof useRailTag>["bind"]>;
  /** The slot is a moment's anchor (M12 on Discover). */
  moment?: boolean;
  children: React.ReactNode;
};

// No `title`: the pointer rail draws its own tag (desktop nav labels R2, audit E3), and a native
// tooltip would show beside it.
function NavSlot({ href, name, active, pip, className, handlers, moment = false, children }: NavSlotProps) {
  // M12 (discovery R1): Discover carries Help me choose, beside the rail's slot and above the tab bar's.
  const helpMoment = useMomentAnchor("help-me-choose", {
    eligible: moment,
    copy: momentsCopy.helpMeChoose,
    place: pip === "rail" ? "right" : "below",
  });
  return (
    <Link
      href={href}
      aria-label={name}
      {...handlers}
      {...helpMoment}
      aria-current={active ? "page" : undefined}
      className={`relative ${className}`}
    >
      {children}
      <PendingPip href={href} placement={pip} />
    </Link>
  );
}

/** The admin door (admin STATES D1): a boolean from the server, and the environment it names. And the
 *  Friends row (Social R1), drawn when `SOCIAL_FRIENDS_ENABLED` is on for this reader. */
export type AdminDoorProps = {
  adminDoor?: boolean;
  adminEnv?: string;
  friends?: boolean;
  /** M11 (discovery R1): a game logged and no friend yet, so the account button carries Friends after a game. */
  friendsMoment?: boolean;
};

/** M12 (discovery R1): the reader has no deck, so on the `/commanders` list Discover carries Help me choose. */
function helpOnSlot(helpMoment: boolean, pathname: string, href: string): boolean {
  // The list itself, never a commander's own page under it: the tip is about where to start.
  return helpMoment && href === "/discover" && pathname === "/commanders";
}

export function NavRail({
  locked,
  openLock = null,
  theme,
  adminDoor,
  adminEnv,
  friends,
  friendsMoment,
  helpMoment = false,
}: { locked: boolean; openLock?: OpenLock; theme: ThemeKey; helpMoment?: boolean } & AdminDoorProps) {
  const pathname = usePathname();
  // Live slots only: a locked slot's note already names it, and two popovers from one slot is
  // the collision the handoff's D1 warned of. Home, live in first run, gets the tag.
  const { bind, tag } = useRailTag(pathname);

  return (
    <aside
      // `sticky` makes this a stacking context, so the account popover's own
      // z-index cannot lift it past the main column — the rail as a whole has
      // to outrank that column, or content with any positive z-index (the
      // collection filter bar, a rec card's overlay) paints over the open menu.
      // Below the tab bar, the menu backdrop and the modals, which all sit at
      // 40 or above. The lock's note is fixed inside it, so it inherits the
      // same rank over page content.
      // Touch (`hover: none`): the 88px labelled rail, `h-dvh` so the account
      // control is measured against the visible viewport (audit V-E4), and the
      // short rule's 10px padding (V1).
      className="hidden md:flex md:flex-col items-center w-[var(--rail-w)] shrink-0 h-screen touch:h-dvh sticky top-0 z-30 py-[14px] touch-short:py-[10px]"
      style={{
        background: "var(--surface-rail)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* The app mark — the crowned numeral, 39px tall, with 20px of air under
          it. Once, at the top: it is the mark, not a nav item and not a route,
          and never repeated per row (CHROME-rail-mark.md §§1, 3).

          It was a bare 26px outlined diamond until 2026-09-08 — the crown's
          middle diamond with the other two and the numerals taken away, which
          is both not the mark and the same shape Discover's nav glyph is built
          from. This is the only place the desktop app says its own name. */}
      {/* On touch, 4px of the gap under the mark moves into the nav's own top
          padding, so a focus ring on the first slot is not cut by the nav's
          scroll box (audit V-E2): 16 + 4 = 20, and 12 + 4 = 16 when short. */}
      <Crowned99
        variant="rail-62"
        className="mb-5 shrink-0 touch:mb-[16px] touch-short:mb-[12px]"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Nav section — icon-only, 38px squares, 4px apart                    */}
      {/* ------------------------------------------------------------------ */}
      {/* On touch the nav is the rail's one scroll region, between the mark and
          the account control, so the account control is always reachable on a
          short screen (V1's backstop). It only scrolls below 349px of column
          (392 in first run). Every child is `shrink-0`, or a column too short for
          it would squeeze the slots before it scrolled. The 4px on top keeps the
          first slot's focus ring clear of the box's clip (V-E2); the 8px below is
          V1's minimum above the account control. The slots stay 4px apart when
          short: V1 tightens only the gap between icon and label. The scrollbar
          is hidden, as the deck page's tab strip hides its own: a classic one
          takes ~15px of the 87px column and would clip the 72px slot's ring at
          both sides. The region still scrolls by touch and by wheel. */}
      <nav
        data-rail-nav
        className="flex flex-col items-center gap-1 touch:min-h-0 touch:w-full touch:flex-1 touch:overflow-y-auto touch:pt-[4px] touch:pb-[8px] touch:[scrollbar-width:none] touch:[&::-webkit-scrollbar]:hidden"
        aria-label="Primary"
      >
        <RailSearchSlot bind={bind} />
        {liveItems(locked, openLock).map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <NavSlot
              key={href}
              name={label}
              href={href}
              active={active}
              pip="rail"
              handlers={bind(href, label)}
              moment={helpOnSlot(helpMoment, pathname, href)}
              // No `transition-colors`: the pending fill below must clear the frame the new page
              // lands, not fade out over it (audit correction 4).
              className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] ${RAIL_TOUCH_SLOT} ${
                active
                  ? "bg-elevated text-[color:var(--fg)]"
                  : "bg-transparent text-[color:var(--fg-faint)] hover:bg-elevated-hover has-[[data-pending]]:bg-elevated-hover has-[[data-pending]]:text-[color:var(--fg)]"
              }`}
            >
              <NavIcon href={href} />
              <RailLabel label={label} />
            </NavSlot>
          );
        })}

        {/* Home stays outside the well, above it (1.1); the well replaces the
            divider and lone padlock the rail drew before (1.2). */}
        {locked && <RailLock pathname={pathname} openLock={openLock} />}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Account trigger — §Rail: 30px circle, pinned to the bottom.         */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-auto flex shrink-0 flex-col items-center">
        {/* Offline, above the account trigger: the rail has no top bar for it (PWA plan, call 1). */}
        <OfflinePill place="rail" />
        <AccountMenu panel="popover" theme={theme} adminDoor={adminDoor} adminEnv={adminEnv} friends={friends} friendsMoment={friendsMoment} />
      </div>
      {tag}
      {/* The search's desktop field and dropdown, and ⌘K (card search PR D). */}
      <SearchDesktop />
    </aside>
  );
}

// ---------------------------------------------------------------------------
// TabBar — mobile only (md:hidden, fixed bottom)
// §Tab bar container / §Tab item Active / §Tab item Idle
// ---------------------------------------------------------------------------

export function TabBar({ locked, openLock = null, helpMoment = false }: { locked: boolean; openLock?: OpenLock; helpMoment?: boolean }) {
  const pathname = usePathname();

  const live = liveItems(locked, openLock).map(({ href, label }) => {
    const active = isActive(pathname, href);
    return (
      <NavSlot
        key={href}
        name={undefined}
        href={href}
        active={active}
        // The active fill is a surface, not a coloured label: locked ruling
        // 13 reserves colour for status. One `color` on the slot serves both
        // the icon (currentColor) and the label.
        pip="tab"
        moment={helpOnSlot(helpMoment, pathname, href)}
        className={`flex h-[52px] flex-1 flex-col items-center justify-center gap-[3px] rounded-[12px] ${
          active
            ? "bg-[color:var(--surface-inset)] text-[color:var(--fg)]"
            : "bg-transparent text-[color:var(--fg-faint)] has-[[data-pending]]:text-[color:var(--fg)]"
        }`}
      >
        <NavIcon href={href} />
        {/* A fifth item takes the 390pt bar to 74.8px per slot, which still
            holds `Commanders` at 9px with 10.4px of air each side. Below
            360pt it does not: the label drops to 8.5px and gives up its
            tracking, which buys 3px back and takes 320pt from 3.4px of
            clearance to 4.9px. Truncation is rejected — `Commanders` and
            `Collection` share a prefix. */}
        <span className="font-mono text-[9px] tracking-[0.06em] max-[359px]:text-[8.5px] max-[359px]:tracking-normal">
          {label}
        </span>
      </NavSlot>
    );
  });

  return (
    <nav
      // Hidden while a Deck note's field has focus on a phone (`html[data-note-focus]`, `note-field.tsx`):
      // the keyboard is up and the field needs the room (Deck notes A1).
      data-hide-on-note-focus=""
      // Held to --tabbar-h rather than sized by its contents: the bar is fixed,
      // so every surface that has to sit clear of it reserves that height by
      // hand, and an intrinsic height gives them nothing exact to reserve.
      // 8px all round with 14px at the bottom for the home indicator, which
      // with the 52px item is exactly --tabbar-h. While locked the shell sets
      // --tabbar-h to 88px and the bar stacks the bracket over the tabs, with
      // 7px on top (4.1, 4.2).
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 flex h-[var(--tabbar-h)] px-2 pb-[14px] ${
        locked ? "flex-col pt-[7px]" : "items-center pt-2"
      }`}
      style={{
        background: "var(--surface-rail)",
        borderTop: "1px solid var(--border)",
      }}
      aria-label="Primary"
    >
      {locked ? (
        <>
          <TabBracket openLock={openLock} />
          <TabLockSlots pathname={pathname} liveHome={live} openLock={openLock} />
        </>
      ) : (
        live
      )}
    </nav>
  );
}


// ---------------------------------------------------------------------------
// MobileHeader — mobile only (md:hidden)
// §Mobile Top Header / §Mobile Wordmark
// ---------------------------------------------------------------------------

export function MobileHeader({ theme, adminDoor, adminEnv, friends, friendsMoment }: { theme: ThemeKey } & AdminDoorProps) {
  const ref = useRef<HTMLElement>(null);
  const { mode, slides, under } = useQuickReturn(ref);
  return (
    <>
    {/* Holds the header's room in the page, since the header itself is out of flow at every scroll. */}
    <div aria-hidden className="md:hidden h-[var(--header-h,79px)] shrink-0" />
    <header
      ref={ref}
      data-quick-return={mode}
      className={`${QUICK_RETURN[mode]} ${slides ? QUICK_RETURN_SLIDE[mode] : ""} md:hidden inset-x-0 top-0 ${under ? "z-[1]" : "z-30"} flex items-center justify-between bg-[color:var(--bg)] px-5 pt-5 pb-[14px] motion-reduce:transition-none`}
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Wordmark: gap 3px, items-end */}
      <div className="flex items-end gap-[3px]">
        {/* "THE": mono 9px, 0.4em tracking, accent, pb 4px */}
        <span
          className="pb-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.4em",
            color: "var(--accent)",
          }}
        >
          THE
        </span>
        {/* Adjudication #1: variant="mobile-header" (5/7/5px diamonds, 24px numeral) */}
        <Crowned99 variant="mobile-header" />
      </div>

      <div className="flex items-center">
        {/* Offline, left of the avatar (Concert Crawl's PWA cluster, right-side slots). */}
        <OfflinePill place="header" />
        {/* Install, phone only: desktop browsers have their own install button (PWA plan, call 1). */}
        <InstallSlot />
        {/* Card search, left of the avatar (HP1). Drawn only where the shell mounted the search. */}
        <CardSearchIcon />
        {/* Avatar — §Mobile top-right avatar trigger: 38×38px, br 12px, accent border */}
        <AccountMenu panel="sheet" theme={theme} adminDoor={adminDoor} adminEnv={adminEnv} friends={friends} friendsMoment={friendsMoment} />
      </div>
    </header>
    </>
  );
}

/**
 * Where the header sits in each quick-return mode (card search handoff call 3). In the page it is absolute at the
 * document's top, so it scrolls with the page exactly as it always has; away and back it is fixed to the screen.
 * Under the sheets' scrim (z-40) and over every sticky page head.
 */
const QUICK_RETURN: Record<QuickReturnMode, string> = {
  page: "absolute",
  away: "fixed -translate-y-full",
  shown: "fixed translate-y-0 shadow-[0_10px_28px_rgba(0,0,0,0.5)]",
};

/**
 * The slides: away in 160ms on an ease-in, back in 200ms on the sheet curve (`--motion-ease-out`). `translate`, not
 * `transform`: Tailwind 4's `translate-y-*` set the individual property.
 */
const QUICK_RETURN_SLIDE: Record<QuickReturnMode, string> = {
  page: "",
  away: "transition-[translate] duration-[160ms] ease-[cubic-bezier(0.4,0,1,1)]",
  shown: "transition-[translate,box-shadow] duration-[200ms] ease-[var(--motion-ease-out)]",
};
