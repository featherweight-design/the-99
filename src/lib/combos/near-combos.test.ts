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

const { cardComboQuery, loadCardCombos, loadNearCombos, pieceState, rankNearCombos, shapeCardCombos, shapeNearCombos, whereIs } = await import("./near-combos");
const { shapeComboFacts } = await import("../synopsis/combo-facts");
type ComboPieceRow = import("../synopsis/combo-facts").ComboPieceRow;
type NearCombo = import("./near-combos").NearCombo;
type CardComboRow = import("./near-combos").CardComboRow;

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
      .toEqual({ kind: "elsewhere", decks: [{ id: "d2", name: "Elves", committed: true }, { id: "d3", name: "Brago", committed: true }] });
  });

  it("names only the decks holding a copy, committed first: a draft's ask is not a location, a reserved brew is", () => {
    const committed = claim("d1", "Committed");
    const draft = { ...claim("d2", "Draft"), mature: false, granted: 0 };
    const brew = { ...claim("d3", "Brew"), mature: false, granted: 1 };
    expect(whereIs(avail({ owned: 1, free: 0, claims: [brew, draft, committed] }), null))
      .toEqual({ kind: "elsewhere", decks: [{ id: "d1", name: "Committed", committed: true }, { id: "d3", name: "Brew", committed: false }] });
  });

  it("not owned is a buy at the tag's figure, or null when nothing is stocked", () => {
    expect(whereIs(undefined, 1299)).toEqual({ kind: "buy", cents: 1299, soldOut: false, qualifier: null });
    expect(whereIs(avail({ owned: 0 }), null)).toEqual({ kind: "buy", cents: null, soldOut: false, qualifier: null });
    expect(whereIs(undefined, null, true)).toEqual({ kind: "buy", cents: null, soldOut: true, qualifier: null });
    expect(whereIs(undefined, 940, false, "foil")).toEqual({ kind: "buy", cents: 940, soldOut: false, qualifier: "foil" });
  });
});

describe("owned basic lands", () => {
  beforeEach(() => {
    selects.length = 0;
    execute.mockReset();
    loadAvailability.mockReset();
    loadPrices.mockReset();
  });

  it("a basic the availability read leaves out but the collection holds reads as held, in both reads", async () => {
    // Read B: the availability read reports nothing for the basic; the collection holds one.
    execute
      .mockResolvedValueOnce({ rows: [{ variant_id: "v", produces: ["Infinite mana"], card_count: 2, mana_value_needed: 0, mana_needed: null, steps: null, notable_prerequisites: null, oracle_id: "id-Card", name: "Card", must_be_commander: false, total: 1 }, { variant_id: "v", produces: ["Infinite mana"], card_count: 2, mana_value_needed: 0, mana_needed: null, steps: null, notable_prerequisites: null, oracle_id: "id-Forest", name: "Forest", must_be_commander: false, total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ oracle_id: "id-Forest" }] });
    // A fresh map per call: the fill writes into the map it is handed, so a shared one would let
    // read A pass on read B's fill.
    loadAvailability.mockImplementation(() => Promise.resolve(new Map()));
    const b = await loadCardCombos({ userId: "u", oracleId: "id-Card", env: ON });
    expect(b.combos[0].others.map((p) => [p.name, p.state])).toEqual([["Forest", "spare"]]);

    // Read A: the missing piece is that basic.
    selects.push([{ commander: "id-Cmdr", partner: null }], [{ oracleId: "id-Held" }], [{ oracleId: "id-Cmdr", identity: ["G"] }]);
    execute
      .mockResolvedValueOnce({ rows: [piece("p", "Held", { color_identity: [] }), piece("p", "Forest", { held: false, color_identity: [] })] })
      .mockResolvedValueOnce({ rows: [{ oracle_id: "id-Forest" }] });
    loadPrices.mockResolvedValue({ prices: new Map(), newestAsOf: null, cents: new Map() });
    const a = await loadNearCombos({ userId: "u", deckId: "d", env: ON });
    expect(a.combos[0].missing.where).toEqual({ kind: "spare" });
  });
});

