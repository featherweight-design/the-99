import { WUBRG_COLOR } from "../../lib/collection/browse";
import { manaCopy, spokenManaCost } from "../../lib/copy/card-surfaces";

// Mana cost as coloured pips. Promoted out of `suggestion-tile.tsx`, which drew
// the shipped treatment the design tables then ratified: hybrid and Phyrexian
// split the pip on a 135° gradient, one colour fills it, and the numeral draws
// whenever the symbol has one — so two-brid "2/W" is a white pip reading 2
// rather than a white pip claiming to be free.
//
// A bare mana value is not a fallback for a long cost: `{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}`
// and `{10}` are the same integer and different cards. Long costs shingle, and
// past the cap the last slot becomes a generic pip counting what it left out.

// "{2}{U}{B}" → ["2", "U", "B"]. Hybrid and Phyrexian symbols come back whole
// ("U/B", "G/P"), which is why the cost is carried as Scryfall's string rather
// than reconstructed from the mana value.
export function parseManaCost(cost: string): string[] {
  return [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

// Three plain 12px pips at gap 3 measure 42px and burst the 40px track, so
// shingling engages at three: each pip after the first steps 5px into its
// neighbour, which puts five pips at exactly 40px. Below three the gap is real.
const SHINGLE_FROM = 3;
const SHINGLE_OVERLAP = 5;

type CostPipsProps = {
  cost: string;
  /** Pip diameter. 12px in the decklist's desktop track, 13px on the phone meta line. */
  size?: number;
  /** Fixed track width in px. Omitted, the run is as wide as its pips. */
  track?: number;
  /**
   * Slots drawn before the run is capped. At the cap the last slot is a generic
   * pip carrying `+N`. Omitted, nothing is capped and nothing shingles.
   */
  cap?: number;
  /**
   * Speak the cost beside the pips. The string is never capped even when the
   * pips are. Omit where an adjacent element already names the cost.
   */
  spoken?: boolean;
  className?: string;
};

export function CostPips({ cost, size = 14, track, cap, spoken, className }: CostPipsProps) {
  const symbols = parseManaCost(cost);
  if (symbols.length === 0) return null;

  // At the cap, four coloured pips plus the overflow pip — so `{W}{U}{B}{R}{G}`
  // draws five real pips and only a sixth symbol starts the count.
  const capped = cap !== undefined && symbols.length > cap;
  const drawn = capped ? symbols.slice(0, cap - 1) : symbols;
  const omitted = symbols.length - drawn.length;
  const slots = drawn.length + (capped ? 1 : 0);
  const shingled = cap !== undefined && slots >= SHINGLE_FROM;

  return (
    <>
      <span
        aria-hidden
        className={className ?? "flex gap-[3px]"}
        style={{
          // Gap only. `display` was set here too, and an inline display beats a
          // `hidden` utility class, so a track hidden at one width by its own
          // className drew anyway the moment it shingled — two runs of pips
          // overprinting each other. Every caller's className carries a display,
          // including the default below.
          ...(shingled ? { gap: 0 } : null),
          ...(track === undefined ? null : { width: track, justifyContent: "flex-end" }),
        }}
      >
        {drawn.map((sym, i) => (
          <Pip
            key={i}
            symbol={sym}
            size={size}
            inset={shingled && i > 0 ? SHINGLE_OVERLAP : 0}
          />
        ))}
        {capped ? (
          <Pip
            symbol={null}
            label={manaCopy.pipOverflow(omitted)}
            size={size}
            inset={shingled ? SHINGLE_OVERLAP : 0}
          />
        ) : null}
      </span>
      {spoken ? <span className="sr-only">{spokenManaCost(cost)}</span> : null}
    </>
  );
}

function Pip({
  symbol,
  label,
  size,
  inset,
}: {
  symbol: string | null;
  label?: string;
  size: number;
  inset: number;
}) {
  const parts = symbol?.split("/") ?? [];
  const colours = parts.filter((p) => /^[WUBRG]$/.test(p));
  const numeral = parts.find((p) => /^\d+$/.test(p));
  const background =
    colours.length >= 2
      ? `linear-gradient(135deg, ${WUBRG_COLOR[colours[0]]} 50%, ${WUBRG_COLOR[colours[1]]} 50%)`
      : colours.length === 1
        ? WUBRG_COLOR[colours[0]]
        : "var(--fg-faint)";
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full font-mono font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.64),
        background,
        color: "var(--bg)",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.45)",
        ...(inset ? { marginLeft: -inset } : null),
      }}
    >
      {label ?? (colours.length > 0 ? (numeral ?? "") : symbol)}
    </span>
  );
}
