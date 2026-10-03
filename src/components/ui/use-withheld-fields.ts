"use client";

// The fields a list's page withheld, fetched in the background (list payload plan, PR 3 and 4):
// `/discover` and `/collection` each ship their draw-only fields for the URL's first window only,
// and the rest arrive from a GET route in batches, under three rules that come from a measurement
// rather than a preference (#1108: background image downloads on the slow profile turned the
// next navigation's 8s into 26-49s):
//
//   1. ONE BATCH IN FLIGHT, never two. Rows the reader is waiting on go first; the rest follow
//      in the order they are listed.
//   2. THE BACKGROUND WAITS FOR AN IDLE MOMENT after first paint (`requestIdleCallback`, a short
//      timeout where it does not exist). A batch for rows the reader is waiting on does not wait.
//   3. LEAVING STOPS IT. A navigation to another route aborts the batch in flight and starts no
//      other, and so does unmounting: a click on a link to another path, the Navigation API's own
//      `navigate` event where the browser has it, or the page being hidden.
//
// Fields are held per payload, never per parameter: a fresh payload of the same list (a refresh,
// a navigation back) may have moved them.
import { useCallback, useEffect, useState } from "react";

/** How long the background waits for an idle moment where the browser has no `requestIdleCallback`. */
const IDLE_FALLBACK_MS = 200;

/** The pauses before a failed batch the reader is waiting on is asked for again. */
const RETRY_MS = [1_000, 3_000, 9_000];

type NavigationLike = EventTarget & object;
type NavigateEventLike = Event & { destination?: { url?: string } };

/**
 * Where a list's withheld fields come from. Keep it STABLE across renders (`useMemo`): a new source
 * is a change of input, and each one sends a background batch waiting for its idle moment back to
 * the queue.
 */
export type FieldsSource<Row> = {
  /** The id a row is asked for by, and the key the route answers under. */
  keyOf: (row: Row) => string;
  /** A row the page shipped whole, which needs nothing. */
  isDrawn: (row: Row) => boolean;
  /** The GET that answers `{ fields: { [key]: fields } }` for these keys. */
  url: (keys: string[]) => string;
  /** The most keys one request may carry. */
  maxBatch: number;
  /**
   * Whether fields that landed describe a different version of this row than the page holds, so
   * the page's own copy of it (what search, filters and sorts read) is out of date and has to be
   * read again. Asked of the rows the reader WANTS, as drawn, so a change the reader made here
   * and already holds is not one.
   */
  disagrees?: (row: Row, fields: object) => boolean;
};

type LoopInput<Row> = { source: FieldsSource<Row> | null; all: Row[]; wanted: Row[]; wantedKey: string };

/**
 * The fetch loop, held OUTSIDE React state. A render is asked for only when a batch lands rows the
 * reader is waiting on: a batch for rows nobody is looking at has nothing to draw, and held as
 * state each one re-rendered the whole view about four times.
 */
