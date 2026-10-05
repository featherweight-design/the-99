/**
 * Copy `fill_passes` / `fill_pass_cards` from STAGING to PRODUCTION, for decks already copied
 * there by `copy:staging-decks`.
 *
 * WHY. That earlier copy deliberately left the fill-pass ledger behind — the cards it describes
 * and their `auto` flag are on `deck_cards`, which WAS copied, so nothing about Keep/sweep broke,
 * but the ledger's "why is this card here" sentence (seed fill vs. top-off, `openSlots` at the
 * time) went blank for every auto-added card on those decks. Hugh asked for it back.
 *
 * SIBLING, NOT AN EXTENSION, of `copy-staging-decks-to-prod.mts`. The shape here is different
 * enough that bolting it on as a mode would cost more clarity than it saves: this script never
 * re-owns a row (`fill_passes`/`fill_pass_cards` carry no `user_id` — ownership is their deck's),
 * it writes onto decks that already exist with the SAME ids on both sides (the earlier copy kept
 * them), and it REFUSES outright rather than offering `--replace` — there is no legitimate reason
 * for a deck already copied here to hold fill rows already, and a second run against the same
 * decks is a mistake to catch, not a replace to perform.
 *
 * SAME FAIL-CLOSED RULES, extended to this shape:
 *
 *   - Source and target are separate variables; the source is opened READ ONLY. The target is
 *     never defaulted, and the caller must NAME its branch — checked against what the target
 *     actually reports before anything is read for real or written.
 *   - EVERY DECK THIS WOULD ATTACH TO must already exist on the target under
 *     `DECK_COPY_TARGET_USER_ID` — this script does not create decks, and a deck id staging
 *     has that production does not means the earlier copy was incomplete or targeted a
 *     different account than this one.
 *   - A REFUSAL, not an option, if any of those decks already holds a `fill_passes` row on the
 *     target — there is no `--replace` here, because a prior fill-history copy onto these decks
 *     is a mistake to surface, not a state to overwrite.
 *   - Every `oracle_id` `fill_pass_cards` references is checked against the target's own `cards`
 *     table before anything is written, exactly as the deck copy does.
 *   - BOUND TO AN ACTUAL SNAPSHOT CUTOFF, `DECK_COPY_SNAPSHOT_AT` — never defaulted, same as
 *     every other named parameter here. A first version tried to infer a pass's age from
 *     whether its cards were still in the target deck's `deck_cards`, which was wrong in both
 *     directions: a card the player CUT before the deck copy even ran is legitimately absent on
 *     both sides (`summariseFillPasses` already renders that as ordinary history, `removed`,
 *     whether copied or not — not a sign of anything newer), and a card cut-then-re-added or
 *     added-then-cut can make a genuinely newer pass look old, or a genuinely old one look new,
 *     independent of that pass's actual age. `fill_passes.created_at` against an operator-named
 *     cutoff is the only thing that actually answers "did this pass exist when the deck copy
 *     ran" — a pass created after it is excluded and reported, never silently dropped. The
 *     cutoff must be AT OR BEFORE the deck copy's source read began (Copilot round 7) — not
 *     when its write finished, which is a later moment a pass could sneak in before. The safe
 *     value is when the OPERATOR LAUNCHED `copy:staging-decks`, necessarily at or before its
 *     own source transaction opened; an explicit UTC offset is required, since a bare
 *     local-looking string parses ambiguously and this value gates a production write.
 *   - Every copied `fill_passes.id` is checked for a collision against the WHOLE target table
 *     (not only these decks) before anything is written — ids are UUIDs so this should never
 *     fire, but the earlier script's review found real value in not assuming that.
 *   - ONE TARGET TRANSACTION: an EXCLUSIVE lock on `decks` and both fill-history tables, parent
 *     before children (a fill-pass write takes the deck row lock first, then a key-share lock
 *     on it for the FK — locking the children first here would deadlock against that), bounded
 *     by `lock_timeout` AND `statement_timeout` (the first script's two rounds of fixing this,
 *     applied here from the start rather than re-discovered), then a generous-but-bounded
 *     timeout for the write itself plus an `idle_in_transaction_session_timeout` backstop for a
 *     stalled client. No
 *     `on conflict do nothing` — a conflict means a row already exists and skipping it would
 *     silently fail to say so.
 *   - `timestamp` columns (`fill_passes.created_at`) are read and written as raw strings, never
 *     as a parsed `Date`, for the same reason the deck copy does this: node-postgres parses a
 *     naive timestamp as LOCAL time and re-serializes a `Date` in UTC, which would shift the
 *     value by the operator's offset.
 *   - `--dry-run` reads everything, including the live target, and writes nothing. The real
 *     write needs `--confirm-production-write` in addition to leaving `--dry-run` off.
 *
 *   THE_99_NEON_STAGING_DIRECT=<staging> \
 *   DECK_COPY_TARGET_URL=<production> DECK_COPY_TARGET_BRANCH=br-… \
 *   DECK_COPY_SOURCE_USER_ID=<staging user> DECK_COPY_TARGET_USER_ID=<production user> \
 *   DECK_COPY_SNAPSHOT_AT=<ISO-8601 with a "Z"/offset — when you LAUNCHED copy:staging-decks> \
 *   pnpm copy:staging-fill-history --dry-run
 *
 *   …same, plus --confirm-production-write   # only once Hugh's go has been relayed
 */
