import { body, frontType, isLand } from "./cards";
import { activatedOnBattlefield, makesOwnTokensRepeatably, namesACreatureType, outsideCombat, pumpsOthers, recursionReads, selfMillReads } from "./readings";
import type { BenchCard, Strength } from "./types";

export const DEPENDENCY_ROWS = ["graveyard", "artifacts", "enchantments", "creatures", "activated", "combat"] as const;
export type DependencyRow = (typeof DEPENDENCY_ROWS)[number];

/** A row's cut on one figure: light at `light` or more, heavy at `heavy` or more. */
export type RowCut = { light: number; heavy: number };

export type DependencyCuts = {
  graveyard: RowCut;
  artifacts: { cards: RowCut; payoffs: RowCut };
  enchantments: { cards: RowCut; payoffs: RowCut };
  creatures: RowCut;
  activated: RowCut;
  /** Combat reliance runs the other way: FEWER routes is heavier. Light at or under this many. */
  combat: { lightMax: number };
};

export type LedgerGroup<G extends string> = { group: G; cards: BenchCard[] };

export type Dependency =
  | { row: "graveyard"; strength: Strength; count: number; commander: boolean; groups: LedgerGroup<"usesGraveyard">[]; landsLeftOut: BenchCard[] }
  | { row: "artifacts"; strength: Strength; count: number; payoffs: number; activated: number; groups: LedgerGroup<"paysOffArtifacts" | "artifactAbilities" | "otherArtifacts">[] }
  | { row: "enchantments"; strength: Strength; count: number; payoffs: number; groups: LedgerGroup<"paysOffEnchantments" | "otherEnchantments">[] }
  | { row: "creatures"; strength: Strength; payoffs: number; groups: LedgerGroup<"paysOffCreatures">[] }
  | { row: "activated"; strength: Strength; count: number; commander: boolean; groups: LedgerGroup<"activatedCreatures">[] }
  /** Heavy has no ledger: no card wins outside combat (audit build rule 3). */
  | { row: "combat"; strength: Strength; routes: number; groups: LedgerGroup<"winsOutsideCombat">[] };

/** Keywords that play from, or grow with, the graveyard. Printed as their rules names. */
const GRAVEYARD_KEYWORDS = new Set([
  "Flashback", "Escape", "Delve", "Unearth", "Disturb", "Retrace", "Embalm", "Eternalize",
  "Jump-start", "Aftermath", "Threshold", "Dredge", "Scavenge", "Encore", "Craft",
]);
const ARTIFACT_PAYOFF = /\bartifacts? you control\b|\bfor each artifact\b|\bwhenever an(?:other)? artifact\b|\bartifact spells?\b|\bnumber of artifacts\b/i;
const ARTIFACT_PAYOFF_KEYWORDS = ["Affinity", "Improvise", "Metalcraft"];
const ENCHANTMENT_PAYOFF = /\benchantments? you control\b|\bfor each enchantment\b|\bwhenever an(?:other)? enchantment\b|\benchantment spells?\b|\bconstellation\b|\bnumber of enchantments\b|\baura spells?\b/i;
const WINS_OUTRIGHT = /\byou win the game\b|\bloses? the game\b/i;

const strengthOf = (value: number, cut: RowCut): Strength | null =>
  value >= cut.heavy ? "heavy" : value >= cut.light ? "light" : null;
const stronger = (a: Strength | null, b: Strength | null): Strength | null =>
  a === "heavy" || b === "heavy" ? "heavy" : a ?? b;
const sum = (cards: readonly BenchCard[]) => cards.reduce((n, c) => n + c.quantity, 0);
const byName = (cards: BenchCard[]) => cards.sort((a, b) => a.name.localeCompare(b.name));

export function usesGraveyard(c: BenchCard): boolean {
  return c.jobs.some((j) => (j.kind === "recursion" && recursionReads(c))
      || (j.kind === "mill" && (j.affects === "self" || j.affects === "each") && selfMillReads(c))
      || j.threshold?.stat === "cardsInGraveyard")
    || c.keywords.some((k) => GRAVEYARD_KEYWORDS.has(k));
}

export function paysOffArtifacts(c: BenchCard): boolean {
  return ARTIFACT_PAYOFF.test(c.oracleText ?? "")
    || c.jobs.some((j) => j.threshold?.stat === "artifacts")
    || c.keywords.some((k) => ARTIFACT_PAYOFF_KEYWORDS.includes(k));
}

const hasActivated = (c: BenchCard) => c.jobs.some((j) => j.trigger === "activated") && activatedOnBattlefield(c);
const isType = (c: BenchCard, type: string) => new RegExp(`\\b${type}\\b`).test(frontType(c));

/**
 * The deck's dependencies (brief, "Dependencies: one benchmark, a row per dependency"): each row
 * the deck reaches at its light cut or above, heavy first, then the brief's order. A RISK, NEVER A
 * SCORE: a row carries its strength and its cards, and nothing here sums or counts the rows.
 *
 * Lands are on neither side of any figure (audit build rule 7); the graveyard row names the lands it
 * left out. The artifacts and enchantments ledgers list a card once, under its first group (rule 11).
 */
