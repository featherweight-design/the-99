// Card search's actions: the wishlist rides its own switch.
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  search: vi.fn(),
  signals: vi.fn(),
}));
vi.mock("../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env as NodeJS.ProcessEnv }));
vi.mock("../lib/card-search/search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/card-search/search")>()),
  searchAllCards: stub.search,
  loadCardSignals: stub.signals,
}));

const { searchAllCardsAction, cardSignalsAction } = await import("./card-search-actions");

const A = "00000000-0000-4000-8000-00000000000a";
const HIT = { oracleId: A, name: "Sol Ring", imageUri: null, flavorName: null };

beforeEach(() => {
  stub.env = {};
  stub.search.mockReset().mockResolvedValue([HIT]);
  stub.signals.mockReset().mockResolvedValue(new Map([[A, { owned: 2, decks: ["Ghalta"], wishlist: false }]]));
});

describe("searchAllCardsAction", () => {
  it("refuses a query that is not a string", async () => {
    expect(await searchAllCardsAction(42)).toEqual([]);
    expect(stub.search).not.toHaveBeenCalled();
  });

  it("lays the reader's own signals on the hits", async () => {
    expect(await searchAllCardsAction("sol")).toEqual([{ ...HIT, owned: 2, decks: ["Ghalta"], wishlist: false }]);
    expect(stub.signals).toHaveBeenCalledWith("user_1", [A], { wishlist: false });
  });

  it("asks for the wishlist only while it is on for the reader", async () => {
    stub.env = { SOCIAL_WISHLIST_ENABLED: "true" };
    await searchAllCardsAction("sol");
    expect(stub.signals).toHaveBeenCalledWith("user_1", [A], { wishlist: true });
  });

  it("reads no signals when nothing matched", async () => {
    stub.search.mockResolvedValue([]);
    expect(await searchAllCardsAction("zzz")).toEqual([]);
    expect(stub.signals).not.toHaveBeenCalled();
  });
});

describe("cardSignalsAction", () => {
  it("drops anything that is not a card id, and caps the list at the recent list's length", async () => {
    const ids = Array.from({ length: 10 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`);
    await cardSignalsAction(["nope", 7, ...ids]);
    expect(stub.signals).toHaveBeenCalledWith("user_1", ids.slice(0, 8), { wishlist: false });
  });

  it("returns the signals keyed by card", async () => {
    expect(await cardSignalsAction([A])).toEqual({ [A]: { owned: 2, decks: ["Ghalta"], wishlist: false } });
  });
});
