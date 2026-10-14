// src/lib/copy/commander-explained.ts — explaining the recommendation (#342, folding in #366,
// #346, #347, #345; brief 2026-09-06, verified against origin/main at 20b8c1d).
//
// Shape follows src/lib/copy/recommendations.ts: flat const object, functions for interpolated
// strings, no JSX. Voice: Kitchen Table — utility copy stays straight.
//
// THIS MODULE EDITS TWO SHIPPED STRINGS and adds the rest. `recommendationsCopy` and
// `availabilityCopy` are reused BY REFERENCE for the coverage headings, the baseline clauses, the
// disclosure labels and the receipt vocabulary. The two edits are the FitHero synergy notes, which
// each gain one clause naming the denominator — see `heroNoteEdits` at the bottom of this file.
//
// ONE DELETION, not a string: `segPct` at detail.tsx:53-56 is the function #366 reports and
// nothing here replaces it. The legend now prints points over the segment's weight.
//
// VOCABULARY:
//   • "measurable"  — the word that makes /40 honest. It says the CEILING moved, not that the
//                     score is partial. Never "available", which reads as an outage, and never
//                     "of 40 possible", which invites "possible for whom".
//   • "tend to"     — the hedge sentence 1 must carry. The index is a distribution; "will" and
//                     "can" are claims about cards, which must-not 2 forbids.
//   • "already in"  — a committed card. Reuses the availability receipt's own phrasing
//                     (`N already in use`) because it is the same fact about the same cards.
//                     Never "unavailable", never "taken", never "used up".
//   • "free to use" — an owned, uncommitted card. The sort option's word. Never "spare".
//   • "thinnest"    — the weakest role, in prose. Names a shortage without naming a purchase
//                     (must-not 4). Never "missing", which is false when the count is 2.
//   • "most-played" — the shipped order's name, and what it actually is: inclusion descending.
//                     NOT "EDHREC rank" — there is no rank field on RoleCard (see coverageSort).
//
// EVERY FIGURE PRINTS ITS DENOMINATOR. The score prints its ceiling; each legend segment prints
// its weight; the paragraph prints `34 of the 100`; the committed legend prints `3 of the 12
// shown`. Counts go through `n`; prose figures go through `spellOut`.
//
// The paragraph's generated sentence is NOT in this file. It is a stored column, written at index
// build against the contract in PROSE-one-string-two-surfaces.md. Only the templated clauses and
// the furniture around it live here.

const n = (v: number) => v.toLocaleString("en-US");

// Subject form of a role, for the one sentence that uses a role name as a grammatical subject.
// NOT a replacement for coverage-section.tsx's ROLE_NOUNS, which is singular and attributive
// ("No board wipe cards in your pool") and stays as it ships. Three of the four entries are
// identical to it; `wipes` is the one that cannot be shared, and one shared map made plural
// would break the shipped string instead.
export const ROLE_SUBJECTS: Record<"ramp" | "draw" | "removal" | "wipes", string> = {
  ramp: "Ramp",
  draw: "Card draw",
  removal: "Removal",
  wipes: "Board wipes",
};

/** Deck names are the player's own strings and go in verbatim, never truncated in copy — the
    element that holds them ellipses if it must. */
type Deck = { name: string };

