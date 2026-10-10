import { describe, expect, it } from "vitest";
import { labelRoleSet, roleSetFingerprint } from "./role-sets";
import type { Job } from "./types";

const job = (space: "role" | "theme", kind: string) => ({ space, kind }) as unknown as Job;

describe("labelRoleSet", () => {
  it("reads the four target roles off a nonland card's role jobs", () => {
    expect(labelRoleSet([job("role", "removal"), job("role", "draw")], "Instant")).toEqual(["draw", "removal"]);
  });

  it("counts a land toward none of them, even one labelled ramp", () => {
    expect(labelRoleSet([job("role", "ramp")], "Land")).toEqual([]);
  });

  it("reads a land-backed MDFC by its front face", () => {
    expect(labelRoleSet([job("role", "removal")], "Instant // Land")).toEqual(["removal"]);
  });

  it("does not count a counterspell as removal", () => {
    expect(labelRoleSet([job("role", "counterspell")], "Instant")).toEqual([]);
  });

  it("ignores a theme of the same name", () => {
    expect(labelRoleSet([job("theme", "ramp")], "Creature — Elf")).toEqual([]);
  });
});

describe("roleSetFingerprint", () => {
  const sets = new Map([["a", ["ramp" as const]], ["b", ["draw" as const, "removal" as const]]]);

  it("does not depend on the order the cards or roles were read in", () => {
    const reordered = new Map([["b", ["removal" as const, "draw" as const]], ["a", ["ramp" as const]]]);
    expect(roleSetFingerprint(["b", "a", "a"], reordered)).toBe(roleSetFingerprint(["a", "b"], sets));
  });

  it("moves when a card's roles move under the same card", () => {
    const relabelled = new Map([["a", ["draw" as const]], ["b", ["draw" as const, "removal" as const]]]);
    expect(roleSetFingerprint(["a", "b"], relabelled)).not.toBe(roleSetFingerprint(["a", "b"], sets));
  });

  it("tells an unlabelled card from a labelled one doing none of the four", () => {
    expect(roleSetFingerprint(["a"], new Map())).not.toBe(roleSetFingerprint(["a"], new Map([["a", []]])));
  });
});
