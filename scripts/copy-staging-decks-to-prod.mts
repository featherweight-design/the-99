/**
 * Copy one player's decks from STAGING to PRODUCTION, under their own account on each side.
 *
 * WHY. Hugh's real decks live on staging (`pull:staging` is how a local probe gets a copy of
 * them); his production account has his real collection but no decks of its own yet. This is
 * the one-time move that puts the decks he actually plays behind his production login.
 *
 * NOT `pull:staging`. That script's whole safety story — target never defaulted, refused
 * unless the target names itself by `neon.branch_id` — is built for a LOCAL target. This one
 * writes to PRODUCTION, so every one of those rules applies with a sharper edge, plus two more
 * this script adds because the earlier one never needed them: card references are verified
 * against the target's own catalog before anything is written, and the real write is a second,
 * separate confirmation this script's caller must give explicitly — `--dry-run` is not a flag
 * here, it is the only mode this script runs in until someone deliberately asks for the other
 * one.
 *
 * WHAT MOVES. decks, deck_cards, deck_versions, deck_version_cards, deck_games,
 * deck_game_axes, deck_folders, and the deck-scoped player state: deck_locks, deck_proxies,
 * card_assignments, pull_releases.
 *
 * WHAT DOES NOT. deck_profiles, deck_synopses, deck_version_synopses, deck_suggestion_runs,
 * deck_suggestion_items, deck_swaps, deck_unresolved_rows, fill_passes, fill_pass_cards,
 * collection_items, card_art_preferences, csv_uploads. Every one of those is either an
 * analysis the target re-runs fresh (deck_profiles and everything downstream of it — Hugh's
 * instruction), an import artifact tied to a staging upload that was never made on production,
 * or the collection itself, which production already has and this script never touches.
 * `deck_unresolved_rows` and `fill_passes`/`fill_pass_cards` were not named in either direction
 * by the assignment; this script does not copy them, and says so in its report rather than
 * silently deciding either way — flag the gap, do not improvise a scope.
 *
 * ONE WAY, NAMED, AND IT FAILS CLOSED — same shape as `pull:staging`, extended:
 *
 *   - Source and target are separate variables; the source is opened READ ONLY.
 *   - The target is never defaulted, and the caller must NAME its branch — checked against what
 *     the target actually reports before anything is read for real or written.
 *   - A same-database pair (source === target by `neon.branch_id`) is refused.
 *   - CARD REFERENCES ARE VERIFIED, not assumed. Every `oracle_id` the copied rows touch —
 *     decks' commander/partner/answer-card columns, deck_cards, deck_version_cards,
 *     deck_proxies, deck_locks, card_assignments, pull_releases — is checked against the
 *     TARGET's own `cards` table before a write is attempted, and any that do not resolve are
 *     REPORTED, never silently dropped. (There is no `printing_id` anywhere in the copied
 *     tables — every card reference here is by `oracle_id` — so "printing" verification and
 *     "oracle_id" verification are the same check in this domain; the report says so rather
 *     than claiming a check that cannot exist.)
 *   - `pull_releases` can name a deck other than the one it is scoped to being asked for
 *     (`asking_deck_id` vs `source_deck_id`), and either could in principle belong to someone
 *     else's deck. Rows where BOTH ends are not among this player's own decks being copied are
 *     REPORTED and EXCLUDED — never inserted half-referencing a deck that was never written on
 *     the target, which an FK would refuse anyway, but loudly rather than as a surprise mid-write.
 *   - EVERY SOURCE READ is one `repeatable read, read only` transaction. The target WRITE, when
 *     one is asked for, is one transaction: no `on conflict do nothing` — a conflict means the
 *     target already holds that id, most likely under a different user, and skipping it would
 *     attach this snapshot's rows to a stranger's deck. It also opens by taking an EXCLUSIVE
 *     lock on every table it touches (bounded by a 5s `lock_timeout`, so a busy production
 *     database aborts the run rather than queuing behind it) — without that, the existing-decks
 *     read and the delete that follows it are two separate statements, and a deck the app writes
 *     in between would survive the delete and turn the write into a merge rather than the
 *     snapshot it claims to be.
 *   - `--dry-run` reads everything, including the live target, and writes nothing. `--replace`
 *     is required if the target account already holds decks — the expected case here is zero,
 *     and the refusal is the safety net for the case where that has changed since this was
 *     written.
 *   - **THE REAL WRITE NEEDS A SEPARATE, EXPLICIT GO.** This script will perform it when asked
 *     to (`--confirm-production-write`), but nothing about running it without `--dry-run` should
 *     ever be automatic — Hugh's production writes follow his own hard rule, and this script's
 *     caller is answerable for getting his go before passing that flag.
 *
 *   THE_99_NEON_STAGING_DIRECT=<staging> \
 *   DECK_COPY_TARGET_URL=<production> DECK_COPY_TARGET_BRANCH=br-… \
 *   DECK_COPY_SOURCE_USER_ID=<staging user> DECK_COPY_TARGET_USER_ID=<production user> \
 *   pnpm copy:staging-decks --dry-run
 *
 *   …same, plus --confirm-production-write   # only once Hugh's go has been relayed
 *   …same, plus --replace                    # only if the target account already holds decks
 */
