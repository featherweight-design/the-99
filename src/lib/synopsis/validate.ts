import { CHAR_BUDGETS, SECTION_COUNTS, TIP_MIN_CARDS } from "./limits";
import { deckNameIndex, normalizeName, type SynopsisFacts } from "./facts";
import type { SynopsisResponse } from "./response-schema";
import type { Category, CheckedSynopsis, KeyCard, RefusalReason, SectionId, SectionVerdict } from "./types";

/**
 * The synopsis accept contract (brief §2, §5, §6). Pure. Every rule is the app's own check: the
 * schema guarantees the reply's shape and nothing about its truth.
 *
 * PROSE FAILS WHOLE; A LIST DROPS THE LINE (contract A, Hugh 2026-09-24). The overview and the
 * primer's strategy steps are refused whole on any failing sentence. In the list sections (the
 * mulligan lines, tips, Key cards and weaknesses) a failing line is dropped, and the section still
 * renders when what survives keeps `SECTION_COUNTS`' minimum. Either way nothing renders a partial
 * sentence or a line that failed (`STATES-synopsis.md`), and a refused section's content is not
 * returned. The sections stand on their own checks, which is what lets the modal show the passing
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

/**
 * The deck's colors written as mana letters (Hugh, 2026-09-24: 6 of 15 overviews said "RG" where
 * the app says "Gruul"). NARROW on purpose, because a false hit drops a line or refuses prose:
 * only an UPPERCASE, word-bounded run of two to five distinct WUBRG letters that is exactly the
 * deck's own identity, read outside card marks and outside quotation. So a set code or an
 * abbreviation that happens to be two colour letters reads as prose unless it IS the deck's
 * colours, and lowercase, a run inside a word, and quoted rules text never trip it.
 */
