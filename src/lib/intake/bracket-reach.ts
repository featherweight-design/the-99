import type { Bracket } from "./rank";
import { permitsOf, type GateFacts } from "./fill-gate";

/**
 * CAN THIS DECK REACH THE BRACKET IT WAS ASKED FOR? (Hugh's ruling, 2026-10-20.) Pure: every fact
 * is injected; `buildFillPlan` reads them (`loadBracketGateFacts`, `loadAvailability`).
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

/**
 * WHAT A FINISHED DECK LANDS IN, AND WHAT IS LEFT TO BUY TO HIT THE TARGET, asked of its own rows.
 * The reach before the fill priced the cheapest set over the fixed cards alone, and the fill can then
 * buy part of that set, a cheaper route, or a tutor that carries a combo past the target. So the
 * rows are fixed and the reach asked again over the whole eligible pool less what the deck holds:
 * a card the fill bought is never counted twice, and a set the fill made invalid is never offered.
 */
export function reachOverRows(args: {
  target: Bracket;
  commanderIds: readonly string[];
  /** Every card in the finished deck: the fixed cards and the fill's rows. */
  rowIds: readonly string[];
  /** The whole eligible pool, in the fill's order. */
  cards: readonly string[];
  facts: ReachFacts;
}): { permits: Bracket[]; buyCents: number | null } {
  const rowIds = [...new Set([...args.commanderIds, ...args.rowIds])];
  const inDeck = new Set(rowIds);
  const permits = permitsOf(args.commanderIds, rowIds, args.facts);
  if (permits.includes(args.target)) return { permits, buyCents: null };
  const left = bracketReach({
    target: args.target, commanderIds: args.commanderIds, fixedIds: rowIds,
    cards: args.cards.filter((id) => !inDeck.has(id)), facts: args.facts, budgetCents: null, ownedOnly: false,
  });
  return { permits, buyCents: left.kind === "short" && left.buy ? left.buy.buyCents : null };
}

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
  /** The slots left for the fill. A set with more cards than this cannot all be placed, so it is
   *  never offered: a combo whose second piece has no room would leave the deck short. */
  capacity?: number;
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

/**
 * Whether these raisers bring mass land denial or a turn loop into a deck holding the fixed cards:
 * any raiser flagged for mass land denial, or a loop edge from a raiser to a partner in the deck (a
 * partner that must be the commander counts only from the command zone, the rule `completesWith`
 * counts by). The one test, for a set proposed here and for a union assembled elsewhere.
 */
export function bringsForbidden(args: {
  commanderIds: readonly string[];
  fixedIds: readonly string[];
  raisers: readonly string[];
  facts: GateFacts;
}): boolean {
  const inCommandZone = new Set(args.commanderIds);
  const all = new Set([...args.commanderIds, ...args.fixedIds, ...args.raisers]);
  return args.raisers.some((id) => args.facts.flagsOf(id).massLandDenial
    || args.facts.combosOf(id).some((e) => e.loop && all.has(e.partner)
      && (!e.partnerMustBeCommander || inCommandZone.has(e.partner))));
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
  /** A raiser never brings mass land denial or a turn loop into the deck, whichever route proposed
   *  it: a Game Changer can carry the flag, and two pieces can share a loop variant as well as the
   *  non-loop one that proposed them. A loop whose partner must be the commander completes only
   *  when it is, the rule `completesWith` counts by. */
  const forbidden = (raisers: readonly string[]) => bringsForbidden({ commanderIds: args.commanderIds, fixedIds: fixed, raisers, facts });
  // A Game Changer that is forbidden on its own is never offered, so the four-card route takes the
  // next one rather than failing on it.
  const gameChangers = pool.filter((id) => facts.flagsOf(id).gameChanger && !forbidden([id]));
  const fixedGameChangers = fixed.filter((id) => facts.flagsOf(id).gameChanger).length;
  /** Every counted combo among usable and fixed cards: two pieces, each placeable from this source
   *  or already in the deck. A combo of two fixed cards is here too: it may want only a searcher. */
  const seenPairs = new Set<string>();
  const pairs = [...pool, ...fixed].flatMap((id) => facts.combosOf(id)
    .filter((e) => have(e.partner) && (!e.partnerMustBeCommander || inCommandZone.has(e.partner)))
    .flatMap((e) => {
      const key = `${e.variantId}`;
      if (seenPairs.has(key)) return [];
      seenPairs.add(key);
      return [{ pieces: [id, e.partner], loop: e.loop }];
    }));
  const placeable = (ids: string[]) => ids.filter((id) => !fixedSet.has(id) && !inCommandZone.has(id));

  if (target === 3) {
    for (const g of gameChangers) sets.push([g]);
    for (const p of pairs) if (!p.loop) sets.push(placeable(p.pieces));
  } else if (target >= 4) {
    const need = 4 - fixedGameChangers;
    if (need > 0 && gameChangers.length >= need) sets.push(cheapestFirst(gameChangers, facts, source).slice(0, need));
    // A fixed searcher (a commander that tutors) covers a piece as well as a placeable one does.
    const searchers = [...pool, ...fixed].filter((id) => facts.searches(id));
    for (const p of target === 4 ? pairs.filter((q) => !q.loop) : []) {
      // Every piece outside the command zone must be found by a searcher (`comboLandsEarly`).
      const pieces = p.pieces.filter((id) => !inCommandZone.has(id));
      const covering = (s: string) => pieces.filter((piece) => piece !== s && facts.reaches(s, piece));
      // EVERY cover, one searcher or two, so the ranking below picks the cheapest rather than the
      // first one found.
      const covers = searchers.map((s) => ({ s, found: covering(s) })).filter((c) => c.found.length > 0);
      for (const [i, a] of covers.entries()) {
        if (a.found.length === pieces.length) { sets.push([...placeable(p.pieces), a.s]); continue; }
        for (const b of covers.slice(i + 1)) {
          if (pieces.every((piece) => a.found.includes(piece) || b.found.includes(piece))) {
            sets.push([...placeable(p.pieces), a.s, b.s]);
          }
        }
      }
    }
  }

  let best: { raisers: string[]; buyCents: number; bought: number; at: number } | null = null;
  for (const raw of sets) {
    const raisers = [...new Set(raw)].filter((id) => !fixedSet.has(id));
    if (raisers.length === 0) continue;
    if (args.capacity !== undefined && raisers.length > args.capacity) continue;
    if (forbidden(raisers)) continue;
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
