import { GAME_CHANGER_LIMIT } from "../../bracket/rules";
import type { ProfileBrackets } from "../../profile/types";
import { producesInfiniteTurns } from "../../spellbook/combo-features";
import type { UpgradeDrop, UpgradePair } from "./validate";

/**
 * Holding the player's bracket (Hugh, 2026-11-10: the bracket is an input the run is held to). Pure: the run supplies the
 * brackets read of the list with the pairs applied (`run.ts`), and this names the adds that take it past the ceiling. A run
 * is held when the lowest bracket the list satisfies is at or under the ceiling; the ceiling is the chosen bracket, or the
 * box's own when it already plays higher (an upgrade cannot cut the box's own game changers to reach a lower pick).
 */

export const BRACKET_TARGETS = [2, 3, 4] as const;
export type BracketTarget = (typeof BRACKET_TARGETS)[number];

export const isBracketTarget = (n: unknown): n is BracketTarget => BRACKET_TARGETS.some((t) => t === n);

export const ceilingFor = (target: BracketTarget, boxBracket: number | null): number => Math.max(target, boxBracket ?? 0);

/** The game changers a ceiling allows: none below bracket 3, three at 3, no limit above. */
const gameChangerLimit = (ceiling: number): number => (ceiling >= 4 ? Infinity : ceiling >= 3 ? GAME_CHANGER_LIMIT[3] : GAME_CHANGER_LIMIT[2]);

/**
 * The adds to drop, in order: each game changer over what the ceiling allows (the last added go first), each add that is mass
 * land denial, and the last add in each combo the ceiling forbids (any two-card combo below bracket 3; an infinite-turn loop
 * at 3). Adds only: a violation the box brought is not the upgrade's to fix.
 */
export function holdOffenders(
  brackets: Pick<ProfileBrackets, "gameChangers" | "massLandDenial" | "twoCardCombos">,
  ceiling: number,
  pairs: readonly Pick<UpgradePair, "addId">[],
): Set<string> {
  const out = new Set<string>();
  if (ceiling >= 4) return out;
  const added = new Set(pairs.map((p) => p.addId));
  const gc = new Set(brackets.gameChangers.map((c) => c.oracleId));
  let room = Math.max(0, gameChangerLimit(ceiling) - [...gc].filter((id) => !added.has(id)).length);
  for (const p of pairs) {
    if (!gc.has(p.addId)) continue;
    if (room > 0) room--;
    else out.add(p.addId);
  }
  for (const m of brackets.massLandDenial) if (added.has(m.oracleId)) out.add(m.oracleId);
  for (const c of brackets.twoCardCombos) {
    if (ceiling >= 3 && !producesInfiniteTurns(c.produces)) continue;
    const mine = pairs.filter((p) => c.cards.some((k) => k.oracleId === p.addId));
    if (mine.length > 0) out.add(mine[mine.length - 1].addId);
  }
  return out;
}

/** Reads the brackets of the list with `pairs` applied; null when the read fails (the hold then keeps the pairs, as no figure can be trusted). */
export type BracketsRead = (pairs: readonly UpgradePair[]) => Promise<Pick<ProfileBrackets, "gameChangers" | "massLandDenial" | "twoCardCombos"> | null>;

/** Each drop costs one read; a dropped add can only lower a count, so a few rounds settle it. */
const HOLD_ROUNDS = 3;

/** Drops the adds that break the ceiling, rereading the list after each round. */
export async function holdBracket(
  pairs: readonly UpgradePair[], ceiling: number, read: BracketsRead,
): Promise<{ kept: UpgradePair[]; drops: UpgradeDrop[] }> {
  let kept = [...pairs];
  const drops: UpgradeDrop[] = [];
  for (let round = 0; round < HOLD_ROUNDS && ceiling < 4 && kept.length > 0; round++) {
    const brackets = await read(kept);
    if (!brackets) break;
    const bad = holdOffenders(brackets, ceiling, kept);
    if (bad.size === 0) break;
    for (const p of kept) if (bad.has(p.addId)) drops.push({ position: p.position, rule: "bracket", name: p.add });
    kept = kept.filter((p) => !bad.has(p.addId));
  }
  return { kept, drops };
}
