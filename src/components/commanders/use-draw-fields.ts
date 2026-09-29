"use client";

// The draw fields `/discover`'s page withheld, fetched in the background (list payload plan, PR 3).
//
// The page ships the art, the sentence, the gap line and the fit parts for its URL's first window
// only. Everything else arrives from `/api/discovery-fields`, under three rules that come from a
// measurement rather than a preference (#1108: background image downloads on the slow profile
// turned the next navigation's 8s into 26-49s):
//
//   1. ONE BATCH IN FLIGHT, never two. Rows the reader is waiting on go first; the rest follow
//      in the order the reader sees them.
//   2. THE BACKGROUND WAITS FOR AN IDLE MOMENT after first paint (`requestIdleCallback`, a short
//      timeout where it does not exist). A batch for rows the reader is waiting on does not wait.
//   3. LEAVING STOPS IT. A navigation to another route aborts the batch in flight and starts no
//      other, and so does unmounting: a click on a link to another path, the Navigation API's own
//      `navigate` event where the browser has it, or the page being hidden.
//
// Fields are held per payload, not per sort: `rank` and the fit figures belong to a ranking, and a
// fresh payload of the same ranking may have moved them.
import { useCallback, useEffect, useState } from "react";
import { isDrawn, type DiscoveryRow, type DrawFields } from "../../lib/discovery/encode";
import { MAX_FIELDS_BATCH } from "../../lib/discovery/fields-batch";
import type { DiscoveryItem } from "../../lib/discovery/list";

type Sort = "fit" | "new";

/** How long the background waits for an idle moment where the browser has no `requestIdleCallback`. */
const IDLE_FALLBACK_MS = 200;

/** The pauses before a failed batch the reader is waiting on is asked for again. */
const RETRY_MS = [1_000, 3_000, 9_000];

type NavigationLike = EventTarget & object;
type NavigateEventLike = Event & { destination?: { url?: string } };

type LoopInput = { sort: Sort; all: DiscoveryRow[]; wanted: DiscoveryRow[]; wantedKey: string };

/**
 * The fetch loop, held OUTSIDE React state. A render is asked for only when a batch lands rows the
 * reader is waiting on: a batch for rows nobody is looking at has nothing to draw, and held as
 * state each one re-rendered the whole view about four times.
 */
