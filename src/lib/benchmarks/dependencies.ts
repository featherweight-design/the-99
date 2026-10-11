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
/** Winning outright, or making an opponent lose: never "you lose the game" or "can't lose the game". */
const WINS_OUTRIGHT = /\byou win the game\b|\b(?:target|each|that|an|any) (?:opponent|player)s? loses? the game\b|\bopponents? loses? the game\b/i;
/** A win clause fired by an attack or by combat damage (Phage, Vorpal Sword) is a combat route. */
const IN_COMBAT = /\bcombat damage\b|\battacks?\b/i;
/** A route outside combat wins outright in a sentence no attack or combat damage triggers. */
export const winsOutsideCombat = (c: Pick<BenchCard, "oracleText">) =>
  (c.oracleText ?? "").split(/(?<=[.\n])/).some((s) => WINS_OUTRIGHT.test(s) && !IN_COMBAT.test(s));

const strengthOf = (value: number, cut: RowCut): Strength | null =>
  value >= cut.heavy ? "heavy" : value >= cut.light ? "light" : null;
const stronger = (a: Strength | null, b: Strength | null): Strength | null =>
  a === "heavy" || b === "heavy" ? "heavy" : a ?? b;
const sum = (cards: readonly BenchCard[]) => cards.reduce((n, c) => n + c.quantity, 0);
const byName = (cards: BenchCard[]) => cards.sort((a, b) => a.name.localeCompare(b.name));

/** How a card uses the graveyard, each reason read once: what the ledger's row says and what counts it. */
export type GraveyardUse = { fills: boolean; returns: boolean; grows: boolean; keywords: string[] };

export function graveyardUses(c: BenchCard): GraveyardUse {
  return {
    fills: c.jobs.some((j) => j.kind === "mill" && (j.affects === "self" || j.affects === "each") && selfMillReads(c)),
    returns: c.jobs.some((j) => j.kind === "recursion" && recursionReads(c)),
    grows: c.jobs.some((j) => j.threshold?.stat === "cardsInGraveyard"),
    keywords: c.keywords.filter((k) => GRAVEYARD_KEYWORDS.has(k)),
  };
}

export function usesGraveyard(c: BenchCard): boolean {
  const u = graveyardUses(c);
  return u.fills || u.returns || u.grows || u.keywords.length > 0;
}

export function paysOffArtifacts(c: BenchCard): boolean {
  return ARTIFACT_PAYOFF.test(c.oracleText ?? "")
    || c.jobs.some((j) => j.threshold?.stat === "artifacts")
    || c.keywords.some((k) => ARTIFACT_PAYOFF_KEYWORDS.includes(k));
}

const hasActivated = (c: BenchCard) => c.jobs.some((j) => j.trigger === "activated") && activatedOnBattlefield(c);
const isType = (c: BenchCard, type: string) => new RegExp(`\\b${type}\\b`).test(frontType(c));

/**
 * The raw figure behind each row, before any cut: what the cut points are derived over (plan PR 2,
 * `measure:benchmarks`), from the same filters the rows apply.
 */
export type DependencyFigures = {
  graveyard: number; graveyardCommander: boolean;
  artifacts: number; artifactPayoffs: number;
  enchantments: number; enchantmentPayoffs: number;
  creaturePayoffs: number;
  activated: number; activatedCommander: boolean;
  /** Repeatable routes to win outside combat; meaningful for combat reliance only when `lines` is 0. */
  routes: number; lines: number;
};

export function dependencyFigures(cards: readonly BenchCard[], lines: number): DependencyFigures {
  return figuresOf(readRows(cards), lines);
}

function figuresOf(r: ReturnType<typeof readRows>, lines: number): DependencyFigures {
  return {
    graveyard: sum(r.graveyard), graveyardCommander: r.graveyardCommander,
    artifacts: sum(r.artifacts), artifactPayoffs: sum(r.artifactPayoffs),
    enchantments: sum(r.enchantments), enchantmentPayoffs: sum(r.enchantmentPayoffs),
    creaturePayoffs: sum(r.creaturePayoffs),
    activated: sum(r.activated), activatedCommander: r.activatedCommander,
    routes: sum(r.routes), lines,
  };
}

/** Every row's cards, read once. */
function readRows(cards: readonly BenchCard[]) {
  const deck = body(cards).filter((c) => !isLand(c));
  const commanders = cards.filter((c) => c.commander);
  const withCommanders = [...deck, ...commanders];
  const artifacts = deck.filter((c) => isType(c, "Artifact"));
  const enchantments = deck.filter((c) => isType(c, "Enchantment"));
  return {
    graveyard: byName(withCommanders.filter(usesGraveyard)),
    graveyardCommander: commanders.some(usesGraveyard),
    landsLeftOut: byName(body(cards).filter((c) => isLand(c) && usesGraveyard(c))),
    artifacts,
    artifactPayoffs: byName(withCommanders.filter(paysOffArtifacts)),
    artifactAbilities: artifacts.filter(hasActivated),
    enchantments,
    enchantmentPayoffs: byName(withCommanders.filter((c) => ENCHANTMENT_PAYOFF.test(c.oracleText ?? ""))),
    creaturePayoffs: byName(withCommanders.filter((c) => c.jobs.some((j) => j.recurrence === "repeatable" && (
      (j.kind === "tribal" && namesACreatureType(j))
      || (j.kind === "pump" && pumpsOthers(c))
      || (j.kind === "tokens" && makesOwnTokensRepeatably(c)))))),
    activated: byName(withCommanders.filter((c) => isType(c, "Creature") && hasActivated(c))),
    activatedCommander: commanders.some((c) => isType(c, "Creature") && hasActivated(c)),
    // A route is repeatable: a one-time burn spell is reach, not a route.
    // Over the 99, as the brief measured it: a commander's drain is its own figure there, not a route.
    routes: byName(deck.filter((c) => winsOutsideCombat(c) || c.jobs.some((j) =>
      (j.kind === "drain" || j.kind === "poison" || j.kind === "mill") && (j.affects === "opponents" || j.affects === "each")
      && j.recurrence === "repeatable" && outsideCombat(j)))),
  };
}

