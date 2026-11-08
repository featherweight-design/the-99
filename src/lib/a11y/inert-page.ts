"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Holds the rest of the page still while a modal is up: the page behind it takes no press, no focus and no screen
 * reader's attention. `Sheet` calls it for every modal sheet; the collection side sheets and the tour call it with
 * their own host. Every other `aria-modal` surface calls `useInertWhileOpen`, which hands back a ref for the element that
 * holds the surface and its scrim.
 *
 * Marks `inert` every sibling on the way from the modal's host up to `<body>`, rather than `<main>` itself: the host is
 * portalled INTO `<main>` (so every probe scoped to the page still finds it), and an inert `<main>` would make the modal
 * inert with it.
 *
 * LATE MOUNTS. A node added beside that path after the modal opened (a toast, a portal) is made inert too, by an
 * observer on each parent along the way. Two kinds of late node stay live: one that holds an `aria-modal` surface of its
 * own (a card modal opened over a sheet is a later child of `<main>`, the rule `sheet-host.ts` states), and one marked
 * `INERT_EXEMPT`.
 *
 * EXEMPT. Four portals are documented as deliberately live while a sheet is up: the account menu, the help button, and
 * the push-how and iOS install sheets. Each carries `inertExemptProps` on its root (a direct child of `<body>`; the marker is read on the sibling itself, not below it), and so does a sheet's own scrim,
 * which sits beside its panel. A live region (`aria-live`, `status`, `alert`) that holds no control is never made inert: it would
 * silence its announcements. One that holds a control (a notice with an Open link) is held with the rest. An element that was already inert for another reason is not ours and is left as found.
 *
 * A layout effect, so its cleanup runs before the dialog hook's passive one restores focus: the control that opened the
 * modal is out of `inert` by the time focus returns to it.
 */
export const INERT_EXEMPT = "data-inert-exempt";
/** Spread onto the root of a portal that stays live under a modal, or a sheet's scrim. */
export const inertExemptProps = { [INERT_EXEMPT]: "" } as const;

/** A live region that holds a control is page chrome (the seat notice's Open and dismiss), and is held like any other. */
const PRESSABLE = 'a[href], button, input, select, textarea, [tabindex]';
const LIVE =
  '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]';

function leaveAlone(el: Element): boolean {
  return (
    el.hasAttribute("inert") ||
    el.tagName === "SCRIPT" ||
    el.tagName === "STYLE" ||
    el.hasAttribute(INERT_EXEMPT) ||
    (el.matches(LIVE) && el.querySelector(PRESSABLE) === null)
  );
}

/**
 * How many live holds each element is under. Modals overlap (a card over a sheet, a receipt over a confirm), and
 * `inert` is one attribute: without a count, the first modal to close would hand the page back under the second.
 */
const holds = new WeakMap<Element, number>();

export function useInertPage(host: HTMLElement | null, active: boolean) {
  useLayoutEffect(() => {
    if (!active || !host) return;
    const marked = new Set<Element>();
    const hold = (el: Element) => {
      const held = holds.get(el);
      if (held === undefined) {
        if (leaveAlone(el)) return;
        el.setAttribute("inert", "");
      }
      holds.set(el, (held ?? 0) + 1);
      marked.add(el);
    };
    const observers: MutationObserver[] = [];
    for (
      let el: Element | null = host;
      el && el !== document.body;
      el = el.parentElement
    ) {
      const parent: Element | null = el.parentElement;
      if (!parent) break;
      for (const sibling of Array.from(parent.children))
        if (sibling !== el) hold(sibling);
      const path = el;
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of Array.from(record.addedNodes)) {
            // A modal surface of its own, mounted over this one, stays live.
            if (!(node instanceof Element) || node === path || marked.has(node))
              continue;
            if (
              node.matches('[aria-modal="true"]') ||
              node.querySelector('[aria-modal="true"]') !== null
            )
              continue;
            hold(node);
          }
        }
      });
      observer.observe(parent, { childList: true });
      observers.push(observer);
    }
    return () => {
      for (const observer of observers) observer.disconnect();
      for (const el of marked) {
        const left = (holds.get(el) ?? 1) - 1;
        if (left > 0) holds.set(el, left);
        else {
          holds.delete(el);
          el.removeAttribute("inert");
        }
      }
    };
  }, [host, active]);
}

/**
 * `useInertPage` for a modal that is not a `Sheet` and has no host element of its own: spread the returned callback as
 * the `ref` of the element that holds BOTH the surface and its scrim (the scrim is a sibling of the panel, so a host
 * that is only the panel would make the scrim inert and a press on it would stop dismissing). Pass `open`, or `true`
 * for a surface that is mounted only while it is up.
 */
export function useInertWhileOpen(open: boolean): (el: HTMLElement | null) => void {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useInertPage(host, open);
  return setHost;
}
