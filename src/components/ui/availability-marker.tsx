// Availability marker (#43) — a diamond, a count, and a word.
// §Marker (design handoff README, decisions 1 and 2).
//
// Two densities: "row" for decklist rows and search rows, "chip" for the
// 8.5px caption chip on a Consider tile's art scrim.
//
// The free state renders null. That is the feature, not an optimisation:
// a player whose collection covers their decks sees nothing new anywhere.
//
// Every colour, size and spacing below is taken from
// docs/superpowers/design-tables/card-availability.md §2 and §3, which is the
// authority where the execution plan's draft disagreed with it.

import Link from "next/link";
import { twMerge } from "tailwind-merge";

import { CARD_TILE_SLOT_BOX, slotOutline } from "./card-tile-caption";
import { availabilityCopy } from "../../lib/copy/availability";
import {
  availabilityState,
  hardDecks,
  type AvailabilityState,
  type AvailabilitySummary,
  type HardDeck,
} from "../../lib/decks/availability";

export type MarkerOpts = {
  /** This deck's own claim — a decklist row, or the commander — was excluded
   *  from the figures. Addendum 2 §6. */
  selfExcluded?: boolean;
  /** `/collection` — count-only, no deck name ever. Addendum 2 §3. */
  nameless?: boolean;
  /** A bare `short` at one copy, rather than `short 1`. Only on the deck's own pages (Hugh,
   *  2026-09-28): `/decks/[id]` and everything it mounts (rows, tiles, suggestions, sheets),
   *  `/changes` and `/import`, and the card modal opened from them (`deckPage`). The default is the
   *  count, so a surface added later draws it without asking. */
  bareOne?: boolean;
};

/** Prose for the accessible name, or null when the card is free. */
export function markerAria(a: AvailabilitySummary, opts?: MarkerOpts): string | null {
  const c = availabilityCopy.marker;
  const hard = hardDecks(a);

  // Addendum 2 Accessibility: "Count-only in the label too — collection never
  // speaks the deck name." Both count-only forms used to be sliced out of the
  // name-bearing strings, which left the copy file authoritative for the words
  // but not for that phrasing: an edit to a full string silently reshaped the
  // sliced one. R5 §8 ratified the pair as part of the state, so they are
  // dedicated keys now.
  switch (availabilityState(a, { selfExcluded: opts?.selfExcluded })) {
    case "free":
      return null;
    case "soft":
      return c.softAria(a.soft);
    case "hard":
      // No names is a real shape, not an impossible one: a degraded read can
      // return counts without them. Counting to zero out loud ("on 0 of your
      // committed decks") is worse than the base form the copy file ships for
      // exactly this case.
      if (opts?.nameless || hard.length === 0) return c.hardAriaCountOnly;
      return hard.length === 1
        ? c.hardAria(hard[0].name)
        : c.hardMultiAria(hard.length);
    case "over":
      // Self-excluded and exactly one other claimant: name it, don't count it.
      if (!opts?.nameless && opts?.selfExcluded && hard.length === 1) {
        return c.overAlsoInAria(hard[0].name);
      }
      // Two ways to lose the count, and the same answer to both — which is why
      // this guard is shaped exactly like the hard branch's. `nameless` is
      // /collection's contract and every chip's, where the label draws a bare
      // `short N`; announcing "3 of your committed decks" there reads out a
      // number the surface deliberately does not draw. And with no names at all
      // (a degraded read) the shortfall is still true where the count is not,
      // since `overAria(n, 0)` would say "0 of your committed decks include this
      // card". Both drop to the count-free shortfall the label already shows.
      if (opts?.nameless || hard.length === 0) {
        return c.overAriaCountOnly(-a.free);
      }
      return c.overAria(-a.free, hard.length);
  }
}

/**
 * The label splits into a fixed prefix and an optional deck name, because the
 * name is the only part allowed to truncate (decision B, 2026-08-27). A single
 * string with one `truncate` clips `none free — in Kyk…` down to `none free — i…` at
 * narrow widths, eating the clause that carries the meaning.
 *
 * The prefix is derived by slicing the name off the copy function's own output
 * rather than re-typing it here, so the copy file stays the single source of
 * the wording. Every name-bearing form in the copy file ends with the name,
 * which is what makes the slice exact.
 */
