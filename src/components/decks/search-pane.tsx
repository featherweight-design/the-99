"use client";
// SearchPane — per §Search (within Add Panel) design table.
// Debounced (~150ms) input, calls searchCards server action,
// renders SearchResultRow per result. Owned-only toggle.

import { useState, useEffect, useRef } from "react";
import { searchCards } from "../../app/decks/[id]/search-action";
import { SearchResultRow } from "./search-result-row";
import { SingletonFooterNote } from "./singleton-footer-note";
import { identityLabel } from "../../lib/decks/indeck";
import { SearchField } from "../ui/text-field";

interface SearchPaneProps {
  deckId: string;
  commanderIdentity: string[];
  deckOracleIds: Set<string>;
}

// Shape comes from the search action; re-declaring it here let the two drift.
type SearchResult = Awaited<ReturnType<typeof searchCards>>[number];

export function SearchPane({ deckId, commanderIdentity, deckOracleIds }: SearchPaneProps) {
  const [query, setQuery] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  // results keyed by the query + owned filter that produced them — null until
  // first search, so toggling the filter never shows stale rows.
  const [resultState, setResultState] = useState<{ query: string; ownedOnly: boolean; rows: SearchResult[] } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search: kick off after 150ms of inactivity. Out-of-bounds
  // queries clear results synchronously (eslint-disable below); actual search
  // results only land via the async timeout callback.
  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    const q = query.trim();
    if (q.length < 2 || q.length > 100) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResultState(null);
      return;
    }

    let cancelled = false;
    timerRef.current = setTimeout(() => {
      searchCards(q, commanderIdentity, ownedOnly)
        .then((rows) => {
          if (!cancelled) setResultState({ query: q, ownedOnly, rows });
        })
        .catch((err) => {
          console.error(err);
          if (!cancelled) setResultState(null);
        });
    }, 150);

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [query, ownedOnly, commanderIdentity]);

  // Only show results if they match the current (trimmed) query.
  const trimmed = query.trim();
  const isQueryActive = trimmed.length >= 2 && trimmed.length <= 100;
  const current =
    isQueryActive && resultState !== null && resultState.query === trimmed &&
    resultState.ownedOnly === ownedOnly
      ? resultState
      : null;
  const results = current ? current.rows : [];
  const searched = current !== null;

  return (
    <div className="flex flex-col gap-[0px] flex-1 overflow-hidden">
      {/* §Search input container: bg #14110E, border 1px #C9A24B, radius 8px, padding 11px 13px */}
      <SearchField
        containerClassName="gap-[9px] flex-none bg-[#14110E] border-[color:var(--brass)] p-[11px_13px]"
        // §Search input — query text: 15px mobile / 14.5px desktop
        className="text-[15px] md:text-[14.5px]"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search cards…"
        aria-label="Search cards by name"
        autoComplete="off"
        spellCheck={false}
      />

      {/* §Search meta row: flex, align-items center, justify-content space-between, margin-top 10px mobile / 11px desktop */}
      <div className="flex items-center justify-between mt-[10px] md:mt-[11px] flex-none">
        {/* §Search meta — results count label: mono 10.5px, #8E8269 */}
        <span className="font-mono text-[10.5px]" style={{ color: "#8E8269" }}>
          {searched
            ? `${results.length} result${results.length !== 1 ? "s" : ""} · ${identityLabel(commanderIdentity)} only`
            : `${identityLabel(commanderIdentity)} only`}
        </span>

        {/* §Search meta — "Owned only" toggle label: flex, align-items center, gap 7px, 11.5px, #A89B84 */}
        <label
          className="flex items-center gap-[7px] text-[11.5px] cursor-pointer select-none"
          style={{ color: "#A89B84" }}
        >
          <input
            type="checkbox"
            className="sr-only peer"
            checked={ownedOnly}
            onChange={(e) => setOwnedOnly(e.target.checked)}
            aria-label="Show owned cards only"
          />
          {/* Custom toggle — §Search meta — toggle track + knob */}
          <span
            className="relative inline-block rounded-[999px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#C9A24B]"
            style={{ width: 30, height: 17, borderRadius: 999 }}
            aria-hidden
          >
            <span
              style={{
                display: "block",
                width: 30,
                height: 17,
                borderRadius: 999,
                background: ownedOnly ? "#C9A24B" : "#2A241D",
                transition: "background 0.15s",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: 2,
                left: ownedOnly ? 15 : 2,
                width: 13,
                height: 13,
                borderRadius: 999,
                background: ownedOnly ? "#14110E" : "#8E8269",
                transition: "left 0.15s",
              }}
            />
          </span>
          Owned only
        </label>
      </div>

      {/* Results list — scrollable */}
      <div className="flex-1 overflow-y-auto mt-[10px] flex flex-col gap-[6px]">
        {results.map((r) => (
          <SearchResultRow
            key={r.oracleId}
            result={r}
            deckId={deckId}
            inDeck={deckOracleIds.has(r.oracleId)}
          />
        ))}
      </div>

      {/* §Search singleton footer note — desktop-only */}
      <SingletonFooterNote />
    </div>
  );
}
