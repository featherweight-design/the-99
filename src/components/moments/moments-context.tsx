"use client";
// What a control reads of the Moments: the anchor and context shapes, the context, and the hooks a control calls to become a
// moment's anchor. Outside the provider every hook does nothing. The provider that owns the visit, the bubble and the writes
// is `moments-provider.tsx`, which re-exports these; this file imports no action.

import { createContext, useContext, useEffect, useState } from "react";

import type { MomentCopy } from "../../lib/copy/moments";
import type { MomentId } from "../../lib/moments/registry";
import { useTarget } from "../discovery/targets-provider";
import { useMergedRef } from "../ui/use-merged-ref";
import type { MomentPlace } from "./moment-bubble";

/** `fallback`: this control stands in for the moment's own, and counts only while no other control of that moment is
 *  registered (audit resolution 2: M3 and M4 fall back to the Analysis tab when their shortcut is not drawn). */
export type Anchor = { id: MomentId; el: HTMLElement; copy: MomentCopy; place: MomentPlace; fallback?: boolean };
export type Ctx = {
  register: (anchor: Anchor) => () => void;
  /** Spends a moment without showing it (the landing, discovery R2 E11). */
  suppress: (id: MomentId) => void;
  /** Closes whatever bubble is showing without spending it (a landing's halo is the visit's one guide). */
  /** Closes any bubble and holds every delivery until the returned release is called (a landing's halo). */
  yieldBubble: () => () => void;
  /** The control the bubble shows beside: one moment can have several anchors (each row, the rail and the tab bar). */
  showingEl: HTMLElement | null;
  noteId: string;
};

export const MomentsContext = createContext<Ctx | null>(null);

/**
 * Closes whatever bubble is showing without spending it, so its moment returns on a later visit (d9 as Hugh's proxy,
 * 2026-10-17: a landing's halo is the one guide on screen). A bubble past its `SPENT_AFTER_MS` was already spent by
 * R1's own rule, as seen. Outside the provider it does nothing.
 */
export function useYieldMoment(): () => () => void {
  return useContext(MomentsContext)?.yieldBubble ?? holdNothing;
}

/** Spends a moment without showing it (the landing, discovery R2 E11). Outside the provider it does nothing. */
export function useSuppressMoment(): (id: MomentId) => void {
  return useContext(MomentsContext)?.suppress ?? noop;
}
const noop = () => {};
const holdNothing = () => noop;

/**
 * Makes a control a moment's anchor while `eligible` (its condition holds on the reader's own data). Spread the
 * result on the control: `ref` registers it, and `aria-describedby` points at the bubble while it shows. Outside the
 * provider, or for a moment that is not live or already spent, it does nothing. A `fallback` anchor stands in for the
 * moment's own control and counts only while no other anchor of that moment is registered.
 *
 * While eligible the control is also the moment's TARGET (`useTarget`, discovery R2), so the landing and Show me reach
 * it with no second registration. A fallback is never a target, and `target: false` keeps a control out of the
 * registry: a shortcut that is not the tool's own control (the spine's trim line, the land cell, the Analysis tab),
 * or a control that registers its target itself on a wider rule than the moment's (the Matchups split).
 */
export function useMomentAnchor(
  id: MomentId,
  {
    eligible,
    copy,
    place = "below",
    fallback = false,
    target = true,
  }: { eligible: boolean; copy: MomentCopy; place?: MomentPlace; fallback?: boolean; target?: boolean },
): { ref: (el: HTMLElement | null) => void; "aria-describedby"?: string } {
  const ctx = useContext(MomentsContext);
  const [el, setEl] = useState<HTMLElement | null>(null);
  const register = ctx?.register;
  const { tool, line } = copy;
  useEffect(() => {
    if (!register || !eligible || el === null) return;
    return register({ id, el, copy: { tool, line }, place, fallback });
  }, [register, eligible, el, id, tool, line, place, fallback]);
  const targetRef = useTarget(eligible && target && !fallback ? id : null);
  const ref = useMergedRef(setEl, targetRef);
  const shown = ctx !== null && el !== null && ctx.showingEl === el;
  return { ref, ...(shown ? { "aria-describedby": ctx.noteId } : {}) };
}
