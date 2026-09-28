import { describe, expect, it, vi } from "vitest";

// The spec's module reaches `src/db` through the builder's score clear; nothing here queries it.
vi.mock("../../src/db", () => ({ db: {} }));

const { indexCopySpec } = await import("./index-copy");
type Snapshot = Parameters<typeof indexCopySpec.floors>[0];

const commander = (i: number, derived = true) =>
  ({ commanderOracleId: `c${i}`, synergyState: "ok", avgRamp: derived ? 8 : null }) as unknown as Snapshot["support"][number];

const whole = (): Snapshot => ({
  support: Array.from({ length: 10 }, (_, i) => commander(i)),
  supportCards: [],
  pairs: Array.from({ length: 1_500 }, () => ({}) as Snapshot["pairs"][number]),
  pairCards: [],
  staples: [{} as Snapshot["staples"][number]],
  composition: [],
});

describe("the index copy's floors", () => {
  it("passes a whole build, with no composition", () => {
    expect(indexCopySpec.floors(whole())).toEqual([]);
  });

  it("refuses an index with no ok commander", () => {
    expect(indexCopySpec.floors({ ...whole(), support: [] })).toContain("no ok commander in commander_support");
  });

  it("refuses role targets on under 90% of the ok commanders", () => {
    const s = whole();
    s.support = [...Array.from({ length: 8 }, (_, i) => commander(i)), commander(8, false), commander(9, false)];
    expect(indexCopySpec.floors(s)).toContain("role targets on 8 of 10 ok commanders");
  });

  it("refuses fewer pairs than the legal-pair floor", () => {
    expect(indexCopySpec.floors({ ...whole(), pairs: whole().pairs.slice(1) })).toContain("pairs 1499 < 1500");
  });

  it("refuses an empty format_staples", () => {
    expect(indexCopySpec.floors({ ...whole(), staples: [] })).toContain("format_staples is empty");
  });
});
