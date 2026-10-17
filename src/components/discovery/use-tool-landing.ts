"use client";

import { useEffect } from "react";
import { TOOL_PARAM, type ToolLanding } from "../../lib/discovery/tools";
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
 * with no halo, and spends nothing. `scope` re-runs the landing for a new page of the same route (another deck).
 */
export function useToolLanding(landing: Pick<ToolLanding, "tool" | "target" | "moment"> | null, scope: string): void {
  const targets = useTargets();
  const suppress = useSuppressMoment();
  const yieldBubble = useYieldMoment();
  const tool = landing?.tool ?? null;
  const target = landing?.target ?? null;
  const moment = landing?.moment ?? null;
  useEffect(() => {
    const asked = new URL(window.location.href).searchParams.get(TOOL_PARAM);
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
    void targets.whenTarget(target, LANDING_WAIT_MS, abort.signal).then((el) => {
      if (abort.signal.aborted) return;
      if (el !== null) {
        targets.scrollToTarget(target);
        const spend = () => {
          if (moment !== null) suppress(moment);
        };
        if (targets.haloTarget(target)) {
          // One guide at a time: a bubble already showing closes, unspent, so its moment comes back on a later visit.
          yieldBubble();
          void withVisitLock(() => takeVisit()).finally(spend);
        }
        else spend();
      }
      strip();
    });
    return () => abort.abort();
  }, [tool, target, moment, scope, targets, suppress, yieldBubble]);
}
