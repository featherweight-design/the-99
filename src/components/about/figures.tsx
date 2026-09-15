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
import { COST_PIP_CAP, COST_PIP_SIZE, COST_TRACK, CostPips } from "../ui/cost-pips";
import { BuyTag } from "../decks/buy-tag";
import { StatusPillBadge } from "../decks/status-pill";
import { refreshCopy } from "../../lib/copy/refresh";
import { FitBar } from "../commanders/fit-bar";
import { TwoFacedMark } from "../cards/two-faced-mark";
import { Specimen, SpecimenCell, SpecimenGrid } from "./specimen";
import type { AboutWidth } from "../../lib/copy/about";
import {
  AVAILABILITY,
  CARDS,
  COSTS,
  FIT_DEGRADED,
  FIT_FULL,
  PRICES,
  STATUSES,
} from "../../lib/about/fixtures";

/** The four availability states, including the one that draws nothing. */
function AvailabilityFigure({ width }: { width: AboutWidth }) {
  const caption: Record<string, string> = {
    free: "free — nothing at all",
    soft: "in a brew",
    hard: "none free",
    over: "short 2",
  };
  return (
    <Specimen label="availability" width={width}>
      <SpecimenGrid>
        {AVAILABILITY.map(({ key, a }) => (
          <SpecimenCell key={key} caption={caption[key]}>
            {/* free renders null, and that IS the state — the cell keeps its
                height so the absence reads as one of the four rather than as a
                figure that failed to draw. */}
            {/* `seam` is the hairline joining the two over-diamonds and only
                reads as a seam while it matches what is BEHIND it. It defaults
                to `--bg`; the plate is `--surface-sunken`. */}
            {/* `density="row"` leaves the font to the caller, and the real
                decklist row supplies these two classes. Without them the
                marker inherits this page's body type and shows a treatment
                the reader will never meet. */}
            <span className="font-mono text-[11px] min-[1000px]:text-[11.5px]">
              <AvailabilityMarker availability={a} density="row" seam="var(--surface-sunken)" />
            </span>
          </SpecimenCell>
        ))}
      </SpecimenGrid>
    </Specimen>
  );
}

/** The four claims a buy tag makes, which are not four ways of saying "cost". */
function BuyTagFigure({ width }: { width: AboutWidth }) {
  const caption: Record<string, string> = {
    priced: "a figure — stocked today",
    foilOnly: "foil only",
    soldOut: "stocked, none today",
    absent: "no price in the feed",
  };
  const newest = PRICES[0].fact.asOf;
  return (
    <Specimen label="buy-tag" width={width}>
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

/**
 * All six statuses, each beside the figure that explains it — which is what
 * the entry's caption promises, and a plate of six words alone cannot keep.
 *
 * Every clause is a shipped string from `refreshCopy.decks`, never retyped
 * here: a badge is only half of what the reader sees on a deck card, and the
 * figure beside it is the other half.
 */
function StatusFigure({ width }: { width: AboutWidth }) {
  const detail = refreshCopy.decks;
  const clause: Record<string, string> = {
    Draft: detail.detailDraft,
    Building: detail.detailCopies(87),
    Over: detail.detailOver(5),
    Unresolved: detail.detailUnresolved(2),
    "To buy": detail.detailToBuyNoPrice(3),
    Complete: detail.detailCopies(99),
  };
  return (
    <Specimen label="status" width={width}>
      <div className="flex flex-col gap-[8px]">
        {STATUSES.map((status) => (
          <div key={status} className="flex items-center gap-[10px]">
            {/* The className is REQUIRED: the component defaults to
                `TILE_CLASS`, which opens `absolute bottom-[13px] left-[13px]`
                because its usual home is pinned to a tile's art. Defaulted
                inside an unpositioned figure, all six leave flow and stack on
                the page's corner, and this plate draws empty. */}
            <StatusPillBadge
              status={status}
              className="flex h-[24px] flex-none items-center rounded-[6px] px-[9px] font-mono text-[11px] tracking-[0.06em]"
            />
            <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
              {clause[status]}
            </span>
          </div>
        ))}
      </div>
    </Specimen>
  );
}

/** The bar, both shapes: three segments out of 100, and two out of 40. */
function FitFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="fit" width={width}>
      {/* No `legend`: FitBar draws it `hidden sm:flex`, so passing it would
          show one to a desktop reader and nothing to a phone, and the entry's
          key lines name the three parts for both.

          The captions are ANNOTATION — one mono line under the thing it names,
          which the grammar allows — not specimen strings. Prose inside the
          frame would be this page writing sentences the app does not ship,
          which is rule 4 of the copy file. */}
      <div className="flex flex-col gap-[14px]">
        <SpecimenCell caption="three segments, out of 100">
          <div className="w-full">
            <FitBar fit={FIT_FULL} />
          </div>
        </SpecimenCell>
        <SpecimenCell caption="synergy unmeasurable — two segments, out of 40">
          <div className="w-full">
            <FitBar fit={FIT_DEGRADED} />
          </div>
        </SpecimenCell>
      </div>
    </Specimen>
  );
}

