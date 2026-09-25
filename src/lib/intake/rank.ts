import { permitsFor, violationsFor } from "../bracket/rules";
import { filterByColors, type JoinMode } from "../commanders/filter";
import { TOO_NARROW_BELOW, themeShare, type ThemeRow } from "./vocabulary";

/**
 * Help me choose's search, as pure rules over facts a loader has already gathered (brief §2
 * rulings 5 to 8, §6). Every answer is optional.
 *
 * PASS OR FAIL, never a score (ruling 6):
 *  - COLORS, through `filterByColors`, the control's own rule, with its Any/Exactly mode.
 *  - EACH THEME: the commander backs it (`themeShare`), so a commander outside the index, with a
 *    null or thin deck count, or carrying the tag only by accident is not a result.
 *  - THE CARD: the commander's decks run it at all.
 *  - THE BRACKET, tested on the commander and the build-around card ALONE (§6). The fill keeps
 *    every card it chooses inside the limits and can always finish with basics, so only those two
 *    can put a deck outside a bracket. They pass when the lowest bracket they permit is at or
 *    under the answer; brackets 4 and 5 state no limits, so they admit everything.
 *  - THE BUDGET, tested on the commander's own price plus an unowned build-around card's. What
 *    the player owns costs nothing here. A price never stocked cannot be tested, so it passes, and
 *    the row says the price is unknown; a card nobody sells is not a reason to hide a commander.
 *
 * THE ORDER IS FIT, NOT THE COLLECTION (ruling 5). With a theme or a card the key is the WEAKEST
 * of the figures, since a commander fits only as well as its worst answer, and every figure is
 * returned for the row to show. With neither, it is how many of the commander's support cards the
 * player owns, and the result says that is the order. Ties go to the commander with more decks,
 * then by name.
 *
 * TOO NARROW IS NAMED, NEVER LOOSENED (ruling 8): under `TOO_NARROW_BELOW` results, each answer is
 * removed in turn and the rest re-run, so the player sees which one to loosen. No fill runs.
 */
export type Bracket = 1 | 2 | 3 | 4 | 5;

export type Answers = {
  colors: string[];
  match: JoinMode;
  /** Theme tag slugs. */
  themes: string[];
  /** The build-around card's oracle id. */
  card: string | null;
  budgetDollars: number | null;
  bracket: Bracket | null;
};

export type BracketFacts = { gameChanger: boolean; massLandDenial: boolean; extraTurn: boolean };

export type CardFacts = BracketFacts & {
  oracleId: string;
  owned: boolean;
  /** The cheapest printing stocked now; null when none is. */
  priceCents: number | null;
};

export type Candidate = ThemeRow & BracketFacts & {
  oracleId: string;
  name: string;
  colorIdentity: string[];
  owned: boolean;
  priceCents: number | null;
  /** The share (0 to 1) of this commander's decks that run the build-around card; null when none. */
  cardInclusion: number | null;
  /** Two-card combos this commander completes with the build-around card, and how many loop turns. */
  combosWithCard: { combos: number; loops: number };
  /** How many of the commander's support cards the player owns inside its identity, not counting
   *  itself: `supportOverlap` over `commanderPool`, the /commanders scorer's `overlapOwned`. */
  ownedSupport: number;
};

export type AnswerKey =
  | { kind: "colors" }
  | { kind: "theme"; slug: string }
  | { kind: "card" }
  | { kind: "budget" }
  | { kind: "bracket" };

export type Ranked = {
  candidate: Candidate;
  /** Each theme's share, in the order asked. */
  themeFits: { slug: string; share: number }[];
  cardFit: number | null;
};

export type SearchResult = {
  order: "fit" | "owned";
  rows: Ranked[];
  /** Set when fewer than `TOO_NARROW_BELOW` commanders pass and some answer was given. */
  tooNarrow: { without: { answer: AnswerKey; count: number }[] } | null;
};

