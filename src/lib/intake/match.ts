import { singularForms } from "../edhrec/tag-kinds";

/**
 * The free match (brief §2 ruling 3, §3.0): the player's own words, turned into answer chips at no
 * cost. Pure: the theme vocabulary and the catalog's names come in as a `PhraseIndex` the caller
 * builds once.
 *
 * WHAT IT MATCHES, and nothing else:
 *  - a theme tag's label, exactly, or one of its singular forms (`dinosaur` for `Dinosaurs`);
 *  - a commander-legal card's name from the whole catalog, or one face of a two-faced card;
 *  - a dollar figure (`$200`, `200 dollars`, `150 bucks`) as the budget;
 *  - `bracket N` for N from 1 to 5.
 * Every other word is either a STOP WORD, which is dropped silently, or LEFTOVER, which the player
 * is shown and may hand to Look deeper. A word is never guessed at.
 *
 * THE LONGEST PHRASE WINS, scanning left to right, so `Doubling Season` is a card and not the theme
 * `Seasons`-anything. When one phrase names both a theme and a card, the theme wins: the intake asks
 * what the deck is about, and a card chip can still be added by name.
 *
 * THEMES JOINED BY "OR" ARE ANY OF (three-answers addendum §1). Two themes in one phrase with an
 * "or" between them, *Orcs, Elves, Dwarves, or Wizards*, read as any of; commas and "and" read as
 * all of. There is one join for every theme, so a single "or" between any two makes it any. A clause
 * mark other than a comma, or any word that is not a stop word, ends the phrase.
 *
 * SETS (addendum §2): a set's NAME matches anywhere, after a theme or a card sharing its words. A set's CODE matches only typed in
 * capitals (`HOB`), or in lower case beside "set" or "sets" when it holds a digit (`m21 set`):
 * `all`, `big`, `one`, `war`, `who`, `ice` and `mid` are all codes, and "a big deck from all sets"
 * names no set. A set's name, at any length, needs a capital on one of its words.
 * The words "set" and "sets" beside a matched set are used, not left over.
 *
 * A ONE-WORD CARD NAME MATCHES ONLY WHEN TYPED WITH A CAPITAL. The catalog holds `Fog`, `Opt`,
 * `Shock` and `Island`, and "a fog of a deck" is not a request for a build-around card. A name of two
 * or more words is specific enough on its own. The loader leaves basic lands out entirely.
 */
export type Chip =
  | { kind: "theme"; slug: string; label: string }
  | { kind: "card"; oracleId: string; name: string }
  /** A set, lower-case code as `printings` stores it. */
  | { kind: "set"; code: string; name: string }
  /** The 99 from the player's own cards (addendum §3). */
  | { kind: "pool" }
  | { kind: "budget"; dollars: number }
  | { kind: "bracket"; bracket: 1 | 2 | 3 | 4 | 5 };

export type MatchResult = {
  /** In the order they were typed, each at most once. */
  chips: Chip[];
  /** The words that matched nothing and are not stop words, in the order typed. */
  leftover: string[];
  /**
   * The same leftovers as the player wrote them, for *Not used*: each run of unmatched words
   * between a match, a figure or a clause break, copied verbatim from the text, with stop words
   * trimmed from its two ends. A run of stop words alone is no phrase.
   */
  phrases: string[];
  /** How the words join their themes: "any" only for themes an "or" joins in one phrase. */
  themeJoin: "all" | "any";
};

type Target =
  | { kind: "theme"; slug: string; label: string }
  | { kind: "card"; oracleId: string; name: string }
  | { kind: "set"; code: string; name: string };

export type PhraseIndex = {
  /** Keyed by `phraseKey`. A theme and a card may share a key; the theme is listed first. */
  targets: Map<string, Target[]>;
  /** The longest key in words, so the scan never tries a span no key can have. */
  maxWords: number;
  /** Every card the index was built from: the cards the intake can offer as an answer. */
  cardIds: ReadonlySet<string>;
  /** Every set by its lower-case code, for the code pass. */
  setCodes: ReadonlyMap<string, { code: string; name: string }>;
};

