import type { SynergyCard } from "../commanders/synergy-cards";

/** The last 31, decided. Both fill controls run this — the owned one with
 *  `ownedOnly`, the top-up without it — so the two cannot drift apart on
 *  ordering or on what counts as a candidate.
 *
 *  `shortfall` is a count of slots, not of roles: the last 31 has no role
 *  targets, which is the whole point of it. §7.6's line states this number and
 *  the owned control's label states `place.length`, never the gap. */
export function planLastSlots(args: {
  ranked: SynergyCard[];
  openSlots: number;
  inDeckOracleIds: Set<string>;
  ownedOnly: boolean;
}): { place: string[]; shortfall: number } {
  const place: string[] = [];
  if (args.openSlots <= 0) return { place, shortfall: 0 };
  for (const c of args.ranked) {
    if (place.length >= args.openSlots) break;
    if (args.inDeckOracleIds.has(c.oracleId)) continue;
    if (args.ownedOnly && !c.owned) continue;
    place.push(c.oracleId);
  }
  return { place, shortfall: args.openSlots - place.length };
}
