/**
 * The two oracle-text bracket classifiers, in ONE production home.
 *
 * These patterns were MEASURED before they were believed, and the figures the spec quotes are
 * figures about exactly these regexes: mass land denial at 22/24 recall flagging 40 of 31,830
 * commander-legal cards, extra turns at 21/21 with no misses among the 56 cards whose text
 * mentions one. `scripts/measure-mld.mts` and `scripts/measure-extra-turns.mts` IMPORT this
 * module rather than carrying their own copies, so the measured rule and the shipped rule are
 * the same rule — they were two copies for one day, and the spec's precision claim was scoped
 * to a curated set while the catalog held eleven false positives.
 *
 * DO NOT "SIMPLIFY" A GUARD. Each one implements a clause of WotC's published definition and
 * each was paid for by a card that shipped wrong without it:
 *   · `\\b` before `lands don't untap` — else it matches inside `Islands` (Choke).
 *   · `target` excluded — a bounded, one-turn effect is not four-or-more-per-player.
 *   · `you` excluded on the untap cap — a drawback on your own card is not table denial.
 *   · narrowing qualifiers and land-naming exception clauses on `destroy all permanents` —
 *     else `Scourglass`, whose text spares lands outright, reads as land destruction. The
 *     guard tests whether the exception NAMES LANDS rather than whether one exists, because
 *     `Worldslayer` excepts only itself and kills every land.
 *
 * Pure: no database, no network, client-safe.
 */

/**
 * The candidate classifier. Each clause maps to a phrase in the quoted definition, and the
 * comment says which — so a reader can check the rule against the rule rather than against
 * an intuition about what mass land denial "feels like".
 */
