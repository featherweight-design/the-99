import type { Bracket } from "./rank";
import { permitsOf, type GateFacts } from "./fill-gate";

/**
 * CAN THIS DECK REACH THE BRACKET IT WAS ASKED FOR? (Hugh's ruling, 2026-10-20.) Pure: every fact
 * is injected, and `bracket-reach-load.ts` reads them.
 *
 * Help me choose's bracket answer was only ever a CEILING (`bracketGate`, `rank.withinBracket`):
 * nothing placed a card to REACH it, so a bracket-3 ask over a collection with a free Game Changer
 * still came back reading 1-2. A deck reaches its target when the target is among the brackets the
 * finished list permits, by the analysis's own arithmetic (`permitsOf`). So [1,2] reaches 1 and 2,
 * and [4,5] reaches 4 and 5.
 *
 * A RAISER is the smallest set of cards that, added to the fixed cards, reaches the target without
 * going over it. Every candidate set is checked through `permitsOf`, so the rules are never
 * restated here; this module only proposes sets, smallest first, then in the caller's order:
 *  - 3: one Game Changer, or one counted non-loop two-card combo (a piece may be the commander);
 *  - 4: the Game Changers to make four, or a combo with the searchers that find every piece
 *    (`comboLandsEarly`), which permits [4];
 *  - 5: the Game Changers to make four, the one raiser that permits [4,5].
 * Brackets 1 and 2 need nothing: no card has to be placed to stay under a limit.
 *
 * MASS LAND DENIAL AND TURN LOOPS ARE NEVER RAISERS (plan review, 2026-10-21), though either moves
 * a deck past 3: seeding Armageddon or an extra-turn loop on the player's behalf to hit a number is
 * not what asking for bracket 4 meant. The caller passes no lands either: a land goes through the
 * fill's land sweep, whose caps can drop it, so a land raiser could silently not be placed.
 *
 * Two sources: the COLLECTION (every card a free copy of, or in the command zone) and BUYING (any
 * card with a free copy or a live price). Buying is never the answer when the collection reaches the
 * target, and a buying set is the fewest cards to buy, then the cheapest.
 */

export type ReachFacts = GateFacts & {
  /** The player can sleeve a copy without buying one (`buysCopy` is false). */
  free(oracleId: string): boolean;
  /** Live cents for one copy; null when it is not stocked now, and then it cannot be bought. */
  priceOf(oracleId: string): number | null;
};

export type BracketReach =
  /** The fixed cards already sit inside the target, or no card needs placing to stay under it. */
  | { target: Bracket; kind: "fixed" }
  /** The fixed cards already sit ABOVE the target. Nothing placed can bring a deck down. */
  | { target: Bracket; kind: "above"; permits: Bracket[] }
  /** The collection reaches it: place these. */
  | { target: Bracket; kind: "collection"; raisers: string[] }
  | {
      target: Bracket;
      kind: "short";
      /** What a collection-only deck permits: the bracket "build from my collection" lands in. */
      collectionPermits: Bracket[];
      /** The cards that get a collection-only deck there; empty when nothing needs placing. */
      collectionRaisers: string[];
      /** The cheapest way to hit the target by buying. Null when nothing buyable reaches it, or when
       *  the deck may hold only owned cards. `overBudget` keeps a set that costs more than the
       *  budget, so a screen can say why rather than say nothing. */
      buy: { raisers: string[]; buyCents: number; overBudget: boolean } | null;
    };

type Source = "collection" | "buying";

export function bracketReach(args: {
  target: Bracket;
  commanderIds: readonly string[];
  /** The commander(s) and every card placed before the fill (a build-around card). */
  fixedIds: readonly string[];
  /** Every card the deck may take, in the order the fill prefers them. */
  cards: readonly string[];
  facts: ReachFacts;
  budgetCents: number | null;
  ownedOnly: boolean;
}): BracketReach {
  const { target, facts } = args;
  const fixed = [...new Set([...args.commanderIds, ...args.fixedIds])];
  const fixedPermits = permitsOf(args.commanderIds, fixed, facts);
  if (fixedPermits.includes(target)) return { target, kind: "fixed" };
  if (Math.min(...fixedPermits) > target) return { target, kind: "above", permits: fixedPermits };

  const fromCollection = cheapestRaiser(args, target, "collection");
  if (fromCollection) return { target, kind: "collection", raisers: fromCollection.raisers };

  // What a collection-only deck lands in: the highest bracket under the target it can reach, or
  // the fixed cards' own range when none above it can be reached.
  let collectionPermits = fixedPermits;
  let collectionRaisers: string[] = [];
  for (let lower = target - 1; lower > Math.max(...fixedPermits); lower--) {
    const found = cheapestRaiser(args, lower as Bracket, "collection");
    if (found) {
      collectionPermits = permitsOf(args.commanderIds, [...fixed, ...found.raisers], facts);
      collectionRaisers = found.raisers;
      break;
    }
  }
  const bought = args.ownedOnly ? null : cheapestRaiser(args, target, "buying");
  return {
    target, kind: "short", collectionPermits, collectionRaisers,
    buy: bought && {
      raisers: bought.raisers,
      buyCents: bought.buyCents,
      overBudget: args.budgetCents !== null && bought.buyCents > args.budgetCents,
    },
  };
}

