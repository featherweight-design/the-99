import { beforeEach, describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ cards: [] as Record<string, unknown>[], decks: [] as Record<string, unknown>[], named: [] as Record<string, unknown>[] | Promise<never> }));
vi.mock("../../db", async () => {
  const schema = await import("../../db/schema");
  return {
    db: {
      select: () => ({
        from: (t: unknown) => ({
          innerJoin: () => ({ where: () => (rows.named instanceof Promise ? rows.named : Promise.resolve(rows.named)) }),
          where: () => (t === schema.cards ? Promise.resolve(rows.cards) : { orderBy: () => Promise.resolve(rows.decks) }),
        }),
      }),
    },
  };
});

const art = vi.hoisted(() => ({ map: new Map<string, string>() }));
vi.mock("../cards/chain-art", () => ({ chainArt: async () => art.map }));
const ENV = {} as NodeJS.ProcessEnv;

const { completePastDeckNames, loadGonePicks } = await import("./past-run");

const RUN = new Date("2026-10-10T00:00:00Z");
const id = (n: number) => `0000aaaa-0000-4000-8000-00000000000${n}`;
const card = (n: number) => ({ id: id(n), name: `Commander ${n}`, image: `i${n}`, crop: `c${n}` });

beforeEach(() => { rows.cards = []; rows.decks = []; rows.named = []; art.map = new Map(); });

describe("loadGonePicks", () => {
  it("names each pick in the read's order and says which the player has built since", async () => {
    rows.cards = [card(2), card(1)];
    rows.decks = [
      { commander: id(1), partner: null, id: "deck-new", name: "Newest", createdAt: new Date("2026-10-13T00:00:00Z") },
      { commander: id(1), partner: null, id: "deck-old", name: "Older", createdAt: new Date("2026-10-01T00:00:00Z") },
    ];
    expect(await loadGonePicks("u", [id(1), id(2)], RUN, ENV)).toEqual([
      { oracleId: id(1), name: "Commander 1", imageUri: "i1", artCropUri: "c1", deck: { id: "deck-new", name: "Newest" } },
      { oracleId: id(2), name: "Commander 2", imageUri: "i2", artCropUri: "c2", deck: null },
    ]);
  });

  it("leaves out a card the catalog dropped, and reads nothing for no picks", async () => {
    rows.cards = [card(1)];
    expect((await loadGonePicks("u", [id(1), id(9)], RUN, ENV)).map((p) => p.oracleId)).toEqual([id(1)]);
    expect(await loadGonePicks("u", [], RUN, ENV)).toEqual([]);
  });

  it("does not say a deck made before the run is why a pick went", async () => {
    rows.cards = [card(1)];
    rows.decks = [{ commander: id(1), partner: null, id: "deck-old", name: "Older", createdAt: new Date("2026-10-01T00:00:00Z") }];
    expect((await loadGonePicks("u", [id(1)], RUN, ENV))[0].deck).toBeNull();
  });

  it("previews the printing card details open, else the catalog's", async () => {
    rows.cards = [card(1), card(2)];
    art.map = new Map([[id(1), "owned-1"]]);
    const got = await loadGonePicks("u", [id(1), id(2)], RUN, ENV);
    expect(got.map((p) => p.imageUri)).toEqual(["owned-1", "i2"]);
  });

  it("counts a deck that helms the pick as its partner", async () => {
    rows.cards = [card(2)];
    rows.decks = [{ commander: id(5), partner: id(2), id: "deck-pair", name: "Pair", createdAt: new Date("2026-10-13T00:00:00Z") }];
    expect((await loadGonePicks("u", [id(2)], RUN, ENV))[0].deck).toEqual({ id: "deck-pair", name: "Pair" });
  });
});

describe("completePastDeckNames", () => {
  const picks = { picks: [{ oracleId: id(1), reason: [{ text: "Unlike " }, { deck: id(7) }, { text: "." }] }] };

  it("names a deck the capped list no longer holds, so its reason is not called deleted", async () => {
    rows.named = [{ id: id(7), name: "Kess" }];
    const names: Record<string, string> = {};
    expect(await completePastDeckNames("u", picks, names, (n) => n)).toBe(true);
    expect(names[id(7)]).toBe("Kess");
  });

  it("says the lookup failed, and claims nothing, when the read throws", async () => {
    rows.named = Promise.reject(new Error("down")) as Promise<never>;
    rows.named.catch(() => {});
    expect(await completePastDeckNames("u", picks, {}, (n) => n)).toBe(false);
  });
});
