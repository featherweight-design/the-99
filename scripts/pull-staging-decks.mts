/**
 * Copy a player's real decks and collection from STAGING into a local database.
 *
 * WHY. Every browser probe here needs a signed-in account, and no agent can sign in as Hugh —
 * so verification has been running against local-dev fixtures: decks nobody plays, built by
 * scripts that never buy, never commit and never finish. That is how the card mark shipped
 * drawing nothing in the deck's card view. His real 99s are the bar, and the DATA is what makes
 * them the bar: the long names, the contested copies, the decks with three Game Changers and
 * the decks with none. Only the Clerk identity changes, and nothing here reads it — every
 * surface reads by `user_id`.
 *
 * ONE WAY, AND IT REFUSES TO GO THE OTHER. Source and target are separate variables, the
 * source is opened read-only, and a run whose two URLs name the same database exits before
 * writing anything. `probe:arrivals` alone would delete every collection row for the user it is
 * given, so the direction of this script is a safety property rather than a convention.
 *
 * A SNAPSHOT, and it says so. Decks move; a copy taken today answers for today. Re-run before
 * a measurement that matters.
 *
 * Both variables are required, and so is naming the branch the target is expected to be —
 * there is no default for any of them, because a default is how a one-way copy finds the
 * wrong end.
 *
 *   PULL_TARGET_URL=<local-dev> PULL_TARGET_BRANCH=br-… pnpm pull:staging --dry-run
 *   PULL_TARGET_URL=<local-dev> PULL_TARGET_BRANCH=br-… pnpm pull:staging
 *   …same, plus --replace   # only when the target account already holds rows
 *
 * The source is `THE_99_NEON_STAGING_DIRECT`. The target must be named explicitly — there is no
 * `?? DATABASE_URL` fallback, because a fallback is how a one-way script finds the wrong end.
 */
import "dotenv/config";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

// `Pool` speaks WebSocket, and Node has no global one — every other Pool caller here does this
// (`src/db/index.ts`, `scripts/probe-folders.ts`). Without it the source read fails before its
// first query.
neonConfig.webSocketConstructor = ws;

const SOURCE = process.env.THE_99_NEON_STAGING_DIRECT;
const TARGET = process.env.PULL_TARGET_URL;
const DRY = process.argv.includes("--dry-run");
/**
 * REPLACING IS OPT-IN, and that is a scope decision rather than another guard.
 *
 * Three review rounds ran on this file and every finding was about the same surface: the
 * delete. Patching it a fourth time would be treating a design as a bug, so the destructive
 * path stops being the default. A run whose target account already holds decks REFUSES, and
 * `--replace` is how a caller says they meant it. The common case — a fresh fixture account —
 * now has no destructive path at all.
 */
const REPLACE = process.argv.includes("--replace");
/** The local user the copy lands under. Defaults to the fixture account the probes sign in as. */
const AS_USER = process.env.PULL_AS_USER_ID ?? "user_3HdjdocERCjunk0zJQFDWyHkTd4";

if (!SOURCE || !TARGET) {
  console.error(
    "Set THE_99_NEON_STAGING_DIRECT (source, read-only) and PULL_TARGET_URL (target).\n" +
      "The target is never defaulted: a one-way copy must not be able to guess its own destination.",
  );
  process.exit(1);
}
const src = neon(SOURCE);
const dst = neon(TARGET);

/**
 * THE GUARD COMPARES THE DATABASE, NOT THE STRING.
 *
 * Comparing the two URLs byte for byte rejects only the obvious mistake. One database answers
 * to many connection strings — pooled and direct endpoints, different options, a password
 * rotated — so a string check can pass and the run then replaces rows in its own SOURCE.
 *
 * `neon.branch_id` is the identity that matters here, and the reason is specific: local-dev is
 * a BRANCH of the same Neon project as staging, so `pg_control_system().system_identifier` is
 * byte-identical on both (measured: 7664017488641913815 either side) and would wave the run
 * through. The branch id differs, and `neon.timeline_id` behind it.
 */
