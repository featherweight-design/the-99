"use client";

// Decklist Row — single card row with ownership dot, name, buy tag, remove button.
// §Decklist Row (design table).

import { removeCardFromDeck } from "../../app/decks/actions";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { OwnershipDot } from "../ui/ownership-dot";
import { CardDetailTrigger } from "./card-detail-provider";

interface DecklistRowProps {
  deckId: string;
  card: DeckDetailCard;
  /** When true, this is a "+N more" meta row for basic lands with quantity > 1. */
  isMeta?: boolean;
  /** Label override for meta rows ("+N more"). */
  metaLabel?: string;
  /** The decklist in display order, so the modal's Prev/Next page through it. */
  siblings?: string[];
}

export function DecklistRow({ deckId, card, isMeta = false, metaLabel, siblings }: DecklistRowProps) {
  const label = isMeta ? metaLabel! : card.name;
  const nameClass =
    "flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-left text-[12.5px] md:text-[13.5px]";

  return (
    /* Row container */
    <div
      className="flex items-center gap-[9px] md:gap-[10px] px-[8px] py-[6px] md:px-[9px] md:py-[7px] rounded-[6px] md:rounded-[7px]"
      style={{ background: "#1A160F" }}
    >
      {/* Ownership dot: solid green (owned) vs dashed hollow (unowned) */}
      {!isMeta && (
        <OwnershipDot
          owned={card.owned}
          className="w-[7px] h-[7px] md:w-[8px] md:h-[8px]"
          label={card.owned ? "Owned" : "Not owned"}
        />
      )}
      {/* For meta rows render a same-sized empty spacer so name aligns */}
      {isMeta && <span className="flex-none w-[7px] h-[7px] md:w-[8px] md:h-[8px]" aria-hidden />}

      {/* Card name — the click target for the detail modal (#127). A meta row names no card
          of its own, so it stays inert text. */}
      {isMeta ? (
        <span className={nameClass} style={{ color: "#8E8269" }}>
          {label}
        </span>
      ) : (
        <CardDetailTrigger
          oracleId={card.oracleId}
          name={card.name}
          siblings={siblings}
          className={nameClass}
          style={{ color: "#EDE6D8", background: "transparent", border: "none", padding: 0 }}
        >
          {label}
        </CardDetailTrigger>
      )}

      {/* Buy tag — unowned non-meta only */}
      {!isMeta && !card.owned && (
        <span
          className="font-mono text-[9px] md:text-[9.5px] rounded-[4px] px-[5px] py-[1px] flex-none"
          style={{ color: "#E0913C", background: "rgba(224,145,60,0.13)" }}
        >
          buy
        </span>
      )}

      {/* Remove ✕ button — desktop only, not shown for meta rows */}
      {!isMeta && (
        <form action={removeCardFromDeck.bind(null, deckId, card.oracleId)} className="hidden md:block">
          <button
            type="submit"
            className="flex-none text-[13px] leading-none"
            style={{ color: "#4A4033", background: "transparent", border: "none", cursor: "pointer" }}
            aria-label={`Remove ${card.name}`}
          >
            ✕
          </button>
        </form>
      )}
    </div>
  );
}
