"use client";
// The debounced card-search state machine behind every combobox in the builder.
//
// Lifted out of quick-add-bar.tsx unchanged so the row-scoped resolution search
// and the pinned bar answer keystrokes identically — two copies of the
// staleness rules below would drift, and the whole point of `stale` is that
// Enter can never act on rows the user has typed past.

import { useEffect, useRef, useState } from "react";
import { searchCards, type SearchResult } from "../../app/decks/[id]/search-action";

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (!queryActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(null);
      return;
    }

    let cancelled = false;
    timerRef.current = setTimeout(() => {
      search(trimmed, colorIdentity, ownedOnly, deckId)
        .then((found) => {
          if (cancelled) return;
          setRows({ for: requestKey, items: found });
          setActiveIndex(0);
        })
        .catch((err) => {
          // Outside the `cancelled` guard on purpose. Nothing here aborts the
          // request, so a rejection means searchCards genuinely threw, and the
          // user typing another character is no reason to stop saying so — a
          // guarded log would hide a wholly broken action behind fast typing.
          console.error(err);
          // Back to "no search has happened", never to "no results". An empty
          // list makes a claim a failed request has not earned.
          if (!cancelled) setRows(null);
        });
    }, 150);

    return () => {
      cancelled = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  // `search` is deliberately NOT a dependency: it is a constant at every call
  // site (the module-level action, or one fixed resolver), and an inline arrow
  // would re-fire the debounce on every render of the caller.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [trimmed, queryActive, ownedOnly, colorIdentity, requestKey, deckId]);

  const results = rows?.items ?? [];
  const stale = rows !== null && rows.for !== requestKey;
  const open = queryActive && rows !== null && results.length > 0;
  // "Nothing by that name" is only honest about the query that produced it, so
  // a stale empty list holds its tongue until the current one lands.
  const noResults = queryActive && !stale && rows !== null && results.length === 0;
  // Results for the query in the field have not landed yet: either none at all,
  // or the ones on screen answer an older query.
  const searching = queryActive && (rows === null || stale);

  function move(delta: number) {
    if (!open) return;
    setActiveIndex((i) => (i + delta + results.length) % results.length);
  }

  return { trimmed, queryActive, results, stale, open, noResults, searching, activeIndex, setActiveIndex, move };
}
