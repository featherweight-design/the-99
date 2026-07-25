import { describe, expect, it, vi } from "vitest";

// The db client throws at module init without DATABASE_URL.
const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown>, initThrows: false }));
vi.mock("../../db", () => {
  if (stub.initThrows) throw new Error("DATABASE_URL is not set");
  return { db: stub.db };
});
vi.mock("./migration-journal", () => ({ shippedMigrationTags: ["0000_a", "0001_b"] }));

import { checkHealth } from "./check";

describe("checkHealth", () => {
  it("reports ok when the ledger matches the shipped tags", async () => {
    stub.db.execute = async () => ({ rows: [{ applied: 2 }] });
    expect(await checkHealth()).toEqual({
      status: "ok",
      applied: 2,
      expected: 2,
      latestApplied: "0001_b",
      pending: [],
    });
  });

  it("reports the pending tag when the database is behind", async () => {
    stub.db.execute = async () => ({ rows: [{ applied: 1 }] });
    expect(await checkHealth()).toMatchObject({ status: "behind", pending: ["0001_b"] });
  });

  it("treats an empty result as nothing applied rather than throwing", async () => {
    stub.db.execute = async () => ({ rows: [] });
    expect(await checkHealth()).toMatchObject({ status: "behind", applied: 0 });
  });

  it("reports error without echoing the database error", async () => {
    // A connection failure message can carry host and database name, and this
    // endpoint is unauthenticated — the payload must not grow a details field.
    stub.db.execute = async () => {
      throw new Error("connect ECONNREFUSED db.internal:5432 password=hunter2");
    };
    const report = await checkHealth();
    expect(report).toEqual({ status: "error" });
    expect(JSON.stringify(report)).not.toContain("hunter2");
  });

  it("reports error when the db client cannot initialize", async () => {
    stub.initThrows = true;
    vi.resetModules();
    try {
      expect(await checkHealth()).toEqual({ status: "error" });
    } finally {
      stub.initThrows = false;
      vi.resetModules();
    }
  });
});
