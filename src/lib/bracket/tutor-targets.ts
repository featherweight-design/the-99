/**
 * What a tutor can find, read off its oracle text.
 *
 * This exists for ONE question: can a deck assemble a combo it does not already hold in one
 * piece? A tutor that finds a combo piece shortens that path, and the bracket surfaces report
 * the reach as a FACT — no bracket rule counts tutors, and none should start to here.
 *
 * MEASURED against the live catalog on 2026-09-20 before any of it was believed. 960
 * commander-legal cards match the search clause across 490 distinct target phrasings, and
 * four decisions came out of reading them rather than out of the plan:
 *
 * 1. **The hate cards are excluded by CONSTRUCTION, not by a negation rule.** The plan asked
 *    for a `can't search` negation checked first. Zero of the 960 contain that phrase —
 *    `Stranglehold`, `Leonin Arbiter`, `Aven Mindcensor` and `Opposition Agent` all say
 *    "can't search libraries" or "would search a library" and never "search your library
 *    for", so they fail the clause before any negation could fire. The tests pin all four as
 *    regression anchors; the rule the plan wanted would have been dead code.
 *
 * 2. **The sentence is the scope, never the card.** 79 of the 960 mention an opponent, and
 *    for most that word is in a DIFFERENT sentence — `Ranger-Captain of Eos` tutors for
 *    itself and denies opponents in the next line. Matching on the card would drop 65 real
 *    tutors; matching on the sentence drops the 14 that genuinely say "each opponent may
 *    search".
 *
 * 3. **380 of the 960 are basic-land ramp.** They are the dominant family by a distance, they
 *    reach no combo piece, and they are flagged rather than dropped so a reader asking why a
 *    reach is absent gets an answer.
 *
 * 4. **A graveyard destination does not reach.** 16 cards put the found card in a graveyard
 *    (`Entomb`, `Unmarked Grave`). That assembles nothing on its own — the reanimation is a
 *    second card, and counting it would claim a two-card combo is one tutor away when it is
 *    two. Top of library DOES reach (`Vampiric Tutor`, `Worldly Tutor`): the card is drawn
 *    next turn with no further help.
 *
 5. **A SUBTYPE IS KEPT AS ITSELF, and that closed an under-claim rather than documenting
 *    one.** The first version resolved the target against a fixed list of card types, so
 *    `an equipment card` and `a goblin card` named nothing it knew and parsed as reaching
 *    nothing: **253 of the 960**, a quarter of the corpus, written off in a header comment.
 *    Keeping the word and testing it against the piece's TYPE LINE costs ten lines and needs
 *    no subtype table, because a type line already carries its subtypes. That figure is now
 *    **0**, and the land-subtype half still reaches no combo piece for the right reason:
 *    `Balamb T-Rexaur` searches for a `forest card`, `Dark Depths` has no Forest type, and
 *    the type-line test refuses it where a missing-word rule refused everything.
 *
 * ONE DELIBERATE OVER-CLAIM: **an exact mana value is read as a ceiling.** `Tribute Mage`
 * says "mana value 2" and is stored as `maxManaValue: 2`, so it is credited with reaching a
 * one-drop it cannot find. Kept because the alternative is a second field every consumer has
 * to remember, and 44 of the 960 carry a mana-value clause the parser reads at all.
 *
 * `colors` tests against a piece's COLOUR IDENTITY rather than its cast cost, which over-
 * claims in the same small way: `Green Sun's Zenith` is credited with finding a creature
 * whose green is only in an activation cost.
 */

/**
 * One acceptable word set. `permanent` expands to the six permanent types, so a single
 * written word can admit several — everything else is a list of one.
 */
export type TutorConstraint = string[];

/**
 * One alternative: EVERY constraint in it must match the piece's type line.
 *
 * `a legendary creature card` is one alternative of two constraints, and both have to hold.
 * `an artifact or enchantment card` is two alternatives of one constraint each. Collapsing
 * the two into a flat list and matching with `some` made the first behave like the second —
 * so a legendary-creature tutor reached any legendary LAND, and any non-legendary creature,
 * and the [3,4] lean reported `reachable` on combos it cannot find. 146 of the 960 tutors
 * carry more than one word, and the sample holds both shapes side by side.
 */
