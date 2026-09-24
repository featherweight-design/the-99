import { describe, expect, it } from "vitest";

import {
  analyzedOracleIds, diffCardBatch, diffCombos, diffFlags, emptyLogReport, logTableExists, readLogHead, writeEntries,
  type CardFacts, type CountedCombo,
} from "./log";

const facts = (gameChanger: boolean, commanderLegal = true): CardFacts => ({ gameChanger, commanderLegal });

describe("diffCardBatch", () => {
  it("logs a card joining and a card leaving the Game Changers, with the direction", () => {
    const before = new Map([["a", facts(false)], ["b", facts(true)]]);
    const after = [{ oracleId: "a", ...facts(true) }, { oracleId: "b", ...facts(false) }];
    expect(diffCardBatch(before, after)).toEqual([
      { kind: "gameChanger", direction: "added", oracleIds: ["a"], detail: {} },
      { kind: "gameChanger", direction: "removed", oracleIds: ["b"], detail: {} },
    ]);
  });

  it("writes nothing for a card whose facts did not move", () => {
    const before = new Map([["a", facts(true)]]);
    expect(diffCardBatch(before, [{ oracleId: "a", ...facts(true) }])).toEqual([]);
  });

  it("writes nothing for a card new to the catalog, which no deck can hold", () => {
    expect(diffCardBatch(new Map(), [{ oracleId: "new", ...facts(true, false) }])).toEqual([]);
  });

  it("dates a ban, and writes nothing when a card becomes legal again", () => {
    const before = new Map([["banned", facts(false, true)], ["unbanned", facts(false, false)]]);
    const after = [
      { oracleId: "banned", ...facts(false, false) },
      { oracleId: "unbanned", ...facts(false, true) },
    ];
    expect(diffCardBatch(before, after)).toEqual([
      { kind: "notLegal", direction: "added", oracleIds: ["banned"], detail: {} },
    ]);
  });

  it("logs both facts when one card moves both", () => {
    const before = new Map([["a", facts(false, true)]]);
    expect(diffCardBatch(before, [{ oracleId: "a", ...facts(true, false) }]).map((e) => e.kind)).toEqual([
      "gameChanger",
      "notLegal",
    ]);
  });
});


const exec = (result: unknown) => ({ execute: async () => result }) as unknown as Parameters<typeof logTableExists>[0];
const failing = { execute: async () => { throw new Error("relation does not exist"); } } as unknown as Parameters<typeof logTableExists>[0];

// The write half is non-fatal by contract (plan D13): the weekly ingest can meet a database with no
// log table, and nothing here may throw at it. The database half is `probe:notices-log`.
describe("the change log's non-fatal helpers", () => {
  it("reads a missing table as absent, and an unreadable check the same way", async () => {
    expect(await logTableExists(exec({ rows: [{ ok: true }] }))).toBe(true);
    expect(await logTableExists(exec({ rows: [{ ok: false }] }))).toBe(false);
    expect(await logTableExists(failing)).toBe(false);
  });

  // Null, never 0: a reading stored at 0 has "seen" nothing, so a transient failure would put the
  // whole log's history in front of the player as new.
  it("reads an empty log's head as 0, and an unreadable one as null", async () => {
    expect(await readLogHead(exec({ rows: [{ head: "17" }] }))).toBe(17);
    expect(await readLogHead(exec({ rows: [{ head: 0 }] }))).toBe(0);
    expect(await readLogHead(failing)).toBeNull();
  });

  it("counts a failed write as lost and never throws", async () => {
    const report = emptyLogReport();
    const tx = { transaction: async () => { throw new Error("insert rejected"); } };
    await writeEntries(tx as never, [{ kind: "gameChanger", direction: "added", oracleIds: ["a"], detail: {} }], report);
    expect(report).toEqual({ written: 0, lost: 1 });
  });

  it("writes nothing, and opens no savepoint, for an empty batch", async () => {
    let opened = false;
    const tx = { transaction: async () => { opened = true; } };
    const report = emptyLogReport();
    await writeEntries(tx as never, [], report);
    expect({ opened, report }).toEqual({ opened: false, report: { written: 0, lost: 0 } });
  });

  it("lists the analyzed cards with both commanders, once each, sorted", () => {
    expect(analyzedOracleIds({ commanderOracleId: "c", partnerOracleId: "a", cards: [{ oracleId: "b" }, { oracleId: "c" }] }))
      .toEqual(["a", "b", "c"]);
    expect(analyzedOracleIds({ commanderOracleId: "z", partnerOracleId: null, cards: [] })).toEqual(["z"]);
  });
});

