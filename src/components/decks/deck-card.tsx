import Link from "next/link";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_HEX } from "../../lib/collection/browse";
import type { DeckListItem } from "../../lib/decks/read";
import { DeckCardOverflow } from "./deck-card-overflow";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Label for the color-identity pip row — guild/type label beside the pips. */
function colorLabel(identity: string[]): string {
  if (identity.length === 0) return "Colorless";
  if (identity.length === 1) {
    const MAP: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
    return MAP[identity[0]] ?? identity[0];
  }
  if (identity.length === 5) return "5-color";
  if (identity.length >= 3) return "Multi";
  // 2-color guild names
  const key = identity.slice().sort().join("");
  const GUILDS: Record<string, string> = {
    UW: "Azorius", BU: "Dimir", BR: "Rakdos", GR: "Gruul", GW: "Selesnya",
    BW: "Orzhov", RU: "Izzet", BG: "Golgari", RW: "Boros", GU: "Simic",
  };
  return GUILDS[key] ?? "Multi";
}

/** Progress bar fill color from progressColor. */
const FILL_COLOR: Record<string, string> = {
  success: "#6FA368",
  warning: "#E0913C",
  danger: "#C6533F",
};

/** Status pill variant styles. */
function pillStyles(status: DeckListItem["statusPill"]): { color: string; background: string } {
  switch (status) {
    case "Building":
      return { color: "#E0913C", background: "rgba(224,145,60,0.13)" };
    case "Playable":
    case "Complete":
      return { color: "#6FA368", background: "rgba(111,163,104,0.13)" };
    case "Draft":
    default:
      return { color: "#A89B84", background: "rgba(168,155,132,0.12)" };
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
  const fillColor = FILL_COLOR[deck.progressColor] ?? "#C6533F";
  const fillPercent = Math.min(100, Math.round((deck.built / 99) * 100));
  const artGradient = commanderGradient(deck.commanderColorIdentity);

  return (
    // §Deck card: br 12px, bg #1E1A15, border 1px #2A241D, p 13px/18px, flex col, gap 11px/14px
    <article
      className="relative rounded-[12px] flex flex-col gap-[11px] md:gap-[14px] p-[13px] md:p-[18px]"
      style={{
        background: "#1E1A15",
        border: "1px solid #2A241D",
      }}
    >
      {/* Whole-card tap target — absolute inset Link overlay, aria-labelledby the name */}
      <Link
        href={`/decks/${deck.id}`}
        className="absolute inset-0 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
        aria-labelledby={nameId}
      />

      {/* ── Top row: art thumb + name/pips/pill ── */}
      <div className="flex gap-[12px] md:gap-[14px] items-start">
        {/* §Deck card — art thumb: 42×59px mobile / 52×73px desktop, br 6/8px, gradient bg, inset shadow */}
        {/* Mobile size: w-[42px] h-[59px]. Desktop: md:w-[52px] md:h-[73px]. */}
        <div
          className="shrink-0 w-[42px] h-[59px] rounded-[6px] md:w-[52px] md:h-[73px] md:rounded-[8px]"
          style={{
            background: artGradient,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
          }}
        />

        {/* Name, pips, and pill stack */}
        <div className="min-w-0 flex-1 flex flex-col gap-[4px] md:gap-[6px]">
          {/* §Deck card — name: Cinzel 600 15/18px #EDE6D8, nowrap ellipsis */}
          <div className="flex items-start justify-between gap-[8px]">
            <p
              id={nameId}
              className="font-display font-semibold text-[15px] md:text-[18px] leading-[1.3] truncate"
              style={{ color: "#EDE6D8" }}
            >
              {deck.name}
            </p>

            {/* §Deck card — status pill: mono 10px, 0.06em, br 999px, p 4px 9px / 5px 10px */}
            <span
              className="shrink-0 font-mono text-[10px] tracking-[0.06em] rounded-[999px]"
              style={{
                color: pill.color,
                background: pill.background,
                padding: "4px 9px",
              }}
            >
              {deck.statusPill}
            </span>
          </div>

          {/* §Deck card — pip row: flex, center, gap 7/8px, mt 4/6px */}
          <div className="flex items-center gap-[7px] md:gap-[8px] mt-[4px] md:mt-[6px]">
            {deck.commanderColorIdentity.map((color) => (
              // §Deck card — WUBRG pip: 11/12px, br 999px, colour hex
              <span
                key={color}
                className="shrink-0 rounded-[999px]"
                style={{
                  width: 11,
                  height: 11,
                  background: WUBRG_HEX[color] ?? "#8E8269",
                }}
                aria-label={color}
              />
            ))}
            {/* §Deck card — guild/type label: IBM Plex Mono 11/12px #A89B84, ml 2px */}
            <span
              className="font-mono text-[11px] md:text-[12px] ml-[2px]"
              style={{ color: "#A89B84" }}
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
          {/* §Deck card — built figure: IBM Plex Mono 600 13/15px #EDE6D8 */}
          <span
            className="font-mono font-semibold text-[13px] md:text-[15px]"
            style={{ color: "#EDE6D8" }}
          >
            {deck.built}
            {/* §Deck card — "/ 99" suffix (desktop only): #8E8269 weight 400 */}
            <span className="hidden md:inline font-normal" style={{ color: "#8E8269" }}> / 99</span>
          </span>

          {/* §Deck card — owned · to-buy caption: IBM Plex Mono 11/12px #A89B84 */}
          <span
            className="font-mono text-[11px] md:text-[12px]"
            style={{ color: "#A89B84" }}
          >
            {deck.ownedCount} owned · {deck.toBuyCount} to buy
          </span>
        </div>

        {/* §Deck card — progress bar track: h 6/7px, br 999px, bg #2A241D, overflow hidden */}
        <div
          className="rounded-[999px] overflow-hidden h-[6px] md:h-[7px]"
          style={{
            background: "#2A241D",
          }}
          role="progressbar"
          aria-valuenow={deck.built}
          aria-valuemin={0}
          aria-valuemax={99}
          aria-label={`${deck.built} of 99 cards built`}
        >
          {/* §Deck card — progress bar fill: h 100%, br 999px, colour by progressColor */}
          <div
            className="h-full rounded-[999px]"
            style={{
              width: `${fillPercent}%`,
              background: fillColor,
            }}
          />
        </div>
      </div>

      {/* ── Desktop-only action buttons ── */}
      {/* §Deck card — action buttons: desktop only, flex, gap 9px */}
      <div className="hidden md:flex gap-[9px]">
        {/* §Deck card — "Open builder" button: flex 1, IBM Plex Sans 600 13px #EDE6D8,
            transparent bg, border 1px #3A3229, br 8px, p 9px 0 */}
        <Link
          href={`/decks/${deck.id}`}
          className="relative z-10 flex-1 text-center rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 13,
            color: "#EDE6D8",
            background: "transparent",
            border: "1px solid #3A3229",
            padding: "9px 0",
          }}
          tabIndex={-1}
        >
          Open builder
        </Link>

        {/* §Deck card — "⋯" overflow button — client component, relative z-10 */}
        <DeckCardOverflow deckId={deck.id} deckName={deck.name} />
      </div>
    </article>
  );
}