async function identity(sql: typeof src): Promise<string> {
  for (const guc of ["neon.branch_id", "neon.timeline_id"]) {
    try {
      const r = (await sql`select current_setting(${guc}) as v`) as { v: string }[];
      if (r[0]?.v) return `${guc}=${r[0].v}`;
    } catch {
      // Not a Neon endpoint, or the GUC is unavailable — fall through.
    }
  }
  // Last resort for a plain Postgres: the cluster plus the database name.
  const r = (await sql`
    select system_identifier::text || '/' || current_database() as v from pg_control_system()`) as {
    v: string;
  }[];
  return `cluster=${r[0].v}`;
}

const [srcId, dstId] = await Promise.all([identity(src), identity(dst)]);
if (srcId === dstId) {
  console.error(
    `Source and target are the same database (${srcId}).\n` +
      "Refusing — this script only ever writes to the target.",
  );
  process.exit(1);
}

/**
 * FAIL CLOSED ON THE TARGET, because "not the source" is not the same as "safe to delete from".
 *
 * The block below deletes a user's decks and collection outright, so a mistyped or pasted URL
 * that happens to name some OTHER database passes a difference check and destroys whatever it
 * found. The caller therefore has to NAME the database it means, and the name is checked against
 * what the target actually reports: a typo in the URL no longer matches the stated branch, and
 * the run stops before any write.
 */
const EXPECTED = process.env.PULL_TARGET_BRANCH;
if (!EXPECTED) {
  console.error(
    `Set PULL_TARGET_BRANCH to the branch this target is expected to be.\n` +
      `The target currently reports: ${dstId}\n` +
      "It is checked before anything is deleted, so a mistyped URL fails closed.",
  );
  process.exit(1);
}
// EQUALITY, not a suffix. `endsWith` accepts any branch whose id merely ENDS with what was
// named — a different database one character longer passes, and the deletes then run against
// it. `identity()` returns `"<guc>=<value>"`, so the value is compared on its own.
const dstValue = dstId.slice(dstId.indexOf("=") + 1);
if (dstValue !== EXPECTED) {
  console.error(
    `Target is ${dstId}, which is not the ${EXPECTED} you named.\n` +
      "Refusing — this script deletes the target user's decks and collection.",
  );
  process.exit(1);
}

/**
 * EVERY SOURCE READ IN ONE `repeatable read` TRANSACTION.
 *
 * The reads are dependent — decks, then their cards, then their versions, then those versions'
 * cards — so assembled independently they can combine different instants: a deck committed
 * between the deck read and the version read lands with a version its snapshot never had. The
 * result is a target state that never existed on staging, under a script whose whole claim is
 * that it is a snapshot of one.
 *
 * A `Pool` client rather than the http driver, because dependent statements have to share a
 * connection to share a transaction. `loadProfileHead` takes the same isolation for the same
 * reason, one deck at a time.
 */
const pool = new Pool({ connectionString: SOURCE });
const client = await pool.connect();
let owner: string | undefined;
let decks: Record<string, unknown>[] = [];
let collection: Record<string, unknown>[] = [];
let folders: Record<string, unknown>[] = [];
let cards: Record<string, unknown>[] = [];
let proxies: Record<string, unknown>[] = [];
let locks: Record<string, unknown>[] = [];
let releases: Record<string, unknown>[] = [];
let versions: Record<string, unknown>[] = [];
let versionCards: Record<string, unknown>[] = [];
let games: Record<string, unknown>[] = [];
let gameAxes: Record<string, unknown>[] = [];
let assignments: Record<string, unknown>[] = [];
let fillPasses: Record<string, unknown>[] = [];
let fillPassCards: Record<string, unknown>[] = [];
let unresolved: Record<string, unknown>[] = [];
let artPrefs: Record<string, unknown>[] = [];
let uploads: Record<string, unknown>[] = [];