import { neon, neonConfig, Pool, types } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;

// See copy-staging-decks-to-prod.mts's header: `timestamp without time zone` must never be
// parsed into a JS Date, or it is re-serialized in UTC after being read as local time.
types.setTypeParser(1114, (v: string) => v);

const {
  THE_99_NEON_STAGING_DIRECT: SOURCE,
  DECK_COPY_TARGET_URL: TARGET,
  DECK_COPY_TARGET_BRANCH: EXPECTED_BRANCH,
  DECK_COPY_SOURCE_USER_ID: SOURCE_USER,
  DECK_COPY_TARGET_USER_ID: TARGET_USER,
  // The authoritative bound Copilot round 6 asked for: current deck_cards membership can't
  // reliably tell a pass's age (a card can be cut-then-readded, or added-then-cut, independent
  // of any one pass), so a pass is accepted on an actual cutoff rather than inferred from
  // membership. NEVER defaulted, same as every other named parameter here.
  //
  // THIS MUST BE AT OR BEFORE copy-staging-decks-to-prod.mts's SOURCE READ BEGAN, not when that
  // script's write finished (Copilot round 7) — those are different moments, and a fill pass
  // committed on staging in between the two would pass a "when the write finished" cutoff while
  // describing cards the copied snapshot never actually held. That script does not log its own
  // snapshot instant, so the safe, always-correct value is the moment the OPERATOR LAUNCHED
  // copy:staging-decks — necessarily at or before its source transaction opened. Earlier is
  // always safe here; later than the true snapshot moment is the only mistake that matters.
  DECK_COPY_SNAPSHOT_AT: SNAPSHOT_AT_RAW,
} = requireEnv([
  "THE_99_NEON_STAGING_DIRECT",
  "DECK_COPY_TARGET_URL",
  "DECK_COPY_TARGET_BRANCH",
  "DECK_COPY_SOURCE_USER_ID",
  "DECK_COPY_TARGET_USER_ID",
  "DECK_COPY_SNAPSHOT_AT",
]);
// An explicit offset is required (Copilot round 7) — a bare "2026-10-05 09:00:00" is ambiguous
// between engines (some read it as local time, some as UTC), and this value gates a production
// write. "Z" or "+HH:MM"/"-HH:MM" only.
if (!/Z$|[+-]\d{2}:\d{2}$/.test(SNAPSHOT_AT_RAW)) {
  console.error(
    `DECK_COPY_SNAPSHOT_AT (${SNAPSHOT_AT_RAW}) has no explicit UTC offset. Use an ISO-8601 ` +
      'timestamp ending in "Z" (or an explicit "+HH:MM"/"-HH:MM") — never a bare local-looking ' +
      "string, which parses ambiguously.",
  );
  process.exit(1);
}
const SNAPSHOT_AT = new Date(SNAPSHOT_AT_RAW);
if (Number.isNaN(SNAPSHOT_AT.getTime())) {
  console.error(`DECK_COPY_SNAPSHOT_AT (${SNAPSHOT_AT_RAW}) is not a valid date.`);
  process.exit(1);
}