function label(
  state: AvailabilityState,
  a: AvailabilitySummary,
  opts: MarkerOpts,
): { prefix: string; deck?: HardDeck } | null {
  const c = availabilityCopy.marker;
  const hard = hardDecks(a);
  const withName = (full: string, deck: HardDeck) => ({
    prefix: full.slice(0, full.length - deck.name.length),
    deck,
  });

  switch (state) {
    case "free":
      return null;
    case "soft":
      return { prefix: c.soft(a.soft) };
    case "hard":
      // Addendum 2 §3: collection never renders hardIn or hardMulti. A hard
      // state with no names lands here too — `none free — across 0 decks` is the
      // alternative, and `marker.hard` is the base form the copy file ships.
      if (opts.nameless || hard.length === 0) return { prefix: c.hard };
      return hard.length === 1
        ? withName(c.hardIn(hard[0].name), hard[0])
        : { prefix: c.hardMulti(hard.length) };
    case "over":
      // Collection is count-only here too — the canvas draws a bare `short 1`.
      if (opts.nameless) return { prefix: c.over(-a.free, opts.bareOne) };
      // Self-excluded: hardDecks already omits the current deck, so a lone
      // remaining entry is the OTHER claimant. "also in 2 decks" would count
      // the deck the player is standing in.
      if (opts.selfExcluded && hard.length === 1) {
        return withName(c.overAlsoIn(-a.free, hard[0].name, opts.bareOne), hard[0]);
      }
      // One deck CAN be the whole demand — "any number" cards (Relentless
      // Rats, Nazgûl) let a single list claim nine copies of something you own
      // four of. `overWithDemand` ships a singular branch for precisely that,
      // so the threshold is one deck, not two; below it there is no name and
      // nothing to count, and the bare `short N` is all that is true.
      return hard.length >= 1
        ? { prefix: c.overWithDemand(-a.free, hard.length, opts.bareOne) }
        : { prefix: c.over(-a.free, opts.bareOne) };
  }
}

// Rotated 6px squares rather than an SVG or an icon dependency: the shape is a
// square on its corner, and the app already draws its ownership dot with a
// bare styled span. Hollow reads as "someone wants it", solid as "it is gone",
// doubled as "two lists want the one you have".
//
// No transition and no animation anywhere in this file: zero net motion is a
// locked constraint (row 3.7).
const DIAMOND = "block w-[6px] h-[6px] rotate-45";

/**
 * The 3-up collection tile's glyph-only chip (collection surfaces, Call 3): the glyph's own
 * BOUNDING box, 16px — the figure the handoff states and the size `CardFactMark`'s 16x16
 * glyphs draw at, rather than the 6px diamond this file's row and captioned chips use
 * alongside a word.
 *
 * The box is the ROTATED diamond's bounding size, not the diamond's own CSS side: a 45°
 * rotation grows a square's bounding box by `√2`, so a diamond with a 16px side bounds to
 * ~22.6px — taller than the caption's fixed-height meta line (`CardTileCaption`'s
 * `META_LINE`, 17/18px) and taller than every other occupant of that line, which are flat
 * 16x16 glyphs with no rotation to grow past their own box. The diamond's CSS side is
 * therefore `AVAILABILITY_CHIP_GLYPH_PX / √2`, so ITS bounding box — what the caption's row
 * actually has to hold — is 16.
 */
export const AVAILABILITY_CHIP_GLYPH_PX = 16;
const BIG_DIAMOND_SIDE_PX = AVAILABILITY_CHIP_GLYPH_PX / Math.SQRT2;
/**
 * Rotating a square about its own centre grows its PAINTED footprint past its CSS box by
 * `(rotated − css) / 2` on every side — the gap `left-0`/`top-0` positioning (the small,
 * unrotated glyph's own convention) ignores. Each big diamond's CSS box is inset by this
 * amount so its rotated paint, not its box, lands flush with the wrapper's edges.
 */
const BIG_DIAMOND_INSET_PX = (AVAILABILITY_CHIP_GLYPH_PX - BIG_DIAMOND_SIDE_PX) / 2;
/**
 * The over glyph's own box width at that size: the handoff's second figure, not derived from
 * the 5px offset the row/chip's 6px diamonds use — at this size that ratio would print a wider
 * box than stated. The second diamond's position is solved FROM this figure instead, by its
 * PAINTED right edge rather than its CSS left.
 */
export const AVAILABILITY_CHIP_GLYPH_OVER_PX = 21;

/**
 * The over-committed glyph is two diamonds overlapping by 1px, with the front
 * one carrying a left border in **the colour of whatever sits behind the
 * marker** — that border is the seam, and it only reads as a seam while it
 * matches the background. Six different backgrounds host this marker, so the
 * colour is a prop rather than a constant (design table line 124).
 */
