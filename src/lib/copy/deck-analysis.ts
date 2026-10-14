// The words the deck-analysis surface says about brackets and about its own detection.
//
// TWO PIECES LAND HERE AHEAD OF THE COMPONENTS THAT DRAW THEM, because both carry MEASURED
// facts and the rest of the round's copy does not: the bracket names, which are WotC's and may
// not be paraphrased, and the five detection statements, which quote figures that live in code.
// The verdict block's own strings arrive with the block.
//
// THE DETECTION SENTENCES ARE TEMPLATED ON THE CONSTANTS, NEVER TRANSCRIBED. The handoff's copy
// file says "Between them they name 23 of the 24 cards we would expect" and names ONE miss,
// where `MLD_DETECTION` says **22 of 24** with **two** — `Cataclysm` appears nowhere in the
// drop. A hand-written sentence holding a re-measurable figure has now desynced once BEFORE
// shipping, which is the whole argument for building the sentence from the figure.
//
// The misses slot takes a LIST rather than a name, for the same reason: the previous form could
// only hold one, so the second miss had nowhere to go and the sentence read as complete.

import {
  COMBO_DETECTION,
  EXTRA_TURN_DETECTION,
  MLD_DETECTION,
  TUTOR_DETECTION,
} from "../bracket/rules";
import type { Bracket } from "../bracket/types";

/**
 * The Commander Format Panel's own names, verbatim. Not ours to reword: a player carries a
 * bracket to a pod and says the word out loud, so a synonym here is a different claim there.
 */
export const BRACKET_NAMES: Record<Bracket, string> = {
  1: "Exhibition",
  2: "Core",
  3: "Upgraded",
  4: "Optimized",
  5: "cEDH",
} as const;

/** `Optimized`, or `Optimized or cEDH` — the permitted side, spoken. */
export function bracketPhrase(permits: readonly Bracket[]): string {
  const names = permits.map((b) => BRACKET_NAMES[b]);
  return names.length === 1 ? names[0] : names.join(" or ");
}

/** `4 Optimized` — the numeral and the name, which every verdict face draws together. */
export function bracketFace(bracket: Bracket): string {
  return `${bracket} ${BRACKET_NAMES[bracket]}`;
}

/**
 * "Wave of Vitriol and Cataclysm" — an Oxford-free list, because these are read aloud.
 *
 * Exported because Round 4's copy reaches for it: a helper that is private here is one every
 * other copy module writes again, and two implementations of a joiner drift on the comma.
 */
