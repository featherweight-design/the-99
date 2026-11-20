import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ send: vi.fn(), admin: vi.fn() }));
vi.mock("../../../lib/admin/access", () => ({ requireAdmin: m.admin }));
vi.mock("../../../lib/flyer/launch-send", () => ({ LAUNCH_BATCH_MAX: 25, sendLaunchBatch: m.send }));

import { launchEmailDryRun, sendLaunchEmailBatch } from "./launch-email-actions";

beforeEach(() => {
  m.admin.mockReset().mockResolvedValue({ userId: "user_admin" });
  m.send.mockReset().mockResolvedValue({ ok: true, dryRun: false, waiting: 0, sent: 1, released: 0, uncertain: 0, stoppedBy: "done" });
});

describe("sendLaunchEmailBatch", () => {
  it("refuses a count that is not a whole number from 1 to the batch max, and sends nothing", async () => {
    for (const bad of [0, -1, 26, 2.5, "5", null, Number.NaN]) {
      expect(await sendLaunchEmailBatch(bad)).toEqual({ ok: false, reason: "failed" });
    }
    expect(m.send).not.toHaveBeenCalled();
  });

  it("checks admin before anything, and sends the asked count", async () => {
    await sendLaunchEmailBatch(25);
    expect(m.admin).toHaveBeenCalled();
    expect(m.send).toHaveBeenCalledWith({ dryRun: false, limit: 25 });
  });

  it("stops at the admin gate when it throws", async () => {
    m.admin.mockRejectedValue(new Error("not admin"));
    await expect(sendLaunchEmailBatch(5)).rejects.toThrow("not admin");
    await expect(launchEmailDryRun()).rejects.toThrow("not admin");
    expect(m.send).not.toHaveBeenCalled();
  });
});
