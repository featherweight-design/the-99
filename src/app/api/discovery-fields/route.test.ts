import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  load: vi.fn(),
}));
const observe = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/rate/observe", () => ({ observeHit: observe }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/discovery/payload", () => ({ loadDiscoveryPayload: stub.load }));
// The reader's resolved switches, a stand-in pinned by identity: the route reads the payload under
// them, untouched (LABEL_ROLE_COUNTS retired, Hugh 2026-10-31: no basis is written over them).
const RESOLVED = vi.hoisted(() => ({ FEEDBACK_ENABLED: "true" }) as unknown as NodeJS.ProcessEnv);
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => RESOLVED }));

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
  observe.mockReset();
  // The old switch off everywhere: the answer is still the labels entry.
  vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "false");
  stub.userId = "user_1";
  stub.load.mockReset();
  // The entry is counted by label, unless a case says its label read fell back.
  stub.load.mockResolvedValue({ encoded: encodeDiscovery(list), oracleIds: [], basis: "labels" });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/discovery-fields", () => {
  it("answers the reader's own rows from their cached payload, uncached", async () => {
    const res = await get("sort=fit&b=labels&s=a,b");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const { fields } = await res.json();
    expect(Object.keys(fields)).toEqual(["a", "b"]);
    expect(fields.a.prose).toBe("About a.");
    expect(stub.load).toHaveBeenCalledWith("user_1", "fit", RESOLVED);
  });

  // LABEL_ROLE_COUNTS retired (Hugh 2026-10-31): `b=classifier` is still accepted, but the entry is
  // read on the labels basis under the reader's own env, and a classifier page gets no labels figures
  // merged into its rows; the client reads the page again.
  it("still accepts a classifier page's basis, reads the labels entry, and answers it no fields", async () => {
    const res = await get("sort=new&b=classifier&s=a");
    expect(res.status).toBe(200);
    expect(stub.load).toHaveBeenCalledWith("user_1", "new", RESOLVED);
    expect((await res.json()).fields).toEqual({});
  });

  // Admin PR 6d-2 (Copilot round 5): a labels page whose batch finds the label read down gets a
  // classifier list back, and its figures are not the page's: no fields, so the page reads again.
  it("answers a labels page no fields when the entry came back counted by the classifier", async () => {
    stub.load.mockResolvedValue({ encoded: encodeDiscovery(list), oracleIds: [], basis: "classifier" });
    const res = await get("sort=fit&b=labels&s=a,b");
    expect(res.status).toBe(200);
    expect((await res.json()).fields).toEqual({});
  });

  it("answers each row's oracle id from the same entry, for the row's Hide", async () => {
    stub.load.mockResolvedValue({ encoded: encodeDiscovery(list), oracleIds: ["id-a", "id-b"], basis: "labels" });
    const { fields } = await (await get("sort=fit&b=labels&s=b")).json();
    expect(fields.b.oracleId).toBe("id-b");
  });

  it("answers nothing for a slug the reader's list does not hold", async () => {
    const { fields } = await (await get("sort=fit&b=labels&s=a,someone-else")).json();
    expect(Object.keys(fields)).toEqual(["a"]);
  });

  it("refuses a signed-out request with a 401 and reads nothing", async () => {
    stub.userId = null;
    expect((await get("sort=fit&b=classifier&s=a")).status).toBe(401);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown sort", "sort=owned&b=classifier&s=a"],
    ["an unknown basis", "sort=fit&b=other&s=a"],
    ["no basis", "sort=fit&s=a"],
    ["no slugs", "sort=fit&b=classifier&s="],
    ["a malformed slug", "sort=fit&b=classifier&s=a,..%2Fetc"],
    ["more slugs than a batch", `sort=fit&b=classifier&s=${Array.from({ length: MAX_FIELDS_BATCH + 1 }, (_, i) => `c${i}`).join(",")}`],
  ])("refuses %s with a 400 before reading", async (_what, qs) => {
    expect((await get(qs)).status).toBe(400);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("counts the request for the rate measurement once the reader is known, and not before", async () => {
    await get("sort=fit&b=labels&s=a");
    expect(observe).toHaveBeenCalledWith("user_1", "draw-fields");
    observe.mockClear();
    stub.userId = null;
    await get("sort=fit&b=labels&s=a");
    expect(observe).not.toHaveBeenCalled();
  });
});
