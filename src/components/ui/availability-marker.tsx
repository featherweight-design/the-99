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

import { twMerge } from "tailwind-merge";
import { availabilityCopy } from "../../lib/copy/availability";
import {
  availabilityState,
  type Availability,
  type AvailabilityState,
} from "../../lib/decks/availability";

export type MarkerOpts = {
  /** This deck's own claim — a decklist row, or the commander — was excluded
   *  from the figures. Addendum 2 §6. */
  selfExcluded?: boolean;
  /** `/collection` — count-only, no deck name ever. Addendum 2 §3. */
  nameless?: boolean;
};

/** Prose for the accessible name, or null when the card is free. */
export function markerAria(a: Availability, opts?: MarkerOpts): string | null {
  const c = availabilityCopy.marker;

  // Addendum 2 Accessibility: "Count-only in the label too — collection never
  // speaks the deck name." The copy file has no nameless hard-aria key, so take
  // the clause before the semicolon of the one that exists; `hardAria` is
  // written as "no free copies; this one is on your X list", and the first
  // clause is exactly the phrase the addendum's own rowAria example uses. Slice
  // rather than re-type, so the copy file stays authoritative.
  //
  // The slice is deliberately defensive: a copy edit that drops the semicolon
  // would otherwise leak the "x" placeholder into a screen reader. Falling back
  // to the addendum's own literal keeps collection count-only no matter what
  // the copy file does — and the test pins the failure mode, so a copy edit
  // that silently switches us to the fallback is caught in CI rather than by a
  // player. **Delete this whole helper the moment Design adds a real nameless
  // key — a count-only `hardAria` for /collection**; it exists only because
  // that key is missing.
  const NAMELESS_HARD_FALLBACK = "no free copies";
  // A control character cannot occur in copy, so "the first clause still holds
  // the sentinel" is an exact test for "the name did not land after the
  // semicolon" — covering both a dropped semicolon and a reordered string that
  // puts the name first. Do NOT sentinel with a space or a word: the phrase we
  // are trying to keep contains both.
  const NAME_SENTINEL = "\u0000";
  // `overAria` branches on `deckCount === 1`, so the count sentinel has to be a
  // number that misses that branch and cannot collide with a real `shortBy`.
  const COUNT_SENTINEL = -987654321;
  const namelessHardAria = () => {
    const [first, ...rest] = c.hardAria(NAME_SENTINEL).split(";");
    return rest.length > 0 && !first.includes(NAME_SENTINEL)
      ? first.trim()
      : NAMELESS_HARD_FALLBACK;
  };

  // The same slice trick against `overAria`, which is written as
  // "${deckCount} of your finished lists include this card and you own
  // ${shortBy} too few". Everything after "and" is true without a deck count,
  // and is the only true thing left when no names arrived. **Delete this the
  // moment Design adds a real countless over key — an `overAria` that states
  // the shortfall without a deck count**.
  const countlessOverAria = (shortBy: number) => {
    const [, ...rest] = c.overAria(shortBy, COUNT_SENTINEL).split(" and ");
    const tail = rest.join(" and ");
    return tail && !tail.includes(String(COUNT_SENTINEL))
      ? tail
      : `you own ${shortBy} too few`;
  };

  switch (availabilityState(a, { selfExcluded: opts?.selfExcluded })) {
    case "free":
      return null;
    case "soft":
      return c.softAria(a.soft);
    case "hard":
      // No names is a real shape, not an impossible one: a degraded read can
      // return counts without them. Counting to zero out loud ("on 0 of your
      // finished lists") is worse than the base form the copy file ships for
      // exactly this case.
      if (opts?.nameless || a.hardDeckNames.length === 0) return namelessHardAria();
      return a.hardDeckNames.length === 1
        ? c.hardAria(a.hardDeckNames[0])
        : c.hardMultiAria(a.hardDeckNames.length);
    case "over":
      // Self-excluded and exactly one other claimant: name it, don't count it.
      if (!opts?.nameless && opts?.selfExcluded && a.hardDeckNames.length === 1) {
        return c.overAlsoInAria(a.hardDeckNames[0]);
      }
      // Two ways to lose the count, and the same answer to both — which is why
      // this guard is shaped exactly like the hard branch's. `nameless` is
      // /collection's contract and every chip's, where the label draws a bare
      // `short N`; announcing "3 of your finished lists" there reads out a
      // number the surface deliberately does not draw. And with no names at all
      // (a degraded read) the shortfall is still true where the count is not,
      // since `overAria(n, 0)` would say "0 of your finished lists include this
      // card". Both drop to the count-free shortfall the label already shows.
      if (opts?.nameless || a.hardDeckNames.length === 0) {
        return countlessOverAria(-a.free);
      }
      return c.overAria(-a.free, a.hardDeckNames.length);
  }
}

/**
 * The label splits into a fixed prefix and an optional deck name, because the
 * name is the only part allowed to truncate (decision B, 2026-08-27). A single
 * string with one `truncate` clips `0 free — in Kyk…` down to `0 free — i…` at
 * narrow widths, eating the clause that carries the meaning.
 *
 * The prefix is derived by slicing the name off the copy function's own output
 * rather than re-typing it here, so the copy file stays the single source of
 * the wording. Every name-bearing form in the copy file ends with the name,
 * which is what makes the slice exact.
 */
