// The touch stamp, proved against a real Postgres by calling the real writers
// and the real reader.
//
// Two things live here that no unit test in this repository can reach.
//
// THE FIGURE. `last-committed.test.ts` renders `lastCommittedSql` and proves it
// ASKS the right question; only a fixture whose true value is known proves the
// answer. A correlated subquery that compares a foreign key to its own primary
// key returns null for every row, for ever, with no error — and a `committed`
// stamp that silently never prints is exactly the defect AGENTS.md was written
// about.
//
// THE RULE. What counts as an edit is a product ruling spread across a dozen
// call sites: a commit must NOT move `last_edited_at` or the verb `committed`
// would be unreachable, and a discard back to a version MUST move it. Both are
// facts about what a transaction wrote, so only a database can answer them.
//
// WHAT IT CANNOT REACH. The server actions — add, remove, fill, sweep, top-off —
// call `requireUserId()`, so they need a signed-in Clerk session and are out of
// reach of a database-only script; `probe:folders` has the same ceiling. The
// writers exercised here are the ones that take no auth: `commitVersion`,
// `restoreDraftFromVersion` and `touchDeck` itself. The action call sites are
// covered by unit tests only where those tests observe the stamp today — the
// top-off and its undo (`last-slots-actions.test.ts`), the unresolved-line
// resolve (`import-actions.test.ts`) and the list update
// (`update-actions.test.ts`). The hand add and remove, the fill, the sweep, the
// restore, the pull and the rename are asserted by neither: their stamps are
// read from the code, and a misplaced conditional there would pass everything
// in this repository. That gap is named rather than papered over.
//
// It writes a fixture under a per-run user_id and deletes it in a finally;
// versions and version cards cascade.
//
// Run it against local dev or a scratch Neon branch — NEVER production.
//
// Run: `pnpm probe:touched`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the
// .env has to be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { db } from "../src/db";
import { listDecksWithStats } from "../src/lib/decks/read";
import { touchDeck } from "../src/lib/decks/touch";
import { byTouched, touchedBy } from "../src/lib/decks/touched";
import { commitVersion, newestVersion, restoreDraftFromVersion } from "../src/lib/decks/versions";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-touched-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

const pickCommander = async () => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line ~ 'Legendary Creature'
    order by oracle_id limit 1
  `);
  if (!rows[0]) throw new Error("catalog is empty — seed it first");
  return rows[0].oracle_id;
};

/** Distinct cards by offset — a second commit of the same list is not a second version. */
const pickCard = async (offset: number) => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line = 'Artifact'
    order by oracle_id limit 1 offset ${offset}
  `);
  if (!rows[0]) throw new Error("catalog is empty — seed it first");
  return rows[0].oracle_id;
};

/** A deck whose two timestamps are stated, so every figure below has a known truth. */
const makeDeck = async (name: string, commander: string, createdAt: string) => {
  const { rows } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, created_at, last_edited_at)
    values (${USER}, ${name}, ${commander}::uuid, ${createdAt}::timestamp, ${createdAt}::timestamp)
    returning id
  `);
  return rows[0].id;
};

const addCard = async (deckId: string, oracleId: string) => {
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}::uuid, ${oracleId}::uuid, 1)
    on conflict do nothing
  `);
};

/** `played_at` defaults to the database's clock, which is what the app's own
    log path does — a stated date here would have to be ordered against commits
    the database stamps with `now()`, and the two clocks are not the same one. */
const logGame = async (deckId: string) => {
  await fixture.execute(sql`
    insert into deck_games (deck_id, user_id, result, pod_size)
    values (${deckId}::uuid, ${USER}, 'win', 4)
  `);
};

const editedAt = async (deckId: string) => {
  const { rows } = await fixture.execute<{ t: string }>(sql`
    select last_edited_at::text as t from decks where id = ${deckId}::uuid
  `);
  return rows[0].t;
};

const find = (list: Awaited<ReturnType<typeof listDecksWithStats>>, id: string) => {
  const deck = list.find((d) => d.id === id);
  if (!deck) throw new Error(`deck ${id} is missing from the list`);
  return deck;
};

