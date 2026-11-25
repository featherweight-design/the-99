import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ userId: "user_1" as string | null, load: vi.fn(), loadOne: vi.fn() }));
const observe = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/rate/observe", () => ({ enforceHit: observe }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/flags/request", () => ({ requestFlags: async () => ({}) }));
vi.mock("../../../lib/stores/preference", () => ({ readerStoreForPage: async () => "manapool" }));
vi.mock("../../../lib/combos/collection-combos", () => ({ loadCollectionComboSides: stub.load, loadCollectionCombos: stub.loadOne }));

import { GET } from "./route";

const get = (query = "") => GET(new Request(`http://localhost/api/collection-combos${query}`));

beforeEach(() => {
  observe.mockReset().mockResolvedValue(null);
  stub.userId = "user_1";
  stub.loadOne.mockReset().mockResolvedValue({ side: "one", total: 0, pairs: [] });
  stub.load.mockReset().mockResolvedValue({ both: { side: "both", total: 0, pairs: [] }, one: { side: "one", total: 0, pairs: [] } });
});

describe("GET /api/collection-combos", () => {
  it("answers both sides in one response, uncached, for the signed-in reader", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(stub.load).toHaveBeenCalledWith({ userId: "user_1", store: "manapool" });
  });

  it("answers a previous deployment's one-side request in that shape, so an open tab keeps working", async () => {
    const res = await get("?side=one");
    expect(await res.json()).toEqual({ side: "one", total: 0, pairs: [] });
    expect(stub.loadOne).toHaveBeenCalledWith({ userId: "user_1", store: "manapool", side: "one" });
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("ignores any other side value and answers both sides", async () => {
    await get("?side=x");
    expect(stub.load).toHaveBeenCalledTimes(1);
    expect(stub.loadOne).not.toHaveBeenCalled();
  });

  it("answers 500 uncached when the read fails, so the view can draw its failed state", async () => {
    stub.load.mockRejectedValue(new Error("db down"));
    const res = await get();
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("refuses a signed-out request before any read", async () => {
    stub.userId = null;
    expect((await get()).status).toBe(401);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("answers 429 over the rate rule, without reading", async () => {
    observe.mockResolvedValue(5);
    expect((await get()).status).toBe(429);
    expect(stub.load).not.toHaveBeenCalled();
  });
});
