import type { FactCard } from "./facts";
import { normalizeName } from "./facts";
import { EVIDENCE_MAX } from "./limits";
import type { RefusalReason } from "./types";

/**
 * Model-free checks on what a sentence ASSERTS about cards (plan 2026-10-10-overview-accuracy.md,
 * section 4.1). Pure. `validate.ts` checks that a name resolves and a budget holds; nothing there
 * reads what a line says about a card's rules text, which is how "cascading" on a commander with
 * no cascade, and "forced sacrifices trigger Ayara", reached a reader.
 *
 * EVERY RULE HERE IS NARROW ON PURPOSE. A false hit drops a line the reader would have wanted,
 * so each one names the shape it catches and says what it does not. A green is never general
 * coverage of "the tip is true"; that is the verifier's job (plan 4.2).
 */

const MARK = /\[\[([^\[\]]+)\]\]/g;

// ---------------------------------------------------------------------------------------------
// Evidence refs.

/** The ref a decklist line carries: deck-local, three tokens where a UUID is twenty-five. */
export function refOf(index: number): string {
  return `c${index + 1}`;
}

/** Ref to card, over the facts' cards in order (the commander is a deck card, so it has a ref). */
export function refIndex(cards: readonly FactCard[]): Map<string, FactCard> {
  return new Map(cards.map((c, i) => [refOf(i), c]));
}

export type EvidenceRead = {
  /** The distinct oracle ids the refs name, in order. */
  ids: string[];
  /** The cards behind them. */
  cards: FactCard[];
  /** `evidence_not_in_deck` when a ref names nothing in the deck, the cap is passed, or `required` and none. */
  reason: RefusalReason | null;
};

export function readEvidence(refs: readonly string[], index: ReadonlyMap<string, FactCard>, required: boolean): EvidenceRead {
  const cards: FactCard[] = [];
  let bad = false;
  for (const raw of refs) {
    const card = index.get(raw.trim().toLowerCase());
    if (!card) bad = true;
    else if (!cards.includes(card)) cards.push(card);
  }
  if (refs.length > EVIDENCE_MAX) bad = true;
  if (required && cards.length === 0) bad = true;
  return { ids: cards.map((c) => c.oracleId), cards, reason: bad ? "evidence_not_in_deck" : null };
}

// ---------------------------------------------------------------------------------------------
// A keyword the card does not have (defect 7).

type KeywordRule = { word: string; form: RegExp; stems: RegExp; loose: boolean };

/**
 * A closed list of keyword abilities. `loose` words are rare in plain English, so the keyword
 * following a marked card closely is read as that card's; the rest (`flash`, `flying`, `reach`,
 * `storm`) are also ordinary words and count only after a possession cue ("has", "gains", "with").
 */
const KEYWORDS: KeywordRule[] = [
  { word: "cascade", form: /\bcascad(?:e|es|ed|ing)\b/i, stems: /cascad/i, loose: true },
  { word: "ninjutsu", form: /\bninjutsu\b/i, stems: /ninjutsu/i, loose: true },
  { word: "convoke", form: /\bconvok(?:e|es|ed|ing)\b/i, stems: /convoke/i, loose: true },
  { word: "delve", form: /\bdelv(?:e|es|ed|ing)\b/i, stems: /delve/i, loose: true },
  { word: "undying", form: /\bundying\b/i, stems: /undying/i, loose: true },
  { word: "persist", form: /\bpersist(?:s|ing)?\b/i, stems: /persist/i, loose: true },
  { word: "annihilator", form: /\bannihilator\b/i, stems: /annihilator/i, loose: true },
  { word: "prowess", form: /\bprowess\b/i, stems: /prowess/i, loose: true },
  { word: "flashback", form: /\bflashback\b/i, stems: /flashback/i, loose: true },
  { word: "infect", form: /\binfect\b/i, stems: /\binfect\b/i, loose: true },
  { word: "storm", form: /\bstorm\b/i, stems: /\bstorm\b/i, loose: false },
  { word: "flash", form: /\bflash\b/i, stems: /\bflash\b/i, loose: false },
  { word: "flying", form: /\bflying\b/i, stems: /\bflying\b/i, loose: false },
  { word: "reach", form: /\breach\b/i, stems: /\breach\b/i, loose: false },
  { word: "trample", form: /\btrampl(?:e|es|ing)\b/i, stems: /trample/i, loose: false },
  { word: "haste", form: /\bhaste\b/i, stems: /\bhaste\b/i, loose: false },
  { word: "deathtouch", form: /\bdeathtouch\b/i, stems: /deathtouch/i, loose: false },
  { word: "lifelink", form: /\blifelink\b/i, stems: /lifelink/i, loose: false },
  { word: "vigilance", form: /\bvigilance\b/i, stems: /vigilance/i, loose: false },
  { word: "menace", form: /\bmenace\b/i, stems: /\bmenace\b/i, loose: false },
  { word: "hexproof", form: /\bhexproof\b/i, stems: /hexproof/i, loose: false },
  { word: "indestructible", form: /\bindestructible\b/i, stems: /indestructible/i, loose: false },
  { word: "first strike", form: /\bfirst strike\b/i, stems: /first strike/i, loose: false },
  { word: "double strike", form: /\bdouble strike\b/i, stems: /double strike/i, loose: false },
];