export function passes(c: Candidate, a: Answers, card: CardFacts | null, skip?: AnswerKey): boolean {
  const skipping = (k: AnswerKey["kind"], slug?: string) =>
    skip?.kind === k && (k !== "theme" || (skip.kind === "theme" && skip.slug === slug));
  if (!skipping("colors") && filterByColors([c], a.colors, a.match).length === 0) return false;
  for (const slug of a.themes) if (!skipping("theme", slug) && themeShare(c, slug) === null) return false;
  // With the card answer removed the card is gone from every test, not only its own: its flags
  // and its price no longer count against the bracket or the budget either.
  const withCard = a.card !== null && !skipping("card") ? card : null;
  if (withCard !== null && !(c.cardInclusion !== null && c.cardInclusion > 0)) return false;
  if (a.bracket !== null && !skipping("bracket") && !withinBracket(c, withCard, a.bracket)) return false;
  if (a.budgetDollars !== null && !skipping("budget") && !withinBudget(c, withCard, a.budgetDollars)) return false;
  return true;
}

export function withinBracket(c: Candidate, card: CardFacts | null, bracket: Bracket): boolean {
  if (bracket >= 4) return true;
  const count = (f: keyof BracketFacts) => (c[f] ? 1 : 0) + (card?.[f] ? 1 : 0);
  const permits = permitsFor({
    ...violationsFor({
      gameChangers: count("gameChanger"),
      massLandDenial: count("massLandDenial"),
      extraTurns: count("extraTurn"),
      combos: card ? c.combosWithCard.combos : 0,
      loops: card ? c.combosWithCard.loops : 0,
    }),
    // Nothing is tutored in a deck of two cards: the command zone covers the commander's half,
    // and the other half is in the library.
    assemblesCombo: false,
  });
  return Math.min(...permits) <= bracket;
}

export function withinBudget(c: Candidate, card: CardFacts | null, dollars: number): boolean {
  const cost = (c.owned ? 0 : c.priceCents ?? 0) + (card && !card.owned ? card.priceCents ?? 0 : 0);
  return cost <= dollars * 100;
}

export function rankCandidates(candidates: readonly Candidate[], a: Answers, card: CardFacts | null): SearchResult {
  const order: SearchResult["order"] = a.themes.length > 0 || a.card !== null ? "fit" : "owned";
  const rows = candidates
    .filter((c) => passes(c, a, card))
    .map((c): Ranked => ({
      candidate: c,
      themeFits: a.themes.map((slug) => ({ slug, share: themeShare(c, slug) ?? 0 })),
      cardFit: a.card === null ? null : c.cardInclusion,
    }))
    .sort((x, y) => (order === "fit" ? fitKey(y) - fitKey(x) : y.candidate.ownedSupport - x.candidate.ownedSupport)
      || (y.candidate.deckCount ?? 0) - (x.candidate.deckCount ?? 0)
      || x.candidate.name.localeCompare(y.candidate.name));

  const answers = answerKeys(a);
  const tooNarrow = rows.length < TOO_NARROW_BELOW && answers.length > 0
    ? {
      without: answers
        .map((answer) => ({ answer, count: candidates.filter((c) => passes(c, a, card, answer)).length }))
        .sort((x, y) => y.count - x.count),
    }
    : null;
  return { order, rows, tooNarrow };
}

/** The weakest of a row's figures: it fits only as well as its worst answer. */
function fitKey(r: Ranked): number {
  return Math.min(...r.themeFits.map((t) => t.share), ...(r.cardFit === null ? [] : [r.cardFit]));
}

/** The answers given, in the order the form asks them. */
export function answerKeys(a: Answers): AnswerKey[] {
  return [
    ...(a.colors.length > 0 ? [{ kind: "colors" } as const] : []),
    ...a.themes.map((slug) => ({ kind: "theme", slug }) as const),
    ...(a.card !== null ? [{ kind: "card" } as const] : []),
    ...(a.budgetDollars !== null ? [{ kind: "budget" } as const] : []),
    ...(a.bracket !== null ? [{ kind: "bracket" } as const] : []),
  ];
}
