import { createHash } from "node:crypto";

import { z } from "zod";

import { playerText, PLAYER_TEXT_SYSTEM_RULE } from "../model/player-text";
import { READ_REASON_MAX_CHARS, READ_SHORTLIST_SIZE, READ_TOP, READ_WORDS_MAX_CHARS } from "./limits";
import type { Answers } from "./rank";

/**
 * Help me choose's read (rework brief 2026-10-11; plan PR 1). Pure: the two prompts, their reply
 * shapes, the validator, the result the row stores, and the fingerprint that decides a repeat. The
 * loader and the runner live beside it.
 *
 * TWO CALLS, ONE CREDIT (lock 3). The SHORTLIST reads the whole commander list (`pool-list.ts`, the
 * cached prefix) and picks up to `READ_SHORTLIST_SIZE` by key. The JUDGEMENT reads those in full and
 * re-orders up to `READ_TOP` with one reason each.
 *
 * NOTHING THE MODEL RETURNS IS TRUSTED (lock 1). A key counts only when it names a commander in the
 * player's own filtered pool; a judged key only when the shortlist also chose it. A name is never
 * read. The free filters therefore always hold (lock 2): a commander outside them cannot survive.
 *
 * A REASON IS REFUSED, NEVER CUT (handoff "The reason line"; audit F3, F4). Over
 * `READ_REASON_MAX_CHARS` once the deck names are drawn in, or carrying a digit, a `%`, a score word
 * or a rank, the pick is dropped and falls back to its free position; the next one moves up. A read
 * with no valid pick left finds nothing (refunded, lock 7).
 *
 * DECKS BY NUMBER (F5). The judgement is shown the player's decks as `D1`, `D2`..., and names one
 * only as the token `{D1}`. The validator keeps a token only for a deck it was shown, and stores the
 * deck commander's oracle id; the app draws the name. A reason can never put a stray name in front
 * of the player.
 */

/**
 * Folded into the fingerprint, so a prompt change is a new ask and never answers from a result the
 * old prompt wrote. 1 (2026-10-11): the two-step read. 2 (2026-10-11): a named type, keyword or
 * mechanic is a requirement in both steps, and each deck is named at most once. 3 (2026-10-12): a card the
 * player TAGGED in the words is a requirement too: only commanders whose decks run it.
 */
export const THE_READ_PROMPT_VERSION = 3;

/** The free filters the read obeys: every answer but the card, which the box now carries (F1). */
export type ReadFilters = Omit<Answers, "card">;

/** One of the player's decks as the read sees it (lock 6): its commander, a partner, leading themes. */
export type ReadDeck = {
  commanderOracleId: string;
  commander: string;
  partner: string | null;
  themes: readonly string[];
};

/** A commander the shortlist picked, in full, for the judgement (ruling 3). */
export type JudgeCandidate = {
  key: number;
  name: string;
  colors: string;
  typeLine: string | null;
  oracleText: string;
  themes: readonly string[];
  owned: boolean;
  /** How many of the cards its decks run the player owns, inside its identity, and of how many. */
  ownedSupport: number;
  supportTotal: number;
};

/** A card the player's words name, resolved by the free match, as a build-around ask (F1). */
export type ReadCard = { name: string; oracleText: string; runBy: readonly number[]; required?: boolean };

// ---- the shortlist ---------------------------------------------------------------------------

export const shortlistSchema = z.object({
  // No length bound here: the API does not enforce one, so a reply past it would fail the whole
  // shortlist as malformed. `validShortlist` keeps the first `READ_SHORTLIST_SIZE` instead.
  keys: z.array(z.number().int()),
});
export type ShortlistReply = z.infer<typeof shortlistSchema>;

/**
 * A creature type, keyword or mechanic the player names is a requirement, never a mood (Hugh,
 * 2026-10-11): asked for horrors, the eval's shortlist held five commanders that were not Horrors
 * by type, theme or text. Both steps carry it, so a near miss is dropped rather than filled in.
 */
const REQUIREMENT_RULE =
  "A creature type, keyword or mechanic the words name (for instance horrors, Landfall, Elves, proliferate) is a requirement, not a mood: a commander qualifies only if it has it in its creature types or type line, its rules text, or its leading deck themes.";

