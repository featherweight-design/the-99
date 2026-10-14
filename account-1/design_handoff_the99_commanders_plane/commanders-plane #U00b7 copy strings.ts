// src/lib/copy/commanders-plane.ts — /commanders as one plane (#340, folding in #335, #341,
// #343, #344; brief 2026-09-06, verified against origin/main at 20b8c1d).
//
// Shape follows src/lib/copy/commander-discovery.ts: flat const object, functions for
// interpolated strings, no JSX. Voice: Kitchen Table — utility copy stays straight.
//
// THIS MODULE EDITS TWO SHIPPED STRINGS and adds the rest. `discoveryCopy` and
// `availabilityCopy` are reused BY REFERENCE for the scope labels, the sort labels, the
// `Score against` labels and the receipt clauses. The two edits are:
//
//   1. discoveryCopy.justify.distanceNear   →  see `justifyEdit` at the bottom of this file.
//   2. discoveryCopy.justify.floorNote      →  see `floorNoteEdit`. Shipped takes `(pct)`; the
//      justify.floorNoteShort                  threshold cannot print without `(floorPct, pct)`.
//                                              Call sites: `discovery-row.tsx:401` and `:542`.
//
// R1–R3 claimed exactly one edit. That was wrong: `planeCopy.floorNote` was written as a new key,
// but it REPLACES the shipped row note rather than adding a note beside it, so the shipped string's
// signature changes. Must-not 3 and the gap report are audited against the count, so it is stated
// here rather than discovered at review.
//
// #344: the shipped clause ends a novelty recommendation on the one archetype the player
// already plays. The edit keeps both facts and reverses the order so the sentence ends on
// newness. It is not a per-sort fork — `discovery-row.tsx` computes
// `const tags = fit ? null : tagSentence(item)`, so this clause only ever renders under the
// novelty sort, which is the sort #344 is about.
//
// VOCABULARY, continued from `commander-discovery.ts`, with three additions:
//   • "contains" / "exactly" — the two colour MATCH modes, described as matches and never as
//                     operators. "AND" is the word the reported confusion is about, and "OR"
//                     is a mode §4.2 forbids; neither appears in any string below.
//   • "excludes"    — what a control does to a row. Active voice, and the control is always
//                     the subject: a player has to know WHAT to change, and a passive
//                     sentence hides it.
//   • "pool"        — the set of cards the figures were read against. `Score against` picks it.
//                     Never "collection" when the free pool is active; the whole point of
//                     §4.4 is that those are different denominators.
// The word "floor" stays, and it now carries a NUMBER everywhere it appears: §4.4 makes the
// threshold a function of the pool, so it is a figure and every figure prints.
//
// EVERY FIGURE PRINTS ITS DENOMINATOR. The search count is `{matches}/{pool}`, never a bare
// count. Counts go through `n`; percentages do not.
//
// THE FLOOR HAS SEVEN CALL SITES, and this is the enumeration engineering should build against:
//   1. `planeCopy.floorNote.long`      — the row note, desktop
//   2. `planeCopy.floorNote.short`     — the row note, mobile
//   3. `planeCopy.exclusion.floor`     — the exclusion line, two-clause form
//   4. `planeCopy.exclusion.floorAlone`— the exclusion line, floor-only form (added in R2)
//   5. `planeCopy.floorPool.body`/`.emphasis` — the pool-variant empty state
//   6. `planeCopy.excluded.floor`/`.floorAlso` — the excluded-match sentence
//   7. `emptyCopy.floorBody`/`.floorEmphasis`  — the COLLECTION-variant FloorEmpty, rendered at
//      `discovery-view.tsx:243-248`, which today interpolates `Math.round(NOVELTY_FLOOR * 100)`.
//      The strings do not change; the VALUE they interpolate does. R3's enumeration missed this
//      site, which would have left it printing the constant while the other six scaled.
// All seven take the threshold and print it. The figure is whatever the scaling function returns
// for the active pool, from one source, and the seven must agree.
//
// NAMING. `floorPct` in this module means THE THRESHOLD. `novelty.ts:15-18` uses the same name for
// A ROW'S OWN SUPPORT PERCENTAGE. In every string here the threshold is `floorPct` and the row's
// figure is `pct`; one of the two needs renaming before this lands, and Design's preference is
// `supportPct` for the row's, since that is what `novelty.ts` computes per item.
//
// THE WINDOW COUNT IS NOT RELOCATED, AND NOT REDRAWN EITHER. The row search takes on mobile is
// `WindowCount` — "25 shown · 3,301 more below" (`filter-bar.tsx:420-427`) — NOT
// `discoveryCopy.window.revealBand`, which is a prop of `RevealControl` rendered inside the `<ul>`
// after the sliced items (`discovery-view.tsx:316-333`). R1–R3 confused the two and R3 promised the
// displaced count would move to "the line beneath", which does not exist on the bar.
// `revealBand` is untouched by this handoff and keeps both clauses. Whether the bar may drop
// `WindowCount` at all is blocker 7 — a deletion of shipped content, not a free substitution.
// The match figure appears once; where it appears is blocker 8.