function createFieldsLoop(onLanded: () => void) {
  let onStale = () => {};
  // Fields belong to the PAYLOAD they complete, never to a sort: a fresh server payload (a refresh,
  // a navigation back) is a new list and starts empty, while a ranking served again from the
  // client cache is the same list and keeps what it had. Held weakly, so a list the view has let
  // go takes its fields with it.
  const lists = new WeakMap<DiscoveryRow[], { store: Map<string, DrawFields>; asked: Set<string> }>();
  const forList = (all: DiscoveryRow[]) => {
    let entry = lists.get(all);
    if (!entry) {
      // `asked`: slugs already asked for, whatever came back, so a slug is not asked twice.
      entry = { store: new Map(), asked: new Set() };
      lists.set(all, entry);
    }
    return entry;
  };
  let controller: AbortController | null = null;
  let cancelScheduled: (() => void) | null = null;
  let left = false;
  // A failed batch stops the BACKGROUND. One the reader is waiting on is retried on its own
  // after a pause, since `Show more` ignores a press while it waits; past the last pause the
  // reader's next change of window asks again.
  let failedAt: string | null = null;
  let retries = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let input: LoopInput = { sort: "fit", all: [], wanted: [], wantedKey: "" };

  const unschedule = () => {
    cancelScheduled?.();
    cancelScheduled = null;
  };
  const unretry = () => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  };

  const pump = () => {
    if (left || controller || cancelScheduled) return;
    const { sort, all, wanted, wantedKey } = input;
    const { store, asked } = forList(all);
    const needs = (row: DiscoveryRow) =>
      !isDrawn(row) && !store.has(row.slug) && !asked.has(row.slug);
    const waiting = wanted.filter(needs).map((r) => r.slug);
    const urgent = waiting.length > 0;
    if (failedAt !== null && (failedAt === wantedKey || !urgent)) return;
    // The next batch: rows the reader is waiting on, then the rest in the order they are listed.
    const batch = [...waiting];
    const seen = new Set(batch);
    for (const r of all) {
      if (batch.length >= MAX_FIELDS_BATCH) break;
      if (!seen.has(r.slug) && needs(r)) {
        batch.push(r.slug);
        seen.add(r.slug);
      }
    }
    if (batch.length === 0) return;
    const run = () => {
      cancelScheduled = null;
      if (left) return;
      const ac = new AbortController();
      controller = ac;
      for (const s of batch) asked.add(s);
      const url = `/api/discovery-fields?sort=${sort}&s=${batch.map(encodeURIComponent).join(",")}`;
      fetch(url, { signal: ac.signal, credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`fields ${r.status}`))))
        .then((body: { fields: Record<string, DrawFields> }) => {
          for (const [slug, f] of Object.entries(body.fields)) store.set(slug, f);
          // The route leaves out a slug its reader's list no longer holds: this page's list is
          // stale (a write elsewhere, a catalog refresh). A row the reader is waiting on then
          // never arrives, so the page is read again rather than left busy.
          if (batch.some((s) => waiting.includes(s) && !Object.hasOwn(body.fields, s))) onStale();
          if (input.all === all && input.wanted.some((r) => !isDrawn(r) && Object.hasOwn(body.fields, r.slug))) onLanded();
        })
        .catch(() => {
          // Unasked whatever stopped it, so the rows can be asked for again: an abort included,
          // since a page restored from the back/forward cache starts the loop again unmounted.
          for (const s of batch) asked.delete(s);
          if (ac.signal.aborted) return;
          // Only while the window the batch was asked for is still the reader's: a failure never
          // marks a window chosen since, and a window left behind starts clean when it returns.
          if (wantedKey !== input.wantedKey) return;
          failedAt = wantedKey;
          if (urgent && retries < RETRY_MS.length) {
            const key = failedAt;
            retryTimer = setTimeout(() => {
              retryTimer = null;
              if (failedAt === key) failedAt = null;
              pump();
            }, RETRY_MS[retries++]);
          }
        })
        .finally(() => {
          if (controller !== ac) return;
          controller = null;
          pump();
        });
    };
    if (urgent) {
      run();
      return;
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run);
      cancelScheduled = () => w.cancelIdleCallback?.(id);
    } else {
      const t = setTimeout(run, IDLE_FALLBACK_MS);
      cancelScheduled = () => clearTimeout(t);
    }
  };

  return {
    get: (all: DiscoveryRow[], slug: string) => lists.get(all)?.store.get(slug),
    /** What to do when a batch shows this page's list is stale. */
    onStale(fn: () => void) {
      onStale = fn;
    },
    /** A change of window, list or order: a background batch still waiting for its idle moment
        gives way, so the rows the reader now wants go first. */
    update(next: LoopInput) {
      if (next.wantedKey !== input.wantedKey) {
        retries = 0;
        failedAt = null;
        unretry();
      }
      input = next;
      unschedule();
      pump();
    },
    /** Mounted (again, under React's development double mount). */
    start() {
      left = false;
      pump();
    },
    leave() {
      left = true;
      unschedule();
      unretry();
      controller?.abort();
    },
  };
}

export function useDrawFields(
  sort: Sort,
  all: DiscoveryRow[],
  wanted: DiscoveryRow[],
  onStale: () => void = () => {},
) {
  const [landed, setLanded] = useState(0);
  const [loop] = useState(() => createFieldsLoop(() => setLanded((n) => n + 1)));
  useEffect(() => loop.onStale(onStale), [loop, onStale]);
  const wantedKey = wanted.map((r) => r.slug).join(",");

  const resolve = useCallback(
    (row: DiscoveryRow): DiscoveryItem | null => {
      if (isDrawn(row)) return row;
      const f = loop.get(all, row.slug);
      return f ? { ...row, ...f } : null;
    },
    // `landed` is the render a wanted batch asks for; the loop's store is not React state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loop, all, landed],
  );

  useEffect(() => {
    loop.update({ sort, all, wanted, wantedKey });
    // `wanted` is a fresh array on most renders; its slugs are what move the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, sort, all, wantedKey]);

  // Leaving: abort the batch in flight and start no other.
  useEffect(() => {
    loop.start();
    const leave = () => loop.leave();
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (a && a.target !== "_blank" && a.origin === location.origin && a.pathname !== location.pathname) leave();
    };
    const onNavigate = (e: Event) => {
      const url = (e as NavigateEventLike).destination?.url;
      if (!url) return;
      try {
        if (new URL(url).pathname !== location.pathname) leave();
      } catch {
        // A destination the URL parser refuses is not a route this page can reach.
      }
    };
    const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
    document.addEventListener("click", onClick, true);
    navigation?.addEventListener("navigate", onNavigate);
    // Restored from the back/forward cache: the page comes back without remounting.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) loop.start();
    };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      navigation?.removeEventListener("navigate", onNavigate);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", onPageShow);
      leave();
    };
  }, [loop]);

  return { resolve };
}
