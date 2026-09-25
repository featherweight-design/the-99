/**
 * What a land does, read from its own text: the colors it makes, the land types it finds, what it
 * costs to run, and what it does besides make mana. Pure, over `type_line` and `oracle_text`, with
 * no ingest and no column (swap tools plan, decision 1).
 *
 * These four readers are what "a stand-in does the same job" means for a land (brief rulings 5 and
 * 5a): a stand-in makes every color the original makes, or finds every land type it finds. The last
 * reader is H3's: a stand-in names what the original did that it does not, and never claims to give
 * up nothing when the original's text holds something it cannot account for.
 */
import { frontFaceOracle } from "../recs/faces";
import { ANY_COLOR } from "../recs/mana";

export type Color = "W" | "U" | "B" | "R" | "G";
export const COLORS: readonly Color[] = ["W", "U", "B", "R", "G"];

export type BasicType = "plains" | "island" | "swamp" | "mountain" | "forest";
export const BASIC_TYPES: readonly BasicType[] = ["plains", "island", "swamp", "mountain", "forest"];
const TYPE_COLOR: Record<BasicType, Color> = {
  plains: "W", island: "U", swamp: "B", mountain: "R", forest: "G",
};

export type LandText = { name: string; typeLine: string; oracleText: string | null };

/** The front face's text: the land that is played. A modal back face is not this card's job. */
function frontText(card: LandText): string {
  return frontFaceOracle(card.oracleText).toLowerCase();
}

/** Reminder text is the rules restating themselves, never an ability. */
function stripReminders(text: string): string {
  return text.replace(/\([^)]*\)/g, "");
}

/**
 * An "any color" grant that depends on another permanent makes nothing on its own (brief §3.0):
 * Exotic Orchard reads an opponent's lands, and Reflecting Pool (`any type`, which `ANY_COLOR`
 * never matches) reads yours. Command Tower's grant is the commander's identity, which is every
 * color the deck can hold, so it counts in full.
 */
// Also `among legendary creature cards in your graveyard` (The Grey Havens), `among legendary permanents you
// control` (Plaza of Heroes), and Paliano's colors `chosen as you drafted`, which a Commander game never has.
const CONDITIONAL_GRANT = /\bcould produce\b|\bamong (lands|[^.]*\b(cards|permanents))\b|\bas you drafted\b/;

/**
 * A mana ability whose COST sacrifices the land itself makes its mana once, and then the land is
 * gone. Abandoned Outpost taps for {W}; its `{T}, Sacrifice this land: Add one mana of any color`
 * is a single red, not a red source, and counting it put the Outpost first on Plateau's sheet.
 * Measured on staging, 17 lands carry one: six for any color (Abandoned Outpost, Archaeological Dig,
 * Bog Wreckage, Ravaged Highlands, Seafloor Debris, Timberland Ruins) and eleven for fixed mana
 * (Ancient Spring's {W}{B}, Sulfur Vent's {U}{R}, Crystal Vein's {C}{C}…), all in `land.test.ts`. A cost that sacrifices ANOTHER permanent
 * (Lazotep Quarry's creature, Lake of the Dead's Swamp) is repeatable and still counts.
 */
