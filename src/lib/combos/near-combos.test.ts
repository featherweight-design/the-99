import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Availability } from "../decks/availability";

// The loader's reads: the deck row, its list and its commanders' identity through `select`, the
// combo query through `execute`, availability and prices through their own modules.
const selects: unknown[][] = [];
const execute = vi.fn();
const select = vi.fn(() => {
  const rows = selects.shift() ?? [];
  const chain = { from: () => chain, where: () => Promise.resolve(rows) };
  return chain;
});
vi.mock("../../db", () => ({ db: { select: () => select(), execute: (...a: unknown[]) => execute(...a) } }));
const loadAvailability = vi.fn();
vi.mock("../decks/availability-query", () => ({ loadAvailability: (...a: unknown[]) => loadAvailability(...a) }));
const loadPrices = vi.fn();
vi.mock("../decks/price-query", () => ({
  loadPrices: (...a: unknown[]) => loadPrices(...a),
  cheapestNow: (read: { cents: Map<string, number> }, id: string) => read.cents.get(id) ?? null,
}));

const { loadNearCombos, rankNearCombos, shapeNearCombos, whereIs } = await import("./near-combos");
const { shapeComboFacts } = await import("../synopsis/combo-facts");
type ComboPieceRow = import("../synopsis/combo-facts").ComboPieceRow;
type NearCombo = import("./near-combos").NearCombo;

const ON: NodeJS.ProcessEnv = { ...process.env, NEAR_COMBOS_ENABLED: "true" };
const piece = (v: string, name: string, o: Partial<ComboPieceRow> = {}): ComboPieceRow => ({
  variant_id: v, produces: ["Infinite mana"], card_count: 2, mana_value_needed: 0, oracle_id: `id-${name}`,
  name, must_be_commander: false, held: true, commander_legal: true, color_identity: ["U"], ...o,
});
const avail = (o: Partial<Availability>): Availability => ({ owned: 0, hard: 0, soft: 0, free: 0, claims: [], ...o }) as Availability;
const claim = (id: string, name: string) => ({ id, name, quantity: 1, mature: true, pending: false, commander: false, senior: true }) as Availability["claims"][number];

describe("shapeNearCombos", () => {
  const near = (v: string, missing: Partial<ComboPieceRow>) => [piece(v, `${v}-held`), piece(v, `${v}-missing`, { held: false, ...missing })];

  it("keeps a one-piece-away combo with its steps, mana and every piece", () => {
    const rows = near("v1", {}).map((r) => ({ ...r, steps: "1. Tap.\n2. Untap.", mana_needed: "{U}", notable_prerequisites: "None" }));
    const [c] = shapeNearCombos(rows, ["U"], ["id-v1-held"]);
    expect(c).toMatchObject({
      variantId: "v1",
      missing: { oracleId: "id-v1-missing", name: "v1-missing" },
      steps: "1. Tap.\n2. Untap.",
      manaNeeded: "{U}",
      manaValueNeeded: 0,
      notablePrerequisites: "None",
      usesCommander: true,
    });
    expect(c.pieces.map((p) => [p.name, p.held])).toEqual([["v1-held", true], ["v1-missing", false]]);
  });

  it("drops a missing piece the deck could not add: off-color, command-zone-only, or not legal", () => {
    const rows = [
      ...near("off", { color_identity: ["R"] }),
      ...near("zone", { must_be_commander: true }),
      ...near("banned", { commander_legal: false }),
      ...near("ok", {}),
    ];
    expect(shapeNearCombos(rows, ["U"], []).map((c) => c.variantId)).toEqual(["ok"]);
  });

  it("never offers a mandatory loop, and skips a variant two pieces short", () => {
    const loop = near("loop", { produces: ["Draw the game", "Infinite creature tokens"] }).map((r) => ({ ...r, produces: ["Draw the game", "Infinite creature tokens"] }));
    const twoShort = ["a", "b", "c"].map((n, i) => piece("short", n, { card_count: 3, held: i === 0 }));
    expect(shapeNearCombos([...loop, ...twoShort], ["U"], [])).toEqual([]);
  });

  it("agrees with the Overview's near combos on the same rows: one rule, two readers", () => {
    const rows = [...near("a", {}), ...near("b", { color_identity: ["R"] }), ...near("c", { must_be_commander: true })];
    const facts = shapeComboFacts(rows, ["U"], []).nearCombos.map((n) => n.missing);
    expect(shapeNearCombos(rows, ["U"], []).map((c) => c.missing.name)).toEqual(facts);
  });
});

describe("whereIs", () => {
  it("a copy no deck claims is a spare, even when other copies are claimed", () => {
    expect(whereIs(avail({ owned: 2, free: 1, claims: [claim("d2", "Elves")] }), 500)).toEqual({ kind: "spare" });
  });

  it("every owned copy claimed is elsewhere, naming the decks", () => {
    expect(whereIs(avail({ owned: 1, free: 0, claims: [claim("d2", "Elves"), claim("d3", "Brago")] }), 500))
      .toEqual({ kind: "elsewhere", decks: [{ id: "d2", name: "Elves" }, { id: "d3", name: "Brago" }] });
  });

  it("not owned is a buy at the tag's figure, or null when nothing is stocked", () => {
    expect(whereIs(undefined, 1299)).toEqual({ kind: "buy", cents: 1299 });
    expect(whereIs(avail({ owned: 0 }), null)).toEqual({ kind: "buy", cents: null });
  });
});

