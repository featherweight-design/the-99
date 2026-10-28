import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sweep = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/invites/sweep", () => ({ sweepInvites: sweep }));
const { GET } = await import("./route");

const call = (auth?: string) => GET(new Request("https://x/api/cron/invite-sweep", { headers: auth ? { authorization: auth } : {} }) as never);

describe("GET /api/cron/invite-sweep", () => {
  const saved = process.env.CRON_SECRET;
  beforeEach(() => {
    sweep.mockReset().mockResolvedValue({ returned: 2, revoked: 1, reconciled: 0, kept: 0 });
    process.env.CRON_SECRET = "s3cret";
  });
  afterEach(() => {
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

  it("sweeps on the cron's bearer token, reads no switch, and answers its counts", async () => {
    process.env.SOCIAL_INVITES_ENABLED = "off";
    try {
      const res = await call("Bearer s3cret");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ returned: 2, revoked: 1, reconciled: 0, kept: 0 });
    } finally {
      delete process.env.SOCIAL_INVITES_ENABLED;
    }
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
      process.env.STAGING_CRONS = "run";
      await call("Bearer s3cret");
      expect(sweep).toHaveBeenCalledTimes(1);
    } finally {
      if (saved.label === undefined) delete process.env.ADMIN_ENV_LABEL; else process.env.ADMIN_ENV_LABEL = saved.label;
      if (saved.on === undefined) delete process.env.STAGING_CRONS; else process.env.STAGING_CRONS = saved.on;
    }
  });
});
