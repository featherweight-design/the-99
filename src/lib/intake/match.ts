import { singularForms } from "../edhrec/tag-kinds";

/**
 * The free match (brief §2 ruling 3, §3.0): the player's own words, turned into answer chips at no
 * cost. Pure: the theme vocabulary and the catalog's names come in as a `PhraseIndex` the caller
 * builds once.
 *
 * WHAT IT MATCHES, and nothing else:
 *  - a theme tag's label, exactly, or one of its singular forms (`dinosaur` for `Dinosaurs`);
 *  - a card's name from the whole catalog, or one face of a two-faced card;
 *  - a dollar figure (`$200`, `200 dollars`, `150 bucks`) as the budget;
 *  - `bracket N` for N from 1 to 5.
 * Every other word is either a STOP WORD, which is dropped silently, or LEFTOVER, which the player
 * is shown and may hand to Look deeper. A word is never guessed at.
 *
 * THE LONGEST PHRASE WINS, scanning left to right, so `Doubling Season` is a card and not the theme
 * `Seasons`-anything. When one phrase names both a theme and a card, the theme wins: the intake asks
 * what the deck is about, and a card chip can still be added by name.
 *
 * A ONE-WORD CARD NAME MATCHES ONLY WHEN TYPED WITH A CAPITAL. The catalog holds `Fog`, `Opt`,
 * `Shock` and `Island`, and "a fog of a deck" is not a request for a build-around card. A name of two
 * or more words is specific enough on its own. The loader leaves basic lands out entirely.
 */
export type Chip =
  | { kind: "theme"; slug: string; label: string }
  | { kind: "card"; oracleId: string; name: string }
  | { kind: "budget"; dollars: number }
  | { kind: "bracket"; bracket: 1 | 2 | 3 | 4 | 5 };

export type MatchResult = {
  /** In the order they were typed, each at most once. */
  chips: Chip[];
  /** The words that matched nothing and are not stop words, in the order typed. */
  leftover: string[];
};

type Target = { kind: "theme"; slug: string; label: string } | { kind: "card"; oracleId: string; name: string };

export type PhraseIndex = {
  /** Keyed by `phraseKey`. A theme and a card may share a key; the theme is listed first. */
  targets: Map<string, Target[]>;
  /** The longest key in words, so the scan never tries a span no key can have. */
  maxWords: number;
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

  let maxWords = 0;
  for (const key of targets.keys()) maxWords = Math.max(maxWords, key.split(" ").length);
  return { targets, maxWords };
}

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

  // The word scan, over the raw spans so a one-word card name can be tested for its capital.
  const words = [...rest.matchAll(/[^\s]+/g)].flatMap((m) =>
    phraseWords(m[0]).map((w) => ({ word: w, raw: m[0], at: m.index })),
  );
  const consumed = new Array<boolean>(words.length).fill(false);
  for (let i = 0; i < words.length; i++) {
    for (let n = Math.min(index.maxWords, words.length - i); n >= 1; n--) {
      const key = words.slice(i, i + n).map((w) => w.word).join(" ");
      const target = (index.targets.get(key) ?? []).find((t) => t.kind === "theme" || n > 1 || /^\p{Lu}/u.test(words[i].raw.replace(/^[^\p{L}\p{N}]+/u, "")));
      if (!target) continue;
      found.push({ at: words[i].at, chip: target });
      for (let k = i; k < i + n; k++) consumed[k] = true;
      i += n - 1;
      break;
    }
  }

  for (const f of found.sort((a, b) => a.at - b.at)) push(f.chip);
  const leftover = words.filter((w, k) => !consumed[k] && !STOP_WORDS.has(w.word)).map((w) => w.word);
  return { chips, leftover };
}

function sameTarget(a: Target, b: Target): boolean {
  return a.kind === "theme" ? b.kind === "theme" && a.slug === b.slug : b.kind === "card" && a.oracleId === b.oracleId;
}

function sameChip(a: Chip, b: Chip): boolean {
  switch (a.kind) {
    case "theme": return b.kind === "theme" && a.slug === b.slug;
    case "card": return b.kind === "card" && a.oracleId === b.oracleId;
    case "budget": return b.kind === "budget" && a.dollars === b.dollars;
    case "bracket": return b.kind === "bracket" && a.bracket === b.bracket;
  }
}
