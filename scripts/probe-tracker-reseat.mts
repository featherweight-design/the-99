// Proves the life tracker's ruling (b) against a real database: a game started on a table, reseated mid-game and then
// saved logs from the seats it was PLAYED at. The Start roster (`tableRoster`, sealed) carries the seats through the
// reseat; the save takes it from a Start player still at the table and refuses anyone else; the reseat keeps the
// stored result; and the deck page's prefill and the log's save both read the result's seats (`logSeatsIn`), so the
// log names the Start players, at their Start seats, with their Start decks, and the save resolves the same seats.
// On main this fails: the reseat drops the result and the save refuses the pre-reseat roster.
//
// It WRITES, so it refuses staging, production and local-dev by `neon.branch_id` (`assertScratchBranch`): run it on a
// scratch branch made from local-dev. Its accounts are made-up per-run ids, and it removes every row it wrote, in a
// finally. Without `INVITE_CODE_SECRET` in the environment it seals under a per-run key.
//
//   PROBE_DATABASE_URL='<scratch branch url>' pnpm probe:tracker-reseat
import "./lib/env.mjs";
import { randomBytes } from "node:crypto";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

let failed = 0;
const run = Date.now().toString(36);
const ZONE = "America/Los_Angeles";
const id = (k: string) => `probe_trr_${k}_${run}`;
const [A, B, C, D] = ["a", "b", "c", "d"].map(id);
const txt = (v: unknown) => (typeof v === "string" ? v : (v as { $tp?: string } | null | undefined)?.$tp);
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

