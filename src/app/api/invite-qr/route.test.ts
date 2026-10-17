import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  env: { SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_INVITES_ENABLED: "true" } as Record<string, string>,
  read: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env }));
vi.mock("../../../lib/invites/send", () => ({ readSenderQr: stub.read }));

import { GET } from "./route";

const T = "a".repeat(43);
const get = (qs: string) => GET(new NextRequest(`http://localhost/api/invite-qr?${qs}`));

beforeEach(() => {
  stub.userId = "user_1";
  stub.env = { SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_INVITES_ENABLED: "true" };
  stub.read.mockReset();
  stub.read.mockResolvedValue({ state: "live", secondsLeft: 600 });
});

describe("GET /api/invite-qr", () => {
  it("answers the signed-in reader's own QR, uncached", async () => {
    const res = await get(`t=${T}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ state: "live", secondsLeft: 600 });
    expect(stub.read).toHaveBeenCalledWith("user_1", T);
  });

  it("refuses a reader who is not signed in, before reading anything", async () => {
    stub.userId = null;
    expect((await get(`t=${T}`)).status).toBe(401);
    expect(stub.read).not.toHaveBeenCalled();
  });

  it("is not there while the reader's invites switch is off, or its parent is", async () => {
    stub.env = { SOCIAL_FRIENDS_ENABLED: "true" };
    expect((await get(`t=${T}`)).status).toBe(404);
    stub.env = { SOCIAL_INVITES_ENABLED: "true" };
    expect((await get(`t=${T}`)).status).toBe(404);
    expect(stub.read).not.toHaveBeenCalled();
  });

  it("refuses a token of the wrong shape before reading anything", async () => {
    for (const qs of ["", "t=", `t=${"a".repeat(42)}`, `t=${"a".repeat(42)}+`, `t=${T},${T}`]) {
      expect((await get(qs)).status).toBe(400);
    }
    expect(stub.read).not.toHaveBeenCalled();
  });

  it("answers 404 for a token no row of the reader's holds", async () => {
    stub.read.mockResolvedValue(null);
    expect((await get(`t=${T}`)).status).toBe(404);
  });
});
