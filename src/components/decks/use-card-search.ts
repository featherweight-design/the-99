"use client";
// The debounced card-search state machine behind every combobox in the builder.
//
// Lifted out of quick-add-bar.tsx unchanged so the row-scoped resolution search
// and the pinned bar answer keystrokes identically — two copies of the
// staleness rules below would drift, and the whole point of `stale` is that
// Enter can never act on rows the user has typed past.

import { useCallback, useEffect, useRef, useState } from "react";
import { searchCards, type SearchResult } from "../../app/decks/[id]/search-action";

/**
 * How long a search may go unanswered before the bar says it failed (small items 2, item 8: "rejected or times out").
 *
 * Measured 2026-10-29 against staging (read-only; `searchCards` itself, run from a dev machine over the pooled
 * connection, busiest account at 3,510 collection rows, its largest deck, 43 queries x owned on/off x 5 rounds,
 * two runs, n=860): p50 137-144ms, p95 196-226ms, p99 268-347ms, worst warm call 468ms, and the first call of each
 * run (a fresh pool) 1,666ms and 1,960ms. Sentry here is errors-only and Vercel's request log carries no duration,
 * so there is no field telemetry to read.
 *
 * 8s is ~25x the warm p99 and ~4x the worst cold call, which leaves room for what that harness cannot see: a cold
 * Vercel function, a Neon compute waking from suspend, and a phone on a poor connection. A false alarm is cheap (a
 * late answer for the field's text still lands and takes the toast away), a hung search unannounced is not, and
 * nothing longer would be "just now". The server action cannot be aborted, so a search past this is IGNORED, never
 * cancelled: see the effect below.
 */
export const SEARCH_TIMEOUT_MS = 8_000;

export interface CardSearchInput {
  query: string;
  /** `null` drops the colour-identity constraint — see search-action.ts. */
  colorIdentity: string[] | null;
  ownedOnly: boolean;
  /** The deck being built — the vantage each row's availability is read from. */
  deckId: string;
  /**
   * The search itself. Defaults to the server action, which is what every real
   * combobox uses; `/about` passes a resolver that returns a fixed list, so its
   * figure can draw the panel with results in it without a reference page
   * reaching a server action.
   *
   * Same shape and same reason as `CardDetailProvider`'s `fetchCard`.
   */
  search?: typeof searchCards;
}

/**
 * Which cell of the active row the keyboard is on, for a combobox whose popup is a grid (quick-add, small
 * items 2 item 6b): the card's name, which opens its details, or Add. A listbox caller never reads it.
 */
export type CardSearchColumn = "add" | "name";

