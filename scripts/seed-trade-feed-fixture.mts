// Seeds four friends whose trades with the audit account each tell it one feed event (friend trades PR 2, the `trade`
// feed kind): Ann OFFERS a trade (round 1, waiting on the reader), Bea COUNTERS the reader's offer (round 2, waiting),
// Cal ACCEPTED the reader's offer, Dee DECLINED it. The trades and their feed items are written by hand, since the
// trade writers arrive in PR 3; the rows keep every check the schema holds (round authorship, ended and answered stamps).
// SCRATCH BRANCH ONLY: it names its target and refuses anything else. A rerun purges the previous run's friends first.
//   TRADE_FIXTURE_BRANCH=br-... TRADE_FIXTURE_USER=user_... pnpm tsx scripts/seed-trade-feed-fixture.mts
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
const named = process.env.TRADE_FIXTURE_BRANCH;
const viewer = process.env.TRADE_FIXTURE_USER;
if (!named || !viewer) throw new Error("set TRADE_FIXTURE_BRANCH and TRADE_FIXTURE_USER");
const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
if (rows[0]?.b !== named) throw new Error(`database reports ${rows[0]?.b}, not ${named}`);
assertScratchBranch(rows[0]?.b, "seed-trade-feed-fixture");
const friends = await import("../src/lib/social/friends");
const { purgeAccount } = await import("../src/lib/account/purge");

const { rows: old } = await db.execute<{ user_id: string }>(sql`select user_id from social_profiles where user_id like 'trade-fixture-%'`);
for (const o of old) await purgeAccount(o.user_id);

const { rows: picked } = await db.execute<{ oracle_id: string; name: string }>(sql`
  select c.oracle_id, c.name from cards c
  where c.layout = 'normal' and c.type_line not like 'Basic%' and c.image_uri is not null
  order by c.oracle_id offset 2100 limit 12`);
if (picked.length < 12) throw new Error("fewer than twelve cards on this branch");
await friends.ensureProfile(viewer, "Hugh");

type Event = "offer" | "counter" | "accept" | "decline";
// Each friend's trade: who proposed it, the round it stands on, its status, and the event it tells the reader.
const plan: { name: string; event: Event; proposer: "friend" | "reader"; round: number; status: string }[] = [
  { name: "Ann", event: "offer", proposer: "friend", round: 1, status: "open" },
  { name: "Bea", event: "counter", proposer: "reader", round: 2, status: "open" },
  { name: "Cal", event: "accept", proposer: "reader", round: 1, status: "accepted" },
  { name: "Dee", event: "decline", proposer: "reader", round: 1, status: "declined" },
];
const tag = Date.now();
for (const [i, t] of plan.entries()) {
  const id = `trade-fixture-${t.name.toLowerCase()}-${tag}`;
  await friends.ensureProfile(id, t.name);
  const invite = await friends.createInvite(viewer);
  if (!invite.ok) throw new Error("createInvite refused");
  await friends.redeemInvite(id, invite.token);
  const proposer = t.proposer === "friend" ? id : viewer;
  const recipient = t.proposer === "friend" ? viewer : id;
  const offeredBy = t.round % 2 === 1 ? proposer : recipient;
  const answered = t.status === "open" ? null : new Date();
  const ended = t.status === "declined" ? new Date() : null;
  const { rows: made } = await db.execute<{ id: string }>(sql`
    insert into trades (proposer_user_id, recipient_user_id, status, offered_by_user_id, round, answered_at, ended_at, ended_by_user_id)
    values (${proposer}, ${recipient}, ${t.status}, ${offeredBy}, ${t.round}, ${answered}, ${ended}, ${ended ? id : null})
    returning id`);
  const tradeId = made[0].id;
  // One or two cards a side, so the row's lists read "A" and "A and B".
  const [a, b, c] = [picked[i * 3], picked[i * 3 + 1], picked[i * 3 + 2]];
  for (let r = 1; r <= t.round; r++) {
    await db.execute(sql`insert into trade_rounds (trade_id, round) values (${tradeId}, ${r})`);
    await db.execute(sql`insert into trade_cards (trade_id, round, side, oracle_id) values
      (${tradeId}, ${r}, 'proposer', ${a.oracle_id}), (${tradeId}, ${r}, 'recipient', ${b.oracle_id}),
      (${tradeId}, ${r}, ${i % 2 === 0 ? "proposer" : "recipient"}, ${c.oracle_id})`);
  }
  await db.execute(sql`insert into feed_items (user_id, kind, dedupe_key, friend_user_id, data)
    values (${viewer}, 'trade', ${`${tradeId}:${t.round}:${t.event}`}, ${id},
      ${JSON.stringify({ trade: tradeId, round: t.round, event: t.event })}::jsonb)`);
  console.log(`${t.name}: ${t.event} (trade ${tradeId}, round ${t.round})`);
  await new Promise((r) => setTimeout(r, 1200));
}
console.log("seeded four trade feed items");
process.exit(0);
