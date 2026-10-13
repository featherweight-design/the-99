"use client";

import { useCallback, useState } from "react";
import { laneQuery, type LaneParams } from "../../lib/commanders/lane-params";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws without DATABASE_URL and
// pulls the neon driver in with it. A type-only clause is erased at compile
// time, so none of that reaches the client bundle.
import type { DecodedDiscovery } from "../../lib/discovery/encode";
import type { RoleBasis } from "../../lib/profile/build";
import { mirrorUrl } from "../../lib/url/mirror";

export type SortKey = "fit" | "new";

/** A ranking as served, with the role basis its payload was counted by. */
type Entry = { list: DecodedDiscovery; basis: RoleBasis };

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
 *
 * Each entry keeps the ROLE BASIS its payload was counted by (`basis`, the page's
 * LABEL_ROLE_COUNTS_ENABLED at render), and `viewBasis` is the drawn entry's (admin PR 6d-2). An
 * app-wide flip can land between two navigations, so a ranking served back out of the cache may be
 * the other basis's from the latest payload's; the fields fetch has to ask for the basis of the rows
 * on screen. Stored per entry rather than keyed on, so the sort stays the key and a fresh payload
 * still replaces its sort's entry outright, whatever basis the old one had.
 */
export function useDiscoveryCache(served: DecodedDiscovery, basis: RoleBasis) {
  // State rather than a ref, so the payload is filed and shown in one pass. A
  // ref would have to be written during render to be readable by the very next
  // click, which is the thing React tells you not to do.
  const [cache, setCache] = useState<Map<SortKey, Entry>>(
    () => new Map([[served.sort, { list: served, basis }]]),
  );
  const [view, setView] = useState<Entry>({ list: served, basis });

  // A fresh payload always wins, and is filed on its way past. Adjusted during
  // render rather than in an effect, which is what React prescribes for state
  // derived from a prop change — an effect would paint the previous ranking once
  // before correcting it. The copy is over at most two entries.
  const [prev, setPrev] = useState(served);
  if (served !== prev) {
    setPrev(served);
    const entry = { list: served, basis };
    setCache((m) => new Map(m).set(served.sort, entry));
    setView(entry);
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

  return { view: view.list, viewBasis: view.basis, serve };
}
