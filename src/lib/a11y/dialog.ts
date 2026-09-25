"use client";
// useDialogA11y — shared focus-trap + Escape + focus-return hook.
// Consumers: every role="dialog" surface — CardModal, Issue Inspector, the
// export dialog, ConfirmModal, and the account menu.

import { type RefObject, useEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Consumers render parallel mobile/desktop trees and hide one via display:none
// (e.g. ExportDialog) — hidden elements have no client rects and must not
// receive focus or participate in Tab wrapping.
// Also filter out elements that opted OUT of keyboard focus: the FOCUSABLE
// selector's `button:not([disabled])` clause matches buttons with
// `tabindex="-1"`, which are usually intentionally excluded (e.g. the Issue
// Inspector's clear ✕ when its input is empty and it's aria-hidden).
// And filter out anything under an `inert` ancestor. A dialog that covers part of
// itself — the card modal's zoom is the first — leaves the covered controls mounted
// for layout and marks them inert, which stops the browser focusing them but not
// `querySelectorAll` finding them. Left in the list they break the trap in both
// directions: Tab from the last control tries to focus an inert first element and
// lands nowhere, and Shift+Tab from the first is never wrapped, so focus escapes the
// dialog entirely.
function visibleFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.getClientRects().length > 0 &&
      el.tabIndex >= 0 &&
      el.getAttribute("aria-hidden") !== "true" &&
      el.closest("[inert]") === null,
  );
}

// Module-level because the lock is a property of the page, not of any one
// dialog: every hook instance has to see the same count.
let scrollLocks = 0;
let overflowBeforeLock = "";

/**
 * Hold the page still while a surface is up, and let go when the last one closes.
 *
 * Counted rather than saved-and-restored per caller. Two surfaces can be up at
 * once — the deck builder's add sheet and export dialog are independent flags —
 * and whichever unmounts first would otherwise restore the overflow it captured
 * and free a page the other one still needs held. The count releases only on the
 * last unlock, and the original value is captured once, by the first locker.
 *
 * Exported because two sheets trap focus themselves and cannot take
 * `useDialogA11y` wholesale: the rack's sheet owns its own Escape and drag
 * dismissal, and `FilterPanel` keeps DOM focus on its search field by design, so
 * a hook that moves focus to the first focusable would break its one rule. They
 * still have to hold the page — an `aria-modal` sheet over a page that scrolls
 * behind it reads as broken — so the lock is the part they share.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    if (scrollLocks === 0) {
      overflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLocks += 1;
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) {
        document.body.style.overflow = overflowBeforeLock;
      }
    };
  }, [locked]);
}

// ── The back button ────────────────────────────────────────────────────────────
//
// Android's hardware back, and a browser's own Back, used to leave the ROUTE with
// a sheet still open over it (#155). A dialog now puts one history entry under
// itself while it is up, at the same URL, so Back lands on that entry's
// predecessor and closes the dialog instead of navigating.
//
// The rules, each a way it would otherwise break:
//
// 1. Back does what Escape does. A dialog whose Escape steps down a rung — the card
//    modal's zoom, then its printing region — steps down one rung per Back, and gets
//    a fresh entry while it is still up. One that refuses Escape (a confirm whose
//    replace is running) refuses Back and takes its entry back.
// 2. A dialog closed any OTHER way — its ✕, Escape, the scrim — takes its own entry
//    back off, or the next Back would do nothing visible. Only while that entry is
//    still the current one and the route has not moved: a link inside the dialog
//    that navigated has put a newer entry on top, and stepping back would undo it.
//    That entry is remembered instead, and a traversal that lands on it steps past.
// 3. The URL a sheet wrote while open survives the pop. Filter sheets and the card
//    modal mirror their state into the query string with `replaceState`, which
//    rewrites the dialog's entry, not its predecessor. The URL is put back after the
//    pop: a back() this module issues knows what it left, and a hardware Back reads
//    it off the Navigation API's `navigate` event.
// 4. Nested dialogs close one per Back, and a pop this module caused closes nothing.
//
// Where there is no Navigation API (Firefox, today) an entry cannot be told apart
// from its neighbours: rule 2 then decides on the path alone, a hardware Back cannot
// keep a URL written while the sheet was up, and no entry is skipped.

type BackEntry = {
  close: () => void;
  /** False while the dialog refuses to close — the same moments it refuses Escape. */
  canClose: () => boolean;
  /** The Navigation API key of the entry under this dialog, or null without one. */
  key: string | null;
  path: string;
  /** Whether the entry is still in the session history, unpopped. */
  onHistory: boolean;
  /** A release waiting one task, so a remount in the same tick can reclaim the entry. */
  release: ReturnType<typeof setTimeout> | null;
};
const backStack: BackEntry[] = [];
/** Entries a dialog left under a navigation it made; a traversal onto one steps past. */
const orphans = new Set<string>();
let selfPops = 0;
/**
 * When the pops this module is still owed stop being believed. A `back()` that
 * produces no pop — there was nothing to go back to — would otherwise leave the
 * count standing, and it would swallow the reader's next real Back.
 */
