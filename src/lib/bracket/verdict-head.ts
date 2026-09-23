import { BRACKET_NAMES, nameList } from "../copy/deck-analysis";
import type { Bracket, RuleId } from "./types";

/**
 * What the verdict block's head draws, from the permitted range alone.
 *
 * PURE, AND SEPARATE FROM THE COMPONENT, because every one of these readings is a rule rather
 * than a layout: which face, whether a split chip is drawn, and in which bracket's ink. A component test renders one of them at a time and cannot say the set
 * is complete; this can.
 */
export type VerdictHead = {
  /** `Exhibition or Core`, or `Optimized` — never a numeral, which the mark beside it draws. */
  face: string;
  /** A range is two brackets the RULES hand to the player, so the chip says so. */
  split: boolean;
  /**
   * The bracket the pill is drawn for: its only mark, or its lower one on a range, whose ink
   * the border and the label take.
   *
   * On an ANSWERED range it is the answer. Round 3: answering resolves the face — the split
   * pill becomes the declared bracket's own chip and the title becomes that bracket, while the
   * permitted range moves into the description line rather than disappearing.
   */
  chip: Bracket;
};

/**
 * `permitsFor` returns `[1,2] | [2] | [3] | [4] | [4,5]`. Exactly two of those five are ranges,
 * and the 3-vs-4 boundary resolves rather than splitting — ruled 2026-09-20, which is why
 * `[3,4]` is unreachable and the package's row for it is marked "not drawn".
 */
/**
 * THE EXACT FIVE, not a length test.
 *
 * A length check accepts `[1, 3]`, `[2, 5]` and `[5, 4]` — none of which `permitsFor` can
 * return, and each of which renders a confident face for a range nobody permitted: "Exhibition
 * or Upgraded", and for the reversed pair a face whose two names are the wrong way round with
 * the glyph inked from the HIGHER bracket. A fabricated answer is worse than an empty one
 * because it looks like an answer, and this function is the runtime boundary for hand-built
 * data.
 */
const REACHABLE = new Set(["1,2", "2", "3", "4", "4,5"]);

/**
 * Whether a range is one `permitsFor` can return, the only shapes `verdictHead` reads.
 *
 * For a reader of STORED permits: the column's check admits `[1,3]` or `[5,4]`, which no writer
 * produces and `verdictHead` refuses by throwing. A chip over such a row fails closed, drawing
 * nothing, rather than taking the page down.
 */
export function isReachablePermits(permits: readonly number[]): permits is Bracket[] {
  return REACHABLE.has(permits.join(","));
}

export function verdictHead(
  permits: readonly Bracket[],
  /**
   * The player's answer, passed ONLY when `declarationAsk` read it as answered — inside a
   * range. Anything else is a caller holding a second copy of that rule, and fails closed.
   */
  answered: Bracket | null = null,
): VerdictHead {
  const [low, high] = [permits[0], permits[permits.length - 1]];
  // ONE OR TWO, AND NOTHING ELSE. `permitsFor` returns only those shapes, so anything else was
  // hand-built by a caller — and the failure is not loud on its own: reading `[0]` and `[-1]`
  // off `[1, 2, 3]` silently discards the interior and renders "Exhibition or Upgraded", a face
  // that names a range nobody permitted. An empty one renders the empty string beside a mark
  // drawing nothing. Both fail closed.
  if (!REACHABLE.has(permits.join(","))) {
    throw new Error(
      `verdictHead: [${permits.join(", ")}] is not a range permitsFor can return — it has no `
      + `reading`,
    );
  }
  if (answered !== null) {
    // A single bracket is not a question, and an answer outside the range is drift, which
    // keeps the range's own face. Neither resolves anything.
    if (permits.length === 1 || !permits.includes(answered)) {
      throw new Error(
        `verdictHead: ${answered} does not answer [${permits.join(", ")}] — only a declaration `
        + `inside a range resolves the face`,
      );
    }
    return { face: BRACKET_NAMES[answered], split: false, chip: answered };
  }
  if (permits.length === 1) {
    return { face: BRACKET_NAMES[low], split: false, chip: low };
  }
  return {
    face: `${BRACKET_NAMES[low]} or ${BRACKET_NAMES[high!]}`,
    split: true,
    // THE LOWER MEMBER, derived rather than listed. `[1,2]` takes `--bracket-1` and `[4,5]`
    // takes `--bracket-4`; listing the two pairs would leave a third range inkless.
    chip: low,
  };
}

/**
 * The population line, which reports what other players declared.
 *
 * NEVER A ZERO for a commander EDHREC has no declarations for — absent and none are different
 * facts, and 27 commanders are in the first case. `BracketPopulation.deckCount` being nullable
 * is the same distinction one layer down.
 */
export type PopulationLine =
  | { kind: "present"; declaredTotal: number; said: number; name: string }
  | { kind: "absent" };