export function useCardSearch({
  query,
  colorIdentity,
  ownedOnly,
  deckId,
  search = searchCards,
}: CardSearchInput) {
  // Rows carry the request that produced them. They stay on screen through the
  // next debounce — a list that blanks on every keystroke is worse than one that
  // lags by 150ms — but `stale` below stops Enter acting on them.
  const [rows, setRows] = useState<{ for: string; items: SearchResult[] } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Beside the row, not in the caller: the same events that put the row back on 1 (typing, a landing) put the
  // cell back on Add, so type-and-Enter always adds the top match.
  const [activeColumn, setActiveColumn] = useState<CardSearchColumn>("add");
  // Typing resets to row 1's Add cell at once, not when the next rows land: Enter is refused on rows typed past
  // anyway, and an active name cell left over from the last list would otherwise survive the keystroke. Adjusted
  // during render (React's pattern for state derived from a prop's change) rather than in an effect, so no frame
  // draws the old cell under the new text.
  const [queryFor, setQueryFor] = useState(query);
  if (queryFor !== query) {
    setQueryFor(query);
    setActiveIndex(0);
    setActiveColumn("add");
  }
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The latest search was rejected or timed out (small items 2, item 8): a counter rather than a flag, so a failure
  // after a failure is a new one and the caller's toast comes back with its own window. It outlives typing on purpose:
  // only a search that lands, or a field the bar would no longer search, says the failure is over.
  const [failure, setFailure] = useState<number | null>(null);
  const failures = useRef(0);
  // `retry` bumps this to run the same request again, at once rather than after the debounce.
  const [attempt, setAttempt] = useState(0);
  const lastAttempt = useRef(0);

  const trimmed = query.trim();
  const queryActive = trimmed.length >= 2 && trimmed.length <= 100;
  // Every input the request is made from, so flipping any of them makes the rows
  // on screen as stale as retyping does. Identity belongs here as much as the
  // owned toggle: the two comboboxes pass different identities, and a key that
  // ignored it would let Enter act on rows from the other one's filter. deckId is
  // the availability vantage, and a route-param change reconciles rather than
  // remounts, so rows read against the old deck must not pass as current.
  const identityKey = colorIdentity === null ? "any" : colorIdentity.join(",");
  const requestKey = `${ownedOnly ? "owned" : "all"} ${identityKey} ${deckId} ${trimmed}`;

  // A field whose text the bar would not search (cleared, under 2 characters, over 100) is the reader putting the
  // search down, failure and all: Try again would have nothing to run.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!queryActive) setFailure(null);
  }, [queryActive]);

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    const retrying = attempt !== lastAttempt.current;
    lastAttempt.current = attempt;
    if (!queryActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(null);
      return;
    }

    let cancelled = false;
    // Set once SEARCH_TIMEOUT_MS passes with no answer. A server action cannot be aborted, so the request runs on and
    // its answer still arrives: a success for this same request (the field's text, as `cancelled` is still false)
    // lands and ends the failure, which is what a landed search does; a rejection says nothing more, the timeout
    // already said it. An answer for a request the reader has since typed past or retried is `cancelled` as before.
    let timedOut = false;
    let deadline: ReturnType<typeof setTimeout> | null = null;
    timerRef.current = setTimeout(() => {
      // Cleared by the cleanup below, so a deadline never fires for a request the reader has moved on from.
      deadline = setTimeout(() => {
        timedOut = true;
        setRows(null);
        failures.current += 1;
        setFailure(failures.current);
      }, SEARCH_TIMEOUT_MS);
      search(trimmed, colorIdentity, ownedOnly, deckId)
        .then((found) => {
          if (deadline !== null) clearTimeout(deadline);
          if (cancelled) return;
          setRows({ for: requestKey, items: found });
          setActiveIndex(0);
          setActiveColumn("add");
          setFailure(null);
        })
        .catch((err) => {
          // Outside the `cancelled` guard on purpose. Nothing here aborts the
          // request, so a rejection means searchCards genuinely threw, and the
          // user typing another character is no reason to stop saying so — a
          // guarded log would hide a wholly broken action behind fast typing.
          console.error(err);
          if (deadline !== null) clearTimeout(deadline);
          // Back to "no search has happened", never to "no results". An empty
          // list makes a claim a failed request has not earned.
          // Only the latest query's failure is said: one the reader has typed past is no news.
          if (!cancelled && !timedOut) {
            setRows(null);
            failures.current += 1;
            setFailure(failures.current);
          }
        });
    }, retrying ? 0 : 150);

    return () => {
      cancelled = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      if (deadline !== null) clearTimeout(deadline);
    };
  // `search` is deliberately NOT a dependency: it is a constant at every call
  // site (the module-level action, or one fixed resolver), and an inline arrow
  // would re-fire the debounce on every render of the caller.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [trimmed, queryActive, ownedOnly, colorIdentity, requestKey, deckId, attempt]);

  const results = rows?.items ?? [];
  const stale = rows !== null && rows.for !== requestKey;
  const open = queryActive && rows !== null && results.length > 0;
  // "Nothing by that name" is only honest about the query that produced it, so
  // a stale empty list holds its tongue until the current one lands.
  const noResults = queryActive && !stale && rows !== null && results.length === 0;
  // Results for the query in the field have not landed yet: either none at all,
  // or the ones on screen answer an older query.
  const searching = queryActive && (rows === null || stale);

  /** Runs the current query once more, now. The failure is over as the request starts; a second one raises it again. */
  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((a) => a + 1);
  }, []);
  /** The reader let the failure go (the toast's timer ran out). */
  const dismissFailure = useCallback(() => setFailure(null), []);

  function move(delta: number) {
    if (!open) return;
    setActiveIndex((i) => (i + delta + results.length) % results.length);
  }

  return {
    trimmed, queryActive, results, stale, open, noResults, searching, activeIndex, setActiveIndex, move,
    activeColumn, setActiveColumn,
    failure, retry, dismissFailure,
  };
}
