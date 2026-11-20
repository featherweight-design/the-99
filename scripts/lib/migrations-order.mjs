// The migration ledger's shape, checked from the files alone: no database, no network.
//
// drizzle-kit generate diffs the schema against the snapshot that sorts LAST by filename, and
// the migrator applies journal entries in FILE order. On 2026-11-20 the journal held
// 0245_launch_list_sent_at AFTER 0247_spare_requests_withdrawn_at (fixed by renumbering it to
// 0248): generate's base and the apply order disagreed, and no check failed. Every rule below
// is one way that disagreement can be written down.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const pad = (n) => String(n).padStart(4, "0");

/**
 * @param {string} dir the drizzle folder (holds `<tag>.sql` and `meta/`)
 * @param {{ journal?: string }} [opts] an alternative `_journal.json` path
 * @returns {string[]} one line per problem; empty when the ledger is consistent
 */
export function auditMigrationLedger(dir, opts = {}) {
  const problems = [];
  const metaDir = join(dir, "meta");
  const journalPath = opts.journal ?? join(metaDir, "_journal.json");
  let entries;
  try {
    entries = JSON.parse(readFileSync(journalPath, "utf8")).entries;
  } catch (err) {
    return [`cannot read the journal ${journalPath}: ${err.message}`];
  }
  if (!Array.isArray(entries) || entries.length === 0) return [`${journalPath} has no entries`];

  // Numbering and order, in file order.
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const prev = entries[i - 1];
    if (!Number.isInteger(e.idx)) problems.push(`journal entry ${i} (${e.tag}) has no integer idx`);
    if (!String(e.tag ?? "").startsWith(`${pad(e.idx)}_`)) {
      problems.push(`journal tag ${e.tag} does not start with its idx ${pad(e.idx)}`);
    }
    if (prev && !(e.idx > prev.idx)) {
      problems.push(`journal idx ${e.idx} (${e.tag}) follows ${prev.idx} (${prev.tag}): idx must strictly increase`);
    }
    if (prev && !(e.when > prev.when)) {
      problems.push(`journal when of ${e.tag} (${e.when}) is not after ${prev.tag} (${prev.when}): when must strictly increase`);
    }
  }

  // Every entry has its files, and every file has its entry.
  const tags = new Set(entries.map((e) => e.tag));
  const idxs = new Set(entries.map((e) => pad(e.idx)));
  for (const e of entries) {
    if (!existsSync(join(dir, `${e.tag}.sql`))) problems.push(`journal tag ${e.tag} has no ${dir}/${e.tag}.sql`);
    if (!existsSync(join(metaDir, `${pad(e.idx)}_snapshot.json`))) {
      problems.push(`journal tag ${e.tag} has no ${metaDir}/${pad(e.idx)}_snapshot.json`);
    }
  }
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (!tags.has(f.slice(0, -4))) problems.push(`${dir}/${f} has no journal entry`);
  }
  const snapshots = readdirSync(metaDir).filter((f) => /^\d{4}_snapshot\.json$/.test(f)).sort();
  for (const f of snapshots) {
    if (!idxs.has(f.slice(0, 4))) problems.push(`${metaDir}/${f} has no journal entry`);
  }

  // generate's base: the snapshot that sorts last must be the last entry's.
  const last = entries[entries.length - 1];
  const lastSnapshot = snapshots[snapshots.length - 1];
  if (lastSnapshot && lastSnapshot !== `${pad(last.idx)}_snapshot.json`) {
    problems.push(
      `the snapshot that sorts last (${lastSnapshot}) is not the last journal entry's (${pad(last.idx)}_snapshot.json, ${last.tag}): drizzle-kit generate would diff from the wrong base`,
    );
  }

  // The prevId chain, in journal order, from the first entry that has a snapshot.
  let prevId = null;
  let prevTag = null;
  for (const e of entries) {
    const p = join(metaDir, `${pad(e.idx)}_snapshot.json`);
    if (!existsSync(p)) {
      if (prevId !== null) prevId = undefined; // a gap breaks the chain; reported above already
      continue;
    }
    let snap;
    try {
      snap = JSON.parse(readFileSync(p, "utf8"));
    } catch (err) {
      problems.push(`cannot read ${p}: ${err.message}`);
      prevId = undefined;
      continue;
    }
    if (prevId && snap.prevId !== prevId) {
      problems.push(`snapshot of ${e.tag} has prevId ${snap.prevId}, but the previous entry ${prevTag} has id ${prevId}: the chain breaks`);
    }
    prevId = snap.id;
    prevTag = e.tag;
  }

  return problems;
}
