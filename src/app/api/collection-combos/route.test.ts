import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({ userId: "user_1" as string | null, load: vi.fn() }));
const observe = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/rate/observe", () => ({ enforceHit: observe }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/flags/request", () => ({ requestFlags: async () => ({}) }));
vi.mock("../../../lib/stores/preference", () => ({ readerStoreForPage: async () => "manapool" }));
vi.mock("../../../lib/combos/collection-combos", () => ({ loadCollectionCombos: stub.load }));

import { GET } from "./route";

const get = (qs: string) => GET(new NextRequest(`http://localhost/api/collection-combos?${qs}`));

beforeEach(() => {
  observe.mockReset().mockResolvedValue(null);
  stub.userId = "user_1";
  stub.load.mockReset().mockResolvedValue({ side: "both", total: 0, pairs: [] });
});

describe("GET /api/collection-combos", () => {
  it("answers the side asked for, uncached, for the signed-in reader", async () => {
    const res = await get("side=one");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(stub.load).toHaveBeenCalledWith({ userId: "user_1", store: "manapool", side: "one" });
  });

  it("refuses a signed-out request before any read", async () => {
    stub.userId = null;
    expect((await get("side=both")).status).toBe(401);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it.each(["", "side=", "side=all", "side=BOTH"])("refuses %j as a bad side", async (qs) => {
    expect((await get(qs)).status).toBe(400);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("answers 429 over the rate rule, without reading", async () => {
    observe.mockResolvedValue(5);
    expect((await get("side=both")).status).toBe(429);
    expect(stub.load).not.toHaveBeenCalled();
  });
});
