// CARD THEMES (swap tools v2, item 7 and 11): what a card DOES beyond the four roles `classifyRoles` reads.
//
// A separate classifier rather than a wider `Role`, deliberately. The fill, the bracket system and the
// analysis all read `classifyRoles`, and every figure they print (role targets, the mix, the skeleton)
// is a count over those four roles; widening the type would move all of them. Themes are read by the
// swap tools alone: a stand-in shares themes with the card it replaces, and Find a deck says which
// theme of the deck a card joins.
//
// Text rules only, never a name list (Hugh, 2026-09-25). Each rule was sized on staging's 31,830
// Commander-legal cards over three passes, and the known card it is checked against is in
// `themes.test.ts`; `pnpm measure:themes` re-prints the counts. Tribal alone needs a second input: the
// catalog's own creature subtypes, because the word before "you control" is a creature type only
// sometimes ("Dinosaurs you control") and a land type or a card type other times ("Forests you control",
// "Creatures you control"). The caller hands the set in, read from type lines, so it grows with the
// catalog rather than with this file.

import { frontFaceOracle } from "./faces";

export type Theme =
  | "counters"
  | "pump"
  | "haste"
  | "evasion"
  | "etbDraw"
  | "draw"
  | "tokens"
  | "treasure"
  | "protection"
  | "recursion"
  | "blink"
  | "finisher"
  | "castFree"
  | "mill"
  | "sacOutlet"
  | "deathTrigger"
  | "lifegain"
  | "drain"
  | "spellslinger"
  | "landfall"
  | "tribal";

export type ThemeInput = { typeLine: string; oracleText: string | null };

/** Reminder text is the rules restating themselves, never an ability. */
const stripReminders = (text: string) => text.replace(/\([^)]*\)/g, "");

