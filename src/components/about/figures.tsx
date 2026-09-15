// The figures. Each one mounts the app's OWN component with fixture props —
// never a drawing of it, and never a fork (STATES-about-r3.md §G3).
//
// That is what keeps this page true a year from now: a mark whose colour,
// size or glyph changes in its own component changes here on the next render,
// where a screenshot or a hand-drawn copy would quietly start lying.
//
// Not every entry has one. A figure earns its place by teaching something the
// caption cannot — a glyph, a state a word does not distinguish, a set of
// options a reader has to recognise later. An entry whose subject is a
// workflow keeps its words; `FIGURES` is a partial map on purpose, and the
// page draws the caption alone where there is no entry for it.

import { AvailabilityMarker } from "../ui/availability-marker";
import { OwnershipDot } from "../ui/ownership-dot";
import { CostPips } from "../ui/cost-pips";
import { BuyTag } from "../decks/buy-tag";
import { StatusPillBadge } from "../decks/status-pill";
import { FitBar } from "../commanders/fit-bar";
import { TwoFacedMark } from "../cards/two-faced-mark";
import { Specimen, SpecimenCell, SpecimenGrid } from "./specimen";
import {
  AVAILABILITY,
  COSTS,
  FIT_DEGRADED,
  FIT_FULL,
  PRICES,
  STATUSES,
} from "../../lib/about/fixtures";

/** The four availability states, including the one that draws nothing. */
function AvailabilityFigure() {
  const caption: Record<string, string> = {
    free: "free — nothing at all",
    soft: "in a brew",
    hard: "none free",
    over: "short 2",
  };
  return (
    <Specimen label="availability">
      <SpecimenGrid>
        {AVAILABILITY.map(({ key, a }) => (
          <SpecimenCell key={key} caption={caption[key]}>
            {/* free renders null, and that IS the state — the cell keeps its
                height so the absence reads as one of the four rather than as a
                figure that failed to draw. */}
            <AvailabilityMarker availability={a} density="row" />
          </SpecimenCell>
        ))}
      </SpecimenGrid>
    </Specimen>
  );
}

/** The four claims a buy tag makes, which are not four ways of saying "cost". */
function BuyTagFigure() {
  const caption: Record<string, string> = {
    priced: "a figure — stocked today",
    foilOnly: "foil only",
    soldOut: "stocked, none today",
    absent: "no price in the feed",
  };
  const newest = PRICES[0].fact.asOf;
  return (
    <Specimen label="buy-tag">
      <SpecimenGrid>
        {PRICES.map(({ state, fact }) => (
          <SpecimenCell key={state} caption={caption[state]}>
            <BuyTag
              variant="row"
              price={fact}
              // `soldOut` is a stale row against the newest stamp, so the
              // fixture's own date is the newest for three of the four and
              // deliberately not for that one.
              newestAsOf={state === "soldOut" ? new Date(newest.getTime() + 86_400_000) : newest}
              density="full"
            />
          </SpecimenCell>
        ))}
      </SpecimenGrid>
    </Specimen>
  );
}

/** All six statuses. The reader meets these as a badge and nothing else. */
function StatusFigure() {
  return (
    <Specimen label="status">
      <div className="flex flex-wrap items-center gap-[10px]">
        {STATUSES.map((status) => (
          <StatusPillBadge key={status} status={status} />
        ))}
      </div>
    </Specimen>
  );
}

/** The bar, both shapes: three segments out of 100, and two out of 40. */
function FitFigure() {
  return (
    <Specimen label="fit">
      <div className="flex flex-col gap-[14px]">
        <div>
          <FitBar fit={FIT_FULL} legend />
          <p className="mt-[6px] font-mono text-[10px] text-[color:var(--fg-faint)]">
            15 + 25 + 33 = 73 of 100
          </p>
        </div>
        <div>
          <FitBar fit={FIT_DEGRADED} />
          <p className="mt-[6px] font-mono text-[10px] text-[color:var(--fg-faint)]">
            12 + 15 = 27 of 40 — two segments, and the denominator says so
          </p>
        </div>
      </div>
    </Specimen>
  );
}

/** What a decklist row puts in each of its four slots. */
function MarksFigure() {
  return (
    <Specimen label="marks">
      <SpecimenGrid>
        <SpecimenCell caption="owned and free">
          <OwnershipDot owned />
        </SpecimenCell>
        <SpecimenCell caption="not owned">
          <OwnershipDot owned={false} />
        </SpecimenCell>
        <SpecimenCell caption="the printed cost">
          <CostPips cost={COSTS.crowded} />
        </SpecimenCell>
        <SpecimenCell caption="two faces">
          <TwoFacedMark />
        </SpecimenCell>
      </SpecimenGrid>
    </Specimen>
  );
}

/**
 * Entry id → figure. A partial map: an entry with no figure draws its caption
 * and its key lines, which is what every entry did before this PR and is still
 * a complete answer for a workflow.
 */
export const FIGURES: Record<string, () => React.JSX.Element> = {
  availability: AvailabilityFigure,
  "buy-tag": BuyTagFigure,
  statuses: StatusFigure,
  "fit-score": FitFigure,
  "decklist-marks": MarksFigure,
};