/**
 * The deck's dependencies (brief, "Dependencies: one benchmark, a row per dependency"): each row
 * the deck reaches at its light cut or above, heavy first, then the brief's order. A RISK, NEVER A
 * SCORE: a row carries its strength and its cards, and nothing here sums or counts the rows.
 *
 * Lands are on neither side of any figure (audit build rule 7); the graveyard row names the lands it
 * left out. The artifacts and enchantments ledgers list a card once, under its first group (rule 11).
 */
/**
 * Each row's strength from its raw figures, or none: the ONE place the cuts are applied, so the
 * rows a reading draws and the draw rates `measure:benchmarks` prints cannot disagree.
 */
export function dependencyStrengths(f: DependencyFigures, cuts: DependencyCuts): Partial<Record<DependencyRow, Strength>> {
  const out: Partial<Record<DependencyRow, Strength>> = {};
  const set = (row: DependencyRow, s: Strength | null) => { if (s) out[row] = s; };
  set("graveyard", f.graveyardCommander ? "heavy" : strengthOf(f.graveyard, cuts.graveyard));
  set("artifacts", stronger(strengthOf(f.artifacts, cuts.artifacts.cards), strengthOf(f.artifactPayoffs, cuts.artifacts.payoffs)));
  set("enchantments", stronger(strengthOf(f.enchantments, cuts.enchantments.cards), strengthOf(f.enchantmentPayoffs, cuts.enchantments.payoffs)));
  set("creatures", strengthOf(f.creaturePayoffs, cuts.creatures));
  set("activated", stronger(strengthOf(f.activated, cuts.activated), f.activatedCommander ? "light" : null));
  if (f.lines === 0 && f.routes <= cuts.combat.lightMax) set("combat", f.routes === 0 ? "heavy" : "light");
  return out;
}

export function dependencies(cards: readonly BenchCard[], lines: number, cuts: DependencyCuts): Dependency[] {
  const r = readRows(cards);
  const strength = dependencyStrengths(figuresOf(r, lines), cuts);
  const rows: Dependency[] = [];

  const graveyardStrength = strength.graveyard;
  if (graveyardStrength) {
    rows.push({
      row: "graveyard", strength: graveyardStrength, count: sum(r.graveyard), commander: r.graveyardCommander,
      groups: [{ group: "usesGraveyard", cards: r.graveyard }], landsLeftOut: r.landsLeftOut,
    });
  }

  const artifactStrength = strength.artifacts;
  if (artifactStrength) {
    const listed = new Set(r.artifactPayoffs);
    const abilities = byName(r.artifactAbilities.filter((c) => !listed.has(c)));
    abilities.forEach((c) => listed.add(c));
    rows.push({
      row: "artifacts", strength: artifactStrength, count: sum(r.artifacts), payoffs: sum(r.artifactPayoffs), activated: sum(r.artifactAbilities),
      groups: [
        { group: "paysOffArtifacts" as const, cards: r.artifactPayoffs },
        { group: "artifactAbilities" as const, cards: abilities },
        { group: "otherArtifacts" as const, cards: byName(r.artifacts.filter((c) => !listed.has(c))) },
      ].filter((g) => g.cards.length > 0),
    });
  }

  const enchantmentStrength = strength.enchantments;
  if (enchantmentStrength) {
    const listed = new Set(r.enchantmentPayoffs);
    rows.push({
      row: "enchantments", strength: enchantmentStrength, count: sum(r.enchantments), payoffs: sum(r.enchantmentPayoffs),
      groups: [
        { group: "paysOffEnchantments" as const, cards: r.enchantmentPayoffs },
        { group: "otherEnchantments" as const, cards: byName(r.enchantments.filter((c) => !listed.has(c))) },
      ].filter((g) => g.cards.length > 0),
    });
  }

  const creatureStrength = strength.creatures;
  if (creatureStrength) {
    rows.push({ row: "creatures", strength: creatureStrength, payoffs: sum(r.creaturePayoffs), groups: [{ group: "paysOffCreatures", cards: r.creaturePayoffs }] });
  }

  const activatedStrength = strength.activated;
  if (activatedStrength) {
    rows.push({ row: "activated", strength: activatedStrength, count: sum(r.activated), commander: r.activatedCommander, groups: [{ group: "activatedCreatures", cards: r.activated }] });
  }

  if (strength.combat) {
    const heavy = strength.combat === "heavy";
    rows.push({ row: "combat", strength: strength.combat, routes: sum(r.routes), groups: heavy ? [] : [{ group: "winsOutsideCombat", cards: r.routes }] });
  }

  const order = (d: Dependency) => (d.strength === "heavy" ? 0 : 1) * 10 + DEPENDENCY_ROWS.indexOf(d.row);
  return rows.sort((a, b) => order(a) - order(b));
}