const DRY = process.argv.includes("--dry-run");
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
      "Refusing — this script writes fill-history rows under a production account.",
  );
  process.exit(1);
}

if (SOURCE_USER === TARGET_USER) {
  console.error("Source and target user ids are identical — that is almost certainly a mistake.");
  process.exit(1);
}

/** Reads a `timestamp` column (OID 1114, returned as a raw string by the parser override
 *  above) as the UTC instant it names, without ever constructing a JS `Date` that could be
 *  mis-parsed as local time. */
function parseNaiveUtc(raw: string): number {
  return Date.parse(`${raw.replace(" ", "T")}Z`);
}

const pool = new Pool({ connectionString: SOURCE });
const client = await pool.connect();
let fillPasses: Record<string, unknown>[] = [];
let fillPassCards: Record<string, unknown>[] = [];
let deckIds: string[] = [];
let excludedNewerThanSnapshot = 0;

try {
  await client.query("begin isolation level repeatable read read only");
  const rows = async (sql: string, params: unknown[] = []) =>
    (await client.query(sql, params)).rows as Record<string, unknown>[];

  const decks = await rows("select id from decks where user_id = $1", [SOURCE_USER]);
  if (decks.length === 0) {
    console.error(`No decks on staging for ${SOURCE_USER}. Nothing to copy fill history for.`);
    process.exit(1);
  }
  const allDeckIds = decks.map((d) => d.id as string);

  const allPasses = await rows("select * from fill_passes where deck_id = any($1)", [allDeckIds]);
  // ONLY passes that predate the deck-copy snapshot (Copilot round 6): current deck_cards
  // membership cannot reliably tell a pass's age — the same card can be cut then re-added, or
  // added then cut, independent of any one pass — so age is decided on `created_at` against
  // the operator-supplied cutoff instead of inferred from membership. A pass newer than the
  // snapshot is excluded, reported, never silently dropped.
  fillPasses = allPasses.filter((p) => parseNaiveUtc(p.created_at as string) <= SNAPSHOT_AT.getTime());
  excludedNewerThanSnapshot = allPasses.length - fillPasses.length;

  // ONLY the decks a copied pass actually names (Copilot round 2) — `allDeckIds` is every deck
  // this user owns on staging, and a deck created after the original deck copy (even one with
  // no fill history at all) would otherwise make this refuse on "missing on production" for a
  // deck this script has no reason to touch, and the report would claim passes span decks that
  // hold none.
  deckIds = [...new Set(fillPasses.map((p) => p.deck_id as string))];
  const passIds = fillPasses.map((p) => p.id as string);
  fillPassCards =
    passIds.length === 0
      ? []
      : await rows("select * from fill_pass_cards where pass_id = any($1)", [passIds]);

  await client.query("commit");
} finally {
  client.release();
  await pool.end();
}

if (fillPasses.length === 0) {
  console.error(
    excludedNewerThanSnapshot > 0
      ? `Every fill_passes row for ${SOURCE_USER}'s decks is newer than DECK_COPY_SNAPSHOT_AT ` +
          `(${excludedNewerThanSnapshot} excluded). Nothing to copy.`
      : `No fill_passes on staging for ${SOURCE_USER}'s decks. Nothing to copy.`,
  );
  process.exit(1);
}
if (excludedNewerThanSnapshot > 0) {
  console.log(
    `${excludedNewerThanSnapshot} fill_passes row(s) created after DECK_COPY_SNAPSHOT_AT were ` +
      "excluded — newer than the snapshot this history is being attached to.",
  );
}