let selfPopsUntil = 0;
let pendingRestore: string | null = null;
let hrefBeforeTraverse: string | null = null;
let traversingBack = true;
let listening = false;

type NavigationLike = {
  currentEntry: { key: string; index: number } | null;
  addEventListener: (
    type: string,
    listener: (e: { navigationType?: string; destination?: { index: number } }) => void,
  ) => void;
};
function navigationApi(): NavigationLike | null {
  return (window as unknown as { navigation?: NavigationLike }).navigation ?? null;
}
const currentKey = () => navigationApi()?.currentEntry?.key ?? null;

/** Put back the URL the page held before the pop, when the pop moved it. */
function restoreHref(href: string | null) {
  if (href && href !== window.location.href) window.history.replaceState(null, "", href);
}

/** Stand the dialog on a fresh entry at the current URL. */
function arm(entry: BackEntry) {
  window.history.pushState(null, "");
  entry.key = currentKey();
  entry.path = window.location.pathname;
  entry.onHistory = true;
  backStack.push(entry);
}

function onPopState() {
  const left = hrefBeforeTraverse;
  hrefBeforeTraverse = null;
  if (selfPops > 0 && Date.now() > selfPopsUntil) selfPops = 0;
  if (selfPops > 0) {
    selfPops -= 1;
    restoreHref(pendingRestore);
    pendingRestore = null;
    return;
  }
  const landed = currentKey();
  if (landed !== null && orphans.has(landed)) {
    // A dialog's entry left under a navigation it made: the same URL as its
    // predecessor, so landing here would be a Back that did nothing. Keep going.
    orphans.delete(landed);
    selfPops += 1;
    selfPopsUntil = Date.now() + 1_000;
    if (traversingBack) window.history.back();
    else window.history.forward();
    return;
  }
  const top = backStack.pop();
  if (!top) return;
  top.onHistory = false;
  restoreHref(left);
  if (!top.canClose()) {
    arm(top);
    return;
  }
  top.close();
  // Re-armed at once, before React has committed the close, because until then no
  // one can tell a rung from the whole dialog: the card modal's Escape closes its
  // zoom and stays up. Waiting to find out left a window in which a second Back
  // found no entry and left the route with the dialog still drawn. A dialog that
  // DID close is cleaned up moments later, sees its entry still on the history,
  // and takes it off by the same self-pop as any other close.
  arm(top);
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("popstate", onPopState);
  navigationApi()?.addEventListener("navigate", (e) => {
    if (e.navigationType !== "traverse") return;
    hrefBeforeTraverse = window.location.href;
    const from = navigationApi()?.currentEntry?.index;
    traversingBack = e.destination == null || from == null || e.destination.index < from;
  });
}

