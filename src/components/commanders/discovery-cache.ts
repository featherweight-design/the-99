"use client";

import { useCallback, useState } from "react";
import { laneQuery, type LaneParams } from "../../lib/commanders/lane-params";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws without DATABASE_URL and
// pulls the neon driver in with it. A type-only clause is erased at compile
// time, so none of that reaches the client bundle.
import type { DecodedDiscovery } from "../../lib/discovery/encode";
import { mirrorUrl } from "../../lib/url/mirror";

export type SortKey = "fit" | "new";

/**
 * Hold every discovery ranking this visit has already been served, so flipping
 * back to one costs nothing.
 *
 * The sort IS the key. Availability used to be the other half of it, and is
 * gone: the discover lane has no availability control, so the scope — best fit
 * or something new — is the only parameter the server ranks on.
 *
 * The owned lane solves the same problem by shipping both rankings in one
 * payload (`commanders-view.tsx`), which discovery cannot afford: it ranks
 * thousands of rows rather than a few hundred. So the payloads are kept as they
 * arrive instead of being computed up front — nothing extra is fetched, and a
 * ranking is free the second time it is asked for.
 *
 * Deliberately NOT Next's `staleTimes`. That is a global router setting whose
 * blast radius is every route in the app, and this codebase has been burned by
 * one before. State held by the component that renders the list caches exactly
 * the thing being cached and nothing else.
 *
 * The cache lives for one visit to the screen. `DiscoveryView` stays mounted
 * across a scope flip, because that only changes search params; leaving the
 * route unmounts it and the next arrival re-fetches. That bounded life is the
 * staleness answer: a deck built elsewhere invalidates nothing here because
 * there is no "here" to invalidate by the time the reader gets back.
 */
export function useDiscoveryCache(served: DecodedDiscovery) {
  // State rather than a ref, so the payload is filed and shown in one pass. A
  // ref would have to be written during render to be readable by the very next
  // click, which is the thing React tells you not to do.
  const [cache, setCache] = useState<Map<SortKey, DecodedDiscovery>>(
    () => new Map([[served.sort, served]]),
  );
  const [view, setView] = useState<DecodedDiscovery>(served);

  // A fresh payload always wins, and is filed on its way past. Adjusted during
  // render rather than in an effect, which is what React prescribes for state
  // derived from a prop change — an effect would paint the previous ranking once
  // before correcting it. The copy is over at most two entries.
  const [prev, setPrev] = useState(served);
  if (served !== prev) {
    setPrev(served);
    setCache((m) => new Map(m).set(served.sort, served));
    setView(served);
  }

  /**
   * Show a ranking already in hand, and report whether that was possible. A miss
   * returns false and changes nothing, leaving the caller to navigate.
   *
   * `history.replaceState`, not the router: routing is the request we are
   * avoiding. The URL is written by `laneQuery`, exactly as the navigating path
   * writes it — defaults as absences, and every parameter the lane does not own
   * copied off the live URL rather than rebuilt.
   */
  const serve = useCallback(
    (sort: SortKey, params: LaneParams) => {
      const hit = cache.get(sort);
      if (hit === undefined) return false;

      const { pathname, search } = window.location;
      const next = laneQuery(new URLSearchParams(search), params, "discover");
      mirrorUrl(`${pathname}${next}`);

      setView(hit);
      return true;
    },
    [cache],
  );

  return { view, serve };
}
