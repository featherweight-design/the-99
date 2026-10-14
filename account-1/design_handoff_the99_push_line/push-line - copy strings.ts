/**
 * The 99 — push line + upgrade path copy, Round 4 of 5 (R2, revised against the R1 audit).
 *
 * Production-final. Reasoning inline; every rule the strings must not break is quoted where it
 * binds. Destination: `src/lib/copy/bracket-delta.ts` and `src/lib/copy/upgrade-path.ts`.
 *
 * Imports `bracketPhrase` and `nameList` rather than re-declaring them (audit, resolved).
 * No em dashes in any shipping string (audit, resolved) — clauses join on a colon or a comma.
 *
 * TWO GRAMMARS, ONE RULE. A bracket mark is the mark of MOVEMENT: `moves` and a `counts` that
 * moved render marks; a fact renders none. No string below may imply a limit where there is none,
 * name a card the rules did not force, quote a rule the binding bracket does not have, or
 * reassure a reader that nothing happened.
 *
 * PRECEDENCE: moves, counts, inert, ruleless, unquantified, none.
 * The rule underneath it: AN EVENT OUTRANKS A STANDING COUNT.
 */

import { bracketPhrase, nameList, numberWord, ordinal } from "@/lib/copy/shared";

export const pushLine = {
  /** The one label the slot ever wears, on every surface and every shape. */
  label: "If you add this",

  moves: {
    massLandDenial: (from: string, to: string) =>
      `Moves what your cards permit from ${from} to ${to}. Mass land denial isn't allowed at any bracket that has limits.`,
    /** Bracket 1 is the only bracket that counts extra-turn cards. */
    extraTurnsAtOne: (from: string, to: string) =>
      `Moves what your cards permit from ${from} to ${to}. Exhibition is the one bracket that counts extra-turn cards, and it allows none.`,
    twoCardCombos: (a: string, b: string, from: string, to: string) =>
      `Completes ${a} + ${b}. That moves what your cards permit from ${from} to ${to}.`,
    /** The LOOP clause, not the widening: a completed infinite-turns combo breaks B3 outright. */
    loop: (a: string, b: string, from: string, to: string) =>
      `Completes ${a} + ${b}, which takes infinite turns. That moves what your cards permit from ${from} to ${to}.`,
  },

  /**
   * TWO CLAUSES, COUNT FIRST, AND THE COUNT NAMES THE BRACKET THAT BIT.
   *
   * AUDIT 6. The limit was always Upgraded's 3, so a deck losing Exhibition on its first Game
   * Changer was told a true fact about the wrong bracket. `bindingBracket` is the lowest bracket
   * in `from` whose limit the new count breaks; when nothing moves it is the lowest bracket in
   * the deck's current reading, whose limit the count is approaching.
   */
  counts: {
    count: (n: { ordinal: string; bindingBracket: number; limit: number }) =>
      n.limit === 0
        ? `That would be your ${n.ordinal} game changer, and ${bracketPhrase(n.bindingBracket)} allows none.`
        : `That would be your ${n.ordinal} game changer, and ${bracketPhrase(n.bindingBracket)} allows ${n.limit}.`,
    /** Omitted entirely when the range did not move. Nothing replaces it. */
    moved: (from: string, to: string) =>
      `It moves what your cards permit from ${from} to ${to}.`,
    /** Only when `combos` is non-empty. A third line, in --fact, not a clause. */
    alsoLabel: "Combo changes",
    alsoCombo: (a: string, b: string) => `Completes ${a} + ${b}.`,
  },

  /**
   * Reported and refused a score. AUDIT 5: form A quoted a chaining rule, and brackets 4 and 5
   * state none, so a [4,5] deck was told about a rule that does not exist. Branch on to[0] >= 4.
   */
  unquantified: {
    label: "Reported, not scored",
    /** Binding bracket 2 or 3: a chaining rule exists and can be named. */
    chainingRule: (n: string, bracket: number) =>
      `Your ${n} extra-turn card. ${bracketPhrase(bracket)}'s rule is about chaining them, and a decklist can't show that, so we count them and stop there. Your bracket doesn't move.`,
    /** Binding bracket 4 or 5: no rule to name. Closing clause identical, by design. */
    noRule: (n: string) =>
      `Your ${n} extra-turn card. Neither Optimized nor cEDH has a rule about extra turns, so we count them and stop there. Your bracket doesn't move.`,
  },

  /**
   * Tutors. NO TUTOR GATE, and since 2026-09-20 no sentence may say tutors don't matter, because
   * coverage decides the 3-vs-4 boundary.
   *
   * AUDIT 4: form A asserted an absence that is present whenever the deck already assembles. Any
   * tutor added to a deck reading [4] or [4,5] returns `ruleless` unchanged, and "yours can't,
   * yet" was false there. Dropping the clause was the other option and is worse: it would say
   * nothing about the one way tutors DO reach a bracket.
   */
  ruleless: {
    label: "A fact, not a limit",
    noCoverage: (n: string) =>
      `Your ${n} tutor. No bracket limits how many you play. Tutors reach your bracket only when they can find every piece of a combo this deck already holds, and yours can't, yet.`,
    coverage: (n: string) =>
      `Your ${n} tutor. No bracket limits how many you play. What your tutors can already find is counted in this deck's bracket, and one more doesn't add to it.`,
  },

  /**
   * THE SENTENCE THIS ROUND OWED, and it now OUTRANKS `ruleless` (audit 3).
   *
   * The canonical combo piece is a tutor — Demonic Consultation with Thassa's Oracle — so the old
   * order returned the tutor sentence on the exact add this round exists to speak for. A tutor
   * count is a standing fact the findings block already reports; a combo completing is an event,
   * and it happens once.
   *
   * Three second-clauses (audit 2). Never "this pushes you", never a bracket mark.
   */
  inert: {
    label: "A combo, and no change",
    /** to === [4,5]. */
    atTop: (a: string, b: string) =>
      `This completes ${a} + ${b}, a two-card infinite. It doesn't change your bracket: this deck already permits Optimized or cEDH, and there's no lower bracket left for it to rule out.`,
    /** to === [3]: the deck cannot search for either half. */
    noCoverage: (a: string, b: string) =>
      `This completes ${a} + ${b}, a two-card infinite. It doesn't change your bracket: nothing in this deck searches for either half, so Upgraded still permits it as a late-game finish.`,
    /**
     * to === [4]: an existing combo is already assembled, and it is what holds the ceiling.
     * Both other clauses are FALSE here — one claims a [4,5] reading, the other claims Upgraded
     * still permits the deck, which is exactly the bracket it has already left.
     */
    alreadyAssembled: (a: string, b: string) =>
      `This completes ${a} + ${b}, a two-card infinite. It doesn't change your bracket: a combo you can already assemble is what sets this deck's bracket, and one you can't assemble doesn't add to it.`,
  },

  /** `kind: "none"` has no string, by ruling. The absence is the design. */
  none: null,

  /** Tile density: a separate string per shape, never a truncation of the sentence. */
  tile: {
    moves: "moves your bracket",
    counts: (n: string) => `your ${n} game changer`,
    unquantified: "reported, not scored",
    ruleless: "a fact, not a limit",
    inert: "completes a combo",
  },
};