export const PATTERNS: { why: string; re: RegExp }[] = [
  // "destroy … other players' lands … four or more per player"
  { why: "destroy all lands", re: /destroy all (creatures and |artifacts and |nonland permanents and )?lands/i },
  { why: "destroy N lands", re: /destroys? (four|five|six|seven|eight|nine|ten|\d+) lands/i },
  { why: "destroy all nonbasic", re: /destroy all nonbasic lands/i },
  // "permanents" needs TWO guards, each paid for by a real false positive the sweep below
  // found. A NARROWING qualifier reduces the sweep to a subset that need not contain lands —
  // `destroy all permanents named Wirefly`, `…with that spell's mana value`, `…of the chosen
  // type`. And an EXCEPTION CLAUSE THAT NAMES LANDS spares them outright: Scourglass reads
  // `destroy all permanents except for artifacts and lands`, the exact opposite of this rule.
  //
  // The second guard tests for `land` inside the exception rather than for the exception
  // itself, and that distinction is the whole of it: Worldslayer's `destroy all permanents
  // other than this Equipment` leaves every land dead and IS mass land denial. A guard on
  // `other than` alone reads the two alike and loses it.
  {
    why: "destroy all permanents",
    re: /destroy all (?:artifacts, creatures, and lands|permanents(?!\s+(?:named|with|of)\b)(?![^.]*\b(?:except|other than)\b[^.]*\bland))/i,
  },
  // "exile"
  { why: "exile all lands", re: /exile all lands/i },
  // "bounce"
  { why: "return all lands", re: /return all lands .{0,40}owner'?s'? hands?/i },
  // "affecting four or more lands per player" via a sacrifice clause
  { why: "sacrifice N lands", re: /(each player|players) sacrifices? (four|five|six|seven|all|x|\d+) lands?/i },
  // Cataclysm-style: keep a few, sacrifice the rest
  { why: "keeps N, sacs rest", re: /chooses? .{0,60}\ba land\b.{0,80}sacrifices? (the |all the )?rest/i },
  // "keep lands tapped". The word boundary is load-bearing: without it this matches INSIDE
  // `Islands don't untap`, and flagged Choke and Curse of Marit Lage — single-colour hosers
  // that hit only the opponents on that colour, where the definition asks for four or more
  // lands PER PLAYER. `Nonbasic lands` and `Lands` both still match, which is what it is for.
  // …and `target` is excluded for the definition's OTHER clause: `up to three target lands
  // don't untap during their controller's next untap step` (Reduce // Rubble) is a bounded
  // selection for one turn, where the rule asks for four or more lands per player. A global
  // statement never says "target".
  { why: "lands don't untap", re: /(?<!target )\blands don'?t untap/i },
  // "keep lands tapped" — the Orb/Stasis family words this several ways
  // `You can't untap…` is a DRAWBACK on your own card (Mungha Wurm), not denial aimed at the
  // table. `Players` and `Your opponents` both still match, which is the Orb family.
  { why: "can't untap more than", re: /(?<!\byou )can'?t untap more than (one|two|three|\w+) (land|permanent)/i },
  { why: "skip untap step", re: /skips? (their|your|his or her) untap steps?/i },
  // Three guards, all found by reading the sweep. A NARROWING adjective can exclude lands
  // outright (`Nonland permanents don't untap` — Embargo) or reduce the effect to a sliver
  // of them (`Snow permanents` — Freyalise's Radiance, a snow hoser on the Choke pattern).
  // And `those permanents … next untap step` is Lorthos: eight TARGETED permanents for one
  // turn, the same bounded-and-temporary shape excluded on the `lands don't untap` clause.
  {
    why: "permanents don't untap",
    re: /(?<!\b(?:nonland|snow|those|artifact|creature|enchantment)\s)permanents don'?t untap during(?![^.]*\bnext untap step)/i,
  },
  // "change what mana they produce"
  { why: "nonbasic lands are", re: /nonbasic lands are mountains|nonbasic lands? lose all land types/i },
  { why: "lands produce colorless", re: /lands? .{0,30}produce .{0,10}colorless instead/i },
];

/**
 * Grants an extra turn. The wording is close to templated, which is why this is a far easier
 * problem than mass land denial — but the negation clause is load-bearing and is the whole
 * reason a naive `/extra turn/` match is wrong.
 */
const GRANTS = [
  { why: "takes an extra turn", re: /takes? (an|two|three|x|that many) extra turns?/i },
  { why: "take an extra turn", re: /take an extra turn after this one/i },
];

/**
 * Text that mentions an extra turn while granting none — a prevention, a skip, or a
 * restriction. Checked FIRST.
 *
 * An earlier version of this comment said "because every one of these also matches a grant
 * pattern", and the spec repeated it. Measured: FALSE for three of the four fixtures.
 * `Stranglehold`, `Trouble in Pairs` and `Gerrard's Hourglass Pendant` read "if a player
 * would begin an extra turn, that player skips that turn instead" and match NEITHER grant
 * pattern — they are excluded by matching nothing, so they would pass with this whole array
 * deleted. Only `Ugin's Nexus` earns the clause, because its death trigger really does say
 * "take an extra turn after this one".
 *
 * The order is still right — a card that both grants and prevents must read as prevention —
 * but the reason is one card, not four, and the run now prints which mechanism excluded each
 * fixture so a vacuous row cannot hide behind a passing one.
 */
const NEGATIONS = [
  { why: "skips that turn", re: /would begin an extra turn.{0,40}skips? that turn/i },
  { why: "can't take extra turns", re: /can'?t take extra turns/i },
  { why: "skip extra turns", re: /skips? (all )?extra turns/i },
];

const negated = (t: string) => NEGATIONS.filter((n) => n.re.test(t)).map((n) => n.why);
const granted = (t: string) => GRANTS.filter((g) => g.re.test(t)).map((g) => g.why);

/** Every definition clause this text matches — the receipts behind a flag. */
export function matchedMldClauses(text: string | null): string[] {
  return text ? PATTERNS.filter((p) => p.re.test(text)).map((p) => p.why) : [];
}

export function isMassLandDenial(text: string | null): boolean {
  return matchedMldClauses(text).length > 0;
}

/**
 * Negations are checked FIRST, because a card can both grant and prevent and must read as
 * prevention. `Ugin's Nexus` is that card — it skips everyone else's extra turns and takes one
 * itself when it dies — and it is the ONE fixture that earns the clause; the other three
 * preventions match no grant pattern at all.
 */
export function classifyExtraTurn(
  text: string | null,
): { hit: boolean; why: string[]; blockedBy: string[] } {
  if (!text) return { hit: false, why: [], blockedBy: [] };
  const blockedBy = negated(text);
  const why = granted(text);
  return { hit: why.length > 0 && blockedBy.length === 0, why, blockedBy };
}

export const isExtraTurn = (text: string | null): boolean => classifyExtraTurn(text).hit;

/**
 * §6.5 provenance, beside the classifiers it describes rather than in the verdict module —
 * the profile builder populates `detection` and needs one definition to read.
 */
export const MLD_DETECTION = {
  /**
   * THE METHODS, NAMED — never a bare count.
   *
   * These are our two DETECTION MECHANISMS (`FlagSource` is `"spellbook_sweep" | "oracle_rule"`),
   * and they are written out because the count alone fabricated a claim. `sources: 2` invited a
   * copy string to say we read the rules text "against 2 community-maintained ones", which is
   * false — there is no second list, there is Spellbook's own estimate and there is us. That
   * sentence shipped, travelled into a design prompt, came back drawn as two citation slots, and
   * was then put to Hugh as a request for two URLs that do not exist.
   *
   * A number cannot say what was counted, so the next reader supplies it and may be wrong. A
   * name can only be wrong on purpose.
   */
  methods: [
    "Commander Spellbook's own bracket estimate",
    "our reading of the rules text",
  ],
  basis: "22 of 24 on a curated set",
  /** BOTH misses. `basis` says two and an earlier version named one, leaving the other
   *  unaccounted for in the only place a reader would look for it. */
  knownMisses: ["Wave of Vitriol", "Cataclysm"],
} as const;

export const EXTRA_TURN_DETECTION = {
  /** The same two mechanisms. Named for the reason above. */
  methods: [
    "Commander Spellbook's own bracket estimate",
    "our reading of the rules text",
  ],
  basis: "no misses among the 56 cards whose text mentions one",
} as const;

/**
 * The tutor reading. One mechanism: Spellbook's estimate has no tutor answer, and the stored flag
 * is sourced to `oracle_rule` alone. Both figures are `pnpm measure:tutors` against staging's
 * catalog (2026-09-29): its named fixture, 22 of 22 agreeing, and the 974 cards whose text
 * searches a library. The fixture shows no miss, so there is no `knownMisses`, and the sheet says
 * how small the set is instead of implying the reading is exact.
 */
export const TUTOR_DETECTION = {
  methods: ["our reading of the rules text"],
  basis: "right on all 22 cards of a curated set",
  searchers: 974,
} as const;