// ── WHICH POPULATION EACH SURFACE PRINTS ────────────────────────────────
// Settled (was blocker 6). Each surface prints the population that answers ITS question:
//   • the subtitle          — the FULL pool ("how many commanders could I lead"), sort-independent
//   • the pip row + field   — the rows ACTUALLY ON SCREEN
//   • the exclusion line    — bridges the two, naming both departing groups
// So `printed total − excluded = rows on screen` holds across the three, which is why the
// exclusion line must name the unmeasurable group and not only the below-floor one.

const n = (v: number) => v.toLocaleString("en-US");

/** Colour identities are joined for prose, not for the pip row: " · " reads as a list in a
    sentence and the chips already carry the swatches. Two names get "and" — a middot between
    exactly two reads as a truncation. */
const identity = (colors: string[]) =>
  colors.length === 2
    ? `${colors[0]} and ${colors[1]}`
    : colors.join(" · ");

export const planeCopy = {
  // ── §4.2 The colour join mode ─────────────────────────────────────────
  // A modifier of the pip row, not a control of its own: it renders only when at least one
  // pip is lit, because `filterByColors` returns everything unchanged on an empty selection
  // and there is nothing for a mode to join.
  join: {
    // Mobile row label only. On desktop the modifier sits inside the pip wrapper, where
    // `COLORS` is already the caption and a second one would be noise.
    label: "Colour match",
    contains: "Contains",
    exactly: "Exactly",
    // The group's accessible name at both widths. The desktop caption is inside the wrapper
    // and aria-hidden, per the gap report's note on `display: none` labels.
    groupAria: "Colour match",
    containsAria:
      "Show commanders whose colour identity contains all the selected colours",
    exactlyAria:
      "Show only commanders whose colour identity is exactly the selected colours",

    // Present only under `Exactly`, in `availabilityCopy.ranking.freeNoteLong`'s slot and
    // register. Says what the mode did, in the same breath as the count it produced.
    exactNote: (matching: number, candidates: number, colors: string[]) =>
      `exact identity — ${n(matching)} of the ${n(candidates)} you have not built are ${identity(
        colors,
      )} and nothing else`,
    exactNoteShort: (matching: number, candidates: number, colors: string[]) =>
      `exact identity — ${n(matching)} of ${n(candidates)} are ${identity(colors)} and nothing else`,

    announce: (mode: "contains" | "exactly", count: number, colors: string[]) =>
      mode === "exactly"
        ? `Showing ${n(count)} commanders whose identity is exactly ${identity(colors)}`
        : `Showing ${n(count)} commanders whose identity contains ${identity(colors)}`,
  },

  // ── §4.3 Search ───────────────────────────────────────────────────────
  // Narrows in place. Does not navigate, does not open a surface, does not re-sort.
  search: {
    // Inside the field at the leading edge, aria-hidden — the caption `COLORS` already set
    // this pattern in the pip wrapper.
    caption: "FIND",
    placeholder: "Commander name",
    inputAria: "Find a commander in this list by name",
    clear: "Clear the search",
    clearAria: "Clear the search",
    // Both figures, always. aria-hidden — the count is announced on the live region instead.
    count: (matches: number, pool: number) => `${n(matches)}/${n(pool)}`,
    announce: (matches: number, pool: number) =>
      matches === 1
        ? `1 of ${n(pool)} commanders matches`
        : `${n(matches)} of ${n(pool)} commanders match`,

    // 1 · Nothing in the index is named that. The population leads, because the sentence's
    // job is to say where we looked. No aside: there is no second figure worth printing.
    // ONE argument: R2 took an `indexed` total as a second slot and the payload does not
    // deliver it, so the clause that used it ("the index carries 3,342 commanders") is gone.
    noneHeading: (query: string) => `No commander is named “${query}”`,
    noneBody: (candidates: number) =>
      `Nothing in the ${n(
        candidates,
      )} you have not built has that in its name, and neither does anything you have. Check the spelling.`,
    /** The one clause the state marks. A substring of `noneBody`, so the sentence has one
        author — the same rule `empty.noDecksEmphasis` follows. */
    noneEmphasis: (candidates: number) => `${n(candidates)} you have not built`,
    noneCta: "Clear the search",

    // 2 · Every match is excluded. The FULL name, because `DiscoveryItem` carries only
    // `name` — R2 asked for a short name that does not exist in the payload. The body then
    // opens with "It matches" rather than repeating the name three lines later.
    heldHeading: (name: string) => `${name} is here — a filter is holding it back`,
    heldAside: (matches: number) =>
      matches === 1 ? "1 match, 0 shown" : `${n(matches)} matches, 0 shown`,

    // 3 · Some matches survive: an aside above a live list. `also matches` rather than
    // `matches`, because the rows underneath are matches too.
    asideMore: (excluded: number, control: string) =>
      excluded === 1
        ? `1 more match is excluded by ${control}.`
        : `${n(excluded)} more matches are excluded by ${control}.`,
  },

  // ── §4.3 The exclusion sentences ──────────────────────────────────────
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
      )} colour filter excludes it — its identity is ${identity(own)}.`,
    heldJoin: (filtered: string[], own: string[]) =>
      `It matches, but Exactly ${identity(
        filtered,
      )} excludes it — its identity is ${identity(own)}.`,
    heldScope: "It matches, but you have already built a deck around it.",
    // State 2b can be caused by any of the four controls. R3 defined only the three above, so the
    // floor and the pool had a drawn state and no string.
    heldFloor: (pct: number, floorPct: number) =>
      `It matches, but Something new only shows commanders you could build, and you own ${pct}% of its support list against the ${floorPct}% floor.`,
    heldPool: (freeCards: number) =>
      `It matches and would clear the floor against everything you own — but not against the ${n(
        freeCards,
      )} free cards in this pool.`,

    scope: (name: string) => `${name} matches, but you have already built a deck around it.`,
    scopeAlso: (name: string) =>
      `${name} also matches, but you have already built a deck around it.`,
    scopeCta: "Switch to Commanders I own",

    colors: (name: string, filtered: string[], own: string[]) =>
      `${name} matches, but the ${identity(
        filtered,
      )} colour filter excludes it — its identity is ${identity(own)}.`,
    colorsAlso: (name: string, filtered: string[], own: string[]) =>
      `${name} also matches, but the ${identity(
        filtered,
      )} colour filter excludes it — its identity is ${identity(own)}.`,
    colorsCta: "Clear the colour filter",

    // Named instead of `colors` when the row would survive under `Contains` — the mode is
    // the cause, so the mode is the correction.
    join: (name: string, filtered: string[], own: string[]) =>
      `${name} matches, but Exactly ${identity(
        filtered,
      )} excludes it — its identity is ${identity(own)}.`,
    joinAlso: (name: string, filtered: string[], own: string[]) =>
      `${name} also matches, but Exactly ${identity(
        filtered,
      )} excludes it — its identity is ${identity(own)}.`,
    joinCta: "Switch to Contains",

    floor: (name: string, pct: number, floorPct: number) =>
      `${name} matches, but Something new only shows commanders you could build, and you own ${pct}% of its support list against the ${floorPct}% floor.`,
    floorAlso: (name: string, pct: number, floorPct: number) =>
      `${name} also matches, but Something new only shows commanders you could build, and you own ${pct}% of its support list against the ${floorPct}% floor.`,
    floorCta: "Rank by best fit instead",

    // The row falls below the floor in the ACTIVE pool but WOULD clear against the full
    // collection — so the pool, not the row, is why it is missing.
    //
    // R6 restores the comparative clause R5 cut, on the basis Hugh has since supplied: the
    // "would have cleared against everything you own" flag comes from one extra column in a
    // query that already runs, not a second ranking pass. R5 was right to cut it while it cost
    // a full re-rank and right to keep the free-card count; this is the same sentence, now
    // affordable.
    //
    // THE FLAG IS ALSO THE DISCRIMINATOR. Without it these three keys could never fire: the
    // precedence table puts the floor above `Score against`, so the floor branch won every time
    // and a pool exclusion was indistinguishable from a floor one. `excluded.pool` is not a
    // fifth cause competing with the floor — it is the floor's SUB-CASE, selected when
    // `clearsAgainstCollection` is true, and `excluded.floor` covers the rest.
    pool: (name: string, freeCards: number) =>
      `${name} matches and would clear the floor against everything you own — but not against the ${n(
        freeCards,
      )} free cards in this pool.`,
    poolAlso: (name: string, freeCards: number) =>
      `${name} also matches and would clear the floor against everything you own — but not against the ${n(
        freeCards,
      )} free cards in this pool.`,
    poolCta: "Score against everything I own",
  },

  // ── §4.4 The exclusion line ───────────────────────────────────────────
  // Between the bar and the first row. Two clauses at most, joined by ` · `, ordered by TIER
  // and never by magnitude. Renders nothing when nothing was excluded — no "0 excluded", no
  // reserved height. Missing data is omitted, never zeroed.
  // NO SCOPE CLAUSE, on purpose. R1 declared an `exclusion.scope` key and drew no state that
  // fired it; R2 deletes it rather than drawing one. Under the discovery scope EVERY built
  // commander is excluded by scope on every load, so the clause would render always — against
  // §4.4’s "absent when nothing was excluded" — and it would report the plane’s own definition
  // as a loss. The subtitle already states the population ("3,326 commanders you have not
  // built"). Scope still names itself in `excluded.scope` above, where the player searched for a
  // specific row and it went missing: different subject, different sentence.
  exclusion: {
    colors: (excluded: number, colors: string[]) =>
      `${n(excluded)} excluded by the ${identity(colors)} colour filter`,
    join: (excluded: number, colors: string[]) =>
      `${n(excluded)} excluded by the exact ${identity(colors)} identity`,
    floor: (excluded: number, floorPct: number) =>
      `${n(excluded)} fall below the ${floorPct}% support floor for this pool`,

    // R5. Under `New` TWO populations leave the list: rows measured and found below the floor,
    // and rows with no tag data to measure at all. R4's line counted only the first, so
    // `total - excluded` did not equal the rows on screen and the second group was named
    // nowhere. Both belong to the SAME tier — the sort's own doing — so they share ONE clause
    // with two figures rather than taking two of the two available. Tier order is unaffected and
    // the two-clause cap holds.
    floorWithUnmeasured: (below: number, unmeasured: number, floorPct: number) =>
      `${n(below)} fall below the ${floorPct}% support floor for this pool and ${n(
        unmeasured,
      )} have no tags to measure`,
    /** When every excluded row is unmeasurable — no floor casualties at all. */
    unmeasuredAlone: (unmeasured: number) =>
      `${n(unmeasured)} commanders have no tags to measure against your decks`,

    /** The §4.4 model sentence, used when the floor is the SOLE exclusion — the clause count
        is what makes room for it. A second sentence, never a third clause.
        Takes `floorPct` like every other site that claims the floor: R1’s signature omitted it,
        which made this the one call site claiming the floor without printing it. */
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
      )} have no tags to measure. The closest is at ${bestPct}%.`,

    join2: (a: string, b: string) => `${a} · ${b}`,
  },

  // ── §4.4 The floor, when the pool is the cause ────────────────────────
  // The shipped `FloorEmpty` offers THE OTHER SORT. When the pool is why the floor took
  // everything, it offers THE OTHER POOL — that is the control that removed the rows. Still
  // never a looser floor: two doors out, both honest.
  //
  // `freeCards` is the size of the FREE POOL, not the collection. R4 drew it in four strings
  // (here, `excluded.pool`/`.poolAlso`, `excluded.heldPool`) against a payload that carries only
  // the collection size; engineering has agreed to add the one figure.
  floorPool: {
    heading: "Nothing clears the bar for “new” against free cards",
    // R6: THE POPULATIONS SUM TO THE POOL. R5 fixed this on the exclusion line and left the
    // same fault here — "3,301 of the 3,326 fall below it" leaves 25 unaccounted for, which
    // reads as 25 rows that cleared, in a state whose whole premise is that none did. Below-floor
    // plus unmeasurable now equals the candidate count exactly.
    //
    // The last clause is the CTA's evidence: of the rows below the floor here, this many would
    // clear against the full collection — the same flag that discriminates `excluded.pool`, so it
    // costs nothing extra.
    body: (
      floorPct: number,
      below: number,
      unmeasured: number,
      candidates: number,
      freeCards: number,
      clearingAgainstCollection: number,
    ) =>
      `Something new only shows commanders you could actually build — at least ${floorPct}% of their support list already in your collection. Read against the ${n(
        freeCards,
      )} free cards in this pool, ${n(below)} of the ${n(
        candidates,
      )} fall below that bar and ${n(
        unmeasured,
      )} have no tags to measure. ${n(
        clearingAgainstCollection,
      )} of them would clear it against everything you own.`,
    /** Substring of `body`, so the mark lands on the rule and not on the misses it caused —
        the same rule `empty.floorEmphasis` follows. */
    emphasis: (floorPct: number) =>
      `at least ${floorPct}% of their support list already in your collection`,
    cta: "Score against everything I own",
    // NO ctaNote. R2 drew "1,704 clear it there" — the count that survives in the OTHER
    // pool, which this pool's payload cannot know, and the README rules out a second query.
    // The CTA stands alone rather than carrying a figure the page would have to invent.
  },

  // ── §5 / #343 The archetype overflow ──────────────────────────────────
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

  // ── §4.4 The floor as a figure, on the row ────────────────────────────
  // The shipped `justify.floorNote` states the percentage the player owns but not the bar it
  // cleared. With the bar now variable, a row that says "clears the floor" without naming it
  // is a figure without its denominator.
  floorNote: {
    long: (floorPct: number, pct: number) =>
      `clears the ${floorPct}% floor — you own ${pct}% of its support list`,
    short: (floorPct: number, pct: number) =>
      `clears the ${floorPct}% floor — you own ${pct}% of its list`,
  },
} as const;