// EVERY DECK THIS ATTACHES TO must already exist on the target under TARGET_USER — this script
// writes onto decks the earlier copy created, it does not create them itself.
const targetDeckRows = (await dst.query(
  "select id from decks where id = any($1) and user_id = $2",
  [deckIds, TARGET_USER],
)) as { id: string }[];
const targetDeckIds = new Set(targetDeckRows.map((r) => r.id));
const missingDecks = deckIds.filter((id) => !targetDeckIds.has(id));
console.log(`From staging, ${fillPasses.length} fill_passes / ${fillPassCards.length} fill_pass_cards`);
console.log(`across ${deckIds.length} deck(s) for ${SOURCE_USER}.`);
if (missingDecks.length > 0) {
  console.log(
    `\n${missingDecks.length} of those deck(s) do NOT exist on production under ${TARGET_USER}:`,
  );
  for (const id of missingDecks) console.log(`  ${id}`);
}

// A REFUSAL, not --replace: a fill_passes row already on one of these decks is a mistake to
// surface (a second run against the same decks), not a state this script should overwrite.
const alreadyHasRows = (await dst.query(
  "select deck_id, count(*)::int as n from fill_passes where deck_id = any($1) group by deck_id",
  [deckIds],
)) as { deck_id: string; n: number }[];
if (alreadyHasRows.length > 0) {
  console.log(`\n${alreadyHasRows.length} of these deck(s) already hold fill_passes on production:`);
  for (const r of alreadyHasRows) console.log(`  ${r.deck_id}: ${r.n} row(s)`);
}

const referencedOracleIds = new Set(
  fillPassCards.map((c) => c.oracle_id as string).filter((v) => typeof v === "string"),
);
const presentRows = (await dst.query(`select oracle_id from cards where oracle_id = any($1)`, [
  [...referencedOracleIds],
])) as { oracle_id: string }[];
const present = new Set(presentRows.map((r) => r.oracle_id));
const missingOracleIds = [...referencedOracleIds].filter((id) => !present.has(id));
console.log(
  `\n${referencedOracleIds.size} distinct oracle_id(s) referenced by fill_pass_cards.`,
);
if (missingOracleIds.length > 0) {
  console.log(`${missingOracleIds.length} do NOT exist in production's cards table:`);
  for (const id of missingOracleIds) console.log(`  ${id}`);
} else {
  console.log("All resolve on production.");
}


// ID COLLISION, whole table — see copy-staging-decks-to-prod.mts's note on why this is checked
// against every row rather than assumed impossible for a UUID primary key.
const passIds = fillPasses.map((p) => p.id as string);
const idConflictRows = (await dst.query(`select id from fill_passes where id = any($1)`, [
  passIds,
])) as { id: string }[];
if (idConflictRows.length > 0) {
  console.log(`\n${idConflictRows.length} fill_passes id(s) already exist on production:`);
  for (const r of idConflictRows) console.log(`  ${r.id}`);
} else {
  console.log(`\nNo copied fill_passes id collides with an existing production row.`);
}

const refused =
  missingDecks.length > 0 ||
  alreadyHasRows.length > 0 ||
  missingOracleIds.length > 0 ||
  idConflictRows.length > 0;

if (DRY) {
  console.log(
    refused
      ? `\nDry run — nothing written. The real write WOULD REFUSE, for the reason(s) reported above.`
      : `\nDry run — nothing written. Target would receive these on ${dstId}.`,
  );
  process.exit(0);
}