function label(
  state: AvailabilityState,
  a: Availability,
  opts: MarkerOpts,
): { prefix: string; name?: string } | null {
  const c = availabilityCopy.marker;
  const withName = (full: string, name: string) => ({
    prefix: full.slice(0, full.length - name.length),
    name,
  });

  switch (state) {
    case "free":
      return null;
    case "soft":
      return { prefix: c.soft(a.soft) };
    case "hard":
      // Addendum 2 §3: collection never renders hardIn or hardMulti. A hard
      // state with no names lands here too — `0 free — across 0 decks` is the
      // alternative, and `marker.hard` is the base form the copy file ships.
      if (opts.nameless || a.hardDeckNames.length === 0) return { prefix: c.hard };
      return a.hardDeckNames.length === 1
        ? withName(c.hardIn(a.hardDeckNames[0]), a.hardDeckNames[0])
        : { prefix: c.hardMulti(a.hardDeckNames.length) };
    case "over":
      // Collection is count-only here too — the canvas draws a bare `short 1`.
      if (opts.nameless) return { prefix: c.over(-a.free) };
      // Self-excluded: hardDeckNames already omits the current deck, so a lone
      // remaining entry is the OTHER claimant. "2 decks want it" would count
      // the deck the player is standing in.
      if (opts.selfExcluded && a.hardDeckNames.length === 1) {
        return withName(c.overAlsoIn(-a.free, a.hardDeckNames[0]), a.hardDeckNames[0]);
      }
      // One deck CAN be the whole demand — "any number" cards (Relentless
      // Rats, Nazgûl) let a single list claim nine copies of something you own
      // four of. `overWithDemand` ships a singular branch for precisely that,
      // so the threshold is one deck, not two; below it there is no name and
      // nothing to count, and the bare `short N` is all that is true.
      return a.hardDeckNames.length >= 1
        ? { prefix: c.overWithDemand(-a.free, a.hardDeckNames.length) }
        : { prefix: c.over(-a.free) };
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
 * The over-committed glyph is two diamonds overlapping by 1px, with the front
 * one carrying a left border in **the colour of whatever sits behind the
 * marker** — that border is the seam, and it only reads as a seam while it
 * matches the background. Six different backgrounds host this marker, so the
 * colour is a prop rather than a constant (design table line 124).
 */
function OverGlyph({ seam }: { seam: string }) {
  return (
    <span aria-hidden="true" className="relative block flex-none w-[11px] h-[6px]">
      <span
        className={twMerge(DIAMOND, "absolute left-0 top-0 bg-[color:var(--danger)]")}
      />
      <span
        className={twMerge(DIAMOND, "absolute left-[5px] top-0 bg-[color:var(--danger)]")}
        style={{ borderLeft: `1px solid ${seam}` }}
      />
    </span>
  );
}

function Glyph({ state, seam }: { state: AvailabilityState; seam: string }) {
  if (state === "over") return <OverGlyph seam={seam} />;
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
    />
  );
}

// Row 3.4 gives the row density the same lifted foregrounds as the chip: the
// hard label is #E8CE93 on both, and the soft label is --fg-body (#C6B79A),
// which is a step brighter than the #A89B84 its own glyph outline uses.
const LABEL_COLOUR: Record<Exclude<AvailabilityState, "free">, string> = {
  soft: "text-[color:var(--fg-body)]",
  hard: "text-[color:var(--avail-hard-fg)]",
  over: "text-[color:var(--avail-over-fg)]",
};

// Rows 2.1 and 2.5–2.7. Both halves move with the state: a soft chip is the
// quietest scrim behind the dimmest border, an over chip the densest behind
// the loudest.
const CHIP_SKIN: Record<Exclude<AvailabilityState, "free">, string> = {
  soft: "bg-[rgba(11,9,7,0.86)] border-[color:var(--border-dashed)]",
  hard: "bg-[rgba(11,9,7,0.90)] border-[color:var(--brass)]",
  over: "bg-[rgba(11,9,7,0.92)] border-[color:var(--danger)]",
};

// The chip paints its own scrim, so the thing behind its glyph is that scrim
// and never anything else. Callers do not get to name it.
const CHIP_SCRIM = "#0B0907";

export function AvailabilityMarker({
  availability,
  density = "row",
  seam = "var(--bg)",
  spoken = false,
  className,
  ...opts
}: {
  availability: Availability;
  density?: "row" | "chip";
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
  className?: string;
} & MarkerOpts) {
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
  const prose = spoken ? markerAria(availability, effective) : null;

  return (
    <span
      className={twMerge(
        "inline-flex items-center min-w-0",
        chip
          ? // Top-left: top-right is the shipped brass quantity badge on both
            // tile surfaces (A2RM:51–60).
            `absolute left-[6px] top-[6px] gap-[4px] rounded-[4px] border px-[5px] py-[2px] ${CHIP_SKIN[state]}`
          : // Row density sets no font size and no family — it rides the
            // shipped meta line and must not change its height (row 3.1).
            "gap-[6px]",
        className,
      )}
    >
      <Glyph state={state} seam={chip ? CHIP_SCRIM : seam} />
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
      */}
      {/*
        `whitespace-pre`, not `whitespace-nowrap`: a flex item trims its own
        trailing whitespace, and the negative margin below then closes the gap
        that was standing in for it — so `0 free — in ` and `Atraxa` render as
        `0 free — inAtraxa`. jsdom cannot see this; only the browser can.
      */}
      <span
        aria-hidden={spoken || undefined}
        className={twMerge(
          "flex-none whitespace-pre",
          colour,
          chip && "font-mono text-[8.5px] font-semibold tracking-[0.02em]",
        )}
      >
        {text.prefix}
      </span>
      {text.name && (
        // -ml cancels the container's gap between the two halves of what is one
        // sentence: the gap separates the glyph from the text, not `0 free — in`
        // from `Atraxa`.
        <span
          aria-hidden={spoken || undefined}
          className={twMerge("truncate min-w-0 -ml-[6px]", colour)}
          data-deck-name=""
        >
          {text.name}
        </span>
      )}
      {prose && <span className="sr-only">{prose}</span>}
    </span>
  );
}