export type TutorAlternative = TutorConstraint[];

export type TutorTarget = {
  /** `"any"` is a genuinely untargeted search. Otherwise alternatives of constraints, tested
   *  against the piece's TYPE LINE — card types and subtypes alike, which is why no subtype
   *  table is needed and `a goblin card` finds a Goblin. */
  kinds: "any" | TutorAlternative[];
  /** Null when the search names no colour. */
  colors: string[] | null;
  maxManaValue: number | null;
  basicOnly: boolean;
};

export type TutorPiece = { typeLine: string; colorIdentity: string[]; cmc: number };

/** The main card types a target phrase can name. `permanent` is the only one that expands:
 *  a "rebel permanent card" is a common phrasing that names no single type. Every other word
 *  is tested against the piece's type line as itself. */
const KINDS: Record<string, string[]> = {
  creature: ["creature"],
  artifact: ["artifact"],
  enchantment: ["enchantment"],
  instant: ["instant"],
  sorcery: ["sorcery"],
  land: ["land"],
  planeswalker: ["planeswalker"],
  battle: ["battle"],
  permanent: ["creature", "artifact", "enchantment", "land", "planeswalker", "battle"],
};

const COLOR_WORDS: Record<string, string> = {
  white: "W", blue: "U", black: "B", red: "R", green: "G",
};

const CLAUSE = /search(?:es)? (?:your|their) library for ([^.;]{1,160})/i;

/** Sentence-scoped, for the reason in the header. Oracle text uses `.` and newlines; a
 *  reminder-text parenthetical never carries the clause, so it needs no special case. */
function clauseSentence(text: string): string | null {
  for (const sentence of text.split(/(?<=\.)\s+|\n+/)) {
    if (CLAUSE.test(sentence)) return sentence;
  }
  return null;
}

/**
 * The words naming what is searched for — everything between `for` and the first `card`,
 * with the quantity, the article, the colour and `basic` removed.
 *
 * Null means the phrase named nothing at all (`a card`, `any card`, `a card with the same
 * name as that card`), which is a genuinely untargeted search.
 *
 * A word that is not a card type is kept AS ITSELF rather than dropped, because `tutorReaches`
 * tests against the piece's type line and a type line carries its subtypes: `a goblin card`
 * finds a Goblin without this file knowing what a Goblin is. That is what closed the
 * under-claim an earlier draft documented and kept — it reported 253 of 960 cards as
 * reaching nothing, and about half of those were creature- and artifact-subtype tutors that
 * plainly do reach. The land-subtype half (`a forest card`, 84 cards) still reaches no combo
 * piece, and now for the RIGHT reason: `Dark Depths` has no Forest type, so the type-line
 * test refuses it rather than a missing-word rule refusing everything.
 */
function targetWords(target: string): TutorAlternative[] | null {
  const head = /^(.*?)\bcards?\b/.exec(target);
  if (!head) return null;

  // ALTERNATIVES first, then the words within each. `a Forest, Island, or Mountain card` is
  // three alternatives; `a Rebel permanent card` is one alternative of two constraints.
  // `snow` and `nonbasic` are NOT noise. `snow` is a real supertype — it is in 114 type
  // lines — so dropping it turned `a snow land card` into an unrestricted land target that
  // reached any land; 3 of the 960 say that. `nonbasic` is a NEGATION no type line spells, so
  // keeping it as a constraint makes such a tutor reach nothing: an under-claim, which is the
  // safe direction, and it costs nothing today because ZERO of the 960 targets use the word.
  //
  // `basic` stays out because `basicOnly` already gates reach to false for those.
  const noise =
    /^(a|an|any|the|up|to|two|three|four|five|many|number|of|basic|other|another|\d+)$/;
  const alternatives = head[1]
    .split(/\s+or\s+|\s+and\/or\s+|,/)
    .map((part) =>
      part
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 2 && !noise.test(w) && !(w in COLOR_WORDS))
        .map((w): TutorConstraint => KINDS[w] ?? [w]),
    )
    .filter((alt) => alt.length > 0);

  return alternatives.length > 0 ? alternatives : null;
}

