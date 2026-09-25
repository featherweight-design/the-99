// The Stop route at its wire: what a forged or cross-site call can send is refused before any
// read is touched, and a sound one cancels by the id the panel chose, for the signed-in player.

import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ cancel: vi.fn(), user: "user_1" as string | null, on: true }));
vi.mock("../../../../../lib/auth", () => ({
  requireUserId: async () => { if (!stub.user) throw new Error("unauthenticated"); return stub.user; },
}));
vi.mock("../../../../../lib/intake/flag", () => ({ helpMeChooseEnabled: () => stub.on }));
vi.mock("../../../../../lib/intake/run-store", () => ({ cancelRead: stub.cancel }));

import { POST } from "./route";

const ID = "0000AAAA-0000-4000-8000-000000000001";
const post = (body: unknown, type = "application/json") =>
  POST(new Request("http://x/decks/new/choose/stop", { method: "POST", headers: { "content-type": type }, body: typeof body === "string" ? body : JSON.stringify(body) }));

beforeEach(() => {
  stub.cancel.mockReset().mockResolvedValue(true);
  stub.user = "user_1";
  stub.on = true;
});

describe("the Stop route", () => {
  it("cancels by the panel's id, lowercased, for the signed-in player", async () => {
    const res = await post({ readId: ID });
    expect(await res.json()).toEqual({ stopped: true });
    expect(stub.cancel).toHaveBeenCalledWith(ID.toLowerCase(), "user_1");
  });

  it("refuses before any read is touched: signed out, flag off, not JSON, or no uuid", async () => {
    stub.user = null;
    expect((await post({ readId: ID })).status).toBe(401);
    stub.user = "user_1";
    stub.on = false;
    expect((await post({ readId: ID })).status).toBe(404);
    stub.on = true;
    expect((await post(JSON.stringify({ readId: ID }), "text/plain")).status).toBe(415);
    for (const body of [null, "nope", { readId: "nope" }, { readId: 7 }, {}]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(stub.cancel).not.toHaveBeenCalled();
  });
});