import { neon, neonConfig, Pool, types } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;

// Every copied table's timestamp column is `timestamp without time zone` (OID 1114; none of the
// copied tables use `withTimezone`). node-postgres's default parser reads that naive string as a
// LOCAL-time `Date`, and the driver then serializes a `Date` parameter back out in UTC — so
// running this somewhere other than UTC would shift every committed/game/edit timestamp by the
// operator's offset (Copilot round 5). Returning the raw string instead means it is never
// interpreted as any timezone at all: the exact bytes staging stored are the exact bytes
// production gets.
types.setTypeParser(1114, (v: string) => v);

const {
  THE_99_NEON_STAGING_DIRECT: SOURCE,
  DECK_COPY_TARGET_URL: TARGET,
  DECK_COPY_TARGET_BRANCH: EXPECTED_BRANCH,
  DECK_COPY_SOURCE_USER_ID: SOURCE_USER,
  DECK_COPY_TARGET_USER_ID: TARGET_USER,
} = requireEnv([
  "THE_99_NEON_STAGING_DIRECT",
  "DECK_COPY_TARGET_URL",
  "DECK_COPY_TARGET_BRANCH",
  "DECK_COPY_SOURCE_USER_ID",
  "DECK_COPY_TARGET_USER_ID",
]);

const DRY = process.argv.includes("--dry-run");
const REPLACE = process.argv.includes("--replace");
/** The second, explicit confirmation a production write needs beyond simply omitting --dry-run. */
const CONFIRMED = process.argv.includes("--confirm-production-write");

if (!DRY && !CONFIRMED) {
  console.error(
    "Refusing a production write without --confirm-production-write.\n" +
      "Run with --dry-run first; the real write needs that flag in addition to leaving --dry-run off.",
  );
  process.exit(1);
}

const src = neon(SOURCE);
const dst = neon(TARGET);

/** Same guard `pull:staging` uses — the database's own identity, not the connection string. */
async function identity(sql: typeof src): Promise<string> {
  for (const guc of ["neon.branch_id", "neon.timeline_id"]) {
    try {
      const r = (await sql`select current_setting(${guc}) as v`) as { v: string }[];
      if (r[0]?.v) return `${guc}=${r[0].v}`;
    } catch {
      // Not a Neon endpoint, or the GUC is unavailable — fall through.
    }
  }
  const r = (await sql`
    select system_identifier::text || '/' || current_database() as v from pg_control_system()`) as {
    v: string;
  }[];
  return `cluster=${r[0].v}`;
}

const [srcId, dstId] = await Promise.all([identity(src), identity(dst)]);
if (srcId === dstId) {
  console.error(`Source and target are the same database (${srcId}). Refusing.`);
  process.exit(1);
}

const dstValue = dstId.slice(dstId.indexOf("=") + 1);
if (dstValue !== EXPECTED_BRANCH) {
  console.error(
    `Target is ${dstId}, which is not the ${EXPECTED_BRANCH} you named.\n` +
      "Refusing — this script writes decks under a production user's account.",
  );
  process.exit(1);
}

if (SOURCE_USER === TARGET_USER) {
  console.error("Source and target user ids are identical — that is almost certainly a mistake.");
  process.exit(1);
}

/** Tables copied as-is, keyed on `deck_id`, after the deck rows themselves. */
const BY_DECK_TABLES = [
  "deck_cards",
  "deck_proxies",
  "deck_locks",
  "deck_versions",
  "deck_games",
  "card_assignments",
] as const;

