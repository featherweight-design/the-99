"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discoveryCopy } from "../../lib/copy/commander-discovery";

// The scope a flip is heading for, parked across the navigation.
//
// A flip swaps one list component for the other, so nothing that could hold the
// message in state survives to speak it, and announcing at click time would name
// a count the server has not produced yet. The target is written here, and
// whichever list mounts under it reads it back once and clears it.
const PENDING_KEY = "commanders:scope-announce";

// Both defaults serialise as absences, so clearing the last parameter empties the
// string — and `?` alone is a URL the reader would see in their address bar and
// could paste back in. The bare path is the same page and says nothing extra.
function href(params: URLSearchParams) {
  const query = params.toString();
  return query ? `?${query}` : window.location.pathname;
}

/**
 * Flip the scope through the URL, so the two lists stay server-rendered and a
 * shared link opens on the scope it names.
 */
export function useScopeNav() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return useCallback(
    (next: "owned" | "play") => {
      const params = new URLSearchParams(window.location.search);
      if (next === "play") params.set("scope", "play");
      else params.delete("scope");
      // A scope flip cannot carry a sort: the owned scope has no control for one,
      // so a `sort` surviving the flip would be unreachable and invisible.
      params.delete("sort");
      sessionStorage.setItem(PENDING_KEY, next);
      startTransition(() => router.replace(href(params), { scroll: false }));
    },
    [router],
  );
}

/**
 * Flip one discovery parameter through the URL. Unlike a scope flip these are
 * fetches, not client swaps: only the active (sort, avail) pair is ranked on the
 * server, so the other ordering does not exist until it is asked for.
 *
 * `fit` and `free` are the defaults and are written as absences, which keeps a
 * shared link short and matches how the owned scope serialises `avail`.
 */
function useParamNav<T extends string>(key: string, nonDefault: T) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return useCallback(
    (next: T) => {
      const params = new URLSearchParams(window.location.search);
      if (next === nonDefault) params.set(key, next);
      else params.delete(key);
      startTransition(() => router.replace(href(params), { scroll: false }));
    },
    [router, key, nonDefault],
  );
}

export function useSortNav() {
  return useParamNav<"fit" | "new">("sort", "new");
}

export function useAvailNav() {
  return useParamNav<"all" | "free">("avail", "all");
}

/**
 * Announce a re-rank once the server's new ordering has landed. The list stays
 * mounted across a sort or availability flip, so unlike the scope message these
 * are driven off the prop changing rather than a key parked in `sessionStorage`.
 */
export function useRerankAnnouncement<T>(
  value: T,
  message: (value: T) => string,
  announce: (message: string) => void,
) {
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    announce(message(value));
  }, [value, message, announce]);
}

/**
 * Announce a flip that has just landed, on the list's own live region. Does
 * nothing on an ordinary page load. The count is the one the server produced,
 * which is why this is read on arrival rather than written at click time.
 *
 * Takes the setter rather than returning a string: each list already owns one
 * live region carrying every message it sends, and a second source of truth for
 * that region would let two announcements race for it.
 */
export function useScopeAnnouncement(
  scope: "owned" | "play",
  count: number,
  sort: "fit" | "new",
  announce: (message: string) => void,
) {
  // Once per mount. The pending key is consumed on arrival, so a later re-render
  // with a different count must not speak again.
  const read = useRef(false);

  useEffect(() => {
    if (read.current) return;
    read.current = true;
    if (sessionStorage.getItem(PENDING_KEY) !== scope) return;
    sessionStorage.removeItem(PENDING_KEY);
    announce(discoveryCopy.scope.announce(scope, count, sort));
  }, [scope, count, sort, announce]);
}
