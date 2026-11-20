// One case per failure path, built on a throwaway drizzle folder. The first case is the
// 2026-11-20 shape: 0245 written after 0247 in the journal.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { auditMigrationLedger } from "./migrations-order.mjs";

type Entry = { idx: number; tag: string; when: number; id?: string; prevId?: string; noSql?: boolean; noSnap?: boolean };

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const pad = (n: number) => String(n).padStart(4, "0");
const ROOT = "00000000-0000-0000-0000-000000000000";

/** A drizzle folder; ids chain by default (`s<idx>`), override per entry. */
function ledger(entries: Entry[], extra: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "migrations-"));
  dirs.push(dir);
  mkdirSync(join(dir, "meta"));
  let prev = ROOT;
  for (const e of entries) {
    const id = e.id ?? `s${e.idx}`;
    if (!e.noSql) writeFileSync(join(dir, `${e.tag}.sql`), "select 1;");
    if (!e.noSnap) {
      writeFileSync(join(dir, "meta", `${pad(e.idx)}_snapshot.json`), JSON.stringify({ id, prevId: e.prevId ?? prev }));
    }
    prev = id;
  }
  writeFileSync(
    join(dir, "meta", "_journal.json"),
    JSON.stringify({ entries: entries.map(({ idx, tag, when }) => ({ idx, tag, when, version: "7", breakpoints: true })) }),
  );
  for (const [name, body] of Object.entries(extra)) writeFileSync(join(dir, name), body);
  return dir;
}

const e = (idx: number, when: number, rest: Partial<Entry> = {}): Entry => ({ idx, tag: `${pad(idx)}_m${idx}`, when, ...rest });

describe("auditMigrationLedger", () => {
  it("passes a consistent ledger, gaps in numbering included", () => {
    expect(auditMigrationLedger(ledger([e(0, 1), e(1, 2), e(4, 3)]))).toEqual([]);
  });

  it("fails 0245 after 0247, and names the wrong generate base", () => {
    const problems = auditMigrationLedger(ledger([e(244, 1), e(247, 2), e(245, 3)]));
    expect(problems.some((p) => p.includes("idx must strictly increase"))).toBe(true);
    expect(problems.some((p) => p.includes("sorts last (0247_snapshot.json)"))).toBe(true);
  });

  it("fails a tag whose prefix is not its idx", () => {
    expect(auditMigrationLedger(ledger([e(0, 1), e(1, 2, { tag: "0002_m1" })])).join()).toContain("does not start with its idx");
  });

  it("fails a when that does not increase", () => {
    expect(auditMigrationLedger(ledger([e(0, 5), e(1, 5)])).join()).toContain("when must strictly increase");
  });

  it("fails a missing .sql or snapshot, and an orphan .sql", () => {
    expect(auditMigrationLedger(ledger([e(0, 1), e(1, 2, { noSql: true })])).join()).toContain("0001_m1.sql");
    expect(auditMigrationLedger(ledger([e(0, 1), e(1, 2, { noSnap: true })])).join()).toContain("0001_snapshot.json");
    expect(auditMigrationLedger(ledger([e(0, 1)], { "0001_stray.sql": "" })).join()).toContain("0001_stray.sql has no journal entry");
  });

  it("fails a broken prevId chain", () => {
    expect(auditMigrationLedger(ledger([e(0, 1), e(1, 2), e(2, 3, { prevId: "s0" })])).join()).toContain("the chain breaks");
  });
});
