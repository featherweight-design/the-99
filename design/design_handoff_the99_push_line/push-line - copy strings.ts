/**
 * The 99 — push line + upgrade path copy, Round 4 of 5.
 *
 * Production-final. Reasoning inline; every rule the strings must not break is quoted where it
 * binds. Destination: `src/lib/copy/bracket-delta.ts` and `src/lib/copy/upgrade-path.ts`.
 *
 * TWO GRAMMARS, ONE RULE. A bracket mark is the mark of MOVEMENT: `moves` and a `counts` that
 * moved render marks; a fact renders none. No string below may imply a limit where there is none,
 * name a card the rules did not force, or reassure a reader that nothing happened.
 */

/** Range naming. Never a slot, never a numeral — the mark carries the number (Round 3 §3). */
export const bracketRange = {
  /** `[1,2]` → "Exhibition or Core"; `[3]` → "Upgraded". One verb per cardinality. */
  name: (brackets: number[]) => brackets.map(bracketName).join(" or "),
};

export const pushLine = {
  /** The one label the slot ever wears, on every surface and every shape. */
  label: "If you add this",

  moves: {
    massLandDenial: (from: string, to: string) =>
      `Moves what your cards permit from ${from} to ${to}. Mass land denial isn't allowed at any bracket that has limits.`,
    /** Bracket 1 is the only bracket that counts extra-turn cards; above it the card is p8. */
    extraTurnsAtOne: (from: string, to: string) =>
      `Moves what your cards permit from ${from} to ${to}. Exhibition is the one bracket that counts extra-turn cards, and it allows none.`,
    /** The combo leads, because the card is only interesting for what it completes. */
    twoCardCombos: (a: string, b: string, from: string, to: string) =>
      `Completes ${a} + ${b}. That moves what your cards permit from ${from} to ${to}.`,
    /** The LOOP clause, not the widening — a completed infinite-turns combo breaks B3 outright. */
    loop: (a: string, b: string, from: string, to: string) =>
      `Completes ${a} + ${b}, which takes infinite turns. That moves what your cards permit from ${from} to ${to}.`,
  },

  /**
   * TWO CLAUSES, COUNT FIRST. The limit is the only thing a player can act on, and `delta.ts`
   * routes a Game Changer here even when it moves for exactly that reason.
   */
  counts: {
    count: (ordinal: string, limit: number) =>
      `That would be your ${ordinal} game changer, and Upgraded allows ${limit}.`,
    /** Omitted entirely when the range did not move. Nothing replaces it. */
    moved: (from: string, to: string) =>
      `It moves what your cards permit from ${from} to ${to}.`,
    /** Only when `combos` is non-empty. A third line, in --fact, not a clause. */
    alsoLabel: "Combo changes",
    alsoCombo: (a: string, b: string) => `Completes ${a} + ${b}.`,
  },

  /** Reported and refused a score. May not imply a ceiling in either direction. */
  unquantified: {
    label: "Reported, not scored",
    line: (ordinal: string, bracket: string) =>
      `Your ${ordinal} extra-turn card. ${bracket}'s rule is about chaining them, and a decklist can't show that — so we count them and stop there. Your bracket doesn't move.`,
  },

  /**
   * Tutors. NO TUTOR GATE — and since 2026-09-20 no sentence may say tutors don't matter, because
   * coverage decides the 3-vs-4 boundary. The reconciliation is the final clause: no limit, real
   * consequence, stated as coverage rather than as a count.
   */
  ruleless: {
    label: "A fact, not a limit",
    line: (ordinal: string) =>
      `Your ${ordinal} tutor. No bracket limits how many you play. Tutors reach your bracket only when they can find every piece of a combo this deck already holds — and yours can't, yet.`,
  },

  /**
   * THE SENTENCE THIS ROUND OWED. A completed combo that moves nothing. Two clauses: the event,
   * then why the verdict is unmoved. Never "this pushes you", never a mark.
   */
  inert: {
    label: "A combo, and no change",
    atTop: (a: string, b: string) =>
      `This completes ${a} + ${b}, a two-card infinite. It doesn't change your bracket — this deck already permits Optimized or cEDH, and there is no lower bracket left for it to rule out.`,
    noCoverage: (a: string, b: string) =>
      `This completes ${a} + ${b}, a two-card infinite. It doesn't change your bracket — nothing in this deck searches for either half, so Upgraded still permits it as a late-game finish.`,
  },

  /** `kind: "none"` has no string, by ruling. The absence is the design. */
  none: null,

  /**
   * Tile density — a separate string per shape, never a truncation of the sentence. Three words.
   */
  tile: {
    moves: "moves your bracket",
    counts: (ordinal: string) => `your ${ordinal} game changer`,
    unquantified: "reported, not scored",
    ruleless: "a fact, not a limit",
    inert: "completes a combo",
  },
};