/**
 * Give an open dialog a history entry, so Back closes it rather than the route.
 *
 * The release waits one task, and that is for React rather than for the browser:
 * StrictMode runs every effect's cleanup and setup again straight after mounting,
 * and a `back()` issued in that cleanup lands AFTER the setup's fresh push —
 * leaving the dialog open over an entry that is no longer its own. A remount inside
 * the same task reclaims the entry instead.
 */
export function useBackDismiss(open: boolean, onClose: () => void, canClose: () => boolean = () => true) {
  const closeRef = useRef(onClose);
  const canCloseRef = useRef(canClose);
  useEffect(() => {
    closeRef.current = onClose;
    canCloseRef.current = canClose;
  }, [onClose, canClose]);
  const held = useRef<BackEntry | null>(null);

  useEffect(() => {
    if (!open) return;
    listen();
    const reclaimed = held.current;
    let entry: BackEntry;
    if (reclaimed?.release != null) {
      clearTimeout(reclaimed.release);
      reclaimed.release = null;
      entry = reclaimed;
      if (entry.onHistory) backStack.push(entry);
    } else {
      entry = {
        close: () => closeRef.current(),
        canClose: () => canCloseRef.current(),
        key: null,
        path: "",
        onHistory: false,
        release: null,
      };
      held.current = entry;
      arm(entry);
    }
    return () => {
      const i = backStack.indexOf(entry);
      if (i !== -1) backStack.splice(i, 1);
      if (!entry.onHistory) {
        held.current = null;
        return;
      }
      entry.release = setTimeout(() => {
        entry.release = null;
        held.current = null;
        if (!entry.onHistory) return;
        entry.onHistory = false;
        const current = currentKey();
        const ours = entry.key === null || current === entry.key;
        if (!ours || window.location.pathname !== entry.path) {
          // A link inside the dialog navigated. Its entry stays under the new route,
          // and a traversal back onto it steps past (rule 2).
          if (entry.key !== null) orphans.add(entry.key);
          return;
        }
        pendingRestore = window.location.href;
        selfPops += 1;
        selfPopsUntil = Date.now() + 1_000;
        window.history.back();
      }, 0);
    };
  }, [open]);
}

