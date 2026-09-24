import type { Bracket } from "../../lib/bracket/types";
import { verdictHead } from "../../lib/bracket/verdict-head";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { BracketMark, bracketInk } from "./bracket-mark";

/**
 * The bracket chip: the mark(s) and the bracket's name on a plate in the bracket's own ink.
 *
 * ONE COMPONENT, TWO MOUNTS: the deck header's chips row and the deck tile's footer. Round 0's
 * "one chip, one meaning, two altitudes" holds only while it is one component, which is why the
 * Analysis tab handoff's redraw (§1) lands HERE rather than in the header, and the tile follows it
 * (readiness finding 3).
 *
 * THE DRAWING: radius 6, a plate of the lower rank's ink at 12% over `--bg`, a hairline of that ink
 * at 55%, 22px chip-form marks, mono 10 / 11 in the ink, 22px tall on the phone and 24px on
 * desktop. A RANGE draws both marks, the upper at 0.65, and names both unrounded — `Optimized or
 * cEDH`, no slash and no `Split`. An answered range draws the answer alone. `verdictHead` decides
 * which, so no mount holds a second copy of that rule.
 */
export function BracketChip({
  permits,
  answered = null,
  face = true,
}: {
  permits: readonly Bracket[];
  /** The declaration, passed only when `declarationAsk` read it as answered. See `lib/bracket/chip-answer`. */
  answered?: Bracket | null;
  /**
   * False draws the marks alone, on the same plate: Home's resume row, which has no room for a
   * name (the Home bracket-chip addendum, R1). The padding closes to 2px either side, so a single
   * mark is 28px wide and a range 55px, hairline included. Every other mount keeps the default.
   */
  face?: boolean;
}) {
  const head = verdictHead(permits, answered);
  const low = head.chip;
  const ink = bracketInk(low);
  const marks = head.split ? permits : [low];
  return (
    <span
      data-testid="bracket-chip"
      data-bracket={head.split ? permits.join("-") : low}
      className={`inline-flex h-[22px] flex-none items-center gap-[5px] whitespace-nowrap rounded-[6px] border pl-[2px] ${face ? "pr-[8px]" : "pr-[2px]"} md:h-[24px]`}
      style={{
        background: `color-mix(in srgb, ${ink} 12%, var(--bg))`,
        borderColor: `color-mix(in oklab, ${ink} 55%, transparent)`,
        // The band's words carry a shadow for the art behind them; the plate is its own ground.
        textShadow: "none",
      }}
    >
      {marks.map((b, i) => (
        <BracketMark key={b} bracket={b} px={CHIP_MARK_PX} dim={i > 0} />
      ))}
      {face && (
        <span className="font-mono text-[10px] md:text-[11px]" style={{ color: ink }}>
          {head.face}
        </span>
      )}
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
  face = true,
}: {
  bracket: { permits: Bracket[]; answered: Bracket | null } | null;
  onOpen?: () => void;
  /** Passed straight to `BracketChip`: false draws the marks alone (the phone header's F18 yield). */
  face?: boolean;
}) {
  if (!bracket) return null;
  const chip = (
    <BracketChip permits={bracket.permits} answered={bracket.answered} face={face} />
  );
  if (!onOpen) return chip;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={deckAnalysisCopy.chip.open(chipName(bracket))}
      // The chip keeps its drawn height (22px, 24px from `md`); the HIT AREA is 44px tall at both
      // (11px either side of 22, 10px either side of 24), per the
      // handoff's own open item ("give it a 44px hit area rather than growing the pill"). The
      // button takes the chip's 6px radius, so its focus ring outlines the plate it wraps.
      className="relative flex flex-none items-center rounded-[6px] after:absolute after:inset-x-0 after:-inset-y-[11px] md:after:-inset-y-[10px] after:content-['']"
    >
      {chip}
    </button>
  );
}

/** The chip's words for a screen reader: the answer, or the range. */
function chipName(bracket: { permits: Bracket[]; answered: Bracket | null }): string {
  return verdictHead(bracket.permits, bracket.answered).face;
}

/** The chip form at 22px (the handoff's `bandChip`), the sanctioned chip size. */
export const CHIP_MARK_PX = 22;
