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
import { neon } from "@neondatabase/serverless";

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
if (SOURCE === TARGET) {
  console.error("Source and target are the same database. Refusing — this script only ever writes to the target.");
  process.exit(1);
}

const src = neon(SOURCE);
const dst = neon(TARGET);

/** The staging account to copy. The busiest, unless named. */
const owner =
  process.env.PULL_FROM_USER_ID ??
  (
    (await src`
      select user_id, count(*)::int as n from decks group by 1 order by n desc limit 1`) as {
      user_id: string;
    }[]
  )[0]?.user_id;

if (!owner) {
  console.error("No decks on staging to copy.");
  process.exit(1);
}

const decks = (await src`
  select * from decks where user_id = ${owner} order by created_at`) as Record<string, unknown>[];
const deckIds = decks.map((d) => d.id as string);
const collection = (await src`
  select * from collection_items where user_id = ${owner}`) as Record<string, unknown>[];
const folders = (await src`
  select * from deck_folders where user_id = ${owner}`) as Record<string, unknown>[];

// Deck-scoped rows, fetched by the ids above rather than by user, because that is how they are
// keyed. An empty id list would make `in ()` invalid, so each read is guarded.
const byDeck = async (table: string) =>
  deckIds.length === 0
    ? []
    : ((await src.query(`select * from ${table} where deck_id = any($1)`, [deckIds])) as Record<
        string,
        unknown
      >[]);

const cards = await byDeck("deck_cards");
const proxies = await byDeck("deck_proxies");
const versions = await byDeck("deck_versions");
const games = await byDeck("deck_games");
const assignments = await byDeck("card_assignments");
const versionIds = versions.map((v) => v.id as string);
const versionCards =
  versionIds.length === 0
    ? []
    : ((await src.query(`select * from deck_version_cards where version_id = any($1)`, [
        versionIds,
      ])) as Record<string, unknown>[]);
const artPrefs = (await src`
  select * from card_art_preferences where user_id = ${owner}`) as Record<string, unknown>[];

console.log(`From staging, account ${owner.slice(0, 12)}…`);
for (const [name, rows] of [
  ["decks", decks], ["deck_cards", cards], ["deck_versions", versions],
  ["deck_version_cards", versionCards], ["deck_games", games], ["deck_proxies", proxies],
  ["deck_folders", folders], ["card_assignments", assignments],
  ["collection_items", collection], ["card_art_preferences", artPrefs],
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

// Order matters: folders before decks (decks reference a folder), decks before their rows,
// versions before version cards.
await insert("deck_folders", folders);
await insert("decks", decks);
await insert("deck_cards", cards);
await insert("deck_proxies", proxies);
await insert("deck_versions", versions);
await insert("deck_version_cards", versionCards);
await insert("deck_games", games);
await insert("card_assignments", assignments);
await insert("collection_items", collection);
await insert("card_art_preferences", artPrefs);

const landed = (await dst`select count(*)::int as n from decks where user_id = ${AS_USER}`) as {
  n: number;
}[];
console.log(`Done. ${landed[0].n} deck(s) now under ${AS_USER} on the target.`);
console.log("This is a SNAPSHOT — re-run it before a measurement that matters.");