describe("rankNearCombos", () => {
  const combo = (id: string, where: NearCombo["missing"]["where"], o: Partial<NearCombo> = {}): NearCombo => ({
    variantId: id, pieces: [{ oracleId: "x", name: "x", held: true }, { oracleId: `m-${id}`, name: `m-${id}`, held: false }],
    missing: { oracleId: `m-${id}`, name: `m-${id}`, where, card: null }, produces: [`Infinite ${id}`], steps: null, manaNeeded: null,
    manaValueNeeded: 0, notablePrerequisites: null, usesCommander: false, ...o,
  });

  it("leads with a spare, then a piece in another deck, then the cheapest buy, an unpriced buy last", () => {
    const list = [
      combo("unpriced", { kind: "buy", cents: null, soldOut: false, qualifier: null }),
      combo("dear", { kind: "buy", cents: 2000, soldOut: false, qualifier: null }),
      combo("cheap", { kind: "buy", cents: 25, soldOut: false, qualifier: null }),
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
      combo("buy-other", { kind: "buy", cents: 10, soldOut: false, qualifier: null }),
    ];
    expect(rankNearCombos(list, 10).combos.map((c) => c.variantId)).toEqual(["spare-dup-1", "spare-other", "spare-dup-2", "buy-other"]);
  });

  it("caps the list and reports the total before the cap", () => {
    const list = Array.from({ length: 30 }, (_, i) => combo(`v${i}`, { kind: "buy", cents: i, soldOut: false, qualifier: null }));
    const out = rankNearCombos(list, 20);
    expect(out.combos).toHaveLength(20);
    expect(out.total).toBe(30);
    // The deck page asks for every row: an infinite cap lists all, so its count and its rows agree.
    expect(rankNearCombos(list, Number.POSITIVE_INFINITY).combos).toHaveLength(30);
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
    selects.push(
      [{ commander: "id-Cmdr", partner: null }],
      [{ oracleId: "id-Held" }],
      [{ oracleId: "id-Cmdr", identity: ["U"] }],
      // The missing cards' catalog rows, for the combo detail's plate and Add's predicted row.
      [{ oracleId: "id-Bought", typeLine: "Instant", oracleText: "Draw two cards.", keywords: [], cmc: 2, manaCost: "{1}{U}", imageUri: "https://img/b.jpg" }],
    );
    execute
      .mockResolvedValueOnce({
        rows: [
          piece("buy", "Held"), piece("buy", "Bought", { held: false }),
          piece("spare", "Cmdr"), piece("spare", "Spare", { held: false }),
        ],
      })
      // The collection's own read for pieces the availability read does not report: none held.
      .mockResolvedValueOnce({ rows: [] });
    loadAvailability.mockResolvedValue(new Map([["id-Spare", avail({ owned: 1, free: 1 })]]));
    loadPrices.mockResolvedValue({ prices: new Map(), newestAsOf: null, cents: new Map([["id-Bought", 350]]) });

    const out = await loadNearCombos({ userId: "u", deckId: "d", env: ON });
    expect(out.combos.map((c) => [c.variantId, c.missing.where])).toEqual([
      ["spare", { kind: "spare" }],
      ["buy", { kind: "buy", cents: 350, soldOut: false, qualifier: null }],
    ]);
    expect(out.combos[0].usesCommander).toBe(true);
    expect(out.combos[1].missing.card).toEqual({
      typeLine: "Instant", cardTypeGroup: "Instants", role: "draw", cmc: 2, manaCost: "{1}{U}", imageUri: "https://img/b.jpg",
    });
    // A card the catalog has no row for carries none, rather than a guess.
    expect(out.combos[0].missing.card).toBeNull();
    expect(loadAvailability).toHaveBeenCalledWith("u", expect.objectContaining({ excludeDeckId: "d", oracleIds: ["id-Bought", "id-Spare"] }));
  });

  it("maxPieces keeps only combos of that many pieces or fewer", async () => {
    selects.push([{ commander: "id-Cmdr", partner: null }], [{ oracleId: "id-Held" }, { oracleId: "id-Held2" }], [{ oracleId: "id-Cmdr", identity: ["U"] }]);
    execute.mockResolvedValueOnce({
      rows: [
        piece("pair", "Held"), piece("pair", "Buy", { held: false }),
        ...["Held", "Held2", "Buy3"].map((n) => piece("triple", n, { card_count: 3, held: n !== "Buy3" })),
      ],
    }).mockResolvedValueOnce({ rows: [] });
    loadAvailability.mockResolvedValue(new Map());
    loadPrices.mockResolvedValue({ prices: new Map(), newestAsOf: null, cents: new Map() });
    const out = await loadNearCombos({ userId: "u", deckId: "d", env: ON, maxPieces: 2 });
    expect(out.combos.map((c) => c.variantId)).toEqual(["pair"]);
    expect(out.total).toBe(1);
  });
});

