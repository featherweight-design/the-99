import { describe, expect, it, vi } from "vitest";
import type { HealthReport } from "../../../lib/health/check";

const stub = vi.hoisted(() => ({
  report: { status: "ok" } as HealthReport,
  /** The resolved switch env, or an Error the strict read throws. */
  switches: {} as Record<string, string | undefined> | Error,
}));
vi.mock("../../../lib/health/check", () => ({ checkHealth: async () => stub.report }));
vi.mock("../../../lib/switches/snapshot", () => ({
  resolveSwitchEnvStrict: async (userId: string | null) => {
    // App-wide only: the health route never resolves for an account.
    if (userId !== null) throw new Error(`resolved for ${userId}`);
    if (stub.switches instanceof Error) throw stub.switches;
    return stub.switches;
  },
}));

import { GET } from "./route";

/** The status code is the contract an uptime check consumes, so it is asserted directly. */
async function statusFor(report: HealthReport) {
  stub.report = report;
  const res = await GET();
  return { code: res.status, body: await res.json() };
}

describe("GET /api/health", () => {
  it("returns 200 when the schema matches the code", async () => {
    const { code, body } = await statusFor({
      status: "ok",
      applied: 2,
      expected: 2,
      latestApplied: "0001_b",
      pending: [],
    });
    expect(code).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.checkedAt).toBe("string");
  });

  it("returns 503 when the schema is behind, the #70 condition", async () => {
    const { code } = await statusFor({
      status: "behind",
      applied: 1,
      expected: 2,
      latestApplied: "0000_a",
      pending: ["0001_b"],
    });
    expect(code).toBe(503);
  });

  it("returns 200 when the schema is ahead, which is healthy under expand-contract", async () => {
    const { code } = await statusFor({
      status: "ahead",
      applied: 3,
      expected: 2,
      latestApplied: "0001_b",
      pending: [],
    });
    expect(code).toBe(200);
  });

  it("returns 503 when the database is unreachable", async () => {
    const { code, body } = await statusFor({ status: "error" });
    expect(code).toBe(503);
    expect(body.status).toBe("error");
  });
});

describe("GET /api/health modelCalls", () => {
  const ok: HealthReport = { status: "ok", applied: 2, expected: 2, latestApplied: "0001_b", pending: [] };

  it("reports on when the switch is unset, the default", async () => {
    stub.switches = {};
    const { code, body } = await statusFor(ok);
    expect(body.modelCalls).toBe("on");
    expect(code).toBe(200);
  });

  it.each(["off", "false"])("reports off when the switch resolves to %s, without changing the status code", async (value) => {
    stub.switches = { MODEL_CALLS_ENABLED: value };
    const { code, body } = await statusFor(ok);
    expect(body.modelCalls).toBe("off");
    expect(code).toBe(200);
  });

  it("reports off when the switch read fails, failing closed as the reservation does", async () => {
    stub.switches = new Error("switch overrides could not be read");
    const { code, body } = await statusFor(ok);
    expect(body.modelCalls).toBe("off");
    expect(code).toBe(200);
  });

  it("still reports 503 for a schema behind its code, whatever the switch says", async () => {
    stub.switches = {};
    const { code, body } = await statusFor({ status: "behind", applied: 1, expected: 2, latestApplied: "0000_a", pending: ["0001_b"] });
    expect(code).toBe(503);
    expect(body.modelCalls).toBe("on");
  });
});
