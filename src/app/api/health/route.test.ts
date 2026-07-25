import { describe, expect, it, vi } from "vitest";
import type { HealthReport } from "../../../lib/health/check";

const stub = vi.hoisted(() => ({ report: { status: "ok" } as HealthReport }));
vi.mock("../../../lib/health/check", () => ({ checkHealth: async () => stub.report }));

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