export function nameList(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * A grouped figure, pinned to `en-US`.
 *
 * NOT the runtime's default locale. These sentences are rendered on the server and hydrated on
 * the client, so a reader whose browser reports a locale that groups with `.` gets a server
 * string reading `9,730` and a client one reading `9.730` — a hydration mismatch inside the one
 * figure the population line exists to carry. Every other copy module here pins it the same way;
 * `card-assignments.ts` and `collection.ts` call the helper `fmt` and `count`.
 */
const fmt = (n: number) => n.toLocaleString("en-US");

const mldMisses = nameList(MLD_DETECTION.knownMisses);

export const deckAnalysisCopy = {
  brackets: BRACKET_NAMES,

  /**
   * The Analysis tab's own frame: the one empty state before a first reading, the date line under
   * the bracket's name, and the announcement when a reading lands (Analysis tab handoff §2, §E).
   *
   * THERE IS NO SYNOPSIS HERE. What a summary may claim belongs to sub-project 6, and until it
   * exists the tab draws no Overview section at all (readiness finding 6): no placeholder
   * sentence, and no control that cannot write.
   *
   * NO RE-ANALYZE ON A CURRENT READING. The handoff offers re-analysis only from the banner a
   * changed deck draws, so a reading on screen carries no control of its own.
   */
  panel: {
    /** The empty state's label, over the ring. */
    overview: "Overview",
    /** The opening loader (§8, 8a), while the stored reading is fetched. Says nothing about it. */
    opening: "Loading\u2026",
    idle: {
      heading: "Five brackets. Your cards pick which.",
      body:
        "One pass over your list against the Commander Format Panel’s rules, and we’ll tell you "
        + "which brackets your cards permit, and which cards put it there.",
      bodyPersist: "The reading is kept with the deck. Edit the list and it waits for you to ask again.",
      /** No cost line: the handoff cut "about two seconds" with the rest of Round 4's t1. */
      cta: "Analyze",
    },
    /**
     * In flight, and the heading is the live region. NO COUNT IN IT: `loadProfileHead` reads
     * whatever `deck_cards` holds, so a brew with twelve cards would be told we were reading all
     * 99. An earlier draft said exactly that.
     */
    loading: {
      heading: "Working out your bracket\u2026",
      body: "Checking your list against each bracket’s rules.",
    },
    /**
     * A first press that also writes the overview, past the bracket and holding for the overview
     * (Hugh, 2026-09-26). /copy-review: the heading matches the slot's `synopsisCopy.writing`,
     * which a slow run hands over to, rather than Hugh's starting "your"; a write takes 17-18s.
     */
    writing: {
      heading: "Writing the overview\u2026",
      body: "Your bracket is in. The overview takes a little longer.",
    },
    /**
     * The profile could not be built. NEVER "something went wrong": a reader who pressed a
     * button is owed what is and is not affected, and the counted figures are unaffected.
     */
    failed: {
      heading: "We couldn’t finish reading this deck.",
      body: "The mix below is counted from your list and is true now. Nothing about your deck changed.",
      cta: "Try again",
    },
    /** `analyzed {when}`: relative under an hour, then the deck page's short date (`18 Sep`). */
    analyzed: (when: string) => `analyzed ${when}`,
    justNow: "a moment ago",
    minutesAgo: (n: number) => `${n} ${n === 1 ? "minute" : "minutes"} ago`,
    /** Spoken once, when a reading settles (§E). */
    settled: (range: string) => `Analysis ready. Your cards permit ${range}.`,
    /** The date line's two other forms (handoff copy `analyzed.committed` / `.stale`). */
    analyzedCommitted: (version: number, date: string) => `analyzed with version ${version} · ${date}`,
    analyzedStale: (date: string) => `analyzed ${date}, before your changes`,
    /**
     * Ruling 1 (Hugh, 2026-09-23): analysis runs only on a whole deck. Undrawn in the handoff;
     * the line sits where the press would, and the press is disabled. Goes to /copy-review.
     */
    illegal: (built: number, size: number) => `Analysis needs a full deck: ${built} of ${size}.`,
  },

  /**
   * The staleness banner (2i, 2d), the one place staleness is said: above the grid, over a held
   * reading that stays whole. The handoff's superseded `stale.*` block is not shipped.
   */
  banner: {
    stale: "Your deck has changes since it was analyzed, so this bracket might not be accurate.",
    reanalyze: "Re-analyze",
    failedHeld: "We couldn’t re-analyze your changes. The bracket below is from before them.",
    tryAgain: "Try again",
  },

  /** The bracket chip in the deck header, which opens the Analysis tab. Spoken only. */
  chip: {
    open: (face: string) => `Bracket: ${face}. Open the analysis`,
  },

  /**
   * The verdict block — the head Round 2 draws, and the chrome rounds 3 and 4 sit inside.
   *
   * NOTHING HERE GRADES. No "fails", no "too many", no "violation": the block prints a bracket
   * and a reason, and a deck past all three limited brackets gets exactly the type, ink and mark
   * a `1 or 2` deck gets. Round 0's reserved violation card is discarded, and this copy is the
   * reason it can be — there is no sentence here that only a violating deck could take.
   */
  verdict: {
    heading: "Your bracket",

    /**
     * The intent sub-lines, for the two ranges.
     *
     * `[1,2]` puts the intent at the BOTTOM of the range and `[4,5]` at the top, which is not a
     * layout note: an exhibition deck is a promise about how it is played, where a cEDH deck is
     * a claim about how hard it is trying. The two sentences say opposite things and neither
     * generalises.
     */
    intentLow:
      "Nothing in the 99 pushes past Core. Which of the two this is, is yours to say: an "
      + "exhibition deck is a promise about how you play it, not a fact about the cards.",
    intentHigh:
      "Bracket 3 only permits up to three game changers. Four and five have no card limits "
      + "between them, so which one this is, is how you play it.",
    /** 390 only. The second clause survives; the middle one is what the narrow column drops. */
    intentHighShort:
      "Bracket 3 only permits up to three game changers. Which of the two this is, is how you "
      + "play it.",

    /**
     * The single-bracket sub-line: what ruled the one below out, then the closing clause.
     *
     * DESIGN SUPPLIES THE FRAME AND ENGINEERING SUPPLIES THE CLAUSE. The package's
     * `singleExact` takes `ruledOut` as a parameter for exactly this reason — the facts are a
     * figure and a limit, both of which live in code.
     */
    ruledOutFact: (have: number, rule: string) => `${numberWord(have)} ${rule}`,
    /**
     * `and Exhibition allows none at all` / `and Upgraded allows only three`.
     *
     * TWO READINGS RATHER THAN ONE TEMPLATE WITH A ZERO IN IT. Every rule that can rule out
     * brackets 1 and 2 caps at zero, so "allows only zero" would be the common case and it is
     * not a sentence anyone says.
     */
    ruledOutAllowance: (bracket: string, limit: number) =>
      limit === 0
        ? `and ${bracket} allows none at all`
        : `and ${bracket} allows only ${numberWord(limit)}`,
    /**
     * The `[4]` reading, which the canvas never drew: nothing at bracket 3 was violated, and
     * what ruled it out is that the deck can ASSEMBLE its combo rather than draw into it.
     */
    ruledOutAssembled: (bracket: string) =>
      `This deck can assemble a two-card infinite rather than draw into it, which is past `
      + `${bracket}`,
    /** The closing clause, on every single-bracket reading. */
    nothingFurther: "Nothing else in the 99 reaches further.",

    /**
     * The nouns the sub-line counts. Singular and plural, because "One game changers" is the
     * shape a naive template produces and it is the first thing a reader notices.
     */
    ruleNouns: {
      gameChangers: ["game changer", "game changers"],
      massLandDenial: ["mass land denial card", "mass land denial cards"],
      extraTurns: ["extra-turn card", "extra-turn cards"],
      twoCardCombos: ["two-card infinite", "two-card infinites"],
    },
  },

  /**
   * "Where you sit, and what moves you" — three rungs, and nothing in them opens.
   *
   * THREE, NOT FIVE, and that is a rule rather than a layout: the brackets a deck is nowhere
   * near are not drawn, which removes the repeated "ruled out" line by construction rather than
   * by editing. It also makes the block SHORTER on a high-bracket deck than a low one, which is
   * the opposite of what the five-rung version did.
   *
   * ONE RULE GOVERNS THE WHOLE TAB: the climb states, the findings open. Every figure here is
   * plain text, and the only thing that moves is `see all brackets`.
   */
  climb: {
    heading: "Where you sit, and what moves you",

    /** The rung labels, in 9px mono above each bracket's name. */
    roleHere: "where your cards are",
    /** 390 only. The rung already names the bracket, so the shorter form loses nothing. */
    roleHereShort: "your cards",
    roleAbove: "already allowed",
    /** The 4-5 rung only, where the one ringed `?` left on the climb sits. */
    roleDeclare: "to claim this",
    /** NEW (addendum F, H34). The declared bracket's rung label, once the range is answered. */
    roleDeclared: "declared",
    /** NEW (addendum F, H34). The other bracket in the answered range. The rung has no body. */
    rolePermitted: "permitted",

    /**
     * What would take you down. NAMES THE CARDS at one or two and the count above that, because
     * a list of nine card names is not a sentence a reader takes in — and it is phrased as a
     * fact about the limit, never as advice. Nothing here tells a player what to play.
     */
    dropNamed: (cards: string, bracket: string) => `Cut ${cards}: ${bracket} allows none.`,
    dropCount: (n: number, rule: string, bracket: string) =>
      `Cut ${numberWord(n)} ${rule}: ${bracket} allows none.`,
    dropCountAllowing: (n: number, rule: string, bracket: string, allowed: number) =>
      `Cut ${numberWord(n)} ${rule}, only ${numberWord(allowed)} allowed at ${bracket}.`,
    /**
     * The same three sentences, split so the thing to CUT carries the emphasis the canvas gives
     * it — the cards or the count in `--fg` at 600, the rest of the clause muted.
     *
     * ONE SOURCE, CHECKED. `deck-analysis.test.ts` asserts each parts list rejoins byte-identical
     * to its flat sentence, for the reason `population.lineParts` is checked the same way: two
     * hand-kept copies of one sentence drift, and the copy guard reads the flat one.
     */
    dropParts: {
      named: (cards: string, bracket: string) => [
        { text: "Cut " },
        { text: cards, strong: true },
        { text: `: ${bracket} allows none.` },
      ] as { text: string; strong?: boolean }[],
      count: (n: number, rule: string, bracket: string) => [
        { text: "Cut " },
        { text: `${numberWord(n)} ${rule}`, strong: true },
        { text: `: ${bracket} allows none.` },
      ] as { text: string; strong?: boolean }[],
      countAllowing: (n: number, rule: string, bracket: string, allowed: number) => [
        { text: "Cut " },
        { text: `${numberWord(n)} ${rule}`, strong: true },
        { text: `, only ${numberWord(allowed)} allowed at ${bracket}.` },
      ] as { text: string; strong?: boolean }[],
    },
    /**
     * A violation removals cannot clear. `upgradePath.blocked` is the flag, and it is a real
     * state: a combo whose only pieces are the two commanders cannot be cut at all.
     */
    dropBlocked: (bracket: string) =>
      `Nothing in the 99 can be cut to reach ${bracket}: what puts this deck past it is in the `
      + `command zone.`,

    aboveAllowed: "Nothing rules it out. It permits more than this deck uses.",
    /**
     * The 4-5 rung. It points at the answer rather than asking: Round 3 moved the ask into the
     * verdict block and retired the ringed `?` that sat here, so there is one ask per surface.
     *
     * No em dash: this repo's shipping strings carry none, and the clause joins on a colon.
     */
    declare:
      "Nothing to change. Four and five share their card limits: the difference is how you play "
      + "it, and the answer is in the block above.",

    /** Beside the figure, in `--fg-faint`. Short on purpose - the rung already names the
     *  bracket, so `3 allowed` cannot mean anything else. */
    allowed: (n: number) => `${n} allowed`,
    /** Where the rule reports a figure without capping it: extra turns at 2 and 3. */
    noCap: "no cap",

    /** The labels beside each figure on the rung that holds. */
    ruleNames: {
      gameChangers: "Game changers",
      massLandDenial: "Mass land denial",
      extraTurns: "Extra turns",
      twoCardCombos: "Two-card infinites",
    },
  },

  /**
   * The population line, in the block's foot under a hairline.
   *
   * NEVER AN INPUT TO THE VERDICT, which the hairline says structurally and the placement says
   * again: feeding what other players declared back into the reading makes it a popularity
   * contest. And the DENOMINATOR IS INSIDE THE SENTENCE, so no layout change can drop it —
   * only about 22.4% of decks declare a bracket at all, and a bare "3,884 decks" reads as a
   * share of every deck rather than of the ones that answered.
   */
  population: {
    label: "What other players say",
    line: (declared: number, commander: string, said: number, name: string) =>
      `Of the ${fmt(declared)} ${commander} decks that declared a bracket, `
      + `${fmt(said)} said ${name}.`,
    /**
     * The same sentence, split so the two figures can carry the emphasis the canvas gives them.
     *
     * ONE SOURCE, CHECKED. `deck-analysis.test.ts` asserts these parts joined are byte-identical
     * to `line` — two hand-kept copies of one sentence drift, and the copy guard reads `line`,
     * so a drifted `lineParts` would be the half nothing looks at.
     */
    lineParts: (
      declared: number,
      commander: string,
      said: number,
      name: string,
    ): { text: string; strong?: boolean }[] => [
      { text: "Of the " },
      { text: fmt(declared), strong: true },
      { text: ` ${commander} decks that declared a bracket, ` },
      { text: fmt(said), strong: true },
      { text: ` said ${name}.` },
    ],
    /** The 27 commanders EDHREC has no declarations for. ABSENT, never zero: a zero reads as
     *  "nobody plays this", which is a different and false claim. */
    absent: (commander: string) => `EDHREC has no declared brackets for ${commander}.`,
  },

  /**
   * "What is in this deck" — five findings, each with its count and its cards.
   *
   * THE FINDINGS OPEN AND THE CLIMB STATES. Every count here that has cards behind it opens the
   * receipt; a zero opens nothing and draws no control, because an affordance onto nothing is
   * worse than none.
   */
  findings: {
    heading: "What is in this deck",
    labels: {
      gameChangers: "Game changers",
      massLandDenial: "Mass land denial",
      extraTurns: "Extra turns",
      twoCardCombos: "Two-card infinites",
      tutors: "Tutors",
    },
    empty: "nothing in the list",
    /** Tutors only. No bracket limits them, and the chip says so where the figure is. */
    noLimit: "no limit",
    /** Never a bare `+3`: the names come first, and the tail says how many are not shown. */
    names: (shown: string[], rest: number) =>
      rest > 0 ? `${shown.join(" · ")} · +${rest}` : shown.join(" · "),
    comboPair: (a: string, b: string) => `${a} + ${b}`,
    /** An arrow, not a caret: it opens a modal, and a caret promises an expand in place. */
    open: (n: number) => (n === 1 ? "see the card" : "see the cards"),
    openCombo: (n: number) => (n === 1 ? "see the combo" : "see the combos"),
    openAria: (n: number, label: string) => `Show the ${n} ${label.toLowerCase()} in this deck`,
  },

  /**
   * The receipt: one modal, two bodies. The header is glyph, name, count and close in both.
   *
   * THE COMBO BODY QUOTES SPELLBOOK and says nothing of its own about whether a line is good.
   * "Assembled in this list" is the whole claim the foot makes: intent is not inferable from a
   * decklist, and the foot must not appear to have answered it.
   */
  receipt: {
    manaNeeded: "Mana needed",
    /** The zero is an ANSWER. 59% of combos need nothing to execute, and a free combo is the
     *  alarming reading — a blank slot would throw it away. */
    manaFree: "No mana needed",
    /** Null upstream, which is rare and is genuinely unknown rather than free. */
    manaUnknown: "Commander Spellbook doesn’t say",
    steps: "Steps",
    /** Spellbook's `notablePrerequisites`, drawn under the steps. Absent on 36% of combos. */
    prerequisites: "Needs",
    assembled: "assembled in this list",
    spellbook: "Commander Spellbook",
    /** Two distinct names, because on a phone both sheets are on screen at once. */
    closeAria: (label: string) => `Close ${label.toLowerCase()}`,
    opened: (n: number, label: string) => `${n} ${label.toLowerCase()} shown.`,
  },

  /**
   * The lean: why a resolved verdict landed where it did, when a combo decided it.
   *
   * Only on a single bracket — `leanFor` returns null on a range — so it never shares the block
   * with the declaration ask. No count of tutors appears here: that clause was deleted in October
   * 2025, and the threshold is the combo's own two halves.
   */
  lean: {
    label: "How we determined this bracket",
    // "This deck can find", not "your tutors": since 2026-09-22 a land-only search is not a
    // tutor, and it still covers a land half (Crop Rotation finds Dark Depths). The finder is
    // named in the reasoning; this sentence says what is found, which is true of either kind.
    // `oneHalf` below already said it this way.
    reachable: (a: string, b: string) =>
      `This deck can find both halves of ${a} + ${b}, so the pair is part of the plan rather `
      + `than a draw away. That is what puts this past ${BRACKET_NAMES[3]}.`,
    /** The same sentence in parts, so the two names can be pressed. Joined, it is `reachable`. */
    reachableParts: (a: string, b: string) =>
      ["This deck can find both halves of ", a, " + ", b,
        `, so the pair is part of the plan rather than a draw away. That is what puts this past ${BRACKET_NAMES[3]}.`],
    drawOnly: (a: string, b: string) =>
      `This deck holds ${a} + ${b}, and nothing in it searches for either half. The pair is a `
      + `draw away, and that is what keeps this at ${BRACKET_NAMES[3]}.`,
    drawOnlyParts: (a: string, b: string) =>
      ["This deck holds ", a, " + ", b,
        `, and nothing in it searches for either half. The pair is a draw away, and that is what keeps this at ${BRACKET_NAMES[3]}.`],
    /**
     * Reachable with a commander half: the command zone covers it, so crediting "your tutors" with
     * both halves would be false. Written here, like the next two; `/copy-review` owns them.
     */
    reachableCommander: (a: string, b: string) =>
      `Your commander is one half of ${a} + ${b}, and this deck can find the other, so the pair `
      + `is part of the plan rather than a draw away. That is what puts this past ${BRACKET_NAMES[3]}.`,
    reachableCommanderParts: (a: string, b: string) =>
      ["Your commander is one half of ", a, " + ", b,
        `, and this deck can find the other, so the pair is part of the plan rather than a draw away. That is what puts this past ${BRACKET_NAMES[3]}.`],
    /** Both halves are commanders — a partner pair — so no tutor is involved at all. */
    reachableZone: (a: string, b: string) =>
      `Both halves of ${a} + ${b} are in your command zone, so the pair is there every game. `
      + `That is what puts this past ${BRACKET_NAMES[3]}.`,
    reachableZoneParts: (a: string, b: string) =>
      ["Both halves of ", a, " + ", b,
        ` are in your command zone, so the pair is there every game. That is what puts this past ${BRACKET_NAMES[3]}.`],
    /**
     * A draw-only lean where ONE half is covered — by a tutor, or by the command zone. `leanFor`
     * reads `drawOnly` whenever coverage is short of every piece, so the handoff's two sentences
     * leave this case saying "nothing searches for either half" over a modal listing the tutor
     * that finds one. Written here; `/copy-review` owns the wording.
     */
    oneHalf: (a: string, b: string) =>
      `This deck can find one half of ${a} + ${b}, and the other is a draw away. That is what `
      + `keeps this at ${BRACKET_NAMES[3]}.`,
    oneHalfParts: (a: string, b: string) =>
      ["This deck can find one half of ", a, " + ", b,
        `, and the other is a draw away. That is what keeps this at ${BRACKET_NAMES[3]}.`],
    open: "see the reasoning",
  },

  /** The receipt modal's third body: the reasoning behind a lean, grouped by the half found. */
  reasoning: {
    /** The number in the heading, because this is the one bracket reference with no mark. */
    title: (n: Bracket) => `How we determined bracket ${n}`,
    qualifierReachable: (n: Bracket) => `${BRACKET_NAMES[n]} · both halves findable`,
    qualifierDrawOnly: (n: Bracket) => `${BRACKET_NAMES[n]} · neither half findable`,
    qualifierOneHalf: (n: Bracket) => `${BRACKET_NAMES[n]} · one half findable`,
    /** Not "2 of 2": a fraction invites a reader to lower a numerator that is not a limit. */
    threshold: (n: Bracket) =>
      `A deck reaches ${BRACKET_NAMES[n]} when it can find every piece of one combo: `
      + "one card that finds both halves, or two that each find a different one.",
    /** After the threshold, where a half is a commander: the zone covers it with no tutor. */
    thresholdCommander: "A commander counts as covered, because it is in the zone every game.",
    piece: (i: number) => `half ${i === 1 ? "one" : "two"} · in this list`,
    /** A commander is in the zone every game, so it is covered with no tutor at all. */
    pieceCommander: (i: number) => `half ${i === 1 ? "one" : "two"} · your commander`,
    foundBy: "found by",
    /** An empty slot reads as a clean deck; this sentence does not. */
    foundByNone: "nothing in this deck searches for it",
    foundByCommandZone: "the command zone, every game",
    tutorsAreNotALimit:
      "The threshold is this combo’s own two halves. How many tutors a deck runs is a fact and "
      + "never a limit. The count is in the findings, with the rest of what is in this deck.",
  },

  /**
   * The two sheets the tab adds (Analysis tab handoff §3). "What would have to go" is
   * `upgradePathCopy.open` sentence-cased, the title when there is no count to put in the header;
   * how we make these decisions takes `provenance.toggle` as its title.
   */
  sheets: {
    upgradePath: "What would have to go",
    closeUpgradePath: "Close what would have to go",
    closeProvenance: "Close how we make these decisions",
  },

  /**
   * "How we make these decisions": an opener and the sheet it opens, read once, mid-argument.
   *
   * The row sentences live in `detection` below; this is the sheet's own frame around them.
   */

  provenance: {
    toggle: "How we make these decisions",
    /**
     * "Work out from your cards", not "by reading your cards": the three rows below it combine
     * Commander Spellbook's index and estimate with our own reading of the rules text, and a lead
     * claiming the reading alone would be contradicted by the rows it introduces.
     */
    lead:
      "Four things decide a bracket. One of them is a published list, so we can be exact. The "
      + "other three we work out from your cards, with Commander Spellbook’s index and our own "
      + "reading of the rules text. Tutors set no limit, but they decide whether a combo is in "
      + "reach, so they are here too. Here is where each answer comes from, and what it might miss.",
    /** The source a row links to, where one exists to link. */
    source: (name: string) => `${name} ↗`,
    /** The published rules, dated, because the rules are a blog post and can move. */
    rulesChecked: (date: string) => `Rules as published, checked ${date}.`,
  },

  /**
   * "How we make these decisions" — four rows, one per rule, and a fifth for tutors (brief §5.5).
   *
   * Game changers carries NO misses line, deliberately: it is the contrast that makes the other
   * four legible. A reader who sees four caveats and one flat statement learns which figure is
   * exact without being told.
   */
  detection: {
    gameChangers: {
      // Scryfall is named because it is what we actually read: its card data carries Wizards'
      // list as a flag on each card (`scryfall/transform.ts`). Brief §5.1, 2026-09-28.
      from: "Wizards publishes the list, and we check your 99 against Scryfall’s copy of it. This count is exact.",
      source: "the Commander Format Panel’s bracket rules",
    },
    landDenial: {
      // NAMED, never counted. The previous form said we read the rules text against
      // "2 community-maintained ones" — built from `MLD_DETECTION.sources`, and false: there is
      // no second list. The two are Spellbook's estimate and our own reading, and saying so is
      // both true and more use to a reader deciding how much to trust the figure.
      from:
        `There is no official list, so we combine ${nameList(MLD_DETECTION.methods)}. ` +
        `Between them they name ${MLD_DETECTION.basis}.`,
      // Guarded on the ASSEMBLED string rather than on the array's length: `knownMisses` is a
      // `const` tuple, so comparing its length to 0 is a comparison TypeScript can prove false
      // and refuses to compile. If the list is ever emptied this reads as null rather than as
      // "We miss , which wreck…".
      misses: mldMisses
        ? `We miss ${mldMisses}, which wreck everyone’s lands without saying so in words we ` +
          `can match.`
        : null,
    },
    extraTurns: {
      from: `We read the rules text: ${EXTRA_TURN_DETECTION.basis}.`,
      // Not measured from a constant, and it is not a coverage figure: a single card looping on
      // itself is a shape the classifier does not attempt, rather than one it attempts and gets
      // wrong. `probe:bracket` pins that the loop clause needs an ASSEMBLED combo.
      misses: "We miss turns made by one card looping on itself, like Nexus of Fate.",
    },
    combos: {
      from: `We use ${COMBO_DETECTION.basis}.`,
      misses:
        "We miss combos needing three or more cards, and ones that only work with a " +
        "particular printing.",
    },
    tutors: {
      // Brief §5.5: the fifth row, in the other rows' form. Its figure is measured
      // (`TUTOR_DETECTION`); the misses line names the set's size because the set shows no miss.
      from: `We read the rules text, and it is ${TUTOR_DETECTION.basis}.`,
      misses:
        `That set is small: we count ${TUTOR_DETECTION.tutors} cards as tutors, and have not ` +
        "checked the rest one by one.",
    },
    why:
      "If someone at the table disagrees with your bracket, the argument is usually about one " +
      "of these five. Knowing which one we are least sure of is how you settle it.",
  },

  /**
   * The all-brackets reference sheet (addendum-brackets-sheet, R3, audited Green in #924). What
   * each bracket allows, our reading of each rule, and ONE quoted Wizards line under it. The
   * cells carry no copy of their own: a count is the bare figure read off the limit constants in
   * `src/lib/bracket/rules.ts`, and a missing limit reads `climb.noCap`. It marks no reader's bracket (R2-A, confirmed by Hugh).
   *
   * THE QUOTES ARE VERBATIM and each names the post that carries it (`sources.ts`). Never edit
   * the text; re-quote from the post. Two begin mid-sentence and open with an ellipsis, never a
   * capital (R2-B; the-99-d9's ruling, 2026-09-24).
   */
  bracketsSheet: {
    /** The table's name for assistive tech, the same on both widths. */
    tableAria: "Cards allowed by bracket",
    open: "see all brackets",
    title: "All brackets",
    close: "Close all brackets",
    lead: "What each bracket allows in a deck, then how we read each rule, with one line of Wizards' own under it.",
    corner: "cards allowed",
    readings: {
      gameChangers: "Counted card by card against Wizards' published Game Changer list.",
      massLandDenial: null,
      extraTurns:
        "At Core and Upgraded the rule is about chaining extra turns, and a decklist cannot show that. We count " +
        "them and give no verdict. Only a two-card combo that loops turns puts a deck past Upgraded.",
      twoCardCombos:
        "Upgraded allows them late in a game. A list cannot show when a combo lands, so we ask whether this deck " +
        "can find both halves rather than draw into them. If it can, that is Optimized.",
    },
    quotes: {
      gameChangers: { text: "Up to three cards from the Game Changers list.", source: "intro" },
      massLandDenial: { text: "\u2026you should not expect to see these cards anywhere in Brackets 1\u20133.", source: "intro" },
      extraTurns: {
        text: "Extra-turn cards should only appear in low quantities and are not intended to be chained in succession or looped.",
        source: "intro",
      },
      twoCardCombos: { text: "No intentional early-game two-card infinite combos.", source: "intro" },
      tutors: { text: "\u2026remove the tutor restrictions from Commander Brackets entirely.", source: "oct25" },
      high: { text: "There are no restrictions (other than the banned list).", source: "intro" },
    },
    quoteTag: { intro: "Wizards \u00b7 Feb 2025", oct25: "Wizards \u00b7 Oct 2025" },
    quotedFrom: "Quoted from",
    sourceMonth: { intro: "Feb 2025", oct25: "Oct 2025" },
    tutors: {
      label: "Tutors",
      reading:
        "Wizards removed the tutor limit in October 2025, finding that tutors are not all alike. We count them in " +
        "the findings. They move no bracket as tutors: a tutor on the Game Changer list counts there, and " +
        "otherwise they only tell us whether a combo can be found rather than drawn.",
    },
    high: {
      name: "Optimized and cEDH",
      reading:
        "No card limits on any of the four. Only the banned list applies, and which of the two a deck is, is how you play it.",
    },
  },
} as const;

/**
 * A small count as a word. "one game changer", not "1 game changer".
 *
 * PROSE, NOT DATA. A figure a reader is meant to weigh stays a numeral — every count on the
 * verdict block does, and its denominator with it. This is for a count inside a SENTENCE,
 * where a digit reads as a field someone forgot to format.
 *
 * It gives up past twelve and hands back the numeral, which is the ordinary typographic line
 * and the point where a word stops being easier to read than a digit.
 */
const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
] as const;

export function numberWord(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}

/**
 * "1st", "2nd", "3rd", "4th" — for "that would be your 4th game changer".
 *
 * US English, which is the app's throughout. The teens are the exception every naive
 * implementation gets wrong: 11, 12 and 13 take `th` despite ending in 1, 2 and 3, and they
 * are reachable here — a deck can hold eleven game changers.
 */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