const pool = new Pool({ connectionString: SOURCE });
const client = await pool.connect();
let decks: Record<string, unknown>[] = [];
let folders: Record<string, unknown>[] = [];
const byDeck: Record<string, Record<string, unknown>[]> = {};
let versionCards: Record<string, unknown>[] = [];
let gameAxes: Record<string, unknown>[] = [];
let pullReleasesRaw: Record<string, unknown>[] = [];

try {
  await client.query("begin isolation level repeatable read read only");
  const rows = async (sql: string, params: unknown[] = []) =>
    (await client.query(sql, params)).rows as Record<string, unknown>[];

  decks = await rows("select * from decks where user_id = $1 order by created_at", [SOURCE_USER]);
  if (decks.length === 0) {
    console.error(`No decks on staging for ${SOURCE_USER}. Nothing to copy.`);
    process.exit(1);
  }
  folders = await rows("select * from deck_folders where user_id = $1", [SOURCE_USER]);

  const deckIds = decks.map((d) => d.id as string);
  for (const table of BY_DECK_TABLES) {
    byDeck[table] = await rows(`select * from ${table} where deck_id = any($1)`, [deckIds]);
  }

  const versionIds = (byDeck.deck_versions ?? []).map((v) => v.id as string);
  versionCards =
    versionIds.length === 0
      ? []
      : await rows("select * from deck_version_cards where version_id = any($1)", [versionIds]);

  const gameIds = (byDeck.deck_games ?? []).map((g) => g.id as string);
  gameAxes =
    gameIds.length === 0
      ? []
      : await rows("select * from deck_game_axes where game_id = any($1)", [gameIds]);

  // pull_releases is keyed on TWO deck ids (source and asking), not one — the by-deck helper
  // above filters on a single `deck_id` column, which this table does not have.
  pullReleasesRaw = await rows(
    "select * from pull_releases where source_deck_id = any($1) or asking_deck_id = any($1)",
    [deckIds],
  );

  await client.query("commit");
} finally {
  client.release();
  await pool.end();
}

const deckIdSet = new Set(decks.map((d) => d.id as string));

/**
 * `pull_releases` whose OTHER end — the deck this row's `deck_id` filter could not see — is not
 * among this player's own decks. Reported, and excluded: the referenced deck was never read,
 * so it is never written on the target, and inserting this row would either violate the FK or
 * (worse) succeed by coincidence against an unrelated deck id already on production.
 */
const pullReleases: Record<string, unknown>[] = [];
const orphanReleases: Record<string, unknown>[] = [];
for (const row of pullReleasesRaw) {
  const source = row.source_deck_id as string;
  const asking = row.asking_deck_id as string;
  if (deckIdSet.has(source) && deckIdSet.has(asking)) pullReleases.push(row);
  else orphanReleases.push(row);
}

/**
 * Every `oracle_id` the copied rows touch, so each one can be checked against the TARGET's own
 * catalog before anything is written. There is no `printing_id` anywhere in this domain (see the
 * module header) — every card reference here is this column, under one of these names.
 */
function oracleIdsOf(rows: Record<string, unknown>[], ...cols: string[]): string[] {
  const out: string[] = [];
  for (const row of rows) {
    for (const col of cols) {
      const v = row[col];
      if (typeof v === "string") out.push(v);
      // `decks.notices_legal_seen` is `uuid[]` — the not-legal cards the player last saw in the
      // deck notices (src/db/schema.ts) — and node-postgres returns a uuid[] column as a JS
      // array of strings rather than a single string.
      else if (Array.isArray(v)) for (const item of v) if (typeof item === "string") out.push(item);
    }
  }
  return out;
}
const referencedOracleIds = new Set([
  ...oracleIdsOf(
    decks,
    "commander_oracle_id",
    "partner_oracle_id",
    "answer_card_oracle_id",
    "notices_legal_seen",
  ),
  // A version's own commander/partner, not just the deck's live one — a commander swap is a
  // version boundary like any other (src/db/schema.ts's note on deck_versions), so an older
  // version can name a commander the deck no longer does.
  ...oracleIdsOf(byDeck.deck_versions ?? [], "commander_oracle_id", "partner_oracle_id"),
  ...oracleIdsOf(byDeck.deck_cards ?? [], "oracle_id"),
  ...oracleIdsOf(versionCards, "oracle_id"),
  ...oracleIdsOf(byDeck.deck_proxies ?? [], "oracle_id"),
  ...oracleIdsOf(byDeck.deck_locks ?? [], "oracle_id"),
  ...oracleIdsOf(byDeck.card_assignments ?? [], "oracle_id"),
  ...oracleIdsOf(pullReleases, "oracle_id"),
]);

