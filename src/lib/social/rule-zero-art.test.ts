import { beforeEach, describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ value: [] as unknown[], fail: false }));
const resolve = vi.hoisted(() => vi.fn());

vi.mock("../../db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => (rows.fail ? Promise.reject(new Error("down")) : Promise.resolve(rows.value)) }),
    }),
  },
}));
vi.mock("../decks/printings", () => ({ resolveCommanderPrintingsByDeck: resolve }));
vi.mock("../cache/soft-failure", () => ({ recordSoftFailure: vi.fn() }));

import { ownedDeckArt } from "./rule-zero-art";

const crop = (uri: string) => ({ artCropUri: uri });

beforeEach(() => {
  rows.value = [];
  rows.fail = false;
  resolve.mockReset();
});

describe("ownedDeckArt", () => {
  it("resolves each deck under its OWNER's id, commander and partner apart", async () => {
    rows.value = [
      { deckId: "d1", ownerId: "host", commanderOracleId: "c1", partnerOracleId: null },
      { deckId: "d2", ownerId: "friend", commanderOracleId: "c2", partnerOracleId: "p2" },
    ];
    resolve.mockImplementation(async (owner: string, asks: { deckId: string; commanderOracleId: string }[]) =>
      new Map(asks.map((a) => [a.deckId, crop(`${owner}/${a.commanderOracleId}`)])));
    const art = await ownedDeckArt(["d1", "d2"]);
    expect(art.get("d1")).toEqual({ commander: "host/c1", partner: null });
    expect(art.get("d2")).toEqual({ commander: "friend/c2", partner: "friend/p2" });
    // Never one owner's collection answering for another's deck.
    for (const [owner, asks] of resolve.mock.calls as [string, { deckId: string }[]][]) {
      for (const a of asks) expect(rows.value.find((r) => (r as { deckId: string }).deckId === a.deckId)).toMatchObject({ ownerId: owner });
    }
  });

  it("leaves a card its owner does not hold null, so the caller keeps the oracle art", async () => {
    rows.value = [{ deckId: "d1", ownerId: "host", commanderOracleId: "c1", partnerOracleId: null }];
    resolve.mockResolvedValue(new Map());
    expect((await ownedDeckArt(["d1"])).get("d1")).toEqual({ commander: null, partner: null });
  });

  it("reads nothing for no decks, and answers empty when the deck read fails", async () => {
    expect((await ownedDeckArt([])).size).toBe(0);
    rows.fail = true;
    expect((await ownedDeckArt(["d1"])).size).toBe(0);
    expect(resolve).not.toHaveBeenCalled();
  });
});
