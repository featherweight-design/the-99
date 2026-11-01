import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  load: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/social/spares", async () => ({
  MAX_SPARES_BATCH: (await vi.importActual<typeof import("../../../lib/social/spares")>("../../../lib/social/spares")).MAX_SPARES_BATCH,
  loadFriendSpares: stub.load,
}));

import { GET } from "./route";
import { MAX_SPARES_BATCH } from "../../../lib/social/spares";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const SPARE = {
  oracleId: A, spare: 2,
  friend: { publicId: "33333333-3333-4333-8333-333333333333", displayName: "Bob", commander: null, pods: ["Game night"] },
};
const get = (qs: string) => GET(new NextRequest(`http://localhost/api/friend-spares?${qs}`));

beforeEach(() => {
  stub.userId = "user_1";
  stub.load.mockReset();
  stub.load.mockResolvedValue([SPARE]);
});

describe("GET /api/friend-spares", () => {
  it("answers the signed-in reader's friends' spares, uncached", async () => {
    const res = await get(`ids=${A},${B}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ spares: [SPARE] });
    expect(stub.load).toHaveBeenCalledWith("user_1", [A, B]);
  });

  it("refuses a reader who is not signed in, before reading anything", async () => {
    stub.userId = null;
    expect((await get(`ids=${A}`)).status).toBe(401);
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

  it("takes a full batch", async () => {
    expect((await get(`ids=${Array.from({ length: MAX_SPARES_BATCH }, () => A).join(",")}`)).status).toBe(200);
  });
});