/** The best set from one source that reaches `target`: fewest cards bought, then cheapest, then
 *  fewest cards, then the caller's order. Null when no set does. */
function cheapestRaiser(
  args: Parameters<typeof bracketReach>[0],
  target: Bracket,
  source: Source,
): { raisers: string[]; buyCents: number } | null {
  const { facts } = args;
  const inCommandZone = new Set(args.commanderIds);
  const fixed = [...new Set([...args.commanderIds, ...args.fixedIds])];
  const fixedSet = new Set(fixed);
  const usable = (id: string) =>
    !fixedSet.has(id) && (facts.free(id) || (source === "buying" && facts.priceOf(id) !== null));
  const pool = args.cards.filter(usable);
  const order = new Map(pool.map((id, i) => [id, i]));
  /** Present in the deck or the command zone already, or placeable from this source. */
  const have = (id: string) => fixedSet.has(id) || inCommandZone.has(id) || order.has(id);

  const sets: string[][] = [];
  const gameChangers = pool.filter((id) => facts.flagsOf(id).gameChanger);
  const fixedGameChangers = fixed.filter((id) => facts.flagsOf(id).gameChanger).length;
  /** Every counted combo among usable cards: the piece to place and its partner, which is either
   *  placeable too or already in the deck. */
  const pairs = pool.flatMap((id) => facts.combosOf(id)
    .filter((e) => have(e.partner) && (!e.partnerMustBeCommander || inCommandZone.has(e.partner)))
    .map((e) => ({ pieces: [id, e.partner], loop: e.loop })));
  const placeable = (ids: string[]) => ids.filter((id) => !fixedSet.has(id) && !inCommandZone.has(id));

  if (target === 3) {
    for (const g of gameChangers) sets.push([g]);
    for (const p of pairs) if (!p.loop) sets.push(placeable(p.pieces));
  } else if (target >= 4) {
    const need = 4 - fixedGameChangers;
    if (need > 0 && gameChangers.length >= need) sets.push(cheapestFirst(gameChangers, facts, source).slice(0, need));
    const searchers = pool.filter((id) => facts.searches(id));
    for (const p of target === 4 ? pairs.filter((q) => !q.loop) : []) {
      // Every piece outside the command zone must be found by a searcher (`comboLandsEarly`).
      const pieces = p.pieces.filter((id) => !inCommandZone.has(id));
      const covering = (s: string) => pieces.filter((piece) => piece !== s && facts.reaches(s, piece));
      const one = searchers.find((s) => covering(s).length === pieces.length);
      if (one) { sets.push([...placeable(p.pieces), one]); continue; }
      const first = searchers.find((s) => covering(s).length > 0);
      if (!first) continue;
      const rest = pieces.filter((piece) => !covering(first).includes(piece));
      const second = searchers.find((s) => s !== first && rest.every((piece) => covering(s).includes(piece)));
      if (second) sets.push([...placeable(p.pieces), first, second]);
    }
  }

  let best: { raisers: string[]; buyCents: number; bought: number; at: number } | null = null;
  for (const raw of sets) {
    const raisers = [...new Set(raw)].filter((id) => !fixedSet.has(id));
    if (raisers.length === 0) continue;
    if (source === "collection" && !raisers.every((id) => facts.free(id))) continue;
    if (!permitsOf(args.commanderIds, [...fixed, ...raisers], facts).includes(target)) continue;
    const toBuy = raisers.filter((id) => !facts.free(id));
    const buyCents = toBuy.reduce((sum, id) => sum + (facts.priceOf(id) ?? 0), 0);
    const at = Math.max(...raisers.map((id) => order.get(id) ?? Infinity));
    const better = !best
      || toBuy.length < best.bought
      || (toBuy.length === best.bought && buyCents < best.buyCents)
      || (toBuy.length === best.bought && buyCents === best.buyCents && raisers.length < best.raisers.length)
      || (toBuy.length === best.bought && buyCents === best.buyCents && raisers.length === best.raisers.length && at < best.at);
    if (better) best = { raisers, buyCents, bought: toBuy.length, at };
  }
  return best && { raisers: best.raisers, buyCents: best.buyCents };
}

/** Free copies first, then the cheapest to buy, then the caller's order (a stable sort). */
function cheapestFirst(ids: readonly string[], facts: ReachFacts, source: Source): string[] {
  if (source === "collection") return [...ids];
  const cost = (id: string) => (facts.free(id) ? 0 : facts.priceOf(id) ?? Infinity);
  return [...ids].sort((a, b) => cost(a) - cost(b));
}
