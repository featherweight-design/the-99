import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sweep = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/account/sweep", () => ({ sweepTombstones: sweep }));
const { GET } = await import("./route");

const call = (auth?: string) => GET(new Request("https://x/api/cron/account-sweep", { headers: auth ? { authorization: auth } : {} }) as never);

describe("GET /api/cron/account-sweep", () => {
  const saved = process.env.CRON_SECRET;
  beforeEach(() => {
    sweep.mockReset().mockResolvedValue({ swept: 2, failed: 0, retired: 1 });
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

  it("sweeps on the cron's bearer token and answers its counts", async () => {
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ swept: 2, failed: 0, retired: 1 });
  });

  it("answers 500 when the sweep fails, logging no message from the error", async () => {
    sweep.mockRejectedValueOnce(Object.assign(new Error("user_2secret leaked"), { code: "40P01" }));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("Bearer s3cret")).status).toBe(500);
    expect(err.mock.calls.flat().join(" ")).not.toContain("user_2secret");
    expect(err.mock.calls.flat().join(" ")).toContain("40P01");
    err.mockRestore();
  });
});