export function dependencies(cards: readonly BenchCard[], lines: number, cuts: DependencyCuts): Dependency[] {
  const deck = body(cards).filter((c) => !isLand(c));
  const commanders = cards.filter((c) => c.commander);
  const withCommanders = [...deck, ...commanders];
  const rows: Dependency[] = [];

  const graveyard = byName(withCommanders.filter(usesGraveyard));
  const graveyardCommander = commanders.some(usesGraveyard);
  const graveyardStrength = graveyardCommander ? "heavy" : strengthOf(sum(graveyard), cuts.graveyard);
  if (graveyardStrength) {
    rows.push({
      row: "graveyard", strength: graveyardStrength, count: sum(graveyard), commander: graveyardCommander,
      groups: [{ group: "usesGraveyard", cards: graveyard }],
      landsLeftOut: byName(body(cards).filter((c) => isLand(c) && usesGraveyard(c))),
    });
  }

  const artifacts = deck.filter((c) => isType(c, "Artifact"));
  const artifactPayoffs = byName(withCommanders.filter(paysOffArtifacts));
  const artifactAbilities = artifacts.filter(hasActivated);
  const artifactStrength = stronger(strengthOf(sum(artifacts), cuts.artifacts.cards), strengthOf(sum(artifactPayoffs), cuts.artifacts.payoffs));
  if (artifactStrength) {
    const listed = new Set(artifactPayoffs);
    const abilities = byName(artifactAbilities.filter((c) => !listed.has(c)));
    abilities.forEach((c) => listed.add(c));
    rows.push({
      row: "artifacts", strength: artifactStrength, count: sum(artifacts), payoffs: sum(artifactPayoffs), activated: sum(artifactAbilities),
      groups: [
        { group: "paysOffArtifacts" as const, cards: artifactPayoffs },
        { group: "artifactAbilities" as const, cards: abilities },
        { group: "otherArtifacts" as const, cards: byName(artifacts.filter((c) => !listed.has(c))) },
      ].filter((g) => g.cards.length > 0),
    });
  }

  const enchantments = deck.filter((c) => isType(c, "Enchantment"));
  const enchantmentPayoffs = byName(withCommanders.filter((c) => ENCHANTMENT_PAYOFF.test(c.oracleText ?? "")));
  const enchantmentStrength = stronger(strengthOf(sum(enchantments), cuts.enchantments.cards), strengthOf(sum(enchantmentPayoffs), cuts.enchantments.payoffs));
  if (enchantmentStrength) {
    const listed = new Set(enchantmentPayoffs);
    rows.push({
      row: "enchantments", strength: enchantmentStrength, count: sum(enchantments), payoffs: sum(enchantmentPayoffs),
      groups: [
        { group: "paysOffEnchantments" as const, cards: enchantmentPayoffs },
        { group: "otherEnchantments" as const, cards: byName(enchantments.filter((c) => !listed.has(c))) },
      ].filter((g) => g.cards.length > 0),
    });
  }

  const creaturePayoffs = byName(withCommanders.filter((c) => c.jobs.some((j) => j.recurrence === "repeatable" && (
    (j.kind === "tribal" && namesACreatureType(j))
    || (j.kind === "pump" && pumpsOthers(c))
    || (j.kind === "tokens" && makesOwnTokensRepeatably(c))))));
  const creatureStrength = strengthOf(sum(creaturePayoffs), cuts.creatures);
  if (creatureStrength) {
    rows.push({ row: "creatures", strength: creatureStrength, payoffs: sum(creaturePayoffs), groups: [{ group: "paysOffCreatures", cards: creaturePayoffs }] });
  }

  const activated = byName(withCommanders.filter((c) => isType(c, "Creature") && hasActivated(c)));
  const activatedCommander = commanders.some((c) => isType(c, "Creature") && hasActivated(c));
  const activatedStrength = stronger(strengthOf(sum(activated), cuts.activated), activatedCommander ? "light" : null);
  if (activatedStrength) {
    rows.push({ row: "activated", strength: activatedStrength, count: sum(activated), commander: activatedCommander, groups: [{ group: "activatedCreatures", cards: activated }] });
  }

  // A route is repeatable: a one-time burn spell is reach, not a route.
  const routes = byName(withCommanders.filter((c) => WINS_OUTRIGHT.test(c.oracleText ?? "") || c.jobs.some((j) =>
    (j.kind === "drain" || j.kind === "poison" || j.kind === "mill") && (j.affects === "opponents" || j.affects === "each")
    && j.recurrence === "repeatable" && outsideCombat(j))));
  const routeCount = sum(routes);
  if (lines === 0 && routeCount <= cuts.combat.lightMax) {
    const heavy = routeCount === 0;
    rows.push({ row: "combat", strength: heavy ? "heavy" : "light", routes: routeCount, groups: heavy ? [] : [{ group: "winsOutsideCombat", cards: routes }] });
  }

  const order = (d: Dependency) => (d.strength === "heavy" ? 0 : 1) * 10 + DEPENDENCY_ROWS.indexOf(d.row);
  return rows.sort((a, b) => order(a) - order(b));
}