export const upgradePath = {
  /** Round 2's climb lower-rung caption, and the disclosure that opens from it. */
  rungLabel: "To downgrade your deck",
  open: "what would have to go",
  heading: (bracket: number, n: number) =>
    `${bracketPhrase(bracket)}, ${n === 1 ? "one thing" : `${numberWord(n)} things`} would have to go`,
  targetLabel: "Target",

  /**
   * CARDINALITY PICKS THE PHRASING, AND THE APP NEVER PICKS A CARD. "any N of these M" while
   * M > N; the cards are NAMED when M === N, because "any 1 of these 1" dresses a certainty as a
   * choice, and naming a forced card is the rules choosing, not us.
   */
  countRule: {
    limit: (bracket: number, limit: number, have: number) =>
      limit === 0
        ? `${bracketPhrase(bracket)} allows none, and you have ${have}.`
        : `${bracketPhrase(bracket)} allows ${limit}, and you have ${have}.`,
    anyOf: (removeCount: number, candidateCount: number) =>
      `Any ${removeCount} of these ${candidateCount} would do it.`,
    forced: (names: string[]) => `${nameList(names)} would have to go.`,
  },

  /** The combo item states the requirement at the COMBO's cardinality, and never says "remove". */
  comboRule: {
    assembled: (bracket: number) =>
      `Your tutors can assemble this one, which is what puts the deck past ${bracketPhrase(bracket)}.`,
    forbidden: (bracket: number) =>
      `${bracketPhrase(bracket)} doesn't allow two-card combos at all.`,
    either: "Either half breaks it.",
  },

  /** Said once, in the foot. Cheaper than de-duplicating items, which would hide a rule. */
  overlap: (n: number) =>
    `${numberWord(n)} of these are also the combo, so cutting one can answer both lines at once.`,
  yours: "Which cards go is yours. This is what the bracket asks for, not a recommendation.",
  toDecklist: "open your decklist",

  /** `items: []`. Hands the reader to the declaration, the only thing left that can answer it. */
  satisfied: (bracket: number, range: string) =>
    `Nothing would have to go. Your cards already sit inside ${bracketPhrase(bracket)}. Whether this deck is ${range} is yours to say.`,

  /** `blocked`. Plain: no --danger, no warning glyph, never "impossible" or "sorry". */
  blocked: {
    commanderTag: "your commander",
    heading: (bracket: number) =>
      `${bracketPhrase(bracket)}, not reachable by removing cards`,
    countShortfall: (bracket: number) =>
      `The rest is your commander, and a commander can't be cut. Removing the others still leaves one, so ${bracketPhrase(bracket)} isn't reachable by removing cards. It would take a different commander.`,
    comboShortfall: (bracket: number) =>
      `Both halves of this combo are in your command zone, so no removal breaks it. ${bracketPhrase(bracket)} isn't reachable by removing cards. It would take a different commander.`,
    nearest: (bracket: number, n: number) =>
      `${bracketPhrase(bracket)} is reachable, ${numberWord(n)} ${n === 1 ? "card" : "cards"} would have to go.`,
  },
};

