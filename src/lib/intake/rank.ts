import { permitsFor, violationsFor } from "../bracket/rules";
import { filterByColors, type JoinMode } from "../commanders/filter";
import { TOO_NARROW_BELOW, carriesSubtype, rawShare, themeShare, type ThemeRow } from "./vocabulary";

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
 * TOO NARROW IS NAMED, NEVER LOOSENED (ruling 8): under `TOO_NARROW_BELOW` results, answers are
 * removed and the rest re-run, so the player sees which to loosen. No fill runs. Removals are
 * searched by size, one answer first, then two, and so on, stopping at the first size where some
 * removal reaches `TOO_NARROW_BELOW`. A removal that brings nothing back is never offered: four
 * tribes asked at once back no commander between them, and dropping any one of them still left
 * three, so every single removal read 0 and the note was a dead end (Hugh, 2026-09-27).
 *
 * A TRIBAL THEME ALSO MATCHES ON THE TYPE LINE. A theme whose label is a creature type (`tribes`,
 * derived from the catalog by the loader) is backed by a commander whose type line carries that
 * type, even when the index cannot measure the share: too few decks, or the tag under its floor.
 * A MEASURED backing always ranks above a type-line one, which rank among themselves by the share
 * they do have. The row shows that share, so a type-line match is admitted only when it rounds to
 * 1% or more: the row has no way to draw a figure that is not a percentage, and "0% Dwarves"
 * beside a Dwarf would contradict the very match it was admitted for.
 *
 * THEMES AS ANY OF (the three-answers addendum §1). With `themeJoin: "any"` and two or more themes,
 * the themes are ONE answer: a commander passes when it backs any of them, and its value for the
 * group is the HIGHEST of the themes it backs. Across answers the rank is still the lowest figure,
 * so it is min(max of the group, the card). A row lists only the themes it backs. The group is also
 * one answer to the too-narrow note: it is dropped whole, never one theme at a time, since dropping a
 * theme from an any-of can only bring fewer commanders back. Asked as all of, the note offers the
 * join itself (`anyOf`), counted by the same `passes`, so it never reads 0.
 */
export type Bracket = 1 | 2 | 3 | 4 | 5;

export type ThemeJoin = "all" | "any";

export type Answers = {
  colors: string[];
  match: JoinMode;
  /** Theme tag slugs. */
  themes: string[];
  /** How the themes join; absent is all of, and any of applies only from two themes (`isAnyOf`). */
  themeJoin?: ThemeJoin;
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
  /** The commander's printed type line, for a tribal theme's type-line match. */
  typeLine: string | null;
  /** The share (0 to 1) of this commander's decks that run the build-around card; null when none. */
  cardInclusion: number | null;
  /** Two-card combos this commander completes with the build-around card, and how many loop turns. */
  combosWithCard: { combos: number; loops: number };
  /** How many of the commander's support cards the player owns inside its identity, not counting
   *  itself: `supportOverlap` over `commanderPool`, the /commanders scorer's `overlapOwned`. */
  ownedSupport: number;
  /** Every support card inside its identity, the same count without the ownership test: the
   *  owned order's *{n} of the {total} cards its decks run are yours*. 0 when not read. */
  supportTotal: number;
};

export type AnswerKey =
  | { kind: "colors" }
  | { kind: "theme"; slug: string }
  /** The themes asked as any of: one answer, dropped whole. */
  | { kind: "themes" }
  | { kind: "card" }
  | { kind: "budget" }
  | { kind: "bracket" };

export type Ranked = {
  candidate: Candidate;
  /**
   * Each theme's share, in the order asked. `typeLine`: backed by the type line alone. Asked as any
   * of, only the themes the commander backs, and `best` marks the one that is the group's value.
   */
  themeFits: { slug: string; share: number; typeLine?: boolean; best?: boolean }[];
  cardFit: number | null;
};

export type SearchResult = {
  order: "fit" | "owned";
  rows: Ranked[];
  /** Set when fewer than `TOO_NARROW_BELOW` commanders pass and some answer was given. */
  tooNarrow: {
    /** Answers whose removal brings commanders back, each set with how many; never a count of 0. */
    without: { answers: AnswerKey[]; count: number }[];
    /**
     * Colors asked for EXACTLY, and how many pass with the control's *Any* instead (every one of
     * them, other colors allowed). Null when it admits no more than the exact ask already does,
     * as with all five colors, where the two modes mean the same.
     */
    widen: { count: number } | null;
    /**
     * Two or more themes asked as ALL of, and how many pass as any of instead. `most` is the most
     * of those themes any commander passing the other answers backs at once, the fact the note's
     * reason states. Null when any of admits no more.
     */
    anyOf: { count: number; most: number } | null;
    /**
     * The build-around card alone puts every deck over the bracket asked for: a Game Changer at
     * 1 or 2, which allow none. The row that drops the card says so.
     */
    cardOverBracket: "gameChanger" | null;
  } | null;
};

