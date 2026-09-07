"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discoveryCopy } from "../../lib/copy/commander-discovery";

/**
 * A URL flip plus the target it is currently heading for.
 *
 * `pending` is the value the reader asked for while the server round-trip is
 * still in flight, and null the rest of the time. Controls render it as their
 * selected option so a click registers on the frame it happened rather than when
 * the response lands, and dim themselves while it is set.
 *
 * Only the control goes optimistic. The subtitle, the receipts and the rows all
 * describe the list that is actually on screen, and flipping those early would
 * print a claim about data that has not arrived.
 */
export type Nav<T extends string> = {
  go: (next: T) => void;
  pending: T | null;
};

/**
 * The dim applied to a control waiting on a request. The value is the one
 * `FullCardTrigger` already shipped for its chip while the card modal fetches,
 * lifted here so every control that means "your press registered, the answer is
 * still coming" reads from one place rather than four literals that drift.
 *
 * Never `disabled`, for FullCardTrigger's reason: disabling the focused element
 * blurs it, and the reader would lose their place mid-flip.
 */
export const PENDING_OPACITY = 0.55;

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

// `sessionStorage` throws rather than degrades when the store is unavailable —
// Safari's private mode is the usual one. The parked scope is how a flip gets
// announced; the flip itself, and the list that lands after it, do not depend on
// it. So a throwing store costs the message and nothing else.
function parkScope(scope: "owned" | "play") {
  try {
    sessionStorage.setItem(PENDING_KEY, scope);
  } catch {
    // No announcement. The navigation still happens.
  }
}

// What the server saw for this parameter. Next hands a repeated parameter to the
// page as an array, and every parser there compares against a string, so
// `?sort=new&sort=fit` renders the default. `get()` would report the first value
// instead, and the guards below would then refuse a flip the reader can see the
// list needs — so a repeat reads as an absence on this side too.
function readOne(params: URLSearchParams, key: string): string | null {
  const all = params.getAll(key);
  return all.length === 1 ? all[0] : null;
}

function takeScope(): string | null {
  try {
    const parked = sessionStorage.getItem(PENDING_KEY);
    if (parked !== null) sessionStorage.removeItem(PENDING_KEY);
    return parked;
  } catch {
    return null;
  }
}

/**
 * Flip the scope through the URL, so the two lists stay server-rendered and a
 * shared link opens on the scope it names.
 */
export function useScopeNav(): Nav<"owned" | "play"> {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<"owned" | "play" | null>(null);

  const go = useCallback(
    (next: "owned" | "play") => {
      const params = new URLSearchParams(window.location.search);
      // Reselecting the scope already showing is not a flip. The segmented
      // control fires on any segment, including the active one, and without
      // this that click would clear a `sort` the reader had chosen, navigate
      // for a list that did not change, and park an announcement for it.
      const current = readOne(params, "scope") === "play" ? "play" : "owned";
      if (next === current) return;
      if (next === "play") params.set("scope", "play");
      else params.delete("scope");
      // A scope flip cannot carry a sort: the owned scope has no control for one,
      // so a `sort` surviving the flip would be unreachable and invisible.
      params.delete("sort");
      parkScope(next);
      setTarget(next);
      startTransition(() => router.replace(href(params), { scroll: false }));
    },
    [router],
  );

  // Masked by `isPending` rather than cleared: the transition ending is the
  // signal, and a state write to clear it would be a second render for nothing.
  return { go, pending: isPending ? target : null };
}

/**
 * Flip one discovery parameter through the URL. Unlike a scope flip these are
 * fetches, not client swaps: only the active (sort, avail) pair is ranked on the
 * server, so the other ordering does not exist until it is asked for.
 *
 * `fit` and `free` are the defaults and are written as absences, which keeps a
 * shared link short and matches how the owned scope serialises `avail`.
 */
function useParamNav<T extends string>(key: string, nonDefault: T): Nav<T> {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<T | null>(null);

  const go = useCallback(
    (next: T) => {
      const params = new URLSearchParams(window.location.search);
      // Same guard as the scope flip's: both controls fire on their active
      // option too, and a round-trip that re-ranks nothing is still a fetch.
      // Only two values, so "is it the non-default one" identifies both.
      if ((readOne(params, key) === nonDefault) === (next === nonDefault)) return;
      if (next === nonDefault) params.set(key, next);
      else params.delete(key);
      setTarget(next);
      startTransition(() => router.replace(href(params), { scroll: false }));
    },
    [router, key, nonDefault],
  );

  return { go, pending: isPending ? target : null };
}

export function useSortNav(): Nav<"fit" | "new"> {
  return useParamNav<"fit" | "new">("sort", "new");
}

export function useAvailNav(): Nav<"all" | "free"> {
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
    if (takeScope() !== scope) return;
    announce(discoveryCopy.scope.announce(scope, count, sort));
  }, [scope, count, sort, announce]);
}
