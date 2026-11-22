// Seeds the log-your-game reminder's closed-table states on top of `scripts/seed-rule-zero-fixture.mts` (run that first,
// on the same scratch branch): three closed tables cloned from its `expired` table's seats, so the closed page
// (`/friends/table/[id]`) draws each state of plan `2026-11-21-log-reminder.md`:
//   C1  inside the keep window, one game the viewer has not logged (Colin won): `Log this game`
//   L1  inside the keep window, one game the viewer logged (they won): the logged note, no button
//   C2  past the keep window, still seated: the clock note and `Log it by hand`
// `scripts/probe-log-reminder.mjs` presses them. SCRATCH BRANCH ONLY; a rerun starts clean (it deletes its own ids).
//   RZ_FIXTURE_BRANCH=br-... RZ_FIXTURE_USER=user_... pnpm tsx scripts/seed-log-reminder-fixture.mts
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
const named = process.env.RZ_FIXTURE_BRANCH;
const viewer = process.env.RZ_FIXTURE_USER;
if (!named || !viewer) throw new Error("set RZ_FIXTURE_BRANCH and RZ_FIXTURE_USER");
const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const { rows: branch } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
if (branch[0]?.b !== named) throw new Error(`database reports ${branch[0]?.b}, not ${named}`);
assertScratchBranch(branch[0]?.b, "seed-log-reminder-fixture");

const SOURCE = "7a0e0000-0000-4000-8000-000000000012";
export const LOG_REMINDER_IDS = {
  C1: "7a0e0000-0000-4000-8000-0000000000c1",
  L1: "7a0e0000-0000-4000-8000-0000000000a1",
  C2: "7a0e0000-0000-4000-8000-0000000000c2",
} as const;

const { rows: src } = await db.execute<{ pod_id: string; set_by: string }>(sql`select pod_id, set_by from rule_zero_tables where id = ${SOURCE}`);
if (!src[0]) throw new Error("run seed-rule-zero-fixture.mts first: its expired table is missing");
const { rows: seats } = await db.execute<{ user_id: string; seat: number; deck_id: string | null }>(sql`select user_id, seat, deck_id from rule_zero_seats where table_id = ${SOURCE} order by seat`);
const colin = src[0].set_by;
const places = (winner: string) => [...seats].sort((a, b) => (a.user_id === winner ? -1 : b.user_id === winner ? 1 : a.seat - b.seat)).map((s, i) => [s.user_id, i + 1] as const);

for (const [state, id] of Object.entries(LOG_REMINDER_IDS)) {
  const past = state === "C2";
  await db.execute(sql`delete from rule_zero_tables where id = ${id}`);
  await db.execute(sql`insert into rule_zero_tables (id, pod_id, set_by, created_at, expires_at)
    values (${id}, ${src[0].pod_id}, ${src[0].set_by}, ${past ? sql`now() - interval '10 days 4 hours'` : sql`now() - interval '4 hours'`}, ${past ? sql`now() - interval '10 days'` : sql`now() - interval '1 hour'`})`);
  for (const s of seats) await db.execute(sql`insert into rule_zero_seats (table_id, user_id, seat, deck_id) values (${id}, ${s.user_id}, ${s.seat}, ${s.deck_id})`);
  if (past) continue; // C2 has no game to fill in: its results are gone with the week
  // One timestamp for every seat: `now()` per statement would give each seat its own started_at, and so its own game, and a game's id is whole milliseconds (`gameMsOf`), so a microsecond tail would never match.
  const [{ t }] = (await db.execute<{ t: string }>(sql`select date_trunc('milliseconds', now() - interval '90 minutes')::text as t`)).rows;
  const startedAt = sql`${t}::timestamptz`;
  for (const [user, place] of places(state === "L1" ? viewer : colin)) {
    const s = seats.find((x) => x.user_id === user)!;
    await db.execute(sql`insert into rule_zero_result_seats (table_id, user_id, seat, place, deck_id, started_at) values (${id}, ${user}, ${s.seat}, ${place}, ${s.deck_id}, ${startedAt})`);
  }
  if (state === "L1") {
    const mine = seats.find((x) => x.user_id === viewer)!;
    await db.execute(sql`insert into deck_games (deck_id, user_id, result, pod_size, rule_zero_table_id, rule_zero_game_at)
      values (${mine.deck_id}, ${viewer}, 'win', ${seats.length}, ${id}, ${startedAt})`);
  }
}
console.log("seeded", JSON.stringify(LOG_REMINDER_IDS));
process.exit(0);
