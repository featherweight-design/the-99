import { planeCopy } from "../copy/commanders-plane";
import type { ExcludedMatch } from "../discovery/excluded-match";
import { FLOOR_PCT } from "../discovery/floor";

const copy = planeCopy.excluded;

/**
 * One report for a search whose matches are not all on screen (§2b, §2c).
 *
 * ONE control is named. A row can be excluded by three at once, and naming all
 * three turns a one-tap fix into a diagnosis, so the outermost wins: built, then
 * the player's own hide, then the pips or the mode, then the sort's floor. A hide
 * sits above the pips because it removed the row on the server, before any pip
 * was asked: clearing them would not bring it back. The unmeasurable are the floor
 * tier's other population, which does not reorder the tiers.
 *
 * `heading` is present only when no row survived — that state replaces the list
 * and needs a title; the aside sits above a live list and is one sentence.
 */
export type ExcludedReport = {
  cause: "built" | "hidden" | "colors" | "join" | "floor" | "unmeasured";
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
  /** The commander page the `hidden` cause's CTA opens. Null for every other cause, and for a hidden
      match no list holds a slug for: the surface then draws no CTA rather than a link that 404s. */
  slug: string | null;
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
  /** Whether any match survived. Decides which of the two shapes this is. */
  listHasRows: boolean;
}): ExcludedReport | null {
  const { server, colour, colors, listHasRows } = input;
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

  const built = server.filter((m) => m.cause === "built");
  if (built.length > 0) {
    return {
      cause: "built",
      name: held || built.length > 1 ? null : built[0].name,
      heading: heading(built[0].name),
      body: held
        ? heldBody(built.length, copy.control.scope, copy.heldScope)
        : built.length === 1
          ? copy.scopeAlso(built[0].name)
          : more(built.length, copy.control.scope),
      cta: copy.scopeCta,
      aside,
      slug: null,
    };
  }

  const hidden = server.filter((m) => m.cause === "hidden");
  if (hidden.length > 0) {
    const first = hidden[0];
    // When every match is hidden, the held state can say "you hid them" outright. With another cause
    // also holding a match back, it counts the hidden ones the way the other tiers count theirs.
    const allHidden = hidden.length === total;
    return {
      cause: "hidden",
      name: held || hidden.length > 1 ? null : first.name,
      heading: held
        ? total === 1
          ? copy.heldHiddenHeading(first.name)
          : allHidden
            ? copy.heldHiddenHeadingMany(total)
            : planeCopy.search.heldHeadingMany(total)
        : null,
      body: held
        ? total === 1
          ? copy.heldHidden
          : allHidden
            ? copy.heldHiddenMany
            : copy.heldHiddenSome(hidden.length)
        : hidden.length === 1
          ? copy.hiddenAlso(first.name)
          : copy.hiddenMore(hidden.length),
      // One page per report: with several hidden, the first by name, and the CTA names it, since
      // "its page" would not say whose.
      cta: hidden.length === 1 ? copy.hiddenCta : copy.hiddenCtaNamed(first.name),
      aside,
      slug: first.slug ?? null,
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
      slug: null,
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
      slug: null,
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
    slug: null,
  };
}