const CUE = new Set(["has", "have", "having", "gains", "gain", "gaining", "with", "keeps", "keep"]);
/**
 * The only words allowed between a mark and its keyword: possession cues, and the small words a
 * writer puts before a verb ("[[X]] also has haste", "attack with [[X]] to cascade"). Anything
 * else ("early to enable ninjutsu", "off cascade from [[Y]]") means the keyword belongs to
 * another thing in the sentence, and the check stays silent: against the stored corpus answers a
 * wider window read 3 false hits to 1 true.
 */
const FILLER = new Set(["also", "then", "now", "still", "already", "always", "can", "will", "to", "it", "that", "really", "even", "just"]);
const NEGATION = /\b(?:no|not|without|lacks?|lacking|never|doesn'?t|don'?t|isn'?t)\b/i;

function cardHas(card: FactCard, rule: KeywordRule): boolean | null {
  // A card with neither its text nor its keywords tells us nothing, so nothing is claimed false.
  if (card.oracleText === null && card.keywords === undefined) return null;
  if (card.keywords?.some((k) => rule.stems.test(k))) return true;
  return card.oracleText ? rule.stems.test(card.oracleText) : false;
}

export type KeywordHit = { card: string; keyword: string };

/**
 * A marked card given a keyword it lacks: the keyword stands within a few words after the mark,
 * in the same clause (no other mark, no sentence end between), and the card's text and keyword
 * list both lack it. Reads the nearest PRECEDING mark only. A card whose text grants the keyword
 * (a commander that gives cascade) has the word in its text and passes.
 */
export function keywordClaims(text: string, deck: ReadonlyMap<string, FactCard>): KeywordHit[] {
  const hits: KeywordHit[] = [];
  const marks = [...text.matchAll(MARK)];
  marks.forEach((m, i) => {
    const card = deck.get(normalizeName(m[1]));
    if (!card) return;
    const start = (m.index ?? 0) + m[0].length;
    const next = marks[i + 1]?.index ?? text.length;
    const rest = text.slice(start, next);
    const stop = rest.search(/[.;:!?]/);
    const clause = stop === -1 ? rest : rest.slice(0, stop);
    for (const rule of KEYWORDS) {
      const found = rule.form.exec(clause);
      if (!found) continue;
      const before = clause.slice(0, found.index);
      if (NEGATION.test(before)) continue;
      const words = before.replace(/^['\u2019]s\b/, "").toLowerCase().split(/[\s,]+/).filter(Boolean);
      if (!words.every((w) => CUE.has(w) || FILLER.has(w))) continue;
      if (!rule.loose && !words.some((w) => CUE.has(w))) continue;
      if (cardHas(card, rule) === false) hits.push({ card: card.name, keyword: rule.word });
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------------------------
// An edict is not an entry (defect 5), the known shape only.

const EDICT = /\b(?:each|every) (?:opponent|other player|player)\b[^.]{0,120}\bsacrifices?\b|\btarget (?:player|opponent)\b[^.]{0,60}\bsacrifices?\b|\bdefending player sacrifices\b/i;
const ENTRY = /\b(?:enters?|entering|entered|put onto the battlefield|comes? into play)\b/i;
/** A card that puts a permanent onto YOUR battlefield: tokens, reanimation, flicker, copies. */
const SOURCE = /\bcreates?\b|\bonto the battlefield\b|\breturns?\b[^.]*\bto the battlefield\b|\bpopulate\b|\bamass\b|\bincubate\b|\bconjure\b|\bcopy of\b/i;

export function isEdict(card: FactCard): boolean {
  return !!card.oracleText && EDICT.test(card.oracleText);
}

/**
 * A sentence saying creatures enter, in which a card that ONLY makes opponents sacrifice is the
 * marked source, and no other cited card puts anything onto the battlefield. Catches "creatures
 * entering from [[Shard]]'s forced sacrifices still trigger [[Ayara]]"; does not catch the open
 * set, which is the verifier's (plan 4.2).
 */
export function edictEntry(text: string, cited: readonly FactCard[], deck: ReadonlyMap<string, FactCard>): boolean {
  const sources = (card: FactCard) => !!card.oracleText && SOURCE.test(card.oracleText);
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (!ENTRY.test(sentence)) continue;
    const marked = [...sentence.matchAll(MARK)].map((m) => deck.get(normalizeName(m[1]))).filter((c): c is FactCard => !!c);
    const edicts = marked.filter((c) => isEdict(c) && !sources(c));
    if (edicts.length === 0) continue;
    const others = cited.filter((c) => !edicts.includes(c));
    if (!others.some(sources)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// A weakness that is no weakness (defect 1).

const BASIC = "(?:basic )?(?:swamps?|islands?|forests?|mountains?|plains)";
const COLOR_WEAKNESS = new RegExp(
  [
    "\\bcolou?r(?:ed)? (?:flexibility|fixing|diversity)\\b",
    "\\bfixing\\b",
    "\\bsplash(?:ing|es)?\\b",
    `\\b(?:entirely|exclusively|only|all|just) ${BASIC}\\b`,
    "\\bsingle[- ]colou?r(?:ed)? (?:mana base|manabase)\\b",
  ].join("|"),
  "i",
);

/**
 * A weakness about color flexibility, fixing, splashing or an all-basics mana base, on a deck of
 * one color or none. True of the data and meaningless for the deck (the mono-black "entirely
 * Swamps" line). A deck of two or more colors may genuinely have the problem, so it is not asked.
 */
export function nonWeakness(line: string, identity: readonly string[]): boolean {
  if (identity.length >= 2) return false;
  return COLOR_WEAKNESS.test(line.replace(MARK, "$1"));
}
