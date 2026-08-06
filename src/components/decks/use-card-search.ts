"use client";
// The debounced card-search state machine behind every combobox in the builder.
//
// Lifted out of quick-add-bar.tsx unchanged so the row-scoped resolution search
// and the pinned bar answer keystrokes identically — two copies of the
// staleness rules below would drift, and the whole point of `stale` is that
// Enter can never act on rows the user has typed past.

import { useEffect, useRef, useState } from "react";
import { searchCards, type SearchResult } from "../../app/decks/[id]/search-action";

interface CardSearchInput {
  query: string;
  /** `null` drops the colour-identity constraint — see search-action.ts. */
  colorIdentity: string[] | null;
  ownedOnly: boolean;
  /** Escape closes the list without clearing a query still being edited. */
  dismissed: boolean;
}

export function useCardSearch({ query, colorIdentity, ownedOnly, dismissed }: CardSearchInput) {
  // Rows carry the request that produced them. They stay on screen through the
  // next debounce — a list that blanks on every keystroke is worse than one that
  // lags by 150ms — but `stale` below stops Enter acting on them.
  const [rows, setRows] = useState<{ for: string; items: SearchResult[] } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = query.trim();
  const queryActive = trimmed.length >= 2 && trimmed.length <= 100;
  // The filter is part of the request, so flipping it makes the rows on screen
  // as stale as retyping does.
  const requestKey = `${ownedOnly ? "owned" : "all"} ${trimmed}`;

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (!queryActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(null);
      return;
    }

    let cancelled = false;
    timerRef.current = setTimeout(() => {
      searchCards(trimmed, colorIdentity, ownedOnly)
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
  }, [trimmed, queryActive, ownedOnly, colorIdentity, requestKey]);

  const results = rows?.items ?? [];
  const stale = rows !== null && rows.for !== requestKey;
  const open = !dismissed && queryActive && rows !== null && results.length > 0;
  // "Nothing by that name" is only honest about the query that produced it, so
  // a stale empty list holds its tongue until the current one lands.
  const noResults = !dismissed && queryActive && !stale && rows !== null && results.length === 0;
  // Results for the query in the field have not landed yet: either none at all,
  // or the ones on screen answer an older query.
  const searching = queryActive && (rows === null || stale);

  function move(delta: number) {
    if (!open) return;
    setActiveIndex((i) => (i + delta + results.length) % results.length);
  }

  return { trimmed, queryActive, results, stale, open, noResults, searching, activeIndex, setActiveIndex, move };
}