/** A theme slug to the lower-cased singulars of its creature type, for the tribal themes asked. */
export type Tribes = ReadonlyMap<string, readonly string[]>;

const NO_TRIBES: Tribes = new Map();

/**
 * How `c` backs a theme: its measured share, or, for a tribal theme, its type line. Null when it
 * does not back it. A type-line backing must round to 1% or more (see the header).
 */
export function backing(c: ThemeRow & { typeLine: string | null }, slug: string, tribes: Tribes = NO_TRIBES): { share: number; typeLine: boolean } | null {
  const measured = themeShare(c, slug);
  if (measured !== null) return { share: measured, typeLine: false };
  const forms = tribes.get(slug);
  if (!forms || !c.typeLine || !carriesSubtype(c.typeLine, forms)) return null;
  const share = rawShare(c, slug);
  return Math.round(share * 100) >= 1 ? { share, typeLine: true } : null;
}

/** Two or more themes asked as any of: one answer rather than one per theme. */
export const isAnyOf = (a: Pick<Answers, "themes" | "themeJoin">): boolean => a.themeJoin === "any" && a.themes.length >= 2;

export function passes(
  c: Candidate, a: Answers, card: CardFacts | null, skip: readonly AnswerKey[] = [], tribes: Tribes = NO_TRIBES,
): boolean {
  const skipping = (k: AnswerKey["kind"], slug?: string) =>
    skip.some((s) => s.kind === k && (k !== "theme" || (s.kind === "theme" && s.slug === slug)));
  if (!skipping("colors") && filterByColors([c], a.colors, a.match).length === 0) return false;
  if (isAnyOf(a)) {
    if (!skipping("themes") && !a.themes.some((slug) => backing(c, slug, tribes) !== null)) return false;
  } else {
    for (const slug of a.themes) if (!skipping("theme", slug) && backing(c, slug, tribes) === null) return false;
  }
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

export function rankCandidates(
  candidates: readonly Candidate[], a: Answers, card: CardFacts | null, tribes: Tribes = NO_TRIBES,
): SearchResult {
  const order: SearchResult["order"] = a.themes.length > 0 || a.card !== null ? "fit" : "owned";
  const rows = candidates
    .filter((c) => passes(c, a, card, [], tribes))
    .map((c): Ranked => ({ candidate: c, themeFits: themeFits(c, a, tribes), cardFit: a.card === null ? null : c.cardInclusion }))
    .sort((x, y) => (order === "fit" ? measuredFirst(x) - measuredFirst(y) || fitKey(y) - fitKey(x) : y.candidate.ownedSupport - x.candidate.ownedSupport)
      || (y.candidate.deckCount ?? 0) - (x.candidate.deckCount ?? 0)
      || x.candidate.name.localeCompare(y.candidate.name));

  const answers = answerKeys(a);
  const anyOf = rows.length < TOO_NARROW_BELOW ? anyOfCount(candidates, a, card, rows.length, tribes) : null;
  const tooNarrow = rows.length < TOO_NARROW_BELOW && answers.length > 0
    ? {
      // With the join alone reaching the floor, one drop at a time is all the note searches: the
      // join leads, and the deeper removal sets it would outrank cost a rescan each.
      without: removals(candidates, a, card, answers, tribes, anyOf !== null && anyOf.count >= TOO_NARROW_BELOW),
      widen: widenCount(candidates, a, card, rows.length, tribes),
      anyOf,
      cardOverBracket: a.card !== null && card?.gameChanger === true && a.bracket !== null && a.bracket <= 2
        ? "gameChanger" as const
        : null,
    }
    : null;
  return { order, rows, tooNarrow };
}

/** A row's theme figures: every theme asked, or, as any of, the ones it backs with the best marked. */
function themeFits(c: Candidate, a: Answers, tribes: Tribes): Ranked["themeFits"] {
  const fits = a.themes.flatMap((slug) => {
    const b = backing(c, slug, tribes);
    // As all of every theme is a figure, 0 where unbacked; as any of only a backed one is.
    if (b === null && isAnyOf(a)) return [];
    return [{ slug, share: b?.share ?? 0, typeLine: b?.typeLine ?? false }];
  });
  if (!isAnyOf(a)) return fits;
  const backed = fits;
  if (backed.length === 0) return [];
  // The group's value is its highest figure, a measured one ahead of a type-line one as in the order.
  const best = backed.reduce((x, y) => (Number(x.typeLine) - Number(y.typeLine) || y.share - x.share) > 0 ? y : x);
  return backed.map((f) => (f === best ? { ...f, best: true } : f));
}

function anyOfCount(
  candidates: readonly Candidate[], a: Answers, card: CardFacts | null, exact: number, tribes: Tribes,
): { count: number; most: number } | null {
  if (a.themes.length < 2 || isAnyOf(a)) return null;
  const any: Answers = { ...a, themeJoin: "any" };
  const count = candidates.filter((c) => passes(c, any, card, [], tribes)).length;
  if (count <= exact) return null;
  let most = 0;
  for (const c of candidates) {
    if (!passes(c, any, card, [{ kind: "themes" }], tribes)) continue;
    most = Math.max(most, a.themes.filter((slug) => backing(c, slug, tribes) !== null).length);
  }
  return { count, most };
}

function widenCount(
  candidates: readonly Candidate[], a: Answers, card: CardFacts | null, exact: number, tribes: Tribes,
): { count: number } | null {
  if (a.colors.length === 0 || a.match !== "exactly") return null;
  const count = candidates.filter((c) => passes(c, { ...a, match: "contains" }, card, [], tribes)).length;
  return count > exact ? { count } : null;
}

/**
 * The removals worth offering: every set of answers whose removal brings commanders back, searched
 * by size and stopped at the first size where one reaches `TOO_NARROW_BELOW`. At least one answer
 * is always kept, so the note never offers "drop everything". Most commanders first; a tie keeps
 * the smaller removal ahead.
 */
function removals(
  candidates: readonly Candidate[], a: Answers, card: CardFacts | null, answers: readonly AnswerKey[], tribes: Tribes,
  singlesOnly = false,
): { answers: AnswerKey[]; count: number }[] {
  const found: { answers: AnswerKey[]; count: number }[] = [];
  const count = (set: AnswerKey[]) => ({ answers: set, count: candidates.filter((c) => passes(c, a, card, set, tribes)).length });
  const last = Math.max(1, answers.length - 1);
  for (let size = 1; size <= last; size++) {
    // BOUNDED: a size past the first whose subsets outnumber `REMOVAL_SETS_MAX` is not searched, and
    // the search goes straight to keeping one answer. The answers are uncapped (a URL can carry any
    // number of themes), and every set rescans every candidate, so an unbounded search is
    // exponential in them; this one is linear in the answers plus a constant.
    if (size > 1 && size < last && choose(answers.length, size) > REMOVAL_SETS_MAX) {
      // Keeping one answer is n sets, linear like the single drops, so it is always searched.
      found.push(...answers.map((_, i) => answers.filter((__, j) => j !== i)).map(count).filter((r) => r.count > 0));
      break;
    }
    const atSize = subsets(answers, size).map(count).filter((r) => r.count > 0);
    found.push(...atSize);
    if (singlesOnly || atSize.some((r) => r.count >= TOO_NARROW_BELOW)) break;
  }
  return found.sort((x, y) => y.count - x.count || x.answers.length - y.answers.length);
}

/** The most removal sets searched at any size past the first (see `removals`). */
export const REMOVAL_SETS_MAX = 64;

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

function subsets<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  const out: T[][] = [];
  // Only a start that leaves enough items after it can complete a set, which keeps the work to
  // the sets themselves rather than every dead branch.
  for (let i = 0; i <= items.length - size; i++) {
    for (const rest of subsets(items.slice(i + 1), size - 1)) out.push([items[i], ...rest]);
  }
  return out;
}

