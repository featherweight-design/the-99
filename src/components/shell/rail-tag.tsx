"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMinWidth } from "../ui/use-min-width";

/**
 * The pointer rail's name tag (desktop nav labels handoff, R2: H2 and T2).
 *
 * Beside a pointer the rail stays 62px and icon-only, so a slot's name is drawn on demand: a
 * 28px tag 8px off the rail's edge, centred on the slot, over the page and never pushing it. It
 * is a name tag, not a dialog. It is aria-hidden, since the slot's own `aria-label` is its name and
 * the two strings are the same, so the name is heard once. A touch screen draws every name in the
 * rail itself (R1), so there the tag is not mounted at all.
 *
 * One tag for the whole rail, which follows the pointer rather than reopening on each slot:
 *   - enter: opens after OPEN_DELAY_MS, so a pointer crossing the rail on its way somewhere does
 *     not raise it.
 *   - move: while a tag is open, or for FOLLOW_GRACE_MS after one closed, the next slot's opens
 *     at once.
 *   - leave: closes CLOSE_DELAY_MS after the pointer leaves both slot and tag. That covers the 8px
 *     gap, so the pointer can rest on the tag (WCAG 1.4.13, hoverable).
 *   - keyboard focus (`:focus-visible`) opens it at once; blur closes it. A mouse click's focus
 *     does not.
 *   - closes on pointerdown anywhere (which also cancels a pending open, audit E7), on the slot's
 *     click (Enter fires one, and a keyboard-opened tag must not sit over the page that lands,
 *     E1), on a route change, on scroll and on resize.
 *   - Escape closes it without moving focus (WCAG 1.4.13, dismissible), acting only when focus is
 *     on a rail slot or nowhere and the key is not already handled (E9). It stays closed until the
 *     pointer or focus moves to another slot.
 *   - It never opens while a lock note is open (E2): the note carries Go to step 1 and keeps the
 *     anchor, and the two would meet at the same edge.
 *   - Mouse and pen only (E7). A touch laptop reports `(hover: hover)`, and a tap fires
 *     `pointerenter` too.
 */
export const OPEN_DELAY_MS = 400;
export const FOLLOW_GRACE_MS = 300;
export const CLOSE_DELAY_MS = 100;
const TAG_GAP_PX = 8;

// `at` is the route the tag opened on: a navigation retires it (below) without an effect.
type Open = { href: string; label: string; x: number; y: number; at: string } | null;

