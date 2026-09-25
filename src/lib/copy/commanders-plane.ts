// src/lib/copy/commanders-plane.ts — /commanders as one plane (#340, folding in #335, #341,
// #343, #344).
//
// Shape follows src/lib/copy/commander-discovery.ts: flat const object, functions for
// interpolated strings, no JSX. Voice: Kitchen Table — utility copy stays straight.
//
// `discoveryCopy` and `availabilityCopy` are reused BY REFERENCE for the scope labels, the sort
// labels, the `Score against` labels and the receipt clauses. This module adds; it replaces two
// shipped strings, and both edits live in `commander-discovery.ts` itself rather than here:
// `justify.floorNote`/`.floorNoteShort` gain the threshold argument, and `justify.distanceNear`
// is reframed for #344.
//
// VOCABULARY, continued from `commander-discovery.ts`, with three additions:
//   • "contains" / "exactly" — the two colour MATCH modes, described as matches and never as
//                     operators. "AND" is the word the reported confusion is about, and "OR"
//                     is a mode the handoff forbids; neither appears in any string below.
//   • "excludes"    — what a control does to a row. Active voice, and the control is always
//                     the subject: a player has to know WHAT to change, and a passive
//                     sentence hides it.
//   • "pool"        — the set of cards the figures were read against. `Score against` picks it.
//                     Never "collection" when the free pool is active; the whole point is that
//                     those are different denominators.
// The word "floor" stays, and it now carries a NUMBER everywhere it appears: the threshold is a
// function of the pool, so it is a figure and every figure prints.
//
// EVERY FIGURE PRINTS ITS DENOMINATOR. Counts go through `n`; percentages do not.
//
// THE FLOOR HAS SEVEN CALL SITES, and this is the enumeration to build against:
//   1. `discoveryCopy.justify.floorNote`      — the row note, desktop
//   2. `discoveryCopy.justify.floorNoteShort` — the row note, mobile
//   3. `planeCopy.exclusion.floor`     — the exclusion line, two-clause form
//   4. `planeCopy.exclusion.floorAlone`— the exclusion line, floor-only form
//   5. `planeCopy.floorPool.body`/`.emphasis` — the pool-variant empty state
//   6. `planeCopy.excluded.floor`/`.floorAlso` — the excluded-match sentence
//   7. `discoveryCopy.empty.floorBody`/`.floorEmphasis` — the COLLECTION-variant FloorEmpty. The
//      strings do not change; the VALUE they interpolate does.
// All seven take the threshold and print it, from one source, and the seven must agree.
//
// NAMING. `floorPct` in this module means THE THRESHOLD. A row's own support percentage is `pct`
// here and `supportPct` on `DiscoveryItem`.
//
// WHICH POPULATION EACH SURFACE PRINTS. Each surface prints the population that answers ITS
// question:
//   • the subtitle          — the FULL pool ("how many commanders could I lead"), sort-independent
//   • the pip row + field   — the rows ACTUALLY ON SCREEN
//   • the exclusion line    — bridges the two, naming both departing groups
// So `printed total − excluded = rows on screen` holds across the three, which is why the
// exclusion line must name the unmeasurable group and not only the below-floor one.

import { colorNames } from "./color-labels";

const n = (v: number) => v.toLocaleString("en-US");

/** Colour identities are joined for prose, not for the pip row: " · " reads as a list in a
    sentence and the chips already carry the swatches. Two names get "and" — a middot between
    exactly two reads as a truncation. */
const identity = (colors: string[]) => {
  const named = colorNames(colors);
  return named.length === 2 ? `${named[0]} and ${named[1]}` : named.join(" · ");
};

