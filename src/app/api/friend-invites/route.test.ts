import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  env: { SOCIAL_FRIENDS_ENABLED: "true" } as Record<string, string>,
  read: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env }));
vi.mock("../../../lib/social/friends", () => ({ inviteOutcomes: stub.read }));

import { GET } from "./route";
import { MAX_OPEN_INVITES } from "../../../lib/social/rules";
import { named } from "../../../lib/person-name/mint";

const A = "AbCdEfGhIjKlMnOpQrStUv";
const B = "ZyXwVuTsRqPoNmLkJiHgFe";
const OUT = { token: A, open: false, friend: { publicId: "p-mo", displayName: named("Mo") } };
const get = (qs: string) => GET(new NextRequest(`http://localhost/api/friend-invites?${qs}`));

beforeEach(() => {
  stub.userId = "user_1";
  stub.env = { SOCIAL_FRIENDS_ENABLED: "true" };
  stub.read.mockReset();
  stub.read.mockResolvedValue([OUT]);
});

describe("GET /api/friend-invites", () => {
  it("answers what became of the signed-in reader's own links, uncached", async () => {
    const res = await get(`t=${A},${B}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ links: [OUT] });
    expect(stub.read).toHaveBeenCalledWith("user_1", [A, B]);
  });

  it("refuses a reader who is not signed in, before reading anything", async () => {
    stub.userId = null;
    expect((await get(`t=${A}`)).status).toBe(401);
    expect(stub.read).not.toHaveBeenCalled();
  });

  it("is not there with the friends switch off for the reader", async () => {
    stub.env = {};
    expect((await get(`t=${A}`)).status).toBe(404);
    expect(stub.read).not.toHaveBeenCalled();
  });

  it.each([
    ["no tokens", ""],
    ["a token that is not an invite token", `t=${A},nope`],
    ["one token past the batch", `t=${Array.from({ length: MAX_OPEN_INVITES + 1 }, () => A).join(",")}`],
  ])("refuses %s, before reading anything", async (_label, qs) => {
    expect((await get(qs)).status).toBe(400);
    expect(stub.read).not.toHaveBeenCalled();
  });
});
