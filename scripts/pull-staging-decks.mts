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
 *   PULL_TARGET_URL=<local-dev>  pnpm pull:staging            # writes
 *   PULL_TARGET_URL=<local-dev>  pnpm pull:staging --dry-run  # counts only
 *
 * The source is `THE_99_NEON_STAGING_DIRECT`. The target must be named explicitly — there is no
 * `?? DATABASE_URL` fallback, because a fallback is how a one-way script finds the wrong end.
 */
import "dotenv/config";
import { neon, Pool } from "@neondatabase/serverless";

const SOURCE = process.env.THE_99_NEON_STAGING_DIRECT;
const TARGET = process.env.PULL_TARGET_URL;
const DRY = process.argv.includes("--dry-run");
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

  owner =
    process.env.PULL_FROM_USER_ID ??
    (
      await rows("select user_id, count(*)::int as n from decks group by 1 order by n desc limit 1")
    )[0]?.user_id as string | undefined;
  if (!owner) {
    console.error("No decks on staging to copy.");
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
  ["deck_proxies", proxies], ["deck_folders", folders], ["card_assignments", assignments],
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
 * BATCHED, because a row at a time is not a copy of this size. The first version issued one
 * INSERT per row over ~6,400 rows and did not finish inside two minutes; each statement is a
 * round trip to a serverless Postgres, so the cost is latency rather than work. 500 rows per
 * statement puts it under a handful of trips per table.
 */
const CHUNK = 500;
const insert = async (table: string, rows: Record<string, unknown>[]) => {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const quoted = cols.map((c) => `"${c}"`).join(", ");
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK).map(reown);
    const values: unknown[] = [];
    const tuples = slice.map((row) => {
      const placeholders = cols.map((c) => {
        values.push(row[c]);
        return `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    await dst.query(
      `insert into ${table} (${quoted}) values ${tuples.join(", ")} on conflict do nothing`,
      values,
    );
  }
};

// The target's existing rows for this user go first, so a re-run is a REPLACE rather than a
// merge — a merge would leave decks from an older snapshot standing beside the new ones and
// quietly make the fixture a thing that never existed on staging.
console.log(`\nReplacing ${AS_USER}'s rows on the target…`);
const existing = (await dst`select id from decks where user_id = ${AS_USER}`) as { id: string }[];
if (existing.length > 0) {
  const ids = existing.map((d) => d.id);
  // Children first where no cascade covers them; the rest follow the deck.
  await dst.query(`delete from card_assignments where deck_id = any($1)`, [ids]);
  await dst.query(`delete from decks where id = any($1)`, [ids]);
}
await dst`delete from collection_items where user_id = ${AS_USER}`;
await dst`delete from deck_folders where user_id = ${AS_USER}`;
await dst`delete from card_art_preferences where user_id = ${AS_USER}`;
// `csv_uploads` is user-scoped metadata the collection reads for its last-updated stamp and its
// generation fingerprint. Left behind, a re-run pins a receipt from an older snapshot to a
// collection it never described.
await dst`delete from csv_uploads where user_id = ${AS_USER}`;

// Order matters: folders before decks (decks reference a folder), decks before their rows,
// versions before version cards.
await insert("deck_folders", folders);
await insert("decks", decks);
await insert("deck_cards", cards);
await insert("deck_proxies", proxies);
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

const landed = (await dst`select count(*)::int as n from decks where user_id = ${AS_USER}`) as {
  n: number;
}[];
console.log(`Done. ${landed[0].n} deck(s) now under ${AS_USER} on the target.`);
console.log("This is a SNAPSHOT — re-run it before a measurement that matters.");