describe("writeEntries at scale", () => {
  // An upstream reshuffle of the combo index can diff to tens of thousands of entries; one insert
  // of that many rows passes Postgres's 65,535-parameter ceiling and would lose them all.
  it("inserts in chunks of 1,000", async () => {
    const sizes: number[] = [];
    const savepoint = {
      insert: () => ({
        values: (rows: unknown[]) => ({
          returning: async () => { sizes.push(rows.length); return rows.map((_, i) => ({ seq: i })); },
        }),
      }),
    };
    const tx = { transaction: async (fn: (s: typeof savepoint) => Promise<void>) => fn(savepoint) };
    const entries = Array.from({ length: 2500 }, (_, i) => ({
      kind: "combo" as const, direction: "added" as const, oracleIds: [String(i)], detail: {},
    }));
    const report = emptyLogReport();
    await writeEntries(tx as never, entries, report);
    expect({ sizes, report }).toEqual({ sizes: [1000, 1000, 500], report: { written: 2500, lost: 0 } });
  });
});

describe("writeEntries' sequence numbers", () => {
  it("collects the exact seqs written when the caller asks, and only then", async () => {
    const savepoint = { insert: () => ({ values: () => ({ returning: async () => [{ seq: 41 }, { seq: 42 }] }) }) };
    const tx = { transaction: async (fn: (s: typeof savepoint) => Promise<void>) => fn(savepoint) };
    const two = [1, 2].map((i) => ({ kind: "combo" as const, direction: "added" as const, oracleIds: [String(i)], detail: {} }));
    const asked = { written: 0, lost: 0, seqs: [] as number[] };
    await writeEntries(tx as never, two, asked);
    const plain = emptyLogReport();
    await writeEntries(tx as never, two, plain);
    expect({ asked: asked.seqs, plain }).toEqual({ asked: [41, 42], plain: { written: 2, lost: 0 } });
  });
});

describe("diffFlags", () => {
  const off = { massLandDenial: false, extraTurn: false };
  it("logs a flag cleared as removed, and one set as added", () => {
    const before = new Map([["a", { massLandDenial: true, extraTurn: false }]]);
    const after = [{ oracleId: "a", ...off }, { oracleId: "b", massLandDenial: false, extraTurn: true }];
    expect(diffFlags(before, after).map((e) => [e.kind, e.direction, e.oracleIds])).toEqual([
      ["massLandDenial", "removed", ["a"]],
      ["extraTurns", "added", ["b"]],
    ]);
  });

  it("logs both flags when one card moves on both, and a card absent after as cleared", () => {
    const before = new Map([["a", { massLandDenial: true, extraTurn: true }]]);
    expect(diffFlags(before, []).map((e) => [e.kind, e.direction])).toEqual([
      ["massLandDenial", "removed"],
      ["extraTurns", "removed"],
    ]);
  });

  it("logs nothing for a card whose flags did not move", () => {
    const before = new Map([["a", { massLandDenial: true, extraTurn: false }]]);
    expect(diffFlags(before, [{ oracleId: "a", massLandDenial: true, extraTurn: false }])).toEqual([]);
  });
});

describe("diffCombos", () => {
  const combo = (variantId: string, pieces: string[], extra: Partial<CountedCombo> = {}): CountedCombo => ({
    variantId, pieces, mustBeCommander: [], produces: ["Infinite damage"], ...extra,
  });
  const names = new Map([["a", "Alpha"], ["b", "Beta"], ["c", "Gamma"]]);
  const nameOf = (id: string) => names.get(id) ?? id;

  it("logs a combo newly counted as added and one no longer counted as removed, in variant order", () => {
    const before = new Map([["v2", combo("v2", ["a", "c"])]]);
    const after = new Map([["v1", combo("v1", ["a", "b"], { mustBeCommander: ["a"] })]]);
    expect(diffCombos(before, after, nameOf)).toEqual([
      { kind: "combo", direction: "added", oracleIds: ["a", "b"],
        detail: { variantId: "v1", names: ["Alpha", "Beta"], produces: ["Infinite damage"], mustBeCommander: ["a"] } },
      { kind: "combo", direction: "removed", oracleIds: ["a", "c"],
        detail: { variantId: "v2", names: ["Alpha", "Gamma"], produces: ["Infinite damage"], mustBeCommander: [] } },
    ]);
  });

  it("logs nothing when a counted variant changes under the same id", () => {
    const before = new Map([["v1", combo("v1", ["a", "b"])]]);
    const after = new Map([["v1", combo("v1", ["a", "b"], { produces: ["Infinite mana"] })]]);
    expect(diffCombos(before, after, nameOf)).toEqual([]);
  });

  it("keeps the names the resolver gives, so a removed piece is named after its row is gone", () => {
    const removed = diffCombos(new Map([["v1", combo("v1", ["a", "z"])]]), new Map(), nameOf);
    expect(removed[0]?.detail.names).toEqual(["Alpha", "z"]);
  });
});