/**
 * The mana-value ceiling, or null for no constraint.
 *
 * Every phrasing below was counted on the live catalog, and two of the three refusals were
 * bought by that count rather than by reading the code:
 *
 * - **`N or greater`, 3 cards** (`Fierce Empath`: "creature card with mana value 6 or
 *   greater"). A bare `mana value (\d+)` reads this as a CEILING of 6 — exactly inverted, so
 *   the tutor is credited with finding a two-drop it cannot and refused the six-drop it can.
 *   There is no floor field and there should not be one for three cards; unconstrained is
 *   the honest reading.
 * - **`equal to N plus …`, 9 cards** (`Birthing Pod`, `Neoform`, `Pyre of Heroes`). The digit
 *   is an OFFSET, not a bound, and a ceiling of 1 refuses everything these cards find. It
 *   needs no guard of its own — the digit does not directly follow `mana value`, so the
 *   exact-value regex never reaches it — and that is an ACCIDENT of adjacency rather than a
 *   decision, which is why the test stays. A later loosening of that regex breaks these nine
 *   cards silently, and the test is the only thing that would say so. A guard was written
 *   here first and removed once the run showed it firing on nothing.
 * - **`X or less`, 14 cards.** X is not a number; `Green Sun's Zenith` really does find any
 *   green creature for enough mana.
 *
 * What is left — `N or less` (33) and a bare exact `N` (7) — is the documented over-claim:
 * both become a ceiling, so `Tribute Mage` is credited with reaching a one-drop.
 */
function ceilingFrom(target: string): number | null {
  if (/mana value \d+ or (?:greater|more)/.test(target)) return null;
  const capped = /mana value (\d+) or less/.exec(target);
  if (capped) return Number(capped[1]);
  const exact = /mana value (\d+)\b/.exec(target);
  return exact ? Number(exact[1]) : null;
}

export function classifyTutor(oracleText: string | null): TutorTarget | null {
  if (!oracleText) return null;
  const sentence = clauseSentence(oracleText);
  if (!sentence) return null;

  const lower = sentence.toLowerCase();
  // The 14 "each opponent may search" cards. The deck does not get to choose what they find.
  if (/opponent/.test(lower)) return null;
  // A graveyard destination assembles nothing on its own.
  if (/into (?:your|their|his or her) graveyard/.test(lower)) return null;

  const target = CLAUSE.exec(sentence)![1].toLowerCase();

  const basicOnly = /\bbasic\b/.test(target);

  const colors = Object.entries(COLOR_WORDS)
    .filter(([word]) => new RegExp(`\\b${word}\\b`).test(target))
    .map(([, letter]) => letter);

  const maxManaValue = ceilingFrom(target);

  const kinds = targetWords(target) ?? "any";
  return { kinds, colors: colors.length > 0 ? colors : null, maxManaValue, basicOnly };
}

/**
 * Whether a tutor can find a given card.
 *
 * A basic-land tutor reaches nothing: no basic land is a two-card combo piece, and a
 * NONBASIC one a land tutor can find (`Dark Depths` via `Crop Rotation`) is not basic.
 */
export function tutorReaches(target: TutorTarget, piece: TutorPiece): boolean {
  if (target.basicOnly) return false;
  if (target.maxManaValue != null && piece.cmc > target.maxManaValue) return false;

  if (target.colors != null) {
    const identity = new Set(piece.colorIdentity.map((c) => c.toUpperCase()));
    // Every named colour must be on the piece: "a green creature card" is not satisfied by a
    // blue one, and "a white or blue card" is a phrasing this parser reads as both, which is
    // the conservative reading.
    if (!target.colors.every((c) => identity.has(c))) return false;
  }

  if (target.kinds === "any") return true;
  const types = piece.typeLine.toLowerCase();
  // SOME alternative, EVERY constraint within it. The two quantifiers are the whole rule.
  return target.kinds.some((alternative) =>
    alternative.every((constraint) => constraint.some((word) => types.includes(word))),
  );
}