function createFieldsLoop<Row extends object, Fields extends object>(onLanded: () => void) {
  let onStale = () => {};
  // Fields belong to the PAYLOAD they complete, never to a parameter: a fresh server payload (a refresh,
  // a navigation back) is a new list and starts empty, while a ranking served again from the
  // client cache is the same list and keeps what it had. Held weakly, so a list the view has let
  // go takes its fields with it.
  const lists = new WeakMap<
    Row[],
    { store: Map<string, Fields>; asked: Set<string>; gone: Set<string>; refreshed: boolean }
  >();
  const forList = (all: Row[]) => {
    let entry = lists.get(all);
    if (!entry) {
      // `asked`: keys already asked for, whatever came back, so a key is not asked twice.
      // `gone`: keys the route left out, which only a fresh payload can draw.
      entry = { store: new Map(), asked: new Set(), gone: new Set(), refreshed: false };
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
  let input: LoopInput<Row> = { source: null, all: [], wanted: [], wantedKey: "" };

  const unschedule = () => {
    cancelScheduled?.();
    cancelScheduled = null;
  };
  const unretry = () => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  };

  const pump = () => {
    if (left || !input.source) return;
    const { source, all, wanted, wantedKey } = input;
    const { keyOf, isDrawn } = source;
    const list = forList(all);
    const { store, asked } = list;
    // A row the reader WANTS that the route left out, whenever it left it out: this payload's
    // list is stale (a write elsewhere, a catalog refresh), so the page is read again, once. Not
    // widened to `all` — a row nobody is waiting on going missing from a batch is not yet a
    // reason to refresh, and the reader may never ask for it.
    const gone = (r: Row) => !isDrawn(r) && list.gone.has(keyOf(r));
    // A batch's caption disagreeing with the page's own copy, checked against the full, locally
    // patched list, not just `wanted`: a card a search or a filter leaves out of `wanted` is
    // still a row the page holds, and a renamed printing landing for it is exactly the case that
    // should make the page stale (its new name is what a reader would search for). `wanted` is
    // where a local pick's overlay lives — `all` never carries one — so a row `wanted` also
    // holds is read from there, to keep the pick's own exemption; a row outside `wanted` has no
    // pick to exempt and reads from `all` as is.
    const patched = new Map(wanted.map((r) => [keyOf(r), r] as const));
    const disagreesNow = (r: Row) => {
      const eff = patched.get(keyOf(r)) ?? r;
      if (isDrawn(eff)) return false;
      const f = list.store.get(keyOf(eff));
      return f !== undefined && source.disagrees?.(eff, f) === true;
    };
    if (!list.refreshed && (wanted.some(gone) || all.some(disagreesNow))) {
      list.refreshed = true;
      onStale();
      return;
    }
    // A list already sent for a fresh read asks for nothing more: what it would fetch belongs to a
    // payload the page is replacing, and every batch would hold the one in-flight slot. The new
    // payload is a new list and starts fetching on its own.
    if (list.refreshed) return;
    if (controller || cancelScheduled) return;
    const needs = (row: Row) => !isDrawn(row) && !store.has(keyOf(row)) && !asked.has(keyOf(row));
    const waiting = wanted.filter(needs).map(keyOf);
    const urgent = waiting.length > 0;
    if (failedAt !== null && (failedAt === wantedKey || !urgent)) return;
    // The next batch: rows the reader is waiting on, then the rest in the order they are listed,
    // never past the route's limit. The reader can wait on more than one batch holds (three
    // presses of Show more, then a refresh that leaves only the first window whole), and a batch
    // over the limit is refused outright; the rest go in the next batch, since every batch pumps.
    const batch = waiting.slice(0, source.maxBatch);
    const seen = new Set(batch);
    for (const r of all) {
      if (batch.length >= source.maxBatch) break;
      const key = keyOf(r);
      if (!seen.has(key) && needs(r)) {
        batch.push(key);
        seen.add(key);
      }
    }
    if (batch.length === 0) return;
    const run = () => {
      cancelScheduled = null;
      if (left) return;
      const ac = new AbortController();
      controller = ac;
      // Whether this batch's payload is still the one the reader holds. Every late continuation
      // checks it: a failure from a payload `update` has replaced belongs to a
      // list nobody is drawing, and acting on it would undo the reset the new payload got.
      const current = () => input.all === all && input.source === source;
      for (const s of batch) asked.add(s);
      fetch(source.url(batch), { signal: ac.signal, credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`fields ${r.status}`))))
        .then((body: { fields: Record<string, Fields> }) => {
          for (const [key, f] of Object.entries(body.fields)) store.set(key, f);
          // The route leaves out a key its reader's list no longer holds; `pump` refreshes the
          // page the moment one of them is wanted, now or later.
          for (const s of batch) if (!Object.hasOwn(body.fields, s)) forList(all).gone.add(s);
          if (input.all === all && input.wanted.some((r) => !isDrawn(r) && Object.hasOwn(body.fields, keyOf(r)))) onLanded();
        })
        .catch(() => {
          // Unasked whatever stopped it, so the rows can be asked for again: an abort included,
          // since a page restored from the back/forward cache starts the loop again unmounted.
          for (const s of batch) asked.delete(s);
          if (ac.signal.aborted) return;
          // Only while the window the batch was asked for is still the reader's: a failure never
          // marks a window chosen since, and a window left behind starts clean when it returns.
          if (!current() || wantedKey !== input.wantedKey) return;
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
    get: (all: Row[], key: string) => lists.get(all)?.store.get(key),
    /** What to do when a batch shows this page's list is stale. */
    onStale(fn: () => void) {
      onStale = fn;
    },
    /** A change of window, list or order: a background batch still waiting for its idle moment
        gives way, so the rows the reader now wants go first. */
    update(next: LoopInput<Row>) {
      // A failure belongs to the payload and window it was asked for. A refresh that hands over a
      // new payload with the same window must ask afresh, or the window stays busy for good.
      const newPayload = next.all !== input.all || next.source !== input.source;
      if (next.wantedKey !== input.wantedKey || newPayload) {
        retries = 0;
        failedAt = null;
        unretry();
      }
      // A batch for a payload the reader no longer holds gives up its one in-flight slot, so the
      // new payload's rows are asked for at once rather than after it.
      if (newPayload) controller?.abort();
      input = next;
      unschedule();
      pump();
    },
    /** Mounted (again, under React's development double mount), or restored from the back/forward
        cache. Starts clean: `leave` cancelled any retry that was pending, so a failure kept from
        before would hold the reader's window busy with nothing left to clear it. */
    start() {
      left = false;
      retries = 0;
      failedAt = null;
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

/**
 * The fields a list's page withheld, fetched in the background: `resolve` answers a row whole,
 * from the page or from a batch, or `null` while its fields are still on their way. A fetched
 * field sits UNDER the row's own, so a field the client laid over the row (a printing pick) wins.
 */
export function useWithheldFields<Row extends object, Item>(
  source: FieldsSource<Row>,
  all: Row[],
  wanted: Row[],
  onStale: () => void = () => {},
) {
  const [landed, setLanded] = useState(0);
  const [loop] = useState(() => createFieldsLoop<Row, object>(() => setLanded((n) => n + 1)));
  useEffect(() => loop.onStale(onStale), [loop, onStale]);
  const wantedKey = wanted.map(source.keyOf).join(",");

  const resolve = useCallback(
    (row: Row): Item | null => {
      if (source.isDrawn(row)) return row as unknown as Item;
      const f = loop.get(all, source.keyOf(row));
      return f ? ({ ...f, ...row } as unknown as Item) : null;
    },
    // `landed` is the render a wanted batch asks for; the loop's store is not React state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loop, source, all, landed],
  );

  useEffect(() => {
    loop.update({ source, all, wanted, wantedKey });
    // `wanted` is memoized by both callers and changes reference only when its rows do — a
    // local pick can replace a row without moving its keys or order, and without `wanted` here
    // the loop would keep holding the pre-pick row across that pick.
  }, [loop, source, all, wanted, wantedKey]);

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
