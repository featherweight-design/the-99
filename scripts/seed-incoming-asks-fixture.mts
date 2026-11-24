// Seeds two friends who each ask the audit account for one of its spares, so Home holds TWO waiting asks (the newer
// leads, the older answers in its What's new row: Finding the tools G22-G24). SCRATCH BRANCH ONLY: it names its target
// and refuses anything else. A rerun purges the previous run's friends first.
//   ASKS_FIXTURE_BRANCH=br-... ASKS_FIXTURE_USER=user_... pnpm tsx scripts/seed-incoming-asks-fixture.mts
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
const named = process.env.ASKS_FIXTURE_BRANCH;
const viewer = process.env.ASKS_FIXTURE_USER;
if (!named || !viewer) throw new Error("set ASKS_FIXTURE_BRANCH and ASKS_FIXTURE_USER");
const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
if (rows[0]?.b !== named) throw new Error(`database reports ${rows[0]?.b}, not ${named}`);
assertScratchBranch(rows[0]?.b, "seed-incoming-asks-fixture");
const friends = await import("../src/lib/social/friends");
const pods = await import("../src/lib/social/pods");
const sr = await import("../src/lib/social/spare-requests");
const { shareSparesWith } = await import("../src/lib/social/spares");
const { applyCollectionChange } = await import("../src/lib/collection/write");
const { resolveFlagsStrict } = await import("../src/lib/flags/snapshot");
const { purgeAccount } = await import("../src/lib/account/purge");
const { randomUUID } = await import("node:crypto");

const { rows: old } = await db.execute<{ user_id: string }>(sql`select user_id from social_profiles where user_id like 'asks-fixture-%'`);
for (const o of old) await purgeAccount(o.user_id);

const ENV = await resolveFlagsStrict(null);
const { rows: picked } = await db.execute<{ oracle_id: string; set_code: string; collector_number: string; scryfall_id: string; name: string }>(sql`
  select c.oracle_id, p.set_code, p.collector_number, p.scryfall_id, c.name from cards c
  join lateral (select * from printings p where p.oracle_id = c.oracle_id order by p.scryfall_id limit 1) p on true
  where c.layout = 'normal' and c.type_line not like 'Basic%' order by c.oracle_id offset 1400 limit 2`);
if (picked.length < 2) throw new Error("fewer than two cards on this branch");
const mine = await friends.ensureProfile(viewer, "Hugh");
const res = await applyCollectionChange(viewer, { kind: "add", items: picked.map((p) => ({
  oracleId: p.oracle_id, setCode: p.set_code, collectorNumber: p.collector_number, scryfallId: p.scryfall_id, finish: "nonfoil" as const, condition: null, quantity: 2 })) }, { id: randomUUID() });
if (res.status !== "applied") throw new Error(`add refused: ${res.status}`);

const tag = Date.now();
const pod = await pods.createPod(viewer, "Asks fixture");
if (!pod) throw new Error("createPod refused");
if (!(await shareSparesWith(viewer, pod.id, true))) throw new Error("shareSparesWith refused");
for (const [i, name] of ["Ann", "Bea"].entries()) {
  const id = `asks-fixture-${name.toLowerCase()}-${tag}`;
  await friends.ensureProfile(id, name);
  const t = await friends.createInvite(viewer);
  if (!t.ok) throw new Error("createInvite refused");
  await friends.redeemInvite(id, t.token);
  const p = await friends.ensureProfile(id, name);
  if (!(await pods.addMember(viewer, pod.id, p.publicId))) throw new Error("addMember refused");
  const ask = await sr.askForSpare(id, mine.publicId, picked[i].oracle_id, ENV);
  if (!ask.ok) throw new Error(`ask refused: ${JSON.stringify(ask)}`);
  console.log(`${name} asks for ${picked[i].name}`);
  await new Promise((r) => setTimeout(r, 1200));
}
console.log("seeded; the older ask (Ann) answers in its row, the newer (Bea) leads");
process.exit(0);
