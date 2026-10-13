import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  load: vi.fn(),
}));
const observe = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/rate/observe", () => ({ observeHit: observe }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/collection/card-detail", () => ({ loadCardDetail: stub.load }));
// The reader's resolved switches: a sentinel, so the assertion is that the route hands the loader
// exactly the env it resolved, never the environment.
const { ENV } = vi.hoisted(() => ({ ENV: { SWAP_TOOLS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => ENV }));

import { GET } from "./route";

const ID = "0f3a8e2c-1b4d-4c5e-9f6a-7b8c9d0e1f2a";
const OTHER = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const get = (qs: string) => GET(new NextRequest(`http://localhost/api/card-detail?${qs}`));

beforeEach(() => {
  observe.mockReset();
  stub.userId = "user_1";
  stub.load.mockReset();
  stub.load.mockResolvedValue({ oracleId: ID, name: "Sol Ring" });
});

describe("GET /api/card-detail", () => {
  it("answers the reader's card, uncached", async () => {
    const res = await get(`id=${ID}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ oracleId: ID, name: "Sol Ring" });
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(stub.load).toHaveBeenCalledWith("user_1", ID, undefined, ENV);
    expect(stub.load.mock.calls[0][3]).toBe(ENV);
  });

  it("refuses a signed-out request with a 401 and reads nothing", async () => {
    stub.userId = null;
    const res = await get(`id=${ID}`);
    expect(res.status).toBe(401);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("answers a non-uuid id as missing without reaching the database", async () => {
    const res = await get("id=not-a-card");
    expect(res.status).toBe(404);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("answers a card the loader cannot find as a 404", async () => {
    stub.load.mockResolvedValue(null);
    expect((await get(`id=${ID}`)).status).toBe(404);
  });

  it("refuses a scope longer than the client ever sends with a 400, rather than shortening it", async () => {
    const { MAX_DECK_SCOPE } = await import("../../../lib/combos/deck-scope-param");
    const ok = Array.from({ length: MAX_DECK_SCOPE }, () => OTHER).join(",");
    expect((await get(`id=${ID}&scope=${ok}`)).status).toBe(200);
    stub.load.mockClear();
    const res = await get(`id=${ID}&scope=${ok},${OTHER}`);
    expect(res.status).toBe(400);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("reads as the signed-in reader, whatever the URL says", async () => {
    stub.userId = "user_session";
    await get(`id=${ID}&user=user_other&userId=user_other`);
    expect(stub.load).toHaveBeenCalledWith("user_session", ID, undefined, ENV);
  });

  it("passes the deck scope through the same sanitizer the action used", async () => {
    await get(`id=${ID}&scope=${OTHER},junk,${ID}`);
    expect(stub.load).toHaveBeenCalledWith("user_1", ID, [OTHER, ID], ENV);
  });
});

describe("GET /api/card-detail's Dates", () => {
  it("arrive at the client as Dates, which the modal calls getTime on", async () => {
    const { decodeCardDetail } = await import("../../../lib/cards/card-detail-wire");
    const asOf = new Date("2026-09-21T09:00:00.000Z");
    stub.userId = "user_1";
    stub.load.mockReset();
    stub.load.mockResolvedValue({ oracleId: ID, prices: { newestAsOf: asOf, byScryfallId: { x: { asOf } } } });
    const res = await get(`id=${ID}`);
    const card = decodeCardDetail<{ prices: { newestAsOf: Date; byScryfallId: Record<string, { asOf: Date }> } }>(await res.text());
    expect(card.prices.newestAsOf.getTime()).toBe(asOf.getTime());
    expect(card.prices.byScryfallId.x.asOf.getTime()).toBe(asOf.getTime());
  });
});

describe("the route and the action", () => {
  // Two doors onto one loader: a prefetch reads the route, a press reads the action, and a card
  // opened either way must be the same card, Dates and all.
  it("answer the same card for the same id", async () => {
    const { getCardDetail } = await import("../../card-detail-action");
    const { decodeCardDetail } = await import("../../../lib/cards/card-detail-wire");
    const asOf = new Date("2026-09-21T09:00:00.000Z");
    const card = { oracleId: ID, name: "Sol Ring", prices: { newestAsOf: asOf, byScryfallId: { x: { asOf } } }, printings: [] };
    stub.userId = "user_1";
    stub.load.mockReset();
    stub.load.mockResolvedValue(card);
    const viaRoute = decodeCardDetail(await (await get(`id=${ID}&scope=${OTHER}`)).text());
    const viaAction = await getCardDetail(ID, [OTHER]);
    expect(viaRoute).toEqual(viaAction);
    expect(stub.load.mock.calls[0]).toEqual(stub.load.mock.calls[1]);
  });

  it("counts the request for the rate measurement once the reader is known, and not before", async () => {
    await get(`id=${ID}`);
    expect(observe).toHaveBeenCalledWith("user_1", "card-detail");
    observe.mockClear();
    stub.userId = null;
    await get(`id=${ID}`);
    expect(observe).not.toHaveBeenCalled();
  });
});
