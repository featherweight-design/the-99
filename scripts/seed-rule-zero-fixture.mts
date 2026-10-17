// Seeds the Rule 0 boards' tables (T1 to T10, needsAnalysis, and one expired table) for the audit account, so
// `/friends/table/[id]` can be photographed by `docs/superpowers/inventories/rule-zero.json` (plan
// `2026-10-16-rule-zero.md`, PR 3). The boards' cast: Colin's pod "Thursday night" with you, Colin (the owner),
// Peter, and Max, who is Colin's friend and not yours.
//
// Every reading is REAL: each fixture deck clones the list of one of the audit account's own decks and is analyzed
// by the shipped build (`computeAndStoreProfile`), so a seat's bracket is whatever `slotDeck` makes of that list.
// The states that are not a fresh reading are made the way the app makes them: a stale seat is a list edited after
// its analysis, an unread seat has no `deck_profiles` row, a needsAnalysis seat is an older-version row over an
// edited list (as `probe:rule-zero` makes one), and an illegal seat is a list of 86 or 100 body cards.
//
// SCRATCH BRANCH ONLY: it names its target and refuses anything else (`assertScratchBranch`). A rerun starts clean.
// The table ids are fixed, so the inventory can name each route.
//   RZ_FIXTURE_BRANCH=br-... RZ_FIXTURE_USER=user_... pnpm tsx scripts/seed-rule-zero-fixture.mts
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
assertScratchBranch(branch[0]?.b, "seed-rule-zero-fixture");

const friends = await import("../src/lib/social/friends");
const pods = await import("../src/lib/social/pods");
const { purgeAccount } = await import("../src/lib/account/purge");
const { loadDeckProfile } = await import("../src/lib/profile/load");
const { computeAndStoreProfile, seatReadingIn } = await import("../src/lib/profile/stored");
const { slotDeck } = await import("../src/lib/bracket/slot");
const { readCatalogGeneration } = await import("../src/lib/cache/catalog-generation");

/** The fixed table ids the inventory names, by state. */
const TABLE_IDS = {
  T1: "7a0e0000-0000-4000-8000-000000000001",
  T2: "7a0e0000-0000-4000-8000-000000000002",
  T3: "7a0e0000-0000-4000-8000-000000000003",
  T4: "7a0e0000-0000-4000-8000-000000000004",
  T5: "7a0e0000-0000-4000-8000-000000000005",
  T6: "7a0e0000-0000-4000-8000-000000000006",
  T7: "7a0e0000-0000-4000-8000-000000000007",
  T8: "7a0e0000-0000-4000-8000-000000000008",
  T9: "7a0e0000-0000-4000-8000-000000000009",
  T10: "7a0e0000-0000-4000-8000-000000000010",
  needsAnalysis: "7a0e0000-0000-4000-8000-000000000011",
  expired: "7a0e0000-0000-4000-8000-000000000012",
  /** PR 4: the viewer has looked since every change (S4, W4). */
  S4: "7a0e0000-0000-4000-8000-000000000013",
  /** PR 4: Colin swapped a minute ago, after the viewer last looked (S5, W5). */
  S5: "7a0e0000-0000-4000-8000-000000000014",
} as const;
const PREFIX = "rz-fixture-";
const VIEWER_DECK_NAME = "Rule 0 fixture: Blood Rites";

// A rerun starts clean: the fixed tables, every pod the fixture players are in (purging an owner can hand a pod on
// to the viewer), the viewer's fixture deck, then the fixture players with everything they hold.
await db.execute(sql`delete from rule_zero_tables where id in (${sql.join(Object.values(TABLE_IDS).map((id) => sql`${id}::uuid`), sql`, `)})`);
await db.execute(sql`delete from pods where id in (select pod_id from pod_members where user_id like ${`${PREFIX}%`})`);
await db.execute(sql`delete from decks where user_id = ${viewer} and name = ${VIEWER_DECK_NAME}`);
const { rows: old } = await db.execute<{ user_id: string }>(sql`select user_id from social_profiles where user_id like ${`${PREFIX}%`}`);
for (const o of old) await purgeAccount(o.user_id);

