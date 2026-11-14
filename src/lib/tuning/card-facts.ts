// What a suggestion may say about a card's rules (Suggested changes v2, run 77d6f29a: Vengeful Ancestor called "a hasty flyer"
// when it has Flying and Goad). Two halves: the compact rules text the prompt lists beside a card, and the check that a reason
// never names an evergreen keyword the card does not have. Pure.

const BRIEF_MAX = 160;

/**
 * A card's rules text as the prompt lists it: reminder text (the parentheses) stripped, lines joined, cut at a word near
 * `BRIEF_MAX` characters. Null for a card with no text (a vanilla creature, a basic land), so its line carries nothing.
 */
export function briefText(oracleText: string | null | undefined): string | null {
  const flat = (oracleText ?? "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s*\n\s*/g, " / ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s/]+|[\s/]+$/g, "")
    .trim();
  if (flat === "") return null;
  if (flat.length <= BRIEF_MAX) return flat;
  const cut = flat.slice(0, BRIEF_MAX);
  const at = cut.lastIndexOf(" ");
  return `${cut.slice(0, at > BRIEF_MAX / 2 ? at : BRIEF_MAX).replace(/[\s,;:/]+$/, "")}…`;
}

/** `{ text }` for a card with listed rules text, else nothing: spread into a candidate so a card with none carries no key. */
export const listedText = (oracleText: string | null | undefined): { text?: string } => {
  const text = briefText(oracleText);
  return text === null ? {} : { text };
};

/** The facts a card line is checked against. Absent text means the row carries none: nothing can be called wrong. */
export type CardFacts = { keywords?: readonly string[]; oracleText?: string | null };

/**
 * Each keyword with the words a rationale uses for it. `ambiguous` words are also ordinary verbs or nouns ("reach for",
 * "a flash of", "toward"), so they count only after a word that says a card has or gives the ability.
 */
const KEYWORDS: { keyword: string; words: string; ambiguous?: true }[] = [
  { keyword: "haste", words: "haste|hasty" },
  { keyword: "flying", words: "flying|flyer" },
  { keyword: "trample", words: "trample|tramples" },
  { keyword: "lifelink", words: "lifelink" },
  { keyword: "deathtouch", words: "deathtouch" },
  { keyword: "vigilance", words: "vigilance|vigilant" },
  { keyword: "menace", words: "menace" },
  { keyword: "first strike", words: "first strike" },
  { keyword: "double strike", words: "double strike" },
  { keyword: "indestructible", words: "indestructible" },
  { keyword: "hexproof", words: "hexproof" },
  { keyword: "ward", words: "ward", ambiguous: true },
  { keyword: "flash", words: "flash", ambiguous: true },
  { keyword: "reach", words: "reach", ambiguous: true },
];

const HAS = String.raw`(?:has|have|with|gains?|gives?|grants?)\s+`;
/** A keyword before a plural noun names OTHER cards ("other lifelink creatures"). */
const OTHERS = /^\s+(?:creatures?|permanents?|cards?|spells?|sources?|decks?)\b/i;
/** "no"/"without" before a keyword denies it, and a denial states a fact rather than inventing one. */
const DENIED = /\b(?:no|not|without|lacks?|lacking|never|isn't|doesn't|don't)\s+(?:\w+\s+)?$/i;

/**
 * The first evergreen keyword `text` says the card has that the card's keywords and rules text do not hold, or null. A
 * keyword a card only GRANTS ("creatures you control have haste") is in its text, so it passes. A card with no facts
 * read (`keywords` and `oracleText` both absent) is never judged.
 */
export function unsupportedKeyword(text: string, card: CardFacts): string | null {
  if (card.oracleText === undefined && card.keywords === undefined) return null;
  const held = `${(card.keywords ?? []).join(" ")} ${card.oracleText ?? ""}`.toLowerCase();
  // Double strike is first strike too (rule 702.4): a card with it may be said to have both.
  const implied = held.includes("double strike") ? `${held} first strike` : held;
  for (const { keyword, words, ambiguous } of KEYWORDS) {
    if (new RegExp(String.raw`\b(?:${words}|${keyword})\b`).test(implied)) continue;
    for (const m of text.matchAll(new RegExp(String.raw`${ambiguous ? HAS : ""}\b(?:${words})\b`, "gi"))) {
      if (OTHERS.test(text.slice(m.index + m[0].length))) continue;
      if (DENIED.test(text.slice(0, m.index))) continue;
      return keyword;
    }
  }
  return null;
}
