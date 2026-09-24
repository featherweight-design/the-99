import { afterEach, describe, expect, it, vi } from "vitest";

import { finishMigration, recordRulesVersion, type RulesEntryDb } from "./rules-entry";

const fakeDb = (over: Partial<RulesEntryDb> = {}) => {
  const calls: string[] = [];
  const db: RulesEntryDb = {
    highestLogged: async () => { calls.push("highest"); return 1; },
    insert: async (v) => { calls.push(`insert ${v}`); },
    close: async () => { calls.push("close"); },
    ...over,
  };
  return { db, calls };
};

afterEach(() => vi.restoreAllMocks());

// `scripts/vercel-migrate.ts` once stopped every production deploy for five hours. These pin the
// orchestrator's conditions on the one thing this lane adds to it (plan D8).
describe("finishMigration: the migration's exit code, whatever the entry does", () => {
  it("exits 0 after a good migration even when the entry step THROWS, so `next build` runs", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const code = await finishMigration(0, async () => { throw new Error("db down"); });
    expect(code).toBe(0);
  });

  it("never runs the entry after a failed migration, and keeps that failure's code", async () => {
    const record = vi.fn(async () => {});
    expect(await finishMigration(1, record)).toBe(1);
    expect(await finishMigration(null, record)).toBe(1);
    expect(record).not.toHaveBeenCalled();
  });
});

describe("recordRulesVersion", () => {
  it("writes nothing at version 1, and opens no connection", async () => {
    const open = vi.fn(() => fakeDb().db);
    expect(await recordRulesVersion(open, 1)).toBe("unchanged");
    expect(open).not.toHaveBeenCalled();
  });

  const words = { 2: { rule: "A rule", reads: "What it reads" } };

  it("writes one entry when the version is above the highest logged, and closes", async () => {
    const { db, calls } = fakeDb();
    expect(await recordRulesVersion(() => db, 2, undefined, words)).toBe("written");
    expect(calls).toEqual(["highest", "insert 2", "close"]);
  });

  // Logged without words, the version would count as written and never be retried, while every
  // reader got a notice with nothing to say.
  it("refuses a version with no words, writing nothing and warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { db, calls } = fakeDb();
    expect(await recordRulesVersion(() => db, 2, undefined, {})).toBe("failed");
    expect(calls).not.toContain("insert 2");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no RULES_CHANGES row for version 2"));
  });

  it("writes nothing when that version is already logged", async () => {
    const { db, calls } = fakeDb({ highestLogged: async () => 2 });
    expect(await recordRulesVersion(() => db, 2)).toBe("unchanged");
    expect(calls).toEqual(["close"]);
  });

  it("resolves 'failed' with one warn line when the write throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { db } = fakeDb({ insert: async () => { throw new Error("locked"); } });
    expect(await recordRulesVersion(() => db, 2)).toBe("failed");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("gives up at the deadline rather than hanging a build", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { db } = fakeDb({ highestLogged: () => new Promise(() => {}) });
    expect(await recordRulesVersion(() => db, 2, 20)).toBe("failed");
  });

  it("does not wait for a close that never settles (a stalled query holds `pool.end()`)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { db } = fakeDb({ highestLogged: () => new Promise(() => {}), close: () => new Promise(() => {}) });
    expect(await recordRulesVersion(() => db, 2, 20)).toBe("failed");
  });

  it("resolves 'failed' when even opening the client throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await recordRulesVersion(() => { throw new Error("bad url"); }, 2)).toBe("failed");
  });
});
