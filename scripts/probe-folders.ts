// Deck folders, proved against a real Postgres by calling the real query
// functions. What this exists for is the one rule no unit test in this
// repository can reach: DELETING A FOLDER UNFILES ITS DECKS AND DELETES NONE OF
// THEM. That behaviour is a foreign key's `on delete set null`, so only a
// database can answer whether it holds.
//
// It writes a fixture under a per-run user_id and deletes it in a finally.
//
// Run it against a scratch Neon branch or local dev — NEVER production.
//
// Run: `pnpm probe:folders`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the
// .env has to be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import {
  createFolder,
  deleteFolder,
  listFolders,
  moveDeck,
  renameFolder,
} from "../src/lib/decks/folders";
import { listDecksWithStats } from "../src/lib/decks/read";
import { validateFolderName } from "../src/lib/decks/folder-name";
import { isUniqueViolation, sqlstate } from "../src/lib/db-error";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-folders-${Date.now()}`;
const OTHER = `${USER}-other`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

// A legend to lead the fixture decks, read from the catalog rather than
// hard-coded: a fixed uuid rots the first time it moves.
const pickCommander = async () => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line ~ 'Legendary Creature'
    order by oracle_id limit 1
  `);
  if (!rows[0]) throw new Error("catalog is empty — seed it first");
  return rows[0].oracle_id;
};

