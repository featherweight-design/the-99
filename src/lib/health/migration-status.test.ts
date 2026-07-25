import { describe, expect, it } from "vitest";
import { compareMigrations } from "./migration-status";

const tags = ["0000_a", "0001_b", "0002_c"];

describe("compareMigrations", () => {
  it("reports ok when every shipped migration is applied", () => {
    expect(compareMigrations(3, tags)).toEqual({
      state: "ok",
      applied: 3,
      expected: 3,
      latestApplied: "0002_c",
      pending: [],
    });
  });

  it("names the pending migrations when the schema is behind the code", () => {
    // The #70 shape: code deployed expecting schema that never landed.
    expect(compareMigrations(1, tags)).toEqual({
      state: "behind",
      applied: 1,
      expected: 3,
      latestApplied: "0000_a",
      pending: ["0001_b", "0002_c"],
    });
  });

  it("treats a schema ahead of the code as ahead, not a fault", () => {
    // Expected mid-rollout under expand-contract, so it must not read as broken.
    const health = compareMigrations(5, tags);
    expect(health.state).toBe("ahead");
    expect(health.pending).toEqual([]);
  });

  it("clamps latestApplied to a real tag when the schema is ahead", () => {
    // Guards an off-the-end index: applied exceeds the tag list.
    expect(compareMigrations(5, tags).latestApplied).toBe("0002_c");
  });

  it("reports a fresh database with nothing applied", () => {
    expect(compareMigrations(0, tags)).toEqual({
      state: "behind",
      applied: 0,
      expected: 3,
      latestApplied: null,
      pending: tags,
    });
  });

  it("reports ok for a build carrying no migrations at all", () => {
    expect(compareMigrations(0, [])).toEqual({
      state: "ok",
      applied: 0,
      expected: 0,
      latestApplied: null,
      pending: [],
    });
  });
});