const presentRows = (await dst.query(`select oracle_id from cards where oracle_id = any($1)`, [
  [...referencedOracleIds],
])) as { oracle_id: string }[];
const present = new Set(presentRows.map((r) => r.oracle_id));
const missingOracleIds = [...referencedOracleIds].filter((id) => !present.has(id));

console.log(`From staging, account ${(SOURCE_USER as string).slice(0, 12)}…`);
for (const [name, rowsIn] of [
  ["decks", decks],
  ["deck_folders", folders],
  ...BY_DECK_TABLES.map((t) => [t, byDeck[t] ?? []] as const),
  ["deck_version_cards", versionCards],
  ["deck_game_axes", gameAxes],
  ["pull_releases", pullReleases],
] as const) {
  console.log(`  ${String((rowsIn as unknown[]).length).padStart(6)}  ${name}`);
}
console.log(
  `\nNot copied (out of scope for this move, by Hugh's instruction): deck_profiles, ` +
    "deck_synopses, deck_version_synopses, deck_suggestion_runs, deck_suggestion_items, " +
    "deck_swaps, collection_items, card_art_preferences, csv_uploads.",
);
console.log(
  "Not copied (named by neither direction in the assignment — flagged rather than guessed): " +
    "deck_unresolved_rows, fill_passes, fill_pass_cards.",
);

if (orphanReleases.length > 0) {
  console.log(
    `\n${orphanReleases.length} pull_releases row(s) reference a deck outside ${SOURCE_USER}'s ` +
      `own decks on staging and will NOT be copied:`,
  );
  for (const r of orphanReleases) {
    console.log(`  source_deck_id=${r.source_deck_id} asking_deck_id=${r.asking_deck_id}`);
  }
}

console.log(
  `\n${referencedOracleIds.size} distinct oracle_id(s) referenced by the copied rows. ` +
    "(No printing_id exists anywhere in this domain — every card reference here is an " +
    "oracle_id, so this is the only such check that applies.)",
);
if (missingOracleIds.length > 0) {
  console.log(
    `${missingOracleIds.length} do NOT exist in production's cards table and would fail a ` +
      "foreign key on write:",
  );
  for (const id of missingOracleIds) console.log(`  ${id}`);
} else {
  console.log("All resolve on production.");
}

// THE TARGET'S OWN STATE, checked here too — not only inside the write transaction below.
// Without this, a dry run that never looks at the target can report "would receive" for an
// invocation that would actually refuse (or hit an id conflict) the moment it is run for real,
// which is exactly backwards for the one report this script's caller is meant to act on. The
// in-transaction check stays as well, to cover a target that changes between this read and the
// real write.
const existingDecksRows = (await dst.query(`select count(*)::int as n from decks where user_id = $1`, [
  TARGET_USER,
])) as { n: number }[];
const existingFoldersRows = (
  await dst.query(`select count(*)::int as n from deck_folders where user_id = $1`, [TARGET_USER])
) as { n: number }[];
const targetDeckCount = existingDecksRows[0].n;
const targetFolderCount = existingFoldersRows[0].n;
console.log(
  `\nOn production, ${TARGET_USER} already holds ${targetDeckCount} deck(s) and ` +
    `${targetFolderCount} folder(s).`,
);
const wouldRefuse = (targetDeckCount > 0 || targetFolderCount > 0) && !REPLACE;
if (wouldRefuse) {
  console.log("The real write would REFUSE as invoked — pass --replace to proceed.");
} else if (targetDeckCount > 0 || targetFolderCount > 0) {
  console.log(`--replace is set — the real write would delete those first.`);
}

/**
 * ID COLLISIONS AGAINST A DIFFERENT OWNER — `--replace` clears what `TARGET_USER` already
 * holds before inserting, so a copied id that exists under THAT user is not a conflict, it is
 * the row about to be deleted and replaced (Copilot round 7: the first version flagged every
 * existing id regardless of owner, which refused a legitimate re-run of this same script).
 * What is still a real, un-clearable conflict is a copied id that exists under a DIFFERENT
 * production user — every copied id is a primary key with no `on conflict do nothing`, so that
 * fails the insert outright no matter what `--replace` says. `deck_versions` has no `user_id` of
 * its own; ownership is its deck's.
 */
