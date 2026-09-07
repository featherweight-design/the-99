"use client";

import { useCallback, useState } from "react";
// Type-only, and required rather than stylistic: `src/lib/discovery/list.ts`
// reaches `src/db/index.ts`, whose module body throws without DATABASE_URL and
// pulls the neon driver in with it. A type-only clause is erased at compile
// time, so none of that reaches the client bundle.
import type { DiscoveryList } from "../../lib/discovery/list";

export type AvailMode = "all" | "free";
export type SortKey = "fit" | "new";

/** One entry per (sort, availability) pair — the two parameters the server ranks on. */
function cacheKey(sort: SortKey, avail: AvailMode) {
  return `${sort}:${avail}`;
}

type View = { list: DiscoveryList; avail: AvailMode };

/**
 * Hold every discovery ranking this visit has already been served, so flipping
 * back to one costs nothing.
 *
 * The owned scope solves the same problem by shipping both rankings in one
 * payload (`commanders-view.tsx`), which discovery cannot afford: it ranks
 * thousands of rows against four (sort, availability) pairs rather than a few
 * hundred against two. So the payloads are kept as they arrive instead of being
 * computed up front — nothing extra is fetched, and a pair is free the second
 * time it is asked for.
 *
 * Deliberately NOT Next's `staleTimes`. That is a global router setting whose
 * blast radius is every route in the app, and this codebase has been burned by
 * one before. State held by the component that renders the list caches exactly
 * the thing being cached and nothing else.
 *
 * The cache lives for one visit to the screen. `DiscoveryView` stays mounted
 * across a sort or availability flip, because those only change search params;
 * leaving the route unmounts it and the next arrival re-fetches. That bounded
 * life is the staleness answer: a deck built elsewhere invalidates nothing here
 * because there is no "here" to invalidate by the time the reader gets back.
 */
export function useDiscoveryCache(
  served: DiscoveryList,
  servedAvail: AvailMode,
) {
  // State rather than a ref, so the payload is filed and shown in one pass. A
  // ref would have to be written during render to be readable by the very next
  // click, which is the thing React tells you not to do.
  const [cache, setCache] = useState<Map<string, DiscoveryList>>(
    () => new Map([[cacheKey(served.sort, servedAvail), served]]),
  );
  const [view, setView] = useState<View>({ list: served, avail: servedAvail });

  // A fresh payload always wins, and is filed on its way past. Adjusted during
  // render rather than in an effect, which is what React prescribes for state
  // derived from a prop change — an effect would paint the previous ranking once
  // before correcting it. The copy is over at most four entries.
  const [prevServed, setPrevServed] = useState(served);
  if (served !== prevServed) {
    setPrevServed(served);
    setCache((m) => new Map(m).set(cacheKey(served.sort, servedAvail), served));
    setView({ list: served, avail: servedAvail });
  }

  /**
   * Show a pair already in hand, and report whether that was possible. A miss
   * returns false and changes nothing, leaving the caller to navigate.
   *
   * `history.replaceState`, not the router: routing is the request we are
   * avoiding. This is the same mechanism the colour filter already uses to
   * mirror `?c=`, and it keeps the address bar honest so a reader who copies
   * the URL gets the view they are looking at. Every other parameter is read
   * back off the live URL rather than rebuilt, so this cannot drop one.
   */
  const serve = useCallback(
    (sort: SortKey, avail: AvailMode) => {
      const hit = cache.get(cacheKey(sort, avail));
      if (hit === undefined) return false;

      const params = new URLSearchParams(window.location.search);
      // Both defaults serialise as absences, matching how `list-nav` writes them:
      // the guards there compare against the URL, so a cached flip that wrote
      // `?sort=fit` would leave them unable to tell a default from a choice.
      if (sort === "new") params.set("sort", sort);
      else params.delete("sort");
      if (avail === "all") params.set("avail", avail);
      else params.delete("avail");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );

      setView({ list: hit, avail });
      return true;
    },
    [cache],
  );

  return { view, serve };
}