type SlotHandlers = {
  onPointerEnter?: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (e: React.PointerEvent<HTMLElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur?: () => void;
  onClick?: () => void;
};

const byPointer = (e: React.PointerEvent) => e.pointerType === "mouse" || e.pointerType === "pen";

export function useRailTag(pathname: string): {
  bind: (href: string, label: string) => SlotHandlers;
  tag: React.ReactNode;
} {
  // `(hover: hover)` through the one media-query subscriber, whose server snapshot is false: the
  // tag is a client affordance, so nothing about it is in the server HTML and nothing shifts at
  // hydration (E8). A change of primary input mounts or unmounts it.
  const hoverCapable = useMinWidth("(hover: hover)");
  const [open, setOpen] = useState<Open>(null);
  const openRef = useRef<Open>(null);
  const openTimer = useRef(0);
  const closeTimer = useRef(0);
  const closedAt = useRef(Number.NEGATIVE_INFINITY);
  const dismissed = useRef<string | null>(null);

  const apply = useCallback((next: Open) => {
    openRef.current = next;
    setOpen(next);
  }, []);

  const cancel = useCallback(() => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  }, []);

  const close = useCallback(() => {
    cancel();
    if (openRef.current) closedAt.current = performance.now();
    apply(null);
  }, [apply, cancel]);

  const show = useCallback(
    (slot: HTMLElement, href: string, label: string) => {
      if (document.querySelector('[data-lock-note="open"]')) return;
      const r = slot.getBoundingClientRect();
      const rail = slot.closest("aside")?.getBoundingClientRect();
      const x = (rail?.right ?? r.right) + TAG_GAP_PX;
      apply({ href, label, x, y: r.top + r.height / 2, at: pathname });
    },
    [apply, pathname],
  );

  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(close, CLOSE_DELAY_MS);
  }, [close]);

  // A route change retires the tag: it is drawn only on the route it opened on (`live`, below, so
  // the frame that commits the new route never draws it), and the change cancels anything waiting
  // to open or close and forgets the tag, or a Back to the route it opened on would draw it again
  // with no hover. A change of primary input does the same.
  useEffect(
    () => () => {
      cancel();
      apply(null);
    },
    [pathname, hoverCapable, cancel, apply],
  );
  const live = open !== null && open.at === pathname ? open : null;

  useEffect(() => {
    if (!hoverCapable) return;
    // Any press: closes an open tag and cancels one waiting to open (T2 "press", E7, E11).
    const onPointerDown = () => close();
    const onKeyDown = (e: KeyboardEvent) => {
      const current = openRef.current;
      if (e.key !== "Escape" || e.defaultPrevented || !current) return;
      // E9: focus on a live rail slot, or nowhere. Not the account control or a locked slot or its
      // note, which sit in the rail too and own their own Escape.
      const active = document.activeElement;
      const nowhere = !active || active === document.body;
      if (!nowhere && !active.closest("[data-rail-nav] a[href]")) return;
      dismissed.current = current.href;
      close();
    };
    const onMoved = () => {
      if (openRef.current) close();
    };
    // A locked slot opens its note on the pointer's arrival or on focus, so the tag goes in the same
    // event rather than after its 100ms leave delay: the two never share the rail's edge (E2).
    const onLocked = (e: Event) => {
      if (openRef.current && (e.target as Element | null)?.closest?.("[data-locked-slot]")) close();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", onMoved, true);
    window.addEventListener("resize", onMoved);
    document.addEventListener("pointerover", onLocked, true);
    document.addEventListener("focusin", onLocked, true);
    return () => {
      document.removeEventListener("pointerover", onLocked, true);
      document.removeEventListener("focusin", onLocked, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", onMoved, true);
      window.removeEventListener("resize", onMoved);
    };
  }, [hoverCapable, close]);

  const bind = useCallback(
    (href: string, label: string): SlotHandlers => {
      if (!hoverCapable) return {};
      // Escape's dismissal holds until another slot is entered or focused.
      const fresh = () => {
        if (dismissed.current === href) return false;
        dismissed.current = null;
        return true;
      };
      return {
        onPointerEnter: (e) => {
          if (!byPointer(e) || !fresh()) return;
          cancel();
          const slot = e.currentTarget;
          const following =
            openRef.current?.at === pathname ||
            performance.now() - closedAt.current < FOLLOW_GRACE_MS;
          if (following) show(slot, href, label);
          else openTimer.current = window.setTimeout(() => show(slot, href, label), OPEN_DELAY_MS);
        },
        onPointerLeave: (e) => {
          if (!byPointer(e)) return;
          window.clearTimeout(openTimer.current);
          scheduleClose();
        },
        onFocus: (e) => {
          if (!e.currentTarget.matches(":focus-visible") || !fresh()) return;
          cancel();
          show(e.currentTarget, href, label);
        },
        onBlur: close,
        onClick: close,
      };
    },
    [hoverCapable, cancel, show, scheduleClose, close, pathname],
  );

  const tag =
    hoverCapable && live ? (
      <span
        aria-hidden="true"
        data-rail-tag
        onPointerEnter={() => window.clearTimeout(closeTimer.current)}
        onPointerLeave={scheduleClose}
        // Fixed inside the rail's z-30 stacking context, the lock note's rank: over page content,
        // under the menus and modals at 40. The lock note's materials at name-tag size. The fade
        // is entry only and joins the reduced-motion list (E10).
        className="anim-rail-tag fixed z-10 flex h-[28px] -translate-y-1/2 items-center whitespace-nowrap rounded-[8px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-[10px] text-[12.5px] font-medium text-[color:var(--fg)] shadow-[0_10px_24px_rgba(0,0,0,.4)]"
        style={{ left: live.x, top: live.y }}
      >
        {live.label}
      </span>
    ) : null;

  return { bind, tag };
}
