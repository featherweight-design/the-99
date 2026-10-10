import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "../profile/build";
import type { CompositionTargets, DetectionCoverage, FlagSource } from "../profile/types";
import type { CutSupport } from "./cuts";

/** Fixtures for the cut tests: a 102-card deck two over, with ramp over target and draw under it. */
const DETECTION: DetectionCoverage = {
  massLandDenial: { methods: ["m"], basis: "t" },
  extraTurn: { methods: ["m"], basis: "t" },
  twoCardCombos: { methods: ["m"], basis: "t" },
};

export const row = (over: Partial<ProfileCardRow> & { oracleId: string }): ProfileCardRow => ({
  name: over.oracleId, typeLine: "Creature — Bear", oracleText: null, keywords: [],
  cmc: 3, colorIdentity: ["G"], manaCost: "{2}{G}", quantity: 1, commanderLegal: true, layout: "normal",
  ...over,
});

const TARGETS: CompositionTargets = {
  land: 36, basic: 30, nonbasic: 6, creature: 30, instant: 8,
  sorcery: 8, artifact: 8, enchantment: 6, planeswalker: 0, battle: 0,
};

// Commander + 37 Forests + 12 ramp dorks (target 10) + 2 draw spells (target 10) + bears.
// 1 + 37 + 12 + 2 + 50 = 102 cards: two over.
export function deck(bears = 50, extra: ProfileCardRow[] = []) {
  return [
    row({ oracleId: "cmd", typeLine: "Legendary Creature — Dinosaur", cmc: 4 }),
    row({ oracleId: "forest", name: "Forest", typeLine: "Basic Land — Forest", cmc: 0, quantity: 37, manaCost: null }),
    ...Array.from({ length: 12 }, (_, i) => row({ oracleId: `ramp${i}`, cmc: 2, oracleText: "{T}: Add {G}." })),
    ...Array.from({ length: 2 }, (_, i) => row({ oracleId: `draw${i}`, typeLine: "Sorcery", cmc: 2, oracleText: "Draw two cards." })),
    ...Array.from({ length: bears }, (_, i) => row({ oracleId: `bear${i}` })),
    ...extra,
  ];
}

export function profile(over: Partial<ProfileInput> = {}, cards = deck()) {
  return buildDeckProfile({
    deckId: "d", fingerprint: "f", cards, commanderOracleIds: ["cmd"], identity: ["G"],
    condition: "G",
    composition: {
      pair: null, commander: { targets: TARGETS, averageCurve: { "2": 14, "3": 30 } }, identity: null, count: null,
    },
    roles: { pair: null, commander: { ramp: 10, draw: 10, removal: 8, wipes: 3 }, identity: null, count: null },
    thinCondition: false,
    staples: [], commanderDeckCount: 1000, population: null,
    mldFlags: new Map<string, FlagSource[]>(), extraTurnFlags: new Map<string, FlagSource[]>(),
    gameChangerIds: new Set<string>(), twoCardCombos: [], tutorIds: new Set<string>(),
    detection: DETECTION,
    ...over,
  });
}

export const support = (entries: [string, number | null][]): CutSupport => ({
  deckCount: 21375, listed: 246, inclusion: new Map(entries),
});
