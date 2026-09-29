import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  load: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/discovery/payload", () => ({ loadDiscoveryPayload: stub.load }));

import { GET } from "./route";
import { encodeDiscovery } from "../../../lib/discovery/encode";
import { MAX_FIELDS_BATCH } from "../../../lib/discovery/fields-batch";
import type { DiscoveryItem, DiscoveryList } from "../../../lib/discovery/list";

const item = (slug: string): DiscoveryItem => ({
  slug, name: slug, colorIdentity: ["G"], artCropUri: null, releasedAt: null, deckCount: 10,
  rank: 1, price: { kind: "absent" }, prose: `About ${slug}.`,
  gapSlot: { kind: "noMechanics" }, score: 5, measurableTotal: 10,
  fitPool: 1, fitRoles: 2, fitSynergy: 2,
} as DiscoveryItem);
const list = { items: [item("a"), item("b")], sort: "fit" } as unknown as DiscoveryList;
const get = (qs: string) => GET(new NextRequest(`http://localhost/api/discovery-fields?${qs}`));

beforeEach(() => {
  stub.userId = "user_1";
  stub.load.mockReset();
  stub.load.mockResolvedValue({ encoded: encodeDiscovery(list), oracleIds: [] });
});

describe("GET /api/discovery-fields", () => {
  it("answers the reader's own rows from their cached payload, uncached", async () => {
    const res = await get("sort=fit&s=a,b");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const { fields } = await res.json();
    expect(Object.keys(fields)).toEqual(["a", "b"]);
    expect(fields.a.prose).toBe("About a.");
    expect(stub.load).toHaveBeenCalledWith("user_1", "fit");
  });

  it("answers nothing for a slug the reader's list does not hold", async () => {
    const { fields } = await (await get("sort=fit&s=a,someone-else")).json();
    expect(Object.keys(fields)).toEqual(["a"]);
  });

  it("refuses a signed-out request with a 401 and reads nothing", async () => {
    stub.userId = null;
    expect((await get("sort=fit&s=a")).status).toBe(401);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown sort", "sort=owned&s=a"],
    ["no slugs", "sort=fit&s="],
    ["a malformed slug", "sort=fit&s=a,..%2Fetc"],
    ["more slugs than a batch", `sort=fit&s=${Array.from({ length: MAX_FIELDS_BATCH + 1 }, (_, i) => `c${i}`).join(",")}`],
  ])("refuses %s with a 400 before reading", async (_what, qs) => {
    expect((await get(qs)).status).toBe(400);
    expect(stub.load).not.toHaveBeenCalled();
  });
});