/**
 * A card the player picked from the card list while writing (a tag) is not a mood either: the request
 * marks it "Required card", and a commander qualifies only if its decks run it (the keys listed under it).
 */
const CARD_REQUIREMENT_RULE =
  "A card the request marks as a required card is a requirement: return only commanders whose decks run it (the keys listed under it), and none if no commander's decks do.";

const SHORTLIST_RULES = [
  "You help a Magic: The Gathering Commander player choose a commander for a new deck.",
  PLAYER_TEXT_SYSTEM_RULE,
  "Below is a list of commanders, one per line: key|name|color identity|creature types|leading deck themes.",
  `Read what the player wrote and return the keys of up to ${READ_SHORTLIST_SIZE} commanders that could best build the deck they describe, best first. Judge each by its name, colors, creature types and themes, and by what you know of the card.`,
  "Return only keys from the list. Obey every filter the request states: a commander outside a filter is never a pick, whatever the words ask.",
  REQUIREMENT_RULE,
  "If only a few commanders have what the words require, return only those; never fill the list with near misses.",
  "If the words name a card to build around, prefer the commanders whose decks run it.",
  CARD_REQUIREMENT_RULE,
  "If nothing in the list fits, return no keys.",
].join("\n");

/** The cached half: the rules and the list. Byte-stable for a given list, so every press shares it. */
export function shortlistSystem(listText: string): string {
  return `${SHORTLIST_RULES}\n\nCommander list:\n${listText}`;
}

/** The filters as the model reads them, one line each, or one line saying there are none. */
export function describeFilters(f: ReadFilters): string[] {
  const lines: string[] = [];
  if (f.colors.length > 0) {
    lines.push(f.match === "exactly"
      ? `Color identity: exactly ${f.colors.join("")}.`
      : `Color identity: includes ${f.colors.join("")}.`);
  }
  if (f.themes.length > 0) lines.push(`Themes (${f.themeJoin === "any" && f.themes.length > 1 ? "any of" : "all of"}): ${f.themes.join(", ")}.`);
  if (f.sets && f.sets.length > 0) lines.push(`Printed in any of these sets: ${f.sets.join(", ")}.`);
  if (f.budgetDollars !== null) lines.push(`Budget: about $${f.budgetDollars} for cards the player does not own.`);
  if (f.bracket !== null) lines.push(`Bracket: ${f.bracket}.`);
  // Not a filter on the commanders (the commander need not be owned): it says where the 99 comes
  // from, which the judgement weighs through the ownership figures it is shown.
  if (f.pool === "own") lines.push("The 99 is built from cards the player owns only; the commander need not be owned.");
  return lines.length > 0 ? lines : ["No filters."];
}

function cardLines(cards: readonly ReadCard[]): string[] {
  return cards.flatMap((c) => [
    `${c.required ? "Required card" : "Card named in the words"}: ${c.name}. Rules text: ${oneLine(c.oracleText)}`,
    c.runBy.length > 0 ? `Commanders whose decks run it (keys): ${c.runBy.join(", ")}.` : "No commander in the list has decks that run it.",
  ]);
}

export function shortlistRequest(args: { words: string; filters: ReadFilters; cards: readonly ReadCard[] }): string {
  return [
    "Filters (each one holds):",
    ...describeFilters(args.filters),
    ...cardLines(args.cards),
    "",
    playerText("What the player wrote", args.words, READ_WORDS_MAX_CHARS),
  ].join("\n");
}

/**
 * The shortlist that counts: keys in the player's pool, each once, in the reply's order, at most
 * `READ_SHORTLIST_SIZE`. A key outside the pool (another color, a commander they have built, one
 * the list never held) is dropped whatever the model meant by it.
 */
/**
 * The commanders a reply may name once the request marked a card required: only those whose decks run it,
 * which are the keys the request listed under it. Held in code and not left to the model following the rule.
 * No required card, the pool as it was.
 */
export function allowedKeys(pool: ReadonlySet<number>, cards: readonly ReadCard[]): ReadonlySet<number> {
  let allowed = pool;
  for (const c of cards) {
    if (!c.required) continue;
    const runs = new Set(c.runBy);
    allowed = new Set([...allowed].filter((k) => runs.has(k)));
  }
  return allowed;
}

