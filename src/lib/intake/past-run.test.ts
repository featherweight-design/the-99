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

const RUN = new Date("2026-10-10T00:00:00Z");
const id = (n: number) => `0000aaaa-0000-4000-8000-00000000000${n}`;
const card = (n: number) => ({ id: id(n), name: `Commander ${n}`, image: `i${n}`, crop: `c${n}` });

beforeEach(() => { rows.cards = []; rows.decks = []; });

describe("loadGonePicks", () => {
  it("names each pick in the read's order and says which the player has built since", async () => {
    rows.cards = [card(2), card(1)];
    rows.decks = [
      { commander: id(1), id: "deck-new", name: "Newest", createdAt: new Date("2026-10-13T00:00:00Z") },
      { commander: id(1), id: "deck-old", name: "Older", createdAt: new Date("2026-10-01T00:00:00Z") },
    ];
    expect(await loadGonePicks("u", [id(1), id(2)], RUN)).toEqual([
      { oracleId: id(1), name: "Commander 1", imageUri: "i1", artCropUri: "c1", deck: { id: "deck-new", name: "Newest" } },
      { oracleId: id(2), name: "Commander 2", imageUri: "i2", artCropUri: "c2", deck: null },
    ]);
  });

  it("leaves out a card the catalog dropped, and reads nothing for no picks", async () => {
    rows.cards = [card(1)];
    expect((await loadGonePicks("u", [id(1), id(9)], RUN)).map((p) => p.oracleId)).toEqual([id(1)]);
    expect(await loadGonePicks("u", [], RUN)).toEqual([]);
  });

  it("does not say a deck made before the run is why a pick went", async () => {
    rows.cards = [card(1)];
    rows.decks = [{ commander: id(1), id: "deck-old", name: "Older", createdAt: new Date("2026-10-01T00:00:00Z") }];
    expect((await loadGonePicks("u", [id(1)], RUN))[0].deck).toBeNull();
  });
});