/**
 * Engineering owns these (plan, PR 2). Function words, and the words a player uses to talk ABOUT a
 * deck rather than to say what it is. They carry no answer, so an intake of nothing but these has
 * no leftover and offers no deeper read.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "without", "from",
  "by", "about", "around", "into", "that", "this", "these", "those", "it", "its", "is", "are", "be",
  "i", "i'm", "im", "me", "my", "we", "our", "you", "your", "some", "any", "lots", "lot", "more", "most",
  "very", "really", "just", "like", "love", "want", "wanna", "would", "i'd", "id", "please", "something",
  "maybe", "kind", "sort", "type", "style", "deck", "decks", "commander", "commanders", "build", "built",
  "building", "play", "plays", "playing", "cards", "card", "based", "under", "below", "less", "than",
  "max", "maximum", "budget", "cheap", "around", "roughly", "approximately", "up", "so", "too", "also",
  "that's", "thats", "which", "what", "who", "where", "when", "how", "all", "can", "could", "should",
  "do", "does", "have", "has", "use", "uses", "using", "focused", "focus", "theme", "themed", "strategy",
]);

/** The words of a phrase, in the one form the input and the index are both compared in. */
export function phraseWords(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/æ/gi, "ae")
    .replace(/[‘’ʼ]/g, "'")
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length > 0);
}

export const phraseKey = (text: string): string => phraseWords(text).join(" ");

/**
 * The phrases the scan looks for. Themes first, so a key both carry resolves to the theme. A face
 * name shared by two cards is left out, since it could mean either; a full name always wins over a
 * face.
 */
export function buildPhraseIndex(
  themes: readonly { slug: string; label: string }[],
  cards: readonly { oracleId: string; name: string }[],
  sets: readonly { code: string; name: string }[] = [],
): PhraseIndex {
  const targets = new Map<string, Target[]>();
  const add = (key: string, t: Target) => {
    if (key.length === 0) return;
    const list = targets.get(key) ?? [];
    if (!list.some((x) => sameTarget(x, t))) list.push(t);
    targets.set(key, list);
  };
  for (const t of themes) {
    for (const form of new Set([t.label.toLowerCase(), ...singularForms(t.label)])) {
      add(phraseKey(form), { kind: "theme", slug: t.slug, label: t.label });
    }
  }
  const full = new Set<string>();
  for (const c of cards) {
    const key = phraseKey(c.name);
    full.add(key);
    add(key, { kind: "card", oracleId: c.oracleId, name: c.name });
  }
  const faces = new Map<string, { oracleId: string; name: string } | null>();
  for (const c of cards) {
    const parts = c.name.split(" // ");
    if (parts.length < 2) continue;
    for (const part of parts) {
      const key = phraseKey(part);
      if (full.has(key)) continue;
      const seen = faces.get(key);
      faces.set(key, seen === undefined || seen?.oracleId === c.oracleId ? { oracleId: c.oracleId, name: c.name } : null);
    }
  }
  for (const [key, c] of faces) if (c) add(key, { kind: "card", oracleId: c.oracleId, name: c.name });
  // Last, so a theme or a card sharing a set's words keeps them.
  for (const s of sets) add(phraseKey(s.name), { kind: "set", code: s.code.toLowerCase(), name: s.name });

  let maxWords = 0;
  for (const key of targets.keys()) maxWords = Math.max(maxWords, key.split(" ").length);
  return {
    targets,
    maxWords,
    cardIds: new Set(cards.map((c) => c.oracleId)),
    setCodes: new Map(sets.map((s) => [s.code.toLowerCase(), { code: s.code.toLowerCase(), name: s.name }])),
  };
}

/**
 * The 99 from cards the player owns (addendum §3): a fixed list of phrasings, engineering's to
 * keep. Matched before the word scan, like the figures, so their words never reach it. A phrase
 * followed by a buying clause (*what I have to buy*) is the opposite ask, so it never matches.
 */