export function validShortlist(reply: ShortlistReply, pool: ReadonlySet<number>): number[] {
  const out: number[] = [];
  for (const k of reply.keys) {
    if (pool.has(k) && !out.includes(k)) out.push(k);
    if (out.length === READ_SHORTLIST_SIZE) break;
  }
  return out;
}

// ---- the judgement ---------------------------------------------------------------------------

export const judgeSchema = z.object({
  // Unbounded for the same reason: one long or empty reason, or an eleventh pick, would otherwise
  // fail the whole reply. `validJudgement` refuses that one pick and keeps the top ten (F4).
  picks: z.array(z.object({ key: z.number().int(), reason: z.string() })),
});
export type JudgeReply = z.infer<typeof judgeSchema>;

export const JUDGE_SYSTEM = [
  "You help a Magic: The Gathering Commander player choose a commander for a new deck.",
  PLAYER_TEXT_SYSTEM_RULE,
  `You are given what the player wrote, their own decks, and a shortlist of commanders in full. Choose up to ${READ_TOP} that fit what they wrote, best first, and give each one reason.`,
  "Judge on the rules text, the themes, how much of each commander's deck the player already owns, and how it differs from their decks.",
  "Each reason is one sentence that ties what the commander does, in rules language, to what the player wrote.",
  // The prompt asks for less than the validator allows: replies ran 141 to 160 characters when
  // asked for 140 (eval, 2026-10-11), and an over-long reason is refused, never cut.
  `A reason is at most ${READ_REASON_MAX_CHARS - 20} characters. It never contains a digit, a percentage, a score, a rank, or words like strong, great or best. It never names a card other than the commander.`,
  REQUIREMENT_RULE,
  CARD_REQUIREMENT_RULE,
  "Never keep a pick that lacks what the words require. If only a few qualify, return only those, however few; never fill with near misses.",
  "Name one of the player's decks only when what they wrote asks for something like or unlike what they own, and then only as its token, for instance {D2}. Never write a deck's name or its commander's name yourself.",
  "Each deck token may appear in one reason only: once a reason has used {D2}, no other reason may use {D2}, so name a different deck or none. A reason that repeats a token is thrown away. Never name a deck whose commander shares a name with the pick.",
  "Leave out a commander that does not fit. If none fits, return no picks.",
].join("\n");

function deckLines(decks: readonly ReadDeck[]): string[] {
  if (decks.length === 0) return ["The player has no decks yet."];
  return ["The player's decks:", ...decks.map((d, i) =>
    `D${i + 1}: ${d.commander}${d.partner ? ` and ${d.partner}` : ""}, themes ${d.themes.join(", ") || "none"}`)];
}

function candidateLine(c: JudgeCandidate): string {
  const own = c.owned ? "owned" : "not owned";
  const support = c.supportTotal > 0 ? `player owns ${c.ownedSupport} of the ${c.supportTotal} cards its decks run` : "support unknown";
  return [`${c.key}|${c.name}|${c.colors}|${c.typeLine ?? ""}`, `themes: ${c.themes.join(", ")}`, `${own}; ${support}`, `rules: ${oneLine(c.oracleText)}`].join("\n  ");
}

export function judgeRequest(args: {
  words: string;
  filters: ReadFilters;
  decks: readonly ReadDeck[];
  cards: readonly ReadCard[];
  candidates: readonly JudgeCandidate[];
}): string {
  return [
    "Filters (each one holds):",
    ...describeFilters(args.filters),
    ...cardLines(args.cards),
    "",
    ...deckLines(args.decks),
    "",
    "Shortlist (key|name|colors|type line):",
    ...args.candidates.map(candidateLine),
    "",
    playerText("What the player wrote", args.words, READ_WORDS_MAX_CHARS),
  ].join("\n");
}

/** A reason as the row stores and draws it: text, and decks by their commander's oracle id. */
export type ReasonPart = { text: string } | { deck: string };
export type ReadPick = { oracleId: string; reason: ReasonPart[] };
/** The judgement's picks, in the read's order. */
export type ReadPicks = { picks: ReadPick[] };
/**
 * What a settled read stores (F9e): the picks, and the two counts the panel says (`doneLead`,
 * `emptyLead`): how many commanders the player's pool held, and how many the judgement weighed in
 * full. An empty `picks` found nothing.
 */
export type TheReadResult = ReadPicks & { pool: number; weighed: number };

