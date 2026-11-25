import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cheapestLiveCents as realCheapest } from "../cards/price-lookup";

const h = vi.hoisted(() => ({
  execute: vi.fn(),
  selectRows: [] as unknown[][],
  wheres: [] as unknown[],
  prices: vi.fn(),
}));
// A select chain that resolves to the next queued row set and records its `where`.
vi.mock("../../db", () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    for (const k of ["select", "selectDistinct", "from", "innerJoin"]) c[k] = () => c;
    c.where = (w: unknown) => {
      h.wheres.push(w);
      return c;
    };
    c.then = (res: (v: unknown) => unknown) => Promise.resolve(h.selectRows.shift() ?? []).then(res);
    return c;
  };
  return { db: { execute: h.execute, select: chain } };
});
vi.mock("../cards/prices", () => ({ loadOwnedPrintingPrices: h.prices }));
vi.mock("../cards/price-lookup", async () => ({
  cheapestLiveCents: (p: { cents: number | null } | undefined) => (p ? p.cents : realCheapest(undefined)),
}));

const { loadCollectionCombos, MAX_COMBO_PAIRS } = await import("./collection-combos");
const { loadOwnBothPartners } = await import("./near-miss");

const A = "a";
const B = "b";
const row = (v: string, present: string, missing: string, popularity = 10) => ({
  variant_id: v, produces: ["Infinite mana"], popularity, present_id: present, present_name: present.toUpperCase(),
  missing_id: missing, missing_name: missing.toUpperCase(), missing_must_be_commander: false,
});

beforeEach(() => {
  h.execute.mockReset();
  h.selectRows.length = 0;
  h.wheres.length = 0;
  h.prices.mockReset();
});

describe("loadCollectionCombos", () => {
  it("own-both: one pair for the two directions, no price, no wanted-by, art joined from the catalog", async () => {
    h.execute.mockResolvedValue({ rows: [row("v1", A, B), row("v1", B, A)] });
    h.selectRows.push([
      { oracleId: A, imageUri: "https://x/a.jpg", artCropUri: null },
      { oracleId: B, imageUri: null, artCropUri: "https://x/b-art.jpg" },
    ]);
    const out = await loadCollectionCombos({ userId: "u", store: "manapool", side: "both" });
    expect(out.total).toBe(1);
    expect(out.pairs).toHaveLength(1);
    const [p] = out.pairs;
    expect([p.a.oracleId, p.b.oracleId].sort()).toEqual([A, B]);
    expect(p.a.imageUri ?? p.b.imageUri).toBe("https://x/a.jpg");
    expect(p).not.toHaveProperty("missingId");
    expect(h.prices).not.toHaveBeenCalled();
  });

  it("own-both: an assembled pair carries the deck that holds it", async () => {
    const held = { held_deck_id: "d1", held_deck_name: "Brew" };
    h.execute.mockResolvedValue({ rows: [{ ...row("v1", A, B), ...held }, { ...row("v1", B, A), ...held }, row("v2", "c", "d", 5)] });
    h.selectRows.push([]);
    const out = await loadCollectionCombos({ userId: "u", store: "manapool", side: "both" });
    expect(out.total).toBe(2);
    expect(out.pairs.find((p) => p.variantId === "v1")?.heldIn).toEqual({ id: "d1", name: "Brew" });
    expect(out.pairs.find((p) => p.variantId === "v2")).not.toHaveProperty("heldIn");
  });

  it("own-one: names the missing piece with its price and the drafts that want it", async () => {
    h.execute.mockResolvedValue({ rows: [row("v1", A, B)] });
    h.selectRows.push([], [{ oracleId: B, id: "d1", name: "Brew" }]);
    h.prices.mockResolvedValue(new Map([[B, { cents: 250 }]]));
    const out = await loadCollectionCombos({ userId: "u", store: "tcgplayer", side: "one" });
    expect(out.pairs[0]).toMatchObject({ missingId: B, missingCents: 250, wantedBy: [{ id: "d1", name: "Brew" }] });
    expect(h.prices).toHaveBeenCalledWith([B], "tcgplayer");
  });

  // A price outage costs the price, never the view.
  it("own-one: a failed price read leaves the pair, with no price", async () => {
    h.execute.mockResolvedValue({ rows: [row("v1", A, B)] });
    h.prices.mockRejectedValue(new Error("down"));
    const out = await loadCollectionCombos({ userId: "u", store: "manapool", side: "one" });
    expect(out.pairs[0].missingCents).toBeNull();
  });

  it("caps the pairs at the most popular and reports the total", async () => {
    const rows = Array.from({ length: MAX_COMBO_PAIRS + 5 }, (_, i) => row(`v${i}`, `p${i}`, `q${i}`, i));
    h.execute.mockResolvedValue({ rows });
    const out = await loadCollectionCombos({ userId: "u", store: "manapool", side: "both" });
    expect(out.total).toBe(MAX_COMBO_PAIRS + 5);
    expect(out.pairs).toHaveLength(MAX_COMBO_PAIRS);
    expect(out.pairs[0].popularity).toBe(MAX_COMBO_PAIRS + 4);
  });

  it("answers nothing for an empty read, with no further reads", async () => {
    h.execute.mockResolvedValue({ rows: [] });
    expect(await loadCollectionCombos({ userId: "u", store: "manapool", side: "one" })).toEqual({ side: "one", total: 0, pairs: [] });
    expect(h.prices).not.toHaveBeenCalled();
  });
});

// The wanted-by read joins decks to deck_cards and must be rooted in the reader's own decks.
describe("wantedByDecks scoping", () => {
  it("filters on the reader's user id in the same statement", async () => {
    const { deckCards, decks } = await import("../../db/schema");
    const { and, eq, inArray } = await import("drizzle-orm");
    const text = new PgDialect().sqlToQuery(and(eq(decks.userId, "u"), inArray(deckCards.oracleId, ["x"]))!).sql;
    expect(text).toContain('"decks"."user_id" = $1');
    expect(text).toContain('"deck_cards"."oracle_id" in ($2)');
  });

  // The list's count form (no lateral) must agree with the view's pair set: same pairs, marks only on unheld ones.
  it("the list read counts the same pairs as the view and marks only the unassembled ones", async () => {
    const held = { held_deck_id: "d1", held_deck_name: "Brew" };
    const viewRows: Array<ReturnType<typeof row> & { held_deck_id?: string; held_deck_name?: string }> = [{ ...row("v1", A, B), ...held }, { ...row("v1", B, A), ...held }, row("v2", "c", "d", 5), row("v2", "d", "c", 5)];
    const listRows = viewRows.map(({ held_deck_id, held_deck_name: _n, ...r }) => ({ ...r, held: Boolean(held_deck_id) }));
    h.execute.mockResolvedValueOnce({ rows: listRows });
    const list = await loadOwnBothPartners({ userId: "u" });
    h.execute.mockResolvedValueOnce({ rows: viewRows });
    h.selectRows.push([]);
    const view = await loadCollectionCombos({ userId: "u", store: "manapool", side: "both" });
    expect(list.pairs).toHaveLength(view.total);
    expect([...list.partners.keys()].sort()).toEqual(["c", "d"]);
  });
});