if (missingDecks.length > 0) {
  console.error(
    `\nRefusing to write: ${missingDecks.length} deck(s) above do not exist on production under ` +
      `${TARGET_USER}.`,
  );
  process.exit(1);
}
if (alreadyHasRows.length > 0) {
  console.error(
    `\nRefusing to write: ${alreadyHasRows.length} deck(s) above already hold fill_passes on ` +
      "production. This script does not merge or replace — remove them first if a re-run is " +
      "truly intended.",
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
if (idConflictRows.length > 0) {
  console.error(
    "\nRefusing to write: the id(s) above already exist on production and would fail a " +
      "primary-key constraint partway through the transaction.",
  );
  process.exit(1);
}

const CHUNK = 500;
const pool2 = new Pool({ connectionString: TARGET });
const out = await pool2.connect();
try {
  await out.query("begin");

  // Same bounded-lock shape copy-staging-decks-to-prod.mts needed two review rounds to reach —
  // applied here from the start. EXCLUSIVE blocks other writers to these tables only, for as
  // long as this transaction is open.
  //
  // `decks` locked FIRST, parent before children (Copilot round 1): `recordFillPass` is called
  // under its caller's deck row lock and then inserts into `fill_passes` — which takes a
  // key-share lock on that deck row for the FK — so a transaction that locked the child tables
  // first and then needed the deck row would deadlock against one that already held the deck
  // row and was waiting on `fill_passes`. Locking in the same order every writer does removes
  // the cycle rather than racing it.
  // `idle_in_transaction_session_timeout` is set BEFORE the lock is taken (Copilot round 2): a
  // client/network stall between the LOCK TABLE response and a SET statement setting it
  // afterwards would leave the session idle while already holding every lock, indefinitely —
  // exactly the failure this backstop exists to bound.
  await out.query("set local idle_in_transaction_session_timeout = '30s'");
  await out.query("set local lock_timeout = '5s'");
  await out.query("set local statement_timeout = '5s'");
  await out.query("lock table decks, fill_passes, fill_pass_cards in exclusive mode");
  await out.query("set local statement_timeout = '60s'");

  const insert = async (table: string, rowsIn: Record<string, unknown>[]) => {
    if (rowsIn.length === 0) return;
    const cols = Object.keys(rowsIn[0]);
    const quoted = cols.map((c) => `"${c}"`).join(", ");
    for (let i = 0; i < rowsIn.length; i += CHUNK) {
      const slice = rowsIn.slice(i, i + CHUNK);
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

  // Re-check under the lock: a row written between the preflight above and this transaction
  // opening would otherwise be missed.
  const racing = (
    await out.query("select 1 from fill_passes where deck_id = any($1) limit 1", [deckIds])
  ).rows as unknown[];
  if (racing.length > 0) {
    await out.query("rollback");
    console.error(
      "\nA fill_passes row for one of these decks appeared on production since the preflight " +
        "ran. Refusing.",
    );
    process.exit(1);
  }

  // OWNERSHIP, re-checked under the SAME lock (Copilot round 3) — the preflight's "every deck
  // exists under TARGET_USER" check runs before this transaction opens, so a deck re-owned (or
  // deleted) in that window would otherwise insert fill history for it anyway: the FK on
  // fill_passes.deck_id validates only that the deck id exists, not who owns it now.
  const stillOwned = (
    await out.query("select id from decks where id = any($1) and user_id = $2", [
      deckIds,
      TARGET_USER,
    ])
  ).rows as { id: string }[];
  if (stillOwned.length !== deckIds.length) {
    await out.query("rollback");
    console.error(
      `\n${deckIds.length - stillOwned.length} of these deck(s) no longer belong to ` +
        `${TARGET_USER} on production (re-owned or deleted since the preflight ran). Refusing.`,
    );
    process.exit(1);
  }

  await insert("fill_passes", fillPasses);
  await insert("fill_pass_cards", fillPassCards);

  const landed = (
    await out.query("select count(*)::int as n from fill_passes where deck_id = any($1)", [
      deckIds,
    ])
  ).rows as { n: number }[];
  await out.query("commit");
  console.log(`Done. ${landed[0].n} fill_passes row(s) now on production for these decks.`);
} catch (error) {
  await out.query("rollback").catch(() => {});
  console.error("\nThe target write failed and was rolled back — production holds what it held before.");
  throw error;
} finally {
  out.release();
  await pool2.end();
}
