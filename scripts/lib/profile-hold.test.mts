// The hold must survive the two ways a restore held in memory is lost: the process dying before
// its `finally`, and the one restore statement failing. Each case is written as that failure.

import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { holdProfile } from "./profile-hold.mjs";

const DECK = "d0000000-0000-4000-8000-00000000cafe";

/** A stand-in for neon's `.query`: one table, one row per deck, and a switch to fail writes. */
function fakeSql(initial: Record<string, unknown> | null) {
  const db = { row: initial as Record<string, unknown> | null, failWrites: 0 };
  const sql = {
    async query(text: string, params: unknown[]) {
      if (text.startsWith("select")) return db.row ? [db.row] : [];
      if (db.failWrites > 0) {
        db.failWrites--;
        throw new Error("connection reset");
      }
      if (text.startsWith("delete")) db.row = null;
      else db.row = Object.fromEntries(Object.keys(db.row ?? initial ?? {}).map((c, n) => [c, params[n]]));
      return [];
    },
  };
  return { db, sql };
}

const row = { deck_id: DECK, fingerprint: "orig", profile: { v: 1 }, permits: [3, 4] };

describe("holdProfile", () => {
  it("puts back the row it captured, and removes its file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hold-"));
    const { db, sql } = fakeSql(row);
    const restore = await holdProfile(sql, DECK, { dir });
    db.row = null; // the probe clears it
    await restore();
    expect(db.row).toMatchObject({ fingerprint: "orig", profile: JSON.stringify({ v: 1 }), permits: [3, 4] });
    expect(await readdir(dir)).toEqual([]);
  });

  it("deletes what the probe wrote when there was no row", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hold-"));
    const { db, sql } = fakeSql(null);
    const restore = await holdProfile(sql, DECK, { dir });
    db.row = { deck_id: DECK, fingerprint: "probe" }; // the press upserted one
    await restore();
    expect(db.row).toBeNull();
  });

  // THE DEAD RUN. The first run captured and then died before restoring; the second must put
  // back the FIRST run's original, not capture the state the dead run left behind.
  it("restores an earlier run's original before capturing anything", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hold-"));
    const { db, sql } = fakeSql(row);
    await holdProfile(sql, DECK, { dir }); // never restored
    db.row = { deck_id: DECK, fingerprint: "probe", profile: { v: 9 }, permits: [5] };
    const restore = await holdProfile(sql, DECK, { dir });
    expect(db.row).toMatchObject({ fingerprint: "orig" });
    db.row = null;
    await restore();
    expect(db.row).toMatchObject({ fingerprint: "orig" });
  });

  // THE FAILED RESTORE. A transient error is retried; one that outlasts the retries keeps the
  // file, so the next run can still put the original back.
  it("retries a failed restore, and keeps the file when every attempt fails", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hold-"));
    const { db, sql } = fakeSql(row);
    const restore = await holdProfile(sql, DECK, { dir, attempts: 3, waitMs: 0 });
    db.row = null;
    db.failWrites = 1;
    await restore();
    expect(db.row).toMatchObject({ fingerprint: "orig" });

    const again = await holdProfile(sql, DECK, { dir, attempts: 2, waitMs: 0 });
    db.row = null;
    db.failWrites = 5;
    await expect(again()).rejects.toThrow(/kept at/);
    expect(await readdir(dir)).toEqual([`${DECK}.json`]);
  });
});
