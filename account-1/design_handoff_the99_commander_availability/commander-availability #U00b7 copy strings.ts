// commander-availability · copy strings
//
// Handoff: design_handoff_the99_commander_availability (R1).
// Brief: docs/superpowers/design-briefs/2026-09-15-owned-is-not-available.md
//        (feat/commander-availability-brief).
//
// THE SHORT VERSION: this handoff moves a system onto a page. It writes ONE new
// string, rewrites ONE, and deletes TWO. Everything else below is a reuse
// manifest naming the module that already owns the words, so eng can see at a
// glance that nothing is being re-typed at a second call site — which is the
// failure mode adding a fifth availability surface invites.
//
// Ruling 1 is the whole reason the manifest is longer than the diff: the page
// draws the app's existing five readings and invents no sixth, so five of the
// six things a reader sees here are already written down somewhere else.

/* ─────────────────────────────────────────────────────────────────────────────
   EDITED — src/lib/copy/commander-explained.ts

   One addition, one rewrite, two deletions. All four are in `explainedCopy`,
   and all four follow from the dot dropping to two states.
   ───────────────────────────────────────────────────────────────────────────── */

export const commanderAvailabilityCopyEdits = {
  // ── The key (§4.2) ──────────────────────────────────────────────────
  //
  // `committed` is the wrong name for this block now — nothing in it is about
  // `committedTo`, which retires with the read. Renaming the block is eng's
  // call; the keys are what matter.
  //
  // TWO FORMS, ONE KEY, PICKED BY WHAT IS ON SCREEN. `dotFree` keeps its
  // shipped string verbatim and is drawn when the four panels hold no marker
  // at all, which is the whole of a free player's page. `dotOwned` is drawn the
  // moment any marker appears, because "and available" is then false of a
  // neighbouring chip. The condition is `DotKey`'s existing read of every card
  // in every role, with `anyMarker` in place of `anyCommitted` — the same
  // mechanism one line lower, not a new one.
  //
  // This is the one place the round spends a string to protect the free state.
  // Shipping `dotOwned` unconditionally would be shorter and more honest in the
  // abstract, and it would repaint a page that has nothing new to say.
  committed: {
    /** UNCHANGED. Drawn when no marker is on screen anywhere. */
    dotFree: "Owned and available.",

    /** NEW. The dot's whole claim, now that severity has its own channel.
     *  Full stop, sentence case, no figure — it is a key, and the no-counts
     *  rule holds: a key sitting above four panels cannot count for any one of
     *  them. */
    dotOwned: "Owned.",

    /** UNCHANGED. The synergy panel is the only panel with two dot states, so
     *  it is the only panel that draws a pair. */
    dotUnowned: "Not owned.",

    /** DELETED — `dotCommitted`, the false one the brief opens on. It printed
     *  the same sentence for a player owning four copies with three spare and a
     *  player owning one copy sleeved into a finished deck. Nothing replaces it:
     *  the marker prints glyph + number + word and legends itself. */

    /** DELETED — `ariaSuffix: (deck) => ` Already in ${deck.name}.``.
     *
     *  Not replaced by a new string either. `chipAria` and `synergy-row`'s
     *  `rowAria` append `markerAria(availability)` instead — name-bearing,
     *  beside a marker drawn `nameless`. The words come from
     *  `availabilityCopy.marker`, which is where every other surface gets them,
     *  so the sentence a screen-reader user hears on this page is the sentence
     *  they hear on the decklist. See README §4.1 for why that is not a
     *  divergence from the coupled contract. */
  },

  // ── The Availability sort sub-line (§4.3) ───────────────────────────
  coverageSort: {
    availability: {
      /** UNCHANGED. */
      label: "Availability",

      /** REWRITTEN. The shipped line described two buckets; there are four.
       *
       *  The four words are the `/collection` filter's own labels — `Free`,
       *  `Wanted by a brew`, `In use`, `Over-committed` — lowercased into a
       *  sentence. Not the marker's words: those are per-card and carry a
       *  number (`none free`, `short 2`), and a sub-line naming buckets needs
       *  the class names. The app has exactly one set of those, and reusing it
       *  means a reader who has met the filter has met this sentence.
       *
       *  Severity order, left to right, which is also the comparator's order —
       *  so the sentence describes the sort rather than promising something
       *  about it. No counts, per the standing rule.
       *
       *  WAS: "Free to use first, then the ones already in a deck." */
      sub: "Free to use first, then wanted by a brew, then in use, then over-committed.",

      /** NO `subNoFigures` TWIN, deliberately. Most played needs one because a
       *  panel with no EDHREC figures is in pool order and the option would be
       *  lying about its own key. Availability has no such case: every owned
       *  card is in exactly one of the four buckets, always. When the
       *  availability read is down the option is not drawn at all, which is the
       *  shipped rule and needs no line. */
    },

    /** UNCHANGED. `announce(label)` already yields "Role coverage sorted by
     *  availability" from the label above. */
  },
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
   REUSED — nothing below is new, and nothing below should be retyped

   The point of this block is the second column. Adding a fifth availability
   surface is exactly the moment someone re-types `none free` at a new call
   site, and the marker's label function is the only thing that should ever
   produce it.
   ───────────────────────────────────────────────────────────────────────────── */

export const reuseManifest = {
  // ── The five readings ───────────────────────────────────────────────
  "the soft label": "availabilityCopy.marker.soft(softQty) — `1 in a brew`",
  "the hard label": "availabilityCopy.marker.hard — `none free`. NEVER hardIn or hardMulti: `nameless` is this page's contract on all three geometries",
  "the over label": "availabilityCopy.marker.over(shortBy) — `short 2`. Never overWithDemand, never overAlsoIn: no deck is named and no claimant is counted",
  "the free label": "there is no string, on purpose. `AvailabilityMarker` returns null and the page draws nothing",
  "the unowned tag": "addPanelCopy.unowned.tag — the word `buy`, via BuyTag. Never re-typed; never unpriced (ruling 5)",
  "the price figure": "priceCopy + formatCents, via BuyTag's own Tail. The handoff quotes `$4.50` as mock data and specifies no format",

  // ── The spoken forms ────────────────────────────────────────────────
  "the chip's accessible name": "recommendationsCopy.coverage.chipAria / chipAriaNoFigure, suffixed with markerAria(availability) — name-bearing. The three shipped branches keep their affordance and their figure clause; the clause lands last",
  "the coverage row's accessible name": "identical to the chip's — chipAria serves both (coverage-chip.tsx:58)",
  "the synergy row's accessible name": "synergyCopy.figure.rowAria(...), suffixed with markerAria(availability). Appended, not substituted — the shipped name carries the ownership word and both figures",
  "the hard sentence": "availabilityCopy.marker.hardAria(deckName) — `no free copies; this one is on your Kyknos list`. Reached via markerAria, never called directly",
  "the over sentence": "availabilityCopy.marker.overAria(shortBy, deckCount). Likewise",
  "the soft sentence": "availabilityCopy.marker.softAria(softQty). Likewise",
  "the free sentence": "markerAria returns null, so the shipped name is produced byte for byte",

  // ── Everything else on the page ─────────────────────────────────────
  "the panel headings, counts and baseline clauses": "recommendationsCopy.coverage + ROLE_TARGETS — untouched",
  "the disclosure labels": "recommendationsCopy.coverage.showAll / moreChips / showFewer / beyondCap — untouched",
  "the sub-caption": "recommendationsCopy.coverage.subcaption / subcaptionNoFigures — untouched",
  "the absent and degraded notes": "recommendationsCopy.coverage.absent* / degraded* — untouched. Whether an availability failure joins the degraded note is README gap 6",
  "the sort trigger": "explainedCopy.coverageSort.triggerPrefix / triggerAria — untouched",
  "the synergy figures": "synergyCopy.figure.* — untouched",
  "the in-use disclosure": "availabilityCopy.detail.* — already shipped on this page for the commander's own support, and out of scope (brief §6)",
  "the /commanders receipt line": "availabilityCopy.receipt.* — ruling 8, unchanged at its own altitude",
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
   VOCABULARY — inherited, not restated

   "free" and "in use" are load-bearing and must not be swapped for synonyms.
   "deck tax" is banned. Copy must never assert a physical location: the app
   knows about LISTS, never boxes, binders or sleeves. All four rules are
   availability.ts's and apply here unchanged.

   One addition of this round's own, and it is a rule rather than a word:
   NOTHING ON THIS PAGE NAMES A DECK IN A DRAWN LABEL. The card modal names
   every claimant with a link and a count, which is a better answer than one
   truncated name — the same call #353 made for card detail. Three geometries,
   one contract, and `nameless` is how it is enforced rather than remembered.
   ───────────────────────────────────────────────────────────────────────────── */