/** The theme figures a row ranks by: every one, or, as any of, the group's best alone. */
const rankingFits = (r: Ranked) => (r.themeFits.some((t) => t.best) ? r.themeFits.filter((t) => t.best) : r.themeFits);

/** 0 when every theme is backed by a measure, 1 when any is backed by the type line alone. */
function measuredFirst(r: Ranked): number {
  return rankingFits(r).some((t) => t.typeLine) ? 1 : 0;
}

/** The weakest of a row's figures: it fits only as well as its worst answer. */
function fitKey(r: Ranked): number {
  return Math.min(...rankingFits(r).map((t) => t.share), ...(r.cardFit === null ? [] : [r.cardFit]));
}

/** The answers given, in the order the form asks them. */
export function answerKeys(a: Answers): AnswerKey[] {
  return [
    ...(a.colors.length > 0 ? [{ kind: "colors" } as const] : []),
    ...(isAnyOf(a) ? [{ kind: "themes" } as const] : a.themes.map((slug) => ({ kind: "theme", slug }) as const)),
    ...(a.card !== null ? [{ kind: "card" } as const] : []),
    ...(a.budgetDollars !== null ? [{ kind: "budget" } as const] : []),
    ...(a.bracket !== null ? [{ kind: "bracket" } as const] : []),
  ];
}