const idConflicts: { table: string; ids: string[] }[] = [];
const conflictCheck = async (table: string, ids: string[], ownerSql: string) => {
  if (ids.length === 0) return;
  const rows = (await dst.query(
    `select id from ${table} where id = any($1) and (${ownerSql}) != $2`,
    [ids, TARGET_USER],
  )) as { id: string }[];
  if (rows.length > 0) idConflicts.push({ table, ids: rows.map((r) => r.id) });
};
await conflictCheck("decks", decks.map((d) => d.id as string), "user_id");
await conflictCheck("deck_folders", folders.map((f) => f.id as string), "user_id");
await conflictCheck("deck_games", (byDeck.deck_games ?? []).map((g) => g.id as string), "user_id");
if ((byDeck.deck_versions ?? []).length > 0) {
  const ids = (byDeck.deck_versions ?? []).map((v) => v.id as string);
  const rows = (await dst.query(
    "select dv.id from deck_versions dv join decks d on d.id = dv.deck_id " +
      "where dv.id = any($1) and d.user_id != $2",
    [ids, TARGET_USER],
  )) as { id: string }[];
  if (rows.length > 0) idConflicts.push({ table: "deck_versions", ids: rows.map((r) => r.id) });
}
if (idConflicts.length > 0) {
  console.log(`\nID collision(s) against production under a DIFFERENT owner — no --replace clears these:`);
  for (const { table, ids } of idConflicts) console.log(`  ${table}: ${ids.join(", ")}`);
} else {
  console.log(`\nNo copied id collides with an existing production row under a different owner.`);
}

const refused = wouldRefuse || missingOracleIds.length > 0 || idConflicts.length > 0;
if (DRY) {
  console.log(
    refused
      ? `\nDry run — nothing written. The real write WOULD REFUSE, for the reason(s) reported above.`
      : `\nDry run — nothing written. Target would receive these under ${TARGET_USER} on ${dstId}.`,
  );
  process.exit(0);
}

if (idConflicts.length > 0) {
  console.error(
    "\nRefusing to write: the id(s) above already exist on production under a different " +
      "user and would fail a primary-key constraint partway through the transaction.",
  );
  process.exit(1);
}

if (wouldRefuse) {
  console.error(
    `\n${TARGET_USER} already holds ${targetDeckCount} deck(s) and ${targetFolderCount} ` +
      "folder(s) on production.\nRefusing — pass --replace to delete them and write this " +
      "snapshot in their place.",
  );
  process.exit(1);
}

if (missingOracleIds.length > 0) {
  console.error(
    "\nRefusing to write: the oracle_id(s) above do not exist on the target and the insert " +
      "would fail on a foreign key partway through the transaction.",
  );
  process.exit(1);
}

/** Re-owns every user-scoped row to the target account, leaving every id alone otherwise. */
const reown = (row: Record<string, unknown>) =>
  "user_id" in row ? { ...row, user_id: TARGET_USER } : row;

