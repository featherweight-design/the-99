// Deck notes' queries, proved against a real Postgres by calling the real store and read functions.
// What no unit test reaches: the 100-per-deck cap holding under two concurrent adds (a row lock on the
// deck), the check constraint's backstop, ownership failing to match another player's note, the cascade
// on deck delete, and a banned card being findable by the picker lookup.
//
// It writes a fixture under per-run user ids and deletes it in a finally. Point it at local-dev or a
// scratch branch, NEVER production. Run: `pnpm probe:deck-notes-actions`
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { currentNames, insertNote, removeNote, searchNoteCards, setNoteDone, updateNoteBody } from "../src/lib/decks/notes-store";
import { readDeckNotes } from "../src/lib/decks/notes-read";
import { formatTag } from "../src/lib/decks/notes-body";
import { NOTES_PER_DECK } from "../src/lib/copy/deck-notes";
import { sqlstate } from "../src/lib/db-error";
import { PRODUCTION_BRANCH_ID, STAGING_BRANCH_ID } from "./lib/spend-target";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-notes-${Date.now()}`;
const OTHER = `${USER}-other`;

let failures = 0;
// Set only once the branch is verified: the cleanup in `finally` is itself a write.
let verified = false;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
};

const one = async <T>(q: ReturnType<typeof sql>): Promise<T> => (await fixture.execute(q)).rows[0] as T;
const count = async (deckId: string) => (await one<{ n: number }>(sql`select count(*)::int as n from deck_notes where deck_id = ${deckId}::uuid`)).n;

async function main() {
  const branchId = (await one<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`)).id;
  // Fail closed: an unknown branch (a primary, or a non-Neon database) is refused as well as the two named ones.
  if (!branchId || branchId === PRODUCTION_BRANCH_ID || branchId === STAGING_BRANCH_ID || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to write a fixture to ${branchId ?? "(unknown)"}: point DATABASE_URL at local-dev`);
  }
  verified = true;
  console.log(`branch ${branchId}`);

  const commander = (await one<{ oracle_id: string }>(sql`select oracle_id from cards where type_line ~ 'Legendary Creature' order by oracle_id limit 1`)).oracle_id;
  const deck = (await one<{ id: string }>(sql`insert into decks (user_id, name, commander_oracle_id) values (${USER}, ${USER}, ${commander}::uuid) returning id`)).id;
  const other = (await one<{ id: string }>(sql`insert into decks (user_id, name, commander_oracle_id) values (${OTHER}, ${OTHER}, ${commander}::uuid) returning id`)).id;
  const d = { commanderOracleId: commander, partnerOracleId: null };

  // ---- add, read, edit, done, delete ----
  check("an add answers ok", await insertNote(deck, USER, "try a second sweeper"), "ok");
  let view = await readDeckNotes(deck, USER, d, process.env);
  check("it reads back as one open note", [view.open.length, view.done.length], [1, 0]);
  const note = view.open[0];
  const fresh = await one<{ u: string | null }>(sql`select updated_at::text as u from deck_notes where id = ${note.id}::uuid`);
  check("a new note is open and has recorded no edit", [note.doneAt, fresh.u], [null, null]);

  check("an edit answers true", await updateNoteBody(deck, USER, note.id, "try two sweepers"), true);
  view = await readDeckNotes(deck, USER, d, process.env);
  check("an edit changes the body and not the creation date", [view.open[0].body, view.open[0].createdAt], ["try two sweepers", note.createdAt]);
  const edited = await one<{ u: string | null }>(sql`select updated_at::text as u from deck_notes where id = ${note.id}::uuid`);
  check("an edit stamps updated_at", edited.u !== null, true);

  // ---- ownership: another player's id, and a deck that is not the note's, match nothing ----
  check("another player cannot edit it", await updateNoteBody(deck, OTHER, note.id, "hijack"), false);
  check("another player cannot select it", await setNoteDone(deck, OTHER, note.id, true), false);
  check("another player cannot delete it", await removeNote(deck, OTHER, note.id), false);
  check("the note's id on another deck matches nothing", await removeNote(other, USER, note.id), false);
  check("the note is untouched", (await readDeckNotes(deck, USER, d, process.env)).open[0].body, "try two sweepers");

  // ---- select and unselect ----
  check("select answers true", await setNoteDone(deck, USER, note.id, true), true);
  view = await readDeckNotes(deck, USER, d, process.env);
  const firstDone = view.done[0]?.doneAt;
  await new Promise((r) => setTimeout(r, 20));
  check("selecting a note already done answers true", await setNoteDone(deck, USER, note.id, true), true);
  check("and does not move its done date", (await readDeckNotes(deck, USER, d, process.env)).done[0]?.doneAt, firstDone);
  check("a selected note moves to done with its own date", [view.open.length, view.done.length, view.done[0].doneAt !== null], [0, 1, true]);
  check("unselect answers true", await setNoteDone(deck, USER, note.id, false), true);
  view = await readDeckNotes(deck, USER, d, process.env);
  check("an unselected note is open again with no done date", [view.open.length, view.open[0].doneAt], [1, null]);

  check("delete answers true", await removeNote(deck, USER, note.id), true);
  check("and the note is gone", await count(deck), 0);

  // ---- tags: held, not held, unresolved ----
  const held = (await one<{ oracle_id: string }>(sql`select oracle_id from cards where oracle_id <> ${commander}::uuid and commander_legal order by oracle_id limit 1`)).oracle_id;
  const notHeld = (await one<{ oracle_id: string }>(sql`select oracle_id from cards where oracle_id not in (${commander}::uuid, ${held}::uuid) and commander_legal order by oracle_id limit 1`)).oracle_id;
  await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck}::uuid, ${held}::uuid, 1)`);
  const ghost = "00000000-0000-4000-8000-000000000000";
  await insertNote(deck, USER, `${formatTag(held, "stale")} ${formatTag(notHeld, "x")} ${formatTag(ghost, "Gone Card")} ${formatTag(commander, "c")}`);
  const tags = (await readDeckNotes(deck, USER, d, process.env)).open[0].drawn.filter((s) => s.kind === "tag") as { held: boolean; resolved: boolean; name: string }[];
  check("a held card draws solid, a not-held one dashed, a commander solid", tags.map((t) => t.held), [true, false, false, true]);
  check("an unresolvable id keeps its stored name and says so", [tags[2].resolved, tags[2].name], [false, "Gone Card"]);
  check("a resolved tag draws the catalog's current name, not the stored one", tags[0].name !== "stale", true);
  await fixture.execute(sql`delete from deck_notes where deck_id = ${deck}::uuid`);

  // ---- a tag may only name a game card: a non-game row (token, plane, scheme...) resolves to nothing ----
  const token = await one<{ oracle_id: string } | undefined>(sql`select oracle_id from cards where layout in ('token', 'double_faced_token', 'emblem', 'planar', 'scheme', 'vanguard', 'art_series') order by oracle_id limit 1`);
  if (token) {
    check("a non-game row is not a taggable card", (await currentNames([token.oracle_id, held])).has(token.oracle_id), false);
    check("a game card still resolves", (await currentNames([held])).has(held), true);
  }

  // ---- the cap, and the race at 99 ----
  // Half of the 99 are done, so the count has to include done notes for the cap to hold at all.
  await fixture.execute(sql`insert into deck_notes (deck_id, user_id, body, done_at) select ${deck}::uuid, ${USER}, 'n' || g, case when g % 2 = 0 then now() end from generate_series(1, ${NOTES_PER_DECK - 1}) g`);
  const race = await Promise.all([insertNote(deck, USER, "racer one"), insertNote(deck, USER, "racer two")]);
  check("two adds at 99: exactly one lands, one hits the cap", race.slice().sort(), ["cap", "ok"]);
  check("the deck holds exactly 100", await count(deck), NOTES_PER_DECK);
  check("done notes count toward the cap (49 of the 100 are done)", [await insertNote(deck, USER, "one more"), (await one<{ n: number }>(sql`select count(*)::int as n from deck_notes where deck_id = ${deck}::uuid and done_at is not null`)).n], ["cap", 49]);

  // ---- the check constraint is the backstop ----
  let emptyCode: string | null = null;
  try { await fixture.execute(sql`insert into deck_notes (deck_id, user_id, body) values (${other}::uuid, ${OTHER}, '')`); } catch (e) { emptyCode = sqlstate(e); }
  check("an empty body is refused by the check", emptyCode, "23514");
  let longCode: string | null = null;
  try { await fixture.execute(sql`insert into deck_notes (deck_id, user_id, body) values (${other}::uuid, ${OTHER}, ${"x".repeat(1001)})`); } catch (e) { longCode = sqlstate(e); }
  check("a 1,001-character body is refused by the check", longCode, "23514");
  check("1,000 characters is allowed", (await fixture.execute(sql`insert into deck_notes (deck_id, user_id, body) values (${other}::uuid, ${OTHER}, ${"x".repeat(1000)}) returning id`)).rows.length, 1);

  // ---- the picker finds a card Commander does not allow ----
  const banned = await one<{ name: string } | undefined>(sql`select name from cards where not commander_legal and name ~ '^[A-Za-z ]{6,}$' and layout = 'normal' and type_line !~ 'Token|Sticker|Basic' order by name limit 1`);
  if (!banned) throw new Error("no non-legal game card in this catalog");
  const hits = await searchNoteCards(banned.name);
  const hit = hits.find((h) => h.name === banned.name);
  check("the picker lookup returns a not-legal card and says so", hit?.commanderLegal, false);
  check("a name match carries no flavor name", hit?.flavorName, null);

  // ---- the cascade ----
  await fixture.execute(sql`delete from decks where id = ${deck}::uuid`);
  check("deleting the deck deletes its notes", await count(deck), 0);
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    try {
      if (verified) await fixture.execute(sql`delete from decks where user_id in (${USER}, ${OTHER})`);
    } catch (error) {
      failures += 1;
      console.error("cleanup failed", error);
    }
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
