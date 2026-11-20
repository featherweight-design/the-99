import { describe, expect, it } from "vitest";
import { firstCommitReady } from "./first-commit";

describe("firstCommitReady", () => {
  const ok = { versionNumber: null, built: 99, bodySize: 99, unresolved: 0 };
  it("is ready only for a version-less deck of exactly its body size with nothing unresolved", () => {
    expect(firstCommitReady(ok)).toBe(true);
    expect(firstCommitReady({ ...ok, versionNumber: 1 })).toBe(false);
    expect(firstCommitReady({ ...ok, built: 98 })).toBe(false);
    expect(firstCommitReady({ ...ok, built: 104 })).toBe(false);
    expect(firstCommitReady({ ...ok, unresolved: 1 })).toBe(false);
  });
  it("reads a partner deck's body size (98)", () => {
    expect(firstCommitReady({ ...ok, built: 98, bodySize: 98 })).toBe(true);
    expect(firstCommitReady({ ...ok, built: 99, bodySize: 98 })).toBe(false);
  });
});
