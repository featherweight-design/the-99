import { Fragment } from "react";

import { WUBRG_COLOR } from "../../lib/cards/colors";
import { manaCopy, spokenFullManaCost, spokenManaCost } from "../../lib/copy/card-surfaces";
import { faceCosts, frontFaceCost } from "../../lib/cards/faces";

// Mana cost as coloured pips. Promoted out of `suggestion-tile.tsx`, which drew
// the shipped treatment the design tables then ratified: hybrid and Phyrexian
// split the pip on a 135° gradient, one colour fills it, and the numeral draws
// whenever the symbol has one — so two-brid "2/W" is a white pip reading 2
// rather than a white pip claiming to be free.
//
// A bare mana value is not a fallback for a long cost: `{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}`
// and `{10}` are the same integer and different cards. A long cost is CAPPED rather than
// compressed: past the cap the last slot becomes a generic pip counting what it left out,
// and the pips it does draw are always a real 3px apart.

// "{2}{U}{B}" → ["2", "U", "B"]. Hybrid and Phyrexian symbols come back whole
// ("U/B", "G/P"), which is why the cost is carried as Scryfall's string rather
// than reconstructed from the mana value.
//
// The front face only: an `adventure`, `split` or `prepare` card stores both
// halves in one string (`{3}{B} // {B}`), and a pip run cannot say `//` — so
// without this the Adventure's pip joined the creature's run and the row drew a
// cost no face has.
export function parseManaCost(cost: string): string[] {
  return [...frontFaceCost(cost).matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

// Pips never overlap. They did: a 40px track could not hold three 12px pips at a 3px gap, so
// every pip past the second stepped 5px into its neighbour and five fitted exactly, and two
// black pips overlapping read as one. It applied wherever a caller passed `cap` — the
// decklist's desktop track, the pending banner, the top-off list, `/collection`'s rows — and
// not to the uncapped runs, which is why the phone's meta line always drew a real gap. Every
// one of those surfaces has the room for the full run, which is the whole reason the track
// can simply be as wide as what it holds.
//
// 5 × 12 + 4 × 3 = 72, so the track is 72: the cap's five slots at their real gap, and no
// arithmetic left over to get wrong.

/**
 * The cost track every surface that draws costs in a column shares.
 *
 * Exported rather than repeated per caller because the arithmetic above is derived from
 * exactly these three numbers: `COST_PIP_CAP` pips of `COST_PIP_SIZE` at the 3px gap measure
 * `COST_TRACK` precisely. A caller that picked its own track would either misalign against
 * the rows beside it or burst one this module still believes is 72px wide.
 */
export const COST_TRACK = 72;
export const COST_PIP_CAP = 5;
export const COST_PIP_SIZE = 12;

/**
 * A row's cost slot, drawn whether or not the card has a cost.
 *
 * A null cost still draws the track, empty. The name is the only flexible item
 * on these rows, so a land that ended its row short pulled whatever follows the
 * cost out to the right edge and off the vertical every costed row beside it
 * holds.
 */
export function CostTrack({ cost }: { cost: string | null }) {
  return (
    <span className="flex flex-none items-center justify-end" style={{ width: COST_TRACK }}>
      {cost ? (
        <CostPips cost={cost} size={COST_PIP_SIZE} track={COST_TRACK} cap={COST_PIP_CAP} spoken />
      ) : null}
    </span>
  );
}

type CostPipsProps = {
  /**
   * The stored cost. NULL is accepted and draws nothing, because "this card has
   * no cost" is an ordinary answer on every surface that draws one — a land, or
   * a face the catalog gives no cost. Callers used to gate on it themselves and
   * pass `cost ?? ""` to satisfy the type, which is the same question asked
   * twice and answered here anyway.
   *
   * A caller deciding its own LAYOUT from the cost still has to ask
   * `hasFrontFaceCost`: whether this component draws anything is a different
   * question from whether the row should reserve space for it.
   */
  cost: string | null;
  /** Pip diameter. 12px in the decklist's desktop track, 13px on the phone meta line. */
  size?: number;
  /** Fixed track width in px. Omitted, the run is as wide as its pips. */
  track?: number;
  /**
   * Slots drawn before the run is capped. At the cap the last slot is a generic
   * pip carrying `+N`. Omitted, nothing is capped and the run is as long as its cost.
   */
  cap?: number;
  /**
   * Speak the cost beside the pips. The string is never capped even when the
   * pips are. Omit where an adjacent element already names the cost.
   */
  spoken?: boolean;
  /**
   * Draw EVERY cost the card prints rather than the front face's alone, with
   * the printed `//` between them — a split, an adventure, or a castable back.
   *
   * Off by default, because a run in a column shows one face and has a fixed
   * track that two costs and a separator would burst. It is on where the sheet
   * stands in for the card itself: the proxy list prints a card to play with,
   * and a proxy of `Repudiate // Replicate` carrying one of its two costs is a
   * card you cannot cast the other half of.
   *
   * `cap` and `track` are per-run figures and are not designed against this —
   * pass it on an uncapped, untracked run.
   */
  allFaces?: boolean;
  className?: string;
};

export function CostPips({
  cost,
  size = 14,
  track,
  cap,
  spoken,
  allFaces,
  className,
}: CostPipsProps) {
  // One run by default — `parseManaCost` takes the front half, which is the face
  // a row shows. `allFaces` draws every printed cost instead.
  const halves = (allFaces ? faceCosts(cost) : [cost ?? ""])
    .map((half) => parseManaCost(half))
    .filter((symbols) => symbols.length > 0);
  if (halves.length === 0) return null;

  return (
    <>
      <span
        aria-hidden
        className={className ?? "flex gap-[3px]"}
        // Width only, and never `display`: an inline display outranks a `hidden` utility
        // class, so a track hidden at one width by its own className drew anyway — two runs
        // of pips overprinting each other. Every caller's className carries a display,
        // including the default below.
        style={track === undefined ? undefined : { width: track, justifyContent: "flex-end" }}
      >
        {halves.map((symbols, half) => {
          // At the cap, four coloured pips plus the overflow pip — so
          // `{W}{U}{B}{R}{G}` draws five real pips and only a sixth symbol
          // starts the count.
          const capped = cap !== undefined && symbols.length > cap;
          const drawn = capped ? symbols.slice(0, cap - 1) : symbols;
          const omitted = symbols.length - drawn.length;
          return (
            <Fragment key={half}>
              {/* The mark the printed name carries, and the same one the card
                  modal draws between two costs. */}
              {half > 0 ? (
                <span
                  className="font-mono px-[1px]"
                  style={{ color: "var(--fg-muted)", fontSize: Math.round(size * 0.8) }}
                >
                  {manaCopy.costHalfSeparator}
                </span>
              ) : null}
              {drawn.map((sym, i) => (
                <Pip key={i} symbol={sym} size={size} />
              ))}
              {capped ? (
                <Pip symbol={null} label={manaCopy.pipOverflow(omitted)} size={size} />
              ) : null}
            </Fragment>
          );
        })}
      </span>
      {spoken ? (
        <span className="sr-only">
          {allFaces ? spokenFullManaCost(cost) : spokenManaCost(cost)}
        </span>
      ) : null}
    </>
  );
}

function Pip({
  symbol,
  label,
  size,
}: {
  symbol: string | null;
  label?: string;
  size: number;
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
      }}
    >
      {label ?? (colours.length > 0 ? (numeral ?? "") : symbol)}
    </span>
  );
}
