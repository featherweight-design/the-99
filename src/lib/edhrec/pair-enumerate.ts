// Every partner pair the app would let a player build, for the index to fetch.
//
// Change commander ranks a pair only when its support row is `ok` with enough decks, and the
// index used to fetch only pairs someone had already built — one pair on staging against
// 3,380 single commanders, so "Change pair" offered nothing. The pairs come from the app's own
// rules rather than a table: `canPair` over `partnerAbility`, among cards that pass
// `isCommanderCandidate`. A pair those rules refuse is one the picker cannot build, so it can
// never be a candidate to change to, and fetching its page would buy nothing.
//
// Measured 2026-09-25: 119 candidates with a partner ability form 1,717 legal pairs — 1,653 of
// them generic `Partner` × `Partner`, 21 named `Partner with`, 43 restricted.
import { canPair, partnerAbility } from "../decks/partner";
import { isCommanderCandidate } from "../recs/score";
import { canonicalPair } from "./pair";

export type PairSource = {
  oracleId: string;
  name: string;
  typeLine: string;
  oracleText: string | null;
  layout: string | null;
  manaCost: string | null;
};

export type IndexPair = { a: string; b: string; nameA: string; nameB: string };

/**
 * Below this many legal pairs the sweep is refused rather than run short. 1,717 were measured;
 * a broken partner parse or a truncated catalog read would otherwise shrink the sweep and look
 * like a set rotating partners out. The room under 1,717 is for exactly that rotation.
 */
export const LEGAL_PAIR_FLOOR = 1_500;

/** Every legal pair among `cards`, in canonical id order, each pair once. */
export function legalPairs(cards: readonly PairSource[]): IndexPair[] {
  const sides = cards
    .filter((c) => isCommanderCandidate(c))
    .map((c) => ({ card: c, side: { name: c.name, ability: partnerAbility(c.oracleText) } }))
    .filter((c) => c.side.ability !== null);
  const out: IndexPair[] = [];
  for (let i = 0; i < sides.length; i++) {
    for (let j = i + 1; j < sides.length; j++) {
      if (!canPair(sides[i].side, sides[j].side)) continue;
      const x = sides[i].card;
      const y = sides[j].card;
      const pair = canonicalPair(x.oracleId, y.oracleId);
      const first = pair.commanderOracleId === x.oracleId ? x : y;
      const second = first === x ? y : x;
      out.push({ a: first.oracleId, b: second.oracleId, nameA: first.name, nameB: second.name });
    }
  }
  return out;
}

/**
 * The pairs the index sweeps: every legal pair, plus every pair a deck already holds, keyed
 * on the canonical ids so a pair in both lists is fetched once. A built pair outside today's
 * `canPair` is kept rather than dropped: it was indexed before this sweep existed, and a
 * rules change is not a reason to stop.
 */
export function unionPairs(legal: readonly IndexPair[], built: readonly IndexPair[]): IndexPair[] {
  const seen = new Set<string>();
  const out: IndexPair[] = [];
  for (const p of [...built, ...legal]) {
    const key = `${p.a}|${p.b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export const pairKey = (p: { a: string; b: string }) => `${p.a}|${p.b}`;

/**
 * What the sweep indexes, given the legal pairs the catalog formed and the pairs decks hold.
 * Below `floor` the legal sweep is refused and the BUILT pairs are still returned — the ones
 * the index carried before the sweep existed — so a short enumeration costs the widening and
 * never those pairs. Kept apart from the loader so this rule is tested without a database.
 */
export function choosePairs(
  legal: readonly IndexPair[],
  built: readonly IndexPair[],
  floor: number = LEGAL_PAIR_FLOOR,
): { pairs: IndexPair[]; legal: number; refusal: string | null } {
  if (legal.length < floor) {
    return {
      pairs: [...built],
      legal: legal.length,
      refusal:
        `only ${legal.length} legal partner pairs enumerated (floor ${floor}) — ` +
        `the legal sweep is refused and only the ${built.length} built pair(s) are indexed.`,
    };
  }
  return { pairs: unionPairs(legal, built), legal: legal.length, refusal: null };
}