const OWN_ONLY =
  /\b(?:(?:only|just|using|with|from)\s+)?(?:(?:the\s+)?cards?\s+(?:that\s+)?i\s+(?:already\s+)?(?:own|have)|(?:from\s+)?my\s+(?:own\s+)?(?:collection|cards)|what\s+i\s+(?:already\s+)?(?:own|have))\b(?!\s+to\s+(?:buy|purchase|get|order|pick\s+up)\b)/gi;
/**
 * Said beside own-only, and already the default: the commander is listed owned or not. Absorbed,
 * so it is neither an answer nor under *Not used*.
 */
const COMMANDER_MAY_BE_BOUGHT =
  /\b(?:the\s+)?commander\s+can\s+be\s+(?:one|something|a\s+card)\s+(?:that\s+)?(?:i|we)(?:'d|\s+would)?\s+(?:(?:have|need)\s+to\s+)?(?:buy|purchase)\b|\b(?:the\s+)?commander\s+can\s+be\s+(?:one|something)\s+(?:that\s+)?(?:i|we)\s+(?:don't|do\s+not)\s+own\b/gi;

// `$200`, `$1,500`, `$49.99`, `200$`, `200 dollars`, `150 bucks`, `300 usd`.
const DOLLARS = /\$\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s?(?:\$|dollars?\b|bucks?\b|usd\b)/gi;
const BRACKET = /\bbracket\s*#?\s*([1-5])\b/gi;

