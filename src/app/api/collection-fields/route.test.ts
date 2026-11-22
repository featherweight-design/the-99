import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  load: vi.fn(),
}));
const observe = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/rate/observe", () => ({ enforceHit: observe }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/collection/browse-read", () => ({ loadBrowseCardsFor: stub.load }));

import { GET, POST } from "./route";
import type { BrowseListCard } from "../../../lib/collection/browse";
import { MAX_COLLECTION_FIELDS_BATCH, MAX_COLLECTION_FIELDS_GET } from "../../../lib/collection/fields-batch";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const card = (oracleId: string): BrowseListCard => ({
  oracleId, name: oracleId, typeLine: "Instant", manaCost: "{U}", rarity: "rare", colorIdentity: ["U"],
  imageUri: `https://cards.example/${oracleId}.jpg`, printedName: null, quantity: 1,
  setCounts: [["RTR", 1]], primarySetCode: "RTR", comboPartner: { name: "Other" },
} as BrowseListCard);
const get = (qs: string) => GET(new NextRequest(`http://localhost/api/collection-fields?${qs}`));
const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/collection-fields", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

beforeEach(() => {
  observe.mockReset().mockResolvedValue(null);
  stub.userId = "user_1";
  stub.load.mockReset();
  // The loader's own narrowing is stood in for: only the cards of the reader that were asked for.
  stub.load.mockImplementation(async (_user: string, ids: string[]) => [card(A), card(B)].filter((c) => ids.includes(c.oracleId)));
});

describe("GET /api/collection-fields", () => {
  it("answers the cards asked for, uncached", async () => {
    const res = await get(`ids=${A},${B}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const { fields } = await res.json();
    expect(Object.keys(fields)).toEqual([A, B]);
    expect(fields[A]).toEqual({
      imageUri: `https://cards.example/${A}.jpg`,
      manaCost: "{U}",
      comboPartner: { name: "Other" },
      art: { printedName: null, primarySetCode: "RTR" },
    });
    expect(stub.load).toHaveBeenCalledWith("user_1", [A, B]);
  });

  it("reads for the session's reader, never one the request names", async () => {
    await get(`ids=${A}&userId=user_2&user_id=user_2`);
    expect(stub.load).toHaveBeenCalledTimes(1);
    expect(stub.load.mock.calls[0][0]).toBe("user_1");
  });

  it("reads each id once when a batch repeats one, and answers it once", async () => {
    const { fields } = await (await get(`ids=${A},${A},${B}`)).json();
    expect(stub.load).toHaveBeenCalledWith("user_1", [A, B]);
    expect(Object.keys(fields)).toEqual([A, B]);
  });

  it("counts a repeated id against the cap, as it always did", async () => {
    const full = Array.from({ length: MAX_COLLECTION_FIELDS_GET }, () => A).join(",");
    expect((await get(`ids=${full}`)).status).toBe(200);
    expect((await get(`ids=${full},${A}`)).status).toBe(400);
  });

  it("answers nothing for an id the reader does not hold", async () => {
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
    ["one id too many", `ids=${Array.from({ length: MAX_COLLECTION_FIELDS_GET + 1 }, () => A).join(",")}`],
  ])("refuses %s before reading anything", async (_, qs) => {
    expect((await get(qs)).status).toBe(400);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("refuses a hit over the draw-fields rule with 429 and Retry-After, before reading anything", async () => {
    observe.mockResolvedValue(42);
    const res = await get(`ids=${A}`);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ error: "rate-limited" });
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("counts the request against the rate rule once the reader is known, and not before", async () => {
    await get(`ids=${A}`);
    expect(observe).toHaveBeenCalledWith("user_1", "draw-fields");
    observe.mockClear();
    stub.userId = null;
    await get(`ids=${A}`);
    expect(observe).not.toHaveBeenCalled();
  });
});

describe("POST /api/collection-fields", () => {
  it("answers the same fields as the GET, from a body", async () => {
    const res = await post({ ids: [A, B] });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(Object.keys((await res.json()).fields)).toEqual([A, B]);
    expect(stub.load).toHaveBeenCalledWith("user_1", [A, B]);
  });

  it("carries a full batch of 500, which no query string could", async () => {
    const ids = Array.from({ length: MAX_COLLECTION_FIELDS_BATCH }, () => A);
    expect((await post({ ids })).status).toBe(200);
    expect((await post({ ids: [...ids, A] })).status).toBe(400);
  });

  it.each([
    ["no body", ""],
    ["a body that is not JSON", "{"],
    ["no ids key", { id: [A] }],
    ["ids that are not a list", { ids: A }],
    ["an empty list", { ids: [] }],
    ["an id that is not an oracle id", { ids: ["../etc"] }],
    ["a value that is not a string", { ids: [1] }],
  ])("refuses %s before reading anything", async (_, body) => {
    expect((await post(body)).status).toBe(400);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("refuses a reader who is not signed in, and a hit over the rule, before reading anything", async () => {
    stub.userId = null;
    expect((await post({ ids: [A] })).status).toBe(401);
    stub.userId = "user_1";
    observe.mockResolvedValue(7);
    expect((await post({ ids: [A] })).status).toBe(429);
    expect(stub.load).not.toHaveBeenCalled();
  });
});

describe("POST /api/collection-fields body size", () => {
  it("refuses a body over 64 KB, declared or not, before reading anything", async () => {
    const big = JSON.stringify({ ids: [A], pad: "x".repeat(70_000) });
    const res = await POST(new NextRequest("http://localhost/api/collection-fields", { method: "POST", body: big }));
    expect(res.status).toBe(400);
    expect(stub.load).not.toHaveBeenCalled();
  });
});
