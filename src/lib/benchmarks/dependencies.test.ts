import { describe, expect, it } from "vitest";
import { dependencies, type DependencyCuts } from "./dependencies";
import { card, job, land } from "./fixtures";

const cuts: DependencyCuts = {
  graveyard: { light: 3, heavy: 5 },
  artifacts: { cards: { light: 3, heavy: 5 }, payoffs: { light: 2, heavy: 3 } },
  enchantments: { cards: { light: 3, heavy: 5 }, payoffs: { light: 2, heavy: 3 } },
  creatures: { light: 2, heavy: 3 },
  activated: { light: 2, heavy: 3 },
  combat: { lightMax: 1 },
};
const many = (n: number, f: (i: number) => ReturnType<typeof card>) => Array.from({ length: n }, (_, i) => f(i));
const rows = (deps: ReturnType<typeof dependencies>) => deps.map((d) => `${d.row}:${d.strength}`);
const route = card("Drain", { jobs: [job({ kind: "drain", affects: "opponents", recurrence: "repeatable" })] });

describe("dependencies", () => {
  it("draws a row only at its light cut, heavy at its heavy cut", () => {
    const recursion = (i: number) => card(`R${i}`, { oracleText: "Return target card from your graveyard to your hand.", jobs: [job({ kind: "recursion" })] });
    expect(rows(dependencies([route, route, ...many(2, recursion)], 0, cuts))).toEqual([]);
    expect(rows(dependencies([route, route, ...many(3, recursion)], 0, cuts))).toEqual(["graveyard:light"]);
    expect(rows(dependencies([route, route, ...many(5, recursion)], 0, cuts))).toEqual(["graveyard:heavy"]);
  });

  it("makes a graveyard commander heavy, and leaves lands out, naming them", () => {
    const cmd = card("Teval", { commander: true, keywords: ["Flashback"] });
    const coliseum = land("Cephalid Coliseum", { typeLine: "Land", keywords: ["Threshold"] });
    const [row] = dependencies([cmd, coliseum, route, route], 0, cuts);
    expect(row).toMatchObject({ row: "graveyard", strength: "heavy", count: 1, commander: true });
    expect(row.row === "graveyard" && row.landsLeftOut.map((c) => c.name)).toEqual(["Cephalid Coliseum"]);
  });

  it("takes the stronger of the artifact figures and lists a card once, under its first group", () => {
    const payoff = (i: number) => card(`Pay${i}`, { typeLine: "Artifact", oracleText: "Whenever an artifact enters, draw a card.", jobs: [job({ kind: "draw", trigger: "activated" })] });
    const deps = dependencies([route, route, ...many(3, payoff), card("Rock", { typeLine: "Artifact", oracleText: "{T}: Add {C}.", jobs: [job({ kind: "ramp", trigger: "activated" })] })], 0, cuts);
    const row = deps.find((d) => d.row === "artifacts")!;
    expect(row.strength).toBe("heavy");
    expect(row.groups.map((g) => [g.group, g.cards.map((c) => c.name)])).toEqual([
      ["paysOffArtifacts", ["Pay0", "Pay1", "Pay2"]], ["artifactAbilities", ["Rock"]],
    ]);
  });

  it("reads combat reliance the other way: heavy with no route and no line, none with a line", () => {
    expect(rows(dependencies([card("Bear", { typeLine: "Creature" })], 0, cuts))).toEqual(["combat:heavy"]);
    expect(dependencies([card("Bear")], 0, cuts)[0]).toMatchObject({ groups: [] });
    expect(rows(dependencies([route], 0, cuts))).toEqual(["combat:light"]);
    expect(rows(dependencies([card("Bear")], 1, cuts))).toEqual([]);
  });

  it("does not count a one-time burn as a route", () => {
    const bolt = card("Lightning Bolt", { jobs: [job({ kind: "drain", affects: "opponents" })] });
    expect(rows(dependencies([bolt], 0, cuts))).toEqual(["combat:heavy"]);
  });

  it("orders heavy first, then the brief's order", () => {
    const deck = [
      ...many(3, (i) => card(`R${i}`, { oracleText: "Return target card from your graveyard to your hand.", jobs: [job({ kind: "recursion" })] })),
      ...many(3, (i) => card(`Elf${i}`, { typeLine: "Creature — Elf", oracleText: "{T}: Add {G}.", jobs: [job({ kind: "ramp", trigger: "activated" })] })),
    ];
    expect(rows(dependencies(deck, 0, cuts))).toEqual(["activated:heavy", "combat:heavy", "graveyard:light"]);
  });
});