export function populationLine(
  population: { counts: Record<string, number>; declaredTotal: number } | null,
  bracket: Bracket,
): PopulationLine {
  if (!population || population.declaredTotal <= 0) return { kind: "absent" };
  return {
    kind: "present",
    declaredTotal: population.declaredTotal,
    // `?? 0` is right HERE and nowhere else: the total is known to be positive, so a bracket
    // nobody chose really is zero of it — unlike an absent population, which is not a zero.
    said: population.counts[String(bracket)] ?? 0,
    name: BRACKET_NAMES[bracket],
  };
}

/**
 * The sub-line under the face — the one part of the block that differs between readings.
 *
 * FOUR READINGS, and the fourth is the one the canvas never drew. A range asks the player for
 * their intent; a single bracket says what ruled the one below it out. That second half has two
 * shapes, because `permitsFor` reaches a single bracket two different ways:
 *
 * - `[2]` and `[3]` arrive because a LIMIT was passed at the bracket below, so `violations`
 *   holds the receipt and the sentence is built from it.
 * - `[4]` arrives with `violatesB3` FALSE and `assemblesCombo` true. Nothing at bracket 3 was
 *   violated, so `violations` holds nothing for it and a reading built from violations alone
 *   would draw an empty sentence on a real deck. What ruled 3 out is that the deck can assemble
 *   its combo rather than having to draw into it.
 *
 * The canvas draws `[1,2]`, `[2]`, `[3]` and `[4,5]` — three real decks — and never a `[4]`,
 * so that fourth reading is engineering's clause in Design's own slot: `singleExact` takes
 * `ruledOut` as a parameter precisely because the package expects it to be supplied from code.
 */
export type VerdictSubLine =
  /** A range, unanswered. The ink comes from `VerdictHead`, not from here. */
  | { kind: "intent"; low: Bracket }
  /** A limit was passed at the bracket below, and these are the rules that passed it. */
  | { kind: "ruledOut"; below: Bracket; reasons: RuledOutReason[] }
  /** The bracket below is out because the deck assembles a combo rather than drawing into it. */
  | { kind: "assembled"; below: Bracket }
  /** No bracket below — unreachable from `permitsFor`, and drawn as nothing rather than thrown. */
  | { kind: "none" };

export type RuledOutReason = { rule: RuleId; have: number; limit: number };

export function verdictSubLine(verdict: {
  permits: readonly Bracket[];
  violations: readonly { rule: RuleId; bracket: number; have: number; limit: number }[];
}): VerdictSubLine {
  const permits = verdict.permits;
  // The same guard the head uses, for the same reason: a hand-built range renders a confident
  // sentence about a reading nobody permitted.
  const head = verdictHead(permits);
  if (head.split) return { kind: "intent", low: permits[0] };
  const yours = permits[0];
  if (yours <= 1) return { kind: "none" };
  const below = (yours - 1) as Bracket;
  const reasons = verdict.violations
    .filter((v) => v.bracket === below)
    // DEDUPED BY RULE. `slotDeck` reports the loop clause at both 2 and 3, so a single bracket
    // never sees the same rule twice — but the filter above takes one bracket, and a future
    // rule reported twice at one bracket would otherwise say the same thing twice in one
    // sentence.
    .filter((v, i, all) => all.findIndex((o) => o.rule === v.rule) === i)
    .map((v) => ({ rule: v.rule, have: v.have, limit: v.limit }));
  // NOT A FALLBACK. `[4]` is the one single bracket that violates nothing below it, and this is
  // that reading rather than an empty-list guard standing in for it.
  return reasons.length > 0
    ? { kind: "ruledOut", below, reasons }
    : { kind: "assembled", below };
}

/**
 * Who the population line is ABOUT — the commander, or the pair.
 *
 * `BracketPopulation.of` already records which row EDHREC's counts came from, and the two are
 * different claims: a pair row counts decks led by BOTH, a commander row counts decks led by the
 * PRIMARY one. Naming both commanders over a commander row would attribute a partner deck's
 * counts to a pairing nobody counted.
 *
 * Returns null when the profile cannot name its own commander, and the line is then drawn as
 * absent rather than as "Of the 9,730 undefined decks".
 */
export function populationSubject(
  of: "commander" | "pair",
  commanderOracleIds: readonly string[],
  cards: readonly { oracleId: string; name: string }[],
): string | null {
  const byId = new Map(cards.map((c) => [c.oracleId, c.name]));
  // The PRIMARY first: `commanderOracleIds` is built from the deck head's own two columns, in
  // that order, and `populationFrom` reads the commander row for `head.commanderOracleId`.
  const ids = of === "pair" ? commanderOracleIds : commanderOracleIds.slice(0, 1);
  const names = ids.map((id) => byId.get(id)).filter((n): n is string => Boolean(n));
  return names.length === ids.length && names.length > 0 ? nameList(names) : null;
}
