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
import { createFolder, moveDeck } from "../src/lib/decks/folders";
import { commitVersion, newestVersion, restoreDraftFromVersion } from "../src/lib/decks/versions";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

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

/** A second legend, for the commander-swap case. Ordered and offset rather than
    picked at random so a failing run names the same pair the next one will. */
const pickSecondCommander = async () => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line ~ 'Legendary Creature'
    order by oracle_id limit 1 offset 1
  `);
  if (!rows[0]) throw new Error("catalog holds one legend — seed it fully");
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

/** The column is left to its default so THIS FIXTURE's game is database-stamped
    and therefore orderable against the commits below, which are too. The app's
    own log path does not do that: `logGame` sends a date, either the player's
    backdated one or its own `new Date()`, because `played_at` records when the
    game was played rather than when it was logged. */
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

/** A version's `committed_at` as the database prints it, so the comparison below
    is UTC on both sides. `newestVersion()` returns a MAPPED timestamp, which the
    driver parses in the runtime's own zone — on a developer machine west of UTC
    that is the same instant with a different `getTime()`, and the check would
    report a failure that is really a timezone. */
const committedAtText = async (versionId: string) => {
  const { rows } = await fixture.execute<{ t: string }>(sql`
    select committed_at::text as t from deck_versions where id = ${versionId}::uuid
  `);
  return rows[0].t;
};

/** Both sides to the MILLISECOND. Postgres keeps microseconds and a JavaScript
    `Date` does not, so the reader's value is the database's truncated — comparing
    at full precision would fail on a correct read. That truncation is a real
    property of this pipeline, not an artefact of the probe: see the note on ties
    in `touched.ts`. */
const toMillis = (text: string) => {
  const [seconds, fraction = ""] = text.split(".");
  return `${seconds}.${(fraction + "000").slice(0, 3)}`;
};

const asText = (at: Date | null) =>
  at === null ? null : toMillis(at.toISOString().replace("T", " ").replace(/Z$/, ""));

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
  await commitVersion(committed, "first", undefined, undefined, process.env);
  check("a commit leaves last_edited_at alone", await editedAt(committed), before);

  // ── The figure: what the reader actually gets back ───────────────────────
  const list = await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env });
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
  const firstVersion = await newestVersion(committed);
  check(
    "and it is the version's own instant",
    asText(committedRow.lastCommittedAt),
    toMillis(await committedAtText(firstVersion!.id)),
  );
  check("a brew reports no commit", find(list, edited).lastCommittedAt, null);
  check("a deck with no game reports none", find(list, committed).lastPlayedAt, null);

  // A second commit, so `max()` is doing work rather than reading the only row.
  await addCard(committed, await pickCard(1));
  await commitVersion(committed, "second", undefined, undefined, process.env);
  const reread = find(await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env }), committed);
  const newest = await newestVersion(committed);
  check(
    "lastCommittedAt is the NEWEST commit",
    asText(reread.lastCommittedAt),
    toMillis(await committedAtText(newest!.id)),
  );

  // Logged last, so the game is the newest act in the fixture: commits are
  // stamped by the database's clock and so is this, and the order below is the
  // one thing here that needs them comparable.
  await logGame(played);

  // ── The verbs, over real rows ────────────────────────────────────────────
  const fresh = await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env });
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

  // ── Pending changes: the flag the deck tile's edge is drawn from ─────────
  // THE CASE THE CHEAP PROXY FAILS. `last_edited_at > committed_at` is the
  // obvious flag and it is wrong here: the discard above moved the edit stamp
  // PAST the commit while restoring the draft to exactly the committed list.
  // Under the proxy this deck reports pending for ever and its tile carries an
  // edge nobody can clear. Only comparing the rows can tell the two apart, and
  // this check fails on any build that takes the shortcut.
  const afterDiscard = find(await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env }), committed);
  check("a draft restored to its version has no changes", afterDiscard.pendingChanges, 0);
  check(
    "even though the discard moved the edit stamp past the commit",
    afterDiscard.lastEditedAt.getTime() > afterDiscard.lastCommittedAt!.getTime(),
    true,
  );

  // A brew has nothing to differ from, and false is the accurate answer rather
  // than a missing case: that deck's mark is the hollow plate instead, and an
  // edge drawn there would be permanently on and would say nothing.
  check("a deck with no version counts none", find(await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env }), edited).pendingChanges, 0);

  // One add, and the flag turns over.
  await addCard(committed, await pickCard(3));
  check(
    "one add is one change",
    find(await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env }), committed).pendingChanges,
    1,
  );

  // A CUT, which the reverse `except` is the only thing that sees. A build
  // carrying one direction reports this deck clean while a card is missing
  // from it.
  await fixture.execute(sql`
    delete from deck_cards
    where deck_id = ${committed}::uuid and oracle_id = ${await pickCard(3)}::uuid
  `);
  check(
    "and cutting it back makes it clean again",
    find(await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env }), committed).pendingChanges,
    0,
  );
  await fixture.execute(sql`
    update deck_cards set quantity = 2
    where deck_id = ${committed}::uuid and oracle_id = ${card}::uuid
  `);
  // ONE change, not two. The symmetric difference puts this card on both sides
  // and `draftDiff` files it as a single add — a figure counting rows would
  // disagree with the deck page about every quantity change on the tile.
  check(
    "a quantity change is ONE change, not one per side",
    find(await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env }), committed).pendingChanges,
    1,
  );
  await fixture.execute(sql`
    update deck_cards set quantity = 1
    where deck_id = ${committed}::uuid and oracle_id = ${card}::uuid
  `);

  // Two changes at once, and the version they are counted against. The tile
  // prints both — `2 changes since v2` — so a version number that lagged the
  // count would name the wrong list.
  await addCard(committed, await pickCard(3));
  await fixture.execute(sql`
    update deck_cards set quantity = 3
    where deck_id = ${committed}::uuid and oracle_id = ${card}::uuid
  `);
  const two = find(await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env }), committed);
  check("an add and a quantity change are two changes", two.pendingChanges, 2);
  check("and they are counted against the newest version", two.versionNumber, 2);
  await fixture.execute(sql`
    delete from deck_cards
    where deck_id = ${committed}::uuid and oracle_id = ${await pickCard(3)}::uuid
  `);
  await fixture.execute(sql`
    update deck_cards set quantity = 1
    where deck_id = ${committed}::uuid and oracle_id = ${card}::uuid
  `);
  check(
    "a brew has no version number to count against",
    find(await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env }), edited).versionNumber,
    null,
  );

  // THE GATE. A caller that does not draw the marks does not pay for them, and
  // the defaults it gets back are the ones a deck with no version gives — so
  // the absence reads as "no mark", never as a wrong mark. Asserted against a
  // deck that genuinely HAS changes, because against a clean deck the gated
  // read and the ungated one agree and the check would measure nothing.
  await addCard(committed, await pickCard(3));
  const ungated = find(await listDecksWithStats(USER, "name", { env: process.env }), committed);
  check("a caller that skips the marks pays for no diff", ungated.pendingChanges, 0);
  check("and gets no version number either", ungated.versionNumber, null);
  check(
    "while the same deck, read with them, reports the change",
    find(await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env }), committed).pendingChanges,
    1,
  );
  await fixture.execute(sql`
    delete from deck_cards
    where deck_id = ${committed}::uuid and oracle_id = ${await pickCard(3)}::uuid
  `);

  // A COMMANDER SWAP does NOT flip it, and this case pins that deliberately.
  // `changeCount` on the deck page is adds + removes over the CARD diff alone,
  // so a flag that watched the commander columns too would draw the tile's edge
  // on a deck whose own page counts zero changes and offers nothing to commit.
  // Nothing in the app writes `commander_oracle_id` after a deck is created —
  // this fixture reaches the state by raw SQL — so the alignment costs nothing
  // today, and if a swap ever ships, `draft-shape.ts` is where it belongs and
  // this flag follows it rather than disagreeing with it.
  const otherCommander = await pickSecondCommander();
  await fixture.execute(sql`
    update decks set commander_oracle_id = ${otherCommander}::uuid where id = ${committed}::uuid
  `);
  check(
    "a commander swap alone counts nothing — the card diff is the whole definition",
    find(await listDecksWithStats(USER, "name", { includeDeckState: true, env: process.env }), committed).pendingChanges,
    0,
  );
  await fixture.execute(sql`
    update decks set commander_oracle_id = ${commander}::uuid where id = ${committed}::uuid
  `);

  // ── Filing is not deck work ──────────────────────────────────────────────
  // The plan's rule, and the one a future broad "stamp every deck write" change
  // would silently break: moving a deck between shelves must leave the stamp
  // alone, or tidying up would reorder Home. `moveDeck` takes no auth, so the
  // real function is called here.
  const shelf = await createFolder(USER, `${USER} shelf`);
  const beforeFiling = await editedAt(played);
  check("the deck files", await moveDeck(played, USER, shelf.id), true);
  check("filing a deck does not stamp it", await editedAt(played), beforeFiling);
  check("the deck unfiles", await moveDeck(played, USER, null), true);
  check("unfiling does not stamp it either", await editedAt(played), beforeFiling);

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
    await fixture.execute(sql`delete from deck_folders where user_id = ${USER}`);
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
