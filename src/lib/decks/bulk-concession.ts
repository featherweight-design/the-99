import { MIX_TYPE_NOUN, topOffCopy } from "../copy/top-off";
import type { FillShortfall } from "./fill";
import { TYPE_ORDER } from "../profile/fit";
import type { CompositionTargets } from "../profile/types";

/**
 * What a bulk fill gives up, as one line.
 *
 * The bulk pair's whole design is that BOTH concessions are legible before either press, so
 * each control carries one of these beside it. The left-hand control fills from the
 * collection and concedes shape; the right-hand one fills from everything and concedes money,
 * which is `topOffCopy.bulk.buy` and not this function.
 *
 * TYPE AXES ONLY, and deliberately. `planFill` reports role shortfalls in the same list, and
 * a note carrying both would be two sentences of concession beside a button — Design's R1
 * ruled that a blended figure is wrong and that a role line, if it is drawn at all, is a
 * SECOND line. Until that is answered the note reports what `fitSkeleton` calls the ten type
 * axes, which is what `recommendations` has meant on every surface that has used the word.
 *
 * The three LAND axes never appear here, because `planFill` excludes them from its type
 * shortfalls: `basic` and `nonbasic` are within `land` in `fit.ts`, so printing `land` beside
 * either would double-count in front of the player. This function does not re-impose that —
 * it would be a second copy of a rule, and the two would drift.
 */
export function bulkConcession(args: {
  shortfalls: readonly FillShortfall[];
  /**
   * Whether there was anything to measure against. False covers both `basis === "none"` and
   * a commander with no composition at all: in either case an empty shortfall list means
   * "nothing was compared", not "nothing is missing", and `matches every recommendation`
   * would be the strongest possible claim made from no data.
   */
  measured: boolean;
  /** b3. The two pools produced the same rows, so the buy control is absent and the survivor
   *  says why. Appended to whichever gap string applies rather than replacing it. */
  nothingToBuy?: boolean;
}): string {
  const gap = gapLine(args.shortfalls, args.measured);
  return args.nothingToBuy ? topOffCopy.bulk.andNothingToBuy(gap) : gap;
}

function gapLine(shortfalls: readonly FillShortfall[], measured: boolean): string {
  if (!measured) return topOffCopy.bulk.gapUnmeasured;

  // WORST FIRST, because the worst gap is what decides whether the concession is acceptable —
  // and it is the only one that survives into `gapMany`. Ties break on the reporting order so
  // two axes short by the same amount always print in the same sequence; without it the line
  // could change between two reads of an unchanged deck.
  const types = shortfalls
    .filter((s): s is Extract<FillShortfall, { kind: "type" }> => s.kind === "type")
    .slice()
    .sort((a, b) => b.short - a.short || TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));

  // Nil is STATED, never omitted. A blank beside one control and a figure beside the other
  // reads as a missing figure, and the nil is the answer the player came for.
  if (types.length === 0) return topOffCopy.bulk.gapNone;
  if (types.length === 1) {
    return topOffCopy.bulk.gapOne(String(types[0].short), noun(types[0].type, types[0].short));
  }
  if (types.length === 2) {
    return topOffCopy.bulk.gapTwo(
      String(types[0].short), noun(types[0].type, types[0].short),
      String(types[1].short), noun(types[1].type, types[1].short),
    );
  }
  // Three or more collapse. A line naming five types is a table with no headings.
  return topOffCopy.bulk.gapMany(
    String(types.length),
    String(types[0].short),
    noun(types[0].type, types[0].short),
  );
}

function noun(type: keyof CompositionTargets, n: number): string {
  const pair = MIX_TYPE_NOUN[type];
  // A type with no noun is unreachable — `MIX_TYPE_NOUN` carries all ten of
  // `CompositionTargets`' keys and the type system says so — but the key is printed rather
  // than a blank if that ever stops being true, because a sentence reading
  // `2 short of recommendations` has lost the word that made it mean anything.
  if (!pair) return type;
  return n === 1 ? pair[0] : pair[1];
}