/**
 * Digits, a percent sign, and the words that make a line read as a score (handoff, F3). Not `top` or
 * `first`, which rules language needs (the top of a library, first strike).
 */
export const SCORE_WORDS = /\b(best|better|good|great(?:est)?|strong(?:er|est)?|solid|perfect(?:ly)?|ideal(?:ly)?|excellent|superb|amazing|awesome|fantastic|score[sd]?|rank(?:ed|s)?|rating|rated|number one)\b/i;
/**
 * Ranking phrases: a choice, pick or place by its ordinal, a runner-up, a number spelled out, joined by
 * whitespace or any hyphen or dash (`second-choice`, `runner\u2011up`). Not a bare `first`, which rules
 * language needs (first strike).
 */
export const RANKS = /\b(?:(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|top)[\s\u2010-\u2015-]+(?:choice|pick|option|place|spot)|runner[\s\u2010-\u2015-]+up|number[\s\u2010-\u2015-]+(?:one|two|three|four|five|six|seven|eight|nine|ten))\b/i;
/** Digits, a percent sign, and stars of any kind, which read as a rating. */
export const FIGURES = /[\p{Nd}%★☆⭐✩✪✫✬✭✮✯]/u;
const DECK_TOKEN = /\{D(\d+)\}/g;

/** A deck's short name for measuring a reason: its commander's name before any comma. */
export function shortName(name: string): string {
  return name.split(",")[0].trim();
}

/**
 * One reason, split into text and deck parts, or null when it is refused: a deck token for no
 * deck shown or for a deck whose commander shares a name with `ownCommander`, a figure or score
 * word anywhere, or a drawn length over the limit. Measured with each
 * deck token drawn as its commander's short name, which is what the reader sees.
 */
export function parseReason(raw: string, decks: readonly ReadDeck[], ownCommander?: string): ReasonPart[] | null {
  const text = raw.trim().replace(/\s+/g, " ");
  const parts: ReasonPart[] = [];
  let drawn = "";
  let last = 0;
  for (const m of text.matchAll(DECK_TOKEN)) {
    const deck = decks[Number(m[1]) - 1];
    if (!deck) return null;
    // A deck led by a commander of the pick's own name reads as the pick itself (Hugh, 2026-10-11).
    if (ownCommander !== undefined && sharesAName(deck, ownCommander)) return null;
    const before = text.slice(last, m.index);
    if (before) parts.push({ text: before });
    parts.push({ deck: deck.commanderOracleId });
    drawn += before + shortName(deck.commander);
    last = (m.index ?? 0) + m[0].length;
  }
  const tail = text.slice(last);
  if (tail) parts.push({ text: tail });
  drawn += tail;
  // The figure test runs on the model's own words, never on a drawn deck name, which may hold one.
  const own = parts.map((p) => ("text" in p ? p.text : " ")).join("");
  if (/[{}]/.test(own) || FIGURES.test(own) || SCORE_WORDS.test(own) || RANKS.test(own)) return null;
  if (namesADeck(own, decks, ownCommander)) return null;
  if (drawn.length === 0 || drawn.length > READ_REASON_MAX_CHARS) return null;
  return parts;
}

/**
 * Whether a deck's commander or partner shares a name with `commander`: either one's short name is a
 * whole-word part of the other's full name (`Edgar, Charmed Groom` and `Edgar Markov`).
 */
function sharesAName(deck: ReadDeck, commander: string): boolean {
  const ownFull = wordForm(commander);
  const ownShort = wordForm(shortName(commander));
  return [deck.commander, deck.partner].some((name) =>
    name !== null && (wordForm(name).includes(ownShort) || ownFull.includes(wordForm(shortName(name)))));
}

/**
 * Whether the model wrote a deck's commander or partner by name instead of its token (F5): only a
 * token is checked against the decks shown. Matched on the short name as a whole word, except where
 * it is the pick's own short name, which a reason may use for the commander it is about.
 */
function namesADeck(text: string, decks: readonly ReadDeck[], ownCommander?: string): boolean {
  const said = wordForm(text);
  const own = ownCommander ? wordForm(shortName(ownCommander)) : null;
  return decks.some((d) => [d.commander, d.partner].some((name) => {
    if (!name) return false;
    // The pick's own name is allowed in either form; any other deck's, in neither.
    const full = wordForm(name);
    const short = wordForm(shortName(name));
    const isOwn = ownCommander !== undefined && full === wordForm(ownCommander);
    return (!isOwn && said.includes(full)) || (short !== own && said.includes(short));
  }));
}

