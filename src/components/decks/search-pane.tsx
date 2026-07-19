"use client";
// SearchPane — per §Search (within Add Panel) design table.
// Debounced (~150ms) input, calls searchCards server action,
// renders SearchResultRow per result. Owned-only toggle.

import { useState, useEffect, useRef } from "react";
import { searchCards } from "../../app/decks/[id]/search-action";
import { SearchResultRow } from "./search-result-row";
import { SingletonFooterNote } from "./singleton-footer-note";
import { identityLabel } from "../../lib/decks/indeck";

interface SearchPaneProps {
  deckId: string;
  commanderIdentity: string[];
  deckOracleIds: Set<string>;
}

type SearchResult = { oracleId: string; name: string; typeLine: string; owned: boolean };

export function SearchPane({ deckId, commanderIdentity, deckOracleIds }: SearchPaneProps) {
  const [query, setQuery] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  // results keyed by the query string that produced them — null until first search.
  const [resultState, setResultState] = useState<{ query: string; rows: SearchResult[] } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search: kick off after 150ms of inactivity.
  // We never call setState synchronously in the effect — the only setState path
  // is the async callback (after await / in a timeout callback), which is fine.
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
      searchCards(q, commanderIdentity, ownedOnly).then((rows) => {
        if (!cancelled) setResultState({ query: q, rows });
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
  const results = isQueryActive && resultState?.query === trimmed ? resultState.rows : [];
  const searched = isQueryActive && resultState?.query === trimmed;

  return (
    <div className="flex flex-col gap-[0px] flex-1 overflow-hidden">
      {/* §Search input container: bg #14110E, border 1px #C9A24B, radius 8px, padding 11px 13px */}
      <div
        className="flex items-center gap-[9px] rounded-[8px] flex-none"
        style={{
          background: "#14110E",
          border: "1px solid #C9A24B",
          padding: "11px 13px",
        }}
      >
        {/* §Search input — icon: #8E8269, 14px */}
        <span
          aria-hidden
          className="text-[14px] flex-none"
          style={{ color: "#8E8269" }}
        >
          ⌕
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cards…"
          aria-label="Search cards by name"
          // §Search input — query text: 15px mobile / 14.5px desktop
          className="flex-1 bg-transparent text-[15px] md:text-[14.5px] outline-none placeholder:text-[#6E6353] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] rounded-sm"
          style={{ color: "#EDE6D8", border: "none" }}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

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
