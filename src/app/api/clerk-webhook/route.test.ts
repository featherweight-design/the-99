import { beforeEach, describe, expect, it, vi } from "vitest";

const verify = vi.hoisted(() => vi.fn());
const purge = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: verify }));
vi.mock("../../../lib/account/purge", () => ({ purgeAccount: purge }));

import { POST } from "./route";

const req = () => new Request("https://the99.test/api/clerk-webhook", { method: "POST", body: "{}" });
const report = { social: { podsLeft: 0, podsHandedOn: 0, podsDeleted: 0, friendLinks: 2 }, rows: { decks: 3 }, stamp: 1 };

beforeEach(() => {
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_test";
  verify.mockReset();
  purge.mockReset();
  purge.mockResolvedValue(report);
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
    expect(verify).toHaveBeenCalledWith(expect.any(Request), { signingSecret: "whsec_test" });
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
});
