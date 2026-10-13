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
// The reader's resolved switches, a stand-in pinned by identity. The environment has the label basis
// off and this env has it on: the payload is keyed on the basis, so the route reaches the page's entry
// only by reading it under the reader's env (admin PR 6d-2).
const RESOLVED = vi.hoisted(() => ({ LABEL_ROLE_COUNTS_ENABLED: "true", DECK_NOTES_ENABLED: "true" }) as unknown as NodeJS.ProcessEnv);
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
  vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "false");
  stub.userId = "user_1";
  stub.load.mockReset();
  // The entry answers with the basis it was counted by: the one the env asked for, unless a case says.
  stub.load.mockImplementation(async (_u: string, _s: string, env: NodeJS.ProcessEnv) => ({
    encoded: encodeDiscovery(list), oracleIds: [],
    basis: env.LABEL_ROLE_COUNTS_ENABLED === "true" ? "labels" : "classifier",
  }));
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
    expect(stub.load).toHaveBeenCalledWith("user_1", "fit", expect.objectContaining({ LABEL_ROLE_COUNTS_ENABLED: "true" }));
  });

  // Admin PR 6d-2 (Copilot round 1): the basis is the PAGE's, carried as `b`, never resolved again.
  // The reader's resolved env says labels and the request names the classifier, as it does when the
  // switch flipped app-wide after the page rendered: the route reads the classifier's entry, the one
  // the page drew, and keeps the reader's other switches.
  it("reads the payload of the basis the page names, not the one the switch resolves to now", async () => {
    await get("sort=new&b=classifier&s=a");
    const env = stub.load.mock.calls[0][2] as NodeJS.ProcessEnv;
    expect(stub.load.mock.calls[0].slice(0, 2)).toEqual(["user_1", "new"]);
    expect(env.LABEL_ROLE_COUNTS_ENABLED).toBe("false");
    expect(env.DECK_NOTES_ENABLED).toBe("true");
  });

  it("never raises the environment's kill switch, whatever basis is asked for", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "off");
    await get("sort=fit&b=classifier&s=a");
    // The resolved env itself, untouched: no basis is written over a killed switch.
    expect(stub.load.mock.calls[0][2]).toBe(RESOLVED);
  });

  it("answers a labels page under the kill switch with no fields and reads nothing", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "off");
    const res = await get("sort=fit&b=labels&s=a");
    // No other basis's rank and fit are merged into the labels rows; the client reads the page again.
    expect(res.status).toBe(200);
    expect((await res.json()).fields).toEqual({});
    expect(stub.load).not.toHaveBeenCalled();
  });

  // Admin PR 6d-2 (Copilot round 5): a labels page whose batch finds the label read down gets a
  // classifier list back, and its figures are not the page's: no fields, so the page reads again.
  it("answers a labels page no fields when the entry came back counted by the classifier", async () => {
    stub.load.mockResolvedValue({ encoded: encodeDiscovery(list), oracleIds: [], basis: "classifier" });
    const res = await get("sort=fit&b=labels&s=a,b");
    expect(res.status).toBe(200);
    expect((await res.json()).fields).toEqual({});
  });

  it("answers nothing for a slug the reader's list does not hold", async () => {
    const { fields } = await (await get("sort=fit&b=classifier&s=a,someone-else")).json();
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