export function useDialogA11y(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options?: {
    initialFocusRef?: RefObject<HTMLElement | null>;
    /**
     * Hold the body at overflow:hidden while the dialog is up. On by default:
     * a modal that lets the page scroll behind it reads as broken, and every
     * consumer that opted in individually was really just correcting the
     * default. Consumers that stay mounted while closed pass their open flag
     * here rather than a literal, so the lock tracks the dialog rather than the
     * component's lifetime.
     */
    lockScroll?: boolean;
    /**
     * Let Escape dismiss the dialog. On by default. ConfirmModal passes false
     * while its replace is in flight: the work is already running and
     * un-undoable, so closing would only hide it.
     */
    closeOnEscape?: boolean;
    /**
     * Where focus goes on close, when the caller knows better than
     * `document.activeElement` did at mount.
     *
     * The capture below reads the active element in the dialog's OWN mount
     * effect, which is after the commit that rendered it — so a dialog opened
     * from a control the same commit marks `inert` records `body` instead, and
     * closing drops the reader at the top of the document. `/collection`'s set
     * panel is exactly that: pressing the Set row opens the panel and makes the
     * sheet around the row inert in one render.
     */
    returnFocusRef?: RefObject<HTMLElement | null>;
    /**
     * The dialog is being drawn as a STATIC SPECIMEN rather than opened, so
     * every behaviour this hook adds is suppressed: no scroll lock, no focus
     * capture or restore, no initial focus, no key listener.
     *
     * The one caller is `/about`, which draws the export dialog as a figure.
     * A dialog rendered into a reference page would otherwise write
     * `document.body.style.overflow`, locking that page's own scroll, and trap
     * the reader's Tab inside a picture — both real regressions on a real
     * route, and the scroll one is what `probe:scroll-lock` exists to catch.
     *
     * Not a general escape hatch. The figure is already `inert` and
     * `pointer-events: none` at its root, so the dialog beneath it cannot be
     * focused or pressed; this option stops the hook reaching OUT of that
     * subtree to the document. Any other caller wanting it is asking for a
     * dialog that is not a dialog.
     */
    inert?: boolean;
  },
) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = options?.initialFocusRef;
  const returnFocusRef = options?.returnFocusRef;
  const lockScroll = options?.lockScroll ?? true;
  const closeOnEscape = options?.closeOnEscape ?? true;
  const inert = options?.inert ?? false;

  // Remember what had focus before the dialog opened; return it on close.
  useEffect(() => {
    if (inert) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      // An explicit target beats the capture, which may have read `body` — see
      // `returnFocusRef`. Never both: focusing the capture first and the target
      // second would move focus twice and announce the wrong control on the way.
      //
      // Read AT CLEANUP on purpose, which is what the rule below warns about and
      // what this needs: the caller's control may have been re-mounted, or may
      // have arrived after this effect ran. Copying it into a variable inside
      // the effect — the rule's own suggestion — would pin whatever the ref held
      // when the dialog opened, which for a control the same commit marks
      // `inert` is the null this option exists to route around.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- the value at cleanup is the point
      (returnFocusRef?.current ?? triggerRef.current)?.focus();
    };
  }, [returnFocusRef, inert]);

  // Focus initialFocusRef when provided (avoids a visible focus flash on the
  // first DOM-order focusable); otherwise fall back to the first visible child.
  useEffect(() => {
    if (inert) return;
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
      return;
    }
    if (!dialogRef.current) return;
    visibleFocusables(dialogRef.current)[0]?.focus();
  }, [dialogRef, initialFocusRef, inert]);

  useScrollLock(lockScroll && !inert);

  // Back closes the dialog rather than the route (#155). Keyed on the same flag as
  // the lock: a consumer that stays mounted while closed passes its open flag as
  // `lockScroll`, and one that passes a literal false is a popover rather than a
  // modal, which Back is not for.
  useBackDismiss(lockScroll && !inert, onClose, () => closeOnEscape);

  // Escape closes; Tab wraps within the dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // No-op while no dialog is mounted (consumer rendered closed/null), and
      // while this one is a specimen rather than an open dialog.
      if (inert) return;
      const root = dialogRef.current;
      if (!root) return;

      // Another dialog's key is not this one's business. The listener is on
      // `window`, so EVERY mounted hook sees every key — and two dialogs can be
      // up together, which the scroll-lock counting above exists for. This
      // guard covers Escape as much as Tab: without it, Escape pressed inside
      // the foreground dialog also closed the one behind it, and Tab had the
      // background dialog yank focus into itself.
      const active = document.activeElement as HTMLElement | null;
      const activeDialog = active?.closest('[role="dialog"]') ?? null;
      if (activeDialog !== null && activeDialog !== root) return;

      if (e.key === "Escape") {
        // Swallowed either way: a dialog that refuses Escape should still stop
        // the key reaching whatever is behind it.
        e.preventDefault();
        if (closeOnEscape) onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = visibleFocusables(root);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      // A dialog that took initial focus on ITS OWN root holds focus on an
      // element the trap cannot see: the root carries `tabIndex={-1}` so it is
      // deliberately excluded from `visibleFocusables`, and it is therefore
      // neither `first` nor `last`. Both branches below then missed, and the
      // very first Shift+Tab after opening walked out of an `aria-modal`
      // surface into the page behind it. Anything not in the list — the root,
      // or a child that opted out — enters at the appropriate end instead.
      const inTrap = active !== null && focusables.includes(active);
      if (!inTrap) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogRef, onClose, closeOnEscape, inert]);
}