// The source lists: the audit account's own decks, by name, as `slotDeck` reads them today.
const { rows: sources } = await db.execute<{ id: string; name: string }>(sql`
  select id, name from decks where user_id = ${viewer} and name in (
    'HD Tune - Blood Rites', 'HD - Kratos', 'HD - Eldrazi', 'HD Tune - Counter Intelligence', 'HD - Brago',
    'HD - Yuriko', 'HD - Gods', 'HD - Goblins', 'HD - Elves', 'HD - Soldiers', 'HD - Tovolar')`);
const source = (name: string) => {
  const s = sources.find((r) => r.name === name);
  if (!s) throw new Error(`the audit account has no deck named ${name}`);
  return s.id;
};

const env = process.env;
// The uncached builds (`unstable_cache` raises outside a request), as `probe:rule-zero` passes them.
const deps = { generation: readCatalogGeneration, compute: (d: string, u: string) => loadDeckProfile(d, u, env), env };

const ID = { colin: `${PREFIX}colin`, peter: `${PREFIX}peter`, max: `${PREFIX}max` };
const pub: Record<string, string> = {};
pub[viewer] = (await friends.ensureProfile(viewer, "Hugh")).publicId;
await friends.setDisplayName(viewer, "Hugh");
for (const [k, name] of [["colin", "Colin"], ["peter", "Peter"], ["max", "Max"]] as const) {
  pub[ID[k]] = (await friends.ensureProfile(ID[k], name)).publicId;
}
const befriend = async (a: string, b: string) => {
  const t = await friends.createInvite(a);
  if (!t.ok) throw new Error("createInvite refused");
  const r = await friends.redeemInvite(b, t.token);
  if (!r.ok) throw new Error(`redeemInvite refused: ${JSON.stringify(r)}`);
};
// You and Colin, you and Peter, Colin and Peter, Colin and Max. Max and you are not friends.
await befriend(viewer, ID.colin);
await befriend(viewer, ID.peter);
await befriend(ID.colin, ID.peter);
await befriend(ID.colin, ID.max);
const pod = await pods.createPod(ID.colin, "Thursday night");
if (!pod) throw new Error("createPod refused");
for (const m of [viewer, ID.peter, ID.max]) {
  if (!(await pods.addMember(ID.colin, pod.id, pub[m]))) throw new Error(`addMember refused ${m}`);
}

/** A new deck for `owner` holding the source deck's commanders and list; `body` trims or pads the list. */
const clone = async (owner: string, from: string, name: string, o: { body?: "short" | "over"; declared?: number } = {}) => {
  const { rows } = await db.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id, declared_bracket)
    select ${owner}, ${name}, commander_oracle_id, partner_oracle_id, ${o.declared ?? null}
    from decks where id = ${from} returning id`);
  const id = rows[0].id;
  await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) select ${id}, oracle_id, quantity from deck_cards where deck_id = ${from}`);
  if (o.body === "short") {
    // 86 body cards: the board's "87 of 100", commander in.
    await db.execute(sql`delete from deck_cards where deck_id = ${id} and oracle_id in (
      select oracle_id from deck_cards where deck_id = ${id} and quantity = 1 order by oracle_id limit 13)`);
  }
  if (o.body === "over") {
    // 100 body cards: "101 of 100". One more of a basic the list already runs.
    await db.execute(sql`update deck_cards set quantity = quantity + 1 where deck_id = ${id} and oracle_id = (
      select dc.oracle_id from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
      where dc.deck_id = ${id} and c.type_line like 'Basic Land%' order by dc.quantity desc limit 1)`);
  }
  return id;
};
const analyze = async (deckId: string, owner: string) => {
  const r = await computeAndStoreProfile(deckId, owner, deps);
  if (r?.kind !== "ok") throw new Error(`analysis of ${deckId} returned ${r?.kind}`);
};
/** Swap one non-land card for a basic the list runs: a real edit after the analysis, so the reading is stale. */
const editList = async (deckId: string) => {
  const { rows } = await db.execute<{ oracle_id: string }>(sql`
    select dc.oracle_id from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
    where dc.deck_id = ${deckId} and dc.quantity = 1 and c.type_line not like '%Land%' order by dc.oracle_id limit 1`);
  await db.execute(sql`delete from deck_cards where deck_id = ${deckId} and oracle_id = ${rows[0].oracle_id}`);
  await db.execute(sql`update deck_cards set quantity = quantity + 1 where deck_id = ${deckId} and oracle_id = (
    select dc.oracle_id from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
    where dc.deck_id = ${deckId} and c.type_line like 'Basic Land%' order by dc.quantity desc limit 1)`);
  await db.execute(sql`update decks set last_edited_at = now() where id = ${deckId}`);
};