export const planeCopy = {
  // ── The colour join mode ──────────────────────────────────────────────
  // A modifier of the pip row, not a control of its own: it renders only when at least one
  // pip is lit, because `filterByColors` returns everything unchanged on an empty selection
  // and there is nothing for a mode to join.
  join: {
    // Mobile row label only. On desktop the modifier sits inside the pip wrapper, where
    // `COLORS` is already the caption and a second one would be noise.
    label: "Color match",
    contains: "Contains",
    exactly: "Exactly",
    // The group's accessible name at both widths. The desktop caption is inside the wrapper
    // and aria-hidden, because a `display: none` label names nothing.
    groupAria: "Color match",
    containsAria: "Show commanders whose color identity contains all the selected colors",
    exactlyAria: "Show only commanders whose color identity is exactly the selected colors",

    // Present only under `Exactly`, in `availabilityCopy.ranking.freeNoteLong`'s slot and
    // register. Says what the mode did, in the same breath as the count it produced.
    exactNote: (matching: number, candidates: number, colors: string[]) =>
      `exact identity: ${n(matching)} of the ${n(candidates)} you have not built are ${identity(
        colors,
      )} and nothing else`,
    exactNoteShort: (matching: number, candidates: number, colors: string[]) =>
      `exact identity: ${n(matching)} of ${n(candidates)} are ${identity(colors)} and nothing else`,

    announce: (mode: "contains" | "exactly", count: number, colors: string[]) =>
      mode === "exactly"
        ? `Showing ${n(count)} commanders whose identity is exactly ${identity(colors)}`
        : `Showing ${n(count)} commanders whose identity contains ${identity(colors)}`,
  },

  // ── Search ────────────────────────────────────────────────────────────
  // Narrows in place. Does not navigate, does not open a surface, does not re-sort.
  //
  // No in-field count: `filter-bar.tsx`'s `{filteredTotal}/{activeTotal}` already carries the
  // match figure, and the figure appears once.
  search: {
    // Inside the field at the leading edge, aria-hidden — the caption `COLORS` already set
    // this pattern in the pip wrapper.
    caption: "FIND",
    placeholder: "Commander name",
    inputAria: "Find a commander in this list by name",
    clear: "Clear the search",
    clearAria: "Clear the search",
    announce: (matches: number, pool: number) =>
      matches === 1
        ? `1 of ${n(pool)} commanders matches`
        : `${n(matches)} of ${n(pool)} commanders match`,

    // 1 · Nothing in the index is named that. The population leads, because the sentence's
    // job is to say where we looked. No aside: there is no second figure worth printing.
    noneHeading: (query: string) => `No commander is named “${query}”`,
    noneBody: (candidates: number) =>
      `Nothing in the ${n(
        candidates,
      )} you have not built has that in its name, and neither does anything you have. Check the spelling.`,
    /** The one clause the state marks. A substring of `noneBody`, so the sentence has one
        author — the same rule `empty.noDecksEmphasis` follows. */
    noneEmphasis: (candidates: number) => `${n(candidates)} you have not built`,
    noneCta: "Clear the search",

    // 1b · The same miss, with the index unchecked: the lookup failed, or it matched more
    // names than it will classify. Scoped to the list, because the list is all this state
    // looked at. No population figure and no emphasis: the number it would print is the
    // one thing this state does not know.
    unknownHeading: (query: string) => `Nothing on this list is named “${query}”`,
    unknownBody:
      "The rest went unchecked, so a commander a filter is holding back could still be named that.",
    unknownCta: "Clear the search",

    // 2 · Every match is excluded. The FULL name, because `DiscoveryItem` carries only `name`.
    // The body then opens with "It matches" rather than repeating the name three lines later.
    heldHeading: (name: string) => `${name} is here. A filter is holding it back`,
    heldAside: (matches: number) =>
      matches === 1 ? "1 match, 0 shown" : `${n(matches)} matches, 0 shown`,

    // 2b · The same state with more than one match. The singular heading names a commander
    // and the body then says "It", which would be a claim about one of several — so a set
    // counts instead, and the body names the control the same way the live-list plural does.
    heldHeadingMany: (matches: number) =>
      `${n(matches)} matches are here. Filters are holding them back`,
    heldMany: (excluded: number, control: string) =>
      excluded === 1
        ? `1 of them is excluded by ${control}.`
        : `${n(excluded)} of them are excluded by ${control}.`,

    // 3 · Some matches survive: an aside above a live list. `also matches` rather than
    // `matches`, because the rows underneath are matches too.
    asideMore: (excluded: number, control: string) =>
      excluded === 1
        ? `1 more match is excluded by ${control}.`
        : `${n(excluded)} more matches are excluded by ${control}.`,
  },

  // ── The excluded-match sentences ──────────────────────────────────────
  // ONE control is named — the outermost that removed the row. Precedence:
  // scope → colour / join → the novelty floor → `Score against`. Each names its control in
  // the control's own words: a sentence that renames a control is one the player has to
  // translate. `also` is the caller's choice of `excluded` vs `excludedAlso` per state.
  excluded: {
    // `held*` variants open with "It" because the list-level heading already names the
    // commander; the `*Also` variants name it, because they sit above a live list.
    heldColors: (filtered: string[], own: string[]) =>
      `It matches, but the ${identity(
        filtered,
      )} color filter excludes it: its identity is ${identity(own)}.`,
    heldJoin: (filtered: string[], own: string[]) =>
      `It matches, but Exactly ${identity(
        filtered,
      )} excludes it: its identity is ${identity(own)}.`,
    heldScope: "It matches, but you have already built a deck around it.",
    heldFloor: (pct: number, floorPct: number) =>
      `It matches, but Something new only shows commanders you could build, and you own ${pct}% of its support list against the ${floorPct}% floor.`,

    scope: (name: string) => `${name} matches, but you have already built a deck around it.`,
    scopeAlso: (name: string) =>
      `${name} also matches, but you have already built a deck around it.`,
    // The destination is the other lane, so it is named the way that lane names
    // itself. `Commanders I own` was the deleted scope control's option label.
    scopeCta: "Switch to your commanders",

    colors: (name: string, filtered: string[], own: string[]) =>
      `${name} matches, but the ${identity(
        filtered,
      )} color filter excludes it: its identity is ${identity(own)}.`,
    colorsAlso: (name: string, filtered: string[], own: string[]) =>
      `${name} also matches, but the ${identity(
        filtered,
      )} color filter excludes it: its identity is ${identity(own)}.`,
    colorsCta: "Clear the color filter",

    // Named instead of `colors` when the row would survive under `Contains` — the mode is
    // the cause, so the mode is the correction.
    join: (name: string, filtered: string[], own: string[]) =>
      `${name} matches, but Exactly ${identity(
        filtered,
      )} excludes it: its identity is ${identity(own)}.`,
    joinAlso: (name: string, filtered: string[], own: string[]) =>
      `${name} also matches, but Exactly ${identity(
        filtered,
      )} excludes it: its identity is ${identity(own)}.`,
    joinCta: "Switch to Contains",

    floor: (name: string, pct: number, floorPct: number) =>
      `${name} matches, but Something new only shows commanders you could build, and you own ${pct}% of its support list against the ${floorPct}% floor.`,
    floorAlso: (name: string, pct: number, floorPct: number) =>
      `${name} also matches, but Something new only shows commanders you could build, and you own ${pct}% of its support list against the ${floorPct}% floor.`,
    floorCta: "Rank by best fit instead",

    // The floor tier's OTHER population, in the vocabulary the exclusion line already
    // uses for it ("have no data to measure"). Without these three keys an unmeasurable
    // match has no sentence: `floor` prints a support percentage the row does not have,
    // and reporting nothing would leave the list-level state claiming nothing is named
    // that, of a commander the index carries. Same tier as the floor, so the precedence
    // is unchanged.
    heldUnmeasured:
      "It matches, but Something new ranks by distance from your decks, and this one has no data to measure.",
    unmeasured: (name: string) =>
      `${name} matches, but Something new ranks by distance from your decks, and this one has no data to measure.`,
    unmeasuredAlso: (name: string) =>
      `${name} also matches, but Something new ranks by distance from your decks, and this one has no data to measure.`,

    /** The control named inside `search.asideMore`, when several matches share one cause and
        the aside counts them instead of naming each. Each is the control's own words, the same
        rule the sentences above follow. */
    control: {
      scope: "the decks you have already built",
      colors: (colors: string[]) => `the ${identity(colors)} color filter`,
      join: (colors: string[]) => `Exactly ${identity(colors)}`,
      floor: (floorPct: number) => `the ${floorPct}% support floor`,
      unmeasured: "Something new",
    },
  },

  // ── The exclusion line ────────────────────────────────────────────────
  // Between the bar and the first row. Two clauses at most, joined by ` · `, ordered by TIER
  // and never by magnitude. Renders nothing when nothing was excluded — no "0 excluded", no
  // reserved height. Missing data is omitted, never zeroed.
  //
  // NO SCOPE CLAUSE, on purpose. Under the discovery scope EVERY built commander is excluded by
  // scope on every load, so the clause would render always — against the "absent when nothing was
  // excluded" rule — and it would report the plane's own definition as a loss. The subtitle
  // already states the population. Scope still names itself in `excluded.scope` above, where the
  // player searched for a specific row and it went missing: different subject, different sentence.
  exclusion: {
    colors: (excluded: number, colors: string[]) =>
      `${n(excluded)} excluded by the ${identity(colors)} color filter`,
    join: (excluded: number, colors: string[]) =>
      `${n(excluded)} excluded by the exact ${identity(colors)} identity`,
    floor: (excluded: number, floorPct: number) =>
      `${n(excluded)} fall below the ${floorPct}% support floor for this pool`,

    // Under `New` TWO populations leave the list: rows measured and found below the floor, and
    // rows with nothing to measure at all. The handoff's word for the second group is "tags",
    // and it is too narrow: `excluded-match.ts` also sends a row here when its denominator is
    // missing, which `index-build.ts` writes whenever EDHREC could not be reached — and such a
    // row can carry tags. "Data" covers both populations the branch actually holds.
    // A line counting only the first leaves
    // `total - excluded` unequal to the rows on screen and names the second group nowhere. Both
    // belong to the SAME tier — the sort's own doing — so they share ONE clause with two figures
    // rather than taking two of the two available. Tier order is unaffected and the cap holds.
    floorWithUnmeasured: (below: number, unmeasured: number, floorPct: number) =>
      `${n(below)} fall below the ${floorPct}% support floor for this pool and ${n(
        unmeasured,
      )} have no data to measure`,
    /** When every excluded row is unmeasurable — no floor casualties at all. */
    unmeasuredAlone: (unmeasured: number) =>
      `${n(unmeasured)} commanders have no data to measure against your decks`,

    /** The model sentence, used when the floor is the SOLE exclusion — the clause count is what
        makes room for it. A second sentence, never a third clause. */
    floorAlone: (excluded: number, floorPct: number, bestPct: number) =>
      `${n(
        excluded,
      )} commanders fall below the ${floorPct}% support floor for this pool. The closest is at ${bestPct}%.`,

    /** The floor-only form when unmeasurable rows are also present. The nearest-miss sentence
        survives because the clause count, not the sentence count, is what is capped. */
    floorAloneWithUnmeasured: (
      below: number,
      unmeasured: number,
      floorPct: number,
      bestPct: number,
    ) =>
      `${n(below)} commanders fall below the ${floorPct}% support floor for this pool and ${n(
        unmeasured,
      )} have no data to measure. The closest is at ${bestPct}%.`,

    join2: (a: string, b: string) => `${a} · ${b}`,
  },

  // ── The floor, when the pool is the cause ─────────────────────────────
  // The shipped `FloorEmpty` offers THE OTHER SORT. When the pool is why the floor took
  // everything, it offers THE OTHER POOL — that is the control that removed the rows. Still
  // never a looser floor: two doors out, both honest.
  //
  // `freeCards` is the size of the FREE POOL, not the collection.
  floorPool: {
    heading: "Nothing clears the bar for “new” against free cards",
    // THE POPULATIONS SUM TO THE POOL. "3,301 of the 3,326 fall below it" leaves 25 unaccounted
    // for, which reads as 25 rows that cleared, in a state whose whole premise is that none did.
    // Below-floor plus unmeasurable equals the candidate count exactly.
    //
    // The last clause is the CTA's evidence: of the rows below the floor here, this many would
    // clear against the full collection — the same figure that discriminates `excluded.pool`, so
    // it costs nothing extra.
    body: (
      floorPct: number,
      below: number,
      unmeasured: number,
      candidates: number,
      freeCards: number,
      clearingAgainstCollection: number,
    ) =>
      `Something new only shows commanders you could actually build: at least ${floorPct}% of their support list already in your collection. Read against the ${n(
        freeCards,
      )} free cards in this pool, ${n(below)} of the ${n(candidates)} fall below that bar and ${n(
        unmeasured,
      )} have no data to measure. ${n(
        clearingAgainstCollection,
      )} of them would clear it against everything you own.`,
    /** Substring of `body`, so the mark lands on the rule and not on the misses it caused —
        the same rule `empty.floorEmphasis` follows. */
    emphasis: (floorPct: number) =>
      `at least ${floorPct}% of their support list already in your collection`,
    cta: "Score against everything I own",
    // NO ctaNote. The count that survives in the OTHER pool is one this pool's payload cannot
    // know, and a second query for it is ruled out. The CTA stands alone rather than carrying a
    // figure the page would have to invent.
  },

  // ── The archetype overflow (#343) ─────────────────────────────────────
  // The count clause IS the trigger. `item.unplayedLabels` already carries the full array to
  // the client, so there is no fetch, no field and no loading state to name.
  overflow: {
    /** Replaces `justify.tagList`'s trailing clause when the row can disclose. The em dash
        and spacing match `tagList` exactly, so a closed row is byte-identical to shipped. */
    more: (extra: number) => `and ${n(extra)} more`,
    fewer: "show fewer",
    moreAria: (total: number, name: string) => `Show all ${n(total)} archetypes for ${name}`,
    fewerAria: (name: string) => `Show three archetypes for ${name}`,
  },

  // The row's two floor notes are sites 1 and 2 of the seven, and they are NOT here: they are
  // `discoveryCopy.justify.floorNote`/`.floorNoteShort`, whose signatures this work changed. The
  // row already reads that module, and a second copy of the same sentence here would be a second
  // author for it — which is the exact failure the seven-site enumeration exists to prevent.
} as const;