try {
  await client.query("begin isolation level repeatable read read only");
  const rows = async (sql: string, params: unknown[] = []) =>
    (await client.query(sql, params)).rows as Record<string, unknown>[];

  // WHOSE DECKS. Named, or inferred only when there is NOTHING TO INFER BETWEEN.
  //
  // Picking "the account with the most decks" is a silent choice on a shared database, and
  // ties are decided by whatever order the planner returns — so it could copy a second
  // player's private collection into the target without ever saying whose it was.
  const owners = (await rows(
    "select user_id, count(*)::int as n from decks group by 1 order by n desc",
  )) as { user_id: string; n: number }[];
  const named = process.env.PULL_FROM_USER_ID;
  if (named) {
    owner = named;
  } else if (owners.length === 1) {
    owner = owners[0].user_id;
  } else {
    console.error(
      owners.length === 0
        ? "No decks on the source to copy."
        : `The source holds decks for ${owners.length} accounts. Name one with ` +
          `PULL_FROM_USER_ID — this script will not choose between players.`,
    );
    process.exit(1);
  }
  // A NAMED ACCOUNT THAT DOES NOT EXIST is truthy, and every read below then comes back empty —
  // so the run would delete the target's snapshot and report "Done. 0 deck(s)" as a success.
  if (!owners.some((o) => o.user_id === owner)) {
    console.error(`No decks on the source for ${owner}. Refusing before any target write.`);
    process.exit(1);
  }

  decks = await rows("select * from decks where user_id = $1 order by created_at", [owner]);
  collection = await rows("select * from collection_items where user_id = $1", [owner]);
  folders = await rows("select * from deck_folders where user_id = $1", [owner]);
  uploads = await rows("select * from csv_uploads where user_id = $1", [owner]);
  artPrefs = await rows("select * from card_art_preferences where user_id = $1", [owner]);

  const deckIds = decks.map((d) => d.id as string);
  const byDeck = async (table: string) =>
    deckIds.length === 0 ? [] : rows(`select * from ${table} where deck_id = any($1)`, [deckIds]);

  cards = await byDeck("deck_cards");
  proxies = await byDeck("deck_proxies");
  // Locks and pull releases change what the claim model answers (a locked card is never offered
  // to Pull it; a release subtracts a pulled copy from its source's claim), so a snapshot without
  // them measures a different account. Every row of both belongs to this owner's decks.
  locks = await byDeck("deck_locks");
  releases = await rows("select * from pull_releases where user_id = $1", [owner]);
  versions = await byDeck("deck_versions");
  games = await byDeck("deck_games");
  assignments = await byDeck("card_assignments");
  fillPasses = await byDeck("fill_passes");
  unresolved = await byDeck("deck_unresolved_rows");

  const versionIds = versions.map((v) => v.id as string);
  versionCards =
    versionIds.length === 0
      ? []
      : await rows("select * from deck_version_cards where version_id = any($1)", [versionIds]);
  const gameIds = games.map((g) => g.id as string);
  gameAxes =
    gameIds.length === 0
      ? []
      : await rows("select * from deck_game_axes where game_id = any($1)", [gameIds]);
  const passIds = fillPasses.map((f) => f.id as string);
  fillPassCards =
    passIds.length === 0
      ? []
      : await rows("select * from fill_pass_cards where pass_id = any($1)", [passIds]);

  await client.query("commit");
} finally {
  client.release();
  await pool.end();
}

console.log(`From staging, account ${owner.slice(0, 12)}…`);
for (const [name, rows] of [
  ["decks", decks], ["deck_cards", cards], ["deck_versions", versions],
  ["deck_version_cards", versionCards], ["deck_games", games], ["deck_game_axes", gameAxes],
  ["deck_proxies", proxies], ["deck_locks", locks], ["pull_releases", releases],
  ["deck_folders", folders], ["card_assignments", assignments],
  ["fill_passes", fillPasses], ["fill_pass_cards", fillPassCards],
  ["deck_unresolved_rows", unresolved], ["collection_items", collection],
  ["card_art_preferences", artPrefs], ["csv_uploads", uploads],
] as const) {
  console.log(`  ${String(rows.length).padStart(6)}  ${name}`);
}

if (DRY) {
  console.log(`\nDry run — nothing written. Target would receive these under ${AS_USER}.`);
  process.exit(0);
}

/** Re-owns every user-scoped row to the local account, leaving deck ids alone. */
const reown = (row: Record<string, unknown>) =>
  "user_id" in row ? { ...row, user_id: AS_USER } : row;

/**
 * THE WHOLE TARGET WRITE IS ONE TRANSACTION.
 *
 * The delete and the inserts were separate autocommit requests, so an insert failing part way
 * left the old snapshot already deleted and a PREFIX of the new one in its place — a deck list
 * that never existed on staging, under a script whose claim is that it is a snapshot of one.
 * Now it is begin / delete / insert / commit, and a failure rolls the target back to what it
 * had.
 *
 * BATCHED, because a row at a time is not a copy of this size: the first version issued one
 * INSERT per row over ~6,400 rows and did not finish inside two minutes. The cost is round
 * trips, so 500 rows to a statement puts each table within a handful.
 *
 * NO `on conflict do nothing`. A conflict means the target already holds that id — most likely
 * under a DIFFERENT user — and skipping the parent silently would attach this snapshot's child
 * rows to that stranger's deck. It is an error, and it should be seen.
 */