export function matchWords(text: string, index: PhraseIndex): MatchResult {
  const chips: Chip[] = [];
  const push = (chip: Chip) => {
    if (!chips.some((c) => sameChip(c, chip))) chips.push(chip);
  };

  // The figures come out first, by character range, so their digits and units never reach the word
  // scan. What is left is the same text with those ranges blanked, so word positions stay put.
  let rest = text;
  const blank = (start: number, end: number) => {
    rest = rest.slice(0, start) + " ".repeat(end - start) + rest.slice(end);
  };
  const found: { at: number; chip: Chip }[] = [];
  for (const m of text.matchAll(BRACKET)) {
    found.push({ at: m.index, chip: { kind: "bracket", bracket: Number(m[1]) as 1 | 2 | 3 | 4 | 5 } });
    blank(m.index, m.index + m[0].length);
  }
  for (const m of rest.matchAll(DOLLARS)) {
    const figure = Number((m[1] ?? m[2]).replace(/,/g, ""));
    // Tested before rounding: $0.60 is not a dollar, and rounding first would make it one.
    if (!Number.isFinite(figure) || figure < 1) continue;
    const dollars = Math.round(figure);
    found.push({ at: m.index, chip: { kind: "budget", dollars } });
    blank(m.index, m.index + m[0].length);
  }

  // Own-only, then the phrase it absorbs, on what the figures left.
  for (const m of rest.matchAll(OWN_ONLY)) {
    found.push({ at: m.index, chip: { kind: "pool" } });
    blank(m.index, m.index + m[0].length);
  }
  for (const m of rest.matchAll(COMMANDER_MAY_BE_BOUGHT)) blank(m.index, m.index + m[0].length);

  // The word scan, over the raw spans so a one-word card name can be tested for its capital.
  const words = [...rest.matchAll(/[^\s]+/g)].flatMap((m) =>
    phraseWords(m[0]).map((w) => ({ word: w, raw: m[0], at: m.index })),
  );
  const consumed = new Array<boolean>(words.length).fill(false);
  // Word indexes where each theme match starts and ends, for the join between them.
  const themeSpans: [number, number][] = [];
  // The last word of each set NAME the scan matched, so its own "set(s)" can be used after it.
  const setEnds = new Set<number>();
  for (let i = 0; i < words.length; i++) {
    for (let n = Math.min(index.maxWords, words.length - i); n >= 1; n--) {
      const key = words.slice(i, i + n).map((w) => w.word).join(" ");
      const capitalAt = (k: number) => /^\p{Lu}/u.test(words[k].raw.replace(/^[^\p{L}\p{N}]+/u, ""));
      const target = (index.targets.get(key) ?? []).find((t) =>
        t.kind === "theme"
        // A set is a proper name at any length: `game night` and `the list` are words, `Game
        // Night` and `The List` are sets. Some word in the span must carry its capital.
        || (t.kind === "set" ? Array.from({ length: n }, (_, d) => i + d).some(capitalAt) : n > 1 || capitalAt(i)));
      if (!target) continue;
      found.push({ at: words[i].at, chip: target });
      if (target.kind === "theme") themeSpans.push([i, i + n - 1]);
      if (target.kind === "set") setEnds.add(i + n - 1);
      for (let k = i; k < i + n; k++) consumed[k] = true;
      i += n - 1;
      break;
    }
  }

  // Set codes, on what the phrase scan left: in capitals, or beside "set(s)" (see the header).
  const SET_WORD = /^sets?$/;
  const JOINS = new Set(["or", "and"]);
  const nearSetWord = (k: number, dir: 1 | -1) => {
    for (let j = k + dir; j >= 0 && j < words.length; j += dir) {
      if (SET_WORD.test(words[j].word)) return j;
      const w = words[j].word;
      if (!(JOINS.has(w) || index.setCodes.has(w))) return -1;
    }
    return -1;
  };
  for (let k = 0; k < words.length; k++) {
    if (consumed[k]) continue;
    const set = index.setCodes.get(words[k].word);
    if (!set) continue;
    const bare = words[k].raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    const capitals = /^[A-Z0-9]+$/.test(bare) && /[A-Z]/.test(bare);
    // In lower case only a code no one would type as a word counts beside "set(s)": one with a
    // digit (`m21 set`). A letters-only code is an English word as often as a set (`all sets`,
    // `one set`, `the big set`), and a set read in error cuts the results to that one set.
    const wordlike = /^[a-z]+$/.test(bare);
    const after = capitals || wordlike ? -1 : nearSetWord(k, 1);
    const before = capitals || wordlike || after >= 0 ? -1 : nearSetWord(k, -1);
    if (!capitals && after < 0 && before < 0) continue;
    // Capitals: the word "set(s)" beside the codes is still theirs.
    const own = capitals ? nearSetWord(k, 1) : -1;
    if (own >= 0) consumed[own] = true;
    found.push({ at: words[k].at, chip: { kind: "set", code: set.code, name: set.name } });
    consumed[k] = true;
    for (const j of [after, before]) if (j >= 0) consumed[j] = true;
  }
  // A matched set name's own "set(s)" beside it is used too.
  for (let k = 0; k < words.length; k++) {
    if (consumed[k] || !SET_WORD.test(words[k].word)) continue;
    if (k > 0 && setEnds.has(k - 1)) consumed[k] = true;
  }

  for (const f of found.sort((a, b) => a.at - b.at)) push(f.chip);
  const leftover = words.filter((w, k) => !consumed[k] && !STOP_WORDS.has(w.word)).map((w) => w.word);
  return { chips, leftover, phrases: leftoverPhrases(text, rest, words, consumed), themeJoin: themeJoin(text, rest, words, themeSpans) };
}

/** "any" when some "or" joins two theme matches in one phrase (see the header). */
function themeJoin(
  text: string, rest: string, words: readonly { word: string; raw: string; at: number }[], spans: readonly [number, number][],
): "all" | "any" {
  for (let s = 1; s < spans.length; s++) {
    const [, end] = spans[s - 1];
    const [start] = spans[s];
    const between = words.slice(end + 1, start);
    // From the first theme's last token to the second's: marks sit inside a token (`Orcs.`) as
    // often as between them.
    const from = words[end].at;
    const gap = text.slice(from, words[start].at);
    // A figure blanked out of the scan, a clause mark past a comma, or a word that says something
    // ends the phrase: the two themes were not asked in one breath.
    if (gap !== rest.slice(from, words[start].at) || /[.;:!?()]/.test(gap)) continue;
    if (between.some((w) => !STOP_WORDS.has(w.word))) continue;
    if (between.some((w) => w.word === "or")) return "any";
  }
  return "all";
}

