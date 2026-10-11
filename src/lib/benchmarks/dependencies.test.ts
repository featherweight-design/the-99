import { describe, expect, it } from "vitest";
import { dependencies, graveyardUses, usesGraveyard, type DependencyCuts } from "./dependencies";
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
    // Pay0 also has an ability, so it qualifies for both groups and must be listed once, as a payoff.
    const payoff = (i: number) => card(`Pay${i}`, { typeLine: "Artifact", oracleText: i === 0 ? "Whenever an artifact enters, draw a card.\n{T}: Add {C}." : "Whenever an artifact enters, draw a card.", jobs: [job({ kind: "draw", trigger: "activated" })] });
    const deps = dependencies([route, route, ...many(3, payoff), card("Rock", { typeLine: "Artifact", oracleText: "{T}: Add {C}.", jobs: [job({ kind: "ramp", trigger: "activated" })] })], 0, cuts);
    const row = deps.find((d) => d.row === "artifacts")!;
    expect(row.strength).toBe("heavy");
    expect(row.groups.map((g) => [g.group, g.cards.map((c) => c.name)])).toEqual([
      ["paysOffArtifacts", ["Pay0", "Pay1", "Pay2"]], ["artifactAbilities", ["Rock"]],
    ]);
  });

  it("draws enchantments from the stronger figure, at each cut", () => {
    const ench = (i: number) => card(`E${i}`, { typeLine: "Enchantment" });
    const payoff = (i: number) => card(`P${i}`, { typeLine: "Creature", oracleText: "Whenever an enchantment enters, draw a card." });
    const row = (deck: ReturnType<typeof card>[]) => rows(dependencies([route, route, ...deck], 0, cuts)).filter((r) => r.startsWith("enchantments"));
    expect(row(many(2, ench))).toEqual([]);
    expect(row(many(3, ench))).toEqual(["enchantments:light"]);
    expect(row(many(5, ench))).toEqual(["enchantments:heavy"]);
    expect(row(many(1, payoff))).toEqual([]);
    expect(row(many(2, payoff))).toEqual(["enchantments:light"]);
    expect(row([...many(3, payoff), ...many(3, ench)])).toEqual(["enchantments:heavy"]);
  });

  it("draws creatures from repeatable payoffs only, at each cut", () => {
    const lord = (i: number) => card(`Lord${i}`, { typeLine: "Creature", oracleText: "Other creatures you control get +1/+1.", jobs: [job({ kind: "pump", recurrence: "repeatable" })] });
    const once = card("Once", { typeLine: "Sorcery", oracleText: "Creatures you control get +2/+2 until end of turn.", jobs: [job({ kind: "pump" })] });
    const row = (deck: ReturnType<typeof card>[]) => rows(dependencies([route, route, ...deck], 0, cuts)).filter((r) => r.startsWith("creatures"));
    expect(row([lord(0), once])).toEqual([]);
    expect(row(many(2, lord))).toEqual(["creatures:light"]);
    expect(row(many(3, lord))).toEqual(["creatures:heavy"]);
  });

  it("draws activated abilities at each cut", () => {
    const elf = (i: number) => card(`Elf${i}`, { typeLine: "Creature — Elf", oracleText: "{T}: Add {G}.", jobs: [job({ kind: "ramp", trigger: "activated" })] });
    const row = (deck: ReturnType<typeof card>[]) => rows(dependencies([route, route, ...deck], 0, cuts)).filter((r) => r.startsWith("activated"));
    expect(row(many(1, elf))).toEqual([]);
    expect(row(many(2, elf))).toEqual(["activated:light"]);
    expect(row(many(3, elf))).toEqual(["activated:heavy"]);
  });

  it("reads combat reliance the other way: heavy with no route and no line, none with a line", () => {
    expect(rows(dependencies([card("Bear", { typeLine: "Creature" })], 0, cuts))).toEqual(["combat:heavy"]);
    expect(dependencies([card("Bear")], 0, cuts)[0]).toMatchObject({ groups: [] });
    expect(rows(dependencies([route], 0, cuts))).toEqual(["combat:light"]);
    expect(rows(dependencies([card("Bear")], 1, cuts))).toEqual([]);
  });

  it("does not count losing yourself, or not losing, as a route", () => {
    const self = card("Lab Risk", { oracleText: "If you would draw from an empty library, you lose the game." });
    const shield = card("Platinum Angel", { oracleText: "You can't lose the game and your opponents can't win the game." });
    const win = card("Thassa's Oracle", { oracleText: "If X is greater than or equal to the number of cards in your library, you win the game." });
    expect(rows(dependencies([self, shield], 0, cuts))).toEqual(["combat:heavy"]);
    expect(rows(dependencies([win], 0, cuts))).toEqual(["combat:light"]);
  });

  it("does not count a combat-triggered win, or the commander's own drain, as a route", () => {
    const phage = card("Phage the Untouchable", { oracleText: "Whenever Phage the Untouchable deals combat damage to a player, that player loses the game." });
    const vorpal = card("Vorpal Sword", { oracleText: "Whenever equipped creature deals combat damage to a player, that player loses the game." });
    const lathril = card("Lathril", { commander: true, typeLine: "Legendary Creature — Elf", jobs: [job({ kind: "drain", affects: "opponents", recurrence: "repeatable", trigger: "activated" })] });
    expect(rows(dependencies([phage, vorpal], 0, cuts))).toEqual(["combat:heavy"]);
    expect(rows(dependencies([lathril, card("Bear")], 0, cuts)).filter((r) => r.startsWith("combat"))).toEqual(["combat:heavy"]);
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

describe("graveyardUses", () => {
  it("says which ways a card uses the graveyard, and counts it when any applies", () => {
    const both = card("Mulch-back", {
      oracleText: "Mill three cards. Return target card from your graveyard to your hand.",
      jobs: [job({ kind: "mill", affects: "self" }), job({ kind: "recursion" })],
    });
    const keyword = card("Flash Thing", { keywords: ["Flashback", "Flying"] });
    expect(graveyardUses(both)).toMatchObject({ returns: true, grows: false, keywords: [] });
    expect(graveyardUses(keyword)).toEqual({ fills: false, returns: false, grows: false, keywords: ["Flashback"] });
    expect(usesGraveyard(keyword)).toBe(true);
    expect(usesGraveyard(card("Plain"))).toBe(false);
  });
});
