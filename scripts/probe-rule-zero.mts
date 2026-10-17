// Proves Rule 0's data (plan `docs/superpowers/plans/2026-10-16-rule-zero.md` §PR 2a) against a real database:
// setup's one open table per pod, under three concurrent setups too; its refusals; what a seated player, an unseated
// member and a member who left the pod read; a seat's own deck and `on delete set null`; `markSeen` keeping a swap
// that landed after its snapshot; the setter's reseat; Home's read dropping a table the moment it expires, with no
// write between the two reads; and the account purge removing all three tables' rows and closing a table it leaves
// with one seat.
//
// It WRITES, so it refuses staging, production and local-dev by `neon.branch_id` (`assertScratchBranch`): run it on a
// scratch branch made from local-dev. Its accounts are made-up per-run ids, and it removes every row it wrote, in a
// finally.
//
//   pnpm probe:rule-zero
import "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const run = Date.now().toString(36);
const id = (k: string) => `probe_rz_${k}_${run}`;
const [A, B, C, D, E, X] = ["a", "b", "c", "d", "e", "x"].map(id);

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: branch } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  assertScratchBranch(branch[0]?.b ?? null, "probe:rule-zero");

  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const rz = await import("../src/lib/social/rule-zero");
  const { loadHomeTables } = await import("../src/lib/social/rule-zero-home");
  const { purgeAccount } = await import("../src/lib/account/purge");
  const { loadTable, readOnTheSpot } = await import("../src/lib/social/rule-zero-table");
  const { readCatalogGeneration } = await import("../src/lib/cache/catalog-generation");
  const { loadDeckProfile } = await import("../src/lib/profile/load");
  const { computeAndStoreProfile } = await import("../src/lib/profile/stored");
  // The uncached builds (`unstable_cache` raises outside a request), under the owner's resolved switches.
  const ownerDeps = (env: NodeJS.ProcessEnv) => ({
    generation: readCatalogGeneration,
    compute: (deckId: string, userId: string) => loadDeckProfile(deckId, userId, env),
    env,
  });

  const befriend = async (a: string, b: string) => {
    const t = await friends.createInvite(a);
    if (!t.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(b, t.token);
  };
  const seat = (member: string, deck: string | null = null) => ({ member, deck });
  const seatsOf = async (tableId: string) =>
    (await db.execute<{ user_id: string; seat: number; deck_id: string | null; changed_at: Date }>(sql`
      select user_id, seat, deck_id, changed_at from rule_zero_seats where table_id = ${tableId} order by seat`)).rows;
  const count = async (q: ReturnType<typeof sql>) => (await db.execute<{ n: number }>(q)).rows[0].n;

  try {
    const { rows: picks } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where commander_legal and type_line like 'Legendary Creature%' order by oracle_id limit 1`);
    const CMD = picks[0].oracle_id;
    const pub: Record<string, string> = {};
    for (const [u, name] of [[A, "Ava"], [B, "Bo"], [C, "Cy"], [D, "Di"], [E, "Ed"], [X, "Xi"]] as const) {
      pub[u] = (await friends.ensureProfile(u, name)).publicId;
    }
    // A is everyone's friend; nobody else is anybody's, so B and C are pod-mates who are not friends.
    for (const u of [B, C, D, E, X]) await befriend(A, u);
    const pod = async (owner: string, name: string, members: string[]) => {
      const p = await pods.createPod(owner, name);
      if (!p) throw new Error("createPod refused");
      for (const m of members) await pods.addMember(owner, p.id, pub[m]);
      return p.id;
    };
    const deck = async (u: string, name: string) =>
      (await db.execute<{ id: string }>(sql`
        insert into decks (user_id, name, commander_oracle_id) values (${u}, ${name}, ${CMD}) returning id`)).rows[0].id;
    const deckA = await deck(A, "Ava's deck");
    const deckB = await deck(B, "Bo's deck");
    const deckB2 = await deck(B, "Bo's other deck");
    const deckC = await deck(C, "Cy's deck");

    const P1 = await pod(A, "Thursday", [B, C, D]);

    // Setup podSetupMembers: B sees A (friend with decks), C (not B's friend: picks their own), D likewise.
    const forB = await rz.podSetupMembers(B, P1);
    const kindOf = (u: string) => forB.find((m) => m.publicId === pub[u])?.kind;
    check("setup lists the pod for a member, the viewer as you", kindOf(B) === "you" && forB.length === 4, forB.map((m) => m.kind).join(","));
    check("a friend with decks reads hasDecks, a non-friend picksOwn", kindOf(A) === "hasDecks" && kindOf(C) === "picksOwn");
    check("D (A's friend, no deck) reads noDecks to A", (await rz.podSetupMembers(A, P1)).find((m) => m.publicId === pub[D])?.kind === "noDecks");
    check("setup lists nothing for a non-member", (await rz.podSetupMembers(E, P1)).length === 0);

    // The refusals, before any table exists.
    check("refuses a viewer not in the pod", (await rz.setTable(E, P1, [seat(pub[E]), seat(pub[A])])).kind === "refused");
    check("refuses a seat who is not a member", JSON.stringify(await rz.setTable(A, P1, [seat(pub[A]), seat(pub[E])])) === JSON.stringify({ kind: "refused", reason: "notMember" }));
    check("refuses a setup the viewer does not sit in", JSON.stringify(await rz.setTable(A, P1, [seat(pub[B]), seat(pub[C])])) === JSON.stringify({ kind: "refused", reason: "notSeated" }));
    check("refuses a non-friend's deck picked for them", JSON.stringify(await rz.setTable(B, P1, [seat(pub[B]), seat(pub[C], deckC)])) === JSON.stringify({ kind: "refused", reason: "deck" }));
    check("refuses another player's deck for the viewer's own seat", JSON.stringify(await rz.setTable(A, P1, [seat(pub[A], deckB), seat(pub[B])])) === JSON.stringify({ kind: "refused", reason: "deck" }));
    check("refuses a friend's deck for a different seat", JSON.stringify(await rz.setTable(A, P1, [seat(pub[A]), seat(pub[B]), seat(pub[C], deckB)])) === JSON.stringify({ kind: "refused", reason: "deck" }));
    check("nothing written by a refusal", (await count(sql`select count(*)::int as n from rule_zero_tables where pod_id = ${P1}`)) === 0);

    // The table: A seats A (own deck), B (friend's deck), C (friend's deck). D is in the pod and not seated.
    const set = await rz.setTable(A, P1, [seat(pub[A], deckA), seat(pub[B], deckB), seat(pub[C], deckC)]);
    check("A sets the table", set.kind === "set");
    const T1 = set.kind === "set" ? set.tableId : "";
    const s1 = await seatsOf(T1);
    check("seats written in order with the picked decks", s1.map((s) => `${s.seat}:${s.deck_id}`).join() === `1:${deckA},2:${deckB},3:${deckC}`);
    const { rows: life } = await db.execute<{ h: number }>(sql`select extract(epoch from expires_at - created_at)::int / 3600 as h from rule_zero_tables where id = ${T1}`);
    check("the table closes 24 hours after it is set", life[0].h === 24);
    const againB = await rz.setTable(B, P1, [seat(pub[B]), seat(pub[A])]);
    check("a seated player's setup opens the existing table", againB.kind === "open" && againB.tableId === T1);
    const againD = await rz.setTable(D, P1, [seat(pub[D]), seat(pub[A])]);
    check("an unseated member's setup is occupied, by Ava", againD.kind === "occupied" && againD.setBy === "Ava", JSON.stringify(againD));
    check("still one table on the pod", (await count(sql`select count(*)::int as n from rule_zero_tables where pod_id = ${P1}`)) === 1);

    // The reads: a seated non-friend sees the table and its faces, an unseated member sees nothing.
    const forC = await rz.openTablesFor(C);
    check("a seated non-friend reads the table, all three faces", forC.length === 1 && forC[0].seats.map((s) => s.displayName).join() === "Ava,Bo,Cy");
    check("the payload names no account or deck id", !JSON.stringify(forC).includes(B) && !JSON.stringify(forC).includes(deckB));
    check("an unseated member reads no table", (await rz.openTablesFor(D)).length === 0);
    check("Home's read lists the table for its setter", (await loadHomeTables(A)).some((t) => t.tableId === T1 && t.setByYou));

    // A seat's own deck.
    check("C clears their own deck", (await rz.setSeatDeck(C, T1, null)) === "set");
    check("the same deck again writes nothing", (await rz.setSeatDeck(C, T1, null)) === "unchanged");
    check("C cannot seat A's deck", (await rz.setSeatDeck(C, T1, deckA)) === "refused");
    check("an unseated member cannot seat a deck", (await rz.setSeatDeck(D, T1, null)) === "refused");

    // markSeen keeps a swap that landed after the drawn snapshot.
    const revision = new Date(Math.max(...(await seatsOf(T1)).map((s) => new Date(s.changed_at).getTime())));
    await sleep(20);
    check("B swaps after A's snapshot", (await rz.setSeatDeck(B, T1, deckB2)) === "set");
    check("A marks the snapshot seen", await rz.markSeen(A, T1, revision));
    await rz.markSeen(A, T1, new Date(revision.getTime() - 60_000));
    const { rows: kept } = await db.execute<{ at: Date }>(sql`select seen_at as at from rule_zero_seen where table_id = ${T1} and user_id = ${A}`);
    check("an older acknowledgement never moves it back", new Date(kept[0].at).getTime() === revision.getTime());
    const { rows: seen } = await db.execute<{ dot: boolean }>(sql`
      select s.changed_at > n.seen_at as dot from rule_zero_seats s join rule_zero_seen n on n.table_id = s.table_id and n.user_id = ${A}
      where s.table_id = ${T1} and s.user_id = ${B}`);
    check("B's swap keeps its dot for A", seen[0]?.dot === true);
    check("an unseated member marks nothing", !(await rz.markSeen(D, T1, new Date())));
    // Acknowledging the table as it now stands clears every dot: the stamps round-trip through a Date exactly.
    const latest = new Date(Math.max(...(await seatsOf(T1)).map((s) => new Date(s.changed_at).getTime())));
    await rz.markSeen(A, T1, latest);
    const { rows: dots } = await db.execute<{ n: number }>(sql`
      select count(*)::int as n from rule_zero_seats s join rule_zero_seen n on n.table_id = s.table_id and n.user_id = ${A}
      where s.table_id = ${T1} and s.changed_at > n.seen_at`);
    check("acknowledging the latest revision clears every dot", dots[0].n === 0, `${dots[0].n} left`);

    // A deleted deck leaves its seat waiting.
    await db.execute(sql`delete from decks where id = ${deckB2}`);
    const afterDelete = (await seatsOf(T1)).find((s) => s.user_id === B);
    check("a deleted deck leaves the seat, waiting", afterDelete !== undefined && afterDelete.deck_id === null);

    // The reseat: A drops C and seats D; B keeps their seat's change time and deck.
    await rz.markSeen(C, T1, new Date());
    const bBefore = (await seatsOf(T1)).find((s) => s.user_id === B)!;
    check("only the setter reseats", (await rz.reseatTable(B, T1, [seat(pub[B]), seat(pub[A])])).kind === "refused");
    const reseat = await rz.reseatTable(A, T1, [seat(pub[B], deckC), seat(pub[A], deckA), seat(pub[D])]);
    check("A reseats", reseat.kind === "reseated", JSON.stringify(reseat));
    const s2 = await seatsOf(T1);
    const bAfter = s2.find((s) => s.user_id === B);
    check("a staying seat keeps its deck and change time", bAfter !== undefined && bAfter.deck_id === bBefore.deck_id && new Date(bAfter.changed_at).getTime() === new Date(bBefore.changed_at).getTime());
    check("the new order is written", s2.map((s) => s.user_id).join() === [B, A, D].join());
    check("a player off the table loses their seen row", (await count(sql`select count(*)::int as n from rule_zero_seen where table_id = ${T1} and user_id = ${C}`)) === 0);
    check("a player off the table reads nothing", (await rz.openTablesFor(C)).length === 0);

    // A swap racing the setter's reseat: the table row serializes them, so the swap is never undone by the reseat.
    const deckB3 = await deck(B, "Bo's third deck");
    const [raceReseat, raceSwap] = await Promise.all([
      rz.reseatTable(A, T1, [seat(pub[B]), seat(pub[A], deckA), seat(pub[D])]),
      rz.setSeatDeck(B, T1, deckB3),
    ]);
    const afterRace = (await seatsOf(T1)).find((s) => s.user_id === B);
    check("a swap racing a reseat survives it", raceReseat.kind === "reseated" && raceSwap === "set" && afterRace?.deck_id === deckB3, `${raceReseat.kind} ${raceSwap} ${afterRace?.deck_id}`);
    const stamps = (await seatsOf(T1)).map((s) => new Date(s.changed_at).getTime());
    check("every seat's stamp is distinct", new Set(stamps).size === stamps.length);

    // A member who leaves the pod loses the table, and the others stop seeing their seat.
    await pods.leavePod(D, P1);
    check("a member who left the pod reads no table", (await rz.openTablesFor(D)).length === 0);
    check("the others' faces omit them", (await rz.openTablesFor(A))[0]?.seats.map((s) => s.displayName).join() === "Bo,Ava");

    // Two concurrent setups on a fresh pod: one table, the others answered open or occupied by whether they sit at it.
    const P2 = await pod(A, "Friday", [B, D]);
    const asks: [string, { member: string; deck: string | null }[]][] = [
      [A, [seat(pub[A]), seat(pub[B])]],
      [B, [seat(pub[B]), seat(pub[A])]],
      [D, [seat(pub[D]), seat(pub[A])]],
    ];
    const raced = await Promise.all(asks.map(([u, s]) => rz.setTable(u, P2, s)));
    const winners = raced.filter((r) => r.kind === "set");
    check("concurrent setups write one table", winners.length === 1 && (await count(sql`select count(*)::int as n from rule_zero_tables where pod_id = ${P2}`)) === 1, raced.map((r) => r.kind).join());
    const T2 = winners[0]?.kind === "set" ? winners[0].tableId : "";
    const seatedT2 = new Set((await seatsOf(T2)).map((s) => s.user_id));
    check("the others: open where seated, occupied where not", raced.every((r, i) =>
      r.kind === "set" || (seatedT2.has(asks[i][0]) ? r.kind === "open" && r.tableId === T2 : r.kind === "occupied")), raced.map((r) => r.kind).join());

    // Home's read drops a table the moment it expires, with no write between the two reads.
    const P3 = await pod(A, "Saturday", [B]);
    const { rows: soon } = await db.execute<{ id: string }>(sql`
      insert into rule_zero_tables (pod_id, set_by, expires_at) values (${P3}, ${A}, now() + interval '2 seconds') returning id`);
    const T3 = soon[0].id;
    await db.execute(sql`insert into rule_zero_seats (table_id, user_id, seat) values (${T3}, ${A}, 1), (${T3}, ${B}, 2)`);
    check("a table expiring in 2s is listed before", (await loadHomeTables(A)).some((t) => t.tableId === T3));
    await sleep(2500);
    check("and gone after, with no write between", !(await loadHomeTables(A)).some((t) => t.tableId === T3));
    const P3b = await rz.setTable(A, P3, [seat(pub[A]), seat(pub[B])]);
    check("the pod's next setup deletes its expired table", P3b.kind === "set" && (await count(sql`select count(*)::int as n from rule_zero_tables where id = ${T3}`)) === 0);

    // The table read (PR 2b). A legal deck is 99 Plains under a commander; A is everyone's friend, B and C are not friends.
    const { rows: basics } = await db.execute<{ oracle_id: string; name: string }>(sql`
      select oracle_id, name from cards where name in ('Plains', 'Island') order by name`);
    const ISLAND = basics.find((b) => b.name === "Island")!.oracle_id;
    const PLAINS = basics.find((b) => b.name === "Plains")!.oracle_id;
    const legal = async (u: string, name: string) => {
      const d = await deck(u, name);
      await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${d}, ${PLAINS}, 99)`);
      return d;
    };
    const legalA = await legal(A, "Ava's legal deck");
    const legalB = await legal(B, "Bo's legal deck");
    const legalC = await legal(C, "Cy's legal deck");
    const P7 = await pod(A, "Reading", [B, C, D]);
    const t7 = await rz.setTable(A, P7, [seat(pub[A], legalA), seat(pub[B], legalB), seat(pub[C], legalC)]);
    if (t7.kind !== "set") throw new Error("table fixture refused");
    const T7 = t7.tableId;
    const viewC = await loadTable(C, T7);
    const seatOf = (v: Awaited<ReturnType<typeof loadTable>>, name: string) => v?.seats.find((s) => s.displayName === name);
    check("a seated player reads the table, every seat", viewC !== null && viewC.seats.length === 3);
    check("a non-friend's seat shows their deck by name and no publicId", seatOf(viewC, "Bo")?.deck?.name === "Bo's legal deck" && seatOf(viewC, "Bo")?.publicId === null);
    check("a friend's seat carries their publicId", seatOf(viewC, "Ava")?.publicId === pub[A]);
    check("only the viewer's own seat carries a deck id", seatOf(viewC, "Cy")?.deck?.deckId === legalC && seatOf(viewC, "Bo")?.deck?.deckId === null && seatOf(viewC, "Ava")?.deck?.deckId === null);
    const wire = JSON.stringify(viewC);
    check("the payload names no other account or deck id", ![A, B, legalA, legalB].some((x) => wire.includes(x)));
    check("a legal deck with no reading is unread", seatOf(viewC, "Bo")?.state.kind === "unread");
    check("an unseated member reads null", (await loadTable(D, T7)) === null);
    check("a stranger to the pod reads null", (await loadTable(E, T7)) === null);
    const bSeat = seatOf(viewC, "Bo")!.seat;
    check("C reads B's deck on the spot", (await readOnTheSpot(C, T7, bSeat, ownerDeps)) === "read");
    check("stored as B's reading", (await count(sql`select count(*)::int as n from deck_profiles where deck_id = ${legalB} and user_id = ${B}`)) === 1);
    check("a second read skips", (await readOnTheSpot(A, T7, bSeat, ownerDeps)) === "skipped");
    const afterRead = seatOf(await loadTable(C, T7), "Bo");
    check("the seat is now fresh, with its reading", afterRead?.state.kind === "fresh" && afterRead.value !== null && afterRead.deck?.reading !== null);
    check("one read seat is not enough to compare", (await loadTable(C, T7))?.read.kind === "notEnough");
    check("an unseated member cannot read a seat on the spot", (await readOnTheSpot(D, T7, bSeat, ownerDeps)) === "refused");
    // Stale: the list changes under the reading, still legal. Never recomputed.
    await db.execute(sql`update deck_cards set quantity = 98 where deck_id = ${legalB} and oracle_id = ${PLAINS}`);
    await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${legalB}, ${ISLAND}, 1)`);
    check("a changed list reads stale", seatOf(await loadTable(C, T7), "Bo")?.state.kind === "stale");
    check("a stale reading is never read on the spot", (await readOnTheSpot(C, T7, bSeat, ownerDeps)) === "skipped");
    // Unreadable: an older-version row over a dirty list. Its player analyzes it; nobody else computes it.
    const cSeat = seatOf(viewC, "Cy")!.seat;
    check("A reads C's deck on the spot", (await readOnTheSpot(A, T7, cSeat, ownerDeps)) === "read");
    const twoRead = await loadTable(A, T7);
    check("two read seats make a read, each placed", twoRead?.read.kind === "read" && twoRead.seats.filter((x) => x.read !== null).length === 2, JSON.stringify(twoRead?.read));
    await db.execute(sql`update deck_profiles set profile_version = 1, dirty = true where deck_id = ${legalC}`);
    check("an unreadable older row needs analysis", seatOf(await loadTable(A, T7), "Cy")?.state.kind === "needsAnalysis");
    check("an unreadable older row is never read on the spot", (await readOnTheSpot(A, T7, cSeat, ownerDeps)) === "skipped");
    // Two viewers polling one unread deck at once: one computes, the other does not.
    const legalB2 = await legal(B, "Bo's fresh deck");
    await rz.setSeatDeck(B, T7, legalB2);
    // The first build is held open until the second poll has answered, and every build is counted: with the lock gone
    // both would compute, and `firstReading` alone would still let only one publish.
    let computes = 0;
    let open!: () => void;
    const held = new Promise<void>((r) => { open = r; });
    const counted = (env: NodeJS.ProcessEnv) => {
      const deps = ownerDeps(env);
      return {
        ...deps,
        compute: async (deckId: string, userId: string) => {
          computes += 1;
          if (computes === 1) await held;
          return deps.compute(deckId, userId);
        },
      };
    };
    let firstStarted!: () => void;
    const started = new Promise<void>((r) => { firstStarted = r; });
    const first = readOnTheSpot(A, T7, bSeat, (env) => { firstStarted(); return counted(env); });
    await started;
    const second = await readOnTheSpot(C, T7, bSeat, counted);
    open();
    const firstResult = await first;
    check("two polls at once compute once", second === "busy" && firstResult === "read" && computes === 1, `${firstResult},${second},${computes}`);
    // The owner presses Analyze, then edits, while another player's on-the-spot build runs: the owner's row stands.
    const legalB3 = await legal(B, "Bo's raced deck");
    await rz.setSeatDeck(B, T7, legalB3);
    const racing = (env: NodeJS.ProcessEnv) => {
      const deps = ownerDeps(env);
      return {
        ...deps,
        compute: async (deckId: string, userId: string) => {
          const built = await deps.compute(deckId, userId);
          await computeAndStoreProfile(legalB3, B, ownerDeps(env));
          await db.execute(sql`update deck_profiles set dirty = true where deck_id = ${legalB3}`);
          return built;
        },
      };
    };
    check("a first reading that loses to the owner's press stores nothing", (await readOnTheSpot(A, T7, bSeat, racing)) === "skipped");
    check("the owner's edited reading stands, still dirty", (await count(sql`select count(*)::int as n from deck_profiles where deck_id = ${legalB3} and dirty`)) === 1);
    // A member who leaves the pod loses the table; an expired table reads null.
    await pods.leavePod(C, P7);
    check("a member who left reads null", (await loadTable(C, T7)) === null);
    check("the others no longer see their seat", (await loadTable(A, T7))?.seats.length === 2);
    await db.execute(sql`update rule_zero_tables set expires_at = now() - interval '1 second' where id = ${T7}`);
    check("an expired table reads null", (await loadTable(A, T7)) === null);

    // The purge: X sits at a two-seat table (it closes), set a table (it goes), and sits at a three-seat one (it stays).
    const P4 = await pod(A, "Two", [X]);
    const P5 = await pod(A, "X sets", [B, X]);
    const P6 = await pod(A, "Three", [B, X]);
    const t4 = await rz.setTable(A, P4, [seat(pub[A]), seat(pub[X])]);
    const t5 = await rz.setTable(X, P5, [seat(pub[X]), seat(pub[A]), seat(pub[B])]);
    const t6 = await rz.setTable(A, P6, [seat(pub[A]), seat(pub[B]), seat(pub[X])]);
    if (t4.kind !== "set" || t5.kind !== "set" || t6.kind !== "set") throw new Error("purge fixtures refused");
    // The account's own swap and acknowledgement racing its purge: no deadlock, and nothing of it survives.
    const deckX = await deck(X, "Xi's deck");
    const [raceSwapX, racePurgeX, raceSeenX] = await Promise.allSettled([
      rz.setSeatDeck(X, t6.tableId, deckX),
      purgeAccount(X),
      rz.markSeen(X, t6.tableId, new Date()),
    ]);
    check("a swap and an acknowledgement racing the purge finish", [raceSwapX, racePurgeX, raceSeenX].every((r) => r.status === "fulfilled"),
      [raceSwapX, racePurgeX, raceSeenX].map((r) => (r.status === "rejected" ? String(r.reason) : "ok")).join(" | "));
    check("the purge leaves no seat of the account", (await count(sql`select count(*)::int as n from rule_zero_seats where user_id = ${X}`)) === 0);
    check("the purge leaves no seen row of the account", (await count(sql`select count(*)::int as n from rule_zero_seen where user_id = ${X}`)) === 0);
    check("the purge deletes a table the account set", (await count(sql`select count(*)::int as n from rule_zero_tables where set_by = ${X}`)) === 0);
    check("the purge closes a table it leaves with one seat", (await count(sql`select count(*)::int as n from rule_zero_tables where id = ${t4.tableId}`)) === 0);
    check("a table left with two seats stays", (await seatsOf(t6.tableId)).length === 2);
  } finally {
    const who = sql`(${A}, ${B}, ${C}, ${D}, ${E}, ${X})`;
    await db.execute(sql`delete from rule_zero_tables where set_by in ${who}`);
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
