import type { ComboModal } from "../bracket/combo-modal";
import type { Benchmarks } from "./compute";
import type { Dependency } from "./dependencies";
import type { InteractionKind } from "./interaction";
import type { BenchCard, Step, Strength } from "./types";
import type { RampWhy } from "./velocity";

/**
 * What a reading's benchmarks send to the client: the figures, the steps, and each ledger's cards as
 * the card row draws them. Never a card's jobs or rules text, which only the server reads.
 */
export type WireCard = { oracleId: string; name: string; manaCost: string | null; typeLine: string; manaValue: number; quantity: number; commander: boolean };

export type BenchmarksWire = {
  velocity: {
    step: Step; index: number; lands: number; points: number; averageManaValue: number;
    commanderTurn: number | null; commanderName: string | null;
    counted: { card: WireCard; points: number; why: RampWhy }[];
    notCounted: { card: WireCard; points: number; why: RampWhy }[];
  };
  flow: { step: Step; points: number; engines: number; oneShots: number; lines: { card: WireCard; points: number; repeatable: boolean }[] };
  interaction: {
    step: Step; answers: number; weighted: number; cheapInstant: number; counterspells: number;
    lines: { card: WireCard; weight: number; kind: InteractionKind; instantSpeed: boolean; cheap: boolean }[];
  };
  /** Null when the deck assembles no line: "No combo line", never a grade. */
  win: { step: Step; odds: number; lines: (ComboModal & { odds: number })[]; tutors: WireCard[] } | null;
  dependencies: DependencyWire[];
};

/** A dependency row with its ledger groups as wire cards; the row's figures are copied as they are. */
export type DependencyWire = Dependency extends infer D
  ? D extends Dependency
    ? Omit<D, "groups" | "landsLeftOut"> & {
        strength: Strength;
        groups: { group: D["groups"][number]["group"]; cards: WireCard[] }[];
        landsLeftOut?: WireCard[];
      }
    : never
  : never;

export function wireCard(c: BenchCard): WireCard {
  return { oracleId: c.oracleId, name: c.name, manaCost: c.manaCost, typeLine: c.typeLine, manaValue: c.manaValue, quantity: c.quantity, commander: c.commander };
}

export function toWire(b: Benchmarks, commanderName: string | null): BenchmarksWire {
  return {
    velocity: {
      step: b.velocity.step, index: b.velocity.index, lands: b.velocity.lands, points: b.velocity.points,
      averageManaValue: b.velocity.averageManaValue, commanderTurn: b.velocity.commanderTurn, commanderName,
      counted: b.velocity.counted.map((l) => ({ card: wireCard(l.card), points: l.points, why: l.why })),
      notCounted: b.velocity.notCounted.map((l) => ({ card: wireCard(l.card), points: l.points, why: l.why })),
    },
    flow: {
      step: b.flow.step, points: b.flow.points, engines: b.flow.engines, oneShots: b.flow.oneShots,
      lines: b.flow.lines.map((l) => ({ card: wireCard(l.card), points: l.points, repeatable: l.repeatable })),
    },
    interaction: {
      step: b.interaction.step, answers: b.interaction.answers, weighted: b.interaction.weighted,
      cheapInstant: b.interaction.cheapInstant, counterspells: b.interaction.counterspells,
      lines: b.interaction.lines.map((l) => ({ card: wireCard(l.card), weight: l.weight, kind: l.kind, instantSpeed: l.instantSpeed, cheap: l.cheap })),
    },
    win: b.win && {
      step: b.win.step, odds: b.win.odds,
      lines: b.win.lines.map((l) => ({ variantId: l.variantId, cards: l.cards, produces: l.produces, mana: l.mana, steps: l.steps, prerequisites: l.prerequisites, odds: l.odds })),
      tutors: b.win.tutors.map(wireCard),
    },
    dependencies: b.dependencies.map((d) => ({
      ...d,
      groups: d.groups.map((g) => ({ group: g.group, cards: g.cards.map(wireCard) })),
      ...(d.row === "graveyard" ? { landsLeftOut: d.landsLeftOut.map(wireCard) } : {}),
    }) as DependencyWire),
  };
}