export const upgradePath = {
  /** On the climb's lower rung. */
  open: "what would have to go",
  /** The climb's lower-rung caption, Round 2's wording updated with this round's disclosure. */
  rungLabel: "To downgrade your deck",
  heading: (bracket: string, n: number) =>
    `${bracket} — ${n === 1 ? "one thing" : `${numberWord(n)} things`} would have to go`,
  targetLabel: "Target",

  /**
   * CARDINALITY PICKS THE PHRASING, AND THE APP NEVER PICKS A CARD. "any N of these M" while
   * M > N; the cards are NAMED when M === N, because "any 1 of these 1" dresses a certainty as a
   * choice — and naming a forced card is the rules choosing, not us.
   */
  countRule: {
    gameChangers: (limit: number, have: number) =>
      `Upgraded allows ${limit}, and you have ${have}.`,
    massLandDenial: "Upgraded allows none.",
    extraTurns: "Exhibition allows none.",
    anyOf: (removeCount: number, candidateCount: number) =>
      `Any ${removeCount} of these ${candidateCount} would do it.`,
    forced: (names: string[]) =>
      `${joinNames(names)} would have to go.`,
  },

  /** The combo item states the requirement at the COMBO's cardinality, and never says "remove". */
  comboRule: {
    assembled: "Your tutors can assemble this one, which is what puts the deck past Upgraded.",
    forbidden: (bracket: string) => `${bracket} doesn't allow two-card combos at all.`,
    either: "Either half breaks it.",
  },

  /** Said once, in the foot — cheaper than de-duplicating items, which would hide a rule. */
  overlap: (n: number) =>
    `${numberWord(n)} of these are also the combo, so cutting one can answer both lines at once.`,
  yours: "Which cards go is yours — this is what the bracket asks for, not a recommendation.",
  toDecklist: "open your decklist →",

  /** `items: []`. Hands the reader to the declaration, the only thing left that can answer it. */
  satisfied: (bracket: string, range: string) =>
    `Nothing would have to go. Your cards already sit inside ${bracket} — whether this deck is ${range} is yours to say.`,

  /**
   * `blocked`. Plain, no --danger, no warning glyph, and never "impossible" or "sorry". The
   * commander is drawn IN the candidate list on a dashed edge, labelled, so the shortfall is
   * visible rather than described.
   */
  blocked: {
    commanderTag: "your commander",
    heading: (bracket: string) => `${bracket} — not reachable by removing cards`,
    countShortfall: (bracket: string) =>
      `The rest is your commander, and a commander can't be cut. Removing the others still leaves one, so ${bracket} isn't reachable by removing cards — it would take a different commander.`,
    comboShortfall: (bracket: string) =>
      `Both halves of this combo are in your command zone, so no removal breaks it. ${bracket} isn't reachable by removing cards — it would take a different commander.`,
    nearest: (bracket: string, n: number) =>
      `${bracket} is reachable — ${numberWord(n)} ${n === 1 ? "card" : "cards"} would have to go.`,
  },
};

/**
 * WITHDRAWN, with reasons — kept so no one re-proposes them.
 *
 * · "This won't change your bracket."            — the reassurance on `none`. Printed on 38 rows it
 *                                                  teaches a reader to ignore the slot.
 * · "You may be pushing it."                     — scoring extra turns after refusing to score them.
 * · "Tutors don't affect your bracket."          — false since 2026-09-20; coverage decides 3-vs-4.
 * · "Your 4th game changer of 3 allowed moves…"  — one line, four figures, and a fraction a reader
 *                                                  will try to satisfy.
 * · "Remove Cyclonic Rift to reach Upgraded."    — one of five equally valid answers as THE answer.
 * · "You're 2 cards away from Upgraded."         — a distance implies a direction the player agreed
 *                                                  to travel. The path answers; it never volunteers.
 * · "See how this changes your analysis →"       — a link to a tab that still reads the deck
 *                                                  WITHOUT this card.
 * · "Added — your bracket moved to Optimized."   — the push line surviving its own add.
 */
