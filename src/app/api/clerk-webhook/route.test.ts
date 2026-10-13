import { beforeEach, describe, expect, it, vi } from "vitest";

const verify = vi.hoisted(() => vi.fn());
const purge = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: verify }));
vi.mock("../../../lib/account/purge", () => ({ purgeAccount: purge }));

import { POST } from "./route";

const req = () => new Request("https://the99.test/api/clerk-webhook", { method: "POST", body: "{}" });
const report = { social: { podsLeft: 0, podsHandedOn: 0, podsDeleted: 0, friendLinks: 2 }, rows: { decks: 3 }, stamp: 1 };

beforeEach(() => {
  verify.mockReset();
  purge.mockReset();
  purge.mockResolvedValue(report);
});

describe("POST /api/clerk-webhook", () => {
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

  it("answers 500 when the purge fails, so Clerk retries", async () => {
    verify.mockResolvedValue({ type: "user.deleted", data: { id: "user_gone" } });
    purge.mockRejectedValue(new Error("db down"));
    expect((await POST(req())).status).toBe(500);
  });
});
