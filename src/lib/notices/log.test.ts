import { describe, expect, it } from "vitest";

import {
  analyzedOracleIds, diffCardBatch, emptyLogReport, logTableExists, readLogHead, writeEntries, type CardFacts,
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