/**
 * Text as space-padded lower-case words, so `includes` matches whole words only. Apostrophes of
 * every form are dropped, after a possessive `'s`, so `K’rrik's deck` reads as `krrik deck` and
 * matches the name `K'rrik`.
 */
function wordForm(text: string): string {
  const plain = text.toLowerCase().replace(/[\u2018\u2019\u02bc`]/g, "'").replace(/'s\b/g, "").replace(/'/g, "");
  return ` ${plain.replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
}

/**
 * The judgement that counts: picks the shortlist chose, each once, with a reason that passes, in
 * the reply's order, at most `READ_TOP`. A refused pick is dropped and the next moves up (F4).
 */
export function validJudgement(args: {
  reply: JudgeReply;
  shortlist: readonly number[];
  idOf: ReadonlyMap<number, string>;
  decks: readonly ReadDeck[];
  /** Each key's commander name, so a reason may name its own commander though it shares a deck's. */
  nameOf?: ReadonlyMap<number, string>;
}): ReadPicks {
  const allowed = new Set(args.shortlist);
  const seen = new Set<number>();
  // Each deck is named at most once across the list (Hugh, 2026-10-11): a reason naming one an
  // earlier pick already named, or naming one twice, is refused like any other.
  const named = new Set<string>();
  const picks: ReadPick[] = [];
  for (const p of args.reply.picks) {
    if (picks.length === READ_TOP) break;
    if (!allowed.has(p.key) || seen.has(p.key)) continue;
    const oracleId = args.idOf.get(p.key);
    const reason = parseReason(p.reason, args.decks, args.nameOf?.get(p.key));
    if (!oracleId || !reason) continue;
    const decks = reason.flatMap((r) => ("deck" in r ? [r.deck] : []));
    if (new Set(decks).size < decks.length || decks.some((d) => named.has(d))) continue;
    for (const d of decks) named.add(d);
    seen.add(p.key);
    picks.push({ oracleId, reason });
  }
  return { picks };
}

/**
 * The free list re-ordered (ruling 4): the read's picks first in its order, then every other row in
 * its free order. Rows are never added or removed, so a filter can never be loosened here.
 */
export function reorder<T>(rows: readonly T[], idOf: (row: T) => string, result: ReadPicks): T[] {
  const byId = new Map(rows.map((r) => [idOf(r), r]));
  const first = result.picks.flatMap((p) => byId.get(p.oracleId) ?? []);
  const taken = new Set(first.map(idOf));
  return [...first, ...rows.filter((r) => !taken.has(idOf(r)))];
}

// ---- the repeat --------------------------------------------------------------------------------

/**
 * The ask's identity (lock 7, widened): a repeat answers from the store only when everything the
 * answer depends on is the same. The words in a normalized form, every filter, the prompt version,
 * the commander list's generation (catalog and index), the player's pool, their collection and their
 * decks. Any one moving is a new ask.
 */
export function readFingerprint(args: {
  words: string;
  filters: ReadFilters;
  listGeneration: string;
  /** The pool's oracle ids; order does not matter. */
  pool: readonly string[];
  /** A digest of the cards the player owns (`collectionDigest`). */
  collection: string;
  decks: readonly ReadDeck[];
  /** The oracle ids of cards the player tagged in the words; order does not matter. */
  tagged?: readonly string[];
}): string {
  const f = args.filters;
  return createHash("sha256").update(JSON.stringify([
    "the-read", THE_READ_PROMPT_VERSION,
    args.words.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(),
    [...f.colors].sort(), f.match, [...f.themes].sort(), f.themeJoin ?? "all", [...(f.sets ?? [])].sort(), f.pool ?? "any",
    f.budgetDollars, f.bracket,
    args.listGeneration,
    [...args.pool].sort(),
    args.collection,
    args.decks.map((d) => [d.commanderOracleId, d.partner, [...d.themes]]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    [...(args.tagged ?? [])].sort(),
  ])).digest("hex");
}

/** Rules text on one line, as the prompts carry it. */
function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " / ").trim();
}