function OverGlyph({ seam, big }: { seam: string; big?: boolean }) {
  const side = big ? BIG_DIAMOND_SIDE_PX : 6;
  const width = big ? AVAILABILITY_CHIP_GLYPH_OVER_PX : 11;
  const height = big ? AVAILABILITY_CHIP_GLYPH_PX : 6;
  // Positioned by PAINTED edge, not CSS left. Rotation about centre moves a box's visual edge
  // OUTWARD of its CSS edge by `inset`, so a CSS box sits `inset` INSIDE the paint it targets:
  // `css = paint + inset`. The paint target itself is sized by the ROTATED diamond
  // (`AVAILABILITY_CHIP_GLYPH_PX`, 16), never the CSS side (`side`, ~11.3) — the first
  // diamond's paint starts flush with the wrapper's left (paint-left 0), the second's paint
  // ends flush with the wrapper's right (paint-left `width − AVAILABILITY_CHIP_GLYPH_PX`).
  const leftFirst = big ? BIG_DIAMOND_INSET_PX : 0;
  const leftSecond = big
    ? width - AVAILABILITY_CHIP_GLYPH_PX + BIG_DIAMOND_INSET_PX
    : 5;
  const top = big ? BIG_DIAMOND_INSET_PX : 0;
  return (
    <span aria-hidden="true" className="relative block flex-none" style={{ width, height }}>
      <span
        className={twMerge(DIAMOND, "absolute bg-[color:var(--danger)]")}
        style={{ left: leftFirst, top, ...(big ? { width: side, height: side } : {}) }}
      />
      <span
        className={twMerge(DIAMOND, "absolute bg-[color:var(--danger)]")}
        style={{
          borderLeft: `1px solid ${seam}`,
          left: leftSecond,
          top,
          ...(big ? { width: side, height: side } : {}),
        }}
      />
    </span>
  );
}

/**
 * Exported for the deck-detail commitments roll-up, which draws the same two
 * glyphs at deck scale. It is the marker's own hollow → solid → doubled ladder
 * read vertically, so a second hand-rolled pair of diamonds there would be the
 * same shape maintained twice.
 *
 * `free` is excluded rather than handled: the free state is the ABSENCE of a
 * glyph, and a component that returns null for one of its inputs invites a
 * caller to reserve space for something that never draws. The marker makes the
 * same call at its own boundary, bailing before it reaches here.
 */
export function AvailabilityGlyph({
  state,
  seam,
  big,
}: {
  state: Exclude<AvailabilityState, "free">;
  seam: string;
  /** `AVAILABILITY_CHIP_GLYPH_PX`'s bounding box instead of the row/chip's 6px. See `OverGlyph`. */
  big?: boolean;
}) {
  if (state === "over") return <OverGlyph seam={seam} big={big} />;
  return (
    <span
      aria-hidden="true"
      className={twMerge(
        DIAMOND,
        "flex-none",
        state === "soft"
          ? "bg-transparent [border:1.5px_solid_var(--avail-soft)]"
          : "bg-[color:var(--avail-hard)]",
      )}
      style={big ? { width: BIG_DIAMOND_SIDE_PX, height: BIG_DIAMOND_SIDE_PX } : undefined}
    />
  );
}

// Row 3.4 gives the row density the same lifted foregrounds as the chip: the
// hard label is --avail-hard-fg on both, and the soft label is --fg-body, a
// step brighter than the --fg-muted its own glyph outline uses.
const LABEL_COLOUR: Record<Exclude<AvailabilityState, "free">, string> = {
  soft: "text-[color:var(--fg-body)]",
  hard: "text-[color:var(--avail-hard-fg)]",
  over: "text-[color:var(--avail-over-fg)]",
};

// Rows 2.1 and 2.5–2.7. Both halves move with the state: a soft chip is the
// quietest scrim behind the dimmest border, an over chip the densest behind
// the loudest.
//
// The scrim was a near-black literal a shade below the canvas. It is the canvas
// itself now, at the same three opacities, so a theme change carries the chip
// with it instead of leaving one fixed dark rectangle on every card.
const CHIP_SKIN: Record<Exclude<AvailabilityState, "free">, string> = {
  soft: "bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] border-[color:var(--border-dashed)]",
  hard: "bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] border-[color:var(--accent)]",
  over: "bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] border-[color:var(--danger)]",
};

// The chip paints its own scrim, so the thing behind its glyph is that scrim
// and never anything else. Callers do not get to name it.
const CHIP_SCRIM = "var(--bg)";

