import type { DeckProfile } from "../profile/types";
import { GAME_CHANGER_LIMIT } from "./rules";
import type { Bracket } from "./types";
import { upgradePath, type UpgradeItem, type UpgradePath } from "./upgrade";

/**
 * The figures the upgrade path DRAWS that `upgradePath` does not return, derived here once so no
 * component holds a second copy of a rule.
 *
 * `upgradePath` is Tier A's and states what a target asks for. What the surface adds is only
 * arithmetic over that answer — which targets to offer, how many things a heading counts, which
 * cards sit in two items, and the nearest target removals CAN reach when this one cannot.
 */

/** The three brackets a deck can be taken down to. Never 4 or 5: those have no card limits. */
export type Target = 1 | 2 | 3;

/**
 * The targets offered as chips, nearest first: every bracket BELOW the bottom of the deck's
 * reading, up to Upgraded.
 *
 * Below the BOTTOM, not the top. A `[1,2]` deck already sits inside Core, and the path it would
 * draw there is "nothing would have to go" — which is the declaration's question, asked by the
 * declaration. The entry point is the climb's LOWER rung, and a deck with no rung below it has
 * no path to open.
 */
export function downgradeTargets(permits: readonly Bracket[]): Target[] {
  const floor = permits[0];
  return ([3, 2, 1] as const).filter((t) => t < floor);
}

/**
 * What a heading counts: the copies each count rule asks to lose, plus ONE per combo to break.
 *
 * Not `items.length`. The canvas's fixture reads "four things" over three items — two game
 * changers, one land-denial card and one combo — because a count rule asks for `removeCount`
 * copies and a combo asks for one of its halves.
 */
export function thingsToGo(path: UpgradePath): number {
  return path.items.reduce(
    (n, item) => n + (item.rule === "twoCardCombos" ? item.combos.length : item.removeCount),
    0,
  );
}

/** Every oracle id an item names as a candidate. */
function candidateIds(item: UpgradeItem): Set<string> {
  return new Set(
    item.rule === "twoCardCombos"
      ? item.combos.flatMap((c) => c.candidates.map((card) => card.oracleId))
      : item.candidates.map((card) => card.oracleId),
  );
}

/**
 * How many cards appear as a candidate in more than one item — a game changer that is also half
 * of the combo. Said ONCE, in the foot, rather than de-duplicating the items, which would hide a
 * rule the target states.
 */
export function overlapCount(path: UpgradePath): number {
  const seen = new Map<string, number>();
  for (const item of path.items) {
    for (const id of candidateIds(item)) seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  return [...seen.values()].filter((n) => n > 1).length;
}

/**
 * The nearest target removals CAN reach, when this one is blocked — and what it asks.
 *
 * ALWAYS ABOVE THE BLOCKED ONE. The targets nest: each lower bracket states every limit the one
 * above it does and more, so whatever a commander puts out of reach at Core is out of reach at
 * Exhibition too. The only place left to look is up, and "nearest" is the lowest reachable
 * target above the blocked one — the smallest step back from what the reader asked for. Null
 * when there is none, and then the line is not drawn.
 */
export function nearestReachable(
  profile: DeckProfile,
  targets: readonly Target[],
  blocked: Target,
): { target: Target; path: UpgradePath } | null {
  const above = targets.filter((t) => t > blocked).sort((a, b) => a - b);
  for (const target of above) {
    const path = upgradePath(profile, target);
    if (!path.blocked) return { target, path };
  }
  return null;
}

/** The count a limit sentence reports: every card holding the rule, commanders included. */
export function heldCount(
  profile: DeckProfile,
  rule: "gameChangers" | "massLandDenial" | "extraTurns",
): number {
  return profile.brackets[rule].length;
}


/**
 * What a target allows of a count rule. Game changers are the only rule with room at any of the
 * three; mass land denial and extra turns cap at zero wherever `upgradePath` lists them — extra
 * turns only at Exhibition, the one bracket that counts them. The same constant `upgradePath`
 * computes `removeCount` against, so the sentence and the count cannot disagree.
 */
export function targetLimit(
  target: Target,
  rule: "gameChangers" | "massLandDenial" | "extraTurns",
): number {
  return rule === "gameChangers" ? GAME_CHANGER_LIMIT[target] : 0;
}


/**
 * What a blocked count rule leaves behind once every cuttable card is gone: the copies over the
 * target's limit that sit in the command zone. `removeCount` is the excess over the limit and
 * `candidates` are the cards that can leave, so the shortfall is their difference.
 */
export function leftInCommandZone(item: { removeCount: number; candidates: readonly unknown[] }): number {
  return Math.max(0, item.removeCount - item.candidates.length);
}
