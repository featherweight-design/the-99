// Proves Undo of a table result (life tracker addendum, Undo a mistaken ending) against a real database: Undo takes
// back only the game it names, by the same checks as a save; it refuses as `logged` once anyone seated has logged the
// game; the U3 read names who logged it first ("You", or that seat's player by name, with a public id and never an
// account id) only to a reader seated at the table; and a log and an Undo racing on one table cannot both commit. The
// race holds a log's transaction open past its table read, then Undoes: the Undo waits for the log and answers `logged`.
// Without the log's share lock on the table row (`resolveTableSeatsIn`) the Undo deletes the result under the log.
//
// It WRITES, so it refuses staging, production and local-dev by `neon.branch_id` (`assertScratchBranch`): run it on a
// scratch branch made from local-dev. Its accounts are made-up per-run ids, and it removes every row it wrote, in a
// finally. Without `INVITE_CODE_SECRET` in the environment it seals under a per-run key.
//
//   PROBE_DATABASE_URL='<scratch branch url>' pnpm probe:tracker-undo
import "./lib/env.mjs";
import { randomBytes } from "node:crypto";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

let failed = 0;
const run = Date.now().toString(36);
const ZONE = "America/Los_Angeles";
const id = (k: string) => `probe_tru_${k}_${run}`;
const [A, B, C, D] = ["a", "b", "c", "d"].map(id);
const txt = (v: unknown) => (typeof v === "string" ? v : (v as { $tp?: string } | null | undefined)?.$tp);
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // The env file wins over the shell (`env.mjs`), so the scratch branch comes in as PROBE_DATABASE_URL, which it never sets.
  if (process.env.PROBE_DATABASE_URL) process.env.DATABASE_URL = process.env.PROBE_DATABASE_URL;
  if (!/^[0-9a-f]{64,}$/i.test(process.env.INVITE_CODE_SECRET ?? "")) process.env.INVITE_CODE_SECRET = randomBytes(32).toString("hex");
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: branch } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  assertScratchBranch(branch[0]?.b ?? null, "probe:tracker-undo");

  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const rz = await import("../src/lib/social/rule-zero");
  const { tableRoster, saveTableResult, undoTableResult, gameLogged } = await import("../src/lib/social/rule-zero-result");
  const { tablePrefill, resolveTableSeatsIn } = await import("../src/lib/social/rule-zero-log");

  const seat = (member: string, deck: string | null = null) => ({ member, deck });
  const rowsOf = async (tableId: string) =>
    (await db.execute<{ n: number }>(sql`select count(*)::int as n from rule_zero_result_seats where table_id = ${tableId}`)).rows[0].n;
  const log = (deckId: string, userId: string, tableId: string) =>
    db.execute(sql`insert into deck_games (deck_id, user_id, result, pod_size, played_at, rule_zero_table_id) values (${deckId}, ${userId}, 'loss', 3, now(), ${tableId})`);

  try {
    const { rows: picks } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where commander_legal and type_line like 'Legendary Creature%' order by oracle_id limit 1`);
    const CMD = picks[0].oracle_id;
    const pub: Record<string, string> = {};
    for (const [u, name] of [[A, "Ava"], [B, "Bo"], [C, "Cy"], [D, "Di"]] as const) pub[u] = (await friends.ensureProfile(u, name)).publicId;
    for (const u of [B, C]) {
      const t = await friends.createInvite(A);
      if (!t.ok) throw new Error("createInvite refused");
      await friends.redeemInvite(u, t.token);
    }
    const p = await pods.createPod(A, "Undo night");
    if (!p) throw new Error("createPod refused");
    for (const m of [B, C]) await pods.addMember(A, p.id, pub[m]);
    const deck = async (u: string, name: string) =>
      (await db.execute<{ id: string }>(sql`insert into decks (user_id, name, commander_oracle_id) values (${u}, ${name}, ${CMD}) returning id`)).rows[0].id;
    const deckA = await deck(A, "Ava's deck");
    const deckB = await deck(B, "Bo's deck");
    const deckC = await deck(C, "Cy's deck");
    const set = await rz.setTable(A, p.id, [seat(pub[A], deckA), seat(pub[B], deckB), seat(pub[C], deckC)], ZONE);
    if (set.kind !== "set") throw new Error(`setTable ${set.kind}`);
    const T = set.tableId;
    const placements = [{ seat: 1, place: 2 }, { seat: 2, place: 1 }, { seat: 3, place: 3 }];
    const game = async () => {
      await sleep(5);
      const r = (await tableRoster(A, T))?.roster ?? null;
      if (r === null || (await saveTableResult(A, T, r, placements)) !== "saved") throw new Error("save refused");
      return r;
    };

    // 1. Undo by the same checks as a save, and only the game it names.
    const g1 = await game();
    check("Di, not seated, cannot Undo", (await undoTableResult(D, T, g1)) === "refused");
    check("an altered roster cannot Undo", (await undoTableResult(A, T, `${g1}x`.slice(1))) === "refused");
    check("a roster for another table cannot Undo", (await undoTableResult(A, "7a0e0000-0000-4000-8000-0000000000ff", g1)) === "refused");
    check("the refusals left the result", (await rowsOf(T)) === 3);
    const g2 = await game();
    check("the first game's Undo leaves the newer game's result", (await undoTableResult(A, T, g1)) === "undone" && (await rowsOf(T)) === 3);
    check("the newer game's Undo removes its result", (await undoTableResult(A, T, g2)) === "undone" && (await rowsOf(T)) === 0);
    check("Bo's prefill has no result after the Undo", (await tablePrefill(B, T, deckB))?.result === null);
    check("nobody has logged an undone game", (await gameLogged(A, T, g2)) === null);

    // 2. Once anyone seated logs the game, Undo refuses as `logged` and the U3 read names them.
    const g3 = await game();
    check("nobody has logged the new game yet", (await gameLogged(A, T, g3)) === null);
    await log(deckB, B, T);
    await sleep(5);
    await log(deckC, C, T);
    const seen = await gameLogged(A, T, g3);
    check("Ava reads that Bo logged it first, at his seat", seen?.you === false && txt(seen.name) === "Bo" && seen.seat === 2 && seen.publicId === pub[B], JSON.stringify(seen));
    const { rows: [clock] } = await db.execute<{ now: string }>(sql`select now()::text as now`);
    const drift = seen ? Math.abs(seen.at.getTime() - new Date(clock.now).getTime()) : Infinity;
    check("the U3 time is the log's, in UTC", drift < 60_000, `${seen?.at.toISOString()} vs ${clock.now}`);
    check("the U3 payload carries no account id", !JSON.stringify(seen).includes("probe_tru_"));
    check("Bo reads it as You", (await gameLogged(B, T, g3))?.you === true);
    check("Di, not seated, reads nothing", (await gameLogged(D, T, g3)) === null);
    check("Undo refuses once Bo logged it", (await undoTableResult(A, T, g3)) === "logged");
    check("and the result stands", (await rowsOf(T)) === 3);

    // 3. The race: a log holds its transaction open past its table read; the Undo that starts meanwhile waits for it,
    // then sees the log. Without the log's share lock the Undo deletes the result under it.
    const g4 = await game();
    const pre = await tablePrefill(A, T, deckA);
    if (!pre) throw new Error("no prefill");
    let undo: Promise<string> | null = null;
    const logging = db.transaction(async (tx) => {
      await resolveTableSeatsIn(tx, A, pre.table, [2, 3]);
      undo = undoTableResult(A, T, g4);
      await sleep(1500);
      await tx.execute(sql`insert into deck_games (deck_id, user_id, result, pod_size, played_at, rule_zero_table_id) values (${deckA}, ${A}, 'loss', 3, now(), ${T})`);
    });
    await logging;
    const raced = await (undo as unknown as Promise<string>);
    check("the Undo racing a log waits for it and answers logged", raced === "logged", raced);
    check("the logged game's result stands", (await rowsOf(T)) === 3);
  } finally {
    const who = sql`(${A}, ${B}, ${C}, ${D})`;
    await db.execute(sql`delete from rule_zero_tables where set_by in ${who}`);
    await db.execute(sql`delete from deck_games where user_id in ${who}`);
    await db.execute(sql`delete from decks where user_id in ${who}`);
    await db.execute(sql`delete from pods where owner_user_id in ${who}`);
    await db.execute(sql`delete from friend_links where user_id in ${who} or friend_user_id in ${who}`);
    await db.execute(sql`delete from friend_invites where inviter_user_id in ${who}`);
    await db.execute(sql`delete from social_profiles where user_id in ${who}`);
    await db.execute(sql`delete from user_data_stamps where user_id in ${who}`);
  }
  console.log(failed === 0 ? "\nall checks passed" : `\n${failed} check(s) failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
