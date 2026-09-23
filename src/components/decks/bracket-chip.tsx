import type { Bracket } from "../../lib/bracket/types";
import { verdictHead } from "../../lib/bracket/verdict-head";
import { BRACKET_NAMES, deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { BracketMark, bracketInk } from "./bracket-mark";

/**
 * The bracket chip — mark and name in a pill ringed in the bracket's own ink.
 *
 * ONE COMPONENT, THREE MOUNTS. The verdict block draws it at 26/36; the deck tile's footer and the
 * deck header's badge row draw it at the tile size. Round 0's frame: "one chip, one meaning, two
 * altitudes", which is only true while it is one component.
 *
 * A RANGE IS ONE SPLIT CHIP, inked by the lower member: both marks inside it, the upper dimmed,
 * the label `Split`. An answered range draws the answer alone. `verdictHead` decides which, so no
 * mount holds a second copy of that rule.
 */
export function BracketChip({
  permits,
  answered = null,
  px,
  mdPx,
  className = "",
  labelClassName = "text-[11.5px] font-medium",
  slashClassName = "font-mono text-[11px] opacity-70 md:text-[12px]",
}: {
  permits: readonly Bracket[];
  /** The declaration, passed only when `declarationAsk` read it as answered. See `lib/bracket/chip-answer`. */
  answered?: Bracket | null;
  px: number;
  mdPx?: number;
  /** The pill's own box: padding, height. The border and its ink are the chip's. */
  className?: string;
  labelClassName?: string;
  slashClassName?: string;
}) {
  const head = verdictHead(permits, answered);
  const low = head.chip;
  const high = permits[permits.length - 1];
  return (
    <span
      data-testid="bracket-chip"
      data-bracket={head.split ? permits.join("-") : low}
      className={`inline-flex items-center rounded-full border ${className}`}
      style={{ borderColor: `color-mix(in oklab, ${bracketInk(low)} 55%, transparent)` }}
    >
      <BracketMark bracket={low} px={px} mdPx={mdPx} />
      {head.split ? (
        <>
          <span aria-hidden="true" className={slashClassName} style={{ color: bracketInk(low) }}>
            /
          </span>
          <BracketMark bracket={high} px={px} mdPx={mdPx} dim />
        </>
      ) : null}
      <span className={labelClassName} style={{ color: bracketInk(low) }}>
        {head.split ? deckAnalysisCopy.verdict.splitChip : BRACKET_NAMES[low]}
      </span>
    </span>
  );
}

/**
 * The chip in the deck header's badge row, both widths. A button, because Round 0 §5 has
 * "tapping either lands on the Analysis tab" and the header is where that can happen; the deck
 * tile's footer cannot host it, being presentation inside the tile's own link.
 */
export function SpineBracketChip({
  bracket,
  onOpen,
}: {
  bracket: { permits: Bracket[]; answered: Bracket | null } | null;
  onOpen?: () => void;
}) {
  if (!bracket) return null;
  const chip = (
    <BracketChip
      permits={bracket.permits}
      answered={bracket.answered}
      px={CHIP_MARK_PX}
      className="h-[22px] flex-none gap-[4px] pl-[1px] pr-[8px]"
      labelClassName="text-[11px] font-medium"
      slashClassName="font-mono text-[10px] opacity-70"
    />
  );
  if (!onOpen) return chip;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={deckAnalysisCopy.chip.open(chipName(bracket))}
      // The pill stays 22px, the badge row's line; the HIT AREA is 44px tall, per the handoff's
      // own open item ("give it a 44px hit area rather than growing the pill").
      className="relative flex flex-none items-center rounded-full after:absolute after:inset-x-0 after:-inset-y-[11px] after:content-['']"
    >
      {chip}
    </button>
  );
}

/** The chip's words for a screen reader: the answer, or the range. */
function chipName(bracket: { permits: Bracket[]; answered: Bracket | null }): string {
  return verdictHead(bracket.permits, bracket.answered).face;
}

/**
 * The bracket mark inside the tile and header chips. 20, not Round 0's 22: that figure was for
 * the bare mark matching the status pill's 22px height, and the named chip that replaced it (the
 * handoff's outstanding list) rings the mark with 1px either side. 20 is still the chip form, the
 * smallest that draws a silhouette rather than the numeral alone.
 */
export const CHIP_MARK_PX = 20;
