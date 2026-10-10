import { describe, expect, it } from "vitest";
import { assembledLines, benchmarkInput } from "./load";
import { job } from "./fixtures";
import type { ComboPieceRow } from "../synopsis/combo-facts";

const piece = (variant: string, name: string, over: Partial<ComboPieceRow> = {}): ComboPieceRow => ({
  variant_id: variant, produces: ["Infinite colorless mana"], card_count: 2, mana_value_needed: 0, oracle_id: `id-${name}`,
  name, must_be_commander: false, held: true, commander_legal: true, color_identity: [], ...over,
});

describe("assembledLines", () => {
  it("keeps every variant whose pieces are all held, uncapped", () => {
    const rows = Array.from({ length: 8 }, (_, i) => [piece(`v${i}`, "A"), piece(`v${i}`, `B${i}`)]).flat();
    expect(assembledLines(rows, [])).toHaveLength(8);
  });
  it("drops a variant missing a piece, or one that is not a counted outcome", () => {
    expect(assembledLines([piece("v", "A"), piece("v", "B", { held: false })], [])).toEqual([]);
    expect(assembledLines([piece("v", "A", { produces: ["Gain 3 life"] }), piece("v", "B", { produces: ["Gain 3 life"] })], [])).toEqual([]);
  });
  it("carries what the ledger's plates draw", () => {
    const [l] = assembledLines([piece("v", "A", { steps: "One\nTwo", mana_value_needed: 2, mana_needed: "{2}" }), piece("v", "B")], []);
    expect(l).toMatchObject({ variantId: "v", pieceIds: ["id-A", "id-B"], steps: ["One", "Two"], mana: { kind: "costs", value: 2 } });
  });
});

describe("benchmarkInput", () => {
  const profile = {
    cards: [
      { oracleId: "c", name: "Cmd", typeLine: "Legendary Creature", cmc: 4, quantity: 1, layout: "normal" },
      { oracleId: "x", name: "Labeled", typeLine: "Instant", cmc: 2, quantity: 1, layout: "normal" },
      { oracleId: "y", name: "Unlabeled", typeLine: "Instant", cmc: 2, quantity: 1, layout: "normal" },
    ],
    commanderOracleIds: ["c"],
    roles: { counts: { ramp: 9 }, excludingCommanders: { ramp: 8 } },
  } as unknown as Parameters<typeof benchmarkInput>[0];
  const text = [
    { oracleId: "x", oracleText: "Counter target spell.", keywords: [], manaCost: "{U}{U}", colorIdentity: ["U"] },
    { oracleId: "y", oracleText: "Counter target spell.", keywords: [], manaCost: "{U}{U}", colorIdentity: ["U"] },
  ];

  it("uses a card's fresh label, and reads a card with none from its text", () => {
    const input = benchmarkInput(profile, text, new Map([["x", [job({ kind: "removal" })]]]), []);
    expect(input.cards.map((c) => [c.name, c.commander, c.jobs.map((j) => j.kind)])).toEqual([
      ["Cmd", true, []], ["Labeled", false, ["removal"]], ["Unlabeled", false, ["counterspell"]],
    ]);
  });
  it("passes the Overview's cast-turn ramp", () => {
    expect(benchmarkInput(profile, text, new Map(), []).castRamp).toBe(8);
  });
});