export const explainedCopy = {
  // ── §4.2 The paragraph section ────────────────────────────────────────
  // Heading and the two templated sentences. Sentence 1 is stored, not here.
  // The section renders whenever ANY of the three sentences has content; when none do, it
  // unmounts entirely (STATES §3 state 4).
  prose: {
    heading: "Why this commander",

    /** Sentence 2 — where you stand. Two forms: with and without a deck to name.
        `owned` and `total` are edhrecOwnedCount / edhrecTotal, the same pair the rec card and
        the home hero already print, so the figure a player sees here matches the figure they
        saw arriving.

        NO POSSESSIVE PRONOUN. The R1 draft took a `possessive` argument ("her 100 most-played
        cards"); nothing in the schema or in any computed value carries a commander's pronoun,
        and deriving a possessive from `name` is wrong for a large minority of names (Kess's,
        Atraxa's, "The Ur-Dragon's"). The construction below avoids needing one, and reads the
        same for every commander — which sentence 1 already has to do anyway. */
    standing: (owned: number, total: number) =>
      `You own ${n(owned)} of the ${n(total)} cards most played with this commander.`,

    /** With a deck: one sentence, not two, so the clause cannot be orphaned by a wrap.
        `committed` is the count of owned support cards already in ANY deck; `deck` is the first
        one, named — severity, not inventory (see gap 7 on keeping this consistent with the
        committed mark's count).

        `committed` goes through spellOut, not n(): it is prose, and the canvas draws "twelve".
        R1's key emitted "12" against a canvas reading "twelve" — the mismatch was in the
        function, not the frame. */
    standingWithDeck: (
      owned: number,
      total: number,
      committed: number,
      deck: Deck,
    ) =>
      `You own ${n(owned)} of the ${n(total)} cards most played with this commander, and ${spellOut(committed)} of those are already in your ${deck.name} list.`,

    /** Sentence 3 — the single largest gap, naming the weakest role AND NOTHING ELSE.
        No price, no card names, no buy prompt (must-not 4). Omitted entirely when no role is
        short of baseline. The linked span is the figures clause.

        THE ROLE NOUN COMES FROM ITS OWN MAP, NOT ROLE_NOUNS. coverage-section.tsx:26-31 ships
        ROLE_NOUNS in the SINGULAR — `wipes: "board wipe"` — because its only consumer is
        "No board wipe cards in your pool", where the noun is attributive. Dropped into this
        sentence it produces "board wipe are where you are thinnest". This sentence takes
        ROLE_SUBJECTS below; ROLE_NOUNS is left alone. */
    gap: (roleSubject: string) => `${roleSubject} are where you are thinnest`,
    /** `target` goes through spellOut for the same reason `owned` does — both are prose, and
        the canvas draws "a ten-source baseline". R1's key emitted "10-source". */
    gapFigures: (owned: number, target: number) =>
      `${spellOut(owned)} owned against a ${spellOut(target)}-source baseline`,

    /** Sentence 3's two fragments are joined by " \u2014 " and the paragraph's terminal period is
        added by the renderer, not by either fragment. Stated as a key so the punctuation belongs
        to someone: R2 left the joiner and the full stop unowned, and gap()/gapFigures() both
        return unpunctuated text because gapFigures is the anchor's link text and must not carry
        a period inside the <a>. */
    gapJoin: " \u2014 ",
    sentenceEnd: ".",

    /** Screen-reader name for the gap link. The visible clause is already the destination,
        so the name only adds where it goes. */
    gapLinkAria: (roleLabel: string) => `Jump to ${roleLabel}`,
  },

  // ── §4.3 The score and its denominator ────────────────────────────────
  //
  // THE BAR IS NOT A NO-OP. R1 and R2 both asserted the fill was "byte-identical to what ships"
  // because the shipped `fit.pct` was already (pool+roles)/40 rescaled. That is true only WHILE
  // the rescale exists. format.ts:27 computes `pct = Math.min(s.score, 100)`, so the moment
  // score.ts:172-184's rescale is deleted the same bar renders at 32% of track, not 80%.
  // `fitSegments` has to take the denominator too and compute `pct = 100 * score / measurable`.
  // That is a real change in format.ts, and it is why `measurableTotal` must travel with the
  // score rather than being derived at the hero. See README decision 3b.
  score: {
    label: "Fit for your collection",

    /** The denominator slot. `/100` when synergy was measured, `/40 measurable` when it was
        not — the same string for `absent` and `degraded`, scope-independent (§4.3). */
    denominator: "/100",
    denominatorMeasurable: (max: number) => `/${n(max)} measurable`,

    /** The figure and its ceiling as ONE accessible name. Never "32 slash 40", and never the
        bare figure — a reader hitting "32" with no ceiling is the fabricated-comparability
        problem §4.3 fixes for sighted users. */
    scoreAria: (score: number, max: number) =>
      max === 100
        ? `${score} out of 100 points`
        : `${score} out of ${n(max)} measurable points`,
  },

  // ── §5.1 The legend, and the key ──────────────────────────────────────
  legend: {
    pool: "Pool",
    roles: "Roles",
    synergy: "Synergy",

    /** Points over the segment's weight. The three sum to the score, which is the whole claim:
        the headline number becomes auditable by addition. NOT a share of the achieved total
        (the shipped bug — always sums to 100%) and NOT a percentage of the ceiling (hides the
        weights, which are what the key exists to teach).

        THE EQUATION IS A NUMERIC REQUIREMENT, NOT A FORMAT. score.ts:179-181 rounds each
        segment to one decimal and rounds the total SEPARATELY, so 12.4 + 20.4 + 42.4 stores a
        score of 75.2 → 75 beside integer segments summing to 74. Printing integers under
        today's arithmetic makes the key's closing line a false statement about the number above
        it. R2 claimed "only the string changes"; it does not. See the rounding rule in
        README decision 1b — the segments must round to integers and the score must be defined
        as their sum. These keys assume that rule is in place. */
    segment: (points: number, weight: number) => `${points}/${weight}`,
    segmentAria: (label: string, points: number, weight: number) =>
      `${label}, ${points} of ${weight} points`,
  },

  key: {
    /** Trigger. Same label at both widths; the geometry differs, the sentence does not. */
    open: "What these mean",
    close: "Hide",
    openAria: "What Pool, Roles and Synergy mean",

    pool: {
      label: "Pool",
      weight: (w: number) => `${w} pts`,
      body:
        "How much of your collection is even legal here \u2014 cards inside her colour identity that could go in the 99. Breadth, not quality.",
      bodyMobile:
        "Cards in your collection legal in her identity. Breadth, not quality.",
    },
    roles: {
      label: "Roles",
      weight: (w: number) => `${w} pts`,
      body:
        "Whether you own enough ramp, draw, removal and board wipes to field a deck at all. Measured against a per-role baseline, not against her.",
      bodyMobile:
        "Enough ramp, draw, removal and wipes to field a deck. Against a per-role baseline.",
    },
    synergy: {
      label: "Synergy",
      weight: (w: number) => `${w} pts`,
      body:
        "How much of EDHREC's most-played list for this commander you already own. The largest weight, because it is the only part that is about her rather than about your shelf.",
      bodyMobile:
        "How much of EDHREC's most-played list for her you own. The only part about her, not your shelf.",
    },

    /** The key's actual job, in one line. Rendered from the same points the legend prints, so
        it cannot disagree with them. Two terms when synergy was not measured. */
    sum: (parts: number[], total: number) => `${parts.join(" + ")} = ${total}.`,
    sumWithGloss: (parts: number[], total: number) =>
      `${parts.join(" + ")} = ${total}. The three add up to the number above \u2014 that is the whole claim, and nothing else on this page adds up to it.`,
  },

  // ── §5.2 / #346 The committed-card mark ───────────────────────────────
  // The dot's fill is the channel. These strings are the other two channels: the panel legend
  // (with its count) and the chip's accessible name. Colour is never alone.
  //
  // DATA NOTE — this block is the only one here with no data path today. The detail route
  // (app/commanders/[slug]/page.tsx) reads no decks: it imports resolveCommanderSlug,
  // getRankedList, scoreOneCommander and readSynergyCards, and the `coveredOracleIds` pass at
  // :36-40 is over roleCards, not deck membership. RoleCard is { oracleId, name, inclusionPct }
  // and the synergy card carries `owned` alone. Every string below needs a new read on this
  // route plus a field on both carriers — see READINESS items 1 and 2. Landing these strings
  // without that read renders `undefined of the 5 shown`.
  committed: {
    /** One line per panel, in chipNoFigureLegend's slot, on the same condition: only where a
        VISIBLE chip carries the mark.

        BOTH FIGURES COUNT VISIBLE CHIPS. `marked` is the marked count among the visible chips,
        `visible` is how many are on screen — NOT the role's total. R1 mixed the two: the note
        said "among visible" and the frames printed the role total ("3 of 11" beside four chips,
        one marked), which explains dots the cap is hiding — the one thing the shipped render
        condition exists to prevent. "shown" is what makes the denominator unambiguous. */
    legend: (marked: number, visible: number) =>
      `Amber dot \u2014 owned, and already in one of your decks. ${n(marked)} of the ${n(visible)} shown.`,
    legendMobile: (marked: number, visible: number) =>
      `Amber dot \u2014 already in a deck. ${n(marked)} of the ${n(visible)} shown.`,
    /** When every visible card is marked, a fraction reads as a coincidence. */
    legendAllTwo: "Amber dot \u2014 owned, and already in one of your decks. Both of them.",
    legendAll: "Amber dot \u2014 owned, and already in one of your decks. All of them.",
    legendAllTwoMobile: "Amber dot \u2014 already in a deck. Both of them.",
    legendAllMobile: "Amber dot \u2014 already in a deck. All of them.",

    /** The synergy panel is the only surface where all three dot states appear, so it names
        all three rather than just the new one. */
    legendSynergy:
      "Filled green \u2014 owned and free. Amber \u2014 owned, already in a deck. Hollow \u2014 not owned.",

    /** Appended to the chip's existing accessible name — NOT a replacement.

        The shipped names are recommendations.ts:32-35:
          with figure:  `View details for ${name}. In ${pct}% of decks.`
          no figure:    `View details for ${name}. No EDHREC figure.`
          showFigures=false: undefined, falling through to cardDetailCopy.triggerAria(name).

        R2 quoted the shipped name as "Sol Ring, 94% inclusion" and rewrote the whole string,
        which dropped "View details for" — the only thing telling a screen-reader user the chip
        opens something. These keys are a SUFFIX applied to whichever of the three the chip
        already computed, so all three branches keep their affordance and their figure clause. */
    ariaSuffix: (deck: Deck) => ` Already in ${deck.name}.`,
  },

  // ── §5.2 / #347 The Role Coverage sort ────────────────────────────────
  // One control, four panels. Still a menu, but for its sub-lines rather than for a disabled row:
  // ruling 8's justification (an unavailable option needing its reason inline) is gone along with
  // the option that needed it, so a segmented control is now a defensible alternative.
  //
  // TWO OPTIONS, NOT THREE. R2 offered "EDHREC rank" and "Inclusion figure" as separate
  // orders. They are the same order, and one of them names a field that does not exist:
  // RoleCard is { oracleId, name, inclusionPct } — no rank — and score.ts:144 already sorts
  // every panel by byInclusionThenName (:89-96, inclusion desc, nulls last, then name) whenever
  // any card in that panel carries a figure. So "EDHREC rank" and "Inclusion figure" returned
  // the same array whenever figures existed, and when they did not, the panel is in POOL order
  // (the pool loop's insertion order) — which "EDHREC rank" would have mislabelled as
  // most-played.
  //
  // Corrected: the default option is named for what the shipped sort actually is, and its
  // no-figures case is named honestly rather than papered over.
  coverageSort: {
    triggerPrefix: "Order:",
    triggerAria: "Order the role lists",

    /** The shipped order, named for what byInclusionThenName does. */
    mostPlayed: {
      label: "Most played",
      sub: "Highest EDHREC inclusion first. The order that ships.",
      /** Same option, no figures to sort by: the panel is in pool order and says so, rather
          than claiming a ranking it does not have. Selectable (it is the default and the
          shipped behaviour) — only its sub-line changes. */
      subNoFigures: "No EDHREC figures on this commander — the list is in collection order.",
    },

    availability: {
      label: "Availability",
      sub: "Free to use first, then the ones already in a deck.",
      /** Availability needs the committed flag, which is slice B (README decision 6b). Until
          that read lands the option is not drawn at all — an option whose ordering key the
          page cannot compute is worse than an absent one, and unlike "Inclusion figure" there
          is no honest reason-line for it that does not describe an unbuilt feature. */
    },

    /** One live-region message per settle, on CoverageSection's OWN aria-live="polite" node.
        R1 said "the region the page already owns" — there is no shared region on this page.
        synergy-selection.tsx:222-243 derives its announcement wholly from pick state and owns
        it; borrowing it would mean a sort announcement competing with a pick announcement in
        one node. One region per section also survives both widths being rendered at once. */
    announce: (label: string) => `Role coverage sorted by ${label.toLowerCase()}`,
  },

  // ── §5.3 The home hero card ───────────────────────────────────────────
  // No copy of its own. The card prints the STORED sentence 1, clamped to two lines by CSS —
  // the full string stays in the DOM and in the accessible name at every width. There is
  // deliberately no shortened variant here: a second string doubles the review surface and
  // guarantees the two drift. See PROSE-one-string-two-surfaces.md.
  home: {
    /** The card's accessible name is unchanged — the paragraph is inside the stretched Link's
        hit area and reads in document order after the name. Listed so the audit can see the
        decision rather than infer it from an absence. */
    cardAria: (name: string) => `${name} \u2014 view commander details`,
  },
} as const;