/**
 * WITHDRAWN, with reasons, so no one re-proposes them.
 *
 * · "This won't change your bracket."            — the reassurance on `none`. On hundreds of rows
 *                                                  it teaches a reader to ignore the slot.
 * · "You may be pushing it."                     — scoring extra turns after refusing to score them.
 * · "Upgraded's rule is about chaining them"     — at bracket 4 or 5. No such rule exists up there.
 *   on a [4,5] deck
 * · "Tutors don't affect your bracket."          — false since 2026-09-20; coverage decides 3-vs-4.
 * · "and yours can't, yet" on a [4] deck         — asserts an absence that is present.
 * · "Upgraded allows 3" on a bracket-1 deck      — the right figure for the wrong bracket.
 * · "Your 4th game changer of 3 allowed moves…"  — one line, four figures, and a fraction a reader
 *                                                  will try to satisfy.
 * · The tutor sentence on a combo completion     — the silence this round exists to close, put back
 *                                                  by a precedence order.
 * · "Remove Cyclonic Rift to reach Upgraded."    — one of five equally valid answers as THE answer.
 * · "You're 2 cards away from Upgraded."         — a distance implies a direction the player agreed
 *                                                  to travel.
 * · "See how this changes your analysis"         — a link to a tab that still reads the deck
 *                                                  WITHOUT this card.
 * · "Added — your bracket moved to Optimized."   — the push line surviving its own add.
 */
