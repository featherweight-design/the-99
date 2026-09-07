import type { JSX } from "react";
import { twMerge } from "tailwind-merge";

// Ownership dot — solid green when the card is in the collection, solid
// `--avail-hard-fg` when it is owned but already committed to a deck, dashed
// hollow when it is not owned at all. Shared by the decklist row, the
// suggestion card, the export dialog's shopping list and the commander panels.
//
// Dashed is this app's vocabulary for absence, and hollow stays reserved for
// it: the commander panels drew unowned as a solid hollow ring, which reads as
// a state of something present. Committed moves hue only, so the third state
// costs no width.
//
// Color and shape only. Sizing stays with the caller: the design tables put
// the dot at 7px responsive in the decklist row, a flat 8px on the suggestion
// card and a flat 7px in the export dialog, so a fixed size here would be
// overridden at every call site. `size` is there for callers that compute it.
const BASE = "flex-none rounded-full";
const OWNED =
  "bg-[color:var(--success)] [border:1px_solid_var(--success)]";
const COMMITTED =
  "bg-[color:var(--avail-hard-fg)] [border:1px_solid_var(--avail-hard-fg)]";
const UNOWNED = "bg-transparent [border:1px_dashed_var(--fg-locked)]";

type OwnershipDotProps = {
  owned: boolean;
  /**
   * Owned, but already spoken for by a finished deck. Only read when `owned`
   * is true, so a caller without the aggregate keeps passing `owned` alone and
   * gets the two states it has always had.
   */
  committed?: boolean;
  /** Pixel size, for callers that compute it rather than writing a class. */
  size?: number;
  className?: string;
  /**
   * Announce ownership to assistive tech. Omit where adjacent text already
   * conveys it — the dot is then marked decorative.
   */
  label?: string;
};

export function OwnershipDot({
  owned,
  committed,
  size,
  className,
  label,
}: OwnershipDotProps) {
  const skin = !owned ? UNOWNED : committed ? COMMITTED : OWNED;
  return (
    <span
      className={twMerge(BASE, skin, className)}
      {...(size === undefined ? {} : { style: { width: size, height: size } })}
      {...(label ? { "aria-label": label } : { "aria-hidden": true })}
    />
  );
}

/**
 * The commander panels' three-way reading of the same dot.
 *
 * Distinct from `lib/decks/availability`, whose `AvailabilityState` is a deck's
 * four-way headroom and shares the member name `free` with this one: hence the
 * `Dot` in these names, so a wrong auto-import cannot typecheck.
 */
export type AvailabilityDotState = "free" | "committed" | "unowned";

export function availabilityDotState(card: {
  owned?: boolean;
  committedTo: string | null;
}): AvailabilityDotState {
  if (card.owned === false) return "unowned";
  return card.committedTo === null ? "free" : "committed";
}

export function AvailabilityDot({
  state,
  size,
}: {
  state: AvailabilityDotState;
  size: number;
}): JSX.Element {
  return (
    <OwnershipDot
      owned={state !== "unowned"}
      committed={state === "committed"}
      size={size}
      className="block"
    />
  );
}

/**
 * A dot inline in a sentence. Nudged up half a pixel because a 6px circle sits
 * visually low against 10px mono, and given its own margin so the sentence's
 * word spacing does not have to carry it.
 *
 * The legend renders the dot rather than naming its colour: the legends used to
 * call the committed colour "Amber", which is only true of the first theme,
 * because `--avail-hard-fg` is redefined by each of the six.
 */
export function LegendPip({ state }: { state: AvailabilityDotState }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center"
      style={{ marginRight: 5, verticalAlign: "baseline", position: "relative", top: -0.5 }}
    >
      <AvailabilityDot state={state} size={6} />
    </span>
  );
}
