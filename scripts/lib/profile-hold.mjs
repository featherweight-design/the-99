// Hold one deck's stored analysis across a probe that deletes or rewrites it.
//
// Three probes (`probe:analysis-tab`, `probe:verdict-block`, `probe:bracket-chip`) clear a real
// account's `deck_profiles` row to reach the empty state, or upsert it by pressing Analyze. A
// restore held only in memory is lost the moment the process dies or the one restore statement
// fails, and the reader's saved analysis goes with it. So the row is written to DISK before
// anything touches it, the restore is retried, and a failed restore keeps the file — the next run
// of any of these probes finds it and puts the ORIGINAL back rather than capturing the mess the
// last run left as if it were the original.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_DIR = join(tmpdir(), "the99-probe-holds");

/** A jsonb column arrives as an object and has to go back as text; arrays and scalars pass through. */
const param = (v) => (v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) ? JSON.stringify(v) : v);

async function put(sql, deckId, row) {
  if (!row) {
    await sql.query("delete from deck_profiles where deck_id = $1::uuid", [deckId]);
    return;
  }
  const cols = Object.keys(row);
  await sql.query(
    `insert into deck_profiles (${cols.map((c) => `"${c}"`).join(",")}) values (${cols.map((_, n) => `$${n + 1}`).join(",")})
     on conflict (deck_id) do update set ${cols.filter((c) => c !== "deck_id").map((c) => `"${c}" = excluded."${c}"`).join(", ")}`,
    cols.map((c) => param(row[c])),
  );
}

/**
 * Capture `deckId`'s row (or its absence) to disk and return a `restore` that puts it back.
 * `sql` is a neon client — only its `.query(text, params)` form is used.
 */
export async function holdProfile(sql, deckId, { dir = DEFAULT_DIR, attempts = 3, waitMs = 1000 } = {}) {
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${deckId}.json`);

  let original;
  try {
    // A file already here is an earlier run that never restored: IT holds the original.
    ({ row: original } = JSON.parse(await readFile(file, "utf8")));
    console.log(`       (restoring ${deckId}'s analysis left by an earlier run, from ${file})`);
    await put(sql, deckId, original);
  } catch (err) {
    if (err?.code !== "ENOENT") throw err;
    original = (await sql.query("select * from deck_profiles where deck_id = $1::uuid", [deckId]))[0] ?? null;
    await writeFile(file, JSON.stringify({ row: original }));
  }

  return async function restore() {
    let last;
    for (let n = 1; n <= attempts; n++) {
      try {
        await put(sql, deckId, original);
        await rm(file, { force: true });
        return;
      } catch (err) {
        last = err;
        if (n < attempts) await new Promise((r) => setTimeout(r, waitMs * n));
      }
    }
    throw new Error(`could not restore ${deckId}'s analysis; it is kept at ${file} and the next run puts it back (${last?.message})`);
  };
}
