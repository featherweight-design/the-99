import { GAME_CHANGER_LIMIT } from "../../bracket/rules";
import type { ProfileBrackets } from "../../profile/types";
import { producesInfiniteTurns } from "../../spellbook/combo-features";
import type { UpgradeDrop, UpgradePair } from "./validate";
import { BRACKET_TARGETS, isBracketTarget, type BracketTarget } from "./targets";

/**
 * The player's bracket is a TARGET (Hugh, 2026-11-10): the run must land the deck at it and may not pass it. Pure: the run
 * supplies the brackets read of the list with the pairs applied (`run.ts`). `holdOffenders` names the adds that take it past
 * the pick; `shortfall` says what a deck still lacks to reach it. Both read the app's own verdict (`slotDeck`), never the model.
 */

export { BRACKET_TARGETS, isBracketTarget, type BracketTarget };


/** The bracket a deck plays at, in the three the player picks from: the highest bracket its list permits, kept to 2 through 4. A plain precon permits 1 and 2 and so plays 2. Null when nothing is permitted (no reading). */
export function playsAt(permits: readonly number[]): BracketTarget | null {
  return permits.length === 0 ? null : (Math.min(4, Math.max(2, Math.max(...permits))) as BracketTarget);
}

/** The brackets read of one list: the facts a hold or a reach is judged on, and the bracket the list plays at. */
export type BracketRead = Pick<ProfileBrackets, "gameChangers" | "massLandDenial" | "twoCardCombos"> & { plays: BracketTarget | null };

/** Game changers a deck of this pick needs in all: bracket 3 needs one, bracket 4 needs more than three (the bracket-3 limit), bracket 2 none. */
const GAME_CHANGERS_NEEDED: Record<BracketTarget, number> = { 2: 0, 3: 1, 4: GAME_CHANGER_LIMIT[3] + 1 };

/** What the deck still lacks of its pick, or null when it plays at it. A bracket that could not be read is not reached. */
export function shortfall(target: BracketTarget, read: BracketRead | null): { note: string } | null {
  if (read && read.plays === target) return null;
  const has = read?.gameChangers.length ?? 0;
  // Over the pick (an add completed a combo the deck's tutors can reach, which the app reads as bracket 4): more game changers cannot lower it.
  if (read?.plays && read.plays > target) return { note: `The deck with these swaps plays at bracket ${read.plays}, above the bracket ${target} the player chose. Choose different adds: avoid cards that form a two-card combo with a card already in the deck.` };
  const lacks = Math.max(1, GAME_CHANGERS_NEEDED[target] - has);
  const reads = read?.plays ? `The deck with these swaps plays at bracket ${read.plays}` : "The deck's bracket could not be read";
  if (target === 2) return { note: `${reads}, and the player chose bracket 2: no game changers, no combos.` };
  return { note: `${reads}, and the player chose bracket ${target}, which needs at least ${GAME_CHANGERS_NEEDED[target]} game changer${GAME_CHANGERS_NEEDED[target] > 1 ? "s" : ""} in the whole deck (it has ${has}). Add ${lacks} more from the pool entries marked GAME CHANGER.` };
}

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

/** Reads the brackets of the list with `pairs` applied; null when the read fails (the hold then keeps none: a bracket it could not check is not one it can promise). */
export type BracketsRead = (pairs: readonly UpgradePair[]) => Promise<BracketRead | null>;

/** Drops the adds that break the ceiling, rereading the list after each round until it holds. Each round drops at least one pair, so it ends. */
export async function holdBracket(
  pairs: readonly UpgradePair[], ceiling: number, read: BracketsRead,
): Promise<{ kept: UpgradePair[]; drops: UpgradeDrop[] }> {
  let kept = [...pairs];
  const drops: UpgradeDrop[] = [];
  while (ceiling < 4 && kept.length > 0) {
    const brackets = await read(kept);
    if (!brackets) {
      for (const p of kept) drops.push({ position: p.position, rule: "bracket", name: p.add });
      kept = [];
      break;
    }
    const bad = holdOffenders(brackets, ceiling, kept);
    if (bad.size === 0) break;
    for (const p of kept) if (bad.has(p.addId)) drops.push({ position: p.position, rule: "bracket", name: p.add });
    kept = kept.filter((p) => !bad.has(p.addId));
  }
  return { kept, drops };
}