/** A clause mark ends a phrase, after a token or inside one: *lizards, and tokens* is two. */
const CLAUSE_BREAK = /[,.;:!?()]/;
const CLAUSE_BREAK_ALL = /[,.;:!?()]/g;

/** A clause's own text with the stop words at its two ends removed, spelling kept: "" when only
 *  stop words are left. Done per clause, after the split, since a clause mark can sit mid-token. */
function trimStopWords(part: string): string {
  const tokens = [...part.matchAll(/[^\s]+/g)];
  const isStop = (raw: string) => phraseWords(raw).every((w) => STOP_WORDS.has(w));
  let a = 0;
  let b = tokens.length - 1;
  while (a <= b && isStop(tokens[a][0])) a++;
  while (b >= a && isStop(tokens[b][0])) b--;
  if (a > b) return "";
  return part.slice(tokens[a].index, tokens[b].index + tokens[b][0].length).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function leftoverPhrases(
  text: string,
  rest: string,
  words: readonly { word: string; raw: string; at: number }[],
  consumed: readonly boolean[],
): string[] {
  // A token holding a matched word is not the player's leftover, even in part: *Dinosaurs-stomp*
  // used *Dinosaurs*, so the token is left out rather than quoted with the chip inside it.
  const touched = new Set(words.filter((_, k) => consumed[k]).map((w) => w.at));
  const runs: number[][] = [];
  let run: number[] = [];
  const close = () => { if (run.length > 0) runs.push(run); run = []; };
  for (let k = 0; k < words.length; k++) {
    if (consumed[k] || touched.has(words[k].at)) { close(); continue; }
    const prev = run.at(-1);
    if (prev !== undefined) {
      const w = words[prev];
      const gapStart = w.at + w.raw.length;
      // A figure blanked out of the scan sits in the gap, or the previous token ended a clause.
      const figureBetween = words[k].at > gapStart && text.slice(gapStart, words[k].at) !== rest.slice(gapStart, words[k].at);
      if (figureBetween || (w.at !== words[k].at && CLAUSE_BREAK.test(w.raw))) close();
    }
    run.push(k);
  }
  close();

  const out: string[] = [];
  for (const r of runs) {
    let a = 0;
    let b = r.length - 1;
    while (a <= b && STOP_WORDS.has(words[r[a]].word)) a++;
    while (b >= a && STOP_WORDS.has(words[r[b]].word)) b--;
    if (a > b) continue;
    const first = words[r[a]];
    const last = words[r[b]];
    const span = text.slice(first.at, last.at + last.raw.length);
    for (const part of span.split(CLAUSE_BREAK_ALL)) {
      const phrase = trimStopWords(part);
      if (phrase.length > 0 && !out.includes(phrase)) out.push(phrase);
    }
  }
  return out;
}

function sameTarget(a: Target, b: Target): boolean {
  switch (a.kind) {
    case "theme": return b.kind === "theme" && a.slug === b.slug;
    case "card": return b.kind === "card" && a.oracleId === b.oracleId;
    case "set": return b.kind === "set" && a.code === b.code;
  }
}

function sameChip(a: Chip, b: Chip): boolean {
  switch (a.kind) {
    case "theme": return b.kind === "theme" && a.slug === b.slug;
    case "card": return b.kind === "card" && a.oracleId === b.oracleId;
    case "set": return b.kind === "set" && a.code === b.code;
    case "pool": return b.kind === "pool";
    case "budget": return b.kind === "budget" && a.dollars === b.dollars;
    case "bracket": return b.kind === "bracket" && a.bracket === b.bracket;
  }
}
