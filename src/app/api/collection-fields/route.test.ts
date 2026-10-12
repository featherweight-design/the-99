import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  load: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/collection/payload", () => ({ loadCollectionList: stub.load }));

import { GET } from "./route";
import type { BrowseListCard } from "../../../lib/collection/browse";
import { MAX_COLLECTION_FIELDS_BATCH } from "../../../lib/collection/fields-batch";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const card = (oracleId: string): BrowseListCard => ({
  oracleId, name: oracleId, typeLine: "Instant", manaCost: "{U}", rarity: "rare", colorIdentity: ["U"],
  imageUri: `https://cards.example/${oracleId}.jpg`, printedName: null, quantity: 1,
  setCounts: [["RTR", 1]], primarySetCode: "RTR", comboPartner: { name: "Other" },
} as BrowseListCard);
const get = (qs: string) => GET(new NextRequest(`http://localhost/api/collection-fields?${qs}`));

beforeEach(() => {
  stub.userId = "user_1";
  stub.load.mockReset();
  stub.load.mockResolvedValue({ cards: [card(A), card(B)], pricesFailed: false });
});

describe("GET /api/collection-fields", () => {
  it("answers the reader's own cards from their cached list, uncached", async () => {
    const res = await get(`ids=${A},${B}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const { fields } = await res.json();
    expect(Object.keys(fields)).toEqual([A, B]);
    expect(fields[A]).toEqual({
      imageUri: `https://cards.example/${A}.jpg`,
      comboPartner: { name: "Other" },
      art: { printedName: null, primarySetCode: "RTR" },
    });
    expect(stub.load).toHaveBeenCalledWith("user_1");
  });

  it("answers nothing for an id the reader's list does not hold", async () => {
    const other = "33333333-3333-4333-8333-333333333333";
    const { fields } = await (await get(`ids=${A},${other}`)).json();
    expect(Object.keys(fields)).toEqual([A]);
  });

  it("refuses a reader who is not signed in, before reading anything", async () => {
    stub.userId = null;
    expect((await get(`ids=${A}`)).status).toBe(401);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it.each([
    ["no ids", ""],
    ["an id that is not an oracle id", "ids=../etc"],
    ["one id too many", `ids=${Array.from({ length: MAX_COLLECTION_FIELDS_BATCH + 1 }, () => A).join(",")}`],
  ])("refuses %s before reading anything", async (_, qs) => {
    expect((await get(qs)).status).toBe(400);
    expect(stub.load).not.toHaveBeenCalled();
  });
});