const CHUNK = 500;
const pool2 = new Pool({ connectionString: TARGET });
const out = await pool2.connect();
try {
  await out.query("begin");

  // CLOSES THE RACE Copilot's round 2 named: the existing-decks read below and the delete after
  // it are two statements, and without a lock a deck the app writes between them (or a second
  // invocation of this script) is invisible to the read, survives the delete, and this commits a
  // MERGE rather than the snapshot it claims to be — exactly the failure `--replace` exists to
  // prevent. `EXCLUSIVE` blocks every other writer to these tables (not readers) for as long as
  // this transaction is open; a bounded `lock_timeout`, not an unbounded wait, so a busy
  // production database aborts this run cleanly instead of this script holding a growing queue
  // of the app's own writes hostage.
  // `lock_timeout` bounds each table's wait SEPARATELY — eleven tables in one `lock table`
  // statement can wait roughly 5s each, up to ~55s total, while holding every lock already
  // acquired and therefore already blocking writers to those tables (Copilot round 4).
  // `statement_timeout` bounds the WHOLE statement instead; `lock_timeout` stays set too, so a
  // single slow table still fails fast rather than consuming the whole budget on one wait.
  await out.query("set local lock_timeout = '5s'");
  await out.query("set local statement_timeout = '5s'");
  await out.query(
    "lock table decks, deck_cards, deck_proxies, deck_locks, deck_versions, " +
      "deck_version_cards, deck_games, deck_game_axes, deck_folders, card_assignments, " +
      "pull_releases in exclusive mode",
  );
  // RAISED, not cleared, once the locks are held (Copilot round 5: an unbounded statement
  // timeout here means any slow query, stalled client or commit delay blocks every user's deck
  // writes indefinitely, for as long as this transaction holds its EXCLUSIVE locks). 180s is
  // generous for ~6,400 rows of staging deck data batched 500 to a statement; a per-statement
  // idle gap this large would itself be the thing to investigate, not wait out. A session
  // timeout backs it up in case the CLIENT, not a query, stalls — a dropped connection or a
  // debugger pause would otherwise hold the locks with no query running for `lock_timeout` or
  // `statement_timeout` to catch.
  await out.query("set local statement_timeout = '180s'");
  await out.query("set local idle_in_transaction_session_timeout = '30s'");

  const insert = async (table: string, rowsIn: Record<string, unknown>[]) => {
    if (rowsIn.length === 0) return;
    const cols = Object.keys(rowsIn[0]);
    const quoted = cols.map((c) => `"${c}"`).join(", ");
    for (let i = 0; i < rowsIn.length; i += CHUNK) {
      const slice = rowsIn.slice(i, i + CHUNK).map(reown);
      const values: unknown[] = [];
      const tuples = slice.map((row) => {
        const placeholders = cols.map((c) => {
          values.push(row[c]);
          return `$${values.length}`;
        });
        return `(${placeholders.join(", ")})`;
      });
      await out.query(`insert into ${table} (${quoted}) values ${tuples.join(", ")}`, values);
    }
  };

  // Both counts, not decks alone — `pull-staging-decks.mts` learned this the hard way:
  // gating on the deck count left an earlier run's folders standing when a later run had zero
  // decks but still held folder rows, and they then insert alongside this run's forever.
  const existing = (
    await out.query("select id from decks where user_id = $1", [TARGET_USER])
  ).rows as { id: string }[];
  const existingFolders = (
    await out.query("select count(*)::int as n from deck_folders where user_id = $1", [
      TARGET_USER,
    ])
  ).rows as { n: number }[];
  const folderCount = existingFolders[0].n;
  if ((existing.length > 0 || folderCount > 0) && !REPLACE) {
    await out.query("rollback");
    console.error(
      `${TARGET_USER} already holds ${existing.length} deck(s) and ${folderCount} folder(s) ` +
        "on production.\nRefusing — pass --replace to delete them and write this snapshot in " +
        "their place.",
    );
    process.exit(1);
  }
  if (existing.length > 0) {
    const ids = existing.map((d) => d.id);
    await out.query("delete from card_assignments where deck_id = any($1)", [ids]);
    await out.query("delete from decks where id = any($1)", [ids]);
  }
  // Cleared unconditionally once past the gate above: either the target held none (no-op) or
  // --replace was given, and a condition here is what let orphaned rows survive in the first
  // place.
  await out.query("delete from deck_folders where user_id = $1", [TARGET_USER]);

  // Order matters: folders before decks (a deck references a folder), decks before their rows,
  // versions before version cards, games before axes.
  await insert("deck_folders", folders);
  await insert("decks", decks);
  await insert("deck_cards", byDeck.deck_cards ?? []);
  await insert("deck_proxies", byDeck.deck_proxies ?? []);
  await insert("deck_locks", byDeck.deck_locks ?? []);
  await insert("deck_versions", byDeck.deck_versions ?? []);
  await insert("deck_version_cards", versionCards);
  await insert("deck_games", byDeck.deck_games ?? []);
  await insert("deck_game_axes", gameAxes);
  await insert("card_assignments", byDeck.card_assignments ?? []);
  await insert("pull_releases", pullReleases);

  const landed = (
    await out.query("select count(*)::int as n from decks where user_id = $1", [TARGET_USER])
  ).rows as { n: number }[];
  await out.query("commit");
  console.log(`Done. ${landed[0].n} deck(s) now under ${TARGET_USER} on production.`);
} catch (error) {
  await out.query("rollback").catch(() => {});
  console.error("\nThe target write failed and was rolled back — production holds what it held before.");
  throw error;
} finally {
  out.release();
  await pool2.end();
}