describe("read B: a card's combos", () => {
  const CARD = "id-Card";
  const row = (v: string, name: string, o: Partial<CardComboRow> = {}): CardComboRow => ({
    variant_id: v, produces: [`Infinite ${v}`], card_count: 2, mana_value_needed: 0, mana_needed: null, steps: "1. Go.",
    notable_prerequisites: null, oracle_id: `id-${name}`, name, must_be_commander: false, total: 3, ...o,
  });
  const scope = { deck: new Set(["id-InDeck", "id-Cmdr"]), commanders: new Set(["id-Cmdr"]) };

  it("pieceState: in the deck, else spare, elsewhere or not owned", () => {
    expect(pieceState({ oracleId: "id-InDeck", mustBeCommander: false }, scope, undefined)).toBe("inDeck");
    expect(pieceState({ oracleId: "id-X", mustBeCommander: false }, scope, avail({ owned: 2, free: 1 }))).toBe("spare");
    expect(pieceState({ oracleId: "id-X", mustBeCommander: false }, scope, avail({ owned: 1, free: 0 }))).toBe("elsewhere");
    expect(pieceState({ oracleId: "id-X", mustBeCommander: false }, scope, undefined)).toBe("notOwned");
  });

  it("a command-zone-only piece is in the deck only as one of its commanders", () => {
    const zoneOnly = (oracleId: string) => pieceState({ oracleId, mustBeCommander: true }, scope, undefined);
    expect(zoneOnly("id-Cmdr")).toBe("inDeck");
    expect(zoneOnly("id-InDeck")).toBe("notOwned");
  });

  it("never lists the card itself, and drops a variant missing a row", () => {
    const rows = [row("v1", "Card"), row("v1", "Partner"), row("short", "Card", { card_count: 3 }), row("short", "Other", { card_count: 3 })];
    const out = shapeCardCombos(rows, CARD, () => "notOwned", 10);
    expect(out.combos.map((c) => [c.variantId, c.others.map((p) => p.name)])).toEqual([["v1", ["Partner"]]]);
    expect(out.combos[0].steps).toBe("1. Go.");
  });

  it("ranks fewest unowned pieces first, and reports the total from the query", () => {
    const rows = [
      row("none", "Card", { card_count: 3 }), row("none", "A", { card_count: 3 }), row("none", "B", { card_count: 3 }),
      row("held", "Card", { card_count: 3 }), row("held", "Owned", { card_count: 3 }), row("held", "Spare", { card_count: 3 }),
      row("one", "Card"), row("one", "C"),
    ];
    const owned = new Set(["id-Owned", "id-Spare"]);
    const out = shapeCardCombos(rows, CARD, (p) => (owned.has(p.oracleId) ? "spare" : "notOwned"), 10);
    expect(out.combos.map((c) => c.variantId)).toEqual(["held", "one", "none"]);
    expect(out.total).toBe(3);
  });

  it("leads each count of unowned pieces with one combo per outcome, never lifting one the reader cannot finish", () => {
    const rows = [
      row("held-1", "Card", { produces: ["Infinite mana"] }), row("held-1", "H1", { produces: ["Infinite mana"] }),
      row("held-2", "Card", { produces: ["Infinite mana"] }), row("held-2", "H2", { produces: ["Infinite mana"] }),
      row("buy", "Card", { produces: ["Infinite turns"] }), row("buy", "B", { produces: ["Infinite turns"] }),
    ];
    const out = shapeCardCombos(rows, CARD, (p) => (p.oracleId === "id-B" ? "notOwned" : "spare"), 10);
    expect(out.combos.map((c) => c.variantId)).toEqual(["held-1", "held-2", "buy"]);
  });

  it("prefers a combo using the deck's commander, the card itself included, over a cheaper one that does not", () => {
    const rows = [
      row("cheap", "Card", { mana_value_needed: 1 }), row("cheap", "Other", { mana_value_needed: 1 }),
      row("cmdr", "Card", { mana_value_needed: 2 }), row("cmdr", "Cmdr", { mana_value_needed: 2 }),
    ];
    const held = () => "spare" as const;
    expect(shapeCardCombos(rows, CARD, held, 10, undefined, new Set(["id-Cmdr"])).combos.map((c) => c.variantId)).toEqual(["cmdr", "cheap"]);
    // Opened on the commander itself: every combo uses it, and the cheaper leads again.
    const onCommander = shapeCardCombos(rows, CARD, held, 10, undefined, new Set([CARD])).combos;
    expect(onCommander.every((c) => c.usesCommander)).toBe(true);
    expect(onCommander.map((c) => c.variantId)).toEqual(["cheap", "cmdr"]);
  });

  it("caps the list", () => {
    const rows = Array.from({ length: 50 }, (_, i) => [row(`v${i}`, "Card"), row(`v${i}`, `P${i}`)]).flat();
    expect(shapeCardCombos(rows, CARD, () => "notOwned", 12).combos).toHaveLength(12);
  });

  it("the query names the card and the reader, with every correlated column qualified", async () => {
    const { PgDialect } = await import("drizzle-orm/pg-core");
    const q = new PgDialect().sqlToQuery(cardComboQuery("user_1", CARD));
    expect(q.params).toEqual(expect.arrayContaining([CARD, "user_1"]));
    expect(q.sql).toContain("ci.oracle_id = vc.oracle_id");
    expect(q.sql).toContain("vc0.variant_id = v.variant_id");
    expect(q.sql).toMatch(/limit \$\d+/);
  });

  it("the shortlist counts a piece the deck in scope lists as held, as the ranking does", async () => {
    const { PgDialect } = await import("drizzle-orm/pg-core");
    const q = new PgDialect().sqlToQuery(cardComboQuery("user_1", CARD, 200, 6, { deck: ["id-InDeck", "id-Cmdr"], commanders: ["id-Cmdr"] }));
    // A command-zone-only piece is held only as a commander, a 99 piece by the deck's list: pieceState's rule.
    expect(q.sql).toMatch(/case when vc\.must_be_commander then vc\.oracle_id = any\(\$\d+::uuid\[\]\)\s+else vc\.oracle_id = any\(\$\d+::uuid\[\]\) end/);
    expect(q.params).toContainEqual(["id-InDeck", "id-Cmdr"]);
    expect(q.params).toContainEqual(["id-Cmdr"]);
  });

  it("the shortlist and its total count only variants with every other piece stored", async () => {
    const { PgDialect } = await import("drizzle-orm/pg-core");
    const q = new PgDialect().sqlToQuery(cardComboQuery("user_1", CARD));
    expect(q.sql.replace(/\s+/g, " ")).toContain("having count(*) = cand.card_count - 1");
    // The total is a window over the groups that survive the having, so it is counted after it.
    expect(q.sql.indexOf("having count(*)")).toBeGreaterThan(q.sql.indexOf("count(*) over ()"));
  });

  it("the loader hands the shortlist the deck in scope, commanders included", async () => {
    execute.mockReset();
    execute.mockResolvedValue({ rows: [] });
    await loadCardCombos({ userId: "u", oracleId: CARD, deck: { oracleIds: ["id-A"], commanderOracleIds: ["id-Cmdr"] }, env: ON });
    const { PgDialect } = await import("drizzle-orm/pg-core");
    const params = new PgDialect().sqlToQuery(execute.mock.calls[0][0]).params;
    expect(params).toContainEqual(["id-A", "id-Cmdr"]);
    expect(params).toContainEqual(["id-Cmdr"]);
  });

  it("maxPieces bounds the query's piece count", async () => {
    const { PgDialect } = await import("drizzle-orm/pg-core");
    const q = new PgDialect().sqlToQuery(cardComboQuery("user_1", CARD, 200, 2));
    expect(q.sql).toMatch(/card_count between 2 and \$\d+/);
    expect(q.params).toContain(2);
    expect(new PgDialect().sqlToQuery(cardComboQuery("user_1", CARD)).params).toContain(6);
  });

  it("reads nothing while the switch is off", async () => {
    execute.mockReset();
    expect(await loadCardCombos({ userId: "u", oracleId: CARD, env: {} as NodeJS.ProcessEnv })).toEqual({ combos: [], total: 0 });
    expect(execute).not.toHaveBeenCalled();
  });

  it("states each other piece from the deck in scope and the reader's availability", async () => {
    execute.mockReset();
    loadAvailability.mockReset();
    execute
      .mockResolvedValueOnce({ rows: [row("v", "Card", { card_count: 4 }), row("v", "InDeck", { card_count: 4 }), row("v", "Away", { card_count: 4 }), row("v", "Gone", { card_count: 4 })] })
      .mockResolvedValueOnce({ rows: [] });
    loadAvailability.mockResolvedValue(new Map([["id-Away", avail({ owned: 1, free: 0, claims: [claim("d2", "Elves")] })]]));
    const out = await loadCardCombos({ userId: "u", oracleId: CARD, deck: { oracleIds: ["id-InDeck"], commanderOracleIds: [] }, env: ON });
    expect(out.combos[0].others.map((p) => [p.name, p.state, p.decks.map((d) => d.name)])).toEqual([["Away", "elsewhere", ["Elves"]], ["Gone", "notOwned", []], ["InDeck", "inDeck", []]]);
    expect(loadAvailability).toHaveBeenCalledWith("u", expect.objectContaining({ oracleIds: ["id-InDeck", "id-Away", "id-Gone"] }));
  });
});
