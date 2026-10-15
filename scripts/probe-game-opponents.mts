// Proves opponents in the game log (social scope §4, Feature C) against a real database: what a friend's
// decks and a pod's quick-seat offer, and to whom; that a game's seats are written in the game's own
// transaction with the friend's facts SNAPSHOT, and that a seat which does not resolve (a stranger, a forged
// id, someone else's deck, a former friend) refuses the whole log and leaves no game behind; that the
// snapshot outlives a rename, a deleted deck and an unfriend; that the friendship is held until the game
// commits, so an unfriend racing a log waits for it; the matchup cells over the read; the cascade with the
// game; and the table's own checks.
//
// It drives the write path through `resolveOpponentsIn` and `insertOpponentsIn`, in the order `logGame` runs them in its transaction
// (the action itself needs a signed-in request), after the same `parseOpponents` and catalog check.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL`
// reports, and never staging, production or local-dev. Its accounts are made-up ids, and it removes every
// row it wrote, in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:game-opponents
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const V = `probe_opp_v_${run}`; // the player logging games
const F = `probe_opp_f_${run}`; // a friend
const S = `probe_opp_s_${run}`; // a stranger to V (a friend of F)
const W = `probe_opp_w_${run}`; // a player whose account is deleted while a log of theirs is open

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:game-opponents: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:game-opponents: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:game-opponents: database reports ${rows[0]?.b}, not ${named}`);

  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const { listFriendDecks, listPodSeats } = await import("../src/lib/social/games");
  const opp = await import("../src/lib/decks/game-opponents");
  const { listDeckGames } = await import("../src/lib/decks/games");
  const { searchOpponentCommanders } = await import("../src/lib/decks/opponent-commanders");
  const { loadDeckOpponents } = await import("../src/lib/decks/deck-opponents-read");
  const { summarizeMatchups } = await import("../src/lib/decks/matchups");
  const { purgeAccount } = await import("../src/lib/account/purge");

  const befriend = async (a: string, b: string) => {
    const t = await friends.createInvite(a);
    if (!t.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(b, t.token);
  };
  const games = async (deckId: string) =>
    (await db.execute<{ n: number }>(sql`select count(*)::int as n from deck_games where deck_id = ${deckId}`)).rows[0].n;
  /** One log, as `logGame` runs it: the shape, the catalog, then the game and its seats in one transaction. */
  const log = async (viewer: string, deckId: string, result: "win" | "loss" | "draw", raw: unknown): Promise<string | null> => {
    const parsed = opp.parseOpponents(raw, { podSize: 4, result });
    if (parsed === null || !(await opp.opponentCommandersValid(parsed))) return null;
    try {
      return await db.transaction(async (tx) => {
        const facts = await opp.resolveOpponentsIn(tx, viewer, parsed);
        const { rows: g } = await tx.execute<{ id: string }>(sql`
          insert into deck_games (deck_id, user_id, result, pod_size) values (${deckId}, ${viewer}, ${result}, 4) returning id`);
        await opp.insertOpponentsIn(tx, g[0].id, parsed, facts);
        return g[0].id;
      });
    } catch (err) {
      if (err instanceof opp.SeatRefused) return null;
      throw err;
    }
  };

  try {
    const { rows: picks } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where commander_legal and type_line like 'Legendary Creature%'
        and oracle_text not ilike '%partner%' order by oracle_id limit 3`);
    const [C1, C2, C3] = picks.map((r) => r.oracle_id);
    const { rows: plain } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where type_line like 'Instant%' order by oracle_id limit 1`);
    const NOT_A_COMMANDER = plain[0].oracle_id;

    await friends.ensureProfile(V, "Vic");
    const f = await friends.ensureProfile(F, "Fay");
    const s = await friends.ensureProfile(S, "Sid");
    await befriend(V, F);
    // S is F's friend and not V's, so a read that lost its viewer predicate would find S through F.
    await befriend(F, S);
    const pod = await pods.createPod(V, "Thursday");
    if (!pod) throw new Error("createPod refused");
    await pods.addMember(V, pod.id, f.publicId);

    const deck = async (u: string, name: string, cmd: string) =>
      (await db.execute<{ id: string }>(sql`
        insert into decks (user_id, name, commander_oracle_id) values (${u}, ${name}, ${cmd}) returning id`)).rows[0].id;
    const mine = await deck(V, "Vic's deck", C1);
    const fay1 = await deck(F, "Fay's first", C2);
    const fay2 = await deck(F, "Fay's second", C3);
    const sids = await deck(S, "Sid's deck", C3);

    // The offers.
    const offered = await listFriendDecks(V, f.publicId);
    check("a friend's decks are offered, by name and commander", offered.length === 2
      && offered.some((d) => d.deckId === fay1 && d.name === "Fay's first" && d.commanderOracleId === C2), JSON.stringify(offered));
    check("and carry no owner id", !JSON.stringify(offered).includes(F));
    check("a stranger's decks are not", (await listFriendDecks(V, s.publicId)).length === 0);
    const v = await friends.ensureProfile(V, "Vic");
    check("nor are V's decks to S, who is a friend of V's friend", (await listFriendDecks(S, v.publicId)).length === 0);
    check("a forged id reads nothing", (await listFriendDecks(V, "00000000-0000-4000-8000-000000000000")).length === 0);
    const seated = await listPodSeats(V, pod.id);
    check("a pod seats its other members who are friends, with their decks", seated.length === 1
      && seated[0].publicId === f.publicId && seated[0].decks.length === 2, JSON.stringify(seated));
    check("a pod the reader is not in seats nobody", (await listPodSeats(S, pod.id)).length === 0);
    // F's own pod holds V and S, who are not friends: V is offered F, never S.
    const fays = await pods.createPod(F, "Fay's table");
    if (!fays) throw new Error("createPod refused");
    await pods.addMember(F, fays.id, (await friends.ensureProfile(V, "Vic")).publicId);
    await pods.addMember(F, fays.id, s.publicId);
    const fromFays = await listPodSeats(V, fays.id);
    check("a pod seats only its members who are the reader's friends", fromFays.length === 1 && fromFays[0].publicId === f.publicId,
      JSON.stringify(fromFays.map((x) => x.displayName)));

    // The "anyone" seat's commander search (R3 PR 1): the whole catalog, no owned filter, only what can lead a deck.
    const { rows: named } = await db.execute<{ name: string }>(sql`select name from cards where oracle_id = ${C1}`);
    const wanted = named[0].name;
    const hits = await searchOpponentCommanders(wanted);
    const hit = hits.find((h) => h.oracleId === C1);
    check("the search finds a commander V does not own, by name", hit !== undefined && hit.name === wanted, JSON.stringify(hits.map((h) => h.name)));
    check("a hit carries its identity in WUBRG order, its cost and a partner reading",
      hit !== undefined && Array.isArray(hit.colorIdentity) && "partner" in hit && "manaCost" in hit && "imageUri" in hit);
    const { rows: plainName } = await db.execute<{ name: string }>(sql`select name from cards where oracle_id = ${NOT_A_COMMANDER}`);
    check("a card that cannot lead a deck is never offered", !(await searchOpponentCommanders(plainName[0].name)).some((h) => h.oracleId === NOT_A_COMMANDER));
    // A legendary land passes the search's SQL narrowing (it is legendary) and fails `isCommanderCandidate` (not a
    // creature, and no "can be your commander" text): only the final filter keeps it out.
    const { rows: land } = await db.execute<{ oracle_id: string; name: string }>(sql`
      select oracle_id, name from cards where commander_legal and type_line like 'Legendary Land%'
        and oracle_text not ilike '%can be your commander%' order by oracle_id limit 1`);
    check("a legendary land is found by the SQL and still never offered", land.length === 1
      && !(await searchOpponentCommanders(land[0].name)).some((h) => h.oracleId === land[0].oracle_id), land[0]?.name);
    check("a one-letter query, a non-string and a LIKE wildcard offer nothing",
      (await searchOpponentCommanders("a")).length === 0 && (await searchOpponentCommanders(42)).length === 0
      && (await searchOpponentCommanders("%%")).length === 0);
    check("the page is capped", (await searchOpponentCommanders("ar")).length <= 8);
    // A broad query matches thousands of cards, nearly all of them not commanders: the window must be filled with
    // commanders, not arbitrary matches, and be the same on every call.
    // "goblin" matches hundreds of non-legendary cards and read 0 commanders when the window was cut before the narrowing.
    const broad = await searchOpponentCommanders("goblin");
    check("a broad query still offers commanders, the same ones every call", broad.length === 8
      && JSON.stringify(broad.map((h) => h.oracleId)) === JSON.stringify((await searchOpponentCommanders("goblin")).map((h) => h.oracleId)),
      String(broad.length));
    const lead = await searchOpponentCommanders("nissa");
    check("a name that starts with the query leads", lead.length > 0 && lead[0].name.toLowerCase().startsWith("nissa"), lead[0]?.name);

    // The write path.
    const g1 = await log(V, mine, "loss", [{ friend: f.publicId, deck: fay1, won: true }, { commander: C3, label: "Sam" }]);
    check("a loss logs with a friend's deck and a stranger by commander", g1 !== null);
    const read = await opp.listGameOpponents(mine, V);
    const seats = read.get(g1!) ?? [];
    check("seat 1 is Fay's first, snapshot, and she won", seats[0]?.seat === 1 && seats[0].friend?.name === "Fay"
      && seats[0].deckName === "Fay's first" && seats[0].commander?.oracleId === C2 && seats[0].won, JSON.stringify(seats[0]));
    check("seat 2 is Sam, by commander", seats[1]?.seat === 2 && seats[1].label === "Sam" && seats[1].commander?.oracleId === C3 && !seats[1].won);
    check("the read carries no account id", !JSON.stringify([...read.values()]).includes(F));
    const g2 = await log(V, mine, "win", [{ friend: f.publicId }]);
    check("a friend seats with no deck known", g2 !== null && (await opp.listGameOpponents(mine, V)).get(g2!)?.[0].friend?.name === "Fay");

    // The deck page's read (R3 PR 1): the seats and the matchups, behind the switch, never throwing.
    const ON = { SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_GAMES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    const played = await listDeckGames(mine, V);
    const loaded = await loadDeckOpponents(mine, V, played, ON);
    check("the deck read gives each game's seats and a matchup summary", loaded !== null
      && loaded.opponents.get(g1!)?.length === 2 && loaded.matchups.games === played.length && loaded.matchups.recorded === 2,
      JSON.stringify(loaded?.matchups.recorded));
    check("another player's deck id reads no seats", (await loadDeckOpponents(mine, S, played, ON))?.opponents.size === 0);
    check("with the switch off the read is null and reads nothing", (await loadDeckOpponents(mine, V, played, {} as NodeJS.ProcessEnv)) === null);
    check("a failing read is null, not a throw", (await loadDeckOpponents(mine, V, played, ON, async () => { throw new Error("down"); })) === null);

    const before = await games(mine);
    check("a stranger cannot be seated, and no game is left behind",
      (await log(V, mine, "win", [{ friend: s.publicId }])) === null && (await games(mine)) === before);
    check("nor a friend with a stranger's deck", (await log(V, mine, "win", [{ friend: f.publicId, deck: sids }])) === null && (await games(mine)) === before);
    check("nor a forged friend", (await log(V, mine, "win", [{ friend: "00000000-0000-4000-8000-000000000000" }])) === null);
    check("nor a card that cannot lead a deck", (await log(V, mine, "win", [{ commander: NOT_A_COMMANDER }])) === null);
    check("nor a winner on a win", (await log(V, mine, "win", [{ label: "Sam", won: true }])) === null);
    check("nor four opponents in a pod of four", (await log(V, mine, "loss", [{ label: "a" }, { label: "b" }, { label: "c" }, { label: "d" }])) === null);
    check("nothing refused wrote a game", (await games(mine)) === before);

    // The snapshot outlives the friend's own changes.
    await db.execute(sql`update decks set name = 'Renamed' where id = ${fay1}`);
    await friends.setDisplayName(F, "Fiona");
    await db.execute(sql`delete from decks where id = ${fay1}`);
    const after = (await opp.listGameOpponents(mine, V)).get(g1!)?.[0];
    check("a renamed, then deleted, deck and a renamed friend leave the record as it was",
      after?.friend?.name === "Fay" && after.deckName === "Fay's first" && after.commander?.oracleId === C2, JSON.stringify(after));
    const { rows: link } = await db.execute<{ d: string | null; f: string | null }>(sql`
      select friend_deck_id as d, friend_user_id as f from deck_game_opponents where game_id = ${g1} and seat = 1`);
    check("the deleted deck's link went null, the friend's stands", link[0]?.d === null && link[0]?.f === F);

    // The friendship is held until the game commits: an unfriend racing a log waits for it.
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let wrote!: () => void;
    const written = new Promise<void>((r) => { wrote = r; });
    const parsed = opp.parseOpponents([{ friend: f.publicId, deck: fay2 }], { podSize: 4, result: "draw" })!;
    let heldGame = "";
    const holding = db.transaction(async (tx) => {
      const facts = await opp.resolveOpponentsIn(tx, V, parsed);
      const { rows: g } = await tx.execute<{ id: string }>(sql`
        insert into deck_games (deck_id, user_id, result, pod_size) values (${mine}, ${V}, 'draw', 4) returning id`);
      heldGame = g[0].id;
      await opp.insertOpponentsIn(tx, heldGame, parsed, facts);
      wrote();
      await gate;
    });
    await written;
    let unfriended = false;
    const leaving = friends.unfriend(F, v.publicId).then((r) => { unfriended = true; return r; });
    await sleep(800);
    check("an unfriend racing a log waits for the log to commit", !unfriended);
    release();
    await holding;
    check("then goes through", (await leaving) === true);
    check("and the raced game's seat stands", (await opp.listGameOpponents(mine, V)).get(heldGame)?.[0].deckName === "Fay's second");

    const count = await games(mine);
    check("a former friend cannot be seated", (await log(V, mine, "win", [{ friend: f.publicId }])) === null && (await games(mine)) === count);
    check("nor offered", (await listFriendDecks(V, f.publicId)).length === 0);
    // Three seats of one friend: two logged as Fay, one after the rename as Fiona, one person throughout.
    const theirs = [...(await opp.listGameOpponents(mine, V)).values()].flat().filter((x) => x.friend !== null);
    check("and every past seat of theirs stands, under the name each was logged with", theirs.length === 3
      && new Set(theirs.map((x) => x.friend!.key)).size === 1
      && theirs.map((x) => x.friend!.name).sort().join() === "Fay,Fay,Fiona", JSON.stringify(theirs.map((x) => x.friend)));

    // The matchups over the real read.
    const m = summarizeMatchups(await listDeckGames(mine, V), await opp.listGameOpponents(mine, V));
    check("matchups: one friend across her decks and her rename, 3 games, beat me once",
      m.friends.length === 1 && m.friends[0].summary.count === 3 && m.friends[0].beatMe === 1, JSON.stringify(m.friends));
    check("matchups: every game recorded", m.games === 3 && m.recorded === 3, `${m.games} ${m.recorded}`);
    check("matchups: C3 in two games (Sam's, and Fay's second)", m.commanders.find((c) => c.commander.oracleId === C3)?.summary.count === 2);

    // A log racing its own account's deletion: the log holds W's friendship (taken first) and W's deck (by
    // the game insert), the purge wants both in that order, so it waits for the log and then removes it all.
    await friends.ensureProfile(W, "Wen");
    await befriend(W, F);
    const wens = await deck(W, "Wen's deck", C1);
    let releaseW!: () => void;
    const gateW = new Promise<void>((r) => { releaseW = r; });
    let wroteW!: () => void;
    const writtenW = new Promise<void>((r) => { wroteW = r; });
    const seatF = opp.parseOpponents([{ friend: f.publicId }], { podSize: 4, result: "win" })!;
    const logging = db.transaction(async (tx) => {
      const facts = await opp.resolveOpponentsIn(tx, W, seatF);
      const { rows: g } = await tx.execute<{ id: string }>(sql`
        insert into deck_games (deck_id, user_id, result, pod_size) values (${wens}, ${W}, 'win', 4) returning id`);
      await opp.insertOpponentsIn(tx, g[0].id, seatF, facts);
      wroteW();
      await gateW;
    });
    await writtenW;
    let purged = false;
    const purging = purgeAccount(W).then((r) => { purged = true; return r; });
    await sleep(800);
    check("a purge racing its account's own open log waits for it", !purged);
    releaseW();
    const raced = await Promise.allSettled([logging, purging]);
    check("and both finish, with no deadlock", raced.every((r) => r.status === "fulfilled"),
      JSON.stringify(raced.map((r) => (r.status === "rejected" ? String((r.reason as Error).message) : "ok"))));
    const { rows: left } = await db.execute<{ n: number }>(sql`select count(*)::int as n from deck_games where user_id = ${W}`);
    check("the purge took the raced game with the account", left[0].n === 0);

    // The table's own checks, and the cascade.
    const refused = async (q: ReturnType<typeof sql>) => db.execute(q).then(() => false, () => true);
    check("a seat past 7 is refused", await refused(sql`insert into deck_game_opponents (game_id, seat, label) values (${g1}, 8, 'x')`));
    check("a seat naming nobody is refused", await refused(sql`insert into deck_game_opponents (game_id, seat) values (${g1}, 3)`));
    check("a partner with no commander is refused", await refused(sql`
      insert into deck_game_opponents (game_id, seat, partner_oracle_id, label) values (${g1}, 3, ${C1}, 'x')`));
    check("a label over 30 is refused", await refused(sql`insert into deck_game_opponents (game_id, seat, label) values (${g1}, 3, ${"x".repeat(31)})`));
    await db.execute(sql`delete from deck_games where id = ${g1}`);
    const { rows: gone } = await db.execute<{ n: number }>(sql`select count(*)::int as n from deck_game_opponents where game_id = ${g1}`);
    check("a deleted game takes its seats", gone[0].n === 0);
  } finally {
    const who = sql`(${V}, ${F}, ${S}, ${W})`;
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
