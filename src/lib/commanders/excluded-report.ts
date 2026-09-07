import { planeCopy } from "../copy/commanders-plane";
import type { ExcludedMatch } from "../discovery/excluded-match";
import { FLOOR_PCT } from "../discovery/floor";

const copy = planeCopy.excluded;

/**
 * One report for a search whose matches are not all on screen (§2b, §2c).
 *
 * ONE control is named. A row can be excluded by three at once, and naming all
 * three turns a one-tap fix into a diagnosis, so the outermost wins: scope, then
 * the pips or the mode, then the sort's floor. The pool is the floor's sub-case
 * and the unmeasurable are the floor tier's other population; neither reorders
 * the tiers.
 *
 * `heading` is present only when no row survived — that state replaces the list
 * and needs a title; the aside sits above a live list and is one sentence.
 */
export type ExcludedReport = {
  cause: "scope" | "colors" | "join" | "floor" | "pool" | "unmeasured";
  heading: string | null;
  /** The commander the sentence names, so the surface can mark it inside the
      finished sentence. Null when the report counts matches instead of naming
      one, and when the heading has already said the name. */
  name: string | null;
  body: string;
  cta: string;
  /** `1 match, 0 shown`, printed beside the CTA when the list is empty so the
      offer is not a guess. Null above a live list, where the rows are the count. */
  aside: string | null;
};

/** A match the CLIENT removed: it is in the payload, so the colour answer needs
    no round trip. `joinOnly` is what picks the mode over the pips — the row
    would have survived under `Contains`, so the mode is the cause. */
export type ColourExcludedMatch = {
  name: string;
  colorIdentity: string[];
  joinOnly: boolean;
};

export function resolveExcludedReport(input: {
  server: ExcludedMatch[];
  colour: ColourExcludedMatch[];
  colors: string[];
  /** `freePoolSize` — the pool sentence's denominator. */
  freeCards: number;
  /** Whether any match survived. Decides which of the two shapes this is. */
  listHasRows: boolean;
}): ExcludedReport | null {
  const { server, colour, colors, freeCards, listHasRows } = input;
  const total = server.length + colour.length;
  if (total === 0) return null;

  const held = !listHasRows;
  const aside = held ? planeCopy.search.heldAside(total) : null;
  // The plural form counts rather than names, so a stack of matches sharing one
  // cause is still one sentence. It has no `held` variant: with no rows on
  // screen the heading names a commander, so the group is reported singly.
  const more = (count: number, control: string) =>
    planeCopy.search.asideMore(count, control);

  // With nothing on screen the singular pair names a commander and then says "It". That is a
  // claim about one row of several, and the tier's diagnosis (an identity, a percentage) is
  // read off the first match, so it is not merely imprecise but wrong for the rest. Above one
  // match the state counts and names the control instead.
  const heading = (name: string) =>
    held
      ? total > 1
        ? planeCopy.search.heldHeadingMany(total)
        : planeCopy.search.heldHeading(name)
      : null;
  const heldBody = (rows: number, control: string, one: string) =>
    total > 1 ? planeCopy.search.heldMany(rows, control) : one;

  const scope = server.filter((m) => m.cause === "scope");
  if (scope.length > 0) {
    return {
      cause: "scope",
      name: held || scope.length > 1 ? null : scope[0].name,
      heading: heading(scope[0].name),
      body: held
        ? heldBody(scope.length, copy.control.scope, copy.heldScope)
        : scope.length === 1
          ? copy.scopeAlso(scope[0].name)
          : more(scope.length, copy.control.scope),
      cta: copy.scopeCta,
      aside,
    };
  }

  const join = colour.filter((m) => m.joinOnly);
  const pips = colour.filter((m) => !m.joinOnly);
  // Within the tier the mode is named only when the mode is the cause. A row the
  // pips would have excluded anyway is a pip exclusion, and `Switch to Contains`
  // would not bring it back.
  const tier2 = pips.length > 0 ? { rows: pips, mode: false } : join.length > 0 ? { rows: join, mode: true } : null;
  if (tier2) {
    const first = tier2.rows[0];
    const single = tier2.mode
      ? copy.joinAlso(first.name, colors, first.colorIdentity)
      : copy.colorsAlso(first.name, colors, first.colorIdentity);
    return {
      cause: tier2.mode ? "join" : "colors",
      name: held || tier2.rows.length > 1 ? null : first.name,
      heading: heading(first.name),
      body: held
        ? heldBody(
            tier2.rows.length,
            tier2.mode ? copy.control.join(colors) : copy.control.colors(colors),
            tier2.mode
              ? copy.heldJoin(colors, first.colorIdentity)
              : copy.heldColors(colors, first.colorIdentity),
          )
        : tier2.rows.length === 1
          ? single
          : more(
              tier2.rows.length,
              tier2.mode ? copy.control.join(colors) : copy.control.colors(colors),
            ),
      cta: tier2.mode ? copy.joinCta : copy.colorsCta,
      aside,
    };
  }

  // Tier 3, in the order the sentences discriminate: the pool before the floor,
  // because a row that would clear against the collection has a correction the
  // floor sentence cannot offer.
  const pool = server.filter((m) => m.cause === "pool");
  if (pool.length > 0) {
    return {
      cause: "pool",
      name: held || pool.length > 1 ? null : pool[0].name,
      heading: heading(pool[0].name),
      body: held
        ? heldBody(pool.length, copy.control.pool, copy.heldPool(freeCards))
        : pool.length === 1
          ? copy.poolAlso(pool[0].name, freeCards)
          : more(pool.length, copy.control.pool),
      cta: copy.poolCta,
      aside,
    };
  }

  const floor = server.filter((m) => m.cause === "floor");
  if (floor.length > 0) {
    const pct = floor[0].pct as number;
    return {
      cause: "floor",
      name: held || floor.length > 1 ? null : floor[0].name,
      heading: heading(floor[0].name),
      body: held
        ? heldBody(floor.length, copy.control.floor(FLOOR_PCT), copy.heldFloor(pct, FLOOR_PCT))
        : floor.length === 1
          ? copy.floorAlso(floor[0].name, pct, FLOOR_PCT)
          : more(floor.length, copy.control.floor(FLOOR_PCT)),
      cta: copy.floorCta,
      aside,
    };
  }

  const unmeasured = server.filter((m) => m.cause === "unmeasured");
  if (unmeasured.length === 0) return null;
  return {
    cause: "unmeasured",
    name: held || unmeasured.length > 1 ? null : unmeasured[0].name,
    heading: heading(unmeasured[0].name),
    body: held
      ? heldBody(unmeasured.length, copy.control.unmeasured, copy.heldUnmeasured)
      : unmeasured.length === 1
        ? copy.unmeasuredAlso(unmeasured[0].name)
        : more(unmeasured.length, copy.control.unmeasured),
    // The same correction the floor offers: `fit` is the sort that measures
    // nothing, so it is where an unmeasurable commander appears.
    cta: copy.floorCta,
    aside,
  };
}
