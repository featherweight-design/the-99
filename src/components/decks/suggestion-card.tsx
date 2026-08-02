"use client";
// SuggestionCard — per §Suggestion Card design table.
// Renders ownership dot, card name, reason chip (synergy=brass, role=neutral),
// owned/unowned label, and Add / In-deck button.

import type { DeckSuggestion } from "../../lib/decks/suggest";
import { addCardToDeck } from "../../app/decks/actions";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { OwnershipDot } from "../ui/ownership-dot";
import { CardDetailTrigger } from "./card-detail-provider";
import { MutationError } from "./mutation-error";
import { useDeckMutation } from "./use-deck-mutation";

interface SuggestionCardProps {
  suggestion: DeckSuggestion;
  deckId: string;
  inDeck: boolean;
}

export function SuggestionCard({ suggestion, deckId, inDeck }: SuggestionCardProps) {
  const { applied, isPending, error, run } = useDeckMutation(inDeck, DECK_ADD_FALLBACK_MESSAGE);

  function handleAdd() {
    run(() => addCardToDeck(deckId, suggestion.oracleId));
  }

  const isEdhrec = suggestion.reasonType === "edhrec";

  return (
    // §Card container: border-radius 9px–10px mobile / 10px desktop, bg #1E1A15, border 1px #2A241D
    // padding 10px–11px 12px–13px mobile / 11px 12px desktop
    <div
      className="rounded-[9px] md:rounded-[10px] px-[12px] py-[10px] md:py-[11px]"
      style={{
        background: "#1E1A15",
        border: "1px solid #2A241D",
      }}
    >
      {/* §Suggestion card — top row: flex, align-items center, gap 8px–9px mobile / 8px desktop */}
      <div className="flex items-center gap-[8px] md:gap-[8px]">
        {/* §Suggestion card — ownership dot: 8×8px, radius 999px */}
        <OwnershipDot owned={suggestion.owned} className="w-[8px] h-[8px]" />

        {/* §Suggestion card — card name: 13px–13.5px mobile / 13.5px desktop, flex 1, truncate.
            Also the click target for the detail modal (#127). */}
        <CardDetailTrigger
          oracleId={suggestion.oracleId}
          name={suggestion.name}
          title={suggestion.name}
          className="flex-1 min-w-0 truncate text-left text-[13px] md:text-[13.5px] font-medium"
          style={{ color: "#EDE6D8", background: "transparent", border: "none", padding: 0 }}
        >
          {suggestion.name}
        </CardDetailTrigger>

        {/* §Suggestion card — reason chip */}
        <span
          className="flex-none font-mono text-[10px] rounded-[5px] px-[7px] py-[2px]"
          style={
            isEdhrec
              ? { color: "#C9A24B", background: "rgba(201,162,75,0.14)" }
              : { color: "#A89B84", background: "#2A241D" }
          }
        >
          {suggestion.reasonLabel}
        </span>

        {/* §Suggestion card — "+ Add" / "✓ In deck" button */}
        {applied ? (
          <span
            className="flex-none font-sans text-[12px] font-semibold"
            style={{ color: "#6FA368" }}
          >
            ✓ In deck
          </span>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            aria-label={`Add ${suggestion.name} to deck`}
            className="flex-none font-sans text-[12px] font-semibold cursor-pointer disabled:opacity-50"
            style={{ color: "#C9A24B", background: "transparent", border: "none", padding: 0 }}
          >
            + Add
          </button>
        )}
      </div>

      {/* §Suggestion card — own label: mono 10px, #8E8269 */}
      <div
        className="font-mono text-[10px] mt-[4px] ml-[16px]"
        style={{ color: "#8E8269" }}
      >
        {suggestion.owned ? "owned" : "not owned"}
      </div>

      {error && <MutationError message={error} />}
    </div>
  );
}
