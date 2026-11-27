import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sweep = vi.hoisted(() => vi.fn());
const flyerSweep = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/invites/sweep", () => ({ sweepInvites: sweep }));
const purge = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/flyer/launch-purge", () => ({ purgeLaunchList: purge }));
vi.mock("../../../../lib/flyer/sweep", () => ({ sweepFlyerClaims: flyerSweep }));
const reports = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/feedback/purge", () => ({ purgeAnonymousReports: reports }));
const ping = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/cron/heartbeat", () => ({ pingHeartbeat: ping }));
const syncs = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/wishlist/sync", () => ({ reconcileWishlistSyncs: syncs }));
const { GET } = await import("./route");

const call = (auth?: string) => GET(new Request("https://x/api/cron/invite-sweep", { headers: auth ? { authorization: auth } : {} }) as never);

describe("GET /api/cron/invite-sweep", () => {
  const saved = process.env.CRON_SECRET;
  beforeEach(() => {
    sweep.mockReset().mockResolvedValue({ returned: 2, revoked: 1, reconciled: 0, kept: 0 });
    flyerSweep.mockReset().mockResolvedValue({ released: 3, kept: 1 });
    purge.mockReset().mockResolvedValue({ due: false, deleted: 0 });
    reports.mockReset().mockResolvedValue({ deleted: 0 });
    syncs.mockReset().mockResolvedValue({ checked: 4, synced: 2, failed: 0 });
    process.env.CRON_SECRET = "s3cret";
    ping.mockReset().mockResolvedValue(undefined);
    process.env.BETTERSTACK_HEARTBEAT_INVITE_SWEEP = "https://hb.example/invite-sweep";
  });
  afterEach(() => {
    delete process.env.BETTERSTACK_HEARTBEAT_INVITE_SWEEP;
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });

  it("does nothing until CRON_SECRET is set", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("Bearer s3cret")).status).toBe(503);
    expect(sweep).not.toHaveBeenCalled();
  });

  it("refuses a call without the secret, or with the wrong one, before sweeping", async () => {
    for (const auth of [undefined, "Bearer nope", "s3cret", "Bearer s3cre"]) {
      expect((await call(auth)).status, String(auth)).toBe(401);
    }
    expect(sweep).not.toHaveBeenCalled();
  });

  it("sweeps on the cron's bearer token and answers its counts", async () => {
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ returned: 2, revoked: 1, reconciled: 0, kept: 0, flyer: { released: 3, kept: 1 }, launchList: { due: false, deleted: 0 }, anonReports: { deleted: 0 }, wishlistSync: { checked: 4, synced: 2, failed: 0 } });
  });

  it("answers the launch-list purge's report beside the others", async () => {
    purge.mockResolvedValueOnce({ due: true, deleted: 12 });
    expect((await (await call("Bearer s3cret")).json()).launchList).toEqual({ due: true, deleted: 12 });
  });

  it("keeps the sweeps' counts and answers 200 when only the launch-list purge fails", async () => {
    purge.mockRejectedValueOnce(Object.assign(new Error("a@x.dev leaked"), { code: "40P01" }));
    const err = vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ returned: 2, revoked: 1, reconciled: 0, kept: 0, flyer: { released: 3, kept: 1 }, launchList: { error: true }, anonReports: { deleted: 0 }, wishlistSync: { checked: 4, synced: 2, failed: 0 } });
    expect(err.mock.calls.flat().join(" ")).toContain("purge failed (40P01)");
    expect(err.mock.calls.flat().join(" ")).not.toContain("a@x.dev");
    err.mockRestore();
  });

  it("answers the signed-out report purge's count beside the others", async () => {
    reports.mockResolvedValueOnce({ deleted: 5 });
    expect((await (await call("Bearer s3cret")).json()).anonReports).toEqual({ deleted: 5 });
  });

  it("keeps the other counts and answers 200 when only the report purge fails", async () => {
    reports.mockRejectedValueOnce(Object.assign(new Error("a@x.dev leaked"), { code: "40P01" }));
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ returned: 2, revoked: 1, reconciled: 0, kept: 0, flyer: { released: 3, kept: 1 }, launchList: { due: false, deleted: 0 }, anonReports: { error: true }, wishlistSync: { checked: 4, synced: 2, failed: 0 } });
    expect(info.mock.calls.flat().join(" ")).toContain("signed-out reports failed (40P01)");
    expect(info.mock.calls.flat().join(" ")).not.toContain("a@x.dev");
    info.mockRestore();
  });

  it("answers the wishlist sync's reconcile counts, and keeps the others when only it fails", async () => {
    expect((await (await call("Bearer s3cret")).json()).wishlistSync).toEqual({ checked: 4, synced: 2, failed: 0 });
    syncs.mockRejectedValueOnce(Object.assign(new Error("boom"), { code: "57014" }));
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wishlistSync).toEqual({ error: true });
    expect(body.returned).toBe(2);
    expect(info.mock.calls.flat().join(" ")).toContain("wishlist sync failed (57014)");
    info.mockRestore();
  });

  it("pings its heartbeat URL once, after the work succeeded", async () => {
    expect((await call("Bearer s3cret")).status).toBe(200);
    expect(ping).toHaveBeenCalledTimes(1);
    expect(ping).toHaveBeenCalledWith("https://hb.example/invite-sweep");
  });

  it("does not ping when the work fails", async () => {
    sweep.mockRejectedValueOnce(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("Bearer s3cret")).status).toBe(500);
    expect(ping).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it("answers 500 when the sweep fails, logging no message from the error", async () => {
    sweep.mockRejectedValueOnce(Object.assign(new Error("a@x.dev leaked"), { code: "40P01" }));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("Bearer s3cret")).status).toBe(500);
    expect(err.mock.calls.flat().join(" ")).not.toContain("a@x.dev");
    expect(err.mock.calls.flat().join(" ")).toContain("40P01");
    err.mockRestore();
  });

  it("does nothing on the staging project, after the bearer check, unless STAGING_CRONS is 'run'", async () => {
    const saved = { label: process.env.ADMIN_ENV_LABEL, on: process.env.STAGING_CRONS };
    try {
      process.env.ADMIN_ENV_LABEL = "staging";
      delete process.env.STAGING_CRONS;
      expect((await call("Bearer nope")).status).toBe(401);
      const res = await call("Bearer s3cret");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ paused: "staging" });
      expect(sweep).not.toHaveBeenCalled();
      expect(purge).not.toHaveBeenCalled();
      expect(reports).not.toHaveBeenCalled();
      process.env.STAGING_CRONS = "run";
      await call("Bearer s3cret");
      expect(sweep).toHaveBeenCalledTimes(1);
    } finally {
      if (saved.label === undefined) delete process.env.ADMIN_ENV_LABEL; else process.env.ADMIN_ENV_LABEL = saved.label;
      if (saved.on === undefined) delete process.env.STAGING_CRONS; else process.env.STAGING_CRONS = saved.on;
    }
  });
});