/** Small numbers read as words in prose and as figures in furniture. `two owned against a
    ten-source baseline` is a sentence; `2 owned` is a label. The threshold is ten, above which
    words stop being shorter. */
function spellOut(v: number): string {
  const words = [
    "zero", "one", "two", "three", "four", "five",
    "six", "seven", "eight", "nine", "ten",
  ];
  return v <= 10 ? words[v] : n(v);
}

// ─────────────────────────────────────────────────────────────────────────
// THE TWO SHIPPED EDITS
//
// detail.tsx:186-191 renders ONE note geometry for both non-ok hero states — the R1 draft
// described two (a 2px --fg-faint rule for absent, a 3px --warning rule for degraded) and drew
// an inline Retry in the hero. Both were wrong: that weight distinction belongs to
// coverage-section.tsx (:344 absent / :372 degraded), and the page's only Retry is
// coverage-section.tsx:411. FitHero has no Retry and does not gain one here.
//
// So the two states differ in their CLAUSE and nothing else. Each note keeps its shipped
// geometry and its first clause; each gains one clause naming the denominator.
//
// The clause goes in the NOTE and not beside the figure on purpose: the hero's score row stays
// a figure, and the explanation lives where the page already explains this state.
//
// Absent's clause is flat. Degraded's ends "until it returns" — one word carrying the whole
// difference between a ceiling that moved and a ceiling that is missing. Recovery is Role
// Coverage's: a successful retry there re-renders the hero at /100.

export const heroNoteEdits = {
  absent: {
    heading: "No synergy data",
    /** WAS: "\u2014 EDHREC doesn't track this commander, so fit comes from pool and roles alone." */
    body: (max: number) =>
      `\u2014 EDHREC doesn't track this commander, so fit comes from pool and roles alone. ${n(max)} is the whole score available here, and every commander in this state is measured the same way.`,
    bodyMobile: (max: number) =>
      `\u2014 EDHREC doesn't track her, so fit is pool and roles alone. ${n(max)} is the whole score here.`,
  },
  degraded: {
    heading: "Synergy data unavailable",
    /** WAS: "\u2014 we couldn't reach EDHREC, so receipts are hidden for now." */
    body: (max: number) =>
      `\u2014 we couldn't reach EDHREC, so receipts are hidden for now. This score is out of ${n(max)} until it returns, and it is not comparable to a commander scored out of 100.`,
    bodyMobile: (max: number) =>
      `\u2014 we couldn't reach EDHREC. This score is out of ${n(max)} until it returns.`,
  },
} as const;
