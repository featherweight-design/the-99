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
import type { FillRole } from "../../lib/decks/fill";
import { fillDeck } from "../../app/decks/actions";

const copy = recommendationsCopy.fill;

// Role display names — keyed off the FillRole union, matches RECOMMENDED_MIX.
// The union key is what keeps the map honest: adding a role to the fill without
// a label here is a type error rather than a raw "wipes" reaching the sentence.
const ROLE_LABELS: Record<FillRole, string> = {
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
  /** 99 - filled — everything that is not the fill's, kept cards included. */
  open: number;
  /** The first role that missed its target, if any. */
  shortRole?: FillRole;
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
    text = copy.provenanceShort(filledStr, ROLE_LABELS[shortRole], openStr);
  } else if (bought === 0) {
    text = copy.provenanceAllOwned(filledStr, openStr);
  } else if (width === "phone") {
    text = copy.provenanceMobile(filledStr, boughtStr, openStr);
  } else {
    text = copy.provenance(filledStr, boughtStr, openStr);
  }

  return (
    <div
      className="flex items-start gap-[9px] mx-[16px] mt-[10px] mb-[10px] md:mx-[30px] md:mt-[12px]"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
        // 8px phone, 9px desktop
        borderRadius: width === "phone" ? 8 : 9,
        // 9px 12px phone, 11px 15px desktop
        padding: width === "phone" ? "9px 12px" : "11px 15px",
      }}
    >
      {/* ⓘ outlined disc — desktop only; drops at phone where the accent
          bar already anchors the note visually. Matches role-counter-strip.tsx
          §Worked-example callout treatment: outlined, font-display (Cinzel 700),
          12px, accent coloured, no fill. */}
      {width === "desktop" && (
        <div
          className="flex-none flex items-center justify-center rounded-full font-display font-bold text-[12px]"
          style={{
            width: 20,
            height: 20,
            border: "1.5px solid var(--accent)",
            color: "var(--accent)",
          }}
          aria-hidden
        >
          i
        </div>
      )}
      <p
        className="m-0 leading-[1.55]"
        style={{
          color: "var(--fg-body)",
          // 12px phone, 12.5px desktop
          fontSize: width === "phone" ? "12px" : "12.5px",
        }}
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
  /** Whether the deck holds any card at all. Emptiness is the whole question
      here, so the banner takes the answer rather than a total it would have to
      interpret — a row count and a copy count disagree on stacked basics but
      agree on empty. */
  hasCards: boolean;
  onRetry: () => void;
  pending: boolean;
}

export function FillFailedBanner({
  filled,
  hasCards,
  onRetry,
  pending,
}: FillFailedBannerProps) {
  // Only shown when the fill failed (filled=false) and the deck is still empty.
  // A swept deck is filled=true, so it will never match here — that's the point.
  if (filled || hasCards) return null;

  return (
    <div
      className="flex items-start gap-[11px] mx-[16px] mt-[10px] mb-[10px] md:mx-[30px] md:mt-[12px] rounded-[8px] md:rounded-[9px] px-[12px] py-[9px] md:px-[15px] md:py-[11px]"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--warning)",
      }}
    >
      {/* ⚠ bare glyph — no disc, no background. 13px in --warning. */}
      <span
        aria-hidden
        className="flex-none leading-none text-[13px]"
        style={{ color: "var(--warning)" }}
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
          className="m-0 text-[12.5px] leading-[1.55] mt-[4px]"
          style={{ color: "var(--fg-body)" }}
        >
          {copy.failedBody}
        </p>
        {/* Retry link — matches decklist-row.tsx Undo treatment: sans 12.5px
            semibold, accent coloured, border-bottom underline in accent-shadow. */}
        <button
          type="button"
          onClick={onRetry}
          disabled={pending}
          aria-label={copy.failedRetryAria}
          className="flex-none flex items-center mt-[10px] bg-transparent border-0 border-b border-accent-shadow p-0
            text-[12.5px] font-semibold leading-[1.4]
            text-accent cursor-pointer disabled:opacity-50 disabled:cursor-default"
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
  hasCards: boolean;
}

export function FillFailedBannerConnected({
  deckId,
  filled,
  hasCards,
}: FillFailedBannerConnectedProps) {
  const [pending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      try {
        await fillDeck(deckId);
      } catch {
        // The banner already says the fill failed, so a rejected retry changes
        // nothing the player can see — except that an escaped rejection would
        // reach an error boundary and remove the retry affordance entirely.
      }
    });
  };

  return (
    <FillFailedBanner
      filled={filled}
      hasCards={hasCards}
      onRetry={handleRetry}
      pending={pending}
    />
  );
}
