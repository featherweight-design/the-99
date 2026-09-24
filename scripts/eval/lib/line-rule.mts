import { deckNameIndex, normalizeName, type SynopsisFacts } from "../../../src/lib/synopsis/facts";
import { CHAR_BUDGETS, SECTION_COUNTS, TIP_MIN_CARDS } from "../../../src/lib/synopsis/limits";
import type { SynopsisResponse } from "../../../src/lib/synopsis/response-schema";
import { commanderInHand, figuresIn, headingPrefix, jobSupported, manaLetters, marksIn, rendered, statesLandCount, strengthClaim, unmarked, unmarkedNames } from "../../../src/lib/synopsis/validate";

/**
 * "Drop the line, not the section": measured for Hugh as a what-if (orchestrator, 2026-09-24),
 * then shipped as the app's contract A (#918).
 * In the list sections a line that fails is dropped, and the section still renders when at least
 * `min` lines survive. Prose (the overview, and the primer's strategy steps) keeps whole-section
 * refusal.
 *
 * The line checks are the validator's own exported pieces: `strengthClaim`, `figuresIn`,
 * `unmarkedNames`, `rendered`, `marksIn`, `jobSupported`, and v6's `manaLetters`, `statesLandCount`,
 * `commanderInHand` and `headingPrefix`; each check names the validator's own refusal reason. Two small things the validator does not
 * export are restated. That is why `rescore-lines.mts` self-tests them: rolled up by
 * `dropLineRule` and `dropLineContent`, they must reproduce `validateSynopsis`'s verdict and kept
 * lines on every stored answer, or it prints nothing. `shippedRule`, the whole-section contract
 * before #918, is no longer the app's and is checked against nothing; it stays for the historical
 * tables.
 */
type Card = { oracleId: string; name: string };
type Catalog = ReadonlyMap<string, Card>;
export type Minimums = { keyCards: number; tips: number; keep: number; sendBack: number; weaknesses: number };

/** Design's own minimums (`SECTION_COUNTS`, from SYNOPSIS-modal.md §4.2). */
export const DESIGN_MINIMUMS: Minimums = {
  keyCards: SECTION_COUNTS.keyCards.min,
  tips: SECTION_COUNTS.tips.min,
  keep: SECTION_COUNTS.keep.min,
  sendBack: SECTION_COUNTS.sendBack.min,
  weaknesses: SECTION_COUNTS.weaknesses.min,
};
export const flatMinimums = (n: number): Minimums => ({ keyCards: n, tips: n, keep: n, sendBack: n, weaknesses: n });