export function manaLetters(text: string, identity: readonly string[]): string[] {
  if (identity.length < 2) return [];
  const own = [...identity].sort().join("");
  // Double quotes pair anywhere; a single quote only where it stands at a word's edge on both
  // sides (any non-word character, a dash or a slash included), so an apostrophe inside a word
  // ("deck's", "don't") never opens or closes a quotation.
  const outside = unmarked(text)
    .replace(/["\u201c][^"\u201d]*["\u201d]/g, " ")
    .replace(/(^|[^\w'\u2018\u2019])['\u2018][^'\u2018\u2019]*['\u2019](?![\w])/g, "$1 ");
  return [...outside.matchAll(/\b([WUBRG]{2,5})\b/g)]
    .map((m) => m[1])
    .filter((run) => new Set(run).size === run.length && [...run].sort().join("") === own);
}

const COUNT_WORD = "(?:\\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)";
const LAND_COUNT = [
  // A space or a hyphen between the count and the word: "2 lands", "a one-land hand".
  new RegExp(`\\b${COUNT_WORD}(?:\\s+(?:to|or)\\s+${COUNT_WORD})?(?:\\s+or\\s+more)?(?:\\s+|-)(?:total\\s+)?lands?\\b`, "i"),
  /\bno lands?\b/i,
  /\blandless\b/i,
  /\ball[- ]spells?\b/i,
];

/**
 * A Mulligan line stating a land count (Hugh, 2026-09-24: 56% of lines restated the range). The
 * app now draws the range itself as a fixed line, so any count here repeats it: a figure next to
 * "land(s)" (spaced or hyphenated), "no lands", "landless" or an all-spell hand. Read outside card marks. Against the eval harness's
 * 82 tagged lines it agrees with the REDUNDANT tag on 71.
 */
export function statesLandCount(text: string): boolean {
  const bare = unmarked(text);
  return LAND_COUNT.some((re) => re.test(bare));
}

/**
 * A Mulligan line that puts the commander IN the opening hand, which it never is: it starts in the
 * command zone. Only a hand HOLDING it ("with [[Kratos]]", "[[Kratos]] in hand"); naming the
 * commander as a thing to cast ("hands that can cast [[Yuriko]] soon") is fine.
 */
export function commanderInHand(text: string, commanders: readonly string[]): boolean {
  return commanders.some((name) => {
    const mark = `\\[\\[${escapeRegExp(name)}\\]\\]`;
    // Anywhere in the list a hand is said to hold: "with [[Sol Ring]] and [[Kratos]]" holds both.
    const held = `(?:\\[\\[[^\\]]+\\]\\],?\\s+(?:(?:and|or|plus)\\s+)?)*`;
    return new RegExp(`\\b(?:with|holding|containing|includes?|including|has)\\s+${held}${mark}`, "i").test(text)
      || new RegExp(`\\[\\[${escapeRegExp(name)}\\]\\]\\s+in\\s+(?:your\\s+|the\\s+|an?\\s+)?(?:opening\\s+)?hand`, "i").test(text);
  });
}

/** A Mulligan line opening with its heading's own word, which the box already says. */
export function headingPrefix(text: string): boolean {
  return /^\s*(?:keep|send(?:\s+it)?\s+back|mulligan)\b/i.test(text);
}

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
  /** The commanders' names, checked by that rule whatever their length. */
  commanders: string[] = [];
  /** The deck's identity letters, for the mana-letter rule. */
  identity: string[] = [];

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

/** One line's own check: its reason, its name counts and the marks it resolved. */
type LineResult = { reason: RefusalReason | null; failed: number; total: number; found: Record<string, Card> };

function lineCheck(
  run: (r: Resolver) => void,
  deck: Map<string, Card>,
  catalog: ReadonlyMap<string, Card> | null,
  commanders: string[],
  identity: string[],
): LineResult {
  const found: Record<string, Card> = {};
  const r = new Resolver(deck, found, catalog);
  r.commanders = commanders;
  r.identity = identity;
  run(r);
  // EVERY RULE RUNS, so the line's `failed` / `total` count every name in it. The reason is the
  // first rule broken; a name that failed with no rule broken is `unknown_card`.
  const reason = r.reason ?? (r.failed > 0 ? "unknown_card" : null);
  return { reason, failed: r.failed, total: r.total, found };
}

/**
 * A section built from its lines. `whole` lines must all pass (prose: the overview, the strategy
 * steps); a `list` drops a failing line and passes when its survivors keep the list's minimum
 * (contract A, Hugh 2026-09-24). A list past its MAXIMUM is refused whole, since the reply was then
 * told something it ignored, and names `wrong_count` whatever its lines did: fixing a bad line
 * would still leave the list too long, so the count is what the repair has to fix. A list under
 * its minimum names its first failing line's reason, or `wrong_count` when every line passed.
 */
function section<T>(
  id: SectionId,
  parts: ({ kind: "whole"; lines: LineResult[]; range?: { min: number; max: number } }
    | { kind: "list"; items: T[]; lines: LineResult[]; range: { min: number; max: number }; truncate?: boolean })[],
  found: Record<string, Card>,
): { verdict: SectionVerdict; kept: T[][] } {
  let total = 0;
  let failed = 0;
  let reason: RefusalReason | null = null;
  const kept: T[][] = [];
  for (const part of parts) {
    for (const l of part.lines) {
      total += l.total;
      failed += l.failed;
    }
    const firstFail = part.lines.find((l) => l.reason !== null)?.reason ?? null;
    if (part.kind === "whole") {
      if (part.range && (part.lines.length < part.range.min || part.lines.length > part.range.max)) reason ??= "wrong_count";
      if (firstFail) reason ??= firstFail;
      kept.push([]);
    } else {
      const survivors = part.items.filter((_, i) => part.lines[i].reason === null);
      // A `truncate` list is offered more candidates than it renders (contract 8's weaknesses): the
      // survivors beyond the maximum are cut, not refused.
      if (part.items.length > part.range.max && !part.truncate) reason ??= "wrong_count";
      else if (survivors.length < part.range.min) reason ??= firstFail ?? "wrong_count";
      kept.push(part.truncate ? survivors.slice(0, part.range.max) : survivors);
    }
  }
  if (reason !== null) return { verdict: { section: id, status: "refused", reason, failed, total }, kept };
  // Only what renders resolves: a dropped line's marks never reach the stored card map.
  for (const part of parts) {
    part.lines.forEach((l) => {
      if (l.reason === null) Object.assign(found, l.found);
    });
  }
  return { verdict: { section: id, status: "ok", failed: 0, total }, kept };
}

/**
 * The deck names a text states without marking them. Every card name must open the card
 * (brief §3.2), and an unmarked one renders as plain text. Deliberately CONSERVATIVE, because a
 * false hit refuses a line: names of two words or more, plus the COMMANDERS' names whatever their
 * length (the name a synopsis repeats most, and a proper noun rather than a word), matched
 * case-sensitively on word boundaries, so "a forest of tokens" is not `Forest` and "opt out" is
 * not `Opt`. Other one-word names are asked for by the prompt and not checked.
 */
export function unmarkedNames(text: string, names: readonly string[], always: readonly string[] = []): string[] {
  const bare = unmarked(text);
  return names.filter((name) => (name.includes(" ") || always.includes(name)) && new RegExp(`(^|[^\\w])${escapeRegExp(name)}($|[^\\w])`).test(bare));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyExtra(r: Resolver, checks: (RefusalReason | null)[] | undefined, i: number): void {
  const reason = checks?.[i];
  if (reason) r.refuse(reason);
}

/** The rules every item of prose keeps, and its marks resolved. */
function prose(r: Resolver, text: string, budget: number): void {
  if (!endsSentence(text)) r.refuse("partial_sentence");
  // An unmarked name is a name the line states and fails to check, so it counts in the figure.
  const bare = unmarkedNames(text, r.names, r.commanders);
  r.total += bare.length;
  r.failed += bare.length;
  if (bare.length > 0) r.refuse("unmarked_card");
  if (rendered(text).trim().length > budget) r.refuse("over_budget");
  if (strengthClaim(unmarked(text))) r.refuse("strength_claim");
  if (manaLetters(text, r.identity).length > 0) r.refuse("mana_letters");
  r.marks(text);
}

/**
 * Extra refusals decided before validation by checks that need more than the reply's text
 * (contract 8: evidence refs, keyword and edict claims, the non-weakness guard). One entry per line
 * of the section, `null` for a line that passed. Applied after the line's own rules, so the first
 * rule broken is still the reason.
 */
export type LineChecks = {
  overview?: (RefusalReason | null)[];
  strategy?: (RefusalReason | null)[];
  keep?: (RefusalReason | null)[];
  sendBack?: (RefusalReason | null)[];
  tips?: (RefusalReason | null)[];
  keyCards?: (RefusalReason | null)[];
  weaknesses?: (RefusalReason | null)[];
};

/**
 * Checks a reply against the facts it was written from. Returns every section's verdict and the
 * content that renders: a passing section with its failing list lines dropped (contract A).
 */
export function validateSynopsis(
  reply: SynopsisResponse,
  facts: SynopsisFacts,
  catalog: ReadonlyMap<string, Card>,
  extra: LineChecks = {},
  /** Contract 8: the weaknesses arrive as ranked candidates, of which only the maximum render. */
  truncateWeaknesses = false,
): CheckedSynopsis {
  const deck = deckNameIndex(facts.cards);
  const categories = new Map(facts.cards.map((c) => [c.oracleId, new Set(c.categories)]));
  const allowedFigures = new Set(facts.figures);
  const universal = new Set(facts.cards.filter((c) => c.universalStaple).map((c) => c.oracleId));
  const found: Record<string, Card> = {};
  const line = (run: (r: Resolver) => void, cat: ReadonlyMap<string, Card> | null = null) =>
    lineCheck(run, deck, cat, facts.commanders, facts.identity);

  const overview = section("overview", [
    { kind: "whole", lines: [line((r) => { prose(r, reply.overview, CHAR_BUDGETS.overview); applyExtra(r, extra.overview, 0); })] },
  ], found);

  const { strategy, mulligan, tips } = reply.primer;
  const mulliganLine = (key: "keep" | "sendBack") => (text: string, i: number) => line((r) => {
    prose(r, text, CHAR_BUDGETS.mulligan);
    if (figuresIn(text).some((n) => !allowedFigures.has(n))) r.refuse("uncomputed_figure");
    if (statesLandCount(text)) r.refuse("land_count");
    if (commanderInHand(text, facts.commanders)) r.refuse("commander_in_hand");
    if (headingPrefix(text)) r.refuse("heading_prefix");
    applyExtra(r, extra[key], i);
  });
  const tipLine = (tip: SynopsisResponse["primer"]["tips"][number], i: number) => line((r) => {
    prose(r, tip.text, CHAR_BUDGETS.tip);
    // Contract 8's own checks first, so a tip citing nothing is named for that and not for the
    // too-few-cards rule it then also breaks.
    applyExtra(r, extra.tips, i);
    // A listed name is counted through the marks above when the prose marks it, and below when it
    // does not, so each name counts once.
    if (tip.cards.some((name) => !deck.has(normalizeName(name)))) r.refuse("tip_not_in_deck");
    // The list and the prose must be the same CARDS, compared by what each name resolves to, so
    // `Fire` in the list and `[[Fire // Ice]]` in the prose agree. A tip may not list two and talk
    // about a third.
    const idOf = (name: string) => deck.get(normalizeName(name))?.oracleId ?? `?${normalizeName(name)}`;
    const listedIds = new Set(tip.cards.map(idOf));
    const markedIds = new Set(marksIn(tip.text).map(idOf));
    // A listed name the prose never marks is still a name the tip made, and is counted.
    for (const name of tip.cards) if (!markedIds.has(idOf(name))) r.deckCard(name);
    if (listedIds.size < TIP_MIN_CARDS) r.refuse("tip_too_few_cards");
    if (markedIds.size !== listedIds.size || [...listedIds].some((id) => !markedIds.has(id))) r.refuse("tip_not_in_deck");
  });
  const primer = section<unknown>("primer", [
    { kind: "whole", lines: strategy.map((step, i) => line((r) => { prose(r, step, CHAR_BUDGETS.strategy); applyExtra(r, extra.strategy, i); })), range: SECTION_COUNTS.strategy },
    { kind: "list", items: mulligan.keep, lines: mulligan.keep.map(mulliganLine("keep")), range: SECTION_COUNTS.keep },
    { kind: "list", items: mulligan.sendBack, lines: mulligan.sendBack.map(mulliganLine("sendBack")), range: SECTION_COUNTS.sendBack },
    { kind: "list", items: tips, lines: tips.map(tipLine), range: SECTION_COUNTS.tips },
  ], found);

  // A Key card whose card an earlier PASSING line already named is a duplicate, and fails as one:
  // the card is shown once, with the first job that checked out.
  const named = new Set<string>();
  const keyLines = reply.keyCards.map((k, i) => line((r) => {
    prose(r, k.job, CHAR_BUDGETS.job);
    applyExtra(r, extra.keyCards, i);
    const card = r.deckCard(k.card);
    if (!card) return;
    if (!jobSupported(k, categories.get(card.oracleId) ?? new Set())) r.refuse("job_unsupported");
    if (universal.has(card.oracleId)) r.refuse("universal_staple");
    if (r.reason === null && r.failed === 0) {
      if (named.has(card.oracleId)) r.refuse("wrong_count");
      named.add(card.oracleId);
    }
  }));
  const keyCards = section("keyCards", [
    { kind: "list", items: reply.keyCards, lines: keyLines, range: SECTION_COUNTS.keyCards },
  ], found);

  const weaknesses = section("weaknesses", [
    { kind: "list", items: reply.weaknesses, lines: reply.weaknesses.map((w, i) => line((r) => { prose(r, w, CHAR_BUDGETS.weakness); applyExtra(r, extra.weaknesses, i); }, catalog)), range: SECTION_COUNTS.weaknesses, truncate: truncateWeaknesses },
  ], found);

  const ok = (v: SectionVerdict) => v.status === "ok";
  const [, keep, sendBack, keptTips] = primer.kept;
  return {
    verdicts: [overview.verdict, primer.verdict, keyCards.verdict, weaknesses.verdict],
    lands: { keep: facts.keep, sendBack: facts.sendBack },
    overview: ok(overview.verdict) ? reply.overview : null,
    primer: ok(primer.verdict)
      ? { strategy, mulligan: { keep: keep as string[], sendBack: sendBack as string[] }, tips: keptTips as SynopsisResponse["primer"]["tips"] }
      : null,
    keyCards: ok(keyCards.verdict) ? keyCards.kept[0] : null,
    weaknesses: ok(weaknesses.verdict) ? weaknesses.kept[0] : null,
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