// The viewer's deck, bracket 3, and the fixture players' decks.
const you3 = await clone(viewer, source("HD Tune - Blood Rites"), VIEWER_DECK_NAME);
const colin3 = await clone(ID.colin, source("HD - Kratos"), "Kratos Value");
const colin4 = await clone(ID.colin, source("HD - Brago"), "Brago Blink");
const colin45d4 = await clone(ID.colin, source("HD - Gods"), "Gods Partners", { declared: 4 });
const colin45d1 = await clone(ID.colin, source("HD - Goblins"), "Goblin Stompy", { declared: 1 });
const colinStale = await clone(ID.colin, source("HD - Kratos"), "Kratos Value (edited)");
const peter3 = await clone(ID.peter, source("HD - Eldrazi"), "Eldrazi Ramp");
const peter2 = await clone(ID.peter, source("HD - Yuriko"), "Yuriko Ninjas");
const peter12 = await clone(ID.peter, source("HD - Elves"), "Elf Tribal");
const peterShort = await clone(ID.peter, source("HD - Yuriko"), "Yuriko Ninjas (unfinished)", { body: "short" });
const peterUnread = await clone(ID.peter, source("HD - Soldiers"), "Soldier Tokens");
const peterNeeds = await clone(ID.peter, source("HD - Tovolar"), "Tovolar Werewolves");
const max3 = await clone(ID.max, source("HD Tune - Counter Intelligence"), "Counter Intelligence");
const maxOver = await clone(ID.max, source("HD Tune - Counter Intelligence"), "Counter Intelligence (one over)", { body: "over" });

for (const [d, u] of [
  [you3, viewer], [colin3, ID.colin], [colin4, ID.colin], [colin45d4, ID.colin], [colin45d1, ID.colin], [colinStale, ID.colin],
  [peter3, ID.peter], [peter2, ID.peter], [peter12, ID.peter], [peterNeeds, ID.peter], [max3, ID.max],
] as const) await analyze(d, u);
await editList(colinStale);
// An older-version row over an edited list: `seatReadingIn` answers `unreadable`, so its player analyzes it.
await editList(peterNeeds);
await db.execute(sql`update deck_profiles set profile_version = profile_version - 1 where deck_id = ${peterNeeds}`);

