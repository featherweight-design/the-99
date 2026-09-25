import { comboLandsEarly, permitsFor, violationsFor } from "../bracket/rules";
import type { FillCandidate, FillGate } from "../decks/fill";
import type { Bracket, BracketFacts } from "./rank";

/**
 * The two constraints Help me choose's answers put on a fill (brief §2 ruling 6, §6), as
 * `FillGate`s `planFill` consults at every placement. Pure: every fact is injected, and
 * `fill-facts.ts` loads them.
 *
 * THE BUDGET IS A RUNNING CAP. A card the player must buy (unowned, or owned but every copy claimed
 * by a committed deck, the Shopping list's own rule) is taken in the fill's own order only while its
 * price, the cheapest printing stocked now, fits in what remains. A card never stocked has no
 * price and is left out: the budget cannot count it. The build-around card is placed before the
 * fill and priced first, so the cap starts from what it left.
 *
 * THE BRACKET is the stated limits (`violationsFor`), counted over the commander, the build-around
 * card and every card the fill has placed:
 *  - at 1 and 2, no card may complete a two-card combo with one already placed, a PAIRWISE check
 *    because a combo is a fact about two cards and neither alone breaks anything;
 *  - at 3 a combo may be placed (whether it lands early is not computable from a list), but no
 *    card may leave the deck able to ASSEMBLE one (`comboLandsEarly`), which is what `permitsFor`
 *    reads as a 4. In practice that is the tutor that would reach the last uncovered piece, or the
 *    piece that completes a combo tutors already reach.
 * Brackets 4 and 5 state no limits, so they get no gate.
 */

export type ComboEdge = {
  variantId: string;
  /** The other piece. */
  partner: string;
  /** Spellbook records it as producing infinite turns: the one combo that breaks bracket 3. */
  loop: boolean;
  /** The partner only works from the command zone (§4.3b). */
  partnerMustBeCommander: boolean;
};

export type GateFacts = {
  flagsOf(oracleId: string): BracketFacts;
  /** The counted two-card combos this card is a piece of, with the piece in the 99 (a variant
   *  that needs THIS card as the commander is not listed). */
  combosOf(oracleId: string): readonly ComboEdge[];
  /** Whether a card searches its library, and whether that search can find a given piece. */
  searches(oracleId: string): boolean;
  reaches(searcherId: string, pieceId: string): boolean;
};

export function budgetGate(args: {
  remainingCents: number;
  /** Whether placing this card means buying it. */
  buys(candidate: FillCandidate): boolean;
  priceOf(oracleId: string): number | null;
}): FillGate {
  let remaining = args.remainingCents;
  return {
    admits(c) {
      if (!args.buys(c)) return true;
      const price = args.priceOf(c.oracleId);
      return price !== null && price <= remaining;
    },
    place(c) {
      if (args.buys(c)) remaining -= args.priceOf(c.oracleId) ?? 0;
    },
  };
}

type Combo = { variantId: string; cards: { oracleId: string }[]; loop: boolean };

export function bracketGate(args: {
  bracket: Bracket;
  /** The commander (and partner), in the command zone. */
  commanderIds: readonly string[];
  /** Placed before the fill: the commander(s) and the build-around card. */
  fixedIds: readonly string[];
  facts: GateFacts;
}): FillGate | null {
  const { bracket, facts } = args;
  if (bracket >= 4) return null;
  const inCommandZone = new Set(args.commanderIds);

  const placed = new Set<string>();
  const counts = { gameChangers: 0, massLandDenial: 0, extraTurns: 0 };
  const combos = new Map<string, Combo>();
  const searchers = new Set<string>();

  /** The combos `id` would complete with what is already placed. */
  const completes = (id: string, among: ReadonlySet<string>): Combo[] =>
    facts.combosOf(id)
      .filter((e) => among.has(e.partner) && (!e.partnerMustBeCommander || inCommandZone.has(e.partner)))
      .map((e) => ({ variantId: e.variantId, cards: [{ oracleId: id }, { oracleId: e.partner }], loop: e.loop }));

  /** Every reach among these searchers and these combos, the profile builder's pairing: a
   *  searcher never reaches itself, and a piece in the command zone is never searched for. */
  const reachesOf = (allSearchers: Iterable<string>, allCombos: Iterable<Combo>) => {
    const out: { combo: { variantId: string }; piece: { oracleId: string } }[] = [];
    for (const s of allSearchers) {
      for (const combo of allCombos) {
        for (const piece of combo.cards) {
          if (piece.oracleId === s || inCommandZone.has(piece.oracleId)) continue;
          if (facts.reaches(s, piece.oracleId)) out.push({ combo, piece });
        }
      }
    }
    return out;
  };

  const withinLimits = (id: string): boolean => {
    const f = facts.flagsOf(id);
    const next = completes(id, placed);
    const allCombos = [...combos.values(), ...next];
    const v = violationsFor({
      gameChangers: counts.gameChangers + (f.gameChanger ? 1 : 0),
      massLandDenial: counts.massLandDenial + (f.massLandDenial ? 1 : 0),
      extraTurns: counts.extraTurns + (f.extraTurn ? 1 : 0),
      combos: allCombos.length,
      loops: allCombos.filter((c) => c.loop).length,
    });
    const allSearchers = facts.searches(id) ? [...searchers, id] : [...searchers];
    const assemblesCombo = bracket === 3 && comboLandsEarly(allCombos, reachesOf(allSearchers, allCombos), args.commanderIds);
    return Math.min(...permitsFor({ ...v, assemblesCombo })) <= bracket;
  };

  const record = (id: string) => {
    const f = facts.flagsOf(id);
    for (const c of completes(id, placed)) combos.set(c.variantId, c);
    placed.add(id);
    if (f.gameChanger) counts.gameChangers += 1;
    if (f.massLandDenial) counts.massLandDenial += 1;
    if (f.extraTurn) counts.extraTurns += 1;
    if (facts.searches(id)) searchers.add(id);
  };
  for (const id of args.fixedIds) record(id);

  return {
    admits: (c) => withinLimits(c.oracleId),
    place: (c) => record(c.oracleId),
  };
}

/** Every gate must admit a card, and every gate hears it placed. */
export function allGates(gates: readonly (FillGate | null)[]): FillGate | undefined {
  const live = gates.filter((g): g is FillGate => g !== null);
  if (live.length === 0) return undefined;
  return {
    admits: (c) => live.every((g) => g.admits(c)),
    place: (c) => live.forEach((g) => g.place(c)),
  };
}
