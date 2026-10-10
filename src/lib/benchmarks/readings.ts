import type { Job } from "../labels/types";
import { frontType } from "./cards";
import type { BenchCard } from "./types";

/**
 * The read-side filters the Dependencies rows apply to label readings, from the pre-switch spot check
 * (`boards/benchmarks-spotcheck-2026-10-10.md`: 805 readings judged from rules text, 63 wrong). Each
 * is free, needs no relabel, and was measured to drop wrong readings without dropping a right one.
 * Two definitions are engineering's rulings, recorded there: an Aura or Equipment that buffs only
 * the creature it is attached to is not a payoff on creatures (Equipment survives a creature wipe,
 * and an Aura is one creature's), and tribal means any payoff for a creature TYPE, not only a lord.
 */

const text = (c: BenchCard) => c.oracleText ?? "";

/** Fix 2: a recursion job counts when the card reads the graveyard, or returns on dying (undying). */
export function recursionReads(c: BenchCard): boolean {
  return /\bgraveyard\b/i.test(text(c)) || /\bdies\b[^.]*\breturn/i.test(text(c));
}

/** Fix 3: self-mill counts when the card actually mills, or puts cards into your graveyard. */
export function selfMillReads(c: BenchCard): boolean {
  return /\bmills? (?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|x|\d+) cards?\b/i.test(text(c))
    || /\binto your graveyard\b/i.test(text(c));
}

/** Keywords whose ability is used from the hand or a graveyard, never on the battlefield. */
const OFF_BATTLEFIELD = /^(?:ninjutsu|commander ninjutsu|transmute|cycling|\w+cycling|escape|encore|disturb|unearth|embalm|eternalize|scavenge|channel|flashback|retrace|dredge|forecast|bloodrush|reinforce|craft|blitz|dash|evoke|madness|prowl|emerge|foretell|plot|bestow|morph|megamorph|disguise)\b/i;
const FROM_ELSEWHERE = /\bthis card (?:from|in) your (?:graveyard|hand)\b|\breturn this card from your graveyard\b/i;
const ACTIVATED_LINE = /^[^:"]{1,90}:\s/;

/**
 * Fix 4: a card does its work through an activated ability only when one works ON THE BATTLEFIELD.
 * Reminder text is stripped, keyword lines used from the hand or graveyard are ignored, and an
 * ability granted in quotes counts. Tireless Tracker's Clue is not the Tracker's ability.
 */
export function activatedOnBattlefield(c: BenchCard): boolean {
  const lines = text(c).replace(/\([^)]*\)/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.some((line) => {
    if (OFF_BATTLEFIELD.test(line) || FROM_ELSEWHERE.test(line)) return false;
    if (ACTIVATED_LINE.test(line)) return true;
    return [...line.matchAll(/"([^"]*)"/g)].some((m) => ACTIVATED_LINE.test(m[1]) && !/\bcreates?\b/i.test(line.slice(0, m.index)));
  });
}

/** Fix 5: a route outside combat is not one that fires on an attack or on combat damage. */
export function outsideCombat(j: Job): boolean {
  return j.trigger !== "attacks" && j.trigger !== "combatDamage";
}

/** Who a buff reaches beyond the card itself (fix 6). */
const OTHER_RECIPIENT = /\b\w+s you control\b|\beach creature\b|\bother\b|\banother\b|\btarget creature\b|\bemblem\b/i;

/** Fix 6 and the Aura/Equipment ruling: pump counts only when it reaches other creatures. */
export function pumpsOthers(c: BenchCard): boolean {
  if (/\b(?:Aura|Equipment)\b/.test(frontType(c))) return false;
  return OTHER_RECIPIENT.test(text(c));
}

const CREATE = /\bcreate\b/i;
const THIRD_PARTY_CREATES = /\b(?:its controller|each opponent|that player|target opponent|an opponent)\s+creates\b/i;
const ONE_SHOT_CREATE = /^\s*when (?:this|~|[^,]{0,40}) (?:enters|you cast)\b(?! or attacks)/i;

/** Fixes 7 and 8: tokens count when the deck gets them, and not only once on entry. */
export function makesOwnTokensRepeatably(c: BenchCard): boolean {
  const t = text(c);
  if (!CREATE.test(t) && THIRD_PARTY_CREATES.test(t)) return false;
  if (/\bSaga\b/.test(frontType(c))) return true;
  const sentences = t.split(/(?<=[.\n])/).filter((s) => /\bcreates?\b/i.test(s));
  return sentences.length === 0 || !sentences.every((s) => ONE_SHOT_CREATE.test(s));
}

/** Subtypes that are not creature types, so a "tribal" reading naming one pays off on nothing living (fix 9). */
const NOT_A_CREATURE_TYPE = new Set([
  "shrine", "aura", "equipment", "vehicle", "saga", "treasure", "clue", "food", "blood", "map",
  "artifact", "enchantment", "land", "instant", "sorcery", "planeswalker", "battle", "spell", "spells",
]);

/** Fix 9: a tribal reading counts only when the type it names is a creature type. */
export function namesACreatureType(j: Job): boolean {
  const named = j.restrictedTo?.trim().toLowerCase();
  return !named || !NOT_A_CREATURE_TYPE.has(named);
}
