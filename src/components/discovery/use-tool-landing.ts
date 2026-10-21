"use client";

import { useEffect, useRef } from "react";
import type { ToolLanding } from "../../lib/discovery/tools";
import { TOOL_PARAM } from "../../lib/discovery/tool-param";
import { takeVisit, withVisitLock } from "../../lib/moments/visit";
import { mirrorUrl } from "../../lib/url/mirror";
import { useSuppressMoment, useYieldMoment } from "../moments/moments-provider";
import { useTargets } from "./targets-provider";

/** How long a landing waits for its target to draw (a panel's first read, a hub tile) before giving up. */
export const LANDING_WAIT_MS = 8000;

/**
 * Try it's landing (discovery R2, E11): a one-time `?tool=<id>`. The page decides `landing` from the reader's own
 * switches and hands it here having already opened the tool's tab and view; this waits for the target to register,
 * scrolls the target into view, haloes it for 2.4s, and strips the parameter through `mirrorUrl`. It never presses
 * anything. A landing that haloes something TAKES the visit, then spends the tool's moment: the halo is the visit's one
 * guide, so no other moment's bubble arrives on it (d9 as Hugh's proxy, 2026-10-17; R1's one per visit). Taken under
 * the visit lock first, so the window `suppress` reopens finds the visit gone. A bubble already showing closes UNSPENT
 * (d9, same day), so its moment returns on a later visit.
 *
 * A stale `?tool=` (unknown, its switch now off, or a target that never draws within `LANDING_WAIT_MS`) is stripped
 * with no halo, and spends nothing. `scope` re-runs the landing: another deck, or a new request on the same one (the
 * page's per-render token, so a client navigation to this deck with `?tool=` lands again).
 *
 * `deferred` (Find a deck, R2 gap 11): the target is a control the reader opens later, in the next card details. The
 * parameter is stripped at once, and the landing waits for the target with no limit while the page stays mounted,
 * haloing it once when it first draws. Leaving the page ends the wait with nothing haloed or spent. The wait is held by
 * its `scope` rather than the address, so an effect replay (React's StrictMode, a dependency moving) after the strip
 * resumes it; a newer `?tool=` on the page ends it unhaloed. While it waits it also asks for the phone's next card that
 * carries the target to open at the full sheet (`askFull`, spent by the sheet), since the teaser draws no door.
 */
export function useToolLanding(
  landing: Pick<ToolLanding, "tool" | "target" | "moment"> | null,
  scope: string,
  { deferred = false }: { deferred?: boolean } = {},
): void {
  const targets = useTargets();
  const suppress = useSuppressMoment();
  const yieldBubble = useYieldMoment();
  const tool = landing?.tool ?? null;
  const target = landing?.target ?? null;
  const moment = landing?.moment ?? null;
  // The scope of a deferred landing whose parameter is stripped and whose halo has not landed yet.
  const waiting = useRef<string | null>(null);
  useEffect(() => {
    const inAddress = new URL(window.location.href).searchParams.get(TOOL_PARAM);
    const asked = inAddress ?? (deferred && waiting.current === scope ? tool : null);
    if (asked === null) return;
    const strip = () => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has(TOOL_PARAM)) return;
      url.searchParams.delete(TOOL_PARAM);
      mirrorUrl(url, window.history.state);
    };
    // The address must still name the tool the page decided on: anything else is stale here.
    if (tool === null || target === null || asked !== tool || targets === null) {
      strip();
      return;
    }
    const abort = new AbortController();
    const path = window.location.pathname;
    // A deferred landing's target lives in a card's details, which the phone opens at the teaser (no door there): ask
    // for the next card that carries the target to open at the full sheet instead, once (R3 addendum, item 12).
    const withdraw = deferred ? targets.askFull(target) : null;
    if (deferred) {
      waiting.current = scope;
      strip();
    }
    void targets.whenTarget(target, deferred ? Infinity : LANDING_WAIT_MS, abort.signal).then((el) => {
      if (abort.signal.aborted) return;
      // The target drew: the ask for the full sheet is spent whatever follows, so no later card opens full (once only).
      withdraw?.();
      // The address moved while the target was awaited (Back or Forward to another `?tool=` on this deck, before its
      // page commits): this landing is no longer asked for, so it neither haloes, spends nor strips the newer one. A
      // deferred landing stripped its own parameter already, so ANY `?tool=` now is a newer request.
      const live = new URL(window.location.href);
      const now = live.searchParams.get(TOOL_PARAM);
      if (deferred) waiting.current = null;
      if (live.pathname !== path || (deferred ? now !== null : now !== asked)) return;
      if (el !== null) {
        targets.scrollToTarget(target);
        const spend = () => {
          if (moment !== null) suppress(moment);
        };
        // Only a halo spends: a target gone between the wait and the halo leaves its tip for a later visit.
        if (targets.haloTarget(target)) {
          // One guide at a time: a bubble already showing closes, unspent, so its moment comes back on a later visit.
          const release = yieldBubble();
          void withVisitLock(() => takeVisit()).finally(() => {
            release();
            spend();
          });
        }
      }
      if (!deferred) strip();
    });
    return () => {
      abort.abort();
      withdraw?.();
    };
  }, [tool, target, moment, scope, deferred, targets, suppress, yieldBubble]);
}