/** Restated from validate.ts (not exported there): a whole sentence ends in terminal punctuation. */
const endsSentence = (text: string) => /[.!?]["'”’)\]]*$/.test(text.trim());

/**
 * Each line check as the FIRST reason it fails, or null when it passes, in the order the validator
 * reports them. The boolean checks below are these read as `=== null`, so the dropped-lines count
 * and the rule that drops them are the same code.
 */
function lineReasons(facts: SynopsisFacts, catalog: Catalog) {
  const deck = deckNameIndex(facts.cards);
  // Restated from validate.ts's Resolver: every deck name, and each face of a two-faced card.
  const names = [...new Set([...deck.values()].flatMap((c) => [c.name, ...c.name.split(" // ")]))];
  const categories = new Map(facts.cards.map((c) => [c.oracleId, new Set(c.categories)]));
  const allowed = new Set(facts.figures);
  const universal = new Set(facts.cards.filter((c) => c.universalStaple).map((c) => c.oracleId));

  const prose = (text: string, budget: number): string | null => {
    if (!endsSentence(text)) return "partial_sentence";
    if (unmarkedNames(text, names, facts.commanders).length > 0) return "unmarked_card";
    if (rendered(text).trim().length > budget) return "over_budget";
    if (strengthClaim(unmarked(text))) return "strength_claim";
    if (manaLetters(text, facts.identity).length > 0) return "mana_letters";
    return null;
  };
  // A mark that resolves to nothing is `unknown_card` only when no rule refused the line: the
  // validator counts it as a failed name and names it last (`lineCheck`, "a name that failed with
  // no rule broken"), so a line with a bad mark AND a stray figure is `uncomputed_figure` there.
  const lost = (text: string, cat: Catalog | null) => !marksIn(text).every((n) => deck.has(normalizeName(n)) || !!cat?.has(normalizeName(n)));
  const last = (reason: string | null, text: string, cat: Catalog | null = null) => reason ?? (lost(text, cat) ? "unknown_card" : null);

  const idOf = (name: string) => deck.get(normalizeName(name))?.oracleId ?? `?${normalizeName(name)}`;
  return {
    strategy: (t: string) => last(prose(t, CHAR_BUDGETS.strategy), t),
    mulligan: (t: string) => last(prose(t, CHAR_BUDGETS.mulligan)
      ?? (figuresIn(t).every((n) => allowed.has(n)) ? null : "uncomputed_figure")
      ?? (statesLandCount(t) ? "land_count" : null)
      ?? (commanderInHand(t, facts.commanders) ? "commander_in_hand" : null)
      ?? (headingPrefix(t) ? "heading_prefix" : null), t),
    tip: (tip: { cards: string[]; text: string }) => {
      const listed = new Set(tip.cards.map(idOf));
      const marked = new Set(marksIn(tip.text).map(idOf));
      return last(prose(tip.text, CHAR_BUDGETS.tip)
        ?? (tip.cards.every((n) => deck.has(normalizeName(n))) ? null : "tip_not_in_deck")
        ?? (listed.size >= TIP_MIN_CARDS ? null : "tip_too_few_cards")
        ?? (marked.size === listed.size && [...listed].every((id) => marked.has(id)) ? null : "tip_not_in_deck"), tip.text);
    },
    keyCard: (k: SynopsisResponse["keyCards"][number]) => {
      const card = deck.get(normalizeName(k.card));
      // An unknown card stops the line's own checks, as `deckCard` returning null does there.
      const reason = prose(k.job, CHAR_BUDGETS.job)
        ?? (card && !jobSupported(k, categories.get(card.oracleId) ?? new Set()) ? "job_unsupported" : null)
        ?? (card && universal.has(card.oracleId) ? "universal_staple" : null);
      return reason ?? (!card || lost(k.job, null) ? "unknown_card" : null);
    },
    overview: (t: string) => last(prose(t, CHAR_BUDGETS.overview), t),
    weakness: (t: string) => last(prose(t, CHAR_BUDGETS.weakness), t, catalog),
  };
}

function lineChecks(facts: SynopsisFacts, catalog: Catalog) {
  const r = lineReasons(facts, catalog);
  const deck = deckNameIndex(facts.cards);
  const pass = <T,>(f: (x: T) => string | null) => (x: T) => f(x) === null;
  return {
    strategy: pass(r.strategy),
    mulligan: pass(r.mulligan),
    tip: pass(r.tip),
    keyCard: pass(r.keyCard),
    keyCardId: (k: SynopsisResponse["keyCards"][number]) => deck.get(normalizeName(k.card))?.oracleId ?? null,
    overview: pass(r.overview),
    weakness: pass(r.weakness),
  };
}

const inRange = (n: number, r: { min: number; max: number }) => n >= r.min && n <= r.max;

export type SectionPass = { overview: boolean; primer: boolean; keyCards: boolean; weaknesses: boolean };

/** The shipped rule, from line checks: every line passes and every count is in range. */
export function shippedRule(reply: SynopsisResponse, facts: SynopsisFacts, catalog: Catalog): SectionPass {
  const c = lineChecks(facts, catalog);
  const { strategy, mulligan, tips } = reply.primer;
  const ids = reply.keyCards.map(c.keyCardId);
  return {
    overview: c.overview(reply.overview),
    primer: inRange(strategy.length, SECTION_COUNTS.strategy) && inRange(mulligan.keep.length, SECTION_COUNTS.keep)
      && inRange(mulligan.sendBack.length, SECTION_COUNTS.sendBack) && inRange(tips.length, SECTION_COUNTS.tips)
      && strategy.every(c.strategy) && [...mulligan.keep, ...mulligan.sendBack].every(c.mulligan) && tips.every(c.tip),
    keyCards: inRange(reply.keyCards.length, SECTION_COUNTS.keyCards) && reply.keyCards.every(c.keyCard)
      && new Set(ids.filter((id) => id !== null)).size === ids.filter((id) => id !== null).length,
    weaknesses: inRange(reply.weaknesses.length, SECTION_COUNTS.weaknesses) && reply.weaknesses.every(c.weakness),
  };
}

/**
 * The what-if rule. A list section renders when at least `min` of its lines pass (duplicates of a
 * Key card count once). Prose must pass whole: the overview, and every strategy step. No list may
 * run past its maximum, since the reply would then have been told something it ignored.
 */
export function dropLineRule(reply: SynopsisResponse, facts: SynopsisFacts, catalog: Catalog, min: Minimums): SectionPass {
  const c = lineChecks(facts, catalog);
  const { strategy, mulligan, tips } = reply.primer;
  const passingIds = new Set(reply.keyCards.filter(c.keyCard).map(c.keyCardId));
  return {
    overview: c.overview(reply.overview),
    primer: inRange(strategy.length, SECTION_COUNTS.strategy) && strategy.every(c.strategy)
      && mulligan.keep.length <= SECTION_COUNTS.keep.max && mulligan.keep.filter(c.mulligan).length >= min.keep
      && mulligan.sendBack.length <= SECTION_COUNTS.sendBack.max && mulligan.sendBack.filter(c.mulligan).length >= min.sendBack
      && tips.length <= SECTION_COUNTS.tips.max && tips.filter(c.tip).length >= min.tips,
    keyCards: reply.keyCards.length <= SECTION_COUNTS.keyCards.max && passingIds.size >= min.keyCards,
    weaknesses: reply.weaknesses.length <= SECTION_COUNTS.weaknesses.max && reply.weaknesses.filter(c.weakness).length >= min.weaknesses,
  };
}

/** Mulligan lines naming a figure the facts do not carry: the lines `uncomputed_figure` refuses. */
export function mulliganFigureFailures(reply: SynopsisResponse, facts: SynopsisFacts): number {
  const allowed = new Set(facts.figures);
  const { keep, sendBack } = reply.primer.mulligan;
  return [...keep, ...sendBack].filter((t) => !figuresIn(t).every((n) => allowed.has(n))).length;
}

/**
 * Names the answer gives that resolve to no card, counted over EVERY mark and named card in every
 * section, independent of which refusal a section reports first: `validateSynopsis` names one
 * reason per section, so a section refused for its length hides an out-of-deck mark from a count
 * read off `unknown_card` refusals. A name resolves when the deck's name index or the catalog read
 * the app does for the answer knows it.
 */
export function outsideMarks(reply: SynopsisResponse, facts: SynopsisFacts, catalog: Catalog): number {
  const deck = deckNameIndex(facts.cards);
  // `deckNameIndex` already answers to each face, and leaves out a face two deck cards share, which
  // resolves to neither card and so counts here as it is refused there.
  const known = (n: string) => deck.has(normalizeName(n)) || catalog.has(normalizeName(n));
  const { strategy, mulligan, tips } = reply.primer;
  const texts = [reply.overview, ...strategy, ...mulligan.keep, ...mulligan.sendBack, ...tips.map((t) => t.text), ...reply.keyCards.map((k) => k.job), ...reply.weaknesses];
  // A card FIELD written as a mark (`[[Sol Ring]]`) is a formatting fault the section's own refusal
  // already reports; the name inside it is what says whether the card is outside the deck.
  const unmark = (n: string) => n.replace(/^\[\[(.*)\]\]$/, "$1");
  const names = [...texts.flatMap(marksIn), ...tips.flatMap((t) => t.cards).map(unmark), ...reply.keyCards.map((k) => unmark(k.card))];
  return names.filter((n) => !known(n)).length;
}

/**
 * What a section SHOWS under the drop-the-line rule: the passing lines of each list, in order, and
 * the prose whole. Only meaningful for a section `dropLineRule` passes; a Key card named twice
 * keeps its first passing line, as the rule counts it once.
 */
export function dropLineContent(reply: SynopsisResponse, facts: SynopsisFacts, catalog: Catalog) {
  const c = lineChecks(facts, catalog);
  const seen = new Set<string | null>();
  return {
    overview: reply.overview,
    primer: {
      strategy: reply.primer.strategy,
      mulligan: { keep: reply.primer.mulligan.keep.filter(c.mulligan), sendBack: reply.primer.mulligan.sendBack.filter(c.mulligan) },
      tips: reply.primer.tips.filter(c.tip),
    },
    keyCards: reply.keyCards.filter((k) => {
      if (!c.keyCard(k)) return false;
      const id = c.keyCardId(k);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
    weaknesses: reply.weaknesses.filter(c.weakness),
  };
}

/**
 * The mulligan tag the round 2 read used (report, "Mulligan is hit or miss"): a line is SPECIFIC
 * when it names a card or a curve point or line of play. A heuristic, stated so it can be argued
 * with, and shared so every count of it is the same count.
 */
const PLAY_WORDS = /\b(turn|drop|mana value|cmc|curve|cheap|one-mana|two-mana|three-mana|\d-mana|early play|line of play|interaction|counterspell|removal|draw|tutor)\b/i;
export function mulliganSpecific(line: string): boolean {
  return marksIn(line).length > 0 || PLAY_WORDS.test(line);
}

export type Dropped = { lines: number; dropped: number; reasons: Record<string, number> };

/**
 * The lines contract A drops without a word: per list section, how many lines the reply wrote, how
 * many fail, and why. The all-four verdict cannot see these (a section passes while its minimum
 * survives), which is how the mulligan's number words went unnoticed in round 3b. A Key card named
 * twice counts its repeat as dropped for `wrong_count`, the reason the validator gives it.
 */
export function droppedLines(reply: SynopsisResponse, facts: SynopsisFacts, catalog: Catalog): Record<"mulligan" | "tips" | "keyCards" | "weaknesses", Dropped> {
  const r = lineReasons(facts, catalog);
  const deck = deckNameIndex(facts.cards);
  const tally = <T,>(items: T[], why: (x: T) => string | null): Dropped => {
    const d: Dropped = { lines: items.length, dropped: 0, reasons: {} };
    for (const x of items) {
      const reason = why(x);
      if (reason) { d.dropped += 1; d.reasons[reason] = (d.reasons[reason] ?? 0) + 1; }
    }
    return d;
  };
  const seen = new Set<string>();
  return {
    mulligan: tally([...reply.primer.mulligan.keep, ...reply.primer.mulligan.sendBack], r.mulligan),
    tips: tally(reply.primer.tips, r.tip),
    keyCards: tally(reply.keyCards, (k) => {
      const reason = r.keyCard(k);
      if (reason) return reason;
      const id = deck.get(normalizeName(k.card))!.oracleId;
      if (seen.has(id)) return "wrong_count";
      seen.add(id);
      return null;
    }),
    weaknesses: tally(reply.weaknesses, r.weakness),
  };
}
