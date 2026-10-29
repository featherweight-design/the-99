import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const run = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/announcements/ingest", () => ({ runAnnouncementsIngest: run }));
vi.mock("../../../../lib/announcements/ingest-store", () => ({ announcementsStore: {} }));
const { GET } = await import("./route");

const call = (auth?: string) => GET(new Request("https://x/api/cron/announcements", { headers: auth ? { authorization: auth } : {} }) as never);
const REPORT = { posts: 608, due: 3, saved: 3, failed: 0, deferred: 0, rematched: 2, alerts: 0 };

describe("GET /api/cron/announcements", () => {
  const saved = process.env.CRON_SECRET;
  beforeEach(() => {
    run.mockReset().mockResolvedValue(REPORT);
    process.env.CRON_SECRET = "s3cret";
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });

  it("does nothing until CRON_SECRET is set", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("Bearer s3cret")).status).toBe(503);
    expect(run).not.toHaveBeenCalled();
  });

  it("refuses a call without the secret, or with the wrong one, before running", async () => {
    for (const auth of [undefined, "Bearer nope", "s3cret", "Bearer s3cre"]) {
      expect((await call(auth)).status, String(auth)).toBe(401);
    }
    expect(run).not.toHaveBeenCalled();
  });

  it("runs on the cron's bearer token and answers its counts", async () => {
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(REPORT);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("logs the re-match count, or that the pass was skipped", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await call("Bearer s3cret");
    expect(info.mock.calls[0]![0]).toContain("rematched 2,");
    run.mockResolvedValueOnce({ ...REPORT, rematched: null });
    await call("Bearer s3cret");
    expect(info.mock.calls[1]![0]).toContain("rematched skipped,");
    info.mockRestore();
  });

  it("answers 500 when the ingest fails, logging no message from the error", async () => {
    run.mockRejectedValueOnce(Object.assign(new Error("secret detail"), { code: "40P01" }));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("Bearer s3cret")).status).toBe(500);
    expect(err.mock.calls.flat().join(" ")).not.toContain("secret detail");
    expect(err.mock.calls.flat().join(" ")).toContain("40P01");
    err.mockRestore();
  });

  it("does nothing on the staging project, after the bearer check, unless STAGING_CRONS is 'run'", async () => {
    const before = { label: process.env.ADMIN_ENV_LABEL, on: process.env.STAGING_CRONS };
    try {
      process.env.ADMIN_ENV_LABEL = "staging";
      delete process.env.STAGING_CRONS;
      expect((await call("Bearer nope")).status).toBe(401);
      const res = await call("Bearer s3cret");
      expect(await res.json()).toEqual({ paused: "staging" });
      expect(run).not.toHaveBeenCalled();
      process.env.STAGING_CRONS = "run";
      await call("Bearer s3cret");
      expect(run).toHaveBeenCalledTimes(1);
    } finally {
      if (before.label === undefined) delete process.env.ADMIN_ENV_LABEL; else process.env.ADMIN_ENV_LABEL = before.label;
      if (before.on === undefined) delete process.env.STAGING_CRONS; else process.env.STAGING_CRONS = before.on;
    }
  });
});
