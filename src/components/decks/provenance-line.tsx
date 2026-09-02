"use client";

// ProvenanceLine — tells the player where the fill's cards came from.
// Not dismissible. Leaves when the last auto card does (parent renders
// it only when autoCount > 0).
//
// FillFailedBanner — shown when deck.filled === false and the deck has no
// cards at all. Offers a retry via the fillDeck server action.

import { useTransition } from "react";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { fillDeck } from "../../app/decks/actions";

const copy = recommendationsCopy.fill;

// Role display names — keyed off the FillRole union, matches RECOMMENDED_MIX.
const ROLE_LABELS: Record<string, string> = {
  ramp: "Ramp",
  draw: "Draw",
  removal: "Removal",
  wipes: "Wipes",
  land: "Land",
};

// ── Shared card shape ────────────────────────────────────────────────────────

interface ProvenanceLineProps {
  /** The current optimistic card list — used only to check for auto cards. */
  cards: DeckDetailCard[];
  /** Total cards the fill placed (from DeckDetail or computed from auto rows). */
  filled: number;
  /** Of filled, how many came from outside the collection. */
  bought: number;
  /** 99 - filled — the slots left open for the player. */
  open: number;
  /** The first role that missed its target, if any. */
  shortRole?: string;
  /** "desktop" renders the full copy; "phone" renders provenanceMobile. */
  width: "desktop" | "phone";
}

export function ProvenanceLine({
  cards,
  filled,
  bought,
  open,
  shortRole,
  width,
}: ProvenanceLineProps) {
  const hasAuto = cards.some((c) => c.auto);
  if (!hasAuto) return null;

  const filledStr = String(filled);
  const boughtStr = String(bought);
  const openStr = String(open);

  // A shortfall outranks width: naming the role is the whole reason this branch
  // exists, and the mobile string has nowhere to put it, so a phone would
  // quietly report the smaller number instead. `provenanceMobile` counts bought
  // cards on its face, so it only stands in for the bought branch — an
  // all-owned phone takes the all-owned string, which is already one sentence.
  let text: string;
  if (shortRole) {
    const roleLabel = ROLE_LABELS[shortRole] ?? shortRole;
    text = copy.provenanceShort(filledStr, roleLabel, openStr);
  } else if (bought === 0) {
    text = copy.provenanceAllOwned(filledStr, openStr);
  } else if (width === "phone") {
    text = copy.provenanceMobile(filledStr, boughtStr, openStr);
  } else {
    text = copy.provenance(filledStr, boughtStr, openStr);
  }

  return (
    <div
      className="flex items-start gap-[10px] mx-[16px] my-[10px] md:mx-[30px]"
      style={{
        background: "#181410",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--brass)",
        borderRadius: 9,
        padding: "11px 15px",
      }}
    >
      {/* ⓘ disc */}
      <span
        aria-hidden
        className="flex-none flex items-center justify-center rounded-full font-mono text-[11px] leading-none"
        style={{
          width: 20,
          height: 20,
          background: "var(--brass)",
          color: "#181410",
          fontWeight: 700,
        }}
      >
        i
      </span>
      <p
        className="m-0 text-[12.5px] leading-[1.6]"
        style={{ color: "var(--fg-body)" }}
      >
        {text}
      </p>
    </div>
  );
}

// ── FillFailedBanner ─────────────────────────────────────────────────────────

interface FillFailedBannerProps {
  /** deck.filled — true if the fill ran, even if the deck was later swept. */
  filled: boolean;
  /** Total cards currently in the deck (auto + kept). */
  cardCount: number;
  onRetry: () => void;
  pending: boolean;
}

export function FillFailedBanner({
  filled,
  cardCount,
  onRetry,
  pending,
}: FillFailedBannerProps) {
  // Only shown when the fill failed (filled=false) and the deck is still empty.
  // A swept deck is filled=true, so it will never match here — that's the point.
  if (filled || cardCount > 0) return null;

  return (
    <div
      className="flex items-start gap-[10px] mx-[16px] my-[10px] md:mx-[30px]"
      style={{
        background: "#181410",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--warning)",
        borderRadius: 9,
        padding: "11px 15px",
      }}
    >
      {/* ⚠ disc */}
      <span
        aria-hidden
        className="flex-none flex items-center justify-center rounded-full text-[11px] leading-none"
        style={{
          width: 20,
          height: 20,
          background: "var(--warning)",
          color: "#181410",
          fontWeight: 700,
        }}
      >
        ⚠
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="m-0 font-semibold text-[12.5px] leading-[1.4]"
          style={{ color: "var(--fg-body)" }}
        >
          {copy.failedHeading}
        </p>
        <p
          className="m-0 text-[12.5px] leading-[1.6] mt-[4px]"
          style={{ color: "var(--fg-body)" }}
        >
          {copy.failedBody}
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={pending}
          aria-label={copy.failedRetryAria}
          className="mt-[8px] font-mono text-[11px] cursor-pointer bg-transparent border-0 p-0 underline text-[color:var(--brass)]"
        >
          {copy.failedRetry}
        </button>
      </div>
    </div>
  );
}

// ── FillFailedBannerConnected ─────────────────────────────────────────────────
// Wires the fillDeck server action to FillFailedBanner. Used by BuilderShell.

interface FillFailedBannerConnectedProps {
  deckId: string;
  filled: boolean;
  cardCount: number;
}

export function FillFailedBannerConnected({
  deckId,
  filled,
  cardCount,
}: FillFailedBannerConnectedProps) {
  const [pending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      await fillDeck(deckId);
    });
  };

  return (
    <FillFailedBanner
      filled={filled}
      cardCount={cardCount}
      onRetry={handleRetry}
      pending={pending}
    />
  );
}