export function sacrificesItself(ability: string, cardName: string): boolean {
  const colon = ability.indexOf(":");
  if (colon < 0) return false;
  const cost = ability.slice(0, colon).toLowerCase();
  const name = cardName.split(" // ")[0].toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\bsacrifice (this land|this|it|${name})\\b`).test(cost);
}

/**
 * The colors a land can make on its own, again and again. Basic land types count (a Plateau is a
 * Mountain Plains), as does every symbol inside an "add" clause and an unconditional any-color
 * grant, except an ability that sacrifices the land to pay for itself (`sacrificesItself`).
 */
export function landColors(card: LandText): Set<Color> {
  const colors = new Set<Color>();
  const typeLine = card.typeLine.split(" // ")[0].toLowerCase();
  for (const t of BASIC_TYPES) if (new RegExp(`\\b${t}\\b`).test(typeLine)) colors.add(TYPE_COLOR[t]);

  const text = stripReminders(frontText(card));
  for (const sentence of text.split(/(?<=\.)\s+|\n/)) {
    if (sacrificesItself(sentence, card.name)) continue;
    if (ANY_COLOR.test(sentence) && !CONDITIONAL_GRANT.test(sentence)) {
      for (const c of COLORS) colors.add(c);
      continue;
    }
    for (const clause of sentence.matchAll(/\badd\b([^.\n]*)/g)) {
      for (const symbol of clause[1].matchAll(/\{([wubrg])\}/g)) colors.add(symbol[1].toUpperCase() as Color);
    }
  }
  return colors;
}

/**
 * Whether the land makes `color` FREELY: from a basic land type, or from an ability whose whole cost is
 * {T} (or {T} and a life payment, which the drawbacks already price) and whose mana can be spent on
 * anything. A land that makes a color only by paying for it (Capital City's `{1}, {T}`, Aether Hub's
 * energy), only for a narrow use (Avengers Tower's `Spend this mana only to cast a Hero spell`), or only
 * from a trigger (Branch of Vitu-Ghazi, turned face up) still makes that color, so it stays a stand-in;
 * it is utility mana, and the ladder puts it last (v2 item 2, rung 4). Measured on Hugh's HD - Gishath,
 * every land at the head of Plateau's $0.15 wall was one of these three.
 */
export function makesFreely(card: LandText, color: Color): boolean {
  return colorSource(card, color) !== "utility";
}

/**
 * How a land makes `color`: `free` (a basic type, or {T} and at most a life payment), `conditional` (an
 * ability that says `Activate only if…`: a verge's second color, like a checkland's), or `utility`
 * (only by paying, only for a narrow use, or only from a trigger: `makesFreely` above).
 */
export function colorSource(card: LandText, color: Color): "free" | "conditional" | "utility" {
  const typeLine = card.typeLine.split(" // ")[0].toLowerCase();
  for (const t of BASIC_TYPES) if (TYPE_COLOR[t] === color && new RegExp(`\\b${t}\\b`).test(typeLine)) return "free";
  let conditional = false;
  const text = stripReminders(frontText(card));
  for (const line of text.split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const cost = line.slice(0, colon).toLowerCase();
    const effect = line.slice(colon + 1).toLowerCase();
    // The cost is {T}, and at most a life payment beside it: no mana, no energy, no sacrifice.
    const rest = cost.replace(/\{t\}/, "").replace(/,?\s*pay \d+ life/, "").replace(/[,\s]/g, "");
    if (!cost.includes("{t}") || rest !== "") continue;
    if (/spend this mana only/.test(effect)) continue;
    const makes = (ANY_COLOR.test(effect) && !CONDITIONAL_GRANT.test(effect))
      || [...effect.matchAll(/\badd\b([^.]*)/g)].some((m) => m[1].includes(`{${color.toLowerCase()}}`));
    if (!makes) continue;
    if (/activate only\b/.test(effect)) conditional = true;
    else return "free";
  }
  return conditional ? "conditional" : "utility";
}

/**
 * A land's catch, read from the whole card rather than from its mana ability (v2 item 2): what the land
 * costs you to keep, beside what it costs to tap. `utility` is a land that leaves or does not come back
 * (Rainbow Vale goes to an opponent, Undiscovered Paradise returns to hand, Forsaken City does not untap);
 * `condition` is one that asks something to stay or to be played (Glimmervoid's artifact, Rith's Grove's
 * bounce, Forbidden Orchard's gift). The cost line of a fetch (`{T}, Sacrifice this land:`) is not a catch.
 */
export function landCatch(card: LandText): "condition" | "utility" | null {
  const text = stripReminders(frontText(card)).toLowerCase();
  if (/opponent gains control of this land|return this land to its owner's hand|doesn't untap during your untap step/.test(text)) return "utility";
  if (/sacrifice (this land|it) unless|if you control no [^.]*, sacrifice this land|opponent creates/.test(text)) return "condition";
  return null;
}

export type Finds = { types: Set<BasicType>; basicOnly: boolean };

const FETCH = /search your library for (?:up to (?:one|two) )?(an?|two) ([a-z ,]+?) cards?\b/;

/**
 * The land types a land finds when it is sacrificed to search, and whether it finds only basics.
 * `a basic land card` finds every basic type, basics only. Null for a land that searches for
 * nothing, which is what makes it a fetch or not.
 */
export function fetchFinds(card: LandText): Finds | null {
  const text = stripReminders(frontText(card));
  if (!/\bsacrifice\b/.test(text)) return null;
  const m = FETCH.exec(text);
  if (!m) return null;
  const words = m[2];
  const basicOnly = /\bbasic\b/.test(words);
  const types = new Set<BasicType>(BASIC_TYPES.filter((t) => new RegExp(`\\b${t}\\b`).test(words)));
  if (types.size === 0) {
    if (!/\bland\b/.test(words)) return null;
    for (const t of BASIC_TYPES) types.add(t);
  }
  return { types, basicOnly };
}

/** A drawback: something a land costs to run, one clause each, in the copy's named set. */
export type Drawback =
  | { kind: "entersTapped" }
  | { kind: "entersTappedUnless"; condition: string }
  | { kind: "damage"; amount: number; colors: Color[] }
  | { kind: "life"; amount: number; colors: Color[] }
  | { kind: "lifeFetch"; amount: number }
  | { kind: "basicOnly" };

const NUMBER: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
const amount = (s: string) => NUMBER[s] ?? Number(s);

function symbols(s: string): Color[] {
  return [...s.matchAll(/\{([wubrg])\}/g)].map((m) => m[1].toUpperCase() as Color);
}

/** What running this land costs, from its own text. A basic land costs nothing. */
export function drawbacks(card: LandText): Drawback[] {
  const text = stripReminders(frontText(card));
  const out: Drawback[] = [];

  const unless = /enters(?: the battlefield)? tapped unless ([^.]+)\./.exec(text);
  // A shock land: "you may pay 2 life. If you don't, it enters tapped" is the same drawback read
  // the other way round.
  const shock = /you may pay (\d+|two) life\. if you don't, it enters(?: the battlefield)? tapped/.exec(text);
  if (unless) out.push({ kind: "entersTappedUnless", condition: unless[1].trim() });
  else if (shock) out.push({ kind: "entersTappedUnless", condition: `you pay ${amount(shock[1])} life` });
  else if (/enters(?: the battlefield)? tapped\b/.test(text)) out.push({ kind: "entersTapped" });

  // The colors a cost is paid for: the symbols in its own "add" clause, or every color the land
  // makes when the clause is an any-color grant (Mana Confluence) or the damage is its own line
  // (City of Brass).
  const paidFor = (line: string): Color[] => {
    const own = symbols(line.includes("add") ? line.slice(line.indexOf("add")) : "");
    return own.length > 0 ? own : [...landColors(card)];
  };
  for (const line of text.split("\n")) {
    const damage = /deals (\d+|one|two) damage to you/.exec(line);
    if (damage) out.push({ kind: "damage", amount: amount(damage[1]), colors: paidFor(line.split(/\bdeals\b/)[0]) });
    const life = /pay (\d+|one|two) life/.exec(line);
    if (life && /\badd\b/.test(line)) {
      out.push({ kind: "life", amount: amount(life[1]), colors: paidFor(line) });
    } else if (life && /search your library/.test(line)) {
      out.push({ kind: "lifeFetch", amount: amount(life[1]) });
    }
  }

  const finds = fetchFinds(card);
  if (finds && /onto the battlefield tapped/.test(text)) out.push({ kind: "entersTapped" });
  if (finds?.basicOnly) out.push({ kind: "basicOnly" });
  return out;
}

/**
 * The abilities in a land's text that are neither a mana ability nor one of its costs: what the
 * land DOES besides make mana. One per line, because an ability runs on across sentences
 * (Boseiju's channel names a search in its second), and a line that opens with a fixed mana
 * ability keeps only what follows it (Cavern's "Spend this mana only… can't be countered").
 */
export function nonManaAbilities(card: LandText): string[] {
  const text = stripReminders(frontText(card));
  const isFetch = fetchFinds(card) !== null;
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    let line = raw.trim();
    // A fixed mana ability at the head of the line, and whatever cost sentence rides it.
    // More than one mana from one tap (a bounce land, Ancient Tomb) stays: it is extra mana.
    if (!/\badd (?:\{[wubrgc]\}){2,}/.test(line)) line = line.replace(/^[^.]*?\badd\b(?![^.]*\bfor each\b)[^.]*\.\s*/, "");
    line = line.replace(/^(?:this land|it) deals \w+ damage to you\.\s*/, "");
    if (!line) continue;
    // A cost on its own line: City of Brass hurts whenever it taps.
    if (/deals \w+ damage to you\.?$/.test(line) && !/\btarget\b/.test(line)) continue;
    if (/\benters(?: the battlefield)? tapped\b/.test(line)) continue;
    if (/^as [^,]+ enters/.test(line) && /\bchoose\b/.test(line)) continue;
    if (/^spend this mana only\b/.test(line) && !/can't be countered/.test(line)) continue;
    if (/^activate only\b/.test(line)) continue;
    // A bounce land's return is what its double mana costs, not an ability it gives up.
    if (/^when this land enters, return a land you control to its owner's hand\b/.test(line)) continue;
    if (isFetch && /search your library/.test(line)) continue;
    out.push(line);
  }
  return out;
}

/**
 * What a land does besides make mana, NAMED where a common pattern covers it (Hugh, 2026-09-24:
 * H3 must name what is given up, from the card's own text). Each pattern is one clause in the
 * copy's `gives up` line; the first that matches a sentence names it.
 */
export const GIVES_UP_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/can't be countered/, "uncounterable spells"],
  [/\b(?:becomes|enter[^.]*as) a copy of\b/, "copying a land"],
  [/\bbecomes? an? [^.]*\bcreature\b/, "becoming a creature"],
  [/^channel\b/, "its channel ability"],
  [/^hideaway\b|\bplay the exiled card\b/, "hideaway"],
  [/\badd\b[^.]*\bfor each\b|\badd (?:\{[wubrgc]\}){2,}/, "its extra mana"],
  [/\bdestroy target (?:nonbasic )?land\b/, "land destruction"],
  [/\bexile [^.]*\bgraveyards?\b/, "graveyard hate"],
  [/\b(?:destroy|exile) (?:all|each)\b/, "a board wipe"],
  [/\b(?:destroy|exile) target\b/, "removal"],
  [/\bcounter target\b/, "a counterspell"],
  [/\bcopy target [^.]*\bspell\b/, "copying a spell"],
  [/\bdraws? (?:a|one|two|x) cards?\b/, "card draw"],
  [/\bcreate[s]? [^.]*\btokens?\b/, "making tokens"],
  [/\b(?:return|put)s? [^.]*\bfrom (?:your|a) graveyard\b/, "recursion"],
  [/\bsearch your library\b/, "a library search"],
  [/\bscry (?:\d+|x)\b|\bsurveil (?:\d+|x)\b/, "card selection"],
  [/\bmills?\b/, "milling"],
  [/\bdeals? \w+ damage to (?:any target|target|each)\b/, "dealing damage"],
  [/\bgain \w+ life\b/, "life gain"],
  [/\buntap target\b/, "untapping a permanent"],
  [/\bhexproof\b|\bindestructible\b|\bshroud\b|\bprotection from\b|\bregenerate\b/, "protection"],
  [/cycling\b/, "cycling"],
  [/\bproliferate\b/, "proliferate"],
  [/\bput [^.]*\+1\/\+1 counters?\b/, "+1/+1 counters"],
  [/\bcan't be blocked\b/, "evasion"],
  [/\btarget [^.]*creature gets\b|\bcreatures you control get\b/, "a pump"],
  [/\b(?:gains?|have) (?:double strike|first strike|deathtouch|lifelink|haste|vigilance|flying|trample)\b/, "granting an ability"],
  [/\bcost \{\d+\} less\b/, "a cost reduction"],
  [/\bno maximum hand size\b/, "no maximum hand size"],
  [/\bcan't (?:attack|block|cast)\b/, "a restriction on opponents"],
];

/** The longest quoted ability, in characters, before it is cut with an ellipsis. */
export const QUOTE_BUDGET = 60;

export type GivenUp = { kind: "named"; label: string } | { kind: "quoted"; text: string };

/** One of the original's abilities, named by pattern, or else quoted from its own text. */
export function nameAbility(sentence: string, cardName: string): GivenUp {
  for (const [pattern, label] of GIVES_UP_PATTERNS) if (pattern.test(sentence)) return { kind: "named", label };
  return { kind: "quoted", text: quote(sentence, cardName) };
}

/**
 * The card's own words, trimmed to `QUOTE_BUDGET` at a word boundary with an ellipsis. The text is
 * the oracle's, lowercased by the readers above, so the first letter is restored and the card's own
 * name stays as printed.
 */
export function quote(sentence: string, cardName: string): string {
  const named = sentence
    .replaceAll(cardName.toLowerCase(), cardName)
    // The readers lowercase the whole text, symbols and the variable X with it: `{T}`, `{X}{X}`.
    .replace(/\{[^}]+\}/g, (symbol) => symbol.toUpperCase())
    .replace(/\bx\b/g, "X")
    .replace(/\.$/, "");
  const text = named.charAt(0).toUpperCase() + named.slice(1);
  if (text.length <= QUOTE_BUDGET) return text;
  const cut = text.slice(0, QUOTE_BUDGET - 1);
  const atWord = cut.slice(0, Math.max(cut.lastIndexOf(" "), QUOTE_BUDGET / 2)).replace(/[\s,;:]+$/, "");
  return `${atWord}…`;
}

/**
 * What a stand-in gives up against the original: each of the original's non-mana abilities the
 * stand-in does not also have, named where a pattern covers it and quoted where none does (H3).
 * Empty means the stand-in gives up nothing, and that is the only way it can say so.
 */
export function givesUp(original: LandText, standIn: LandText): GivenUp[] {
  // An ability is the same on both cards when it names the same, or, unnamed, when its words are
  // the same once each card's own name is set aside: two lands that both "put a storage counter on
  // this land" share it, and neither gives it up. Keyed on the whole sentence, never the trimmed
  // quote, so two long abilities that happen to open alike are not taken for one.
  const key = (sentence: string, name: string) => {
    const g = nameAbility(sentence, name);
    return g.kind === "named" ? `named:${g.label}` : `quoted:${sentence.replaceAll(name.toLowerCase(), "this card")}`;
  };
  const kept = new Set(nonManaAbilities(standIn).map((s) => key(s, standIn.name)));
  const out: GivenUp[] = [];
  const seen = new Set<string>();
  for (const sentence of nonManaAbilities(original)) {
    const k = key(sentence, original.name);
    if (seen.has(k) || kept.has(k)) continue;
    seen.add(k);
    out.push(nameAbility(sentence, original.name));
  }
  return out;
}