const makeDeck = async (userId: string, name: string, commander: string) => {
  const { rows } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${userId}, ${name}, ${commander}::uuid)
    returning id
  `);
  return rows[0].id;
};

const folderOf = async (deckId: string) => {
  const { rows } = await fixture.execute<{ folder_id: string | null }>(sql`
    select folder_id from decks where id = ${deckId}::uuid
  `);
  return rows[0]?.folder_id ?? null;
};

const deckExists = async (deckId: string) => {
  const { rows } = await fixture.execute<{ n: number }>(sql`
    select count(*)::int as n from decks where id = ${deckId}::uuid
  `);
  return rows[0].n === 1;
};

// Wrapped in main() rather than run at top level: tsx transpiles this repo's
// scripts to CJS, where a top-level await is a build error.
async function main() {
  const commander = await pickCommander();
  const deckA = await makeDeck(USER, `${USER} A`, commander);
  const deckB = await makeDeck(USER, `${USER} B`, commander);
  const foreign = await makeDeck(OTHER, `${OTHER} A`, commander);

  check("a new deck is unfiled", await folderOf(deckA), null);

  const shelf = await createFolder(USER, "  Commander night  ");
  check("createFolder trims the name", shelf.name, "Commander night");

  const otherShelf = await createFolder(OTHER, "Someone else's shelf");

  // A duplicate name within one player is refused by the unique index, not by a
  // check the create path could forget.
  let duplicateCode: string | null = null;
  try {
    await createFolder(USER, "Commander night");
  } catch (error) {
    // Through `sqlstate`, because drizzle wraps the driver error and the code
    // sits on the cause — which is the whole reason that helper exists.
    if (!isUniqueViolation(error)) throw error;
    duplicateCode = sqlstate(error);
  }
  check("a duplicate folder name is refused by the unique index", duplicateCode, "23505");

  // The same name under a different player is fine — the constraint is scoped.
  const twin = await createFolder(OTHER, "Commander night");
  check("the same name under another player is allowed", twin.name, "Commander night");

  check("moveDeck files a deck", await moveDeck(deckA, USER, shelf.id), true);
  check("the deck is on the shelf", await folderOf(deckA), shelf.id);

  check("moveDeck unfiles with null", await moveDeck(deckA, USER, null), true);
  check("the deck is unfiled again", await folderOf(deckA), null);

  // Neither half of a cross-user move may land.
  check(
    "a deck cannot be filed onto another player's shelf",
    await moveDeck(deckA, USER, otherShelf.id),
    false,
  );
  check("that deck is untouched", await folderOf(deckA), null);
  check(
    "another player's deck cannot be moved",
    await moveDeck(foreign, USER, shelf.id),
    false,
  );
  check("that deck is untouched too", await folderOf(foreign), null);

  await moveDeck(deckA, USER, shelf.id);
  await moveDeck(deckB, USER, shelf.id);

  const empty = await createFolder(USER, "Empty shelf");

  const listed = await listFolders(USER);
  check("listFolders returns this player's folders only", listed.length, 2);
  check("folders are listed by name", listed[0]?.name, "Commander night");
  check("the folder counts its decks", listed[0]?.deckCount, 2);
  // An empty folder still appears, and counts nothing — the left join's
  // manufactured row must not read as one deck.
  check("an empty folder is listed", listed[1]?.id, empty.id);
  check("an empty folder counts zero decks", listed[1]?.deckCount, 0);

  // The deck list's own projection, which the read tests cannot cover: they
  // mock the database, so a wrong alias on either folder column — or a join
  // that hides unfiled decks — would pass them.
  const gridFiled = await listDecksWithStats(USER, "name", { env: process.env });
  check("the deck list carries every deck", gridFiled.length, 2);
  check("a filed deck names its folder", gridFiled[0]?.folderName, "Commander night");
  check("and carries its id", gridFiled[0]?.folderId, shelf.id);

  // Rename, whose refusals are the unique index's and the user scoping's — and
  // neither is reachable from a unit test.
  const renamed = await renameFolder(shelf.id, USER, "  Commander evening  ");
  check("renameFolder trims and returns the new name", renamed?.name, "Commander evening");

  const sameName = await renameFolder(shelf.id, USER, "Commander evening");
  check("renaming to its own name is a no-op, not a collision", sameName?.name, "Commander evening");

  // The SQLSTATE, not merely "something threw": a bare catch would let a
  // transient failure pass for the index's refusal and hide the real fault.
  let renameDuplicateCode: string | null = null;
  try {
    await renameFolder(shelf.id, USER, "Empty shelf");
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    renameDuplicateCode = sqlstate(error);
  }
  check("a rename onto an existing name is refused by the unique index", renameDuplicateCode, "23505");

  check(
    "another player's folder cannot be renamed",
    await renameFolder(otherShelf.id, USER, "Mine now"),
    null,
  );
  check(
    "and that folder keeps its name",
    (await listFolders(OTHER)).find((f) => f.id === otherShelf.id)?.name,
    "Someone else's shelf",
  );

  // Renamed above, so the delete copy's subject is the new name.
  check("the rename survived the reads", (await listFolders(USER))[0]?.name, "Commander evening");

  // THE RULE THIS PROBE EXISTS FOR.
  check("deleteFolder reports the delete", await deleteFolder(shelf.id, USER), true);
  check("the filed deck survives", await deckExists(deckA), true);
  check("the other filed deck survives", await deckExists(deckB), true);
  check("the filed deck is unfiled", await folderOf(deckA), null);
  check("the other filed deck is unfiled", await folderOf(deckB), null);

  const gridUnfiled = await listDecksWithStats(USER, "name", { env: process.env });
  check("an unfiled deck is still listed", gridUnfiled.length, 2);
  check("and names no folder", gridUnfiled[0]?.folderName, null);
  check("and carries no folder id", gridUnfiled[0]?.folderId, null);

  check("deleting it twice is not an error", await deleteFolder(shelf.id, USER), false);
  check(
    "another player's folder cannot be deleted",
    await deleteFolder(otherShelf.id, USER),
    false,
  );

  let badNameRefused = false;
  try {
    validateFolderName("   ");
  } catch {
    badNameRefused = true;
  }
  check("an empty name is refused before it reaches the database", badNameRefused, true);
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    await fixture.execute(sql`delete from decks where user_id in (${USER}, ${OTHER})`);
    await fixture.execute(sql`delete from deck_folders where user_id in (${USER}, ${OTHER})`);
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
