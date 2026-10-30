"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COVERED_WITH_MAIN } from "../shell/covered-layer";
import { momentsCopy, type MomentCopy } from "../../lib/copy/moments";
import { visibleFocusables } from "../../lib/a11y/dialog";
import { TOUCH_HIT } from "../ui/touch-hit";

/**
 * A moment's bubble (handoff Q1; property table `design-tables/discovery.md`, "Moment bubble"). A labelled, non-modal
 * note beside its control, which keeps the halo while it shows. Nothing moves: it is portalled out of the flow, under
 * every sheet, dialog, menu and toast (z 35: over the rail and sticky heads, under the tab bar's and the scrims' 40;
 * audit resolution 3), and into the topmost modal when its control lives there (M8, M9), where Esc closes the bubble
 * alone.
 *
 * Placement: below the control, 10px clear of it with the nib between; above when below would leave the viewport or
 * cross the phone's tab bar; `right` beside a rail slot. Clamped 16px from the edges with the nib kept on the
 * control's centre, and re-placed on every scroll and resize, so it travels with its control.
 */
export type MomentPlace = "below" | "right";

const GAP = 10;
const EDGE = 16;
const PHONE = 768;

type Spot = { top: number; left: number; width: number; side: "below" | "above" | "right"; nib: number };

/** The tab bar's height as the control sees it: the shell sets 88px on a wrapper while locked, not on the root. */
function tabBarHeight(anchor: HTMLElement): number {
  if (window.innerWidth >= PHONE) return 0;
  const v = parseFloat(getComputedStyle(anchor).getPropertyValue("--tabbar-h"));
  return Number.isFinite(v) ? v : 0;
}

type Box = { top: number; bottom: number; left: number; right: number };

/** The bubble's width: at most 358 on a phone and 300 from it, and never wider than the bounds less 16px a side. */
export function bubbleWidth(bounds: Box, phone: boolean): number {
  return Math.min(phone ? 358 : 300, bounds.right - bounds.left - EDGE * 2);
}

/**
 * Where the bubble goes, in viewport coordinates. Pure over the boxes it is handed. `bounds` is what the bubble may
 * occupy: the viewport above the phone's tab bar, cut to the open modal's own box when it lives inside one, since the
 * modal clips what overflows it.
 */
export function placeBubble(r: Box, size: { height: number }, bounds: Box, phone: boolean, place: MomentPlace): Spot {
  const width = bubbleWidth(bounds, phone);
  const cx = (r.left + r.right) / 2;
  const cy = (r.top + r.bottom) / 2;
  if (place === "right") {
    const top = Math.max(bounds.top + EDGE, Math.min(cy - size.height / 2, bounds.bottom - EDGE - size.height));
    return { top, left: r.right + GAP, width, side: "right", nib: Math.max(12, Math.min(cy - top, size.height - 12)) };
  }
  const left = Math.max(bounds.left + EDGE, Math.min(cx - width / 2, bounds.right - EDGE - width));
  const nib = Math.max(12, Math.min(cx - left, width - 12));
  const below = r.bottom + GAP;
  if (below + size.height <= bounds.bottom - EDGE || r.top - GAP - size.height < bounds.top + EDGE) {
    return { top: below, left, width, side: "below", nib };
  }
  return { top: r.top - GAP - size.height, left, width, side: "above", nib };
}

/**
 * The control after `el` in tab order, skipping the bubble: the visible, reachable ones only (`visibleFocusables`), and
 * inside the open modal when the control is in one, wrapping as its own trap does.
 */