// Wrapped in main() rather than run at top level: tsx transpiles this repo's
// scripts to CJS, where a top-level await is a build error.
async function main() {
  const commander = await pickCommander();
  const card = await pickCard(0);

  // Three decks, each touched last by a different act, and stamped far enough
  // apart that no clock skew can reorder them.
  const edited = await makeDeck(`${USER} edited`, commander, "2026-09-12T10:00:00");
  const committed = await makeDeck(`${USER} committed`, commander, "2026-03-01T10:00:00");
  const played = await makeDeck(`${USER} played`, commander, "2026-03-01T10:00:00");

  // ── The stated stamp survives the write and the read ──────────────────────
  check("a stated last_edited_at is not clobbered", await editedAt(edited), "2026-09-12 10:00:00");

  // ── The migration's backfill, run against a row in the pre-backfill state ──
  // A deck inserted WITHOUT the column takes the schema default, which is the
  // deploy instant — exactly what every existing row held between the ALTER and
  // the UPDATE. The migration's own statement is then replayed over it. Without
  // that UPDATE the whole list would sort by the deploy, in an order nobody
  // could explain, until each deck was next edited.
  const { rows: preBackfill } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, created_at)
    values (${USER}, ${`${USER} backfill`}, ${commander}::uuid, '2025-01-02T03:04:05'::timestamp)
    returning id
  `);
  const backfilled = preBackfill[0].id;
  check(
    "before the backfill the column holds the default, not the deck's creation",
    (await editedAt(backfilled)) === "2025-01-02 03:04:05",
    false,
  );
  // Read out of the migration itself rather than retyped, so the statement this
  // probe proves is the statement that ships. Replaying a hand-written copy
  // would pass even if `0030` had omitted the UPDATE entirely, which is the one
  // failure the check is for.
  const migration = readFileSync(
    join(__dirname, "..", "drizzle", "0030_unknown_hawkeye.sql"),
    "utf8",
  );
  const backfillStatement = migration
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .find((part) => /^update "decks" set "last_edited_at"/im.test(part.replace(/^--.*$/gm, "").trim()));
  check("the migration carries a backfill statement", backfillStatement !== undefined, true);
  await fixture.execute(sql.raw(
    `${(backfillStatement ?? "").replace(/^--.*$/gm, "").trim().replace(/;$/, "")} where id = '${backfilled}'`,
  ));
  check(
    "the migration's own backfill seeds it from created_at",
    await editedAt(backfilled),
    "2025-01-02 03:04:05",
  );

  // ── A commit does not count as an edit ───────────────────────────────────
  await addCard(committed, card);
  const before = await editedAt(committed);
  await commitVersion(committed, "first");
  check("a commit leaves last_edited_at alone", await editedAt(committed), before);

  // ── The figure: what the reader actually gets back ───────────────────────
  const list = await listDecksWithStats(USER, "name");
  // Four now: the three verb decks plus the backfill row above, which is a deck
  // like any other once its column is seeded.
  check("the list carries every fixture deck", list.length, 4);

  // THE CHECK THIS PROBE EXISTS FOR. An unqualified correlation returns null
  // here and nothing else changes — the block still renders, the stamp just
  // never says `committed`.
  const committedRow = find(list, committed);
  check(
    "lastCommittedAt comes back for a committed deck",
    committedRow.lastCommittedAt !== null,
    true,
  );
  check(
    "and it is the version's own instant",
    committedRow.lastCommittedAt?.getTime() === (await newestVersion(committed))?.committedAt.getTime(),
    true,
  );
  check("a brew reports no commit", find(list, edited).lastCommittedAt, null);
  check("a deck with no game reports none", find(list, committed).lastPlayedAt, null);

  // A second commit, so `max()` is doing work rather than reading the only row.
  await addCard(committed, await pickCard(1));
  await commitVersion(committed, "second");
  const reread = find(await listDecksWithStats(USER, "name"), committed);
  const newest = await newestVersion(committed);
  check("lastCommittedAt is the NEWEST commit", reread.lastCommittedAt?.getTime(), newest?.committedAt.getTime());

  // Logged last, so the game is the newest act in the fixture: commits are
  // stamped by the database's clock and so is this, and the order below is the
  // one thing here that needs them comparable.
  await logGame(played);

  // ── The verbs, over real rows ────────────────────────────────────────────
  const fresh = await listDecksWithStats(USER, "name");
  check("an untouched-since-creation deck reads as edited", touchedBy(find(fresh, edited)).verb, "edited");
  check("a committed deck reads as committed", touchedBy(find(fresh, committed)).verb, "committed");
  check("a played deck reads as played", touchedBy(find(fresh, played)).verb, "played");

  // The order the block draws, assembled from three different columns.
  const order = [...fresh]
    .filter((d) => d.id !== backfilled)
    .sort(byTouched)
    .map((d) => d.id);
  check("the most recently touched deck leads", order[0], played);
  check("the commit outranks the older edit", order[1], committed);
  check("the stale deck is last", order[2], edited);

  // ── A discard IS an edit ─────────────────────────────────────────────────
  // The other half of the commit rule: `restoreDraftFromVersion` rewrites
  // `deck_cards` wholesale, so the draft changed even though it now matches a
  // version. `commitVersionIn` sits in the same file and deliberately does not.
  await addCard(committed, await pickCard(2));
  const beforeDiscard = await editedAt(committed);
  const version = await newestVersion(committed);
  const outcome = await restoreDraftFromVersion(committed, version!.id);
  check("the discard applied", outcome, "restored");
  check(
    "a discard moves last_edited_at",
    (await editedAt(committed)) !== beforeDiscard,
    true,
  );

  // ── touchDeck itself ─────────────────────────────────────────────────────
  const stale = await editedAt(edited);
  // The app's own client, not the fixture's: `touchDeck` takes the transaction
  // handle its callers hand it, and this is that handle.
  await db.transaction(async (tx) => {
    await touchDeck(tx, edited);
  });
  check("touchDeck moves the column", (await editedAt(edited)) !== stale, true);
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    // Versions, version cards, deck cards and games all cascade off the deck.
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
