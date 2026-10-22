import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  env: { SOCIAL_FRIENDS_ENABLED: "true", SPARE_REQUESTS_ENABLED: "true" } as Record<string, string>,
  load: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env }));
vi.mock("../../../lib/social/spare-requests", () => ({ loadAskStates: stub.load }));

import { GET } from "./route";
import { MAX_SPARES_BATCH } from "../../../lib/social/client-rules";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const ASK = {
  id: "44444444-4444-4444-8444-444444444444", oracleId: A, state: "open", daysLeft: 12,
  holder: { publicId: "33333333-3333-4333-8333-333333333333", displayName: "Bob" },
  createdAt: "2026-10-20T12:00:00.000Z", answeredAt: null,
};
const get = (qs: string) => GET(new NextRequest(`http://localhost/api/spare-requests?${qs}`));

beforeEach(() => {
  stub.userId = "user_1";
  stub.env = { SOCIAL_FRIENDS_ENABLED: "true", SPARE_REQUESTS_ENABLED: "true" };
  stub.load.mockReset();
  stub.load.mockResolvedValue([ASK]);
});

describe("GET /api/spare-requests", () => {
  it("answers the signed-in reader's own asks for those cards, uncached, under the reader's switches", async () => {
    const res = await get(`ids=${A},${B}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ asks: [ASK] });
    expect(stub.load).toHaveBeenCalledWith("user_1", [A, B], stub.env);
  });

  it("refuses a reader who is not signed in, before reading anything", async () => {
    stub.userId = null;
    expect((await get(`ids=${A}`)).status).toBe(401);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("is not there with spare requests off for the reader, or friends off under it", async () => {
    stub.env = { SOCIAL_FRIENDS_ENABLED: "true" };
    expect((await get(`ids=${A}`)).status).toBe(404);
    stub.env = { SPARE_REQUESTS_ENABLED: "true" };
    expect((await get(`ids=${A}`)).status).toBe(404);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it.each([
    ["no ids", ""],
    ["an id that is not a card id", `ids=${A},nope`],
    ["one id past the batch", `ids=${Array.from({ length: MAX_SPARES_BATCH + 1 }, () => A).join(",")}`],
  ])("refuses %s, before reading anything", async (_label, qs) => {
    expect((await get(qs)).status).toBe(400);
    expect(stub.load).not.toHaveBeenCalled();
  });
});
