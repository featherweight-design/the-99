import { CHAR_BUDGETS, SECTION_COUNTS, TIP_MIN_CARDS } from "./limits";
import { deckNameIndex, normalizeName, type SynopsisFacts } from "./facts";
import type { SynopsisResponse } from "./response-schema";
import type { Category, CheckedSynopsis, KeyCard, RefusalReason, SectionId, SectionVerdict } from "./types";

/**
 * The synopsis accept contract (brief §2, §5, §6). Pure. Every rule is the app's own check: the
 * schema guarantees the reply's shape and nothing about its truth.
 *
 * A SECTION FAILS WHOLE. A failing section is refused with its first reason, and its content is
 * not returned, so nothing can render a trimmed section or a partial sentence (`STATES-synopsis.md`).
 * The other sections stand on their own checks, which is what lets the modal show the passing
 * sections beside a refused one (`SYNOPSIS-modal.md` §4.3).
 *
 * `catalog` maps the normalized names Weaknesses marks to the catalog card each one is, for every
 * such name the catalog holds; the generator looks them up beside the deck. Weaknesses may name a card the deck lacks ("no answer to [[Rest in Peace]]"); every other
 * section may name only the deck's own.
 */

type Card = { oracleId: string; name: string };

const MARK = /\[\[([^\[\]]+)\]\]/g;

/** The names a text marks, as written. */
export function marksIn(text: string): string[] {
  return [...text.matchAll(MARK)].map((m) => m[1]);
}

/** The text as it renders: a mark is its name. Budgets count this. */
export function rendered(text: string): string {
  return text.replace(MARK, "$1");
}

/**
 * The prose with every mark removed, which is what the word rules read. A card's NAME is not a
 * claim the prose makes: [[Brutal Hordechief]] is not strength talk, [[Three Visits]] states no
 * figure, and "survives [[Wrath of God]]" does not call the card a wipe.
 */
export function unmarked(text: string): string {
  return text.replace(MARK, " ");
}

