import { describe, expect, it, vi } from "vitest";

// The spec's module reaches `src/db` through the builder's score clear; nothing here queries it.
vi.mock("../../src/db", () => ({ db: {} }));

const { indexCopySpec, labelledCards, labelRefusal } = await import("./index-copy");
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
  labelFingerprint: null,
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

  // The builder's pair half of the role-target refusal: ok pairs carrying no targets past the floor.
  const pair = (derived: boolean) =>
    ({ synergyState: "ok", avgRamp: derived ? 8 : null }) as unknown as Snapshot["pairs"][number];
  it("refuses role targets on under 90% of the ok pairs", () => {
    const pairs = [...Array.from({ length: 1_300 }, () => pair(true)), ...Array.from({ length: 200 }, () => pair(false))];
    expect(indexCopySpec.floors({ ...whole(), pairs })).toContain("role targets on 1300 of 1500 ok pairs");
  });

  it("passes pairs whose role targets reach the floor", () => {
    const pairs = [...Array.from({ length: 1_400 }, () => pair(true)), ...Array.from({ length: 100 }, () => pair(false))];
    expect(indexCopySpec.floors({ ...whole(), pairs })).toEqual([]);
  });

  it("refuses an empty format_staples", () => {
    expect(indexCopySpec.floors({ ...whole(), staples: [] })).toContain("format_staples is empty");
  });
});

describe("the index copy's build step", () => {
  const row = (report: string | null) => ({ report }) as Parameters<NonNullable<typeof indexCopySpec.buildAccepted>>[0];
  it("accepts a build whose staples step finished last", () => {
    expect(indexCopySpec.buildAccepted!(row("phase=staples"))).toBeNull();
  });
  // Between the two steps the newest row is the index phase over the previous staples.
  it("refuses a build whose newest row is the index step", () => {
    expect(indexCopySpec.buildAccepted!(row("phase=index; 3382 commanders, 1717 pairs"))).toMatch(/staples has not finished/);
  });
  it("refuses an unmarked row", () => {
    expect(indexCopySpec.buildAccepted!(row(null))).toMatch(/unmarked step/);
  });
});

describe("the index copy's label check", () => {
  it("passes when the target's labels give the build's role sets", () => {
    expect(labelRefusal("a".repeat(32), "a".repeat(32))).toBeNull();
  });

  it("refuses when they differ", () => {
    expect(labelRefusal("a".repeat(32), "b".repeat(32))).toMatch(/different role sets/);
  });

  it("checks nothing for a build that wrote no label targets", () => {
    expect(labelRefusal(null, "b".repeat(32))).toBeNull();
  });

  it("reads the cards of ok commanders and ok pairs only, once each", () => {
    const s = {
      support: [
        { commanderOracleId: "c1", synergyState: "ok" },
        { commanderOracleId: "c2", synergyState: "absent" },
      ],
      supportCards: [
        { commanderOracleId: "c1", oracleId: "x" },
        { commanderOracleId: "c1", oracleId: "y" },
        { commanderOracleId: "c2", oracleId: "z" },
      ],
      pairs: [
        { commanderOracleId: "a", partnerOracleId: "b", synergyState: "ok" },
        { commanderOracleId: "a", partnerOracleId: "d", synergyState: "degraded" },
      ],
      pairCards: [
        { commanderOracleId: "a", partnerOracleId: "b", oracleId: "x" },
        { commanderOracleId: "a", partnerOracleId: "b", oracleId: "p" },
        { commanderOracleId: "a", partnerOracleId: "d", oracleId: "q" },
      ],
    } as unknown as Parameters<typeof labelledCards>[0];
    expect(labelledCards(s).sort()).toEqual(["p", "x", "y"]);
  });
});

describe("the index copy's label preflight, which a dry run also runs", () => {
  const target = (rows: unknown[] = []) => ({ execute: vi.fn(async () => ({ rows })) });
  const snap = (labelFingerprint: string | null) => ({ ...whole(), labelFingerprint });

  it("refuses when the target's labels give different role sets", async () => {
    const t = target();
    expect(await indexCopySpec.targetRefusal!(t as never, snap("a".repeat(32)))).toMatch(/different role sets/);
    expect(t.execute).not.toHaveBeenCalled(); // no listed card, so nothing to read
  });

  it("reads nothing for a build that wrote no label targets", async () => {
    const t = target();
    expect(await indexCopySpec.targetRefusal!(t as never, snap(null))).toBeNull();
    expect(t.execute).not.toHaveBeenCalled();
  });
});

describe("the index copy's label check under the lock", () => {
  it("refuses inside publish before writing anything, when the labels moved after the preflight", async () => {
    // A transaction that can only read: any write the publish attempted before refusing would throw
    // a TypeError here instead of the refusal.
    const tx = { execute: vi.fn(async () => ({ rows: [] })) };
    const s = {
      ...whole(),
      supportCards: [{ commanderOracleId: "c0", oracleId: "x" }] as unknown as Snapshot["supportCards"],
      labelFingerprint: "a".repeat(32),
    };
    await expect(indexCopySpec.publish(tx as never, s)).rejects.toThrow(/different role sets/);
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });
});
