import { describe, expect, it } from "vitest";

import type { CommitSnapshot } from "./versions";

/**
 * The commit's snapshot RULE, tested as the pure decision it is.
 *
 * `commitVersion` writes to a real transaction, so the insert itself belongs to
 * `probe:declaration`. What can be pinned here is the rule that decides what goes in the two
 * columns — and it is the rule, not the insert, that carries the ruling: a version never
 * asserts a bracket its own cards contradict.
 *
 * Mirrors the expression in `versions.ts`. It is small enough that a second copy is the
 * lesser evil against the alternative, which is no coverage until a probe runs against a
 * database — and the probe asserts the same two columns, so a drift between them shows up
 * there rather than hiding.
 */
const carried = (s: CommitSnapshot | undefined) =>
  s && s.declared !== null && s.permits.includes(s.declared) ? s.declared : null;

const permitsOf = (s: CommitSnapshot | undefined) =>
  s ? [...s.permits].sort((a, b) => a - b) : null;

describe("what a commit carries into its version", () => {
  it("carries a declaration the version's own cards permit", () => {
    expect(carried({ declared: 4, permits: [4, 5] })).toBe(4);
    expect(carried({ declared: 2, permits: [1, 2] })).toBe(2);
  });

  it("carries NONE when the deck moved out from under the declaration", () => {
    // The player declared cEDH and tuned the deck down. The version records no declaration
    // rather than asserting a bracket its own cards contradict — and the deck keeps its live
    // answer, so the surface can still say the reading moved.
    expect(carried({ declared: 5, permits: [3] })).toBeNull();
    expect(carried({ declared: 1, permits: [2] })).toBeNull();
  });

  it("carries none when nothing was declared", () => {
    expect(carried({ declared: null, permits: [1, 2] })).toBeNull();
  });

  it("records neither column when no snapshot is handed in", () => {
    // Every version committed before these columns existed is in this state, and so is any
    // commit from a surface with no profile to hand. It is a legitimate state, not a failure.
    expect(carried(undefined)).toBeNull();
    expect(permitsOf(undefined)).toBeNull();
  });

  it("sorts the permits, so two ranges compare without either reader sorting", () => {
    expect(permitsOf({ declared: null, permits: [5, 4] })).toEqual([4, 5]);
  });
});