type Seat = [user: string, deck: string | null];
const tables: [keyof typeof TABLE_IDS, setBy: string, open: boolean, Seat[]][] = [
  ["T1", ID.colin, true, [[viewer, you3], [ID.colin, colin3], [ID.peter, peter3], [ID.max, max3]]],
  ["T2", ID.colin, true, [[viewer, you3], [ID.colin, colin4], [ID.peter, peter3], [ID.max, max3]]],
  ["T3", ID.colin, true, [[viewer, you3], [ID.colin, colin3], [ID.peter, peter2], [ID.max, max3]]],
  ["T4", ID.colin, true, [[viewer, you3], [ID.colin, colin4], [ID.peter, peter2], [ID.max, max3]]],
  ["T5", viewer, true, [[viewer, you3], [ID.colin, colin4]]],
  ["T6", ID.colin, true, [[viewer, you3], [ID.colin, colin45d4], [ID.peter, peter12], [ID.max, max3]]],
  ["T7", ID.colin, true, [[viewer, you3], [ID.colin, colin45d1], [ID.peter, peter3], [ID.max, max3]]],
  ["T8", ID.colin, true, [[viewer, you3], [ID.colin, colinStale], [ID.peter, peterShort], [ID.max, maxOver]]],
  ["T9", ID.colin, true, [[viewer, you3], [ID.colin, colin3], [ID.peter, peterUnread], [ID.max, max3]]],
  ["T10", viewer, true, [[viewer, you3], [ID.peter, peterShort], [ID.max, null]]],
  ["needsAnalysis", ID.colin, true, [[viewer, you3], [ID.colin, colin3], [ID.peter, peterNeeds]]],
  ["expired", ID.colin, false, [[viewer, you3], [ID.colin, colin4], [ID.peter, peter3]]],
  ["S4", ID.colin, true, [[viewer, you3], [ID.colin, colin3], [ID.peter, peter3], [ID.max, max3]]],
  ["S5", ID.colin, true, [[viewer, you3], [ID.colin, colin3], [ID.peter, peter3], [ID.max, max3]]],
];
// Inserted directly, not through `setTable`: a setup deletes its pod's expired tables, and these share one pod.
for (const [state, setBy, open, seats] of tables) {
  const id = TABLE_IDS[state];
  await db.execute(sql`insert into rule_zero_tables (id, pod_id, set_by, created_at, expires_at)
    values (${id}, ${pod.id}, ${setBy}, now() - interval '4 hours', ${open ? sql`now() + interval '20 hours'` : sql`now() - interval '1 hour'`})`);
  for (const [i, [user, deck]] of seats.entries()) {
    await db.execute(sql`insert into rule_zero_seats (table_id, user_id, seat, deck_id) values (${id}, ${user}, ${i + 1}, ${deck})`);
  }
}

// PR 4's two looks at one swap. Every seat sat down when its table was set; Colin swapped a minute ago. S4's viewer
// has drawn the table since (no dot); S5's last drew it five minutes ago (Colin's seat carries the dot, and the read
// says `Since you looked`). The page records each draw (`markTableSeen`), so reseed before rerunning S5.
for (const state of ["S4", "S5"] as const) {
  const id = TABLE_IDS[state];
  await db.execute(sql`update rule_zero_seats set changed_at = now() - interval '4 hours' where table_id = ${id}`);
  await db.execute(sql`update rule_zero_seats set changed_at = now() - interval '1 minute' where table_id = ${id} and user_id = ${ID.colin}`);
  await db.execute(sql`insert into rule_zero_seen (table_id, user_id, seen_at)
    values (${id}, ${viewer}, ${state === "S4" ? sql`now()` : sql`now() - interval '5 minutes'`})`);
}

// What each seat reads as, from the same reads the loader makes.
const label = async (deck: string | null, owner: string) => {
  if (!deck) return "waiting";
  const r = await db.transaction((tx) => seatReadingIn(tx, deck, owner));
  if (!r) return "?";
  const built = r.head.cards.reduce((n, c) => n + c.quantity, 0);
  if (typeof r.reading !== "object") return `${r.reading} (${built} body)`;
  const v = slotDeck(r.reading.profile, (r.head.declaredBracket ?? null) as never);
  return `${JSON.stringify(v.permits)}${r.head.declaredBracket ? ` declared ${r.head.declaredBracket}` : ""} ${r.reading.fresh ? "fresh" : "stale"} (${built} body)`;
};
const names: Record<string, string> = { [viewer]: "you", [ID.colin]: "Colin", [ID.peter]: "Peter", [ID.max]: "Max" };
for (const [state, , open, seats] of tables) {
  const parts = [];
  for (const [u, d] of seats) parts.push(`${names[u]} ${await label(d, u)}`);
  console.log(`${state.padEnd(13)} ${TABLE_IDS[state]} ${open ? "open" : "EXPIRED"}  ${parts.join(" | ")}`);
}
process.exit(0);