/** A whole sentence ends in terminal punctuation, optionally inside a closing quote or bracket. */
function endsSentence(text: string): boolean {
  return /[.!?]["'\u201d\u2019)\]]*$/.test(text.trim());
}

/**
 * Strength talk (brief §2.2, §5). Words and phrases, never bare numbers: a game fact such as
 * "deals 16" is allowed (readiness audit §3). `power` alone is a creature's stat and is not listed;
 * `power level` is.
 */
const STRENGTH = [
  /\bbrackets?\b/i,
  /\bpower[- ]levels?\b/i,
  /\bcEDH\b/i,
  /\bcompetitive\b/i,
  /\bcasual\b/i,
  /\boptimi[sz]ed\b/i,
  /\b(high|low|mid)[- ]power(ed)?\b/i,
  /\btier\b/i,
  /\bscores?\b/i,
  /\bratings?\b/i,
  /\b\d+\s*\/\s*10\b/,
  /\bout of (10|ten)\b/i,
  /\b(strong|stronger|strongest|powerful|brutal|efficient|respectable|oppressive|busted|top[- ]tier)\b/i,
];

export function strengthClaim(text: string): boolean {
  return STRENGTH.some((re) => re.test(text));
}

/**
 * The words that claim a category. A Key card's job may use them only for a category the app
 * holds for that card. `land` and `commander` carry none: a job saying "a land" or "leads the
 * deck" makes no claim the profile could contradict.
 */
const CATEGORY_WORDS: Partial<Record<Category, RegExp>> = {
  ramp: /\b(ramps?|ramping|mana acceleration|accelerat\w*)\b/i,
  draw: /\b(draws?|drawing|card advantage)\b/i,
  removal: /\b(remov\w*|destroys?|kill spell|answers? (a|any|target))\b/i,
  wipes: /\b(wipes?|sweepers?|wraths?)\b/i,
  tutor: /\b(tutors?|searches|search your library)\b/i,
  combo: /\b(combos?|infinite\w*)\b/i,
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, dozen: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};
const NUMBER_WORD = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b`, "g");

/**
 * Every figure a line states, as digits or as a number word, outside card names. "one" is not
 * read as a word: it is a pronoun as often as a count ("send back one with no ramp"), and a
 * count of one written as `1` is still checked.
 */
export function figuresIn(text: string): number[] {
  const out: number[] = [];
  for (const m of unmarked(text).matchAll(/\b(\d+)\b/g)) out.push(Number(m[1]));
  for (const m of unmarked(text).toLowerCase().matchAll(NUMBER_WORD)) {
    out.push(NUMBER_WORDS[m[1]]);
  }
  return out;
}

/** Resolves marks against the deck (and, for Weaknesses, the catalog), counting as it goes. */
class Resolver {
  total = 0;
  failed = 0;
  /** The first rule the section broke. Checking carries on, so every name is still counted. */
  reason: RefusalReason | null = null;
  /** The deck's names as printed, full names and faces, for the unmarked-name rule. */
  readonly names: string[];

  constructor(
    private readonly deck: Map<string, Card>,
    private readonly found: Record<string, Card>,
    private readonly catalog: ReadonlyMap<string, Card> | null,
  ) {
    this.names = [...new Set([...deck.values()].flatMap((c) => [c.name, ...c.name.split(" // ")]))];
  }

  refuse(reason: RefusalReason): void {
    this.reason ??= reason;
  }

  /** The deck card a name means, or null. Counts every name checked. */
  deckCard(name: string): Card | null {
    this.total++;
    const card = this.deck.get(normalizeName(name)) ?? null;
    if (card) this.found[normalizeName(name)] = card;
    else this.failed++;
    return card;
  }

  /** Every mark in a text must resolve. The catalog also answers when this resolver has one. */
  marks(text: string): void {
    for (const name of marksIn(text)) {
      const key = normalizeName(name);
      this.total++;
      const card = this.deck.get(key) ?? this.catalog?.get(key);
      if (card) this.found[key] = card;
      else this.failed++;
    }
  }
}

function check(
  section: SectionId,
  run: (r: Resolver) => void,
  deck: Map<string, Card>,
  found: Record<string, Card>,
  catalog: ReadonlyMap<string, Card> | null,
): SectionVerdict {
  const r = new Resolver(deck, found, catalog);
  run(r);
  // EVERY RULE RUNS. A section stops at nothing, so its `failed` / `total` count every name in it
  // and the slot's "N of M cards failed checking" is the section's whole figure. The reason is
  // the first rule broken; a name that failed with no rule broken is `unknown_card`.
  const reason = r.reason ?? (r.failed > 0 ? "unknown_card" : null);
  return reason === null
    ? { section, status: "ok", failed: 0, total: r.total }
    : { section, status: "refused", reason, failed: r.failed, total: r.total };
}

/**
 * The deck names a text states without marking them. Every card name must open the card
 * (brief §3.2), and an unmarked one renders as plain text. Deliberately CONSERVATIVE, because a
 * false hit refuses a whole section: only names of two words or more, matched case-sensitively
 * on word boundaries, so "a forest of tokens" is not `Forest` and "opt out" is not `Opt`.
 */
export function unmarkedNames(text: string, names: readonly string[]): string[] {
  const bare = unmarked(text);
  return names.filter((name) => name.includes(" ") && new RegExp(`(^|[^\\w])${escapeRegExp(name)}($|[^\\w])`).test(bare));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The rules every item of prose keeps, and its marks resolved. */
function prose(r: Resolver, text: string, budget: number): void {
  if (!endsSentence(text)) r.refuse("partial_sentence");
  if (unmarkedNames(text, r.names).length > 0) r.refuse("unmarked_card");
  if (rendered(text).trim().length > budget) r.refuse("over_budget");
  if (strengthClaim(unmarked(text))) r.refuse("strength_claim");
  r.marks(text);
}

function count(r: Resolver, items: readonly unknown[], range: { min: number; max: number }): void {
  if (items.length < range.min || items.length > range.max) r.refuse("wrong_count");
}

/**
 * Checks a reply against the facts it was written from. Returns every section's verdict and the
 * content of the sections that passed.
 */
export function validateSynopsis(
  reply: SynopsisResponse,
  facts: SynopsisFacts,
  catalog: ReadonlyMap<string, Card>,
): CheckedSynopsis {
  const deck = deckNameIndex(facts.cards);
  const categories = new Map(facts.cards.map((c) => [c.oracleId, new Set(c.categories)]));
  const allowedFigures = new Set(facts.figures);
  const found: Record<string, Card> = {};

  const overview = check("overview", (r) => {
    prose(r, reply.overview, CHAR_BUDGETS.overview);
  }, deck, found, null);

  const primer = check("primer", (r) => {
    const { strategy, mulligan, tips } = reply.primer;
    count(r, strategy, SECTION_COUNTS.strategy);
    count(r, mulligan.keep, SECTION_COUNTS.keep);
    count(r, mulligan.sendBack, SECTION_COUNTS.sendBack);
    count(r, tips, SECTION_COUNTS.tips);
    for (const step of strategy) {
      prose(r, step, CHAR_BUDGETS.strategy);
    }
    for (const line of [...mulligan.keep, ...mulligan.sendBack]) {
      prose(r, line, CHAR_BUDGETS.mulligan);
      if (figuresIn(line).some((n) => !allowedFigures.has(n))) r.refuse("uncomputed_figure");
    }
    for (const tip of tips) {
      prose(r, tip.text, CHAR_BUDGETS.tip);
      // A listed name is counted through the marks above when the prose marks it, and below when
      // it does not, so each name counts once.
      if (tip.cards.some((name) => !deck.has(normalizeName(name)))) r.refuse("tip_not_in_deck");
      // The list and the prose must be the same CARDS, compared by what each name resolves to, so
      // `Fire` in the list and `[[Fire // Ice]]` in the prose agree. A tip may not list two and
      // talk about a third.
      const idOf = (name: string) => deck.get(normalizeName(name))?.oracleId ?? `?${normalizeName(name)}`;
      const listedIds = new Set(tip.cards.map(idOf));
      const markedIds = new Set(marksIn(tip.text).map(idOf));
      // A listed name the prose never marks is still a name the tip made, and is counted.
      for (const name of tip.cards) if (!markedIds.has(idOf(name))) r.deckCard(name);
      if (listedIds.size < TIP_MIN_CARDS) r.refuse("tip_too_few_cards");
      if (markedIds.size !== listedIds.size || [...listedIds].some((id) => !markedIds.has(id))) r.refuse("tip_not_in_deck");
    }
  }, deck, found, null);

  const keyCards = check("keyCards", (r) => {
    count(r, reply.keyCards, SECTION_COUNTS.keyCards);
    const seen = new Set<string>();
    for (const k of reply.keyCards) {
      prose(r, k.job, CHAR_BUDGETS.job);
      const card = r.deckCard(k.card);
      if (!card) continue;
      if (seen.has(card.oracleId)) r.refuse("wrong_count");
      seen.add(card.oracleId);
      if (!jobSupported(k, categories.get(card.oracleId) ?? new Set())) r.refuse("job_unsupported");
    }
  }, deck, found, null);

  const weaknesses = check("weaknesses", (r) => {
    count(r, reply.weaknesses, SECTION_COUNTS.weaknesses);
    for (const w of reply.weaknesses) {
      prose(r, w, CHAR_BUDGETS.weakness);
    }
  }, deck, found, catalog);

  const ok = (v: SectionVerdict) => v.status === "ok";
  return {
    verdicts: [overview, primer, keyCards, weaknesses],
    overview: ok(overview) ? reply.overview : null,
    primer: ok(primer) ? reply.primer : null,
    keyCards: ok(keyCards) ? reply.keyCards : null,
    weaknesses: ok(weaknesses) ? reply.weaknesses : null,
    cards: found,
  };
}

/** A job's claims, and its words, stay inside what the app classifies the card as. */
export function jobSupported(k: Pick<KeyCard, "claims" | "job">, held: ReadonlySet<Category>): boolean {
  if (k.claims.some((c) => !held.has(c))) return false;
  const words = unmarked(k.job);
  for (const [category, re] of Object.entries(CATEGORY_WORDS) as [Category, RegExp][]) {
    if (re.test(words) && !held.has(category)) return false;
  }
  return true;
}