describe("rankNearCombos", () => {
  const combo = (id: string, where: NearCombo["missing"]["where"], o: Partial<NearCombo> = {}): NearCombo => ({
    variantId: id, pieces: [{ oracleId: "x", name: "x", held: true }, { oracleId: `m-${id}`, name: `m-${id}`, held: false }],
    missing: { oracleId: `m-${id}`, name: `m-${id}`, where }, produces: [`Infinite ${id}`], steps: null, manaNeeded: null,
    manaValueNeeded: 0, notablePrerequisites: null, usesCommander: false, ...o,
  });

  it("leads with a spare, then a piece in another deck, then the cheapest buy, an unpriced buy last", () => {
    const list = [
      combo("unpriced", { kind: "buy", cents: null }),
      combo("dear", { kind: "buy", cents: 2000 }),
      combo("cheap", { kind: "buy", cents: 25 }),
      combo("elsewhere", { kind: "elsewhere", decks: [] }),
      combo("spare", { kind: "spare" }),
    ];
    expect(rankNearCombos(list, 10).combos.map((c) => c.variantId)).toEqual(["spare", "elsewhere", "cheap", "dear", "unpriced"]);
  });

  it("within one bucket keeps the Overview's order: fewer pieces first", () => {
    const three = combo("three", { kind: "spare" }, { pieces: [1, 2, 3].map((n) => ({ oracleId: `${n}`, name: `${n}`, held: n < 3 })) });
    expect(rankNearCombos([three, combo("two", { kind: "spare" })], 10).combos.map((c) => c.variantId)).toEqual(["two", "three"]);
  });

  it("leads each bucket with one combo per outcome, and never lets that lift a buy above a spare", () => {
    const loopA = (id: string, where: NearCombo["missing"]["where"]) => combo(id, where, { produces: ["Infinite mana"] });
    const list = [
      loopA("spare-dup-1", { kind: "spare" }),
      loopA("spare-dup-2", { kind: "spare" }),
      combo("spare-other", { kind: "spare" }, { manaValueNeeded: 5 }),
      combo("buy-other", { kind: "buy", cents: 10 }),
    ];
    expect(rankNearCombos(list, 10).combos.map((c) => c.variantId)).toEqual(["spare-dup-1", "spare-other", "spare-dup-2", "buy-other"]);
  });

  it("caps the list and reports the total before the cap", () => {
    const list = Array.from({ length: 30 }, (_, i) => combo(`v${i}`, { kind: "buy", cents: i }));
    const out = rankNearCombos(list, 20);
    expect(out.combos).toHaveLength(20);
    expect(out.total).toBe(30);
  });
});

describe("loadNearCombos", () => {
  beforeEach(() => {
    selects.length = 0;
    select.mockClear();
    execute.mockReset();
    loadAvailability.mockReset();
    loadPrices.mockReset();
  });

  it("reads nothing while the switch is off", async () => {
    expect(await loadNearCombos({ userId: "u", deckId: "d", env: {} as NodeJS.ProcessEnv })).toEqual({ combos: [], total: 0 });
    expect(select).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("a deck that is not the reader's reads as empty", async () => {
    selects.push([]);
    expect(await loadNearCombos({ userId: "u", deckId: "d", env: ON })).toEqual({ combos: [], total: 0 });
    expect(execute).not.toHaveBeenCalled();
  });

  it("places each missing piece from the deck's own vantage and ranks the result", async () => {
    selects.push([{ commander: "id-Cmdr", partner: null }], [{ oracleId: "id-Held" }], [{ oracleId: "id-Cmdr", identity: ["U"] }]);
    execute.mockResolvedValue({
      rows: [
        piece("buy", "Held"), piece("buy", "Bought", { held: false }),
        piece("spare", "Cmdr"), piece("spare", "Spare", { held: false }),
      ],
    });
    loadAvailability.mockResolvedValue(new Map([["id-Spare", avail({ owned: 1, free: 1 })]]));
    loadPrices.mockResolvedValue({ cents: new Map([["id-Bought", 350]]) });

    const out = await loadNearCombos({ userId: "u", deckId: "d", env: ON });
    expect(out.combos.map((c) => [c.variantId, c.missing.where])).toEqual([
      ["spare", { kind: "spare" }],
      ["buy", { kind: "buy", cents: 350 }],
    ]);
    expect(out.combos[0].usesCommander).toBe(true);
    expect(loadAvailability).toHaveBeenCalledWith("u", expect.objectContaining({ excludeDeckId: "d", oracleIds: ["id-Bought", "id-Spare"] }));
  });
});
