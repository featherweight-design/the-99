import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verify = vi.hoisted(() => vi.fn());
const purge = vi.hoisted(() => vi.fn());
const record = vi.hoisted(() => vi.fn());
const spend = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: verify }));
vi.mock("../../../lib/account/purge", () => ({ purgeAccount: purge, recordDeletion: record }));
vi.mock("../../../lib/invites/spend", async (orig) => ({
  ...(await orig<typeof import("../../../lib/invites/spend")>()),
  spendInviteOnSignUp: spend,
}));

import { POST } from "./route";

const req = () => new NextRequest("https://the99.test/api/clerk-webhook", { method: "POST", body: "{}" });
const report = { social: { podsLeft: 0, podsHandedOn: 0, podsDeleted: 0, friendLinks: 2 }, rows: { decks: 3 }, stamp: 1 };

beforeEach(() => {
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_test";
  verify.mockReset();
  purge.mockReset();
  purge.mockResolvedValue(report);
  record.mockReset().mockResolvedValue(undefined);
  spend.mockReset().mockResolvedValue({ spent: true });
});

describe("POST /api/clerk-webhook", () => {
  it("is inert until its signing secret is set: 503, nothing verified, nothing purged", async () => {
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    verify.mockResolvedValue({ type: "user.deleted", data: { id: "user_gone" } });
    expect((await POST(req())).status).toBe(503);
    expect(verify).not.toHaveBeenCalled();
    expect(purge).not.toHaveBeenCalled();
  });

  it("verifies every call against the configured secret", async () => {
    verify.mockResolvedValue({ type: "user.updated", data: { id: "user_here" } });
    await POST(req());
    expect(verify).toHaveBeenCalledWith(expect.any(NextRequest), { signingSecret: "whsec_test" });
  });

  it("refuses a request whose signature does not verify, and purges nothing", async () => {
    verify.mockRejectedValue(new Error("bad signature"));
    expect((await POST(req())).status).toBe(400);
    expect(purge).not.toHaveBeenCalled();
  });

  it("purges the deleted account named by a verified user.deleted", async () => {
    verify.mockResolvedValue({ type: "user.deleted", data: { id: "user_gone", deleted: true } });
    expect((await POST(req())).status).toBe(200);
    expect(purge).toHaveBeenCalledWith("user_gone");
  });

  it("records the deletion before it purges, so a purge that fails is still swept", async () => {
    verify.mockResolvedValue({ type: "user.deleted", data: { id: "user_gone" } });
    const order: string[] = [];
    record.mockImplementation(async () => { order.push("record"); });
    purge.mockImplementation(async () => { order.push("purge"); throw new Error("x"); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(req())).status).toBe(500);
    expect(record).toHaveBeenCalledWith("user_gone");
    expect(order).toEqual(["record", "purge"]);
  });

  it("acknowledges any other event and purges nothing", async () => {
    verify.mockResolvedValue({ type: "user.updated", data: { id: "user_here" } });
    expect((await POST(req())).status).toBe(200);
    expect(purge).not.toHaveBeenCalled();
  });

  it("refuses a user.deleted with no id", async () => {
    verify.mockResolvedValue({ type: "user.deleted", data: { deleted: true } });
    expect((await POST(req())).status).toBe(400);
    expect(purge).not.toHaveBeenCalled();
  });

  it("answers 500 when the purge fails, so Clerk retries, and logs no part of the error that could hold the id", async () => {
    verify.mockResolvedValue({ type: "user.deleted", data: { id: "user_gone" } });
    purge.mockRejectedValue(Object.assign(new Error("Failed query: delete ... params: user_gone"), { cause: { code: "40P01" } }));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await POST(req())).status).toBe(500);
      const text = logged.mock.calls.flat().map(String).join(" ");
      expect(text).not.toContain("user_gone");
      expect(text).toContain("40P01");
    } finally {
      logged.mockRestore();
    }
  });

  describe("user.created (an invited sign-up, invites plan R8)", () => {
    const RES = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";
    const created = (public_metadata: unknown, extra: object = {}) =>
      ({ type: "user.created", data: { id: "user_new", first_name: "Ana", public_metadata, ...extra } });

    it("spends the reservation the invitation named, for the new account and its first name", async () => {
      verify.mockResolvedValue(created({ inviteReservation: RES }));
      expect((await POST(req())).status).toBe(200);
      expect(spend).toHaveBeenCalledWith("user_new", RES, "Ana");
      expect(purge).not.toHaveBeenCalled();
    });

    it("spends nothing for an account with no reservation, or a malformed one, and still answers 200", async () => {
      for (const meta of [{}, null, { inviteReservation: "not-a-uuid" }, { inviteReservation: 7 }]) {
        verify.mockResolvedValue(created(meta));
        expect((await POST(req())).status).toBe(200);
      }
      expect(spend).not.toHaveBeenCalled();
    });

    it("answers 500 when the spend fails, so Clerk retries, and logs nothing that could hold an id", async () => {
      verify.mockResolvedValue(created({ inviteReservation: RES }));
      spend.mockRejectedValue(new Error(`Failed query: user_new ${RES}`));
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        expect((await POST(req())).status).toBe(500);
        const text = logged.mock.calls.flat().map(String).join(" ");
        expect(text).not.toContain("user_new");
        expect(text).not.toContain(RES);
      } finally {
        logged.mockRestore();
      }
    });

    it("reads no feature switch: an invitation already accepted is honored", async () => {
      verify.mockResolvedValue(created({ inviteReservation: RES }));
      process.env.SOCIAL_INVITES_ENABLED = "off";
      try {
        expect((await POST(req())).status).toBe(200);
        expect(spend).toHaveBeenCalledTimes(1);
      } finally {
        delete process.env.SOCIAL_INVITES_ENABLED;
      }
    });
  });
});