// ── Shipped string 2 ───────────────────────────────────────────────
// §4.4. Replaces `discoveryCopy.justify.floorNote` and `.floorNoteShort`, whose shipped signature
// is `(pct)` — the threshold was a constant, so it did not need passing. With the floor now a
// function of the pool, the row cannot claim it without printing it. Call sites:
// `discovery-row.tsx:401` (long) and `:542` (short). Identical text to `planeCopy.floorNote`,
// which is where the drawn strings live; this export exists so the diff against shipped is
// explicit.
export const floorNoteEdit = {
  floorNote: (floorPct: number, pct: number) =>
    `clears the ${floorPct}% floor — you own ${pct}% of its support list`,
  floorNoteShort: (floorPct: number, pct: number) =>
    `clears the ${floorPct}% floor — you own ${pct}% of its list`,
} as const;

// ── Shipped string 1 ───────────────────────────────────────────────
// #344. Replaces `discoveryCopy.justify.distanceNear`. **The signature is unchanged** — the
// same two arguments `tagSentence` already passes, so `discovery-row.tsx` needs no edit at all.
//
// Before: `Closest is your ${deckName} list, which shares ${shared}.`
// After:  the deck becomes the yardstick and the sentence ends on newness, not on overlap.
//
// NO COUNT IN THE CLAUSE. R2 drew "the other 6 are new" and computed it as `unplayedCount -
// sharedLabels.length` — unplayed archetypes and the nearest deck's shared archetypes are
// DISJOINT sets, so that subtraction was meaningless. The figure the row needs is already
// printed beside this sentence (`figureUnitNew`: "7 of 7 tags"), so the clause says "the rest"
// and adds no third argument. `extraShared` is a count of shared labels, which is the opposite
// of what this clause is about.
export const justifyEdit = {
  distanceNear: (deckName: string, shared: string) =>
    `Your closest build, ${deckName}, plays ${shared} — the rest are new.`,
} as const;