async function main() {
  // The env file wins over the shell (`env.mjs`), so the scratch branch comes in as PROBE_DATABASE_URL, which it never sets.
  if (process.env.PROBE_DATABASE_URL) process.env.DATABASE_URL = process.env.PROBE_DATABASE_URL;
  if (!/^[0-9a-f]{64,}$/i.test(process.env.INVITE_CODE_SECRET ?? "")) process.env.INVITE_CODE_SECRET = randomBytes(32).toString("hex");
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: branch } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  assertScratchBranch(branch[0]?.b ?? null, "probe:tracker-reseat");

  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const rz = await import("../src/lib/social/rule-zero");
  const { tableRoster, saveTableResult } = await import("../src/lib/social/rule-zero-result");
  const { tablePrefill, resolveTableSeatsIn } = await import("../src/lib/social/rule-zero-log");

  const seat = (member: string, deck: string | null = null) => ({ member, deck });
  const seatsAt = async (tableId: string) =>
    (await db.execute<{ user_id: string; seat: number }>(sql`select user_id, seat from rule_zero_seats where table_id = ${tableId} order by seat`)).rows;

  try {
    const { rows: picks } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where commander_legal and type_line like 'Legendary Creature%' order by oracle_id limit 1`);
    const CMD = picks[0].oracle_id;
    const pub: Record<string, string> = {};
    for (const [u, name] of [[A, "Ava"], [B, "Bo"], [C, "Cy"], [D, "Di"]] as const) pub[u] = (await friends.ensureProfile(u, name)).publicId;
    for (const u of [B, C, D]) {
      const t = await friends.createInvite(A);
      if (!t.ok) throw new Error("createInvite refused");
      await friends.redeemInvite(u, t.token);
    }
    const p = await pods.createPod(A, "Tracker night");
    if (!p) throw new Error("createPod refused");
    for (const m of [B, C, D]) await pods.addMember(A, p.id, pub[m]);
    const deck = async (u: string, name: string) =>
      (await db.execute<{ id: string }>(sql`insert into decks (user_id, name, commander_oracle_id) values (${u}, ${name}, ${CMD}) returning id`)).rows[0].id;
    const deckA = await deck(A, "Ava's deck");
    const deckB = await deck(B, "Bo's deck");
    const deckC = await deck(C, "Cy's deck");

    // Start: Ava 1, Bo 2, Cy 3, each with a deck. The tracker page seals this roster for Ava.
    const set = await rz.setTable(A, p.id, [seat(pub[A], deckA), seat(pub[B], deckB), seat(pub[C], deckC)], ZONE);
    if (set.kind !== "set") throw new Error(`setTable ${set.kind}`);
    const T = set.tableId;
    const roster = (await tableRoster(A, T))?.roster ?? null;
    check("the tracker page gets a sealed roster, no account id in it", typeof roster === "string" && !roster.includes(A) && !roster.includes("probe_"));
    check("a non-seated pod member gets none", (await tableRoster(D, T)) === null);

    // Mid-game, the setter reseats: Bo 1, Ava 2, Di 3 with no deck; Cy leaves the table.
    const reseat = await rz.reseatTable(A, T, [seat(pub[B], deckB), seat(pub[A], deckA), seat(pub[D])]);
    check("the reseat lands", reseat.kind === "reseated", JSON.stringify(reseat));
    check("the table's seats moved", (await seatsAt(T)).map((s) => `${s.seat}:${s.user_id}`).join() === `1:${B},2:${A},3:${D}`);

    // Bo won at Start seat 2, Ava second at seat 1, Cy third at seat 3.
    const placements = [{ seat: 1, place: 2 }, { seat: 2, place: 1 }, { seat: 3, place: 3 }];
    check("Di, seated now but not in the Start roster, cannot save it", (await saveTableResult(D, T, roster, placements)) === "refused");
    check("a roster sealed for another table refuses", (await saveTableResult(A, "7a0e0000-0000-4000-8000-0000000000ff", roster, placements)) === "refused");
    check("an altered roster refuses", (await saveTableResult(A, T, `${roster}x`.slice(1), placements)) === "refused");
    check("placements for a seat the roster lacks refuse", (await saveTableResult(A, T, roster, [{ seat: 1, place: 1 }, { seat: 2, place: 2 }, { seat: 4, place: 3 }])) === "refused");
    check("Ava, a Start player still seated, saves after the reseat", (await saveTableResult(A, T, roster, placements)) === "saved");
    const stored = (await db.execute<{ user_id: string; seat: number; place: number; deck_id: string | null }>(sql`
      select user_id, seat, place, deck_id from rule_zero_result_seats where table_id = ${T} order by seat`)).rows;
    check("the result stores the Start seats, accounts and decks", stored.map((r) => `${r.seat}:${r.user_id}:${r.place}:${r.deck_id}`).join() === `1:${A}:2:${deckA},2:${B}:1:${deckB},3:${C}:3:${deckC}`);

    // Another reseat after the save keeps the result.
    await rz.reseatTable(A, T, [seat(pub[A], deckA), seat(pub[B], deckB), seat(pub[D])]);
    check("a reseat after the save keeps the result", stored.length === 3 && (await db.execute<{ n: number }>(sql`select count(*)::int as n from rule_zero_result_seats where table_id = ${T}`)).rows[0].n === 3);

    // Ava's log prefill: the Start seats, not the table's new ones.
    const pre = await tablePrefill(A, T, deckA);
    const others = pre?.seats.map((s) => `${s.seat}:${txt(s.name)}:${txt(s.deckName)}`).join();
    check("the prefill names the Start players at their Start seats with their Start decks", others === "2:Bo:Bo's deck,3:Cy:Cy's deck", others);
    check("the prefill carries Bo's win at his Start seat", JSON.stringify(pre?.result) === JSON.stringify({ viewer: "loss", winnerSeat: 2 }), JSON.stringify(pre?.result));
    check("the prefill's pod size is the game's", pre?.podSize === 3);
    const resolved = pre ? await db.transaction((tx) => resolveTableSeatsIn(tx, A, pre.table, [2, 3])) : null;
    check("the save resolves the same seats the prefill drew", JSON.stringify(resolved?.seats.map((r) => (r.kind === "friend" ? r.deck : null))) === JSON.stringify([deckB, deckC]), JSON.stringify(resolved));

    // Bo's own prefill: he is seated now, played, and gets the win.
    const preB = await tablePrefill(B, T, deckB);
    check("Bo's prefill is his win", JSON.stringify(preB?.result) === JSON.stringify({ viewer: "win", winnerSeat: null }), JSON.stringify(preB?.result));
    // Cy played but has left the table: no prefill, and their roster no longer saves.
    check("Cy, off the table now, gets no prefill", (await tablePrefill(C, T, deckC)) === null);

    // Once Ava logs a game from the table, her prefill falls back to the live seats with no result.
    await db.execute(sql`insert into deck_games (deck_id, user_id, result, pod_size, played_at, rule_zero_table_id) values (${deckA}, ${A}, 'loss', 3, now(), ${T})`);
    const after = await tablePrefill(A, T, deckA);
    check("after Ava logs it, her prefill reads the live seats and no result", after?.result === null && after.seats.map((s) => s.seat).join() === "2,3" && txt(after.seats[1].name) === "Di", JSON.stringify(after?.seats.map((s) => [s.seat, txt(s.name)])));

    // A newer game's roster replaces the result; the first game's roster, older than it, then refuses.
    await new Promise((r) => setTimeout(r, 5));
    const newer = (await tableRoster(A, T))?.roster ?? null;
    const three = [{ seat: 1, place: 1 }, { seat: 2, place: 2 }, { seat: 3, place: 3 }];
    check("a newer game's roster saves over the result", newer !== null && (await saveTableResult(A, T, newer, three)) === "saved");
    check("the first game's roster, older than the stored result, refuses", (await saveTableResult(A, T, roster, placements)) === "refused");
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