/** Every rule reads the lowercased front face. Tribal reads the original case, below. */
const RULES: readonly [Exclude<Theme, "tribal">, RegExp][] = [
  ["counters", /\+1\/\+1 counters?/],
  // "Creatures you control gain trample and get +X/+X" (Craterhoof) is a pump: the clause between the
  // subject and "get" is what pass 1 missed. A lord ("Other Elves you control get +1/+1") and a typed
  // target ("target Elf you control gets +X/+X", Mirkwood Channeler) are pumps too, as is an old lord that
  // names no controller ("Other Merfolk get +1/+1": Lord of Atlantis, Goblin King): 1,451 → 1,718.
  ["pump", /(creatures you control|other [a-z ]*you control|target [a-z ]*(creature|you control))[^.]*\bgets? \+[0-9x]|\bother [a-z]+ gets? \+[0-9x]/],
  // "Equipped creature has hexproof and haste" (Swiftfoot Boots) grants it too.
  ["haste", /\b(have|has|gains?) [a-z, ]*\bhaste\b/],
  ["evasion", /\b(have|gains?) (flying|trample|menace)\b|can't be blocked/],
  ["etbDraw", /when [^.]* enters[^.]*\bdraws?\b/],
  ["draw", /\bdraws? (a|one|two|three|four|x|that many)? ?cards?\b/],
  ["tokens", /\bcreates? [^.]*\btokens?\b/],
  ["treasure", /\btreasure\b/],
  ["protection", /\b(hexproof|indestructible|protection from|ward)\b/],
  ["recursion", /return[^.]* from (your|a) graveyard to (your hand|the battlefield)/],
  // "then return those cards" (Ghostly Flicker) is a blink too.
  ["blink", /exile [^.]*(return|returns) (it|that card|them|those cards)[^.]* to the battlefield/],
  ["finisher", /(additional combat phase|creatures you control gain trample and get)/],
  ["castFree", /without paying (its|their) mana costs?/],
  ["mill", /\bmills?\b/],
  ["sacOutlet", /sacrifice (a|another) (creature|permanent|artifact)[^.:]*:/],
  ["deathTrigger", /whenever [^.]*(creature you control|another creature|this creature or another creature)[^.]* dies/],
  ["lifegain", /\b(you )?gains? [0-9x]+ life\b/],
  // Blood Artist drains a TARGET player; a single opponent is the same job.
  ["drain", /(each opponent|target (player|opponent)) loses [0-9x]+ life/],
  ["spellslinger", /whenever you cast (an|your first) (instant|sorcery|noncreature)/],
  ["landfall", /(\blandfall\b|whenever (a|one or more) lands? (you control )?enters?|whenever you play a land)/],
];

/** The approved themes in the order Hugh approved them: a tie between two themes goes to the earlier (d9). */
export const THEME_ORDER: readonly Theme[] = [...RULES.map(([t]) => t), "tribal"];

/**
 * The words that name a type in a "type matters" sentence, in the card's own case: `Dinosaurs you
 * control`, `Elf spells you cast`, `Dinosaur creature cards from among`, `each other Zombie`, `Other
 * Merfolk`. Each capture is only a CANDIDATE: it counts when `isCreatureType` says it names one.
 */
const TRIBAL_CANDIDATES = [
  // Greedy, then `singular`: a lazy capture read `Elves` as `Elve`.
  /\b([A-Z][a-z]+) you control\b/g,
  /\b([A-Z][a-z]+) spells? you cast\b/g,
  /\b([A-Z][a-z]+) (?:creature )?cards? (?:from )?among\b/g,
  /\b[Ee]ach other ([A-Z][a-z]+)\b/g,
  /\b[Oo]ther ([A-Z][a-z]+)\b/g,
];
const TRIBAL_CHOICE = /(choose a creature type|creature type of your choice|share a creature type)/i;

/** The singular of a captured word, for a type list that holds singulars (`Elves` → `Elf`). */
function singular(word: string): string[] {
  if (word.endsWith("ves")) return [word.slice(0, -3) + "f", word];
  if (word.endsWith("s")) return [word.slice(0, -1), word];
  return [word];
}

/** Whether the card cares about a creature type: a lord, a "Dinosaurs you control", a type choice. */
export function caresAboutType(text: string, isCreatureType: (word: string) => boolean): boolean {
  if (TRIBAL_CHOICE.test(text)) return true;
  for (const pattern of TRIBAL_CANDIDATES) {
    for (const m of text.matchAll(pattern)) {
      if (singular(m[1]).some(isCreatureType)) return true;
    }
  }
  return false;
}

/** A card's themes, off its front face. `isCreatureType` is the catalog's creature subtypes. */
export function cardThemes(card: ThemeInput, isCreatureType: (word: string) => boolean): Theme[] {
  const original = stripReminders(frontFaceOracle(card.oracleText));
  const text = original.toLowerCase();
  const out: Theme[] = RULES.filter(([, re]) => re.test(text)).map(([t]) => t);
  if (caresAboutType(original, isCreatureType)) out.push("tribal");
  return out;
}

/** A creature's subtypes, off the front face: `Creature — Elf Druid` is Elf and Druid. */
export function creatureSubtypes(typeLine: string): string[] {
  const front = typeLine.split(" // ")[0];
  if (!/\bcreature\b/i.test(front)) return [];
  const sub = front.split(" — ")[1];
  return sub ? sub.trim().split(/\s+/) : [];
}

/**
 * A deck's key creature type: its most common one, with the commander's own types breaking a near
 * tie. Measured on Hugh's decks the lead is usually wide (Elf 38, Dinosaur 26); HD - Soldiers is the
 * case the rule exists for (Soldier 25, Human 24), and a Soldier commander settles it. Null for a deck
 * with no creature type held by at least `floor` of its creatures.
 */
export function keyCreatureType(
  creatures: readonly { typeLine: string; quantity?: number }[],
  commanderTypeLines: readonly string[],
  floor = 5,
): string | null {
  const counts = new Map<string, number>();
  for (const c of creatures) for (const t of creatureSubtypes(c.typeLine)) counts.set(t, (counts.get(t) ?? 0) + (c.quantity ?? 1));
  const commanderTypes = new Set(commanderTypeLines.flatMap(creatureSubtypes));
  const ranked = [...counts].sort((a, b) =>
    b[1] - a[1] || Number(commanderTypes.has(b[0])) - Number(commanderTypes.has(a[0])) || a[0].localeCompare(b[0]));
  const [top, next] = ranked;
  if (!top || top[1] < floor) return null;
  // A near tie (within 10%) goes to the type the commander itself carries, when it carries one of the two.
  if (next && top[1] - next[1] <= Math.ceil(top[1] * 0.1) && commanderTypes.has(next[0]) && !commanderTypes.has(top[0])) return next[0];
  return top[0];
}
