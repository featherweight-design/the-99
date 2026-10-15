import { beforeEach, describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ cards: [] as Record<string, unknown>[], decks: [] as Record<string, unknown>[] }));
vi.mock("../../db", async () => {
  const schema = await import("../../db/schema");
  return {
    db: {
      select: () => ({
        from: (t: unknown) => ({
          where: () => (t === schema.cards ? Promise.resolve(rows.cards) : { orderBy: () => Promise.resolve(rows.decks) }),
        }),
      }),
    },
  };
});

const { loadGonePicks } = await import("./past-run");

const id = (n: number) => `0000aaaa-0000-4000-8000-00000000000${n}`;
const card = (n: number) => ({ id: id(n), name: `Commander ${n}`, image: `i${n}`, crop: `c${n}` });

beforeEach(() => { rows.cards = []; rows.decks = []; });

describe("loadGonePicks", () => {
  it("names each pick in the read's order and says which the player has built since", async () => {
    rows.cards = [card(2), card(1)];
    rows.decks = [
      { commander: id(1), id: "deck-new", name: "Newest" },
      { commander: id(1), id: "deck-old", name: "Older" },
    ];
    expect(await loadGonePicks("u", [id(1), id(2)])).toEqual([
      { oracleId: id(1), name: "Commander 1", imageUri: "i1", artCropUri: "c1", deck: { id: "deck-new", name: "Newest" } },
      { oracleId: id(2), name: "Commander 2", imageUri: "i2", artCropUri: "c2", deck: null },
    ]);
  });

  it("leaves out a card the catalog dropped, and reads nothing for no picks", async () => {
    rows.cards = [card(1)];
    expect((await loadGonePicks("u", [id(1), id(9)])).map((p) => p.oracleId)).toEqual([id(1)]);
    expect(await loadGonePicks("u", [])).toEqual([]);
  });
});