/**
 * What a decklist ROW puts in each of its slots, in the order it puts them.
 *
 * Rows, not tiles. The tile treatment was retired when the marks moved to
 * per-column annotation (STATES-about-r4 §I: "full-width rows, unchanged —
 * the row already IS the reduction"), so a 2×2 grid of glyphs teaches a
 * surface the reader will not meet.
 *
 * Every part is the app's own component at the row's own size: the dot at 7px,
 * the cost at COST_PIP_SIZE inside COST_TRACK, the marker in the row's mono.
 * The ROW ITSELF is not mounted — it takes a deck id, mutation handlers and a
 * card record, none of which a reference page has or should invent — so this
 * assembles its parts rather than forking it.
 */
function MarksFigure({ width }: { width: AboutWidth }) {
  const rows = [
    { name: CARDS.owned, owned: true, cost: COSTS.simple, a: AVAILABILITY[0].a, note: "yours, and nothing wants it" },
    { name: CARDS.removed, owned: true, cost: COSTS.crowded, a: AVAILABILITY[1].a, note: "a brew wants it" },
    { name: "Cyclonic Rift", owned: true, cost: COSTS.simple, a: AVAILABILITY[3].a, note: "more asked for than you own" },
  ];
  return (
    <Specimen label="marks" width={width}>
      <div className="flex flex-col gap-[10px]">
        {rows.map((row) => (
          <div key={row.name} className="flex flex-col gap-[4px]">
            <div className="flex items-center gap-[8px]">
              <OwnershipDot owned={row.owned} size={7} />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-[color:var(--fg)]">
                {row.name}
              </span>
              <span className="font-mono text-[11px] min-[1000px]:text-[11.5px]">
                <AvailabilityMarker
                  availability={row.a}
                  density="row"
                  seam="var(--surface-sunken)"
                />
              </span>
              <CostPips
                cost={row.cost}
                size={COST_PIP_SIZE}
                track={COST_TRACK}
                cap={COST_PIP_CAP}
              />
            </div>
            <span className="font-mono text-[10px] leading-[1.35] text-[color:var(--fg-faint)]">
              {row.note}
            </span>
          </div>
        ))}
        {/* The two-faced mark rides beside a name rather than in a slot of its
            own, which is where the row draws it. */}
        <div className="flex items-center gap-[8px]">
          <OwnershipDot owned={false} size={7} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-[color:var(--fg)]">
            {CARDS.twoFaced}
          </span>
          <TwoFacedMark layout="transform" />
          <BuyTag variant="row" price={PRICES[0].fact} newestAsOf={PRICES[0].fact.asOf} density="full" />
        </div>
        <span className="font-mono text-[10px] leading-[1.35] text-[color:var(--fg-faint)]">
          not owned — the buy mark takes the slot, and `//` says two faces
        </span>
      </div>
    </Specimen>
  );
}

/**
 * Entry id → figure. A partial map: an entry with no figure draws its caption
 * and its key lines, which is what every entry did before this PR and is still
 * a complete answer for a workflow.
 */
export const FIGURES: Record<string, (props: { width: AboutWidth }) => React.JSX.Element> = {
  availability: AvailabilityFigure,
  "buy-tag": BuyTagFigure,
  statuses: StatusFigure,
  "fit-score": FitFigure,
  "decklist-marks": MarksFigure,
};
