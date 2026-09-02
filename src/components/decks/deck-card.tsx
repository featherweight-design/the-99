import Link from "next/link";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import type { DeckListItem } from "../../lib/decks/read";
import { colorLabel } from "../../lib/decks/format";
import { DeckCardOverflow } from "./deck-card-overflow";
import { GhostButton } from "@/components/ui/button";
import { deckImportCopy } from "../../lib/copy/deck-import";

/** Progress bar fill color by built bucket. §Deck card — progress bar fill */
function progressFillColor(built: number): string {
  if (built >= 99) return "var(--success)";
  if (built >= 55) return "var(--warning)";
  return "var(--danger)";
}

/** Status pill variant styles. */
function pillStyles(status: DeckListItem["statusPill"]): { color: string; background: string } {
  switch (status) {
    case "Building":
      return { color: "var(--warning)", background: "rgba(224,145,60,0.13)" };
    case "Playable":
    case "Complete":
      return { color: "var(--success)", background: "rgba(111,163,104,0.13)" };
    case "Draft":
    default:
      return { color: "var(--fg-muted)", background: "rgba(168,155,132,0.12)" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DeckCardProps {
  deck: DeckListItem;
}

/**
 * DeckCard — server component, pure presentational.
 * §Deck card, §Deck card — art thumb, §Deck card — name,
 * §Deck card — pip row, §Deck card — WUBRG pip, §Deck card — guild/type label,
 * §Deck card — status pill, §Deck card — progress figure row,
 * §Deck card — built figure, §Deck card — "/ 99" suffix,
 * §Deck card — owned · to-buy caption, §Deck card — progress bar track/fill,
 * §Deck card — action buttons (desktop only), §Deck card — "Open builder" button,
 * §Deck card — "⋯" overflow button.
 *
 * Nested-interactive pattern: <article> wraps an absolute-inset <Link> overlay
 * as the card tap target. Action buttons are `relative z-10` siblings so they
 * sit above the overlay and capture their own clicks without triggering navigation.
 */
export function DeckCard({ deck }: DeckCardProps) {
  const nameId = `deck-name-${deck.id}`;
  const pill = pillStyles(deck.statusPill);
  const fillColor = progressFillColor(deck.built);
  const fillPercent = Math.min(100, Math.round((deck.built / 99) * 100));
  const artGradient = commanderGradient(deck.commanderColorIdentity);

  return (
    // §Deck card: br 12px, bg var(--surface), border 1px var(--border), p 13px/22px, flex col, gap 11px/18px
    // Desktop padding and gap lifted by the richness pass ("deck-list cards
    // padding 16→22, gap +4"); mobile is unchanged. Browse loosens, working
    // surfaces (the decklist ledger, the Add panel) stay tight.
    <article
      className="relative rounded-[12px] flex flex-col gap-[11px] md:gap-[18px] p-[13px] md:p-[22px]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Whole-card tap target — absolute inset Link overlay, aria-labelledby the name */}
      <Link
        href={`/decks/${deck.id}`}
        className="absolute inset-0 rounded-[12px]"
        aria-labelledby={nameId}
      />

      {/* ── Top row: art thumb + name/pips/pill ── */}
      <div className="flex gap-[12px] md:gap-[14px] items-start">
        {/* §Deck card — art thumb: 42×59px mobile / 52×73px desktop, br 6/8px, gradient bg, inset shadow */}
        {/* Mobile size: w-[42px] h-[59px]. Desktop: md:w-[52px] md:h-[73px]. */}
        <div
          className="shrink-0 w-[42px] h-[59px] rounded-[6px] md:w-[52px] md:h-[73px] md:rounded-[8px]"
          style={{
            background: deck.commanderImageUri
              ? `url(${deck.commanderImageUri}) center/cover`
              : artGradient,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
          }}
        />

        {/* Name, pips, and pill stack */}
        <div className="min-w-0 flex-1 flex flex-col gap-[4px] md:gap-[6px]">
          {/* §Deck card — name: Cinzel 600 15/18px var(--fg), nowrap ellipsis */}
          <div className="flex items-start justify-between gap-[8px]">
            <p
              id={nameId}
              className="font-display font-semibold text-[15px] md:text-[18px] leading-[1.3] truncate"
              style={{ color: "var(--fg)" }}
            >
              {deck.name}
            </p>

            {/* §Deck card — status pill: mono 10px, 0.06em, br 999px, p 4px 9px / 5px 10px */}
            <span
              className="shrink-0 font-mono text-[10px] tracking-[0.06em] rounded-[999px] px-[9px] py-[4px] md:px-[10px] md:py-[5px]"
              style={{
                color: pill.color,
                background: pill.background,
              }}
            >
              {deck.statusPill}
            </span>
          </div>

          {/* §Deck card — pip row: flex, center, gap 7/8px, mt 4/6px */}
          <div className="flex items-center gap-[7px] md:gap-[8px] mt-[4px] md:mt-[6px]">
            {deck.commanderColorIdentity.map((color) => (
              // §Deck card — WUBRG pip: 11/12px, br 999px, color hex
              <span
                key={color}
                className="shrink-0 rounded-[999px] w-[11px] h-[11px] md:w-[12px] md:h-[12px]"
                style={{
                  background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
                }}
                aria-hidden
              />
            ))}
            {/* §Deck card — guild/type label: IBM Plex Mono 11/12px var(--fg-muted), ml 2px */}
            <span
              className="font-mono text-[11px] md:text-[12px] ml-[2px]"
              style={{ color: "var(--fg-muted)" }}
            >
              {colorLabel(deck.commanderColorIdentity)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Progress section ── */}
      <div>
        {/* §Deck card — progress figure row: flex, space-between, baseline, mb 5/6px */}
        <div
          className="flex justify-between items-baseline mb-[5px] md:mb-[6px]"
        >
          {/* §Deck card — built figure: IBM Plex Mono 600 13/15px var(--fg) */}
          <span
            className="font-mono font-semibold text-[13px] md:text-[15px]"
            style={{ color: "var(--fg)" }}
          >
            {deck.built}
            {/* §Deck card — "/ 99" suffix (desktop only): var(--fg-faint) weight 400 */}
            <span className="hidden md:inline font-normal" style={{ color: "var(--fg-faint)" }}> / 99</span>
          </span>

          {/* §Deck card — owned · to-buy caption: IBM Plex Mono 11/12px var(--fg-muted) */}
          <span
            className="font-mono text-[11px] md:text-[12px]"
            style={{ color: "var(--fg-muted)" }}
          >
            {deck.ownedCount} owned · {deck.toBuyCount} to buy
          </span>
        </div>

        {/* §Deck card — progress bar track: h 6/7px, br 999px, bg var(--elevated), overflow hidden */}
        <div
          className="rounded-[999px] overflow-hidden h-[6px] md:h-[7px]"
          style={{
            background: "var(--elevated)",
          }}
          role="progressbar"
          aria-valuenow={deck.built}
          aria-valuemin={0}
          aria-valuemax={99}
          aria-label={`${deck.built} of 99 cards built`}
        >
          {/* §Deck card — progress bar fill: h 100%, br 999px, color by built bucket */}
          <div
            className="h-full rounded-[999px]"
            style={{
              width: `${fillPercent}%`,
              background: fillColor,
            }}
          />
        </div>

        {/* §Deck with unresolved rows on /decks — an additive count marker, not
            a new status. The status vocabulary is unchanged: threading a fifth
            pill value through the server list and the optimistic client list
            would multiply the surfaces that can disagree mid-mutation. Clears
            itself when the last line is resolved or deleted. */}
        {deck.unresolvedCount > 0 && (
          <p
            className="font-mono text-[10px] md:text-[10.5px] mt-[6px] md:mt-[7px] m-0"
            style={{ color: "var(--warning)" }}
          >
            {deckImportCopy.unresolved.deckCardBadge(deck.unresolvedCount)}
          </p>
        )}
      </div>

      {/* ── Desktop-only action buttons ── */}
      {/* §Deck card — action buttons: desktop only, flex, gap 9px */}
      <div className="hidden md:flex gap-[9px]">
        {/* §Deck card — "Open builder" button: flex 1, IBM Plex Sans 600 13px var(--fg),
            transparent bg, border 1px var(--border-strong), br 8px, p 9px 0 */}
        <GhostButton
          href={`/decks/${deck.id}`}
          className="relative z-10 flex-1 text-center text-[13px] py-[9px] px-0"
          tabIndex={-1}
          aria-hidden="true"
        >
          Open builder
        </GhostButton>

        {/* §Deck card — "⋯" overflow button — client component, relative z-10 */}
        <DeckCardOverflow deckId={deck.id} deckName={deck.name} />
      </div>
    </article>
  );
}
