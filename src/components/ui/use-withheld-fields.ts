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
import { captureClientError } from "../../lib/sentry/capture-client";
import { useCallback, useEffect, useState } from "react";
import { readSavedFields, writeSavedFields } from "./saved-fields";

/** How long the background waits for an idle moment where the browser has no `requestIdleCallback`. */
const IDLE_FALLBACK_MS = 200;

/** The pauses before a failed batch the reader is waiting on is asked for again. */
/** The most ids an urgent batch (one the reader is waiting on) is filled up to with spare rows. */
const URGENT_FILL = 200;
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
  /** The request URL (a GET, or the POST's target when `body` is given) answering `{ fields: { [key]: fields } }` for these keys. */
  url: (keys: string[]) => string;
  /**
   * The JSON body, for a list whose batch is too long for a query string: the request is then a POST
   * to `url(keys)` carrying it. Absent, the request is the GET.
   */
  body?: (keys: string[]) => unknown;
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

/**
 * A saved copy of the fetched fields (`saved-fields.ts`): `list` names the entry, `token` is what the
 * server says the fields are good for. Absent, nothing is read or kept.
 */
export type SavedCopy = { list: string; token: string };

type LoopInput<Row> = {
  source: FieldsSource<Row> | null;
  all: Row[];
  wanted: Row[];
  wantedKey: string;
  saved?: SavedCopy | null;
};

/**
 * The fetch loop, held OUTSIDE React state. A render is asked for only when a batch lands rows the
 * reader is waiting on: a batch for rows nobody is looking at has nothing to draw, and held as
 * state each one re-rendered the whole view about four times.
 */
