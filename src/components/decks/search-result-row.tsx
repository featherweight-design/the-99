"use client";
// SearchResultRow — per §Search result row design table.
// Mirrors SuggestionCard's Add/In-deck legibility, with sub-line for type + owned label.

import { addCardToDeck } from "../../app/decks/actions";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { isBasicLand } from "../../lib/decks/grouping";
import { CardDetailTrigger } from "./card-detail-provider";
import { MutationError } from "./mutation-error";
import { useAddOptimisticCard } from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";
import type { SearchResult } from "../../app/decks/[id]/search-action";

interface SearchResultRowProps {
  result: SearchResult;
  deckId: string;
  inDeck: boolean;
}

export function SearchResultRow({ result, deckId, inDeck }: SearchResultRowProps) {
  const { applied, isPending, error, run } = useDeckMutation(inDeck, DECK_ADD_FALLBACK_MESSAGE);
  // Basics may run multiple copies (server increments quantity), so they stay
  // addable even when already in the deck.
  const isBasic = isBasicLand(result.typeLine);
  const addable = !applied || isBasic;
  const addOptimisticCard = useAddOptimisticCard();

  function handleAdd() {
    run(
      () => addCardToDeck(deckId, result.oracleId),
      () =>
        addOptimisticCard({
          oracleId: result.oracleId,
          name: result.name,
          typeLine: result.typeLine,
          cardTypeGroup: result.cardTypeGroup,
          role: result.role,
          owned: result.owned,
          quantity: 1,
        }),
    );
  }

  return (
    // §Search result row: flex, align-items center, gap 10px mobile / 11px desktop
    // bg #1E1A15, border 1px #2A241D, border-radius 9px, padding 11px 13px
    <div
      className="rounded-[9px]"
      style={{
        background: "#1E1A15",
        border: "1px solid #2A241D",
        padding: "11px 13px",
      }}
    >
      <div className="flex items-center gap-[10px] md:gap-[11px]">
        {/* Name + sub-line */}
        <div className="flex-1 min-w-0">
          {/* §Search result row — name: 13.5px, #EDE6D8, truncate.
              Also the click target for the detail modal (#127). */}
          <CardDetailTrigger
            oracleId={result.oracleId}
            name={result.name}
            title={result.name}
            className="block w-full text-left text-[13.5px] truncate"
            style={{ color: "#EDE6D8", background: "transparent", border: "none", padding: 0 }}
          >
            {result.name}
          </CardDetailTrigger>
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
            {isPending ? "Adding…" : applied ? "+ Add another" : "+ Add"}
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

      {error && <MutationError message={error} />}
    </div>
  );
}
