"use client";
// SearchResultRow — per §Search result row design table.
// Mirrors SuggestionCard's Add/In-deck legibility, with sub-line for type + owned label.

import { useTransition } from "react";
import { addCardToDeck } from "../../app/decks/actions";

interface SearchResult {
  oracleId: string;
  name: string;
  typeLine: string;
  owned: boolean;
}

interface SearchResultRowProps {
  result: SearchResult;
  deckId: string;
  inDeck: boolean;
}

export function SearchResultRow({ result, deckId, inDeck }: SearchResultRowProps) {
  const [isPending, startTransition] = useTransition();
  // Basics may run multiple copies (server increments quantity), so they stay
  // addable even when already in the deck.
  const isBasic = /\bBasic\b/.test(result.typeLine);
  const addable = !inDeck || isBasic;

  function handleAdd() {
    startTransition(async () => {
      // Server rejects e.g. 99-card cap / legality — no error UI designed yet.
      await addCardToDeck(deckId, result.oracleId).catch(console.error);
    });
  }

  return (
    // §Search result row: flex, align-items center, gap 10px mobile / 11px desktop
    // bg #1E1A15, border 1px #2A241D, border-radius 9px, padding 11px 13px
    <div
      className="flex items-center gap-[10px] md:gap-[11px] rounded-[9px]"
      style={{
        background: "#1E1A15",
        border: "1px solid #2A241D",
        padding: "11px 13px",
      }}
    >
      {/* Name + sub-line */}
      <div className="flex-1 min-w-0">
        {/* §Search result row — name: 13.5px, #EDE6D8, truncate */}
        <div
          className="text-[13.5px] truncate"
          style={{ color: "#EDE6D8" }}
          title={result.name}
        >
          {result.name}
        </div>
        {/* §Search result row — own label sub-line: mono 9.5px, #8E8269, margin-top 1px */}
        <div
          className="font-mono text-[9.5px] mt-[1px]"
          style={{ color: "#8E8269" }}
        >
          {result.owned ? "owned" : "not owned"} · {result.typeLine}
        </div>
      </div>

      {/* §Search result row — "+ Add" / "✓ In deck": 12.5px, fw 600 */}
      {addable ? (
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending}
          aria-label={`Add ${result.name} to deck`}
          className="flex-none font-sans text-[12.5px] font-semibold cursor-pointer disabled:opacity-50"
          style={{ color: "#C9A24B", background: "transparent", border: "none", padding: 0 }}
        >
          {isPending ? "Adding…" : inDeck ? "+ Add another" : "+ Add"}
        </button>
      ) : (
        <span
          className="flex-none font-sans text-[12.5px] font-semibold"
          style={{ color: "#6FA368" }}
        >
          ✓ In deck
        </span>
      )}
    </div>
  );
}
