"use client";
// SuggestionCard — per §Suggestion Card design table.
// Renders ownership dot, card name, reason chip (synergy=brass, role=neutral),
// owned/unowned label, and Add / In-deck button.

import { useTransition } from "react";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { addCardToDeck } from "../../app/decks/actions";

interface SuggestionCardProps {
  suggestion: DeckSuggestion;
  deckId: string;
  inDeck: boolean;
}

export function SuggestionCard({ suggestion, deckId, inDeck }: SuggestionCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      // Server rejects e.g. 99-card cap / legality — no error UI designed yet.
      await addCardToDeck(deckId, suggestion.oracleId).catch(console.error);
    });
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
        <span
          aria-hidden
          className="flex-none rounded-full"
          style={{
            width: 8,
            height: 8,
            background: suggestion.owned ? "#6FA368" : "transparent",
            border: suggestion.owned
              ? "1px solid #6FA368"
              : "1px dashed #6E6353",
          }}
        />

        {/* §Suggestion card — card name: 13px–13.5px mobile / 13.5px desktop, flex 1, truncate */}
        <span
          className="flex-1 min-w-0 truncate text-[13px] md:text-[13.5px] font-medium"
          style={{ color: "#EDE6D8" }}
          title={suggestion.name}
        >
          {suggestion.name}
        </span>

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
        {inDeck ? (
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
            {isPending ? "Adding…" : "+ Add"}
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
    </div>
  );
}