export function createFieldsLoop<Row extends object, Fields extends object>(onLanded: () => void) {
  let onStale = () => {};
  // Fields belong to the PAYLOAD they complete, never to a parameter: a fresh server payload (a refresh,
  // a navigation back) is a new list and starts empty, while a ranking served again from the
  // client cache is the same list and keeps what it had. Held weakly, so a list the view has let
  // go takes its fields with it.
  const lists = new WeakMap<
    Row[],
    {
      store: Map<string, Fields>;
      asked: Set<string>;
      gone: Set<string>;
      refreshed: boolean;
      /** The saved copy: not yet asked for, being read, or settled (read, or nothing to read). */
      restore: "idle" | "reading" | "done";
      /** How many fields the copy on disk holds, so a copy is written again only when it grew. */
      kept: number;
    }
  >();
  const forList = (all: Row[]) => {
    let entry = lists.get(all);
    if (!entry) {
      // `asked`: keys already asked for, whatever came back, so a key is not asked twice.
      // `gone`: keys the route left out, which only a fresh payload can draw.
      entry = { store: new Map(), asked: new Set(), gone: new Set(), refreshed: false, restore: "idle", kept: 0 };
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
  // A 429 (the route's rate rule) holds EVERY batch, urgent or background, until its window ends: any batch sent
  // inside it would be counted and refused too.
  let heldUntil = 0;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let input: LoopInput<Row> = { source: null, all: [], wanted: [], wantedKey: "" };

  const unschedule = () => {
    cancelScheduled?.();
    cancelScheduled = null;
  };
  const unretry = () => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
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
    // THE SAVED COPY IS READ BEFORE ANY BATCH GOES: a few milliseconds of waiting against a request
    // for fields the browser already holds. It settles whatever happens (`readSavedFields` never
    // rejects), and is used only when its token is the one the server just handed this page.
    if (input.saved && list.restore !== "done") {
      if (list.restore === "idle") {
        list.restore = "reading";
        const { list: name, token } = input.saved;
        void readSavedFields(name).then((copy) => {
          list.restore = "done";
          if (copy && copy.token === token) {
            for (const [key, f] of Object.entries(copy.fields)) if (!store.has(key)) store.set(key, f as Fields);
            list.kept = store.size;
            if (input.all === all && input.wanted.some((r) => !isDrawn(r) && store.has(keyOf(r)))) onLanded();
          }
          if (input.all === all) pump();
        });
      }
      return;
    }
    // A list already sent for a fresh read asks for nothing more: what it would fetch belongs to a
    // payload the page is replacing, and every batch would hold the one in-flight slot. The new
    // payload is a new list and starts fetching on its own.
    if (list.refreshed) return;
    if (controller || cancelScheduled) return;
    if (Date.now() < heldUntil) {
      holdTimer ??= setTimeout(() => {
        holdTimer = null;
        pump();
      }, heldUntil - Date.now());
      return;
    }
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
    // A batch the reader is waiting on is topped up only to URGENT_FILL: the rest of a 500-card
    // read would hold the rows on screen behind cards nobody is looking at. Idle batches go full.
    const fillTo = urgent ? Math.min(source.maxBatch, URGENT_FILL) : source.maxBatch;
    for (const r of all) {
      if (batch.length >= fillTo) break;
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
      fetch(
        source.url(batch),
        source.body
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(source.body(batch)),
              signal: ac.signal,
              credentials: "same-origin",
            }
          : { signal: ac.signal, credentials: "same-origin" },
      )
        .then((r) => {
          if (r.ok) return r.json();
          // A 429 is the route's rate rule: a retry before its window ends would be counted and refused too.
          if (r.status === 429) heldUntil = Date.now() + (Math.max(0, Number(r.headers.get("retry-after")) || 60) * 1000);
          return Promise.reject(new Error(`fields ${r.status}`));
        })
        .then((body: { fields: Record<string, Fields> }) => {
          for (const [key, f] of Object.entries(body.fields)) store.set(key, f);
          // The route leaves out a key its reader's list no longer holds; `pump` refreshes the
          // page the moment one of them is wanted, now or later.
          for (const s of batch) if (!Object.hasOwn(body.fields, s)) forList(all).gone.add(s);
          if (input.all === all && input.wanted.some((r) => !isDrawn(r) && Object.hasOwn(body.fields, keyOf(r)))) onLanded();
          // Every withheld card now has its fields, and the copy on disk has fewer: keep this one. Never
          // from a list that was sent for a fresh read, or that has a card the route no longer knows.
          const list2 = forList(all);
          const saved = input.saved;
          if (
            saved &&
            input.all === all &&
            !list2.refreshed &&
            list2.gone.size === 0 &&
            store.size > list2.kept &&
            all.every((r) => isDrawn(r) || store.has(keyOf(r)))
          ) {
            list2.kept = store.size;
            void writeSavedFields(saved.list, { token: saved.token, fields: Object.fromEntries(store) });
          }
        })
        .catch((e) => {
          // Unasked whatever stopped it, so the rows can be asked for again: an abort included,
          // since a page restored from the back/forward cache starts the loop again unmounted.
          for (const s of batch) asked.delete(s);
          if (ac.signal.aborted) return;
          // Only while the window the batch was asked for is still the reader's: a failure never
          // marks a window chosen since, and a window left behind starts clean when it returns.
          if (!current() || wantedKey !== input.wantedKey) return;
          captureClientError("ui.withheld-fields", e);
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
  saved: SavedCopy | null = null,
) {
  const [landed, setLanded] = useState(0);
  const [loop] = useState(() => createFieldsLoop<Row, object>(() => setLanded((n) => n + 1)));
  useEffect(() => loop.onStale(onStale), [loop, onStale]);
  const wantedKey = wanted.map(source.keyOf).join(",");
  // Held by its parts: a caller's object literal is a new one on every render.
  const savedList = saved?.list ?? null;
  const savedToken = saved?.token ?? null;

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
    loop.update({ source, all, wanted, wantedKey, saved: savedList && savedToken ? { list: savedList, token: savedToken } : null });
    // `wanted` is memoized by both callers and changes reference only when its rows do — a
    // local pick can replace a row without moving its keys or order, and without `wanted` here
    // the loop would keep holding the pre-pick row across that pick.
  }, [loop, source, all, wanted, wantedKey, savedList, savedToken]);

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
        // silent-catch: expected: refusal: a destination the URL parser refuses.
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