const CHUNK = 500;

const pool2 = new Pool({ connectionString: TARGET });
const out = await pool2.connect();
try {
  await out.query("begin");

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

  // The target's existing rows for this user go first, so a re-run is a REPLACE rather than a
  // merge — a merge leaves decks from an older snapshot standing beside the new ones and
  // quietly makes the fixture a thing that never existed on staging.
  // WHAT THE TARGET ALREADY HOLDS — every user-scoped table, not just decks.
  //
  // Gating on the deck count alone left the collection, folders, preferences and upload
  // receipts of an earlier fixture in place whenever that fixture had no decks, and this
  // snapshot then MERGED with them — the exact state the refusal exists to prevent, in the
  // branch its own comment described.
  const existing = (await out.query("select id from decks where user_id = $1", [AS_USER]))
    .rows as { id: string }[];
  const USER_TABLES = [
    "collection_items",
    "deck_folders",
    "card_art_preferences",
    "csv_uploads",
    "pull_releases",
  ] as const;
  let otherRows = 0;
  for (const t of USER_TABLES) {
    otherRows += Number(
      ((await out.query(`select count(*)::int as n from ${t} where user_id = $1`, [AS_USER]))
        .rows as { n: number }[])[0].n,
    );
  }
  const holds = existing.length + otherRows;
  if (holds > 0 && !REPLACE) {
    await out.query("rollback");
    console.error(
      `${AS_USER} already holds ${existing.length} deck(s) and ${otherRows} other row(s) on ` +
        "the target.\nRefusing — pass --replace to delete them and write this snapshot in " +
        "their place.",
    );
    process.exit(1);
  }
  console.log(
    holds > 0
      ? `\nReplacing ${AS_USER}'s ${existing.length} deck(s) and ${otherRows} other row(s)…`
      : `\nWriting ${AS_USER}'s rows on the target…`,
  );
  if (existing.length > 0) {
    const ids = existing.map((d) => d.id);
    await out.query("delete from card_assignments where deck_id = any($1)", [ids]);
    await out.query("delete from decks where id = any($1)", [ids]);
  }
  // Cleared unconditionally: reaching here means either the target held nothing (so these are
  // no-ops) or --replace was given (so they must go). A condition here is what let the rows
  // survive in the first place.
  for (const t of USER_TABLES) {
    await out.query(`delete from ${t} where user_id = $1`, [AS_USER]);
  }

  // Order matters: folders before decks (a deck references a folder), decks before their rows,
  // versions before version cards, games before axes, passes before pass cards.
  await insert("deck_folders", folders);
  await insert("decks", decks);
  await insert("deck_cards", cards);
  await insert("deck_proxies", proxies);
  // After deck_cards: inserting a card deletes a DORMANT lock row for it (0061's trigger), so a
  // lock written first would be forgotten by its own card arriving.
  await insert("deck_locks", locks);
  await insert("pull_releases", releases);
  await insert("deck_versions", versions);
  await insert("deck_version_cards", versionCards);
  await insert("deck_games", games);
  await insert("deck_game_axes", gameAxes);
  await insert("card_assignments", assignments);
  await insert("fill_passes", fillPasses);
  await insert("fill_pass_cards", fillPassCards);
  await insert("deck_unresolved_rows", unresolved);
  await insert("collection_items", collection);
  await insert("card_art_preferences", artPrefs);
  await insert("csv_uploads", uploads);

  const landed = (await out.query("select count(*)::int as n from decks where user_id = $1", [
    AS_USER,
  ])).rows as { n: number }[];
  await out.query("commit");
  console.log(`Done. ${landed[0].n} deck(s) now under ${AS_USER} on the target.`);
  console.log("This is a SNAPSHOT — re-run it before a measurement that matters.");
} catch (error) {
  await out.query("rollback").catch(() => {});
  console.error("\nThe target write failed and was rolled back — it holds what it held before.");
  throw error;
} finally {
  out.release();
  await pool2.end();
}