/**
 * The chip's edge alone, for the caption box (`plate={false}`), where the scrim
 * it used to pair with is gone. Same three inks as `CHIP_SKIN`, drawn as an
 * outline rather than a border — see `CARD_TILE_SLOT_BOX` for why that is
 * load-bearing rather than a preference.
 */
const CHIP_EDGE: Record<Exclude<AvailabilityState, "free">, string> = {
  soft: "var(--border-dashed)",
  hard: "var(--accent)",
  over: "var(--danger)",
};

/**
 * What sits behind the over glyph's doubled diamonds once the chip has no scrim
 * of its own: the caption's plate. Getting this wrong draws the seam between the
 * two diamonds in the canvas colour over a surface-coloured caption, which reads
 * as a hairline crack rather than as the join it is.
 */
const CAPTION_SCRIM = "var(--surface)";

export function AvailabilityMarker({
  availability,
  density = "row",
  plate = true,
  seam = "var(--bg)",
  spoken = false,
  linkDeck = false,
  className,
  glyphOnly = false,
  ...opts
}: {
  availability: AvailabilitySummary;
  density?: "row" | "chip";
  /**
   * Chip density only. `false` drops the scrim AND the absolute positioning,
   * leaving the glyph, the edge and the label in the shared caption box.
   *
   * A prop rather than a third density, deliberately: the caption's box is the
   * chip's own ladder with its scrim removed, and a second density would be a
   * second spec for one box. It is also the containment boundary — `chip` is
   * shared with `suggestion-tile.tsx`, which this design never drew, so the
   * caption's geometry must not be pushed into `CHIP_SKIN`.
   */
  plate?: boolean;
  /**
   * The colour sitting directly behind the marker, used for the over state's
   * seam only. Row density hosts this marker over six different backgrounds,
   * so there is no correct constant; the default is the base canvas.
   */
  seam?: string;
  /**
   * Speak §17's prose here rather than letting the drawn label be read
   * literally, for surfaces with no row-level `aria-label` to hoist
   * `markerAria` into: the decklist row and the Consider tile. The two
   * comboboxes leave it off — their `role="option"` carries a label that
   * already replaces everything beneath it, and a second copy would be read
   * twice.
   *
   * Swapping the word for the sentence rather than hanging an `aria-label` on
   * the span is the same move `BuyTag` makes, for the reason recorded there: a
   * label on a generic role is discarded outright.
   */
  spoken?: boolean;
  /**
   * Draw the deck name as a link to that deck. Card detail only — it is the one
   * surface with room for the clause, a real hover surface, and no enclosing
   * control for a link to nest inside. Rows and tiles are inside a `role="button"`
   * or an option row, where a nested link is invalid.
   *
   * Never combine with `spoken`: the prose would name the deck a second time,
   * and the name half is aria-hidden under `spoken`, which cannot be applied to
   * something focusable. The guard below is a throw rather than a silent
   * precedence rule, because quietly dropping one prop hides the mistake at the
   * one moment someone could still fix it.
   */
  linkDeck?: boolean;
  className?: string;
  /**
   * Chip density, `plate={false}` only: the word is dropped and the glyph grows to
   * `AVAILABILITY_CHIP_GLYPH_PX` (collection surfaces, Call 3 — the 3-up tile has no room for
   * "1 in a draft"). `spoken`'s sr-only sentence still renders, so the word survives for
   * assistive tech; it is the key, not this component, that prints it for sighted readers.
   */
  glyphOnly?: boolean;
} & MarkerOpts) {
  // Dev only: production strips it, so a late regression degrades to the
  // duplicated announcement rather than a blank screen for the player.
  if (process.env.NODE_ENV !== "production" && spoken && linkDeck) {
    throw new Error(
      "AvailabilityMarker: `spoken` and `linkDeck` are mutually exclusive. " +
        "`spoken` aria-hides the deck name, which is invalid on a focusable link, " +
        "and its prose already names the deck.",
    );
  }
  const state = availabilityState(availability, {
    selfExcluded: opts.selfExcluded,
  });
  if (state === "free") return null;

  // A 63×88 tile chip has no room for a proper noun, and every chip the
  // canvases draw is count-only. Density decides it rather than the caller, so
  // that no second tile surface can ship having forgotten the flag.
  const chip = density === "chip";
  const effective = { ...opts, nameless: opts.nameless || chip };
  const text = label(state, availability, effective)!;
  const colour = LABEL_COLOUR[state];
  // Built from the same effective opts as the label, so the sentence never
  // names a deck the drawn form withheld — a nameless chip stays count-only in
  // both halves (Addendum 2 §3).
  // `glyphOnly` always speaks, whether or not the caller also passed `spoken`: with no visible
  // word left to aria-hide, a glyph-only chip given neither prop would announce nothing at all.
  const prose = spoken || glyphOnly ? markerAria(availability, effective) : null;

  return (
    <span
      className={twMerge(
        "inline-flex items-center min-w-0",
        chip && plate
          ? // Top-left: top-right is the shipped accent quantity badge on both
            // tile surfaces (A2RM:51–60).
            `absolute left-[6px] top-[6px] gap-[4px] rounded-[4px] border px-[5px] py-[2px] ${CHIP_SKIN[state]}`
          : chip && glyphOnly
            ? // The glyph alone, in the same outlined box: an EXPLICIT, non-shrinking box
              // rather than one that auto-sizes to the glyph's unrotated CSS box — the glyph
              // paints past that box (rotation grows its visual footprint), so a shrink-to-fit
              // root draws the outline through the glyph instead of around it.
              "flex-none justify-center rounded-[4px]"
            : chip
              ? // In the caption, on a plate of its own: the shared box, in this
                // state's ink.
                CARD_TILE_SLOT_BOX
              : // Row density sets no font size and no family — it rides the
                // shipped meta line and must not change its height (row 3.1).
                "gap-[6px]",
        className,
      )}
      style={
        chip && glyphOnly
          ? {
              ...slotOutline(CHIP_EDGE[state]),
              width: state === "over" ? AVAILABILITY_CHIP_GLYPH_OVER_PX : AVAILABILITY_CHIP_GLYPH_PX,
              height: AVAILABILITY_CHIP_GLYPH_PX,
            }
          : chip && !plate
            ? slotOutline(CHIP_EDGE[state])
            : undefined
      }
    >
      <AvailabilityGlyph
        state={state}
        seam={chip ? (plate ? CHIP_SCRIM : CAPTION_SCRIM) : seam}
        big={glyphOnly}
      />
      {/*
        The prefix never truncates; the deck name is the flexible half. This is
        the same split Addendum 2 §1 specifies for the collection name cell —
        "the chip is flex: none; the name is the flexible half" — applied to the
        marker's own two parts.

        No `title` on the name, per design table row 3.6: the marker has no
        hover, no focus ring and is never a tap target. A clipped
        `Kykar Spellsl…` stays clipped for the eye, which is the drawn
        behaviour — the full name is not lost, because `markerAria` carries it
        into the row's accessible name.

        The floor is what keeps "truncates" from meaning "vanishes". At `min-w-0`
        a narrow host shrinks this half to zero and the prefix is left pointing
        at nothing: `◆◆ short 1 — also in`, a preposition with no object and not
        even an ellipsis to admit it. Six characters is the smallest width that
        still reads as an abbreviated name.
      */}
      {/*
        `whitespace-pre`, not `whitespace-nowrap`: a flex item trims its own
        trailing whitespace, and the negative margin below then closes the gap
        that was standing in for it — so `none free — in ` and `Atraxa` render as
        `none free — inAtraxa`. jsdom cannot see this; only the browser can.
      */}
      {!glyphOnly && (
        <span
          aria-hidden={spoken || undefined}
          className={twMerge(
            "flex-none whitespace-pre",
            colour,
            // The caption box already sets the family, the size and the weight
            // for every occupant, so the label only adds the tracking there.
            chip && (plate ? "font-mono text-[8.5px] font-semibold tracking-[0.02em]" : "tracking-[0.02em]"),
          )}
        >
          {text.prefix}
        </span>
      )}
      {!glyphOnly && text.deck &&
        // -ml cancels the container's gap between the two halves of what is one
        // sentence: the gap separates the glyph from the text, not `none free — in`
        // from `Atraxa`.
        (linkDeck ? (
          // The accessible name says which deck it opens, because the visible
          // text is a bare proper noun that truncates, and "Atraxa…" out of
          // context does not say it is a link to a deck.
          <Link
            href={`/decks/${text.deck.id}`}
            aria-label={availabilityCopy.collection.detailDeckLinkAria(text.deck.name)}
            className={twMerge(
              "truncate min-w-[6ch] -ml-[6px] underline underline-offset-2",
              "decoration-[color:var(--border-strong)] hover:decoration-current",
              colour,
            )}
            data-deck-name=""
          >
            {text.deck.name}
          </Link>
        ) : (
          <span
            aria-hidden={spoken || undefined}
            className={twMerge("truncate min-w-[6ch] -ml-[6px]", colour)}
            data-deck-name=""
          >
            {text.deck.name}
          </span>
        ))}
      {prose && <span className="sr-only">{prose}</span>}
    </span>
  );
}
