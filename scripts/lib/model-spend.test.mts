import { describe, expect, it } from "vitest";
import { formatSpend, groupSpend } from "./model-spend";
import { MISSING_ORIGIN_MESSAGE, PRODUCTION_BRANCH_ID, STAGING_BRANCH_ID, isMissingOriginColumn, resolveSpendTarget } from "./spend-target";
import { systemCallId, systemSpendRow } from "./system-spend";

describe("groupSpend", () => {
  it("sums by origin and feature, counting refunded rows and flagging unpriced ones", () => {
    const g = groupSpend([
      { origin: "player", feature: "tuning", status: "spent", costMicroUsd: 1000 },
      { origin: "player", feature: "tuning", status: "refunded", costMicroUsd: 500 },
      { origin: "player", feature: "tuning", status: "reserved", costMicroUsd: null },
      { origin: "system", feature: "labels", status: "spent", costMicroUsd: 2_000_000 },
    ]);
    expect(g).toEqual([
      { origin: "player", feature: "tuning", calls: 3, unpriced: 1, micro: 1500 },
      { origin: "system", feature: "labels", calls: 1, unpriced: 0, micro: 2_000_000 },
    ]);
    expect(formatSpend(g)).toContain("system  total");
  });
  it("says so for an empty window", () => {
    expect(formatSpend(groupSpend([]))).toBe("No model calls in this window.");
  });
});

describe("systemSpendRow", () => {
  it("states its origin, rounds the cost up and keys the id on the batch", () => {
    const row = systemSpendRow({ feature: "labels", model: "sonnet", usd: 1.7048004, key: "labels:run-1:sonnet" });
    expect(row).toMatchObject({ origin: "system", status: "spent", feature: "labels", userId: "system", costMicroUsd: 1_704_801 });
    expect(row.id).toBe(systemCallId("labels:run-1:sonnet"));
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(systemCallId("a")).not.toBe(systemCallId("b"));
  });
  it("refuses a cost that is not a dollar amount", () => {
    expect(() => systemSpendRow({ feature: "prose", model: "m", usd: Number.NaN })).toThrow();
    expect(() => systemSpendRow({ feature: "prose", model: "m", usd: -1 })).toThrow();
  });
});

describe("resolveSpendTarget", () => {
  const env = { THE_99_NEON_STAGING_DIRECT: "postgres://s", THE_99_NEON_DIRECT: "postgres://p", DATABASE_URL: "postgres://local" };
  it("resolves staging and production to their own variables and branches, never DATABASE_URL", () => {
    expect(resolveSpendTarget(["--target", "staging"], env)).toEqual({ name: "staging", url: "postgres://s", branchId: STAGING_BRANCH_ID });
    expect(resolveSpendTarget(["--days", "7", "--target", "production"], env)).toEqual({ name: "production", url: "postgres://p", branchId: PRODUCTION_BRANCH_ID });
  });
  it("refuses an unnamed target even when DATABASE_URL is set", () => {
    expect(() => resolveSpendTarget([], env)).toThrow(/--target staging\|production/);
    expect(() => resolveSpendTarget(["--target", "local"], env)).toThrow(/unknown --target/);
  });
  it("names the missing variable", () => {
    expect(() => resolveSpendTarget(["--target", "staging"], {})).toThrow(/THE_99_NEON_STAGING_DIRECT/);
    expect(() => resolveSpendTarget(["--target", "production"], {})).toThrow(/THE_99_NEON_DIRECT/);
  });
  it("takes REPORT_DB_URL as an override, with an optional branch, and not beside --target", () => {
    expect(resolveSpendTarget([], { REPORT_DB_URL: "postgres://x", REPORT_DB_BRANCH: "br-x" })).toEqual({ name: "REPORT_DB_URL", url: "postgres://x", branchId: "br-x" });
    expect(resolveSpendTarget([], { REPORT_DB_URL: "postgres://x" }).branchId).toBeNull();
    expect(() => resolveSpendTarget(["--target", "staging"], { ...env, REPORT_DB_URL: "postgres://x" })).toThrow(/not both/);
  });
});

describe("isMissingOriginColumn", () => {
  it("recognizes an unmigrated database by code or message, and nothing else", () => {
    expect(isMissingOriginColumn({ code: "42703", message: "x" })).toBe(true);
    expect(isMissingOriginColumn(new Error('column "origin" does not exist'))).toBe(true);
    expect(isMissingOriginColumn(new Error("connection refused"))).toBe(false);
    expect(isMissingOriginColumn(null)).toBe(false);
    expect(MISSING_ORIGIN_MESSAGE).toContain("migration 0082");
  });
});
