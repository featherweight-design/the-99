import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "../../../lib/profile/build";
import type { BracketPopulation, DetectionCoverage, FlagSource } from "../../../lib/profile/types";

/**
 * A REAL profile, built by the real builder, for the surfaces that draw one.
 *
 * NEVER A HAND-WRITTEN OBJECT. A literal cast to `DeckProfile` can hold a state the builder
 * cannot produce — a violation at a bracket the rules never reach, a population whose total does
 * not match its counts — and a component test over one proves something about a deck that cannot
 * exist. `slot.test.ts` takes the same position and for the same reason.
 */

const DETECTION: DetectionCoverage = {
  massLandDenial: { methods: ["m"], basis: "22 of 24 on a curated set" },
  extraTurn: { methods: ["m"], basis: "no misses among the 56" },
  twoCardCombos: { methods: ["m"], basis: "Spellbook's index" },
};

export const profileCard = (oracleId: string, name = oracleId): ProfileCardRow => ({
  oracleId,
  name,
  layout: "normal",
  typeLine: "Creature — Human",
  oracleText: null,
  keywords: [],
  cmc: 2,
  colorIdentity: [],
  manaCost: "{1}{G}",
  quantity: 1,
  commanderLegal: true,
});

export const population = (
  counts: Partial<Record<"1" | "2" | "3" | "4" | "5", number>>,
  of: "commander" | "pair" = "commander",
  deckCount: number | null = 12_000,
): BracketPopulation => {
  const full = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, ...counts };
  return {
    counts: full,
    declaredTotal: Object.values(full).reduce((a, b) => a + b, 0),
    deckCount,
    of,
  };
};

/** The commander every fixture is led by unless one is named, so a profile always has a name. */
export const COMMANDER = profileCard("cmd", "Myrel, Shield of Argive");

export function deckProfile(over: Partial<ProfileInput> = {}) {
  const input: ProfileInput = {
    deckId: "d",
    fingerprint: "f",
    cards: [COMMANDER],
    commanderOracleIds: [COMMANDER.oracleId],
    identity: ["W"],
    condition: "W",
    composition: { pair: null, commander: null, identity: null, count: null },
    roles: { pair: null, commander: null, identity: null, count: null },
    thinCondition: false,
    staples: [],
    commanderDeckCount: null,
    population: null,
    mldFlags: new Map<string, FlagSource[]>(),
    extraTurnFlags: new Map<string, FlagSource[]>(),
    gameChangerIds: new Set<string>(),
    twoCardCombos: [],
    tutorIds: new Set<string>(),
    detection: DETECTION,
    ...over,
  };
  return buildDeckProfile(input);
}