function nextTabbable(el: HTMLElement, skip: HTMLElement, scope: HTMLElement): HTMLElement | null {
  const all = visibleFocusables(scope).filter((n) => !skip.contains(n));
  // After the control, or after the last stop inside it when it is a group (the Matchups switch is a radiogroup of
  // radios). A control out of the tab order (an inactive tab, under roving tabindex) is placed by document order.
  const next = all.findIndex((n) => !el.contains(n) && (el.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
  if (next >= 0) return all[next];
  return scope === document.body ? null : (all[0] ?? null);
}

/** What `focus()` can land on, whatever its place in the tab order. */
const FOCUSABLE_SELF = "button, a[href], input, select, textarea, [tabindex]";

export function MomentBubble({
  id,
  anchor,
  copy,
  place = "below",
  leaving = false,
  onDismiss,
}: {
  id: string;
  anchor: HTMLElement;
  copy: MomentCopy;
  place?: MomentPlace;
  leaving?: boolean;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [entered, setEntered] = useState(false);
  const container = anchor.closest<HTMLElement>('[aria-modal="true"]') ?? document.body;

  // Place it, and keep it on its control through every scroll (any scroller: capture) and resize.
  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const node = ref.current;
      if (!node) return;
      const r = anchor.getBoundingClientRect();
      const phone = window.innerWidth < PHONE;
      let bounds: Box = { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight - tabBarHeight(anchor) };
      if (container !== document.body) {
        const c = container.getBoundingClientRect();
        bounds = {
          top: Math.max(bounds.top, c.top),
          left: Math.max(bounds.left, c.left),
          right: Math.min(bounds.right, c.right),
          bottom: Math.min(bounds.bottom, c.bottom),
        };
      }
      // The final width first, so the height read is the height the bubble will have once placed.
      node.style.width = `${bubbleWidth(bounds, phone)}px`;
      const s = placeBubble(r, { height: node.offsetHeight }, bounds, phone, place);
      // Viewport to the container's own coordinates: the body's are the page's, a modal's are its box's.
      const parent = node.offsetParent as HTMLElement | null;
      if (parent === null || parent === document.body || parent === document.documentElement) {
        setSpot({ ...s, top: s.top + window.scrollY, left: s.left + window.scrollX });
      } else {
        const p = parent.getBoundingClientRect();
        setSpot({ ...s, top: s.top - p.top + parent.scrollTop, left: s.left - p.left + parent.scrollLeft });
      }
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [anchor, place, container]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // The halo, on the control itself (`[data-moment-halo]` in globals.css): a box shadow, so nothing moves.
  useEffect(() => {
    if (leaving) return;
    anchor.setAttribute("data-moment-halo", "");
    return () => anchor.removeAttribute("data-moment-halo");
  }, [anchor, leaving]);

  // Esc dismisses, ahead of any modal's own Esc (capture on window), so in card details it closes the bubble alone. A
  // press anywhere but the bubble dismisses too: the control's own press still goes on to open its tool. Tab from the
  // control reaches the ✕ next, and Tab from the ✕ goes on to what follows the control.
  // Where focus left the control for the ✕, so it goes back there: the control itself, or the stop inside it when the
  // control is a group that takes no focus of its own.
  const cameFrom = useRef<HTMLElement | null>(null);
  const backToControl = useCallback(() => {
    const from = cameFrom.current;
    const to =
      from?.isConnected && anchor.contains(from)
        ? from
        : anchor.matches(FOCUSABLE_SELF)
          ? anchor
          : // A group that takes no focus itself: its own stop (the selected radio, under roving tabindex).
            (anchor.querySelector<HTMLElement>('[tabindex="0"]') ?? anchor.querySelector<HTMLElement>(FOCUSABLE_SELF) ?? anchor);
    to.focus();
  }, [anchor]);
  useEffect(() => {
    if (leaving) return;
    const onKey = (e: KeyboardEvent) => {
      // Under a navigation's screen (`COVERED_WITH_MAIN`) the bubble is out of reach: its keys go to the live shell.
      if (ref.current?.closest("[inert]")) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        // Focus inside the bubble would be lost with it: hand it back to the control.
        const inside = ref.current?.contains(document.activeElement) ?? false;
        onDismiss();
        if (inside) backToControl();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const at = document.activeElement;
      // Stopped as well as prevented: a modal's own trap listens on window too, and would undo the move.
      if (at instanceof HTMLElement && anchor.contains(at) && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        cameFrom.current = at;
        closeRef.current?.focus();
      } else if (at === closeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) backToControl();
        else {
          const next = nextTabbable(anchor, ref.current, container);
          if (next) next.focus();
          else backToControl();
        }
      }
    };
    // A press anywhere but the bubble, by pointer or by keyboard and assistive tech (a click with no pointerdown).
    // Caught on the way down, before the tool's own handler runs, and never prevented, so the tool still opens.
    const onPress = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPress, true);
    window.addEventListener("click", onPress, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPress, true);
      window.removeEventListener("click", onPress, true);
    };
  }, [anchor, backToControl, container, leaving, onDismiss]);

  const shown = entered && !leaving && spot !== null;
  const nib =
    spot === null
      ? undefined
      : spot.side === "right"
        ? { top: spot.nib - 5, left: -6, borderWidth: "0 0 1px 1px" }
        : spot.side === "below"
          ? { top: -6, left: spot.nib - 5, borderWidth: "1px 0 0 1px" }
          : { bottom: -6, left: spot.nib - 5, borderWidth: "0 1px 1px 0" };

  // On the body (outside <main>) its ✕ dismisses the page's moment, so it goes inert with <main> under a navigation's
  // screen (`COVERED_WITH_MAIN`). The mark sits on a static wrapper, not the bubble, whose own `inert` React owns while
  // it leaves; static, so the bubble's offset parent is still the body. In a modal (inside <main>) it needs none.
  return createPortal(
    <div {...(container === document.body ? { [COVERED_WITH_MAIN]: "" } : {})}>
      <div
        ref={ref}
        // The leave fade is a picture of a bubble already gone: nothing to name or reach.
        id={leaving ? undefined : id}
        role={leaving ? undefined : "note"}
        aria-label={leaving ? undefined : momentsCopy.noteName(copy.tool)}
        aria-hidden={leaving || undefined}
        inert={leaving || undefined}
        data-moment-bubble=""
        style={{
          top: spot?.top ?? 0,
          left: spot?.left ?? 0,
          width: spot?.width ?? undefined,
          visibility: spot === null ? "hidden" : undefined,
        }}
        className={
          "absolute z-[35] box-border flex items-start gap-[10px] rounded-[10px] border border-solid " +
          "border-[color:var(--border-strong)] bg-[color:var(--elevated)] py-[10px] pl-[12px] pr-0 " +
          "shadow-[0_12px_30px_rgba(0,0,0,0.45)] md:pr-[4px] " +
          "transition-[opacity,translate] duration-200 ease-[var(--motion-ease-out)] motion-reduce:translate-y-0 " +
          (leaving ? "pointer-events-none duration-[var(--motion-exit-quick)] motion-reduce:duration-0 " : "") +
          (shown ? "translate-y-0 opacity-100" : "translate-y-[4px] opacity-0")
        }
      >
        {nib && (
          <span
            aria-hidden="true"
            style={nib}
            className="absolute h-[10px] w-[10px] rotate-45 border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)]"
          />
        )}
        <span aria-hidden="true" className="mt-[7px] inline-block h-[6px] w-[6px] shrink-0 rotate-45 bg-[color:var(--accent)]" />
        <p className="m-0 line-clamp-3 min-w-0 flex-1 text-[13.5px] leading-[1.45] text-[color:var(--fg-body)] md:text-[13px]">
          <span className="font-semibold text-[color:var(--fg)]">{copy.tool}</span> {copy.line}
        </p>
        <button
          ref={closeRef}
          type="button"
          // Reached only after its control (the Tab handling above), never again at the portal's end of the document.
          tabIndex={-1}
          aria-label={momentsCopy.dismiss}
          onClick={(e) => {
            // A keyboard press (no pointer, `detail` 0) puts focus back on the control rather than losing it.
            const keyboard = e.detail === 0;
            onDismiss();
            if (keyboard) backToControl();
          }}
          className={`${TOUCH_HIT} -mt-[4px] flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-[14px] leading-none text-[color:var(--fg-faint)] md:text-[13px] hover:text-[color:var(--fg)]`}
        >
          ✕
        </button>
      </div>
    </div>,
    container,
  );
}
